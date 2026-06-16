// Pin language for deterministic tests. Without this, getSavedLanguage() falls
// back to navigator.language under jsdom, which can resolve to non-German and
// break assertions that expect German strings.
try {
  localStorage.setItem('bbk:lang', 'de');
} catch {
  // ignore — environments without localStorage
}
