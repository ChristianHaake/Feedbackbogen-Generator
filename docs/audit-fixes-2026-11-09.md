# Behebung der Auditbefunde vom 9. November 2026

## Ergebnis

**12 der 13 Auditbefunde sind lokal behoben.** Offen ist nur noch die Prüfung und Korrektur der Live-Auslieferung nach dem Produktionsdeployment.

128 Unit- und Integrationstests, 52 frühere Browserprüfungen in Chromium und WebKit sowie die erneute Chromium-Regressionssuite mit 26 Fällen bestehen. Content-, Übersetzungs-, Lint-, Typ-, Build- und npm-Sicherheitsprüfung bestehen ebenfalls.

## Befunde und Belege

| Befund | Stand | Umsetzung und Prüfung |
| --- | --- | --- |
| A01 Autosave-Datenverlust | Behoben | Gemeinsame Eingabe-/Importgrenzen; abgelehnte Originaldaten bleiben gesperrt und herunterladbar; Wiederherstellung, Reset, UTF-8-Grenzen und Speicherfehler getestet |
| A02 Unsichere Import-IDs | Behoben | Reservierte, zitierte und doppelte IDs sowie Kollisionen mit dem gesamten Laufzeitkatalog werden vor Übernahme abgelehnt; Import-/Starttests und Browserregressionen |
| A03 Unicode-PDF | Behoben mit dokumentiertem Zeichenvorrat | Lokal gebündelte Schrift für erweitertes Latein, vereinfachtes Chinesisch und viele monochrome Emojis; gemischte Formularwerte gespeichert und erneut gelesen; unbekannte Zeichen erzeugen eine konkrete Meldung mit DOCX-/ODT-Alternative |
| A04 PDF-Seitenüberlauf | Behoben | Gemeinsamer Renderer verteilt Titel, Kopffeldzeilen, Kategorien, Kriterien und Auswertung auf Folgeseiten; Tests prüfen Text-Erhalt und Seitenränder |
| A05 PDF-Zeilenüberlappung | Behoben | Dieselbe Schrift und Breite für Umbruch und Ausgabe; Nachfolger bleibt unter sämtlichen Zeilen desselben Kriteriums |
| A06 Ungültiges Office-XML | Behoben | Import lehnt unzulässige Zeichen ab; direkte DOCX-/ODT-Aufrufe bereinigen XML-Texte zusätzlich; XML-Parserregressionen |
| A07 Fokusverlust | Behoben | Fokuswiederherstellung und stabile Control-IDs; Auswahl sowie Einzel-, Bulk- und Kategorie-Hinzufügen per Tastatur in zwei Browsern geprüft |
| A08 Hinzufügefelder | Behoben | Vor Callback geleert; bei Ablehnung erhalten; synchrone Neurender- und Browsertests |
| A09 Falsche Gewichtswarnung | Behoben | Warnung verwendet dieselben exportierten Zeilengruppen wie die Auswertung; leere Kategorien zählen nicht mit |
| A10 Eingabeperformance | Behoben | Unveränderte Daten zwischen früheren Zuständen geteilt; Texteingaben gruppiert; Historie auf 100 Aktionen begrenzt; Vorschau und Autosave gebündelt |
| A11 Markdown-Endlosschleife | Behoben | Gleiche Erkennung in Schleifenzweigen; eingerückte Überschriften, leere Marker, sichere Links und inertes HTML getestet |
| A12 Dependency-Sicherheitsgate | Teilweise behoben, extern offen | 33 betroffene Pakete auf vier niedrige Meldungen reduziert; keine mittleren, hohen oder kritischen Meldungen; alle vier verbleibenden Meldungen gehören zu derselben ungepatchten Build-Kette |
| A13 Live-Cachefehler | Extern offen | Lokale Header korrekt; Live-Auslieferung unverändert. Abschließender Live-Check erkennt alten Build und weiterhin `max-age=3600` auf zwei Skripten |

## Weitere geschlossene Lücken

Ein gültiger Import ersetzt nichtleere Arbeit erst nach Bestätigung. Ungültige Spracheinstellungen können keine Prototype-Namen mehr als Sprache auswählen. Exporte erfassen sämtliche Parameter vor dem ersten asynchronen Modulimport. Ein verspäteter Exportabschluss kann keine später gestartete Operation entsperren.

Import und Reset funktionieren weiterhin im Arbeitsspeicher, wenn der Browserspeicher nicht beschreibbar ist. Eine sichtbare Warnung erklärt die fehlende Speicherung. Geschützte Originaldaten bleiben dabei unangetastet.

Die Unterstützen-Seite existiert in allen fünf Oberflächensprachen. Der Footer führt zunächst dorthin. Der externe Spendenlink ist lokalisiert, sicher geöffnet und mit einem Datenschutzhinweis versehen.

README, Hilfe und Datenschutz beschreiben lokale Schlüssel, Speicherdauer, Löschung, Wiederherstellung und Formatgrenzen. Die widersprüchliche iframe-Anleitung wurde durch die tatsächlich geltende Einbettungssperre ersetzt.

Node 26 ist fixiert. Ein GitHub-Workflow prüft das Lockfile, die lokalen Gates und die Browsermatrix. Eine Übersetzungsprüfung prüft Schlüssel, Leerwerte und übernommene Funktionsparameter; eingebaute Negativfälle prüfen den Validator selbst.

