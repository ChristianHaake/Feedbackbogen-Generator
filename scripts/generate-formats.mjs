import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import YAML from 'yaml';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourcePath = argumentValue('--source') ?? path.join(root, 'content', 'format.yaml');
const outputPath = argumentValue('--output') ?? path.join(root, 'content', 'format.json');
const checkOnly = process.argv.includes('--check');

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message) {
  throw new Error(`format.yaml: ${message}`);
}

function requireString(value, location) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${location} muss ein nicht-leerer Text sein.`);
  return value;
}

function assertUnique(seen, id, location) {
  if (seen.has(id)) fail(`ID-Kollision bei "${id}" (${location}).`);
  seen.add(id);
}

function slugify(label) {
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/g, '');
  if (!slug) fail(`Aus dem Kriterium "${label}" konnte keine ID erzeugt werden.`);
  return slug;
}

function generate(source) {
  if (!source || typeof source !== 'object' || source.version !== 1 || !Array.isArray(source.groups)) {
    fail('Erwartet werden "version: 1" und eine Liste "groups".');
  }

  const groupIds = new Set();
  const categoryIds = new Set();
  return {
    groups: source.groups.map((group, groupIndex) => {
      const groupLocation = `groups[${groupIndex}]`;
      const groupId = requireString(group?.id, `${groupLocation}.id`);
      assertUnique(groupIds, groupId, `${groupLocation}.id`);
      if (!Array.isArray(group.formats)) fail(`${groupLocation}.formats muss eine Liste sein.`);

      const formatIds = new Set();
      return {
        id: groupId,
        title: requireString(group.title, `${groupLocation}.title`),
        formats: group.formats.map((format, formatIndex) => {
          const formatLocation = `${groupLocation}.formats[${formatIndex}]`;
          const formatId = requireString(format?.id, `${formatLocation}.id`);
          assertUnique(formatIds, formatId, `${formatLocation}.id`);
          assertUnique(categoryIds, `format:${groupId}:${formatId}`, formatLocation);
          if (!Array.isArray(format.criteria)) fail(`${formatLocation}.criteria muss eine Liste sein.`);

          const criterionIds = new Set();
          return {
            id: formatId,
            title: requireString(format.title, `${formatLocation}.title`),
            criteria: format.criteria.map((criterion, criterionIndex) => {
              const criterionLocation = `${formatLocation}.criteria[${criterionIndex}]`;
              const label = requireString(criterion?.label, `${criterionLocation}.label`);
              const criterionId = criterion.id === undefined
                ? slugify(label)
                : requireString(criterion.id, `${criterionLocation}.id`);
              assertUnique(criterionIds, criterionId, criterionLocation);
              return { id: criterionId, label };
            })
          };
        })
      };
    })
  };
}

const source = YAML.parse(await fs.readFile(sourcePath, 'utf8'));
const generated = `${JSON.stringify(generate(source), null, 2)}\n`;

if (checkOnly) {
  const current = await fs.readFile(outputPath, 'utf8').catch(() => '');
  if (current !== generated) {
    throw new Error('content/format.json ist nicht aktuell. Bitte "npm run generate:formats" ausführen.');
  }
  console.log('content/format.json ist aktuell und kollisionsfrei.');
} else {
  await fs.writeFile(outputPath, generated);
  console.log('content/format.json wurde aus content/format.yaml erzeugt.');
}
