# MAC MIRROR — PRIMER.md

> **PURPOSE:** Project memory between sessions. Read first, update last. Every session must leave this file accurate.

---

## Current State

| Field               | Value                        |
|---------------------|------------------------------|
| **Current Phase**   | Phase 2 — Relay server (complete) |
| **Last Session**    | Session 2                    |
| **Last Updated**    | 2026-03-17                   |
| **Blocker**         | None |
| **Next Action**     | Phase 3 — Browser client (view only) |

---

## Project Overview

**Mac Mirror** is a real-time screen-mirroring tool that captures a Mac's display and streams it to any device (phone, tablet, laptop) over Tailscale. Unlike the reference project (Desk Mirror), which streams window *metadata* as coloured blocks, Mac Mirror streams **actual screen pixels** with full **remote input control** — making it a lightweight, self-hosted VNC alternative.

---

## Architecture

```
┌──────────────────┐    WebSocket     ┌──────────────────┐    WebSocket     ┌──────────────────┐
│  CAPTURE DAEMON   │ ──────────────→ │   RELAY SERVER    │ ←─────────────→ │   BROWSER CLIENT  │
│  (Node.js)        │ ←────────────── │   (Node.js)       │                 │   (React PWA)     │
│                   │   input cmds    │                   │                 │                   │
│ • Screen capture  │                 │ • Relay frames    │                 │ • Render frames   │
│ • Input injection │                 │ • Route input     │                 │ • Capture input   │
│ • JPEG encoding   │                 │ • Health/status   │                 │ • Pinch-to-zoom   │
└──────────────────┘                  └──────────────────┘                  └──────────────────┘
                                              │
                                    All on Tailscale network
```

### How It Differs from Desk Mirror (Reference)

| Aspect | Desk Mirror (Reference) | Mac Mirror (This Project) |
|--------|------------------------|---------------------------|
| **What's streamed** | Window metadata (positions, sizes) as JSON | Actual screen pixels as JPEG frames |
| **Visual output** | Coloured blocks representing windows | Real screen content |
| **Remote input** | Focus/move/close/space-switch commands | Full mouse + keyboard control |
| **Daemon language** | Python (pyobjc) | Node.js/TypeScript |
| **Streaming protocol** | JSON over WebSocket (~1KB/msg) | Binary JPEG over WebSocket (~30-100KB/frame) |
| **Use case** | Window arrangement overview | Full remote desktop |

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Capture Daemon | Node.js 20+, TypeScript | Unified codebase, CLAUDE.md preference |
| Screen Capture | macOS `screencapture` CLI | Zero native deps, reliable, built-in |
| Relay Server | Node.js 20+, Express, ws | Lightweight WebSocket relay (same as reference) |
| Browser Client | React 18, Vite, TypeScript | PWA-capable, touch events, fast dev cycle |
| Input Injection | `cliclick` (Homebrew) | Simple CLI tool for mouse/keyboard events |
| Networking | Tailscale | Zero-config secure mesh, network IS the auth |

---

## Key Decisions

| # | Decision | Reasoning | Date |
|---|----------|-----------|------|
| 1 | MJPEG over WebSocket, not WebRTC | Tailscale provides direct connectivity — no NAT traversal needed. WebSocket is simpler to implement, debug, and maintain. WebRTC can be added later if latency is insufficient. | 2026-03-17 |
| 2 | All Node.js/TypeScript (no Python daemon) | CLAUDE.md says "prefer Node.js/TypeScript". Unified codebase, single package manager. We lose pyobjc's Quartz bindings but gain simplicity. | 2026-03-17 |
| 3 | `screencapture` CLI for frame capture | Zero dependencies — built into macOS. Reliable. Outputs JPEG directly. ~10 FPS achievable. Can upgrade to `node-screenshots` later if needed. | 2026-03-17 |
| 4 | `cliclick` for input injection | Simple Homebrew package. Handles mouse clicks, moves, keyboard input. No native addon compilation. Can upgrade to CGEvent-based Swift helper later. | 2026-03-17 |
| 5 | Server is a dumb frame relay | Binary frames pass through unchanged — no decoding/re-encoding. Server only parses JSON input commands. Keeps server simple and CPU-light. | 2026-03-17 |
| 6 | British English throughout | User preference, matching reference project conventions. | 2026-03-17 |
| 7 | Tailscale-only networking | Same as reference. Network IS the auth layer. No login screens, no tokens. | 2026-03-17 |

