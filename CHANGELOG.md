# Changelog

Alle wesentlichen Änderungen am Feedbackbogen-Generator werden in dieser Datei dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/). Das Projekt verwendet [Semantic Versioning](https://semver.org/lang/de/).

> Die Einträge bis zum 10. Juni 2026 wurden rückwirkend aus der Commit-Historie rekonstruiert. Da für diesen Zeitraum keine Git-Tags oder GitHub-Releases existieren, fasst Version 1.0.0 den stabilisierten Projektstand vom 30. Mai 2026 zusammen.

## [Unreleased]

Keine Einträge.

## [2.0.0] - in Vorbereitung

### Added

- Mehrsprachige Oberfläche und lokalisierte Inhaltsdaten für Deutsch, Englisch, Französisch, Spanisch und Niederländisch.
- Sprachumschalter mit gespeicherter Browser-Präferenz und relokalisierten Standard-Kopffeldern.
- 8 allgemeine Bewertungskategorien mit 40 Kriterien.
- 6 Produktformat-Gruppen mit 33 Formaten und 211 produktspezifischen Kriterien.
- 7 Skalentypen: verbale Skala, Punkte, Emoji-Skalen, Ampel, Prozent und Ja/Nein.
- Neue Bewertungskategorie „Sprachgebrauch“ mit zugehörigen Kriterien.
- Eigene Kategorien, umbenennbare Kategorien und Masseneingabe eigener Kriterien.
- Standard-Skala für neue Kategorien sowie individuelle Skalen und numerische Wertebereiche pro Kategorie.
- Ausfüllbares PDF mit Formularfeldern als zusätzlicher Export.
- Auswertungsübersicht für gewichtete Kategorien in Vorschau, PDF, ausfüllbarem PDF, DOCX, XLSX und ODT.
- Warnung beim Export, wenn konfigurierte Kategoriegewichtungen nicht 100 % ergeben.
- Versionierter JSON-Import mit Migration älterer Konfigurationen und Schutzgrenzen für Dateigröße, Strukturkomplexität und Eintragsmengen.
- Mobile Bearbeiten-/Vorschau-/Export-Navigation und Fit-to-width-A4-Vorschau.
- Live-Deploy-Verifikation für aktuelle Assets, Content-JSON, PWA-Dateien und Security-Header.
- Browser-Regressionstests für 320px-Mobile-Layout, Touch-Zielgrößen und Fit-to-width-Vorschau.

### Changed

- Generator-Oberfläche auf den Release-Workflow ausgerichtet: linke Konfiguration, rechte A4-Vorschau, mobile Tab-Navigation.
- Exportdateien verwenden lokalisierte Dateinamen, Tabellenbeschriftungen und Skalenbezeichnungen.
- XLSX-Export schützt tabellarische Zellwerte vor Formel-Präfixen.
- PWA- und Content-Dateien werden mit revalidierbaren Cache-Headern ausgeliefert; fingerprinted Assets bleiben immutable.
- Kleinere Formatkorrekturen an Inhalten und Darstellung.
- Mobile Darstellung der Titelwahl, Touch-Ziele, Fußzeilenlinks und A4-Vorschau verbessert.
- README um Live-Release-Prüfung mit `npm run verify:live` ergänzt.

### Fixed

- Mobile Sprachwahl bleibt erreichbar.
- Footer-Links, ARIA-Beschriftungen, Ampelskala und XLSX-Textbausteine sind in den unterstützten UI-Sprachen lokalisiert.
- Importfehler ersetzen keine vorhandene Konfiguration.
- DOCX-, XLSX-, ODT-, PDF- und ausfüllbarer-PDF-Export übernehmen Kopfdaten, Fußzeile, Skalenmodus und Gewichtungen konsistenter.
- Titeloptionen werden auf sehr schmalen deutschen Mobile-Viewports nicht mehr abgeschnitten.
- Die mobile Vorschau erzwingt keinen horizontalen A4-Scroll mehr als Standardansicht.

## [1.0.0] - 2026-05-30

### Added

- Browserbasierter Generator für Feedback- und Bewertungsbögen ohne Backend.
- Auswahl allgemeiner Kriterien sowie produktspezifischer Kriterien für unterschiedliche Arbeits- und Prüfungsformate.
- Eigene Kriterien innerhalb bestehender Kategorien.
- Konfigurierbare verbale und numerische Bewertungsskalen pro Kategorie.
- Anpassbare Wertebereiche für numerische Skalen.
- Frei konfigurierbare Kopffelder, Dokumenttitel und Fußzeilenelemente.
- Papiernahe Live-Vorschau als Feedbackbogen oder Checkliste.
- Sortierung von Kopffeldern, Kategorien und Kriterien per Drag-and-drop und Tastatur.
- Undo, Redo und Zurücksetzen der aktuellen Konfiguration.
- Automatische lokale Speicherung im Browser.
- Versionierter Import und Export der Konfiguration als JSON einschließlich Migration älterer Konfigurationen.
- Export als PDF, DOCX, XLSX und ODT.
- Inhaltsseiten für Hilfe, Projektinformationen, Datenschutz und Impressum.
- Tastaturkürzel, sichtbare Fokusführung, Statusmeldungen für Screenreader und Berücksichtigung reduzierter Bewegungen.
- Automatisierte Tests, Typprüfung, Linting und Validierung der Inhaltsdateien.
- Automatisierte Bereitstellung als statische Webanwendung.

### Changed

- Umbenennung und Neugestaltung vom „Bewertungsbaukasten“ zum „Feedbackbogen-Generator“.
- Überarbeitung der Oberfläche zu einem zweigeteilten Generator mit Konfiguration und Druckvorschau.
- Umstellung der Inhaltsquellen von YAML auf validierte JSON-Dateien.
- Vereinheitlichung von Vorschau und Dokumentexporten.
- Verbesserte mobile Darstellung und Navigation.

### Fixed

- Darstellungsprobleme der Fußzeile auf mobilen Geräten.
- Abweichende Ausrichtung von Vorschau und Export.
- Fehlerhafte Icon-Pfade und uneinheitliche Checkbox-Ausrichtung.
- Fehler beim Laden des Vite-Einstiegspunkts und bei der Inhaltsvalidierung.

## Frühe Entwicklung - 2025-09-10

### Added

- Erster Prototyp als vollständig clientseitige Vite- und TypeScript-Anwendung.
- YAML-basierte Kriterien und Skalen.
- Lokale Speicherung sowie Import und Export der Konfiguration.
- Erste Dokumentexporte und GitHub-Pages-Deployment.

[Unreleased]: https://github.com/ChristianHaake/Feedbackbogen-Generator/compare/afb47c5...master
[2.0.0]: https://github.com/ChristianHaake/Feedbackbogen-Generator/compare/afb47c5...master
[1.0.0]: https://github.com/ChristianHaake/Feedbackbogen-Generator/tree/afb47c5
