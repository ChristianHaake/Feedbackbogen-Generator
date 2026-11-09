import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import ts from 'typescript';

function validate(reference, actual, path = '') {
  assert.equal(typeof actual, typeof reference, `${path}: fehlender oder falscher Typ`);
  if (typeof reference === 'string') {
    assert.ok(actual.trim(), `${path}: leere Übersetzung`);
    assert.ok(!/\{\{[^}]*\}\}/.test(actual), `${path}: Platzhalter`);
  } else if (typeof reference === 'function') {
    assert.equal(actual.length, reference.length, `${path}: andere Parameterzahl`);
    const args = Array.from({ length: reference.length }, (_, index) => `__arg${index}__`);
    const expected = reference(...args);
    const translated = actual(...args);
    assert.equal(typeof translated, 'string', `${path}: kein Text`);
    for (const argument of args) {
      if (expected.includes(argument)) assert.ok(translated.includes(argument), `${path}: fehlender Parameter ${argument}`);
    }
  } else if (reference && typeof reference === 'object') {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(reference).sort(), `${path}: andere Schlüssel`);
    for (const [key, value] of Object.entries(reference)) validate(value, actual[key], `${path}.${key}`);
  }
}

// Exercise failing cases as well as current translations; a broken validator must fail the gate.
assert.throws(() => validate({ text: 'Text' }, {}));
assert.throws(() => validate('Text', ' '));
assert.throws(() => validate('Text', '{{TODO}}'));
assert.throws(() => validate((value) => `${value}`, (_value) => 'Text'));
validate((value) => `${value}`, (value) => `Text ${value}`);

const locales = {};
for (const language of ['de', 'en', 'fr', 'es', 'nl']) {
  const filename = new URL(`../src/i18n/locales/${language}.ts`, import.meta.url);
  const source = await fs.readFile(filename, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  locales[language] = (await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`))[language];
}
for (const [language, locale] of Object.entries(locales)) {
  validate(locales.de, locale, language);
  console.log(`Übersetzungen '${language}' vollständig und gültig.`);
}