---

## Reference Codebase Analysis

### What We're Borrowing

1. **Three-tier architecture** — daemon → relay server → browser client. Clean separation. WebSocket everywhere.
2. **Relay server pattern** — Express + ws, `/daemon` and `/client` paths, single daemon slot + client pool, connection management with rooms/state modules.
3. **Structured JSON logging** — same `logger.ts` pattern.
4. **Config approach** — `config.json` at repo root + env var overrides. Single source of truth.
5. **Client patterns** — React hooks architecture (`useWebSocket`, `useLayout`), auto-reconnect with exponential backoff, Settings screen with localStorage, PWA service worker, dark theme, mobile-first.
6. **Status broadcasting** — periodic status messages with connection state and latency.
7. **Start scripts** — pre-flight checks, dependency install, Tailscale IP detection, process management with signal handling.

### What We're Changing

1. **Binary frames instead of JSON layout** — daemon sends JPEG buffers, not JSON window objects. Server relays as binary WebSocket messages.
2. **Input protocol is different** — instead of window-level commands (focus, move, close), we send raw mouse/keyboard events (click at x,y; key press; scroll).
3. **No diffing logic** — every frame is a full screenshot. No `differ.py` equivalent needed.
4. **No window metadata** — no `WindowData`, `LayoutDiff`, etc. Just frames.
5. **Canvas rendering** — client renders frames onto an `<img>` or `<canvas>`, not positioned `<div>` blocks.
6. **Pinch-to-zoom** — client needs gesture handling for zoom/pan, since we're viewing real screen content.
7. **Virtual keyboard** — client needs a way to trigger keyboard input.

### Limitations of the Reference Approach

- Desk Mirror only shows window positions, not content — useful as a minimap but not for actual remote work.
- Python daemon requires pyobjc, which is macOS-only and can be finicky to install.
- JSON-only protocol doesn't support binary data efficiently.
- No screen content means no ability to read text or see application state remotely.

---

## Directory Structure

```
mac-mirror/
├── CLAUDE.md              ← Project goals and preferences
├── docs/
│   ├── PRIMER.md          ← This file — project memory
│   ├── DEVLOG.md          ← Reverse-chronological dev log
│   ├── TODO.md            ← Task tracker
│   └── PROTOCOL.md        ← WebSocket protocol spec (future)
├── config.json            ← Central configuration
├── package.json           ← Monorepo root
├── .gitignore
├── README.md              ← Public-facing documentation
├── start.sh               ← Dev launcher
├── start-prod.sh          ← Production launcher
├── src/
│   ├── daemon/            ← Screen capture + input injection
│   │   ├── index.ts       ← Entry point — capture loop + WS client
│   │   ├── capture.ts     ← Screen capture via screencapture CLI
│   │   ├── input.ts       ← Mouse/keyboard injection via cliclick
│   │   └── config.ts      ← Daemon config loader
│   ├── server/            ← WebSocket relay
│   │   ├── index.ts       ← Express + WS server
│   │   ├── rooms.ts       ← Connection management
│   │   ├── config.ts      ← Server config loader
│   │   └── logger.ts      ← Structured JSON logging
│   └── client/            ← React PWA
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── public/
│       │   ├── manifest.json
│       │   └── sw.js
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/
│           │   ├── ScreenView.tsx    ← Frame renderer (canvas/img)
│           │   ├── TouchOverlay.tsx  ← Input capture layer
│           │   ├── StatusBar.tsx     ← Connection status
│           │   └── Settings.tsx      ← Server URL config
│           ├── hooks/
│           │   ├── useWebSocket.ts   ← WS connection + binary frames
│           │   ├── useInput.ts       ← Touch/mouse → input commands
│           │   └── useZoom.ts        ← Pinch-to-zoom gestures
│           └── lib/
│               └── protocol.ts       ← Message type definitions
```

