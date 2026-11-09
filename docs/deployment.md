# Deployment und Cache-Prüfung

Die Anwendung wird statisch aus `dist/` veröffentlicht. Es gibt kein Anwendungsbackend. Eine lokale Fehlerbehebung ändert die Live-Auslieferung noch nicht.

## Vor dem Deployment

Verwende Node 26 und `npm ci`. Führe `npm run verify`, `npm audit --audit-level=low` und `npm run test:e2e` aus. Verwende für die Browsermatrix `PLAYWRIGHT_BROWSERS=all`.

`npm run build` kopiert `public/_headers`, `public/_redirects`, Inhalte und die PDF-Schriftlizenzen in den fertigen Build. Veröffentliche den gesamten Build. Eine Auswahl einzelner JS-Dateien reicht nicht aus.

## Offener Live-Befund vom 9. November 2026

Die damalige Live-Verifikation fand `max-age=3600` auf `/sw.js` und `/registerSW.js`. Das Repository verlangt für beide Pfade `max-age=0, must-revalidate`.

Die lokale `_headers`-Datei ist dafür bereits konfiguriert. Die geprüfte öffentliche Antwort beweist keine bestimmte Ursache im Betreiberkonto. Ohne Einsicht in das Konto wäre eine Änderung an vermuteten Regeln nicht belastbar.

Prüfe nach einem autorisierten Deployment zuerst `npm run verify:live`. Bei unverändertem Cachefehler kontrolliere die folgenden Einstellungen im Cloudflare-Konto:

1. Stelle sicher, dass der veröffentlichte Build die aktuelle `_headers`-Datei enthält.
2. Prüfe Cache Rules, Browser Cache TTL, Cache Response Rules und Response Header Transform Rules für die beiden Skriptpfade.
3. Entferne für diese Pfade eine erzwungene Browserlaufzeit von einer Stunde. Erhalte die Revalidierung vom Ursprung.
4. Falls ein zusätzlicher Worker Antworten erzeugt, muss dieser die Header selbst setzen. `_headers` gilt nur für statische Asset-Antworten.
5. Lösche bei Bedarf ausschließlich die veralteten Antworten dieser URLs aus dem Cloudflare-Cache.
6. Wiederhole `npm run verify:live` gegen denselben lokal gebauten und veröffentlichten Stand.

Die Prüfung darf nicht durch Akzeptieren von `max-age=3600` abgeschwächt werden. Ein Live-Erfolg wird erst nach der tatsächlichen Prüfung dokumentiert.

Quelle: [Cloudflare Static Assets: Headers](https://developers.cloudflare.com/workers/static-assets/headers/). Cloudflare beschreibt dort `_headers` als Überschreibung statischer Standardheader und grenzt Worker-generierte Antworten ausdrücklich aus.

## Behobener npm-Befund

`workbox-build` benötigt weiter `deepmerge@4.3.1`, für das [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) keinen Upstream-Patch veröffentlicht. Die npm-Override nutzt deshalb die lokale, versionierte Kopie `vendor/deepmerge@4.3.2`. Sie übernimmt die 4.3.1-Implementierung und schreibt Schlüssel über `Object.defineProperty`; damit kann ein eigener `__proto__`-Schlüssel nicht den Prototyp des zurückgegebenen Objekts verändern.

`tests/deepmerge.test.ts` deckt den betroffenen Pfad ab. `npm audit --audit-level=low` meldet danach 0 Befunde. Die Override bleibt bis zu einem offiziellen Upstream-Release notwendig und muss dann entfernt werden.
