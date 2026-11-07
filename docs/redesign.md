# Matchday Redesign

## Gestaltung

Die Anwendung bleibt hell und behält ihren Namen sowie die bestehenden öffentlichen App-Symbole. Die gemeinsame Gestaltung verwendet Weiß, Graphit, Grün und sparsame zusätzliche Statusfarben. Manrope und Barlow Condensed werden lokal mit ihren OFL-Lizenzen ausgeliefert.

Die mobile Hauptnavigation enthält Start, Turniere, Beitreten, Stats und Mehr. Spieler, Chat, Benachrichtigungen, Streaming, Einstellungen, Regeln und Admin bleiben vollständig erreichbar. Der vereinfachte Modus behält seine drei Hauptziele. Admin nutzt auf kleinen Displays eine Bereichsauswahl und auf Desktop eine Seitenleiste.

Score-Eingabe, Präferenzen und Admin-Bearbeitung verwenden native Dialoge außerhalb animierter Seiten. Seitenwechsel remounten keine Eingaben oder Streams. Reduzierte Bewegung, Fokus, Safe-Areas, numerische Eingaben und beschriftete Werkzeuge werden berücksichtigt.

## Abgedeckte Bereiche

| Bereich | Ansichten und Bedienabläufe |
| --- | --- |
| Start und Auth | Start, Login, Registrierung, Passkey-Zugänge |
| Turniere | Liste, Archiv, Erstellung, Detail, RSVP, Teilnehmer, Gäste, Teams, Bracket, Gruppen, Scores, OT, Korrekturen, Mitbringliste, Preise, Reservierungen, Einladungen |
| Spieler | Liste, Profil, Erstellung, Bearbeitung, Fotos, Statistiken und Historie |
| Community | Chat, Benachrichtigungen, Präferenzen, Statistik, Charts und Export |
| Einstellungen und System | Konto, Passkeys, Regeln, Offline, Demo, Ladezustände, 404, Fehler und Wartung |
| Admin | Dashboard, Nutzer, Freigaben, Spieler, Turniere, Gäste, Chat, Broadcast, Einstellungen und Passkeys |
| Medien | Streaming-Hub, mobiler Kamera-Controller, Vollbild-TV, Runden, Tabellen, Ergebnisse, Video und Chat |

Bestehende Spielregeln, Action-Payloads, Datenmodell und Rollen bleiben erhalten. Dialoge schließen bei fehlgeschlagenen Schreibaktionen nicht mit einem vorgetäuschten Erfolg.

## Lokal Prüfen

```powershell
npm test
npx tsc --noEmit
npm run test:e2e -- --project=android-chromium
npm run test:e2e -- --project=iphone-webkit
npm run test:e2e -- --project=chromium
```

Beim ersten Browserlauf werden die passenden Browser benötigt:

```powershell
npx playwright install chromium webkit
```

Ohne externes `E2E_BASE_URL` startet Playwright einen eigenen lokalen Server auf Port 3100. Der Bootstrap legt eine neue SQLite-Datei ausschließlich unter dem ignorierten Verzeichnis `e2e/.auth/` an und verwendet ein eigenes Next.js-Ausgabeverzeichnis. Er setzt keine vorhandene Datenbank zurück. Server-Fetch-Aufrufe zu externen Diensten sind gesperrt; E-Mail und Push sind deaktiviert. Fehlende optionale E-Mail-Konfiguration löst keinen Importfehler aus und wird nicht als erfolgreicher Versand ausgegeben.

Eine separate Vorschau mit anonymen Testdaten lässt sich starten mit:

```powershell
node scripts/e2e-server.mjs --port 3101
```

Die Testkonten `host@matchday.test` und `admin@matchday.test` verwenden das öffentliche Fixture-Passwort `Matchday-test-2026`. Das sind keine Produktivzugänge. Die Fixtures und Auth-States dürfen nicht veröffentlicht werden.

## Produktionsschutz

