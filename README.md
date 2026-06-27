# Feedbackbogen-Generator

Der Feedbackbogen-Generator ist ein webbasiertes Open-Source-Werkzeug zur Erstellung strukturierter Feedback- und Bewertungsbögen für Unterricht, Fortbildungen, Workshops und weitere Lernkontexte.

Die Anwendung läuft vollständig im Browser. Es gibt kein Backend, keine Anmeldung und keine serverseitige Speicherung eingegebener Inhalte.

- Clientseitig: Keine Server-Persistenz. Konfiguration wird lokal im Browser gespeichert (`localStorage`) und als JSON importiert/exportiert.
- Konfiguration via JSON: `content/<sprache>/categories.json` liefert allgemeine Bewertungskriterien, `content/<sprache>/scales.json` die Bewertungsskalen und `content/<sprache>/product-formats.json` die Kriterien der Produktebene. Beim Laden wird validiert; bei Fehlern erfolgt ein Fallback.
- UI: Zweigeteilter Generator – links konfigurierbare Kopffelder, Fußzeilenoptionen, ausgewählte Kriterien, Suche, Bewertungskriterien und Produktebene; rechts die papiernahe Druckvorschau mit Skalen- und Checklistenmodus.
- Skalenmodell: Skalen werden pro Kategorie vergeben; alle Kriterien einer Kategorie verwenden diese Skala.
- Exporte lokal im Browser: PDF/Druck, ausfüllbares PDF, DOCX (`docx`), XLSX (`write-excel-file`), ODT (via ZIP+XML).
- Barrierefreiheit: Tastaturbedienung, sichtbarer Fokus-Ring, `aria-live`-Status, Alt+S (Config herunterladen), Alt+E (Export-Menü öffnen), Strg/Cmd+Z (Undo), Strg/Cmd+Shift+Z (Redo), respektiert `prefers-reduced-motion`.
- Build: Vite + TypeScript (Vanilla), ES Modules. App-Assets lokal gebundled; auf der Live-Website kann betreiberseitig Cloudflare Web Analytics geladen werden.