---

## What Has Been Built

- Project scaffold (docs, .gitignore, README placeholder)
- Reference codebase analysis complete
- **Capture Daemon** (`src/daemon/`) — Node.js daemon that captures macOS screen via `screencapture` CLI, post-processes with `sips` for quality/scale control, streams binary JPEG frames over WebSocket. Two modes: `--stdout` for testing, WebSocket for server connection. Auto-reconnect, graceful shutdown, structured logging.
- **Relay Server** (`src/server/`) — Express + ws server on port 3847. `/daemon` path accepts single daemon connection (binary JPEG frames), `/client` path accepts multiple browser clients (JSON input commands). Relays frames daemon → clients, routes input clients → daemon. `/health` HTTP endpoint. Status broadcast every 5s with FPS, latency, client count. Graceful shutdown.

---

## What Works

- `npm run daemon -- --stdout` — runs capture loop, logs frame stats (requires Screen Recording permission)
- `npm run daemon` — connects to relay server at configured host:port, streams binary frames
- `npm run server` — starts relay server on port 3847, `/health` endpoint responds
- TypeScript strict mode, clean compile
- Config loading from config.json + env var overrides
- Graceful permission error handling with clear user instructions

---

## What's Broken

_N/A_

---

## Environment Notes

- **Host machine:** macOS (primary target)
- **Viewing devices:** iPhone, iPad, laptop browser (any device on Tailscale)
- **Network:** Tailscale mesh
- **Node version:** 20+
- **Required tools:** `screencapture` (built-in), `cliclick` (Homebrew)

---

## Session Log

> Most recent at the top.

### Session 2 — Phase 2: Relay Server
- **Date:** 2026-03-17
- **What happened:** Built relay server with 4 files: logger.ts (structured JSON logging), config.ts (port + status interval from config.json + env vars), rooms.ts (single daemon slot, client pool, frame broadcast, FPS tracking, status messages), index.ts (Express + ws, /daemon and /client WebSocket paths, /health HTTP endpoint, input routing, graceful shutdown). TypeScript compiles clean. Smoke tested: server starts, /health responds, shuts down cleanly.
- **What's next:** Phase 3 — browser client (React + Vite, view only).
- **Blockers:** None.

### Session 1 — Phase 1: Capture Daemon
- **Date:** 2026-03-17
- **What happened:** Set up Node.js project (package.json, tsconfig.json, deps: ws, express, tsx, typescript). Created config.json. Built capture daemon with three files: config.ts (config loading), capture.ts (screen capture via screencapture + sips), index.ts (entry point with stdout/WebSocket modes). Added permission warning for Screen Recording. TypeScript compiles clean. Daemon runs but screencapture requires Screen Recording permission to actually capture frames.
- **What's next:** Phase 2 — build relay server to receive frames and serve to clients.
- **Blockers:** Screen Recording permission needed at runtime (expected, not a code issue).

### Session 0 — Project Scaffold + Reference Analysis
- **Date:** 2026-03-17
- **What happened:** Created project documentation (PRIMER.md, DEVLOG.md, TODO.md, .gitignore, README.md). Read every file in the reference codebase (~/reference/desk-mirror) — CLAUDE.md, PRIMER.md, AGENTS.md, SPRINTS.md, GITHUB.md, README.md, config.json, PROTOCOL.md, all daemon source (main.py, macos.py, commands.py, differ.py, models.py, config.py), all server source (index.ts, rooms.ts, state.ts, types.ts, logger.ts, config.ts), all client source (App.tsx, DesktopCanvas.tsx, WindowBlock.tsx, useWebSocket.ts, useDrag.ts, useLayout.ts), and start scripts. Documented architecture differences, what to borrow vs change, and key decisions.
- **What's next:** Phase 1 — build the screen capture daemon (capture.ts, config.ts, index.ts).
- **Blockers:** None.
