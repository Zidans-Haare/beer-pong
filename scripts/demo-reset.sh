#!/usr/bin/env bash
# Demo database reset — runs daily on demo instance only.
#
# Safety: refuses to run unless DEMO_MODE=true and DEMO_DB points at a demo file.
# Intended for use in a cron job on the dedicated demo server.
#
# Cron example (run at 04:00 daily):
#   0 4 * * * /var/www/beer-pong/scripts/demo-reset.sh >> /var/log/beer-pong-demo-reset.log 2>&1

set -euo pipefail

# Resolve script directory so the script works regardless of cwd
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Load .env (without leaking non-DEMO vars to the shell afterwards)
if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

# Safety guard 1: DEMO_MODE must be true
if [ "${DEMO_MODE:-}" != "true" ]; then
    echo "[$(date -Iseconds)] ABORT: DEMO_MODE is not 'true'. Refusing to reset."
    exit 1
fi

# Safety guard 2: DEMO_DB must be a demo file
DEMO_DB_PATH="${DEMO_DB:-demo.db}"
DB_BASENAME="$(basename "$DEMO_DB_PATH")"

case "$DB_BASENAME" in
    dev.db|prod.db|production.db)
        echo "[$(date -Iseconds)] ABORT: DEMO_DB ('$DB_BASENAME') is a protected name."
        exit 1
        ;;
esac

if [[ "$DB_BASENAME" != *demo* ]]; then
    echo "[$(date -Iseconds)] ABORT: DEMO_DB filename must contain 'demo' (got '$DB_BASENAME')."
    exit 1
fi

echo "[$(date -Iseconds)] Starting demo reset on $DEMO_DB_PATH…"
DATABASE_URL="file:./$DEMO_DB_PATH" npx tsx prisma/seed-demo.ts
echo "[$(date -Iseconds)] Demo reset completed."
