# MAC MIRROR — PRIMER.md

> **PURPOSE:** Project memory between sessions. Read first, update last. Every session must leave this file accurate.

---

## Current State

| Field               | Value                        |
|---------------------|------------------------------|
| **Current Phase**   | MVP complete — all 5 phases done |
| **Last Session**    | Session 3                    |
| **Last Updated**    | 2026-03-17                   |
| **Blocker**         | React client WebSocket fails on mobile Safari (see Known Issues) |
| **Next Action**     | Stretch goals or React debugging |

---

## Project Overview

**Mac Mirror** is a real-time screen-mirroring tool that captures a Mac's display and streams it to any device (phone, tablet, laptop) over Tailscale. Streams **actual screen pixels** with full **remote input control** — a lightweight, self-hosted VNC alternative.

---

## Architecture

```
┌──────────────────┐    WebSocket     ┌──────────────────┐    WebSocket     ┌──────────────────┐
│  CAPTURE DAEMON   │ ──────────────→ │   RELAY SERVER    │ ←─────────────→ │     VIEWER        │
│  (Node.js)        │ ←────────────── │   (Node.js)       │                 │  (plain HTML/JS)  │
│                   │   input cmds    │                   │                 │                   │
│ • Screen capture  │                 │ • Relay frames    │                 │ • Render frames   │
│ • Input injection │                 │ • Route input     │                 │ • Touch → click   │
│ • JPEG encoding   │                 │ • Serve viewer    │                 │ • Virtual keyboard│
└──────────────────┘                  └──────────────────┘                  └──────────────────┘
                                              │
                                    All on Tailscale network
                                    Single port: 3847
```

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Capture Daemon | Node.js 20+, TypeScript | Unified codebase |
| Screen Capture | macOS `screencapture` + `sips` | Zero native deps, built-in |
| Relay Server | Node.js 20+, Express 5, ws | Lightweight WebSocket relay |
| Viewer | Vanilla HTML/JS (258 lines) | Reliable on mobile Safari (React version has WebSocket issues) |
| Input Injection | `cliclick` (mouse/keyboard), `osascript` (scroll) | Simple CLI tools, no native addons |
| Networking | Tailscale | Zero-config secure mesh, network IS the auth |

---

## Key Decisions

| # | Decision | Reasoning | Date |
|---|----------|-----------|------|
| 1 | MJPEG over WebSocket, not WebRTC | Tailscale provides direct connectivity. WebSocket is simpler. | 2026-03-17 |
| 2 | All Node.js/TypeScript | Unified codebase, single package manager. | 2026-03-17 |
| 3 | `screencapture` CLI for frame capture | Zero deps, built into macOS. ~3-5 FPS achievable. | 2026-03-17 |
| 4 | `cliclick` for input injection | Simple Homebrew package. No native compilation. | 2026-03-17 |
| 5 | Server is a dumb frame relay | Binary frames pass through unchanged. Keeps server CPU-light. | 2026-03-17 |
| 6 | Plain HTML viewer instead of React | React WebSocket hook fails on mobile Safari (unknown cause). Inline HTML/JS viewer connects reliably. | 2026-03-17 |
| 7 | Single port (3847) for everything | Server serves viewer HTML at `/`, WebSocket at `/client` and `/daemon`, health at `/health`. No separate Vite port needed. | 2026-03-17 |
| 8 | Start scripts kill stale processes | Multiple daemon instances cause a connect/disconnect loop fighting for the single daemon slot. Scripts now pkill before starting. | 2026-03-17 |

---

## Directory Structure

```
mac-mirror/
├── config.json            ← FPS, quality, scale, port
├── package.json           ← Root deps (express, ws, tsx, typescript)
├── start.sh               ← Dev launcher (kills stale, starts all)
├── start-prod.sh          ← Prod launcher (builds client, starts all)
├── README.md              ← User-facing docs
├── docs/
│   ├── PRIMER.md          ← This file
│   ├── DEVLOG.md          ← Dev log
│   └── TODO.md            ← Task tracker
├── src/
│   ├── daemon/            ← Screen capture + input injection
│   │   ├── index.ts       ← Entry point — capture loop + WS client
│   │   ├── capture.ts     ← screencapture + sips pipeline
│   │   ├── input.ts       ← cliclick mouse/keyboard, osascript scroll
│   │   └── config.ts      ← Config loader
│   ├── server/            ← WebSocket relay + HTTP
│   │   ├── index.ts       ← Express + WS server, serves viewer at /
│   │   ├── rooms.ts       ← Daemon slot + client pool + broadcasting
│   │   ├── config.ts      ← Port + status interval
│   │   └── logger.ts      ← Structured JSON logging
│   ├── viewer/            ← The viewer that actually works on mobile
│   │   └── index.html     ← 258-line standalone viewer with full input
│   └── client/            ← React PWA (builds but WebSocket broken on mobile)
│       ├── package.json
│       ├── vite.config.ts
│       └── src/            ← App, hooks, components (useWebSocket, useInput, etc.)
```

