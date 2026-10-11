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
- [ ] Auf der Kopie: `node scripts/fix-migration-table.js`, danach `npx prisma migrate deploy`. Es dürfen keine Fehler kommen. Die drei neuen Migrationen sind von Hand geschrieben: `add_minigame`, `add_minigame_cup_size`, `add_player_figure`.
- [ ] Zeilenzahlen vor und nach der Migration vergleichen (Spieler, Turniere, Spiele): Sie müssen gleich bleiben.
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

Der Wartungsmodus läuft **durchgehend von vor dem Backup bis nach der Prüfung**.

1. [ ] `bp-maint-on` (Wartungsseite über das nginx-Flag, `public/maintenance.html`).
2. [ ] App stoppen.
3. [ ] Backup ziehen und prüfen (Abschnitt 4), Zahlen notieren.
4. [ ] Code holen (`redesign-review` nach `main` erst nach deinem Okay mergen oder den Tag auschecken).
5. [ ] `.env` prüfen (Abschnitt 3).
6. [ ] `npm ci`, dann `npx prisma generate`.
7. [ ] `node scripts/fix-migration-table.js`, danach `npx prisma migrate deploy`. Bei Fehler: Abbruch, nichts weiter tun, Backup liegt bereit (Abschnitt 8).
8. [ ] Zahlen vergleichen: Spieler, Turniere, Spiele wie im Backup.
9. [ ] `npm run build`, App starten.
10. [ ] Bei **noch aktivem Wartungsmodus** testen (als Admin über den internen Zugang): anmelden, Startseite, Turnierliste, Stats, Regelseite, Minispiel, Wrapped-Vorschau.
11. [ ] Erst wenn alles passt: `bp-maint-off`.

## 6. Direkt nach dem Rollout

- [ ] Anmelden mit Passwort und mit Passkey.
- [ ] Ein Duell verschicken, Figur gestalten, Push-Benachrichtigung testen.
- [ ] Logs und Sentry ansehen, Performance beobachten.
- [ ] Spieler informieren: neue Funktionen, Seite einmal neu laden.
- [ ] Am nächsten Tag ein zweites Backup ziehen (frischer Stand mit neuen Daten).

## 7. Bis Saisonende (Dezember)

- [ ] Saison beenden und neue starten (neue Saisonfarbe).
- [ ] Wrapped im Admin-Bereich wählen (Kalenderjahr oder Saison), Vorschau prüfen, für alle veröffentlichen.

## 8. Rückfallplan, wenn etwas schiefgeht

- Wartungsmodus an lassen. Keine Hektik.
- Schlägt die Migration fehl oder stimmen die Zahlen nicht: App gestoppt lassen, defekte DB beiseitelegen (nicht löschen), das geprüfte Backup an den Originalpfad kopieren, **den vorherigen Stand von `main`** auschecken und bauen, App starten, Zahlen vergleichen, erst dann Wartungsmodus aus.
- Die defekte Datei bleibt zur Analyse erhalten.
- Das Rollback ist nur bis zum ersten Schreibzugriff nach dem Rollout verlustfrei. Danach gehen neue Daten verloren. Deshalb zuerst im Wartungsmodus prüfen.
