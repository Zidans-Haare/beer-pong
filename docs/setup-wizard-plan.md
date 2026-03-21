# Setup Wizard — Implementierungsplan

> **Für Claude Code (lokal):** Dieses Dokument enthält alle Informationen aus dem laufenden Produktionsbetrieb, die du brauchst um den Wizard korrekt zu implementieren. Lies es vollständig bevor du anfängst.

---

## Ziel

Ein interaktiver Terminal-Wizard (`npm run setup` oder `node scripts/setup.js`) der auf einem blanken Ubuntu-Server alles einrichtet:
- Abhängigkeiten (Node via NVM, PM2, Nginx, Certbot)
- `.env` Datei generieren
- Nginx-Config mit SSL
- Datenbank initialisieren
- PM2 Prozess anlegen
- Cron-Jobs (DB-Backup)
- Optionale GitHub Actions Secrets via `gh` CLI

Orientierung an bekannten Wizards: Sentry `sentry init`, Coolify, Plausible.

---

## Produktionswissen vom Server (WICHTIG)

### Aktuelle Server-Konfiguration (Referenz für den Wizard)

```
OS:           Ubuntu 22.04
User:         htw
Home:         /home/htw
App-Pfad:     /home/htw/beer-pong
DB-Pfad:      /home/htw/beer-pong/prisma/dev.db
Node:         v24.13.0 via NVM (/home/htw/.nvm)
PM2:          Prozessname "beer-pong", fork_mode
              Script: .next/standalone/server.js
              ENV:    DATABASE_URL="file:/home/htw/beer-pong/prisma/dev.db"
App-Port:     3000
LHCI-Port:    9001
Domain:       bier.olomek.com (Nginx → localhost:3000)
LHCI-Domain:  lighthouse.olomek.com (Nginx → localhost:9001)
SSL:          Let's Encrypt via Certbot
Nginx:        /etc/nginx/sites-available/ + sites-enabled/
```

### PM2 Startbefehl (exakt so wie er läuft)
```bash
DATABASE_URL="file:/home/htw/beer-pong/prisma/dev.db" pm2 start .next/standalone/server.js --name beer-pong
pm2 save
pm2 startup  # systemd integration
```

### Nginx-Config Struktur (funktionierendes Template aus Produktion)
```nginx
server {
    server_name {{DOMAIN}};

    set $maintenance 0;
    if (-f {{APP_PATH}}/public/maintenance.on) {
        set $maintenance 1;
    }

    location = /maintenance.html {
        root {{APP_PATH}}/public;
        internal;
    }

    location = /maintenance-msg.txt {
        root {{APP_PATH}}/public;
        add_header Cache-Control "no-store";
    }

    error_page 503 /maintenance.html;

    location / {
        if ($maintenance = 1) { return 503; }
        proxy_pass http://127.0.0.1:{{PORT}};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
```
Nach dem Erstellen: `sudo certbot --nginx -d {{DOMAIN}}` für SSL.

### NVM-Initialisierung in Shell-Scripts (KRITISCH)
Ohne diesen Block findet der SSH-Deploy `node`/`npm`/`pm2` nicht:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```
Der Wizard muss dies in alle generierten Shell-Scripts einfügen.

### Cron-Job DB-Backup (läuft wöchentlich in Produktion)
```bash
# Sonntags um 2 Uhr nachts
0 2 * * 0 cd {{APP_PATH}} && cp prisma/dev.db prisma/backups/db_$(date +\%Y-\%m-\%d).db 2>&1 | logger -t beer-pong-backup
```
Das `backups/`-Verzeichnis muss existieren: `mkdir -p prisma/backups`

### `.env` Pflichtfelder (alle müssen vom Wizard abgefragt werden)
```env
# Datenbank
DATABASE_URL="file:{{APP_PATH}}/prisma/dev.db"

# Auth
AUTH_SECRET=                    # Zufällig generieren: openssl rand -base64 32
ADMIN_EMAIL=                    # Erste Admin-Email

# App
APP_URL=https://{{DOMAIN}}

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_CONTACT=mailto:{{ADMIN_EMAIL}}

# Email (Resend)
RESEND_API_KEY=                 # Optional, aber für Approval-Mails nötig

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=  # Optional

# Sentry
SENTRY_DSN=                     # Optional
NEXT_PUBLIC_SENTRY_DSN=         # Gleiches wie SENTRY_DSN (für Client)

