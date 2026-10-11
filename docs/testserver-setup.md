# Testserver wie Prod einrichten (inklusive Datenbank)

Stand: 11.10.2026. Beschreibt, wie ein getrennter Testserver für den Branch `redesign-review`
so aufgebaut wird wie Prod (`bier.olomek.com`). Platzhalter in dieser Anleitung:

- `TESTDOMAIN` = Subdomain des Testservers, z. B. `bier-test.olomek.com`
- `PROD` = SSH-Zugang zum Prod-Server

## So läuft Prod heute (Referenz)

| | Prod |
|---|---|
| System | Ubuntu 24.04 LTS, 2 vCPU, 3,8 GB RAM, 2 GB Swapfile, 38 GB Platte |
| Node | v24.13.0 über nvm (`.nvmrc` nennt 20, es läuft aber 24) |
| Prozess | PM2 6.0.14, Fork-Modus, Name `beer-pong`, Autostart über `pm2-htw` (systemd) |
| Start | `.next/standalone/server.js`, Arbeitsordner `.next/standalone`, Port 3000 |
| Datenbank | `/home/htw/beer-pong/prisma/dev.db`, `DATABASE_URL` zusätzlich in der PM2-Umgebung |
| Uploads | `/home/htw/beer-pong/user-uploads/`, gesetzt über `UPLOAD_DIR` in der PM2-Umgebung |
| Webserver | nginx 1.24 als Reverse Proxy auf `127.0.0.1:3000`, Zertifikat über Certbot |
| Wartungsmodus | nginx liefert 503, solange `public/maintenance.on` existiert |
| Backup | Cron sonntags 03:17, `~/backup-db.sh` nach `~/db-backups/` |

Den Testserver gleich groß wählen wie Prod (2 vCPU, 4 GB RAM, 2 GB Swap). Nur dann sagt der
Build dort etwas darüber aus, ob er auf Prod durchläuft.

## 1. Grundsystem

```bash
sudo apt update && sudo apt install -y nginx sqlite3 git build-essential python3 certbot python3-certbot-nginx
```

Swap wie auf Prod anlegen (der Build braucht ihn):

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Node und PM2:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24.13.0 && nvm alias default 24.13.0
npm install -g pm2@6.0.14
```

## 2. Code holen

Getestet wird der Stand, der später live geht: `redesign-review` zusammen mit dem aktuellen `main`.

```bash
git clone git@github.com:Zidans-Haare/beer-pong.git ~/beer-pong
cd ~/beer-pong
git checkout redesign-review
git merge origin/main        # nur lokal auf dem Testserver, nicht pushen
```

## 3. Datenbank und Uploads von Prod kopieren

Auf **Prod** eine konsistente Kopie ziehen (geht bei laufender App, ändert Prod nicht):

```bash
sqlite3 /home/htw/beer-pong/prisma/dev.db ".backup '/home/htw/db-backups/for-test.db'"
sqlite3 /home/htw/db-backups/for-test.db "PRAGMA integrity_check; SELECT COUNT(*) FROM Player; SELECT COUNT(*) FROM Tournament; SELECT COUNT(*) FROM Match;"
```

Die drei Zahlen notieren (am 11.10.2026: 16 Spieler, 10 Turniere, 293 Spiele).

Auf dem **Testserver** abholen:

```bash
scp PROD:/home/htw/db-backups/for-test.db ~/beer-pong/prisma/dev.db
scp -r PROD:/home/htw/beer-pong/user-uploads ~/beer-pong/
```

Der Testserver braucht danach keinen Zugang mehr zu Prod. Den SSH-Schlüssel dafür wieder entfernen.

## 4. Kopie entschärfen

Die Kopie enthält echte Push-Abos, Sitzungen und E-Mail-Adressen. Ohne diesen Schritt bekommen
die Spieler Testnachrichten aufs Handy.

```bash
sqlite3 ~/beer-pong/prisma/dev.db "DELETE FROM PushSubscription; DELETE FROM Session; DELETE FROM Passkey;"
```

Passkeys sind an `bier.olomek.com` gebunden und auf der Testdomain ohnehin unbrauchbar.
Anmelden geht mit dem normalen Passwort, Passkeys auf dem Testserver neu registrieren.

## 5. `.env` anlegen

Die Prod-`.env` als Vorlage nehmen und diese Werte ändern. Nicht ungeprüft kopieren.

| Variable | Wert auf dem Testserver |
|---|---|
| `DATABASE_URL` | `file:/home/htw/beer-pong/prisma/dev.db` (absoluter Pfad) |
| `AUTH_URL`, `APP_URL` | `https://TESTDOMAIN` |
| `WEBAUTHN_RP_ID` | `TESTDOMAIN` |
| `WEBAUTHN_ORIGIN` | `https://TESTDOMAIN` |
| `WEBAUTHN_RP_NAME` | `Bier Pong Test` |
| `AUTH_SECRET` | neu erzeugen: `openssl rand -base64 32` |
| `VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | neu erzeugen: `npx web-push generate-vapid-keys` |
| `RESEND_API_KEY` | leer lassen, damit keine Mails an echte Adressen gehen |
| `CC_EMAIL` | eigene Adresse |
| `SENTRY_DSN` | leer lassen, sonst landen Testfehler im Prod-Projekt |
| `UPTIME_KUMA_URL`, `UPTIME_KUMA_SLUG`, `UPTIME_KUMA_USERNAME`, `UPTIME_KUMA_PASSWORD` | leer lassen |
| `APP_DIR` | `/home/htw/beer-pong` |
| `UPLOAD_DIR` | `/home/htw/beer-pong/user-uploads` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_LOCALE`, `AUTH_TRUST_HOST` | wie Prod |
| `GEMINI_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` | wie Prod, wenn die Funktionen getestet werden sollen |

