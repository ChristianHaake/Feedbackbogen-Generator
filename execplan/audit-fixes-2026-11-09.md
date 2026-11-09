# Auditfehler beheben und verifizieren

Dieser ExecPlan wird während der Umsetzung fortgeschrieben. Der Benutzer hat am 9. November 2026 die Behebung aller Probleme aus `docs/audit-2026-11-09.md` beauftragt.

## Purpose / Big Picture


Gespeicherte Arbeit darf nicht beim Neuladen verschwinden. Importe müssen vor Zustandsübernahme sicher sein. Exporte müssen Unicode und mehrseitige Inhalte zuverlässig verarbeiten. Tastaturbedienung und umfangreiche Dokumente sollen ohne Fokusverlust oder unbegrenzte Historie funktionieren.

## Progress


- [x] Audit, README, gemeinsame Standards und DEV-Memory-Kontext gelesen.
- [x] Besitzbereiche für unabhängige Änderungen vergeben.
- [x] Persistenz, Importgrenzen und Wiederherstellung absichern.
- [x] Eingabeverhalten, Fokus, Gewichtsprüfung und Undo-Historie korrigieren.
- [x] Unicode, Paginierung und XML-Exporte korrigieren.
- [x] Markdown, Support, Datenschutz, Runtime, CI und Übersetzungsprüfung vervollständigen.
- [x] Sicherheitsupdates installiert; lokale Gates und zwei Browser geprüft.
- [x] Transitives deepmerge-Paket lokal gegen Prototypveränderung gepatcht; strenges npm-Audit ist grün.
- [ ] Extern offen: autorisiertes Produktionsdeployment und Live-Cacheprüfung.
- [ ] Umgebungsbedingt offen: Firefox-Anwendungslauf; leerer Browserstart scheitert isoliert.
- [x] Live-Abweichung dokumentieren und Deploymentvorbereitung prüfen.

## Surprises & Discoveries


Der Audit zeigte einen unterschiedlichen Vertrag zwischen Editor und Wiederherstellung. Ein Titel mit 2.001 Zeichen wird gespeichert und beim nächsten Start verworfen. Der Produktionsstand liefert außerdem zwei Service-Worker-Skripte mit einer Stunde Cache-Laufzeit aus, obwohl das Repository sofortige Revalidierung vorsieht.

## Decision Log


- Entscheidung: Bereits abgelehnte Autosave-Daten bleiben unverändert und erhalten einen Download zur Wiederherstellung. Begründung: Eingabegrenzen allein retten vorhandene Daten nicht. Datum: 2026-11-09, Codex.
- Entscheidung: Bestehenden Vanilla-TypeScript-Stack und Exportbibliotheken erhalten. Begründung: Die Probleme erfordern keine neue Anwendungsarchitektur. Datum: 2026-11-09, Codex.
- Entscheidung: Exportmodule bleiben im Precache; große Unicode-Schriften werden beim ersten Onlineexport geladen und danach separat gecacht. Begründung: So wächst der Erstbesuchs-Download nicht um 7,4 MB. Ein Offline-Neuladen mit anschließendem Export wurde geprüft. Diese Grenze steht in README und Hilfe. Datum: 2026-11-09, Codex.
- Entscheidung: Kein Deployment ohne gesondert konkrete Freigabe. Begründung: Der Auftrag umfasst die Fehlerbehebung; die Live-Bestätigung hängt von veröffentlichten Artefakten und Betreiberregeln ab. Datum: 2026-11-09, Codex.

## Outcomes & Retrospective


12 Auditbefunde sind lokal behoben. 128 Unit-/Integrationstests, 52 frühere Chromium-/WebKit-Prüfungen sowie 26 erneute Chromium-Prüfungen bestehen; npm meldet 0 Befunde. Ein isolierter Firefox-Start scheitert am Betriebssystem. Die Produktionsauslieferung und Live-Cacheprüfung bleiben offen. Der Abschlussbericht steht in docs/audit-fixes-2026-11-09.md.

## Context and Orientation


Die App verarbeitet sämtliche Dokumentdaten im Browser. `src/main.ts` verwaltet Zustand, Undo und Eingabehandler. `src/storage.ts` validiert JSON und speichert unter `bbk:config`. `src/ui/templates.ts` erzeugt DOM-Elemente. `src/export/` enthält getrennte Renderer für PDF, Formular-PDF, DOCX, ODT und XLSX. Vite kopiert `content/` und erstellt über Workbox einen Offlinecache. Ein Undo-Snapshot ist eine aufbewahrte frühere Konfiguration.

Die vorhandene Benutzeränderung an `AGENTS.md` bleibt erhalten. Neue Tests gehören zu `tests/` beziehungsweise `tests/e2e/`. Externe Betreiberregeln werden nicht als lokal behoben ausgegeben.