# WebAuthn (Passkeys)
WEBAUTHN_RP_ID={{DOMAIN}}
WEBAUTHN_ORIGIN=https://{{DOMAIN}}
WEBAUTHN_RP_NAME={{APP_NAME}}
```

---

## Hardcoded Values — vollständiger Audit

> Diese Werte sind aktuell im Code hardcoded und müssen vor oder während des Wizards variabel gemacht werden.

### Priorität 1 — MUSS vor Wizard-Implementierung refactored werden

| Datei | Zeile | Hardcoded | Ersatz |
|-------|-------|-----------|--------|
| `src/instrumentation-client.ts` | 8 | Sentry DSN hardcoded | `process.env.NEXT_PUBLIC_SENTRY_DSN` |
| `src/lib/email.ts` | 18, 121 | `noreply@bier.olomek.com` | `process.env.EMAIL_FROM` |
| `src/lib/email.ts` | 13, 102, 117, 194 | `bier.olomek.com` | aus `APP_URL` extrahieren |
| `src/components/UptimeGraph.tsx` | 204 | `bier.olomek.com` | aus `APP_URL` extrahieren |
| `src/app/api/simulation/route.ts` | 109 | `http://localhost:3000` | `process.env.APP_URL` |
| `src/lib/webauthn.ts` | 21 | `'Bier Pong'` (rpName) | `process.env.WEBAUTHN_RP_NAME` |
| `src/app/stats/page.tsx` | 16 | `'bier'` (Uptime Kuma Slug) | `process.env.UPTIME_KUMA_SLUG` |
| `public/maintenance.html` | 191 | GitHub-Repo-URL | `NEXT_PUBLIC_GITHUB_REPO` oder weglassen |
| `src/components/LogoEasterEgg.tsx` | 154 | GitHub-Repo-URL | `process.env.NEXT_PUBLIC_GITHUB_REPO` |

### Priorität 2 — Wizard-Config-Files (werden neu generiert)

| Datei | Problem | Lösung |
|-------|---------|--------|
| `.lighthouserc.js` | Alle URLs hardcoded | Wizard generiert diese Datei neu |
| `lighthouse-auth.js` | Login-URL hardcoded | Wizard generiert diese Datei neu |
| `.github/workflows/deploy.yml` | `~/beer-pong` Pfad, DB-Pfad | Via GitHub Secrets übergeben |
| `deploy.sh` | Absolute Pfade | Via `.env` oder Parameter |

### Priorität 3 — Dokumentation (kein Code-Impact)
- `README.md` — URLs anpassen nach Setup
- `CLAUDE.md` — Pfade anpassen

---

## Wizard — UX Flow

```
╔══════════════════════════════════════════════════════╗
║           Bier Pong — Setup Wizard v1.0              ║
╚══════════════════════════════════════════════════════╝

[1/8] Grundkonfiguration
  ? App-Name (z.B. "Bier Pong"):
  ? Domain (z.B. bier.olomek.com):
  ? App-Pfad [/home/$USER/beer-pong]:
  ? Port [3000]:
  ? Admin-Email:

[2/8] Datenbank
  ✓ SQLite wird verwendet
  ? DB-Backup aktivieren? (wöchentlich per Cron) [Ja]

[3/8] Email (Resend)
  ? Resend API-Key (leer lassen zum Überspringen):
  ? Absender-Email [noreply@{{DOMAIN}}]:

[4/8] Push Notifications
  ? VAPID-Keys generieren? [Ja]
  ✓ Keys generiert

[5/8] Sentry (Error Tracking)
  ? Sentry DSN (leer lassen zum Überspringen):

[6/8] Google Maps
  ? Google Maps API-Key (leer lassen zum Überspringen):

[7/8] GitHub Actions
  ? GitHub Actions CI/CD einrichten? [Ja]
  → gh CLI wird benötigt
  ? SSH Public Key Pfad [~/.ssh/id_rsa.pub]:
  ✓ Secrets werden gesetzt...

[8/8] Lighthouse CI (optional)
  ? Lighthouse Dashboard einrichten? [Ja]
  ? Lighthouse Domain [lighthouse.{{DOMAIN}}]:

══════════════════════════════════════════════════════
Zusammenfassung:
  Domain:    bier.olomek.com
  App-Pfad:  /home/htw/beer-pong
  Admin:     admin@example.com
  ...

Weiter? [Ja/Nein]
══════════════════════════════════════════════════════

[Setup] Installiere Abhängigkeiten...
[Setup] Generiere .env...
[Setup] Nginx konfigurieren...
[Setup] SSL einrichten (Certbot)...
[Setup] Datenbank initialisieren...
[Setup] Build erstellen...
[Setup] PM2 einrichten...
[Setup] Cron-Jobs konfigurieren...
[Setup] GitHub Secrets setzen...
[Setup] Lighthouse CI einrichten...

✓ Setup abgeschlossen!
  App läuft unter: https://bier.olomek.com
  Lighthouse:      https://lighthouse.olomek.com
```

