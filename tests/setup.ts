// Pin language for deterministic tests. Without this, getSavedLanguage() falls
// back to navigator.language under jsdom, which can resolve to non-German and
// break assertions that expect German strings.
import fs from 'node:fs';

const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = String(input);
  const filename = ['FeedbackSans-Regular.ttf', 'FeedbackSans-Bold.ttf'].find(name => url.endsWith(name));
  if (filename) {
    const bytes = fs.readFileSync(`assets/fonts/${filename}`);
    return Promise.resolve(new Response(bytes));
  }
  return nativeFetch(input, init);
};

try {
  localStorage.setItem('bbk:lang', 'de');
} catch {
  // ignore — environments without localStorage
}
