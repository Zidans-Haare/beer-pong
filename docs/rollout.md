# Rollout-Checkliste: Redesign, Saisons, Minispiel, Figur, Wrapped

Branch `redesign-review` geht **Mitte November 2026** live, vor dem Saisonende im Dezember.
Wichtigste Regel: **Die Datenbank darf nicht kaputtgehen.** Alles andere lässt sich nachbessern.

## Grundregeln für die Datenbank

- Die Live-Datenbank ist die SQLite-Datei aus `DATABASE_URL` in der `.env` des Servers. Den Pfad vor dem Rollout einmal nachsehen und sich merken, nichts raten.
- Die Datei nie löschen, zurücksetzen oder überschreiben. Kein `prisma migrate reset`, kein `prisma db push`.
- Der Build (`npm run build`) berührt die DB nicht. Trotzdem nie ohne frisches Backup deployen.
- Neue Migrationen nur mit `npx prisma migrate deploy`.
- Erst die Migrationen auf einer **Kopie** der Prod-DB durchspielen (Abschnitt 1), erst dann auf Prod.
- Ein Backup zählt erst, wenn es sich öffnen lässt und die Zeilenzahlen stimmen (Abschnitt 4).

## 1. Probelauf auf dem Testserver (ab jetzt, mindestens zwei Wochen)

- [ ] Testserver ist komplett getrennt von Prod (eigener Ordner, eigene DB-Datei, eigene `.env`, kein Zugriff auf die Prod-DB).
- [ ] Frische Kopie der Prod-DB auf den Testserver legen (siehe Abschnitt 4 zum sicheren Kopieren).
- [ ] Auf der Kopie: `node scripts/fix-migration-table.js`, danach `npx prisma migrate deploy`. Es dürfen keine Fehler kommen. Die neuen Migrationen sind von Hand geschrieben: `add_minigame`, `add_minigame_cup_size`, `add_player_figure`, `add_minigame_overtime`, `add_user_scene_theme`, `season_one_purple`, `add_logo_decoration`. Alle fügen nur Spalten oder Tabellen hinzu; `season_one_purple` färbt nur die noch laufende Saison 1 lila.
- [ ] Zeilenzahlen vor und nach der Migration vergleichen (Spieler, Turniere, Spiele): Sie müssen gleich bleiben.
- [ ] Nach der Migration ist Saison 1 offen und **lila** (`#7c3aed`, die Farbe aus der Auswahl beim Saisonabschluss), passend zum bisherigen Aussehen: `sqlite3 dev.db "select name, endDate, accentColor from Season;"` zeigt `Saison 1||#7c3aed`. Probe auf der Snapshot-Kopie vom 11.10. ist sauber gelaufen (alle damaligen 9 Migrationen, Saison 1 lila, 10 Turniere, 16 Nutzer; `add_logo_decoration` kam danach dazu und fügt nur eine Spalte hinzu).
- [ ] Mit `npm run build` und `npm run start` testen, nicht im Entwicklungsmodus. Der ist viel langsamer.
- [ ] Performance ansehen, vor allem die Canvas-Szenen (Minispiel, Wrapped, Film) auf einem älteren Handy.
- [ ] Auf echten Handys prüfen (iPhone/Safari und Android):
  - [ ] Ton und Video-Export von Wrapped, Teilen-Menü (braucht HTTPS)
  - [ ] Minispiel mit Wischen, Umstellen, Duell
  - [ ] Figur gestalten, Figur auf Startseite und Profil
  - [ ] Turnierfilm mit Siegerehrung
- [ ] Mit mehreren Leuten echte Duelle spielen, inklusive Benachrichtigung bei einem offenen Duell.
- [ ] Ein ganzes Turnier durchspielen: Zusage mit Regelzustimmung (und „Zurück“ zum Turnier), Spielen, Abschluss, Film.
- [ ] Alle Rollen ausprobieren: Admin, Spieler, Gast, nicht freigeschalteter Nutzer.
- [ ] Wiederholt dieselbe Migration auf einer frischen Kopie durchspielen, bis sie sauber und gleich schnell läuft.

