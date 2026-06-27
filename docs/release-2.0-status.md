# 2.0 Release Status

Stand: 2026-06-27

## Release-Funktionen

- Mehrsprachige Oberfläche und Inhaltsdaten: Deutsch, Englisch, Französisch, Spanisch, Niederländisch.
- 8 allgemeine Bewertungskategorien mit 40 Kriterien.
- 6 Produktformat-Gruppen mit 33 Formaten und 211 produktspezifischen Kriterien.
- 7 Skalentypen inklusive verbaler Skala, Punktebewertung, Emoji-Skalen, Ampel, Prozent und Ja/Nein.
- Eigene Kategorien, umbenennbare Kategorien, eigene Kriterien und Masseneingabe.
- Kategoriegewichtungen mit Auswertungsübersicht in Vorschau, PDF, ausfüllbarem PDF, DOCX, XLSX und ODT.
- Konfigurierbare Kopffelder, Dokumenttitel und Fußzeilenfelder.
- A4-Vorschau mit Skalenmodus und Checklistenmodus.
- Export als PDF/Druckansicht, ausfüllbares PDF, DOCX, XLSX und ODT.
- Versionierter JSON-Import und -Export mit Migrationen und Import-Schutzgrenzen.
- Lokale Autospeicherung im Browser, Undo/Redo und explizites Zurücksetzen.
- Responsives Layout ab 320 px mit mobiler Bearbeiten-/Vorschau-/Export-Navigation.
- Tastaturbedienung, sichtbarer Fokus, Screenreader-Statusmeldungen und `prefers-reduced-motion`.
- Security-Header, PWA-Dateien und Live-Deploy-Verifikation für die statische Cloudflare-Auslieferung.

## Lokal

- `npm run verify` muss grün sein.
- `npm audit --audit-level=low` muss grün sein.
- `npm run test:e2e` muss grün sein.

Diese drei lokalen Gates müssen vor dem Deployment gegen denselben Stand laufen, der veröffentlicht wird.

## Live-Deployment

`npm run verify:live` ist ein verpflichtendes Release-Gate nach dem Deployment.

Der Check muss bestätigen:

- Die Live-Seite referenziert die aktuellen Assets aus `dist/index.html`.
- `/content/de/categories.json`, `/content/de/scales.json` und `/content/de/product-formats.json` liefern JSON, keinen HTML-Fallback.
- `/sw.js`, `/registerSW.js` und `/manifest.webmanifest` liefern echte PWA-Dateien.
- Die Security-Header aus `public/_headers` sind live aktiv.

Das Repository enthält dafür `wrangler.jsonc` mit statischer Asset-Auslieferung
aus `dist` und SPA-Fallback. Ein Release ist erst gültig, wenn der Live-Deploy
mit dieser Build-Ausgabe und den Dateien `public/_headers` sowie
`public/_redirects` erfolgt ist.

Die Version in `package.json` bleibt bei `1.0.0`, bis das Live-Gate erfolgreich ist.

## Offene Release-Entscheidung

- Der Changelog-Eintrag `2.0.0` bleibt „in Vorbereitung“, bis das Live-Gate erfolgreich war.
- Ein Release-Tag oder GitHub-Release sollte erst nach grünem Live-Check erstellt werden.
