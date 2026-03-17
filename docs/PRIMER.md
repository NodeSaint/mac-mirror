# MAC MIRROR — PRIMER.md

> **PURPOSE:** Project memory between sessions. Read this first.

---

## Current State

| Field               | Value                        |
|---------------------|------------------------------|
| **Version**         | 1.0                          |
| **Status**          | Working MVP                  |
| **Last Updated**    | 2026-03-17                   |
| **Blocker**         | React client broken on mobile Safari (standalone viewer used instead) |

---

## What Works

- `./start-prod.sh` launches everything (server + daemon on port 3847)
- Viewer at `http://<tailscale-ip>:3847` shows live Mac screen
- Touch input: tap, double-tap, two-finger right-click, drag
- Virtual keyboard for typing
- Auto-reconnect on phone lock/unlock
- ~3-4 FPS at 0.5x scale, ~150-250KB per frame

## What Doesn't

- React client (`src/client/`) — WebSocket connects on desktop but not mobile Safari. Unknown cause. The standalone viewer (`src/viewer/index.html`) is the workaround and primary UI.
- FPS is capped at ~3-5 due to `screencapture` CLI writing to disk per frame.

---

## Architecture

```
Daemon (capture + input)  →  Server (relay, port 3847)  →  Viewer (browser)
       ↑                            ↓
       └──── JSON input commands ───┘
```

- **Daemon** — `src/daemon/` — captures screen via `screencapture` + `sips`, injects input via `cliclick`
- **Server** — `src/server/` — Express 5 + ws relay, serves viewer HTML at `/`
- **Viewer** — `src/viewer/index.html` — 258-line standalone page with full touch input

Single port (3847) for HTTP, WebSocket, and the viewer page.

---

## Key Config

`config.json` at project root:

| Setting | Default | Notes |
|---------|---------|-------|
| `port` | 3847 | Server port |
| `capture.fps` | 10 | Target FPS (actual ~3-5) |
| `capture.quality` | 60 | JPEG quality 1-100 |
| `capture.scale` | 0.5 | Resolution scale |
| `input.enabled` | true | Remote input on/off |

Env overrides: `MAC_MIRROR_PORT`, `MAC_MIRROR_FPS`, `MAC_MIRROR_QUALITY`, `MAC_MIRROR_SCALE`.

---

## Stretch Goals

- WebRTC upgrade for lower latency
- Multi-monitor support
- Adaptive quality based on connection speed
- Clipboard sync between devices
- Hotkey bar (Cmd+Tab, Cmd+Space shortcuts)
- Audio streaming
- Wake-on-LAN