## Plan of Work


Zuerst in `src/storage.ts` einen gemeinsamen Grenzprüfer und sichere IDs verwenden. Bei ungültigem Autosave weitere automatische Schreibversuche sperren. Ein expliziter, bestätigter Import oder Reset darf den Schutz aufheben. Der Editor prüft Änderungen vor dem endgültigen Speichern und zeigt Ablehnungen an.

Danach in `src/main.ts` zusammenhängende Texteingaben gruppieren, die Undo-Historie begrenzen und Vorschauarbeit bündeln. Vollständiges Neurendern restauriert den Fokus. Die Exportwarnung verwendet dieselben Zeilen wie die Auswertung. Hinzufügefelder leeren vor dem synchronen Callback und behalten ihren Text bei Ablehnung.

Die PDF-Renderer müssen Zeilen innerhalb großer Blöcke auf weitere Seiten verteilen. Messung und Ausgabe verwenden dieselbe Schrift. Unicode-Schriften werden lokal gebündelt; Formulare verwenden dieselben Schriften für ihre Darstellung. Office-XML entfernt unzulässige Steuerzeichen auch bei direkten Exportaufrufen.

`src/content-pages.ts` vereinheitlicht die Markdown-Erkennung und ergänzt `/support`. Die fünf Sprachdateien und `content/support.md` liefern den passenden Inhalt. README und Datenschutz beschreiben Speicherung, Exportgrenzen und die deaktivierte iframe-Einbettung. Eine kleine Übersetzungsprüfung und ein CI-Workflow sichern den Standard dauerhaft.

Abhängigkeiten werden gezielt auf sichere unterstützte Stände gebracht. Der Live-Cachebefund bleibt bis zum Deployment und erfolgreichem `verify:live` offen.

## Concrete Steps


Alle Befehle laufen im Repository `/Users/christianhaake/Git-Repos/Feedbackbogen-Generator`.

    npm run verify
    npm audit --audit-level=low
    npm run test:e2e
    PLAYWRIGHT_BROWSERS=all npm run test:e2e
    npm run verify:live

Wenn verwaltete Playwright-Browser fehlen, installiere sie oder verwende für lokale Chrome-Prüfungen eine ausdrücklich ausgewiesene temporäre Konfiguration. Ändere das Releasegate nicht, um fehlende Prüfungen zu verdecken.

## Validation and Acceptance


Ein Grenzübertritt im Editor erhält bestehende Arbeit und zeigt eine Meldung. Ein bereits ungültiger Autosave wird nicht überschrieben und kann heruntergeladen werden. Reservierte oder zitierte Import-IDs ersetzen den aktiven Zustand nicht.

PDF-Tests prüfen Unicode und Zeichenkoordinaten auf der jeweiligen Seite. Lange Kriterien und 50 gewichtete Kategorien bleiben vollständig sichtbar. DOCX und ODT enthalten parsebares XML. Tastaturtests wählen mehrere Kriterien ohne Fokusverlust. Erfolgreiches Hinzufügen leert den Input; abgelehntes Hinzufügen erhält ihn.

Die lokalen Gates müssen bestehen. Sicherheitsmeldungen werden nicht nur nach npm-Zählung, sondern auch nach betroffenen Laufzeitpfaden bewertet. Nicht ausführbare reale Office-, Screenreader- oder Liveprüfungen werden ausdrücklich als Grenze festgehalten.

## Idempotence and Recovery


Keine Nutzerdaten oder ursprünglichen Autosave-Bytes löschen. Keine Commits oder Veröffentlichungen ohne Auftrag. Nach Prüfungen temporäre Tests entfernen und lokale Server beenden. Paketänderungen bleiben über `package-lock.json` reproduzierbar.

## Artifacts and Notes


Der Ausgangsaudit liegt unter `docs/audit-2026-11-09.md`. Der Abschlussbericht erhält eine Tabelle mit korrigierten und weiterhin extern abhängigen Befunden sowie den tatsächlich ausgeführten Prüfergebnissen.

## Interfaces and Dependencies


Storage stellt `configWithinLimits(value)`, `CONFIG_LIMITS`, `getConfigRecovery()`, `downloadConfigRecovery()` und `replaceStoredConfig(config)` bereit. Add-Handler geben `false` bei Ablehnung zurück. Sonstige Rückgaben bedeuten Erfolg. Vorhandene Exportfunktionen und Dateiformate bleiben kompatibel.

Revision 2026-11-09: Erstfassung nach Benutzerauftrag; sichere Wiederherstellung vor oberflächlicher Begrenzung priorisiert.

Revision 2026-11-09: Umsetzungs- und Prüfergebnisse ergänzt; externe Releaseblocker ausdrücklich offen gelassen. Ein sicherer Paketstand wurde nicht durch einen verwundbaren Downgrade ersetzt.
