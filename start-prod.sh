#!/usr/bin/env bash
# Mac Mirror — Production launcher
# Builds client, then serves static files alongside the relay server.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[mac-mirror]${NC} $1"; }
warn() { echo -e "${YELLOW}[mac-mirror]${NC} $1"; }
err() { echo -e "${RED}[mac-mirror]${NC} $1" >&2; }

cd "$(dirname "$0")"

# --- Pre-flight ---

if ! command -v node &>/dev/null; then
  err "Node.js not found."
  exit 1
fi

if ! command -v cliclick &>/dev/null; then
  warn "cliclick not found — remote input will not work."
fi

# --- Tailscale ---

TAILSCALE_IP=""
if command -v tailscale &>/dev/null; then
  TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || true)
fi

# --- Install + build ---

if [ ! -d node_modules ]; then
  log "Installing root dependencies..."
  npm install --omit=dev
fi

if [ ! -d src/client/node_modules ]; then
  log "Installing client dependencies..."
  npm --prefix src/client install
fi

log "Building client..."
npm run client:build

# --- Start ---

cleanup() {
  log "Stopping..."
  kill $SERVER_PID $DAEMON_PID 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

PORT=$(node -e "console.log(require('./config.json').port || 3847)")

log "Starting relay server on port $PORT..."
npm run server &
SERVER_PID=$!
sleep 1

log "Starting capture daemon..."
npm run daemon &
DAEMON_PID=$!

echo ""
log "=== Mac Mirror (production) ==="
log "Health: http://localhost:$PORT/health"
if [ -n "$TAILSCALE_IP" ]; then
  log "Tailscale IP: $TAILSCALE_IP"
  log "Connect clients with: ws://$TAILSCALE_IP:$PORT"
fi
log "Serve client build from: src/client/dist/"
echo ""
log "Press Ctrl+C to stop."

wait
