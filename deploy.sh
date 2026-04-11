#!/bin/bash

# --- SICHERES DEPLOYMENT SKRIPT ---
# Die Live-DB liegt immer in prisma/dev.db (absoluter Pfad via DATABASE_URL).
# Der Build berührt die DB nie.

set -e

echo "Starte Deployment..."

# 1. Datenbank Backup
TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="prisma/backup_before_deploy_${TIMESTAMP}.db"
cp prisma/dev.db "$BACKUP_FILE"
echo "Backup erstellt: $BACKUP_FILE"

# 2. Dependencies & Prisma
npm install
npx prisma generate
npx prisma migrate deploy
echo "Dependencies & Migrationen fertig."

# 2.5 Bump SW CACHE_VERSION
echo "Bumping Service Worker Cache Version..."
CURRENT=$(grep "CACHE_VERSION" public/sw.js | grep -oE "[0-9]+")
if [ -n "$CURRENT" ]; then
    NEXT=$((CURRENT + 1))
    if [ "$(uname)" = "Darwin" ]; then
        sed -i '' "s/CACHE_VERSION = 'v${CURRENT}'/CACHE_VERSION = 'v${NEXT}'/" public/sw.js
    else
        sed -i "s/CACHE_VERSION = 'v${CURRENT}'/CACHE_VERSION = 'v${NEXT}'/" public/sw.js
    fi
    echo "SW Cache Version bumped to v${NEXT}"
else
    echo "Warning: CACHE_VERSION not found in sw.js"
fi

# 3. Build
npm run build
echo "Build fertig."

# 4. Static Assets kopieren (DB wird NICHT angefasst)
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
echo "Assets kopiert."

# 5. PM2 Neustart mit absolutem DB-Pfad
DATABASE_URL="file:/home/htw/beer-pong/prisma/dev.db" pm2 restart beer-pong --update-env
pm2 save
echo "App neu gestartet!"

echo "Deployment erfolgreich abgeschlossen!"
