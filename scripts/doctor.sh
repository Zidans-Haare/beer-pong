#!/usr/bin/env bash
# Beer Pong — Doctor
# Checks the installation and reports issues with fix hints.
# Usage:
#   bp-doctor          — check only, no changes
#   bp-doctor-fix      — check + auto-fix safe issues

set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

APP_DIR="${APP_DIR:-$HOME/beer-pong}"
PASS="✔"
FAIL="✖"
WARN="⚠"
ISSUES=0
FIXED=0
FIX_MODE=0

if [ "${1:-}" = "--fix" ]; then
    FIX_MODE=1
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

check() {
    local label="$1"
    local result="$2"  # "ok", "warn", "fail"
    local detail="$3"
    local fix_hint="$4"

    if [ "$result" = "ok" ]; then
        printf "  \e[32m%s\e[0m  %s\n" "$PASS" "$label"
    elif [ "$result" = "warn" ]; then
        printf "  \e[33m%s\e[0m  %s\n" "$WARN" "$label"
        [ -n "$detail" ]   && printf "        \e[2m%s\e[0m\n" "$detail"
        [ -n "$fix_hint" ] && printf "        \e[36mFix: %s\e[0m\n" "$fix_hint"
        ISSUES=$((ISSUES+1))
    else
        printf "  \e[31m%s\e[0m  %s\n" "$FAIL" "$label"
        [ -n "$detail" ]   && printf "        \e[2m%s\e[0m\n" "$detail"
        [ -n "$fix_hint" ] && printf "        \e[36mFix: %s\e[0m\n" "$fix_hint"
        ISSUES=$((ISSUES+1))
    fi
}

# Auto-fix helper: runs a command, prints result
autofix() {
    local description="$1"
    shift
    printf "        \e[35m→ Auto-fix: %s\e[0m\n" "$description"
    if "$@" >/dev/null 2>&1; then
        printf "          \e[32m%s Fixed.\e[0m\n" "$PASS"
        FIXED=$((FIXED+1))
    else
        printf "          \e[31m%s Failed — please fix manually.\e[0m\n" "$FAIL"
    fi
}

# ── Banner ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "  \e[1mBeer Pong — Doctor\e[0m$([ "$FIX_MODE" = "1" ] && echo -e " \e[35m(fix mode)\e[0m")"
echo "  ──────────────────────────────────────────────────────"
echo ""

# ── App directory ─────────────────────────────────────────────────────────────
if [ -d "$APP_DIR" ]; then
    check "App directory exists ($APP_DIR)" "ok"
else
    check "App directory" "fail" "$APP_DIR not found" \
        "Run the setup wizard: curl -sL https://raw.githubusercontent.com/Zidans-Haare/beer-pong/main/setup.sh | bash"
fi

# ── .env ──────────────────────────────────────────────────────────────────────
if [ -f "$APP_DIR/.env" ]; then
    check ".env exists" "ok"

    for VAR in AUTH_SECRET AUTH_URL DATABASE_URL ADMIN_EMAIL PORT; do
        if grep -q "^${VAR}=" "$APP_DIR/.env" 2>/dev/null; then
            check ".env: $VAR set" "ok"
        else
            check ".env: $VAR missing" "fail" "" "Add ${VAR}=... to $APP_DIR/.env"
        fi
    done
else
    check ".env" "fail" "Not found" "Re-run the setup wizard"
fi

# ── Database ──────────────────────────────────────────────────────────────────
DB_PATH=$(grep "^DATABASE_URL=" "$APP_DIR/.env" 2>/dev/null | sed 's/DATABASE_URL="file://;s/".*//')
if [ -z "$DB_PATH" ]; then
    DB_PATH="$APP_DIR/dev.db"
fi

DB_NEEDS_MIGRATE=0

