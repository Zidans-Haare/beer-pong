# Bier Pong Tournament Manager

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![PWA](https://img.shields.io/badge/PWA-Ready-purple)

A modern, mobile-first web app for managing Beer Pong tournaments — real-time brackets, player stats, live chat, and full PWA support.

---

## Quick Setup

**Fresh server** — installs Node, nginx, SSL, PM2, and the app in one command:
```bash
curl -sL https://raw.githubusercontent.com/Zidans-Haare/beer-pong/main/setup.sh | bash
```
> [Inspect setup.sh](https://github.com/Zidans-Haare/beer-pong/blob/main/setup.sh) before running it. → [Full setup guide](docs/setup.md)

**Node already installed:**
```bash
npx github:Zidans-Haare/beer-pong
```

**Local development:**
```bash
git clone https://github.com/Zidans-Haare/beer-pong.git && cd beer-pong && npm run setup
```

---

## Features

- **Tournaments** — Single/Double Elimination, Round Robin, Group Stages
- **Live Brackets** — real-time match updates, tap-to-score, overtime mode
- **Player Stats** — Elo ranking, win rates, charts, full history
- **Live Chat** — PWA- and iOS-optimized, polling every 5s
- **Bring Lists** — supply lists synced across all participants
- **Push Notifications** — match calls, results, tournament updates
- **Passkey Support** — WebAuthn in addition to credentials
- **Guest Access** — 24h sessions for fun/unranked tournaments
- **Admin Dashboard** — approve players, override scores, manage tournaments
- **Maintenance Mode** — zero-downtime via nginx flag file
- **Multilingual** — English and German, selected during setup (changeable via `NEXT_PUBLIC_LOCALE` in `.env`)

---

## Demo

<p align="center">
  <img src="public/docs/images/demo.gif" alt="Beer Pong Tournament Manager Demo" width="350" />
</p>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, Server Actions) |
| Language | TypeScript |
| Database | SQLite via [Prisma ORM](https://www.prisma.io/) + `better-sqlite3` |
| Auth | [NextAuth.js 5](https://next-auth.js.org/) (Credentials + Passkey) |
| UI | React 19, Framer Motion, Lucide Icons |
| Charts | [Recharts](https://recharts.org/) |
| Maps | Google Maps Platform |
| Email | [Resend](https://resend.com) |
| Error Tracking | [Sentry](https://sentry.io) |

---

## Documentation

| | |
|---|---|
| [Setup Guide](docs/setup.md) | DNS, APIs, Wizard walkthrough, system requirements |
| [Server Management](docs/server.md) | `bp-*` commands, updates, maintenance mode, doctor |
| [CI/CD](docs/cicd.md) | GitHub Actions, Webhook auto-deploy, required secrets |
| [Email](docs/email.md) | Resend setup, DNS records, triggered events |
| [Error Monitoring](docs/monitoring.md) | Sentry setup |

---

Made by Nick.
