#!/usr/bin/env bash
# Beer Pong — Update Script
# Usage: bash update.sh
# Or:    curl -fsSL https://raw.githubusercontent.com/Zidans-Haare/beer-pong/main/scripts/update.sh | bash

set -e

APP_DIR="${APP_DIR:-$HOME/beer-pong}"

# ── NVM ──────────────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
fi

if ! command -v node &>/dev/null; then
    echo "❌  Node.js not found. Please install it first."
    exit 1
fi

# ── Navigate to app ───────────────────────────────────────────────────────
if [ ! -d "$APP_DIR" ]; then
    echo "❌  App directory not found: $APP_DIR"
    echo "    Set APP_DIR env var if your app lives elsewhere."
    exit 1
fi

cd "$APP_DIR"

echo ""
echo "⬇   Pulling latest changes..."
git pull

echo "📦  Installing dependencies..."
npm ci

echo "🔄  Generating Prisma client..."
npx prisma generate

echo "🗄️   Running migrations..."
npx prisma migrate deploy

echo "🔨  Building app..."
npm run build
cp -r messages .next/standalone/messages 2>/dev/null || true

echo "♻️   Restarting PM2..."
set -a; [ -f .env ] && . .env; set +a
pm2 restart beer-pong --update-env

echo ""
echo "✅  Update complete!"
echo ""
pm2 status
