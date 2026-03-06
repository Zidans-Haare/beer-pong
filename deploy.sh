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