if [ -f "$DB_PATH" ]; then
    check "Database file exists ($DB_PATH)" "ok"
    TABLE_COUNT=$(sqlite3 "$DB_PATH" ".tables" 2>/dev/null | wc -w)
    if [ "$TABLE_COUNT" -gt 5 ]; then
        check "Database has tables ($TABLE_COUNT)" "ok"
    else
        check "Database tables" "fail" "Only $TABLE_COUNT tables found — migrations may not have run" \
            "cd $APP_DIR && set -a; . .env; set +a && npx prisma migrate deploy"
        DB_NEEDS_MIGRATE=1
    fi
else
    check "Database file" "fail" "$DB_PATH not found" \
        "cd $APP_DIR && set -a; . .env; set +a && npx prisma migrate deploy"
    DB_NEEDS_MIGRATE=1
fi

if [ "$FIX_MODE" = "1" ] && [ "$DB_NEEDS_MIGRATE" = "1" ]; then
    printf "        \e[35m→ Auto-fix: Datenbank-Migrationen\e[0m\n"
    printf "          \e[2mNur fehlende Tabellen werden ergänzt — keine Daten werden gelöscht.\e[0m\n"
    printf "          \e[33mFortfahren? [y/N] \e[0m"
    read -r DB_CONFIRM </dev/tty
    if [ "${DB_CONFIRM:-n}" = "y" ] || [ "${DB_CONFIRM:-n}" = "Y" ]; then
        if bash -c "cd \"$APP_DIR\" && set -a; . .env; set +a && npx prisma generate && npx prisma migrate deploy" >/dev/null 2>&1; then
            printf "          \e[32m%s Fixed.\e[0m\n" "$PASS"
            FIXED=$((FIXED+1))
        else
            printf "          \e[31m%s Fehlgeschlagen — bitte manuell ausführen.\e[0m\n" "$FAIL"
        fi
    else
        printf "          \e[2mÜbersprungen.\e[0m\n"
    fi
fi

# ── Node / NVM ────────────────────────────────────────────────────────────────
if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    check "Node.js installed ($NODE_VER)" "ok"
else
    check "Node.js" "fail" "Not found" "source ~/.bashrc && nvm install 20"
fi

# ── PM2 ───────────────────────────────────────────────────────────────────────
PM2_NEEDS_FIX=0
PM2_FIX_TYPE=""

if command -v pm2 &>/dev/null; then
    check "PM2 installed" "ok"
    if pm2 show beer-pong &>/dev/null 2>&1; then
        STATUS=$(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | sed 's/"status":"//;s/"//')
        if [ "$STATUS" = "online" ]; then
            check "PM2 process 'beer-pong' running" "ok"
        else
            check "PM2 process 'beer-pong'" "warn" "Status: $STATUS" \
                "set -a; . $APP_DIR/.env; set +a && pm2 restart beer-pong --update-env"
            PM2_NEEDS_FIX=1
            PM2_FIX_TYPE="restart"
        fi
    else
        check "PM2 process 'beer-pong'" "fail" "Not registered" \
            "Re-run the setup wizard or: pm2 start $APP_DIR/.next/standalone/server.js --name beer-pong"
        PM2_NEEDS_FIX=1
        PM2_FIX_TYPE="start"
    fi
else
    check "PM2" "fail" "Not found" "npm install -g pm2"
fi

if [ "$FIX_MODE" = "1" ] && [ "$PM2_NEEDS_FIX" = "1" ]; then
    if [ "$PM2_FIX_TYPE" = "restart" ]; then
        autofix "Restarting PM2 process…" \
            bash -c "set -a; . \"$APP_DIR/.env\"; set +a && pm2 restart beer-pong --update-env && pm2 save"
    elif [ "$PM2_FIX_TYPE" = "start" ]; then
        SERVER_JS="$APP_DIR/.next/standalone/server.js"
        if [ -f "$SERVER_JS" ]; then
            autofix "Starting PM2 process…" \
                bash -c "set -a; . \"$APP_DIR/.env\"; set +a && pm2 start \"$SERVER_JS\" --name beer-pong && pm2 save"
        else
            printf "          \e[33m⚠ Build not found — run bp-update first.\e[0m\n"
        fi
    fi
