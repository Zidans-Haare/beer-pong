#!/usr/bin/env bash
# Beer Pong — Setup Bootstrap
#
# Usage (recommended):
#   npx github:Zidans-Haare/beer-pong
#
# Or via curl if Node is not yet installed:
#   curl -sL https://raw.githubusercontent.com/Zidans-Haare/beer-pong/main/setup.sh | bash
#
set -e

# When run via "curl | bash", stdin is the pipe — interactive prompts won't work.
# Re-download to a temp file and re-execute with terminal stdin.
if [ ! -t 0 ]; then
    TMP=$(mktemp /tmp/beer-pong-setup.XXXXXX.sh)
    trap "rm -f $TMP" EXIT
    curl -fsSL "https://raw.githubusercontent.com/Zidans-Haare/beer-pong/main/setup.sh" -o "$TMP"
    exec bash "$TMP" </dev/tty
fi

export NVM_DIR="$HOME/.nvm"

# ── Install NVM + Node if missing ─────────────────────────────────────────────
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    echo "Installing NVM…"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

\. "$NVM_DIR/nvm.sh"

if ! command -v node &>/dev/null; then
    echo "Installing Node.js 20…"
    nvm install 20
    nvm alias default 20
fi

# ── Run wizard directly from GitHub via npx ───────────────────────────────────
npx --yes github:Zidans-Haare/beer-pong -- --mode server
