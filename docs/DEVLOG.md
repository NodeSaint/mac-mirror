# MAC MIRROR — DEVLOG.md

> **PURPOSE:** Reverse-chronological development log. Records what was done, why, and any notable findings. Most recent entry first.

---

## 2026-03-17 — Phase 1: Capture Daemon

### What Was Done
- Set up Node.js project with TypeScript (package.json, tsconfig.json, deps)
- Created `config.json` — central config for capture settings (fps, quality, scale, port)
- Built `src/daemon/config.ts` — loads config.json + env var overrides
- Built `src/daemon/capture.ts` — screen capture using macOS `screencapture` CLI
  - Captures to temp JPEG, reads buffer, cleans up
  - Post-processes with `sips` for quality/scale control
  - Clear permission warning if Screen Recording not granted
- Built `src/daemon/index.ts` — daemon entry point with two modes:
  - `--stdout` mode for testing capture without a server
  - WebSocket mode for streaming to relay server
  - Auto-reconnect with exponential backoff (1s → 30s max)
  - Structured JSON logging, graceful SIGINT/SIGTERM handling
  - Frame stats logged every N frames (size, latency, actual FPS)

### Notes
- `screencapture` requires Screen Recording permission in System Settings > Privacy & Security
- Without permission it fails with "could not create image from display" — daemon handles this gracefully with a clear instruction message
- `sips` (built into macOS) handles JPEG quality and resize — no npm native addons needed
- At 0.5 scale, frames should be ~30-60KB JPEG depending on screen content

---

## 2026-03-17 — Reference Analysis + Project Scaffold

### What Was Done
- Created project documentation: PRIMER.md, DEVLOG.md, TODO.md, .gitignore, README.md
- Read every source file in the reference codebase (`~/reference/desk-mirror`)

### Reference Codebase Findings

**Architecture:** Three-tier — Python daemon → Node.js relay server → React PWA. All communication via WebSocket with JSON messages. The daemon polls macOS window positions every 300ms using `CGWindowListCopyWindowInfo` (Quartz framework) and sends layout diffs. The relay server stores state and broadcasts to phone clients. The client renders windows as coloured blocks with touch interactions.

**What's clever:**
- Delta updates: first message is `layout:full`, subsequent messages are `layout:diff` (only adds/removes/moves). Saves bandwidth.
- 5px movement threshold in the differ — ignores jitter.
- Accessibility API fallback: daemon continues in degraded mode if permissions not granted. Non-fatal.
- `AXUIElementGetWindow` is a private API — the code falls back to matching by PID if unavailable.
- z-index tracking from `CGWindowListCopyWindowInfo`'s front-to-back ordering.
- Single config.json at repo root read by all three components.
- Start script detects Tailscale IP from network interfaces, prints QR code.

**What's limiting for our use case:**
- Only streams metadata (positions/sizes), not actual screen content.
- Python daemon requires pyobjc installation which can be fragile.
- Window-level commands (focus/move/close) rather than raw input (click/type).
- Can't be used for actual remote work — just a layout overview.

**Key technical details for our build:**
- macOS `screencapture -x -C -t jpg` captures screen silently as JPEG — no shutter sound, includes cursor.
- `cliclick` can inject mouse clicks (`c:x,y`), moves (`m:x,y`), key presses (`kp:key`), and typing (`t:text`).
- The relay server pattern (Express + ws, `/daemon` + `/client` paths, rooms/state split) is solid and maps directly to our needs.
- Client auto-reconnect with exponential backoff (1s → 2s → 4s → ... → 30s max) is battle-tested in the reference.

### Decisions Made
1. **MJPEG over WebSocket** — simplest path that works on Tailscale. No STUN/TURN needed.
2. **All TypeScript** — unified codebase, matching CLAUDE.md preference.
3. **`screencapture` CLI** — zero deps, built into macOS.
4. **`cliclick`** — simple input injection, Homebrew install.
5. **Server as dumb relay** — binary frames pass through, only JSON input commands are parsed.
