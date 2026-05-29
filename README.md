# Bewertungsbaukasten (Client-Side-Only)

Bewertungsbaukasten ist eine rein clientseitige Webanwendung zum Zusammenstellen von Bewertungsbögen (Rubrics) aus YAML-konfigurierten Kriterien und frei wählbaren Skalen. Die App läuft ohne Backend, eignet sich für statisches Hosting (z. B. GitHub Pages) und lässt sich per `<iframe>` einbetten (z. B. in Moodle/WordPress).

## Konzept & Architektur

- Client-Side-Only: Keine Server-Persistenz. Konfiguration wird lokal im Browser gespeichert (`localStorage`) und als JSON importiert/exportiert.
- Konfiguration via YAML/JSON: Datei `content/items.yaml` liefert allgemeine Bewertungskriterien und Skalen; `content/format.json` liefert Produktformat-Pakete für die Produktebene. Beim Laden wird validiert; bei Fehlern erfolgt ein Fallback.
- UI: Zweigeteilter Builder – links konfigurierbare Kopffelder, Fußzeilen-Toggles, ausgewählte Kriterien, Suche, Bewertungskriterien und Produktebene; rechts die papiernahe Druckvorschau mit Skalen- und Checklistenmodus.
- Skalenmodell: Skalen werden pro Kategorie vergeben; alle Kriterien einer Kategorie verwenden diese Skala.
- Exporte lokal im Browser: PDF/Druckdialog, DOCX (docx), XLSX (xlsx), ODP (minimal, via ZIP+XML – siehe Limitierungen).
- Barrierefreiheit: Tastaturbedienung, sichtbarer Fokus-Ring, `aria-live`-Status, Alt+S (Speichern), Alt+E (PDF/Druck), respektiert `prefers-reduced-motion`.
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

Die App lädt `content/items.yaml` und `content/format.json` zur Laufzeit. In Dev und im Build wird der Ordner per Vite-Plugin statisch mitserviert/kopiert.

## YAML-Schema

```yaml
categories:
  - id: <string>
    title: <string>
    description: <string?>
    items:
      - id: <string>
        label: <string>
        description: <string?>

  - id: <string>
    title: <string>
    description: <string?>
    groups:
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

## Produktformate

Produktspezifische Kriterien liegen in `content/format.json`. Produktformate sind standardmäßig nicht ausgewählt. Über die Sidebar-Sektion `Produktebene` können Format-Pakete hinzugefügt werden; ausgewählte Pakete erscheinen anschließend als eigene Akkordeonbereiche mit denselben Skalen-, Auswahl- und Custom-Kriterien-Funktionen wie normale Kategorien.

Schema:

```json
{
  "groups": [
    {
      "id": "fotoprodukte",
      "title": "Fotoprodukte",
      "formats": [
        {
          "id": "fotostory",
          "title": "Fotostory",
          "criteria": [
            { "id": "bildgestaltung", "label": "ansprechende Bildgestaltung" }
          ]
        }
      ]
    }
  ]
}
```

Im Druck/PDF/DOCX/XLSX/ODP erscheinen ausgewählte Produktformate als normale Kategorien, z. B. `Fotostory`; es gibt keinen zusätzlichen sichtbaren `Produktebene`-Wrapper im fertigen Bogen.

## Speichern/Laden der Konfiguration

- LocalStorage-Key: `bbk:config`.
- JSON-Import/-Export via Toolbar. Schema:

```json
{
  "selectedItems": [{ "categoryId": "...", "itemId": "..." }],
  "selectedProductFormats": ["format:fotoprodukte:fotostory"],
  "scaleByCategory": { "<categoryId>": "<scaleId>" },
  "defaultScaleId": "verbal_5",
  "documentTitle": {
    "mode": "bewertungsbogen",
    "custom": ""
  },
  "header": {
    "fields": [
      { "id": "name", "label": "Name", "value": "" },
      { "id": "learngroup", "label": "Lerngruppe", "value": "" },
      { "id": "topic", "label": "Thema", "value": "" },
      { "id": "date", "label": "Datum", "value": "" }
    ]
  },
  "footerFields": {
    "date": true,
    "signature": true,
    "grade": true
  },
  "customItems": [
    {
      "id": "custom_<categoryId>_<timestamp>",
      "categoryId": "...",
      "label": "...",
      "custom": true
    }
  ]
}
```

Ältere JSON-Konfigurationen mit `header.learner`, `header.learngroup`, `header.topic` und `header.date` werden beim Laden in die neue `header.fields`-Struktur übernommen. Alte `header.feedback`-Werte werden ignoriert; Feedback bleibt ein leeres Schreibfeld auf dem Bogen. Alte `Produktebene`-Platzhalter-Kriterien werden beim Laden verworfen.

## Exporte (Client-Side)

- PDF: DIN A4 über die Browser-Druckfunktion (`window.print()`), je nach aktueller Vorschau als Bewertungsbogen oder Checkliste.
- DOCX: Überschrift, Kopffelder, Feedback, optionale Fußzeile und Bewertungstabelle (docx), ebenfalls abhängig vom aktuellen Vorschaumodus.
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
