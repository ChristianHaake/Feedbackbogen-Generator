---
name: feedbackbogen-config
description: Erstellt oder korrigiert JSON-Configs für den Feedbackbogen-Generator, wenn Nutzende einen Feedback- oder Bewertungsbogen mit vorhandenen oder eigenen Kriterien vorbereiten möchten.
---

# Feedbackbogen-Config

Erzeuge eine valide Config-Datei, die Nutzende über „Config öffnen“ in den
Feedbackbogen-Generator laden und dort weiterbearbeiten können. Die Webapp
enthält keine KI-Anbindung; die JSON-Datei ist die einzige Übergabe.

## Verbindliche Quellen

Lies vor dem Erstellen oder Korrigieren einer Config:

1. [Formatbeschreibung](../../docs/config-format-v5.md)
2. [JSON Schema](../../content/config/schema-v5.json)
3. [Minimales Beispiel](../../content/config/minimal-v5.json) und
   [vollständiges Beispiel](../../content/config/full-v5.json)
4. Für die gewünschte Sprache die drei Kataloge unter
   `../../content/<sprache>/`: `categories.json`, `scales.json` und
   `product-formats.json`

Nutze für eine Erklärung an Nutzende zusätzlich das
[Schritt-für-Schritt-Tutorial](references/user-tutorial.md).

## Config erstellen

- Verwende ausschließlich Config-Version 5 und gültiges JSON.
- Übernimm vorhandene Kategorien, Kriterien, Skalen und Produktformate nur mit
  den stabilen IDs aus den Katalogen der gewählten Sprache.
- Definiere neue Kategorien ausdrücklich in `customCategories` und neue
  Kriterien in `customItems`. Referenziere ausgewählte eigene Kriterien
  zusätzlich in `selectedItems`.
- Nutze nur Felder und Werte aus dem Schema. Erfinde keine Eigenschaften,
  bedingten Regeln oder neue Skalentypen.
- Halte Reihenfolgen, Skalen, Gewichtungen und Referenzen konsistent. Eine
  Reihenfolge darf nur ausgewählte Inhalte enthalten.
- Prüfe das Ergebnis gegen Schema, Katalog-IDs und die dokumentierten Grenzen.
- Gib die Config als JSON-Datei aus. Verwende weder YAML noch Kommentare im
  JSON und mische keine Erläuterungen in die Datei.

Wenn Angaben fehlen, wähle die kleinste fachlich sinnvolle Config und lasse
optionale Felder weg. Erfinde keine fachlichen Anforderungen.

## Fehler korrigieren

Wenn Nutzende kopierte Importfehler bereitstellen, ändere nur die genannten
Pfade und davon abhängige Referenzen. Entferne keine gültigen Inhalte, nur um
die Validierung zu umgehen. Prüfe danach die gesamte Datei erneut.

## Grenzen

- Importiere die Datei nicht selbst und überschreibe keine bestehende Arbeit.
- Ein Sprachwechsel lädt die Webapp neu. Das Ersetzen bestehender Arbeit ist in
  diesem Fall nicht per Undo rückgängig zu machen.
- Die Verarbeitung in der Webapp bleibt lokal; Behauptungen über das externe
  KI-Tool richten sich nach dessen eigenen Datenschutzbedingungen.
- Erzeuge keine Skills, App-Funktionen oder Regel-Engine, wenn nur eine Config
  angefordert wurde.
