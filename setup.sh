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
npx --yes github:Zidans-Haare/beer-pong
