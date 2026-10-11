# Bier Pong Tournament Manager

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![PWA](https://img.shields.io/badge/PWA-Ready-purple)

A modern, mobile-first web app for managing Beer Pong tournaments — real-time brackets, seasons, player stats, an animated year-in-review, live chat, and full PWA support.

---

## Star History

<a href="https://www.star-history.com/?repos=Zidans-Haare%2Fbeer-pong&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=Zidans-Haare/beer-pong&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=Zidans-Haare/beer-pong&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=Zidans-Haare/beer-pong&type=date&legend=top-left" />
 </picture>
</a>

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

**Tournaments**
- **Formats** — Single/Double Elimination, Round Robin, Group Stages; solo (1v1) and team (2v2)
- **Live Brackets** — real-time match updates, tap-to-score, overtime mode
- **Host actions** — start, start playoffs, finish; every step confirmed in an in-app dialog
- **Bring Lists** — supply lists synced across all participants
- **Guest Access** — 24h sessions for fun/unranked tournaments

**Seasons & Stats**
- **Seasons** — tournaments belong to a season by date; the admin ends a season and starts the next one with one click
- **Season colour** — each season has its own accent colour that recolours the whole app
- **Ranking** — one table, sorted by medals, win rate or cups per game; a personal summary with form and current streak
- **Head to head** — record against every opponent, including nemesis and favourite opponent
- **Records** — longest win streak, biggest win, most cups in a tournament, longest game
- **Excel export** — one workbook with rankings, tournaments, every game, tournament tables, the head-to-head matrix and records

**Beer Pong Wrapped**
- **Year in review** — an animated table scene per player: games, cups, record, main rival, wins and player type
- **Sound** — music and effects are generated in the browser (Web Audio), no audio files
- **Share** — export as a 1080×1920 MP4 for stories, or save single frames as images
- **Admin trigger** — pick a calendar year or a season, preview, publish for everyone; players get a notification and a banner
- **Archive** — past recaps stay available on the stats page

**Mini game and figures**
- **Rules page** — the house rules (bombs, islands, rearranging, balls back, naked mile and more) at `/rules`, German and English
- **Beer pong mini game** — swipe to throw against the computer (three levels) or challenge a player to an asynchronous duel: you play your game, the opponent answers whenever they have time and gets a notification
- **Mini game stats** — overall record, record per computer level, duel results, head to head and the last duels on the profile and the stats page
- **Your figure** — pick skin, hairstyle and colour, top and pattern, height, build and several accessories (including a beer hat); it appears at the podium, in Wrapped, in duels and the mini game, waves on the home page and dances on the profile (only once you have designed it)
- **Tournament film** — a finished tournament plays as a short scene with the final, the podium and sound, and ends in a winner overlay with the top three

**App**
- **Design** — light theme with local fonts, five-tab mobile navigation, admin sidebar on desktop
- **Drunk mode** — simplified navigation, a short intro scene, and a deliberately wobbly, blurry interface (off with reduced motion)
- **Live Chat** — PWA- and iOS-optimized, polling every 5s
- **Push Notifications** — match calls, results, tournament updates
- **Passkey Support** — WebAuthn in addition to credentials
- **Admin Dashboard** — approve players, override scores, manage tournaments, seasons and Wrapped
- **Maintenance Mode** — zero-downtime via nginx flag file
- **Multilingual** — English and German, selected during setup (changeable via `NEXT_PUBLIC_LOCALE` in `.env`)
- **TV View** — fullscreen broadcast display with live standings, round slider, and auto-cycling bracket
- **WebRTC Livestream** — self-hosted peer-to-peer camera stream from phone to TV view, no external service required (optional Cloudflare TURN for internet-wide connectivity)

---

## Demo

<p align="center">
  <img src="https://github.com/Zidans-Haare/beer-pong/releases/download/v0.9.0/demo.gif" alt="Beer Pong Tournament Manager Demo" width="350" />
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
| Animation & Audio | Canvas 2D scenes, Web Audio, MediaRecorder (video export) |
| Export | [ExcelJS](https://github.com/exceljs/exceljs) |
| Charts | [Recharts](https://recharts.org/) |
| Maps | Google Maps Platform |
| Email | [Resend](https://resend.com) |
| Error Tracking | [Sentry](https://sentry.io) |
| Streaming | WebRTC (built-in signaling) + optional [Cloudflare TURN](https://developers.cloudflare.com/calls/turn/) |
| Testing | [Vitest](https://vitest.dev/) (unit), [Playwright](https://playwright.dev/) (end-to-end, isolated database) |

---

## Documentation

| | |
|---|---|
| [Setup Guide](docs/setup.md) | DNS, APIs, Wizard walkthrough, system requirements |
| [Server Management](docs/server.md) | `bp-*` commands, updates, maintenance mode, doctor |
| [CI/CD](docs/cicd.md) | GitHub Actions, Webhook auto-deploy, required secrets |
| [Email](docs/email.md) | Resend setup, DNS records, triggered events |
| [Error Monitoring](docs/monitoring.md) | Sentry setup |
| [Redesign & Testing](docs/redesign.md) | Design notes, isolated end-to-end tests, local preview |

---

## Deployment Notes

- **Migrations** — run `node scripts/fix-migration-table.js` before `npx prisma migrate deploy`. Older databases store text timestamps in `_prisma_migrations`, which makes the current Prisma schema engine crash with "input contains invalid characters". The script converts them, keeps a backup next to the database and does nothing on a clean table. The GitHub Actions deploy already calls it.
- **Passkeys** — set `WEBAUTHN_RP_ID` (domain without `https://`) and `WEBAUTHN_ORIGIN` (with `https://`) to your real domain; with `localhost` passkeys cannot be registered.
- **HTTPS** — Wrapped's share sheet, passkeys, push and the service worker need a secure context.

---

Made by Nick.