---

## Technische Implementierung

### Stack für den Wizard

**Empfehlung: Node.js Script mit `@inquirer/prompts`**

```bash
npm install --save-dev @inquirer/prompts chalk ora
```

- `@inquirer/prompts` — moderne, gut gewartete Alternative zu `inquirer`
- `chalk` — farbige Terminal-Ausgabe
- `ora` — Spinner für laufende Operationen

**Kein TypeScript** für den Wizard (läuft vor dem Build, braucht keine Kompilierung).

### Dateistruktur

```
scripts/
  setup/
    index.js          ← Einstiegspunkt, orchestriert alles
    questions.js      ← Alle Inquirer-Fragen
    generators/
      env.js          ← .env generieren
      nginx.js        ← Nginx-Config generieren
      lighthouserc.js ← .lighthouserc.js + lighthouse-auth.js generieren
      cron.js         ← Cron-Job hinzufügen
    installers/
      system.js       ← Node/NVM/PM2/Nginx/Certbot prüfen & installieren
      database.js     ← Prisma migrate, seed
      pm2.js          ← PM2 Prozess anlegen
      github.js       ← gh CLI, Secrets setzen
      lighthouse.js   ← LHCI Server aufsetzen
    utils/
      shell.js        ← execSync wrapper mit Fehlerbehandlung
      validate.js     ← Input-Validierungen (Domain, Email, etc.)
```

### `package.json` Eintrag

```json
{
  "scripts": {
    "setup": "node scripts/setup/index.js"
  }
}
```

### Nginx-Config generieren (generators/nginx.js)

Der Generator schreibt nach `/etc/nginx/sites-available/{{DOMAIN}}` und braucht `sudo`. Da Wizard als normaler User läuft:

```javascript
// Datei in /tmp schreiben, dann mit sudo verschieben
const tmpPath = `/tmp/nginx-${domain}`;
fs.writeFileSync(tmpPath, nginxConfig);
execSync(`sudo mv ${tmpPath} /etc/nginx/sites-available/${domain}`);
execSync(`sudo ln -sf /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/`);
execSync(`sudo nginx -t && sudo nginx -s reload`);
execSync(`sudo certbot --nginx -d ${domain} --non-interactive --agree-tos -m ${adminEmail}`);
```

### VAPID-Keys generieren

```javascript
const { execSync } = require('child_process');
const output = execSync('npx web-push generate-vapid-keys --json').toString();
const { publicKey, privateKey } = JSON.parse(output);
```

### AUTH_SECRET generieren

```javascript
const { execSync } = require('child_process');
const secret = execSync('openssl rand -base64 32').toString().trim();
```

### GitHub Secrets setzen (installers/github.js)

```javascript
// Prüfen ob gh CLI vorhanden
execSync('gh auth status', { stdio: 'pipe' }); // wirft wenn nicht eingeloggt

const secrets = {
  SSH_HOST: answers.serverHost,
  SSH_USER: answers.serverUser,
  SSH_PRIVATE_KEY: fs.readFileSync(answers.sshKeyPath, 'utf-8'),
  E2E_USER_EMAIL: answers.e2eEmail,
  E2E_USER_PASSWORD: answers.e2ePassword,
  LHCI_TOKEN: answers.lhciToken,
};

for (const [name, value] of Object.entries(secrets)) {
  execSync(`gh secret set ${name} --body "${value}"`, { cwd: appPath });
}
```

### PM2 Prozess anlegen (installers/pm2.js)

```javascript
// NVM muss im Pfad sein
const nvmInit = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`;
const pm2Cmd = `DATABASE_URL="file:${dbPath}" pm2 start .next/standalone/server.js --name ${pm2Name}`;

execSync(`bash -c '${nvmInit} && ${pm2Cmd}'`);
execSync(`bash -c '${nvmInit} && pm2 save'`);
execSync(`bash -c '${nvmInit} && pm2 startup systemd -u ${user} --hp ${homePath}'`);
```

**WICHTIG:** PM2 muss mit NVM-Node gestartet werden, sonst kennt systemd den `node`-Befehl nicht.

### LHCI Server aufsetzen (installers/lighthouse.js)

```javascript
// Globale Installation
execSync('npm install -g @lhci/cli @lhci/server');