---

## What Works

- `./start-prod.sh` — full production launch (build + server + daemon)
- `http://<tailscale-ip>:3847` — viewer with live screen + touch input
- Tap to click, double-tap, two-finger right-click, drag to move windows
- Virtual keyboard for typing (keyboard icon in status bar)
- `/health` endpoint returns JSON with daemon/client/uptime status
- Auto-reconnect on phone unlock
- ~3-4 FPS at 0.5x scale, ~150-250KB per frame
- 2,347 lines of code total

---

## Known Issues

### React client WebSocket fails on mobile Safari
The React app (`src/client/`) builds and works on desktop browsers but the WebSocket connection never establishes on mobile Safari. The exact same WebSocket URL works in a plain `<script>` tag (proven with the wstest page). Root cause unknown — possibly React StrictMode effect lifecycle, useEffect cleanup timing, or mobile Safari quirk. The standalone viewer (`src/viewer/index.html`) was built as a workaround and is now the primary UI.

### screencapture FPS ceiling
The `screencapture` CLI approach tops out at ~3-5 FPS due to disk I/O (capture to temp file, read, delete). Could be improved by switching to `node-screenshots` (native addon) or a Swift helper using `CGWindowListCreateImage`.

### Daemon connect/disconnect loop
Happens when multiple daemon processes compete for the single daemon slot. Fixed by: start scripts now kill stale processes before launching. Race condition in `removeDaemon` also fixed (checks WebSocket identity before clearing).

---

## Environment Notes

- **Host machine:** macOS (primary target)
- **Viewing devices:** iPhone, iPad, laptop browser (any device on Tailscale)
- **Network:** Tailscale mesh
- **Node version:** 20+ (tested on 24.10.0)
- **Required tools:** `screencapture` (built-in), `sips` (built-in), `cliclick` (Homebrew)

---

## Session Log

> Most recent at the top.

### Session 3 — End-to-end testing + fixes
- **Date:** 2026-03-17
- **What happened:** Tested on real iPhone over Tailscale. Discovered React WebSocket hook doesn't connect on mobile Safari (unknown cause). Built /wstest diagnostic page, confirmed WebSocket works with plain JS. Created standalone viewer (`src/viewer/index.html`, 258 lines) with full input support (tap, double-tap, right-click, drag, virtual keyboard, haptic feedback, auto-reconnect). Made server serve viewer at `/` on port 3847. Fixed daemon connect/disconnect loop caused by duplicate processes — added stale process cleanup to start scripts and race condition fix in removeDaemon. Server now binds to 0.0.0.0 explicitly. Comprehensive README rewrite. All pushed to GitHub.
- **What's next:** Stretch goals (WebRTC, multi-monitor, clipboard sync) or debug React mobile Safari issue.
- **Blockers:** None — MVP is working.

### Session 2 — Phases 2–5: Full build
- **Date:** 2026-03-17
- **What happened:** Built all remaining phases. Phase 2: relay server. Phase 3: React browser client. Phase 4: remote input (cliclick + touch mapping). Phase 5: pinch-to-zoom, PWA, haptic feedback, start scripts.
- **What's next:** End-to-end testing.
- **Blockers:** None.

### Session 1 — Phase 1: Capture Daemon
- **Date:** 2026-03-17
- **What happened:** Node.js project setup. Capture daemon with screencapture + sips pipeline, stdout and WebSocket modes, auto-reconnect.
- **What's next:** Phase 2 — relay server.
- **Blockers:** Screen Recording permission needed at runtime.

### Session 0 — Project Scaffold + Reference Analysis
- **Date:** 2026-03-17
- **What happened:** Created docs. Analysed entire reference codebase (desk-mirror). Documented architecture decisions.
- **What's next:** Phase 1 — capture daemon.
- **Blockers:** None.
