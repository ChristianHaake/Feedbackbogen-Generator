# Bewertungsbaukasten (Client-Side-Only)

Bewertungsbaukasten ist eine rein clientseitige Webanwendung zum Zusammenstellen von Bewertungsbögen (Rubrics) aus YAML-konfigurierten Kriterien und frei wählbaren Skalen. Die App läuft ohne Backend, eignet sich für statisches Hosting (z. B. GitHub Pages) und lässt sich per `<iframe>` einbetten (z. B. in Moodle/WordPress).

## Konzept & Architektur

- Client-Side-Only: Keine Server-Persistenz. Konfiguration wird lokal im Browser gespeichert (`localStorage`) und als JSON importiert/exportiert.
- Konfiguration via YAML: Datei `content/items.yaml` liefert Kategorien und Skalen. Beim Laden wird validiert; bei Fehlern erfolgt ein Toast und Fallback auf Demo-Daten.
- UI: Zweigeteilter Builder – links Kopfdaten, ausgewählte Kriterien, Suche und Kategorien; rechts die papiernahe Druckvorschau.
- Exporte lokal im Browser: PDF/Druckdialog, DOCX (docx), XLSX (xlsx), ODP (minimal, via ZIP+XML – siehe Limitierungen).
- Barrierefreiheit: Tastaturbedienung, sichtbarer Fokus-Ring, `aria-live`-Status, Alt+S (Speichern), Alt+E (Export-Hinweis), respektiert `prefers-reduced-motion`.
- Build: Vite + TypeScript (Vanilla), ES Modules. Keine externen CDNs, Assets lokal gebundled.

## Einbettung per iframe

- Die App setzt keine blockierenden HTTP-Header wie X-Frame-Options oder CSP, da GitHub Pages keine benutzerdefinierten Header erlaubt. Daher ist die Einbettung per `<iframe>` grundsätzlich möglich, solange die Zielumgebung (z. B. Moodle/WordPress) diese nicht selbst blockiert.
- Wenn später restriktive Header gewünscht sind, empfiehlt sich ein Reverse-Proxy bzw. ein separater Host mit konfigurierbaren Headern.

Beispiel:

```html
<iframe src="https://<user>.github.io/<repo>/" width="100%" height="800" style="border:0"></iframe>
```

## Installation & Nutzung

Voraussetzungen: Node.js >= 20.19.0 oder >= 22.12.0

```bash
npm ci
npm run dev     # Entwicklungsserver
npm run build   # Produktionsbuild in dist/
npm run preview # Vorschau des Builds
npm run test    # Vitest (Unit-Tests)
npm run lint    # ESLint
npm run format  # Prettier
```

Die App lädt `content/items.yaml` zur Laufzeit. In Dev und im Build wird der Ordner per Vite-Plugin statisch mitserviert/kopiert.

## YAML-Schema

```yaml
categories:
  - id: <string>
    title: <string>
    items:
      - id: <string>
        label: <string>
        description: <string?>
scales:
  - id: verbal_5
    kind: verbal
    labels: ["trifft voll zu","trifft eher zu","teils/teils","trifft eher nicht zu","trifft nicht zu"]
  - id: punkte_10
    kind: numeric
    min: 0
    max: 10
  - id: emoji_3
    kind: emoji
    set: ["😀","😐","☹️"]
  - id: ampel
    kind: traffic
    colors: ["#2e7d32","#fbc02d","#c62828"]
  - id: prozent
    kind: percent
```

Beim Laden wird das Schema validiert. Fehler → `aria-live`-Hinweis und Fallback auf Demo-Daten (in `src/yaml.ts`).

## Speichern/Laden der Konfiguration

- LocalStorage-Key: `bbk:config`.
- JSON-Import/-Export via Toolbar. Schema:

```json
{
  "selectedItems": [{ "categoryId": "...", "itemId": "..." }],
  "scaleByCategory": { "<categoryId>": "<scaleId>" },
  "defaultScaleId": "verbal_5",
  "header": {
    "learner": "",
    "learngroup": "",
    "topic": "",
    "date": "",
    "feedback": ""
  },
  "customItems": []
}
```

## Exporte (Client-Side)

- PDF: DIN A4 über die Browser-Druckfunktion.
- DOCX: Überschrift, Datum, Tabelle (docx).
- XLSX: Sheet „Bewertungsbogen“, zusätzliche Spalten für Punkte/Notizen (xlsx).
- ODP: Minimal lauffähiges ODF-Gerüst (ZIP+XML mit `mimetype`, `content.xml`, `styles.xml`, `meta.xml`, `META-INF/manifest.xml`). Enthält eine Titelfolie und eine Folie mit Tabelle.

Limitierungen ODP:
- Sehr einfache Struktur, keine erweiterten Layouts oder Masterseiten.
- Kompatibel mit LibreOffice/OpenOffice; MS PowerPoint-Unterstützung kann variieren.

## Barrierefreiheit

- Tastatur: Auswahl per Checkbox, Shortcuts Alt+S (Speichern), Alt+E (PDF/Druck).
- ARIA: `aria-expanded` bei Accordion, `aria-live` für Statusmeldungen.
- Sichtbarer Fokus-Ring, `prefers-reduced-motion` berücksichtigt.

## GitHub Pages Deployment

- Workflow unter `.github/workflows/pages.yml` baut bei Push auf `main` und deployt `dist/`.
- Repository-Einstellung: Pages Source = GitHub Actions.
- Vite ist so konfiguriert, dass `base: './'` verwendet wird (relative Pfade), damit die App lokal, in Unterordnern und auf GitHub Pages ohne hartcodierten Repository-Pfad funktioniert.

## Lizenz

MIT – siehe `LICENSE`.
