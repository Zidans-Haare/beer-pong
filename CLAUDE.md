# Claude Code - Projekthinweise

## Datenbank

**WICHTIG: Die Produktionsdatenbank (`dev.db`) darf NIEMALS gelöscht, zurückgesetzt oder überschrieben werden!**

- Datenbank: SQLite via `better-sqlite3` Adapter (nicht Standard-Prisma)
- Pfad: `dev.db` im Projektroot (NICHT `prisma/dev.db`)
- Prisma-Client: siehe `src/lib/prisma.ts` — nutzt `PrismaBetterSqlite3` Adapter
- Vor Schema-Änderungen: **Immer Migration erstellen** (`npx prisma migrate dev --name <name>`), niemals `db push` oder `migrate reset` auf dem Server verwenden
- Bei Deployments: Sicherstellen, dass `dev.db` nicht im Build-Prozess überschrieben wird

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **UI:** React 19, Lucide Icons, Framer Motion, Recharts
- **Auth:** NextAuth.js 5 (beta) mit Credentials + Passkey-Support
- **DB:** SQLite + Prisma ORM + better-sqlite3 Adapter
- **Sprache:** TypeScript, UI-Texte auf Deutsch

## Projektstruktur

- `src/app/actions/` — Server Actions (auth, admin, rsvp, tournaments, etc.)
- `src/app/admin/` — Admin-Bereich (geschützt via `ADMIN_EMAIL` env var)
- `src/app/tournaments/` — Turnierverwaltung
- `src/lib/services/` — Business Logic (TournamentService)
- `src/lib/` — Utilities (brackets, scheduler, duration, realtime)
- `prisma/schema.prisma` — Datenbankschema

## Konventionen

- Admin-Schutz: `checkAdmin()` in `src/app/actions/admin.ts` prüft `session.user.email === process.env.ADMIN_EMAIL`
- RSVP-System: Spieler melden sich über RSVP (YES/NO/MAYBE) zu Turnieren an
- Turnier-Status: PLANNED -> ACTIVE -> COMPLETED
- Modi: SOLO (1v1), TEAM (2v2)
- Gast-Spieler: Nur bei Spass-Turnieren (isRanked=false), 24h Session

## Server/Deployment

- `npm run build` zum Bauen
- `npm run start` zum Starten (Produktion)
- Env-Variablen: `.env` Datei (ADMIN_EMAIL, AUTH_SECRET, DATABASE_URL, VAPID keys)