Nach dem ersten Start prüfen, dass mit leerem `RESEND_API_KEY` wirklich keine Mail rausgeht
(z. B. eine Zusage auslösen). Das ist hier nicht getestet.

## 6. Migrationen auf der Kopie

Das ist die Generalprobe für den Rollout. Gegenüber Prod sind sechs Migrationen offen:
`add_seasons`, `add_wrapped`, `add_wrapped_view`, `add_minigame`, `add_minigame_cup_size`, `add_player_figure`.

```bash
cd ~/beer-pong
npm ci
npx prisma generate
node scripts/fix-migration-table.js
npx prisma migrate deploy
sqlite3 prisma/dev.db "PRAGMA integrity_check; SELECT COUNT(*) FROM Player; SELECT COUNT(*) FROM Tournament; SELECT COUNT(*) FROM Match;"
```

Die Zahlen müssen denen aus Schritt 3 entsprechen. `fix-migration-table.js` wandelt beim ersten
Lauf alle 20 Einträge der Migrationstabelle um und legt vorher eine Kopie neben die DB.

Probelauf am 11.10.2026 auf einer Kopie der Prod-DB: alle sechs Migrationen sauber eingespielt (unter 3 Sekunden),
Zahlen unverändert, `integrity_check` in Ordnung. Ohne `fix-migration-table.js` stürzt Prisma auf dieser DB ab.

## 7. Build (mit Messung)

```bash
cd ~/beer-pong
/usr/bin/time -v npm run build 2> build-time.log
grep -E "Maximum resident set size|Elapsed" build-time.log
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r messages .next/standalone/messages
```

`Maximum resident set size` ist der Spitzenverbrauch des Builds in kB. Liegt er deutlich über
2 GB, wird es auf Prod eng (siehe Lastauswertung). Die `.env` kopiert der Build selbst nach
`.next/standalone/`.

## 8. Start mit PM2

```bash
cd ~/beer-pong/.next/standalone
DATABASE_URL="file:/home/htw/beer-pong/prisma/dev.db" UPLOAD_DIR="/home/htw/beer-pong/user-uploads" PORT=3000 pm2 start server.js --name beer-pong
pm2 save
pm2 startup        # den ausgegebenen sudo-Befehl einmal ausführen
```

## 9. nginx und HTTPS

DNS-Eintrag für `TESTDOMAIN` auf den Testserver setzen, dann `/etc/nginx/sites-available/TESTDOMAIN`:

```nginx
server {
    server_name TESTDOMAIN;
    listen 80;

    add_header X-Robots-Tag "noindex, nofollow" always;

    set $maintenance 0;
    if (-f /home/htw/beer-pong/public/maintenance.on) {
        set $maintenance 1;
    }
    location = /maintenance.html {
        root /home/htw/beer-pong/public;
        internal;
    }
    location = /maintenance-msg.txt {
        root /home/htw/beer-pong/public;
        add_header Cache-Control "no-store";
    }
    error_page 503 /maintenance.html;

    location / {
        if ($maintenance = 1) {
            return 503;
        }
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/TESTDOMAIN /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d TESTDOMAIN
```

Ohne HTTPS gehen Passkeys, Push, Service Worker und das Teilen-Menü nicht.

## 10. Bewusst nicht einrichten

- **GitHub-Deploy:** Der Workflow `deploy.yml` zeigt über die Secrets auf Prod. Keine Secrets auf den Testserver umbiegen; dort von Hand aktualisieren.
- **Uptime Kuma, Lighthouse CI, Sentry:** nur auf Prod.
- **Backup-Cron:** auf dem Testserver unnötig, die DB ist eine Wegwerfkopie.

## 11. Testserver aktualisieren

```bash
cd ~/beer-pong
pm2 stop beer-pong
git pull && git merge origin/main
npm ci && npx prisma generate
node scripts/fix-migration-table.js && npx prisma migrate deploy
npm run build
cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static && cp -r messages .next/standalone/messages
pm2 restart beer-pong --update-env
```

Für eine neue Generalprobe der Migration: Schritte 3, 4 und 6 mit einer frischen Kopie wiederholen.

## 12. Abschlusskontrolle

- [ ] `https://TESTDOMAIN` lädt, Anmeldung mit Passwort funktioniert
- [ ] Zahlen für Spieler, Turniere, Spiele wie auf Prod
- [ ] Turnierbilder und Profilbilder werden angezeigt (Uploads kopiert)
- [ ] Neuer Passkey lässt sich registrieren und benutzen
- [ ] Push kommt nur bei Geräten an, die sich auf dem Testserver neu angemeldet haben
- [ ] Keine Mail an echte Spieler verschickt
- [ ] `pm2 logs beer-pong` ohne wiederkehrende Fehler
- [ ] Spitzenverbrauch des Builds notiert (Schritt 7)

## Falls der Testserver doch auf dem Prod-Server laufen soll

Nicht empfohlen: Ein Build neben laufendem Prod konkurriert um RAM und Swap. Wenn doch:

- eigener Ordner `~/beer-pong-test`, eigene DB-Datei darin, eigene `.env`
- eigener Port (z. B. `PORT=3100`) und eigener PM2-Name (`beer-pong-test`); der Prod-Deploy beendet alles auf Port 3000 und setzt `~/beer-pong` hart auf `origin/main` zurück
- im nginx-Block die Pfade auf `~/beer-pong-test/public` und den Port auf 3100 ändern
- nie bauen, während ein Prod-Deploy läuft oder ein Turnier gespielt wird
