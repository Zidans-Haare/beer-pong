# Setup Guide

## Requirements

The setup wizard and `bp-*` shell aliases are designed for **Linux servers with bash**:

| OS | Shell | Supported |
|---|---|---|
| Ubuntu 20.04 / 22.04 / 24.04 | bash | ✅ tested |
| Debian 11 / 12 | bash | ✅ |
| CentOS / RHEL / Fedora | bash | ✅ |
| Alpine Linux | bash | ✅ |
| macOS | zsh | ⚠️ Wizard runs, but aliases are written to `.bashrc` — zsh won't load them automatically |

---

## Before You Start

### 1. DNS

Point your domain to your server before running the wizard. Certbot (SSL) requires the domain to already resolve to the server IP.

| Type | Name | Value |
|---|---|---|
| A | `@` | `<your server IP>` |
| A | `www` | `<your server IP>` (optional) |

DNS changes can take up to 24h to propagate, but usually take a few minutes.

### 2. Optional API Keys

The wizard will ask for these — all are optional, the app works without them.

**Resend** (email notifications):
1. Create account at [resend.com](https://resend.com)
2. Add your domain → copy the SPF/DKIM DNS records into your registrar
3. Create API key with **Sending access**

**Google Maps** (location autocomplete for tournaments):
1. Open [console.cloud.google.com](https://console.cloud.google.com) → new project
2. Enable: **Maps JavaScript API** + **Places API**
3. Create API key → restrict it to your domain

**Sentry** (error tracking):
1. Create account at [sentry.io](https://sentry.io)
2. New Project → Next.js → copy the DSN

---

## Running the Wizard

```bash
curl -sL https://raw.githubusercontent.com/Zidans-Haare/beer-pong/main/setup.sh | bash
```

The wizard will:
1. Check and install system dependencies (Node via NVM, nginx, certbot, sqlite3, PM2)
2. Clone the repository to `~/beer-pong`
3. Generate `.env` with secrets auto-generated
4. Configure nginx + request SSL certificate via certbot
5. Initialize the database and run migrations
6. Build the app and start it via PM2 (with autostart on reboot)
7. Set up a weekly database backup (optional)
8. Install `bp-*` shell aliases

After setup, run:
```bash
source ~/.bashrc
```

Then open `https://your-domain.com/register` to create your admin account.

---

## Local Development

```bash
git clone https://github.com/Zidans-Haare/beer-pong.git
cd beer-pong
npm run setup   # or: npm install && npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