### Review des Testservers am 07.11.2026

- 14 Tage ohne Neustart, Last 0,1 bis 0,3, App rund 420 MB, Platte 26 % belegt, Datenbank `integrity_check` ok.
- Antwortzeiten über Cloudflare 0,2 bis 0,5 s.
- Fehlerlog: nur Scanner, alte Tabs nach Updates und der gesperrte Gemini-Schlüssel. 68-mal konnte das iPhone `sw.js` nicht laden; wahrscheinlich während der Build-Zeit, in der die Datei im Standalone-Ordner fehlt. Auf Prod egal, weil der Wartungsmodus dann an ist. Nach dem Rollout beobachten.
- `npm audit`: kritische Lücken in Next.js (Code-Ausführung über die Bildoptimierung) und Sentry behoben (Next 15.5.29, Sentry 10.78). Übrig: postcss (nur beim Build, Lösung erst mit Next 16), exceljs/uuid und next-auth (niedrig), Test-Werkzeuge.
- Komplette E2E-Suite grün.

## 2. Offene Entscheidungen (vor dem Rollout klären)

- [ ] **CSP in `next.config.ts`:** `static.cloudflareinsights.com` in `script-src` aufnehmen oder Cloudflare-Analytics bewusst weglassen. Sonst blockiert die Sicherheitsrichtlinie das Skript.
- [ ] **`favicon.ico`** liegt doppelt und unterschiedlich in `public/` und `src/app/`. Eine Version festlegen.
- [ ] **Duell-Ergebnisse** kommen vom Client und werden nicht serverseitig nachgerechnet. Für den Freundeskreis okay. Falls nötig: Replay mit der Engine auf dem Server prüfen.
- [ ] Saison-Preise sind bewusst nicht enthalten (Issue Zidans-Haare/beer-pong#50).

## 3. Server-Konfiguration (Prod)

- [ ] `.env`: `WEBAUTHN_RP_ID=bier.olomek.com` und `WEBAUTHN_ORIGIN=https://bier.olomek.com`. Mit `localhost` gehen Passkeys nicht.
- [ ] Weitere Variablen prüfen: `ADMIN_EMAIL`, `AUTH_SECRET`, `DATABASE_URL`, VAPID-Schlüssel.
- [ ] HTTPS aktiv (Teilen-Menü, Passkeys, Push und Service Worker brauchen es).
- [ ] `deploy.sh` und `scripts/update.sh` rufen `fix-migration-table.js` vor `migrate deploy` auf (in beiden eingetragen). Die Zeile prüfen, bevor man sich darauf verlässt.
- [ ] Plattenplatz prüfen (`df -h /`): Am 11.10.2026 waren nur 4,3 GB frei. Ein bis zwei Tage **vor** dem Rollout den npm-Cache leeren (`npm cache clean --force`, rund 8 GB). Laufende Apps betrifft das nicht, nur das nächste `npm ci` lädt alle Pakete einmal neu. Deshalb nicht erst im Wartungsfenster leeren.

## 4. Backup und Wiederherstellung

Das Backup am Tag des Rollouts, **nachdem** der Wartungsmodus an ist und die App steht.

```bash
# Pfad aus der .env lesen und nicht raten
grep '^DATABASE_URL=' .env
```

- [ ] App stoppen oder bei laufender App ein konsistentes Backup ziehen. Bei gestoppter App genügt `cp`, dabei `-wal` und `-shm` mitkopieren, falls es sie gibt:

```bash
cp /pfad/zur/dev.db /pfad/zum/backup/dev.db.rollout-$(date +%Y%m%d-%H%M)
ls /pfad/zur/dev.db-wal /pfad/zur/dev.db-shm 2>/dev/null
```

- [ ] Bei laufender App stattdessen: `sqlite3 /pfad/zur/dev.db ".backup '/pfad/zum/backup/dev.db.rollout'"`.
- [ ] Backup **prüfen**: öffnen und zählen.

```bash
sqlite3 /pfad/zum/backup/dev.db.rollout "PRAGMA integrity_check; SELECT COUNT(*) FROM Player; SELECT COUNT(*) FROM Tournament; SELECT COUNT(*) FROM Match;"
```

- [ ] Die Zahlen aufschreiben. Sie müssen nach dem Rollout genauso aussehen.
- [ ] Eine zweite Kopie **außerhalb** des Servers ablegen (eigener Rechner oder Cloud).
- [ ] `fix-migration-table.js` legt vor seiner ersten Änderung ebenfalls eine Kopie neben die DB. Sie ersetzt das eigene Backup nicht.

## 5. Am Rollout-Tag

Prod-Pfade (aus der Prod-`.env`): Datenbank `/home/htw/beer-pong/prisma/dev.db`, Bilder `/home/htw/beer-pong/user-uploads`.
Der Wartungsmodus läuft **durchgehend von vor dem Backup bis nach der Prüfung**. Prod bleibt in **Saison 1** (lila).

**Warum von Hand:** Jeder Push auf `main` startet `.github/workflows/deploy.yml`. Der schaltet den Wartungsmodus am Ende von selbst aus (auch ohne Prüfung), schreibt die Commit-Nachricht auf die Wartungsseite und sichert keine Bilder. Für dieses Update deshalb den automatischen Deploy vorher abschalten und danach wieder einschalten.

Vorbereitung (auf dem Mac):

```bash
gh workflow disable "Deploy auf Server"
```

```bash
scp public/maintenance.html htw@<PROD-HOST>:~/beer-pong/public/maintenance.html
```

Die neue Wartungsseite liegt damit schon auf Prod, bevor der neue Code kommt (ohne Text, ohne Hinweis auf Wrapped).

Auf Prod (`ssh htw@<PROD-HOST>`, dann `cd ~/beer-pong`):

1. [ ] Wartung an und App stoppen:
   ```bash
   bp-maint-on && pm2 stop beer-pong
   ```
2. [ ] Sicherungsordner anlegen, Datenbank sichern und prüfen:
   ```bash
   B=~/rollout-backup-$(date +%Y%m%d-%H%M) && mkdir -p "$B" && sqlite3 prisma/dev.db ".backup '$B/dev.db'"
   ```
   ```bash
   sqlite3 "$B/dev.db" "PRAGMA integrity_check; SELECT 'User', COUNT(*) FROM User; SELECT 'Player', COUNT(*) FROM Player; SELECT 'Tournament', COUNT(*) FROM Tournament; SELECT 'Match', COUNT(*) FROM Match; SELECT 'RSVP', COUNT(*) FROM RSVP;"
   ```
   Ergebnis muss mit `ok` beginnen. Zahlen notieren.
3. [ ] Bilder sichern und prüfen (beide Zahlen müssen gleich sein):
   ```bash
   tar czf "$B/user-uploads.tar.gz" -C ~/beer-pong user-uploads && find user-uploads -type f | wc -l && tar tzf "$B/user-uploads.tar.gz" | grep -v '/$' | wc -l
   ```
4. [ ] `.env` mitsichern: `cp .env "$B/env"`.
5. [ ] Sicherung zusätzlich auf den Mac holen (auf dem Mac):
   ```bash
   scp -r htw@<PROD-HOST>:~/rollout-backup-* ~/Bierpong/
   ```
6. [ ] `redesign-review` nach `main` mergen (Pull Request, nur nach deinem Okay). Dann auf Prod:
   ```bash
   git fetch origin && git checkout main && git reset --hard origin/main
   ```
7. [ ] Abhängigkeiten und Migrationen:
   ```bash
   npm ci && npx prisma generate && node scripts/fix-migration-table.js && npx prisma migrate deploy
   ```
   Bei Fehler: Abbruch, nichts weiter tun, Backup liegt bereit (Abschnitt 8).
8. [ ] Prüfen: dieselben Zahlen wie in Schritt 2, Saison 1 offen und lila, Bilder unverändert:
   ```bash
   sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User; SELECT COUNT(*) FROM Player; SELECT COUNT(*) FROM Tournament; SELECT COUNT(*) FROM Match; SELECT name, endDate, accentColor FROM Season;" && find user-uploads -type f | wc -l
   ```
   Erwartet bei der Saison: `Saison 1||#7c3aed`.
9. [ ] Bauen, Dateien in den Standalone-Build kopieren, starten:
   ```bash
   npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && cp -r messages .next/standalone/ && rm -f .next/standalone/public/maintenance.on .next/standalone/public/maintenance-msg.txt
   ```
   ```bash
   set -a && . ./.env && set +a && pm2 restart beer-pong --update-env && pm2 save
   ```
10. [ ] Bei **noch aktivem Wartungsmodus** prüfen, intern auf dem Server:
    ```bash
    for u in /login /rules /sw.js /manifest.webmanifest /api/chat?limit=1; do echo "$u $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$u")"; done
    ```
    Alles `200`. Zum Durchklicken als Admin vom Mac aus über einen Tunnel: `ssh -L 3000:localhost:3000 htw@<PROD-HOST>`, dann `http://localhost:3000` öffnen (Passkeys gehen dort nicht, Passwort schon).
11. [ ] Erst wenn alles passt: `bp-maint-off`.
12. [ ] Automatischen Deploy wieder einschalten (auf dem Mac): `gh workflow enable "Deploy auf Server"`.

## 6. Direkt nach dem Rollout

- [ ] Anmelden mit Passwort und mit Passkey.
- [ ] Ein Duell verschicken, Figur gestalten, Push-Benachrichtigung testen.
- [ ] Logs und Sentry ansehen, Performance beobachten.
- [ ] Spieler informieren: neue Funktionen, Seite einmal neu laden.
- [ ] Am nächsten Tag ein zweites Backup ziehen (frischer Stand mit neuen Daten).

## 7. Bis Saisonende (Dezember)

- [ ] Saison beenden und neue starten: Im Admin unter Saisons auf **Abschließen** klicken und dabei die Farbe der neuen Saison festlegen. Bis dahin bleibt die App lila wie vor dem Update.
- [ ] Wrapped im Admin-Bereich wählen (Kalenderjahr oder Saison), Vorschau prüfen, für alle veröffentlichen.

## 8. Rückfallplan, wenn etwas schiefgeht

- Wartungsmodus an lassen. Keine Hektik.
- Schlägt die Migration fehl oder stimmen die Zahlen nicht: App gestoppt lassen, defekte DB beiseitelegen (nicht löschen), das geprüfte Backup an den Originalpfad kopieren, **den vorherigen Stand von `main`** auschecken und bauen, App starten, Zahlen vergleichen, erst dann Wartungsmodus aus.
- Datenbank zurück (App gestoppt): `mv prisma/dev.db prisma/dev.db.defekt && cp "$B/dev.db" prisma/dev.db`.
- Bilder zurück, nur falls sie fehlen oder beschädigt sind: `mv user-uploads user-uploads.defekt && tar xzf "$B/user-uploads.tar.gz" -C ~/beer-pong`.
- Alten Code zurück: `git checkout e8c073b` (bisheriger Stand von `main`), `npm ci`, bauen, Dateien in den Standalone-Build kopieren (Schritt 9), starten.
- Die defekte Datei bleibt zur Analyse erhalten.
- Das Rollback ist nur bis zum ersten Schreibzugriff nach dem Rollout verlustfrei. Danach gehen neue Daten verloren. Deshalb zuerst im Wartungsmodus prüfen.
