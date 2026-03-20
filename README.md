# Bier Pong Tournament Manager

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![PWA](https://img.shields.io/badge/PWA-Ready-purple)

A modern, mobile-first web application for managing Beer Pong tournaments. Built with Next.js 15 and a "Neon Flow" aesthetic — featuring real-time brackets, player statistics, live chat, and full PWA support.

Full documentation : https://codewiki.google/github.com/zidans-haare/beer-pong

---

## Features

### Tournament Management
- **Multiple Formats**: Single Elimination, Double Elimination, Round Robin, Group Stages
- **Match Scoring**: Tap-button cup count (0–10), mobile numeric keypad, Overtime (OT) mode for tiebreakers
- **Live Brackets**: Auto-updating tournament brackets with real-time match generation
- **Bring Lists**: Integrated supply lists with item quantities, synced across all participants
- **Live Ticker**: Real-time event feed for ongoing matches and results
- **Venue Integration**: Google Maps integration for tournament locations

### Social & Community
- **Live Chat**: Global community chat with PWA- and iOS-optimized keyboard layout, polling every 5 seconds

### Player Statistics
- **Profiles**: Win/loss tracking, win rates, full tournament history
- **Charts**: Area, Bar, and Radar charts for performance trends over time
- **Leaderboard**: Global ranking based on Elo or win ratio

### Authentication & Privacy
- **Protected Routes**: Full app locked behind NextAuth.js authentication
- **User Approval Flow**: New users require admin approval before gaining access
- **Passkey Support**: WebAuthn passkey login in addition to credentials
- **Guest Access**: Managed guest sessions (24h) for fun/unranked tournaments

### PWA
- **Installable**: Works as a native app on iOS and Android
- **Offline Capable**: Core functionality works with limited connectivity
- **Push Notifications**: Alerts for match calls, results, and tournament updates
- **Mobile UI**: Animated bottom nav for logged-in users, floating QR Pill for guests

### Admin Dashboard
- **Player Management**: Approve, reject, or remove players
- **Match Control**: Override scores, manage tournament flow
- **App Settings**: Configure global app behavior
- **Mobile-Optimized**: Full admin access from any device

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

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/yourusername/beer-pong.git
cd beer-pong

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in AUTH_SECRET, DATABASE_URL, ADMIN_EMAIL, VAPID keys, Google Maps API key

# 4. Initialize database
npx prisma migrate dev

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

### Vercel

1. Push to a GitHub repository
2. Import in [Vercel](https://vercel.com)
3. Set the following environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite path or Postgres/MySQL connection string |
| `AUTH_SECRET` | Random secret for NextAuth.js |
| `ADMIN_EMAIL` | Email address that receives admin privileges |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for push notifications |
| `VAPID_PRIVATE_KEY` | VAPID private key for push notifications |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |

4. Deploy

### Manual / Self-Hosted

```bash
npm run build
npm start
```

---

## Maintenance Mode

The app supports a zero-downtime maintenance page via an Nginx flag file — no app restart required.

### Nginx Config

```nginx
set $maintenance 0;
if (-f /path/to/project/public/maintenance.on) {
    set $maintenance 1;
}

location = /maintenance.html {
    root /path/to/project/public;
    internal;
}

location = /maintenance-msg.txt {
    root /path/to/project/public;
    add_header Cache-Control "no-store";
}

location / {
    if ($maintenance = 1) {
        return 503;
    }
    # ... existing proxy config ...
}

error_page 503 /maintenance.html;
```

Replace `/path/to/project` with the actual project path, then reload: `nginx -t && systemctl reload nginx`

### Usage

```bash
maint-on    # Enable maintenance page (prompts for message + estimated duration)
maint-off   # Disable maintenance page
```

### Typical Deploy Flow

```bash
maint-on
git pull
npm run build
pm2 restart beer-pong
maint-off
```

The maintenance page (`public/maintenance.html`) is fully static, auto-redirects when maintenance ends, and shows a live countdown with optional message.

---

## Screenshots

### Mobile Experience
<p align="center">
  <img src="public/docs/images/image.png" width="30%" alt="Start Screen" />
  <img src="public/docs/images/image copy.png" width="30%" alt="Tournament View" />
  <img src="public/docs/images/image copy 2.png" width="30%" alt="Player Profile" />
</p>

### Tournament & Stats
<p align="center">
  <img src="public/docs/images/image copy 9.png" width="30%" alt="Bracket View" />
  <img src="public/docs/images/image copy 4.png" width="30%" alt="Stats Dashboard" />
  <img src="public/docs/images/image copy 8.png" width="30%" alt="Match Interface" />
</p>

---

Made by Nick.