fi

# ── Nginx ─────────────────────────────────────────────────────────────────────
if command -v nginx &>/dev/null; then
    check "nginx installed" "ok"
    if nginx -t &>/dev/null 2>&1; then
        check "nginx config valid" "ok"
    else
        check "nginx config" "fail" "$(nginx -t 2>&1 | tail -1)" "nginx -t  for details"
    fi
else
    check "nginx" "warn" "Not installed" "apt install nginx"
fi

# ── Certbot / SSL ─────────────────────────────────────────────────────────────
if command -v certbot &>/dev/null; then
    check "certbot installed" "ok"
else
    check "certbot" "warn" "Not installed — HTTPS may not work" "apt install certbot python3-certbot-nginx"
fi

# ── Port reachable ────────────────────────────────────────────────────────────
PORT=$(grep "^PORT=" "$APP_DIR/.env" 2>/dev/null | sed 's/PORT=//;s/"//g')
PORT="${PORT:-3000}"
APP_RESPONDING=0
if curl -sf "http://localhost:$PORT" -o /dev/null -m 3 2>/dev/null; then
    check "App responding on port $PORT" "ok"
    APP_RESPONDING=1
else
    check "App responding on port $PORT" "warn" "No response from localhost:$PORT" \
        "pm2 logs beer-pong  to check errors"
fi

# In fix mode: if PM2 was already online but app still not responding, restart once
if [ "$FIX_MODE" = "1" ] && [ "$APP_RESPONDING" = "0" ] && [ "$PM2_NEEDS_FIX" = "0" ] && command -v pm2 &>/dev/null; then
    autofix "Restarting PM2 (app not responding)…" \
        bash -c "set -a; . \"$APP_DIR/.env\"; set +a && pm2 restart beer-pong --update-env"
fi

# ── Disk space ────────────────────────────────────────────────────────────────
DISK_FREE=$(df "$APP_DIR" 2>/dev/null | awk 'NR==2 {print $4}')
DISK_FREE_MB=$((DISK_FREE / 1024))
if [ "$DISK_FREE_MB" -gt 500 ]; then
    check "Disk space (${DISK_FREE_MB}MB free)" "ok"
elif [ "$DISK_FREE_MB" -gt 100 ]; then
    check "Disk space (${DISK_FREE_MB}MB free)" "warn" "Getting low" "df -h $APP_DIR"
else
    check "Disk space (${DISK_FREE_MB}MB free)" "fail" "Critically low!" \
        "Clean up with: journalctl --vacuum-size=100M"
    if [ "$FIX_MODE" = "1" ]; then
        autofix "Cleaning journal logs…" \
            bash -c "journalctl --vacuum-size=100M"
    fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "  ──────────────────────────────────────────────────────"
if [ "$ISSUES" -eq 0 ]; then
    printf "  \e[32m✔  Everything looks good!\e[0m\n"
else
    if [ "$FIX_MODE" = "1" ] && [ "$FIXED" -gt 0 ]; then
        printf "  \e[35m✔  %d issue(s) auto-fixed\e[0m" "$FIXED"
        REMAINING=$((ISSUES - FIXED))
        if [ "$REMAINING" -gt 0 ]; then
            printf "\e[33m  ·  %d require manual action\e[0m" "$REMAINING"
        fi
        printf "\n"
    else
        printf "  \e[33m⚠  %d issue(s) found — run \e[0m\e[36mbp-doctor-fix\e[0m\e[33m to auto-fix, or see hints above.\e[0m\n" "$ISSUES"
    fi
    echo ""
    printf "  \e[2mStill stuck? Write to \e[0m\e[36mn@olomek.com\e[0m\n"
fi
echo ""
