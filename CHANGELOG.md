# Changelog

All notable changes to Mac Mirror.

---

## [1.0.0] — 2026-03-17

First release. Full remote desktop over Tailscale.

### Added

- **Capture daemon** — streams Mac screen as JPEG frames via `screencapture` + `sips`
  - Configurable FPS, quality, and scale in `config.json`
  - Auto-reconnect with exponential backoff (1s → 30s)
  - `--stdout` mode for testing without a server
  - Graceful shutdown on SIGINT/SIGTERM

- **Relay server** — Express 5 + ws on port 3847
  - `/daemon` WebSocket path — single daemon connection, receives binary frames
  - `/client` WebSocket path — multiple viewer connections, receives JSON input
  - `/health` HTTP endpoint — daemon status, client count, uptime
  - Status broadcast every 5s (FPS, latency, client count)
  - Serves viewer HTML at `/` — single port for everything
  - Race-safe daemon slot management

- **Viewer** — standalone HTML/JS page (258 lines)
  - Live screen display with responsive scaling
  - Touch input: tap (click), double-tap (double-click), two-finger tap (right-click)
  - Touch drag for moving/resizing windows
  - Virtual keyboard with modifier key support (Cmd, Alt, Ctrl, Shift)
  - Haptic feedback on interactions
  - Auto-reconnect on disconnect (phone lock/unlock)
  - Status bar with FPS, latency, connection state

- **Remote input** — daemon-side injection
  - Mouse: click, right-click, double-click, move, drag (via cliclick)
  - Keyboard: key press with modifiers, text typing (via cliclick)
  - Scroll: vertical and horizontal (via osascript CGEvent)

- **Start scripts**
  - `start-prod.sh` — builds client, starts server + daemon, shows Tailscale URL
  - `start.sh` — dev mode with Vite dev server
  - Both scripts auto-kill stale processes before starting

- **React client** (built but not used as primary UI)
  - React 18 + Vite + TypeScript
  - useWebSocket, useInput, useZoom hooks
  - PWA manifest + service worker
  - Works on desktop but WebSocket fails on mobile Safari

### Known Issues

- React client WebSocket does not connect on mobile Safari (standalone viewer used instead)
- FPS ceiling of ~3-5 due to `screencapture` CLI disk I/O
- Multiple daemon instances cause connect/disconnect loop (mitigated by start scripts)
