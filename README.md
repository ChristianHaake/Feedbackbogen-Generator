# Feedbackbogen-Generator

Der Feedbackbogen-Generator ist ein webbasiertes Open-Source-Werkzeug zur Erstellung strukturierter Feedback- und Bewertungsbögen für Unterricht, Fortbildungen, Workshops und weitere Lernkontexte.

Die Anwendung läuft vollständig im Browser. Es gibt kein Backend, keine Anmeldung und keine serverseitige Speicherung eingegebener Inhalte.

- Clientseitig: Keine Server-Persistenz. Konfiguration wird lokal im Browser gespeichert (`localStorage`) und als JSON importiert/exportiert.
- Konfiguration via JSON: `content/categories.json` liefert allgemeine Bewertungskriterien, `content/scales.json` die Bewertungsskalen und `content/product-formats.json` die Kriterien der Produktebene. Beim Laden wird validiert; bei Fehlern erfolgt ein Fallback.
- UI: Zweigeteilter Generator – links konfigurierbare Kopffelder, Fußzeilenoptionen, ausgewählte Kriterien, Suche, Bewertungskriterien und Produktebene; rechts die papiernahe Druckvorschau mit Skalen- und Checklistenmodus.
- Skalenmodell: Skalen werden pro Kategorie vergeben; alle Kriterien einer Kategorie verwenden diese Skala.
- Exporte lokal im Browser: PDF, DOCX (`docx`), XLSX (`write-excel-file`), ODT (via ZIP+XML).
- Barrierefreiheit: Tastaturbedienung, sichtbarer Fokus-Ring, `aria-live`-Status, Alt+S (Config herunterladen), Alt+E (Export-Menü öffnen), Strg/Cmd+Z (Undo), Strg/Cmd+Shift+Z (Redo), respektiert `prefers-reduced-motion`.
- Build: Vite + TypeScript (Vanilla), ES Modules. Keine externen CDNs, Assets lokal gebundled.

Website: [https://fbg.haak3.de](https://fbg.haak3.de)

## Wofür ist das Tool gedacht?

Der Feedbackbogen-Generator unterstützt dabei, Feedbackbögen systematisch aufzubauen und Bewertungskriterien transparent zu machen. Er richtet sich insbesondere an Lehrkräfte, Fortbildende, Schulentwicklungs- und Beratungsteams sowie weitere Personen, die Feedback- und Bewertungsprozesse nachvollziehbarer gestalten wollen.

Im Mittelpunkt steht nicht nur die abschließende Bewertung, sondern Feedback als Teil von Lern-, Reflexions- und Entwicklungsprozessen.

## Funktionen

- Auswahl vorstrukturierter Feedback- und Bewertungskriterien
- Ergänzung eigener Kriterien
- Reihenfolge von Kopffeldern, Kategorien und Kriterien per Drag-and-drop oder Pfeiltasten
- Undo, Redo und explizites Zurücksetzen trotz Autospeicherung
- Auswahl produktspezifischer Kriterien für unterschiedliche Prüfungs- und Arbeitsformate
- Konfigurierbare Skalen pro Kategorie
- Vorschau als Feedbackbogen oder Checkliste
- Frei anpassbare Kopffelder und konfigurierbare Fußzeile
- Import und Export der Konfiguration als JSON
- Export als PDF/Druckansicht, DOCX, XLSX und ODT

## Datenschutz

Die eingegebenen Inhalte werden lokal im Browser verarbeitet. Sie werden nicht an den Betreiber übermittelt.

Konfigurationen können als JSON-Datei exportiert und später wieder importiert werden.

## Technischer Überblick

Die App ist eine clientseitige Vite/TypeScript-Anwendung ohne Backend.

- Framework: Vanilla TypeScript mit Vite
- Datenquellen: JSON-Dateien im Ordner `content/`
- Persistenz: `localStorage`, versionierter JSON-Import und -Export mit Migrationen
- Exporte: Browser-Druckfunktion, `docx`, `write-excel-file`, `jszip`
- Hosting: statische Auslieferung möglich

Die Anwendung lädt die Kriterien und Produktformate zur Laufzeit aus:

- `content/categories.json`
- `content/scales.json`
- `content/product-formats.json`

## Entwicklung

Voraussetzung: Node.js `>= 20.19.0` oder `>= 22.12.0`

```bash
npm ci
npm run dev
npm run build
npm run check:content
npm run preview
npm run test
npm run lint
npm run typecheck
```

Wichtige Skripte:

- `npm run dev`: startet den lokalen Entwicklungsserver
- `npm run build`: erstellt den Produktionsbuild in `dist/`
- `npm run check:content`: validiert die Content-JSON-Dateien und prüft ID-Kollisionen
- `npm run preview`: zeigt den Produktionsbuild lokal an
- `npm run test`: führt die Unit-Tests aus
- `npm run lint`: prüft den Code mit ESLint
- `npm run typecheck`: prüft die TypeScript-Typen ohne Build-Ausgabe

## Konfiguration

Die Standardkriterien, Skalen und produktformatspezifischen Kriterien werden in JSON gepflegt.

Vereinfachtes Schema für `content/categories.json`:

```json
[
  {
    "id": "<string>",
    "title": "<string>",
    "description": "<string?>",
    "items": [
      {
        "id": "<string>",
        "label": "<string>",
        "description": "<string?>"
      }
    ]
  }
]
```

Vereinfachtes Schema für `content/scales.json`:

```json
[
  {
    "id": "verbal_5",
    "label": "Zustimmungsskala (5 Stufen)",
    "kind": "verbal",
    "labels": [
      "trifft voll zu",
      "trifft eher zu",
      "teils/teils",
      "trifft eher nicht zu",
      "trifft nicht zu"
    ]
  }
]
```

Produktformate folgen in `content/product-formats.json` diesem Grundaufbau:

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
            {
              "id": "ansprechende-bildgestaltung",
              "label": "ansprechende Bildgestaltung"
            }
          ]
        }
      ]
    }
  ]
}
```

## Exportformate

- PDF/Druck: über die Druckfunktion des Browsers
- DOCX: editierbares Word-Dokument
- XLSX: Tabelle mit Kriterien, Punkten und Notizen
- ODT: editierbares Textdokument mit Kopfdaten, formatierten Tabellen und Feedbackbereich

Die ODT-Kompatibilität ist vor allem auf LibreOffice/OpenOffice ausgelegt.

## Einbettung

Da die Anwendung statisch ausgeliefert wird, kann sie grundsätzlich per `iframe` eingebettet werden, sofern die Zielplattform dies zulässt.

```html
<iframe src="https://fbg.haak3.de" width="100%" height="800" style="border:0"></iframe>
```

## Wissenschaftlicher Hintergrund

Der Feedbackbogen-Generator basiert auf Arbeiten zur Systematisierung zukunftsorientierter Prüfungsformate und zur Entwicklung transparenter Feedback- und Bewertungsprozesse.

Weiterführende Informationen stehen in der Anwendung unter „Über das Projekt“.

## Repository

[https://github.com/ChristianHaake/Feedbackbogen-Generator](https://github.com/ChristianHaake/Feedbackbogen-Generator)

## Lizenz

MIT, siehe `LICENSE`.
