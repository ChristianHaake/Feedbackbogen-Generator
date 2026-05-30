# Feedbackbogen-Generator

Der Feedbackbogen-Generator ist ein webbasiertes Open-Source-Werkzeug zur Erstellung strukturierter Feedback- und Bewertungsbögen für Unterricht, Fortbildungen, Workshops und weitere Lernkontexte.

Die Anwendung läuft vollständig im Browser. Es gibt kein Backend, keine Anmeldung und keine serverseitige Speicherung eingegebener Inhalte.

- Clientseitig: Keine Server-Persistenz. Konfiguration wird lokal im Browser gespeichert (`localStorage`) und als JSON importiert/exportiert.
- Konfiguration via YAML/JSON: Datei `content/items.yaml` liefert allgemeine Bewertungskriterien und Skalen; `content/format.yaml` ist die editierbare Quelle für Produktformat-Pakete. `content/format.json` wird daraus generiert. Beim Laden wird validiert; bei Fehlern erfolgt ein Fallback.
- UI: Zweigeteilter Generator – links konfigurierbare Kopffelder, Fußzeilenoptionen, ausgewählte Kriterien, Suche, Bewertungskriterien und Produktebene; rechts die papiernahe Druckvorschau mit Skalen- und Checklistenmodus.
- Skalenmodell: Skalen werden pro Kategorie vergeben; alle Kriterien einer Kategorie verwenden diese Skala.
- Exporte lokal im Browser: PDF, DOCX (`docx`), XLSX (`write-excel-file`), ODP (via ZIP+XML).
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
- Export als PDF/Druckansicht, DOCX, XLSX und ODP

## Datenschutz

Die eingegebenen Inhalte werden lokal im Browser verarbeitet. Sie werden nicht an den Betreiber übermittelt.

Konfigurationen können als JSON-Datei exportiert und später wieder importiert werden.

## Technischer Überblick

Die App ist eine clientseitige Vite/TypeScript-Anwendung ohne Backend.

- Framework: Vanilla TypeScript mit Vite
- Datenquellen: YAML/JSON-Dateien im Ordner `content/`
- Persistenz: `localStorage`, versionierter JSON-Import und -Export mit Migrationen
- Exporte: Browser-Druckfunktion, `docx`, `write-excel-file`, `jszip`
- Hosting: statische Auslieferung möglich

Die Anwendung lädt die Kriterien und Produktformate zur Laufzeit aus:

- `content/items.yaml`
- `content/format.yaml`
- `content/format.json` (generiert mit `npm run generate:formats`)

## Entwicklung

Voraussetzung: Node.js `>= 20.19.0` oder `>= 22.12.0`

```bash
npm ci
npm run dev
npm run build
npm run generate:formats
npm run check:formats
npm run preview
npm run test
npm run lint
npm run typecheck
```

Wichtige Skripte:

- `npm run dev`: startet den lokalen Entwicklungsserver
- `npm run build`: erstellt den Produktionsbuild in `dist/`
- `npm run generate:formats`: erzeugt `content/format.json` aus `content/format.yaml`
- `npm run check:formats`: prüft Aktualität und ID-Kollisionen der generierten Produktformate
- `npm run preview`: zeigt den Produktionsbuild lokal an
- `npm run test`: führt die Unit-Tests aus
- `npm run lint`: prüft den Code mit ESLint
- `npm run typecheck`: prüft die TypeScript-Typen ohne Build-Ausgabe

## Konfiguration

Die Standardkriterien und produktformatspezifischen Kriterien werden in YAML gepflegt. `content/format.json` ist ein generiertes Laufzeitartefakt und darf nicht manuell bearbeitet werden.

Vereinfachtes YAML-Schema:

```yaml
categories:
  - id: <string>
    title: <string>
    description: <string?>
    items:
      - id: <string>
        label: <string>
        description: <string?>

scales:
  - id: verbal_5
    kind: verbal
    labels:
      - trifft voll zu
      - trifft eher zu
      - teils/teils
      - trifft eher nicht zu
      - trifft nicht zu
```

Produktformate folgen in `content/format.yaml` diesem Grundaufbau:

```yaml
version: 1
groups:
  - id: fotoprodukte
    title: Fotoprodukte
    formats:
      - id: fotostory
        title: Fotostory
        criteria:
          - label: ansprechende Bildgestaltung
```

## Exportformate

- PDF/Druck: über die Druckfunktion des Browsers
- DOCX: editierbares Word-Dokument
- XLSX: Tabelle mit Kriterien, Punkten und Notizen
- ODP: paginierte Präsentationsdatei mit Titelfolie, formatierten Tabellen und Feedbackfolie

Die ODP-Kompatibilität ist vor allem auf LibreOffice/OpenOffice ausgelegt; PowerPoint kann je nach Version abweichen.

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
