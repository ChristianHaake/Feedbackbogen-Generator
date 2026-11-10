# Tutorial: Feedbackbogen mit einem KI-Tool vorbereiten

Mit diesem Ablauf erstellt ein externes KI-Tool eine Config-Datei. Die Datei
wird anschließend lokal im Feedbackbogen-Generator geprüft und bearbeitet.

## 1. Repository als Kontext angeben

Verweise das KI-Tool auf:

- Repository: `https://github.com/ChristianHaake/Feedbackbogen-Generator`
- Skill: `skill/feedbackbogen-config/SKILL.md`

Das Tool soll den Skill sowie die darin verlinkten Schema-, Beispiel- und
Katalogdateien lesen.

## 2. Auftrag formulieren

Vorlage:

```text
Nutze den Skill feedbackbogen-config aus dem Repository
ChristianHaake/Feedbackbogen-Generator.

Erstelle eine Config-Datei für folgenden Feedbackbogen:
- Zielsprache: Deutsch
- Zielgruppe: [Zielgruppe]
- Anlass: [Unterricht, Workshop, Prüfung oder anderes]
- Ziel des Feedbacks: [Ziel]
- Gewünschte vorhandene Kriterien: [optional]
- Eigene Kategorien oder Kriterien: [optional]
- Skala und Gewichtungen: [optional]

Nutze Config-Version 5 und gib ausschließlich die fertige JSON-Datei aus.
```

Je genauer Zielgruppe, Anlass und Feedbackziel beschrieben sind, desto weniger
fachliche Nacharbeit ist erforderlich.

## 3. JSON-Datei speichern

Speichere die KI-Ausgabe als Datei mit der Endung `.json`. Ändere die Struktur
nicht in einem Textverarbeitungsprogramm und speichere sie nicht als YAML.

## 4. Config in der Webapp öffnen

1. Öffne `https://fbg.haak3.de`.
2. Wähle „Config öffnen“.
3. Wähle die erzeugte JSON-Datei aus.
4. Bestätige das Ersetzen nur, wenn die bisherige Arbeit nicht mehr benötigt
   oder zuvor heruntergeladen wurde.

Enthält die Datei eine andere Sprache, wechselt die Webapp die Sprache und lädt
neu. Eine dabei ersetzte bestehende Config kann nicht über Undo zurückgeholt
werden.

## 5. Fehler korrigieren

Eine ungültige Datei ersetzt die aktuelle Arbeit nicht. Die Fehlerbox nennt die
betroffenen JSON-Pfade.

1. Wähle „Fehler kopieren“.
2. Füge die Fehler zusammen mit der ursprünglichen Datei in das KI-Tool ein.
3. Fordere eine Korrektur nach demselben Skill an.
4. Öffne die korrigierte Datei erneut in der Webapp.

Das KI-Tool soll die genannten Fehler beheben und keine gültigen Inhalte
ungefragt entfernen.

## 6. In der Webapp nacharbeiten und sichern

Prüfe Formulierungen, Auswahl, Reihenfolge, Skalen und Gewichtungen im normalen
Editor. Lade den aktuellen Stand anschließend über „Config herunterladen“ als
neue Sicherung herunter.

Die Webapp verarbeitet Config und Eingaben lokal im Browser. Ob und wie das
externe KI-Tool Eingaben verarbeitet, hängt von dessen Datenschutzbedingungen
ab.
