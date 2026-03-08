# Bier Pong Tournament Manager 🏆

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![PWA](https://img.shields.io/badge/PWA-Ready-purple)

A premium, modern web application for managing Beer Pong tournaments professionally. Built with Next.js 15 and designed with a "Neon Flow" aesthetic, this app provides real-time tournament tracking, comprehensive player statistics, live interactive chat, and a seamless mobile-first user experience.

Full documentation : https://codewiki.google/github.com/zidans-haare/beer-pong

## ✨ Key Features

### 🏆 Tournament Management
- **Versatile Formats**: Support for Single Elimination, Double Elimination, Round Robin, and Group Stages.
- **Match Results & Overtime**: Advanced match scoring featuring tap-buttons (0-10) for cup count, mobile numeric keypads, and an **Overtime (OT)** mode for unlimited additional rounds. 
- **Real-time Brackets**: Interactive, auto-updating tournament brackets powered by a robust match generation engine.
- **Advanced Bring Lists**: Integrated lists for tournament supplies supporting item quantities and real-time synchronization across participants.
- **Live Ticker**: Real-time event feed for ongoing matches and results.
- **Location Integration**: Integrated Google Maps for tournament venues.

### 💬 Social & Chat
- **Live Interactive Chat**: Seamlessly integrated, PWA & iOS optimized chat experience with dynamic keyboard-friendly layouts.

### 📊 Advanced Statistics
- **Player Profiles**: Detailed tracking of wins, losses, win rates, and tournament history.
- **Performance Visualizations**: Interactive charts (Area, Bar, Radar) showing player performance trends over time.
- **Global Leaderboards**: Automated ranking system based on Elo or win ratios.

### 🛡️ Privacy & Security
- **Protected Routes**: Full application locked behind NextAuth login to protect user data and privacy.
- **Guest Access**: Carefully managed guest sessions extended up to 7 days for streamlined event onboarding.

### 📱 Progressive Web App (PWA)
- **Installable**: Functions as a native app on iOS and Android.
- **Offline Capable**: Core features work even with spotty internet connections.
- **Push Notifications**: Real-time alerts for match calls, results, and tournament updates.
- **Mobile-Optimized UI**: Animated bottom navigation bar for logged-in users and a floating "QR Pill" for fast access when logged out, built with sleek Lucide icons.

### 🛠 Admin Dashboard
- **Comprehensive Control**: Full suite of tools to manage players, matches, app settings, and remove players directly from active tournaments.
- **Mobile-First Admin**: Optimized admin interface for managing tournaments on the go.

## 📸 Screenshots

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

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: [SQLite](https://www.sqlite.org/) with [Prisma ORM](https://www.prisma.io/)
- **Styling**: Custom CSS Variables & Glassmorphism Design System
- **Icons**: [Lucide React](https://lucide.dev/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Charts**: [Recharts](https://recharts.org/) for data visualization
- **Maps**: Google Maps Platform Integration

## 🚀 Deployment

The project is optimized for deployment on Vercel or any Node.js hosting environment.

### Deploy on Vercel

1. **Push to GitHub**: Ensure your project is pushed to a GitHub repository.
2. **Import Project**: In Vercel, import your repository.
3. **Environment Variables**: Configure the following environment variables:
   - `DATABASE_URL`: Path to your SQLite DB or connection string for Postgres/MySQL (if scaling up).
   - `AUTH_SECRET`: Generate a secure random string.
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY`: For Push Notifications.
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: For Location services.
4. **Deploy**: Click deploy and your app will be live in minutes.

### Manual / Self-Hosted Verification

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

## 📖 Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/beer-pong.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize Database**
   ```bash
   npx prisma migrate dev
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 🔧 Wartungsmodus

Bei Deployments kann eine Wartungsseite per Nginx-Flagdatei aktiviert werden, ohne die App neu zu starten.

### Setup (einmalig auf dem Server)

In der Nginx-Config für die Domain folgendes einfügen:

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
    # ... bestehende proxy-Einstellungen ...
}

error_page 503 /maintenance.html;
```

`/path/to/project` mit dem tatsächlichen Projektpfad auf dem Server ersetzen, dann: `nginx -t && systemctl reload nginx`

### Verwendung

Die Aliases `maint-on` und `maint-off` steuern den Modus:

```bash
maint-on
# → Fragt nach: Was passiert gerade? (z.B. "Neuer Build – Commit abc123")
# → Fragt nach: Geschätzte Dauer in Minuten
# → Nginx zeigt sofort die Wartungsseite mit Startzeitpunkt, Ende und Countdown
```

```bash
maint-off
# → Wartungsmodus deaktiviert, Seite sofort wieder erreichbar
```

Die Wartungsseite (`public/maintenance.html`) ist rein statisch, leitet automatisch weiter sobald der Wartungsmodus beendet wird, und zeigt optional Nachricht + Live-Countdown.

### Typischer Deploy-Ablauf

```bash
maint-on                    # Wartungsseite an
git pull
npm run build
pm2 restart beer-pong
maint-off                   # Zurück zur App
```

---

Made by Nick.