// Daten-Verzeichnis
fs.mkdirSync(`${homePath}/lhci-data`, { recursive: true });

// PM2 Prozess
const lhciCmd = `lhci server --port=${lhciPort} --storage.storageMethod=sql --storage.sqlDialect=sqlite --storage.sqlDatabasePath=${homePath}/lhci-data/lhci.db`;
execSync(`bash -c '${nvmInit} && pm2 start lhci --name lighthouse-server -- server --port=${lhciPort} --storage.storageMethod=sql --storage.sqlDialect=sqlite --storage.sqlDatabasePath=${homePath}/lhci-data/lhci.db'`);

// Projekt anlegen und Token holen
await sleep(2000); // Server hochfahren lassen
const response = execSync(`curl -s -X POST http://localhost:${lhciPort}/v1/projects -H "Content-Type: application/json" -d '{"name":"${appName}","externalUrl":"${appUrl}","slug":"${slug}"}'`).toString();
const { token } = JSON.parse(response);
// Token an GitHub Secrets übergeben
```

### .lighthouserc.js generieren (generators/lighthouserc.js)

```javascript
module.exports = function generateLighthouseRc({ appUrl, lhciUrl, lhciToken }) {
  return `module.exports = {
  ci: {
    collect: {
      url: [
        '${appUrl}/',
        '${appUrl}/players',
        '${appUrl}/tournaments',
        '${appUrl}/stats',
      ],
      puppeteerScript: './lighthouse-auth.js',
      puppeteerLaunchOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      numberOfRuns: 1,
    },
    upload: {
      target: 'lhci',
      serverBaseUrl: '${lhciUrl}',
      token: process.env.LHCI_TOKEN,
    },
    assert: {
      budgetFile: '.github/lighthouse-budget.json',
    },
  },
};`;
};
```

### lighthouse-auth.js generieren (generators/lighthouserc.js)

```javascript
module.exports = function generateLighthouseAuth({ appUrl }) {
  return `module.exports = async (browser) => {
  const page = await browser.newPage();
  await page.goto('${appUrl}/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.type('input[name="email"]', process.env.E2E_USER_EMAIL || '');
  await page.type('input[name="password"]', process.env.E2E_USER_PASSWORD || '');
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.close();
};`;
};
```

---

## Code-Refactoring — Vor dem Wizard

Diese Änderungen müssen im App-Code gemacht werden bevor der Wizard sinnvoll ist:

### 1. `src/instrumentation-client.ts`

```typescript
// VORHER (hardcoded DSN):
Sentry.init({ dsn: "https://f37e1ec1fd384a3bb99de620799056e7@..." })

// NACHHER:
Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })
```

### 2. `src/lib/email.ts`

```typescript
// VORHER:
const from = 'noreply@bier.olomek.com';

// NACHHER:
const appUrl = process.env.APP_URL || 'http://localhost:3000';
const domain = new URL(appUrl).hostname;
const from = process.env.EMAIL_FROM || `noreply@${domain}`;
```

### 3. `src/lib/webauthn.ts`

```typescript
// VORHER:
rpName: 'Bier Pong'

// NACHHER:
rpName: process.env.WEBAUTHN_RP_NAME || 'Bier Pong'
```

### 4. `src/app/stats/page.tsx`

```typescript
// VORHER:
const slug = 'bier';

// NACHHER:
const slug = process.env.UPTIME_KUMA_SLUG || '';
```

### 5. `src/app/api/simulation/route.ts`

```typescript
// VORHER:
const baseUrl = 'http://localhost:3000';

// NACHHER:
const baseUrl = process.env.APP_URL || 'http://localhost:3000';
```

### 6. `src/components/UptimeGraph.tsx`

```typescript
// Domain aus APP_URL extrahieren statt hardcoden
const domain = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
  : 'localhost';
