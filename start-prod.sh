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

# --- Kill stale processes ---

STALE_PIDS=$(lsof -ti:${MAC_MIRROR_PORT:-3847} 2>/dev/null || true)
if [ -n "$STALE_PIDS" ]; then
  warn "Killing stale processes on port ${MAC_MIRROR_PORT:-3847}..."
  echo "$STALE_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Also kill any leftover daemon processes
pkill -f "tsx src/daemon" 2>/dev/null || true
pkill -f "tsx src/server" 2>/dev/null || true
sleep 1

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
log "Local:   http://localhost:$PORT"
if [ -n "$TAILSCALE_IP" ]; then
  log "Remote:  http://$TAILSCALE_IP:$PORT"
fi
log "Health:  http://localhost:$PORT/health"
echo ""
log "Press Ctrl+C to stop."

wait
