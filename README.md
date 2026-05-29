# Feedbackbogen-Generator

Der Feedbackbogen-Generator ist ein webbasiertes Open-Source-Werkzeug zur Erstellung strukturierter Feedback- und Bewertungsbögen für Unterricht, Fortbildungen, Workshops und weitere Lernkontexte.

Die Anwendung läuft vollständig im Browser. Es gibt kein Backend, keine Anmeldung und keine serverseitige Speicherung der eingegebenen Inhalte.

Website: [https://fbg.haak3.de](https://fbg.haak3.de)

## Wofür ist das Tool gedacht?

Der Generator unterstützt dabei, Feedbackbögen systematisch aufzubauen und Bewertungskriterien transparent zu machen. Er richtet sich insbesondere an Lehrkräfte, Fortbildende, Schulentwicklungs- und Beratungsteams sowie weitere Personen, die Feedback- und Bewertungsprozesse nachvollziehbarer gestalten wollen.

Im Mittelpunkt steht nicht nur die abschließende Bewertung, sondern Feedback als Teil von Lern-, Reflexions- und Entwicklungsprozessen.

## Funktionen

- Auswahl vorstrukturierter Feedback- und Bewertungskriterien
- Ergänzung eigener Kriterien
- Auswahl produktspezifischer Kriterien für unterschiedliche Prüfungs- und Arbeitsformate
- Konfigurierbare Skalen pro Kategorie
- Vorschau als Bewertungsbogen oder Checkliste
- Frei anpassbare Kopffelder und optionale Fußzeile
- Lokales Speichern im Browser
- Import und Export der Konfiguration als JSON
- Export als PDF/Druckansicht, DOCX, XLSX und ODP

## Datenschutz

Die eingegebenen Inhalte werden lokal im Browser verarbeitet. Sie werden nicht an den Betreiber übermittelt.

Gespeicherte Konfigurationen liegen im `localStorage` des Browsers. Sie können zusätzlich als JSON-Datei exportiert und später wieder importiert werden.

## Technischer Überblick

Die App ist eine clientseitige Vite/TypeScript-Anwendung ohne Backend.

- Framework: Vanilla TypeScript mit Vite
- Datenquellen: YAML/JSON-Dateien im Ordner `content/`
- Persistenz: `localStorage`
- Exporte: Browser-Druckfunktion, `docx`, `xlsx`, `jszip`
- Hosting: statische Auslieferung möglich

Die Anwendung lädt die Kriterien und Produktformate zur Laufzeit aus:

- `content/items.yaml`
- `content/format.json`

## Entwicklung

Voraussetzung: Node.js `>= 20.19.0` oder `>= 22.12.0`

```bash
npm ci
npm run dev
npm run build
npm run preview
npm run test
npm run lint
```

Wichtige Skripte:

- `npm run dev`: startet den lokalen Entwicklungsserver
- `npm run build`: erstellt den Produktionsbuild in `dist/`
- `npm run preview`: zeigt den Produktionsbuild lokal an
- `npm run test`: führt die Unit-Tests aus
- `npm run lint`: prüft den Code mit ESLint

## Konfiguration

Die Standardkriterien werden in YAML gepflegt. Produktformatspezifische Kriterien liegen in JSON.

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

Produktformate folgen diesem Grundaufbau:

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
              "id": "bildgestaltung",
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
- ODP: einfache Präsentationsdatei mit Titelfolie und Tabelle

Der ODP-Export ist bewusst schlicht gehalten. Die Kompatibilität ist vor allem auf LibreOffice/OpenOffice ausgelegt; PowerPoint kann je nach Version abweichen.

## Einbettung

Da die Anwendung statisch ausgeliefert wird, kann sie grundsätzlich per `iframe` eingebettet werden, sofern die Zielplattform dies zulässt.

```html
<iframe src="https://fbg.haak3.de" width="100%" height="800" style="border:0"></iframe>
```

## Wissenschaftlicher Hintergrund

Der Feedbackbogen-Generator basiert auf Arbeiten zur Systematisierung zukunftsorientierter Prüfungsformate und zur Entwicklung transparenter Feedback- und Bewertungsprozesse.

Weiterführende Informationen stehen in der Anwendung unter „About“.

## Repository

[https://github.com/ChristianHaake/Feedbackbogen-Generator](https://github.com/ChristianHaake/Feedbackbogen-Generator)

## Lizenz

MIT, siehe `LICENSE`.