```

---

## Bekannte Gotchas & Stolpersteine

### 1. NVM vs. System-Node
`which node` auf dem Server zeigt NVM-Node. Aber in SSH-Sessions ohne Login-Shell (wie GitHub Actions SSH-Action) muss NVM manuell gesourced werden. Der Wizard muss sicherstellen dass der PM2-Startup-Script mit dem richtigen Node läuft.

### 2. sudo ohne Passwort für Nginx
Der Wizard braucht `sudo` für Nginx-Config. Entweder:
- User muss `sudo` Passwort eingeben (interaktiv OK)
- Oder: sudoers-Eintrag für spezifische Befehle (für fortgeschrittene Setups)

### 3. Certbot braucht DNS-Propagation
Nach DNS-Eintrag kann Certbot erst SSL ausstellen wenn der DNS propagiert ist. Der Wizard sollte die DNS-Prüfung machen:
```javascript
execSync(`dig +short ${domain}`); // leer = DNS noch nicht propagiert
```

### 4. PM2 `ecosystem.config.js` vs. direkter Start
Aktuell wird PM2 direkt gestartet (nicht über ecosystem.config.js). Der Wizard kann beides, aber ecosystem.config.js ist sauberer für Versionierung. Empfehlung: ecosystem.config.js generieren.

### 5. `prisma generate` nach `npm ci`
Kritisch: `prisma` CLI ist in devDependencies. Nach `npm ci --omit=dev` (für Produktion) ist die CLI nicht verfügbar. Der Wizard muss `npm ci` (ohne --omit=dev) laufen lassen, oder `prisma` zu dependencies verschieben.

**Aktuelle Lösung in Produktion:** `npm ci` ohne `--omit=dev` + explizites `npx prisma generate`.

### 6. `.next/standalone` braucht manuelle Asset-Kopie
Nach `npm run build` müssen Assets kopiert werden:
```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```
Das `npm run build` Script macht das bereits automatisch (in `package.json` definiert), aber das muss im Wizard dokumentiert/sichergestellt sein.

### 7. Maintenance-Files nicht im Standalone
```bash
rm -f .next/standalone/public/maintenance.on .next/standalone/public/maintenance-msg.txt
```
Diese Dateien werden durch `cp -r public .next/standalone/public` mitkopiert wenn Maintenance aktiv ist.

### 8. LHCI Server braucht Zeit zum Starten
Nach `pm2 start lighthouse-server` braucht der Server ~2 Sekunden. Vor dem `curl` API-Call einen `sleep 3` einbauen.

### 9. GitHub Secrets via `gh` CLI
Der `gh` CLI muss eingeloggt sein: `gh auth status`. Falls nicht: `gh auth login` interaktiv aufrufen. Der Wizard sollte das prüfen.

### 10. First Admin User
Der erste Admin wird durch `ADMIN_EMAIL` env var definiert. Der User muss sich trotzdem erst registrieren — erst dann hat er Admin-Rechte. Der Wizard sollte darauf hinweisen.

---

## Deployment-Workflow nach Setup

Was der Wizard am Ende dokumentieren/ausgeben sollte:

```
Setup abgeschlossen!

Nächste Schritte:
1. Rufe https://{{DOMAIN}}/register auf und registriere deinen Admin-Account
   (Email muss mit ADMIN_EMAIL übereinstimmen: {{ADMIN_EMAIL}})

2. Für automatisches CI/CD: Pushe auf main-Branch in GitHub
   → Tests laufen automatisch
   → Deploy startet wenn Tests bestehen
   → Maintenance-Screen schaltet sich während Deploy ein/aus

3. Lighthouse Reports: https://{{LIGHTHOUSE_DOMAIN}}
   Admin-Token (sicher aufbewahren!): {{LHCI_ADMIN_TOKEN}}

Manuelle Befehle:
  pm2 logs {{PM2_NAME}}          # Logs anschauen
  pm2 restart {{PM2_NAME}}       # App neustarten
  pm2 status                     # Status aller Prozesse

  # Maintenance manuell:
  touch {{APP_PATH}}/public/maintenance.on
  rm {{APP_PATH}}/public/maintenance.on
```

---

## Reihenfolge der Implementierung

1. **Code-Refactoring** (Priorität 1 aus Audit oben) — macht den Code "wizard-ready"
2. **Wizard Grundgerüst** — `scripts/setup/index.js`, Fragen, `.env` Generator
3. **Nginx + SSL Generator** — kritischster Teil
4. **PM2 + Build** — App zum Laufen bringen
5. **Optionale Module** — GitHub Actions, Lighthouse CI
6. **Testing** — auf einer frischen Ubuntu VM testen

---

## Verworfene Alternativen

- **Docker** — würde PM2/Nginx-Integration komplex machen, passt nicht zum bestehenden Stack
- **Ansible** — zu viel Overhead für ein einzelnes Projekt
- **Shell-Script** — kein interaktives UI möglich, schlechte Fehlerbehandlung
- **Python** — kein zusätzlicher Interpreter nötig wenn Node schon da ist

---

*Erstellt: 2026-03-21 | Produktionsdaten vom Server bier.olomek.com*
