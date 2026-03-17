#!/usr/bin/env bash
# Mac Mirror — Dev launcher
# Starts relay server + capture daemon + Vite dev server.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[mac-mirror]${NC} $1"; }
warn() { echo -e "${YELLOW}[mac-mirror]${NC} $1"; }
err() { echo -e "${RED}[mac-mirror]${NC} $1" >&2; }

# --- Pre-flight checks ---

if ! command -v node &>/dev/null; then
  err "Node.js not found. Install Node.js 20+ and try again."
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.version.split('.')[0].slice(1))")
if [ "$NODE_MAJOR" -lt 20 ]; then
  err "Node.js $NODE_MAJOR found, but 20+ is required."
  exit 1
fi

if ! command -v cliclick &>/dev/null; then
  warn "cliclick not found — remote input will not work."
  warn "Install with: brew install cliclick"
fi

# --- Tailscale detection ---

TAILSCALE_IP=""
if command -v tailscale &>/dev/null; then
  TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || true)
fi

if [ -n "$TAILSCALE_IP" ]; then
  log "Tailscale IP: $TAILSCALE_IP"
else
  warn "Tailscale not detected — clients must connect via localhost."
fi

# --- Install dependencies ---

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  log "Installing root dependencies..."
  npm install
fi

if [ ! -d src/client/node_modules ]; then
  log "Installing client dependencies..."
  npm --prefix src/client install
fi

# --- Start processes ---

cleanup() {
  log "Stopping all processes..."
  kill $SERVER_PID $DAEMON_PID $CLIENT_PID 2>/dev/null || true
  wait 2>/dev/null || true
  log "Done."
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

log "Starting Vite dev server..."
npm run client &
CLIENT_PID=$!

echo ""
log "=== Mac Mirror is running ==="
log "Server:  http://localhost:$PORT/health"
log "Client:  http://localhost:5173"
if [ -n "$TAILSCALE_IP" ]; then
  log "Remote:  http://$TAILSCALE_IP:5173"
  log "Connect: ws://$TAILSCALE_IP:$PORT"
fi
echo ""
log "Press Ctrl+C to stop."

wait
