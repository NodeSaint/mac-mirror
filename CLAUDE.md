# Mac Mirror — CLAUDE.md

## What This Is

Real-time Mac screen mirroring over Tailscale. Daemon captures the screen, server relays frames, standalone HTML viewer displays + accepts touch input. Self-hosted VNC alternative.

## Stack

- **Language:** Node.js 20+, TypeScript (strict mode)
- **Server:** Express 5 + ws (WebSocket)
- **Viewer:** Vanilla HTML/JS served by the server at `/` (NOT the React client — see Known Issues)
- **Capture:** macOS `screencapture` CLI + `sips` for quality/scale
- **Input:** `cliclick` (mouse/keyboard), `osascript` (scroll via CGEvent)
- **Networking:** Tailscale only — no auth layer, network IS the auth

## Running

```bash
./start-prod.sh          # Production: build + start server + daemon
./start.sh               # Dev: same but with Vite dev server
npm run server           # Server only
npm run daemon           # Daemon only
npm run daemon -- --stdout  # Daemon test mode (no server)
```

Access at `http://<tailscale-ip>:3847`

## Project Structure

```
src/daemon/     — Screen capture + input injection (4 files, 593 lines)
src/server/     — WebSocket relay + HTTP (4 files, 350 lines)
src/viewer/     — Standalone viewer page (1 file, 258 lines) ← THE PRIMARY UI
src/client/     — React PWA (broken on mobile Safari, kept for reference)
config.json     — FPS, quality, scale, port
start-prod.sh   — Production launcher (kills stale processes, builds, starts)
```

## Key Files

- `src/viewer/index.html` — the viewer users actually see. Touch input, keyboard, auto-reconnect.
- `src/server/index.ts` — Express server, WebSocket upgrade handler, serves viewer at `/`
- `src/server/rooms.ts` — daemon slot (single), client pool, frame broadcasting
- `src/daemon/capture.ts` — screencapture + sips pipeline
- `src/daemon/input.ts` — cliclick dispatch for mouse/keyboard/scroll
- `src/daemon/index.ts` — capture loop + WebSocket client with reconnect

## Protocol

- **Daemon → Server:** binary JPEG frames over WebSocket at `/daemon`
- **Server → Clients:** same binary frames relayed to all WebSocket clients at `/client`
- **Clients → Server → Daemon:** JSON input messages (`input:mouse`, `input:scroll`, `input:key`, `input:text`)
- **Server → Clients:** JSON status every 5s (`type: "status"`, fps, latency, clientCount)

## Known Issues

1. **React client WebSocket broken on mobile Safari** — `src/client/` builds fine, works on desktop, but WebSocket never connects on iPhone. Root cause unknown. The standalone viewer (`src/viewer/`) was built as workaround and is the primary UI.
2. **FPS ceiling ~3-5** — `screencapture` writes to disk. Upgrade path: `node-screenshots` or Swift CGWindowListCreateImage helper.
3. **Multiple daemons = connect loop** — only one daemon can connect. Start scripts kill stale processes automatically.

## Conventions

- British English in docs and comments
- Structured JSON logging (level, ts, component, msg, ...data)
- Config: `config.json` at root + env var overrides (`MAC_MIRROR_*`)
- No native addons — CLI tools only (screencapture, sips, cliclick, osascript)
