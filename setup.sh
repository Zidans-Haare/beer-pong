#!/usr/bin/env bash
# Beer Pong — Server Bootstrap
# Usage: curl -sL https://raw.githubusercontent.com/your-org/beer-pong/main/setup.sh | bash
set -e

REPO_URL="$(git remote get-url origin 2>/dev/null || echo "https://github.com/your-org/beer-pong.git")"
CLONE_DIR="$HOME/beer-pong-setup-tmp"
INSTALL_NODE_VERSION="20"

echo ""
echo "  Beer Pong — Setup Bootstrap"
echo "  =============================="
echo ""

# ── 1. Install NVM + Node if missing ─────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    echo "[1/3] Installing NVM…"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    # shellcheck source=/dev/null
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
else
    echo "[1/3] NVM already installed"
    \. "$NVM_DIR/nvm.sh"
fi

if ! command -v node &>/dev/null; then
    echo "      Installing Node.js $INSTALL_NODE_VERSION…"
    nvm install "$INSTALL_NODE_VERSION"
    nvm use "$INSTALL_NODE_VERSION"
    nvm alias default "$INSTALL_NODE_VERSION"
else
    echo "      Node $(node -v) already installed"
fi

# ── 2. Clone repo to a temp location just to get the wizard ──────────────────
echo "[2/3] Fetching setup wizard…"
if [ -d "$CLONE_DIR" ]; then
    (cd "$CLONE_DIR" && git pull -q)
else
    git clone -q "$REPO_URL" "$CLONE_DIR"
fi

# ── 3. Run the wizard (it will clone the repo to the final location) ──────────
echo "[3/3] Starting wizard…"
cd "$CLONE_DIR"
npm install --silent 2>/dev/null
node scripts/setup/index.js --mode server

# Clean up temp clone (the wizard already cloned to ~/beer-pong)
rm -rf "$CLONE_DIR"