XLSX bleibt ausdrücklich eine tabellarische Auswertung ohne Kopfdaten oder Dokumentlayout. PDF-Zugänglichkeitsgrenzen und editierbare Office-Alternativen sind dokumentiert. Diese Entscheidungen ändern keine bestehenden Exportverträge stillschweigend.

## Verifikation

| Befehl oder Prüfung | Ergebnis |
| --- | --- |
| `npm run verify` | Bestanden: Content, Übersetzungen, ESLint, TypeScript, 127 Tests, Build |
| `npm test -- --run --coverage` | 127 Tests bestanden; Gesamtzeilenabdeckung 74,23 % |
| Browsermatrix Chromium + WebKit | 52/52 bestanden; 26 Fälle je Browser |
| Firefox | Nicht prüfbar: Browserstart scheitert auch ohne Anwendungs-URL nach 10 Sekunden mit macOS-Sandbox-/Framebufferfehler |
| Font-Neugenerierung | Reproduzierbarer Generator und Glyphen-Selbstprüfung erfolgreich; Original-OFL-Lizenzen liegen bei und werden ausgeliefert |
| Offline-PDF | Erster Onlineexport lädt und cached Schriften; anschließendes Offline-Neuladen und Formular-PDF-Download erfolgreich |
| `npm audit --audit-level=low` | Exit 1: ausschließlich vier niedrige Build-Meldungen; keine gemeldeten Produktionsabhängigkeiten |
| `npm run verify:live` | Exit 1: Live-Seite referenziert alten Build; zwei Skripte haben weiterhin eine Stunde Cache-Laufzeit |

Die Tests verwenden reale Exportbibliotheken und die ausgelieferten Schriften. Koordinatenprüfungen berücksichtigen die jeweilige PDF-Seite. Die Prüfungen bestätigen keine allgemeine Barrierefreiheits- oder Rechtsfreigabe.

Die Unit-Zeilenabdeckung von `src/main.ts` steigt von 0 % auf 62,07 %, von `src/content-pages.ts` auf 91,17 % und von `src/storage.ts` auf 95,81 %. Ein normaler und ein ausfüllbarer PDF-Aufruf verwenden jetzt denselben getesteten Renderer. Gesamtwerte verschiedener Vitest-Hauptversionen sind wegen geänderter Erfassung nicht vollständig vergleichbar.

## Performancevergleich

Verglichen wurden dieselben synthetischen Dokumentgrößen wie im Ausgangsaudit. Jeweils 30 synchrone Titel-Ereignisse im installierten Chrome; Heapmessung nach Garbage Collection. Beim neuen Stand wurden zusätzlich die ausstehende Vorschau und Autospeicherung abgewartet.

| Ausgewählte eigene Kriterien | Alter Eingabehandler, Mittel | Neuer Eingabehandler, Mittel | Alter zusätzlicher Heap | Neuer zusätzlicher Heap |
| --- | ---: | ---: | ---: | ---: |
| 0 | 0,11 ms | 0,07 ms | 0,11 MB | 0,51 MB |
| 100 | 3,57 ms | 0,18 ms | 0,79 MB | 0,49 MB |
| 1.000 | 35,47 ms | 1,13 ms | 6,50 MB | 0,47 MB |

Bei 1.000 Kriterien sinkt die synchrone Handlerzeit in dieser Probe um etwa Faktor 31. Die Vorschauarbeit entfällt nicht, sondern wird pro Frame gebündelt. Der feste Speicheraufwand ist bei kleinen Dokumenten höher; das Wachstum durch vollständige Kopien jeder Texteingabe entfällt.

Die erste PDF-Nutzung lädt rund 7,4 MB unkomprimierte lokale Schriftdateien. Diese sind bewusst nicht Teil des anfänglichen Offline-Precaches. Danach erlaubt ein eigener Schriftcache weitere Offlineexporte. Der normale Precache bleibt bei rund 1.834 KiB laut Build.

## Verbleibende externe Abhängigkeiten

### Gepatchtes Build-Paket

Die vier npm-Meldungen stammten aus `vite-plugin-pwa` → `workbox-build` → `@rollup/plugin-node-resolve` → `deepmerge@4.3.1`. Da die [Advisory GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) keinen Upstream-Patch nennt, ersetzt eine npm-Override diese transitive Abhängigkeit durch `vendor/deepmerge@4.3.2`.

Die lokale Kopie behält die bestehende API bei und verhindert die Prototypveränderung durch eigene `__proto__`-Schlüssel. Der Regressionstest deckt den betroffenen Pfad ab; `npm audit --audit-level=low` ist mit 0 Befunden erfolgreich. Die Kopie ist zu entfernen, sobald ein offizielles Upstream-Release vorliegt.

### Live-Auslieferung

Es gab kein Deployment und keine Änderung am Cloudflare-Konto. Die neue Codebasis ist lokal reviewbar. Auf `https://fbg.haak3.de` bleibt der bisherige Stand aktiv.

Die tatsächlich vorhandenen Betreiberregeln müssen nach einem autorisierten Deployment überprüft werden. Vorgehen und unverändertes Prüfgate stehen in [deployment.md](deployment.md).

## Grenzen

Kein Firefox-Anwendungslauf wegen des belegten Browserstartfehlers. Keine manuelle Screenreader-/Office-Prüfung und keine juristische Freigabe. Der CI-Workflow wurde lokal geprüft, aber nicht auf GitHub ausgeführt. Die Live-Fehler gelten erst nach Deployment und erfolgreichem Live-Gate als behoben.