- `dev.db` und die produktive Konfiguration werden nicht überschrieben, gelöscht oder durch Demo-Seeds ersetzt.
- Ein extern gesetztes `E2E_BASE_URL` bleibt im Smoke-Modus. Neue Schreibtests sind dort deaktiviert.
- Produktions-Smoke und isolierte Funktionstests sind getrennt. Die zusätzlichen Browserprojekte sind nur im isolierten Modus aktiv.
- Tests erzeugen Screenshots unter `test-results/`. Uhrzeiten bleiben echte Laufzeitwerte; relevante Daten werden nicht wegmaskiert.
- Service-Worker-Version `v12` ergänzt die lokalen Schriften und lässt Seitenwechsel innerhalb der App direkt ans Netz. Der bestehende Aktivierungs- und Reloadablauf bleibt unverändert. Ein Rollout sollte außerhalb laufender Turniere erfolgen.

## Verbleibende Gerätefreigabe

Browseremulation ersetzt keine Prüfung auf echten Android- und iOS-Geräten. Vor einem produktiven Rollout sind PWA-Installation, echte Tastatur/Safe-Areas, Kamera/QR, biometrische Passkeys, Push, WebRTC-Audio und Wake Lock auf Geräten zu bestätigen. Build, Deployment, Commit und Push erfolgen nur nach gesonderter Freigabe.

## Prüfstand Am 10. Oktober 2026

| Prüfung | Ergebnis |
| --- | --- |
| Bestehende fachliche Tests | 142 Tests in sechs Dateien bestanden |
| TypeScript | `npx tsc --noEmit` bestanden |
| Geänderte TypeScript-Oberflächen | ESLint ohne Fehler; neun bestehende Bild-/Hook-Hinweise bleiben |
| Android-Chromium und iPhone-WebKit | Seitendurchläufe einschließlich aller zehn Admin-Ansichten geprüft; aufgetretene Fehler korrigiert und die betreffenden Prüfungen erneut bestanden |
| Navigation und Größen | Fünf Tabs, vollständiges Mehr-/Admin-Menü, vereinfachter Modus und reduzierte Bewegung geprüft; wichtige Layouts bei 320, 360, 768 und 1024 Pixel geprüft |
| Schreibabläufe | SOLO/TEAM-Scores, wiederholte OT, Korrekturen, Code-Beitritt, Freigabe, Admin-Profiländerung, Chat-Persistenz und Benachrichtigungspräferenzen geprüft |
| TV und Medienoberfläche | 1080p/4K, Ergebnisfläche, Vollbildbutton, Kamera-Werkzeugleisten und Rückweg geprüft |
| Tatsächliche Vorschau | Login in frischem Chromium mit aktiviertem Service Worker erfolgreich, keine JavaScriptfehler |
| Assets | Öffentliche App-Symbole unverändert; lokale Fonts und beide im Manifest vorgesehenen PWA-Screenshots vorhanden |
| Daten und Regeln | Keine Änderung an Prisma-Schema, Datenbankadapter oder Spielservices; keine Zurücksetzung von Bestandsdaten |

Die Browserprüfungen sind kein vollständiger Beweis für jede mögliche Kombination von Turnierdaten, Rollen und Geräten. Automatisiert nicht abschließend abgenommen sind unter anderem echte Push-/E-Mail-Zustellung, biometrische Hardware, Kamera-/Mikrofonberechtigungen auf realen Geräten, ein vollständiger WebRTC-Verbindungsaufbau zwischen Geräten, reale Offline-Wiederanmeldung und alle Verwaltungsaktionen in sämtlichen Datenzuständen.

Der bereits lange geöffnete integrierte VS-Code-Browsertab war bei der finalen manuellen Anmeldung instabil. Derselbe laufende Vorschauprozess wurde deshalb zusätzlich erfolgreich mit einem frischen Chromium-Kontext und erlaubtem Service Worker geprüft.

Produktionsbuild, Lighthouse-Messung des Produktionsbundles und Deployment wurden nicht ausgeführt. Diese Schritte benötigen die separate Freigabe.