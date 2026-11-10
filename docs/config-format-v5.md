# Config-Format Version 5

Die Config-Datei ist zugleich bearbeitbare Sicherung und Austauschformat für
externe KI-Werkzeuge. Die Webapp verarbeitet sie vollständig lokal im Browser.

## Minimale Datei

```json
{
  "format": "feedbackbogen-generator",
  "schemaVersion": 5,
  "language": "de",
  "selectedItems": [
    { "categoryId": "allgemeine", "itemId": "abgabe" }
  ]
}
```

Nur `format`, `schemaVersion`, `language` und `selectedItems` sind verpflichtend.
Fehlende optionale Felder erhalten die Standardwerte der Webapp.

## Referenzen und eigene Inhalte

- Vorhandene Kategorien, Kriterien, Skalen und Produktformate werden über die
  IDs aus `content/<sprache>/` referenziert.
- Die IDs sind in allen unterstützten Sprachen identisch.
- Neue Kategorien stehen in `customCategories`.
- Neue Kriterien stehen in `customItems` und referenzieren ihre `categoryId`.
- Ein neues Kriterium wird erst verwendet, wenn es zusätzlich in
  `selectedItems` referenziert wird.
- Reihenfolgen, Skalen und Gewichtungen dürfen nur definierte Kategorien und
  Kriterien referenzieren.

Eine ungültige Datei wird nicht teilweise geladen. Die Webapp zeigt
strukturierte Fehler mit JSON-Pfaden, ohne die aktuelle Arbeit zu verändern.

## Öffentliche Dateien

- Schema: [`content/config/schema-v5.json`](../content/config/schema-v5.json)
- Minimales Beispiel: [`content/config/minimal-v5.json`](../content/config/minimal-v5.json)
- Vollständiges Beispiel: [`content/config/full-v5.json`](../content/config/full-v5.json)

Das Schema prüft die Dateistruktur. Katalogreferenzen und Skalenbereiche prüft
zusätzlich die Webapp gegen ihre aktuell geladenen Inhaltsdaten.

## Kompatibilität

Die Webapp importiert bestehende Versionen 1 bis 4 weiterhin und migriert sie
auf Version 5. Fehlt dort eine Sprache, wird die aktuell aktive Webapp-Sprache
verwendet. Version 5 ist strikt: unbekannte Felder oder fehlerhafte Teilwerte
werden nicht still entfernt.
