# 2.0 Release Status

Stand: 2026-06-25

## Lokal

- `npm run verify` muss grün sein.
- `npm audit --audit-level=low` muss grün sein.
- `npm run test:e2e` muss grün sein.

## Live-Deployment

`npm run verify:live` ist ein verpflichtendes Release-Gate nach dem Deployment.

Der Check muss bestätigen:

- Die Live-Seite referenziert die aktuellen Assets aus `dist/index.html`.
- `/content/de/categories.json`, `/content/de/scales.json` und `/content/de/product-formats.json` liefern JSON, keinen HTML-Fallback.
- `/sw.js`, `/registerSW.js` und `/manifest.webmanifest` liefern echte PWA-Dateien.
- Die Security-Header aus `public/_headers` sind live aktiv.

Die Version in `package.json` bleibt bei `1.0.0`, bis das Live-Gate erfolgreich ist.