Website: [https://fbg.haak3.de](https://fbg.haak3.de)

## Release 2.0

Der aktuelle Release-Kandidat baut den Generator zu einem mehrsprachigen, exportfähigen Werkzeug für Feedback- und Bewertungsbögen aus. Die wichtigsten Release-Funktionen:

- Mehrsprachige Oberfläche und Inhaltsdaten für Deutsch, Englisch, Französisch, Spanisch und Niederländisch
- 8 allgemeine Bewertungskategorien mit 40 Kriterien
- 6 Produktformat-Gruppen mit 33 Formaten und 211 produktspezifischen Kriterien
- 7 Skalentypen: verbale Skala, Punkte, Emoji-Skalen, Ampel, Prozent und Ja/Nein
- Kategorien umbenennen, eigene Kategorien ergänzen und eigene Kriterien einzeln oder gesammelt hinzufügen
- Kategoriegewichtungen mit Auswertungsübersicht in Vorschau und Exporten
- Frei konfigurierbare Kopffelder, Dokumenttitel und Fußzeilenfelder
- Papiernahe A4-Vorschau mit Skalenmodus und Checklistenmodus
- Export als PDF/Druckansicht, ausfüllbares PDF, DOCX, XLSX und ODT
- Versionierter JSON-Import und -Export mit Migrationen und Import-Schutzgrenzen
- Autospeicherung im Browser, Undo/Redo, explizites Zurücksetzen und wiederherstellbare Konfiguration
- Responsives Layout mit mobiler Bearbeiten-/Vorschau-/Export-Navigation ab 320 px
- Tastaturbedienung, sichtbarer Fokus, Screenreader-Statusmeldungen und reduzierte Bewegung
- Statisches Cloudflare-Deployment mit Security-Headern, PWA-Dateien und Live-Deploy-Verifikation

Die Version in `package.json` bleibt bis zum erfolgreichen Live-Gate bei `1.0.0`. Der Release ist erst freigabefähig, wenn lokal `npm run verify`, `npm audit --audit-level=low`, `npm run test:e2e` und nach Deployment `npm run verify:live` erfolgreich laufen.

## Wofür ist das Tool gedacht?

Der Feedbackbogen-Generator unterstützt dabei, Feedbackbögen systematisch aufzubauen und Bewertungskriterien transparent zu machen. Er richtet sich insbesondere an Lehrkräfte, Fortbildende, Schulentwicklungs- und Beratungsteams sowie weitere Personen, die Feedback- und Bewertungsprozesse nachvollziehbarer gestalten wollen.

Im Mittelpunkt steht nicht nur die abschließende Bewertung, sondern Feedback als Teil von Lern-, Reflexions- und Entwicklungsprozessen.

## Funktionen

- Auswahl vorstrukturierter Feedback- und Bewertungskriterien in fünf Sprachen
- Ergänzung eigener Kriterien und eigener Kategorien
- Reihenfolge von Kopffeldern, Kategorien und Kriterien per Drag-and-drop oder Pfeiltasten
- Undo, Redo und explizites Zurücksetzen trotz Autospeicherung
- Auswahl produktspezifischer Kriterien für unterschiedliche Prüfungs- und Arbeitsformate
- Konfigurierbare Skalen pro Kategorie und Standard-Skala für neue Kategorien
- Gewichtungen pro Kategorie mit Auswertungsübersicht im Bogen und in den Exporten
- Vorschau als Feedbackbogen oder Checkliste
- Frei anpassbare Kopffelder und konfigurierbare Fußzeile
- Import und Export der Konfiguration als JSON
- Export als PDF/Druckansicht, ausfüllbares PDF, DOCX, XLSX und ODT

## Datenschutz

Die eingegebenen Inhalte werden lokal im Browser verarbeitet. Sie werden nicht an den Betreiber übermittelt.

Konfigurationen werden im `localStorage` des Browsers automatisch gespeichert. Sie können zusätzlich als versionierte JSON-Datei exportiert und später wieder importiert werden. Importierte Dateien werden validiert; zu große, zu komplexe oder nicht unterstützte Konfigurationen ersetzen den aktuellen Stand nicht.

## Technischer Überblick

Die App ist eine clientseitige Vite/TypeScript-Anwendung ohne Backend.

- Framework: Vanilla TypeScript mit Vite
- Datenquellen: lokalisierte JSON-Dateien im Ordner `content/<sprache>/`
- Persistenz: `localStorage`, versionierter JSON-Import und -Export mit Migrationen und Import-Limits
- Exporte: Browser-Druckfunktion, `pdf-lib`, `docx`, `write-excel-file`, `jszip`
- Hosting: statische Auslieferung über Cloudflare Pages/Workers Assets

Die Anwendung lädt die Kriterien und Produktformate zur Laufzeit aus:

- `content/<sprache>/categories.json`
- `content/<sprache>/scales.json`
- `content/<sprache>/product-formats.json`

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
- `npm run verify`: führt Content-Validierung, Lint, Typecheck, Unit-Tests und Build aus
- `npm run verify:live`: prüft nach einem Deployment, ob die Live-Seite den aktuellen Build, Inhaltsdateien, PWA-Dateien und Security-Header ausliefert
- `npm run test:e2e`: prüft die Browser-Workflows mit Playwright

## Konfiguration

Die Standardkriterien, Skalen und produktformatspezifischen Kriterien werden pro Sprache in JSON gepflegt.

Vereinfachtes Schema für `content/<sprache>/categories.json`:

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

Vereinfachtes Schema für `content/<sprache>/scales.json`:

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

Numerische Skalen definieren Standardwerte und Grenzen, innerhalb derer Kategorien eigene Bereiche setzen können:

```json
{
  "id": "punkte_10",
  "label": "Punktebewertung",
  "kind": "numeric",
  "defaultMin": 0,
  "defaultMax": 10,
  "minLimit": 0,
  "maxLimit": 20,
  "maxSteps": 11
}
```

Produktformate folgen in `content/<sprache>/product-formats.json` diesem Grundaufbau:

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
- Ausfüllbares PDF: PDF mit Formularfeldern für Bewertung und Notizen
- DOCX: editierbares Word-Dokument
- XLSX: Tabelle mit Kriterien, Punkten und Notizen
- ODT: editierbares Textdokument mit Kopfdaten, formatierten Tabellen und Feedbackbereich

Wenn Kategorien gewichtet werden, enthalten Vorschau und Exporte zusätzlich eine Auswertungsübersicht. Die Gewichtungen bilden den Rahmen für die spätere Bewertung; die Bewertung selbst wird im exportierten oder gedruckten Bogen eingetragen.

Die ODT-Kompatibilität ist vor allem auf LibreOffice/OpenOffice ausgelegt.

## Einbettung

Da die Anwendung statisch ausgeliefert wird, kann sie grundsätzlich per `iframe` eingebettet werden, sofern die Zielplattform dies zulässt.

```html
<iframe src="https://fbg.haak3.de" width="100%" height="800" style="border:0"></iframe>
```

## Release-Prüfung

Vor einer Veröffentlichung müssen lokal `npm run verify`, `npm audit --audit-level=low` und `npm run test:e2e` erfolgreich laufen. Nach dem Deployment muss zusätzlich `npm run verify:live` gegen `https://fbg.haak3.de` erfolgreich sein. Dieser Live-Check prüft, dass Cloudflare Pages nicht nur die SPA-Fallbackseite ausliefert, sondern auch `/content/*`, PWA-Dateien und die erwarteten Security-Header.

## Wissenschaftlicher Hintergrund

Der Feedbackbogen-Generator basiert auf Arbeiten zur Systematisierung zukunftsorientierter Prüfungsformate und zur Entwicklung transparenter Feedback- und Bewertungsprozesse.

Weiterführende Informationen stehen in der Anwendung unter „Über das Projekt“.

## Repository

[https://github.com/ChristianHaake/Feedbackbogen-Generator](https://github.com/ChristianHaake/Feedbackbogen-Generator)

## Lizenz

GPL-3.0-only, siehe `LICENSE`.
