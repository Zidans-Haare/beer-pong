# Bier Pong Tournament Manager 🏆

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![PWA](https://img.shields.io/badge/PWA-Ready-purple)

A premium, modern web application for managing Beer Pong tournaments professionally. Built with Next.js 15 and designed with a "Neon Flow" aesthetic, this app provides real-time tournament tracking, comprehensive player statistics, and a seamless mobile-first user experience.

Full documentation : https://codewiki.google/github.com/zidans-haare/beer-pong

## ✨ Key Features

### 🏆 Tournament Management
- **Versatile Formats**: Support for Single Elimination, Double Elimination, Round Robin, and Group Stages.
- **Real-time Brackets**: Interactive, auto-updating tournament brackets powered by a robust match generation engine.
- **Live Ticker**: Real-time event feed for ongoing matches and results.
- **Location Integration**: Integrated Google Maps for tournament venues.

### 📊 Advanced Statistics
- **Player Profiles**: Detailed tracking of wins, losses, win rates, and tournament history.
- **Performance Visualizations**: Interactive charts (Area, Bar, Radar) showing player performance trends over time.
- **Global Leaderboards**: Automated ranking system based on Elo or win ratios.

### 📱 Progressive Web App (PWA)
- **Installable**: Functions as a native app on iOS and Android.
- **Offline Capable**: Core features work even with spotty internet connections.
- **Push Notifications**: Real-time alerts for match calls, results, and tournament updates.

### 🛠 Admin Dashboard
- **Comprehensive Control**: Full suite of tools to manage players, matches, and app settings.
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

---

Made by Nick.
