# MAC MIRROR — TODO.md

> **PURPOSE:** Task tracker. Organised by build phase. Update status as work progresses.

---

## Legend

- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done
- `[!]` — Blocked

---

## In Progress

_Nothing currently in progress._

---

## Up Next

### Phase 5 — Mobile Polish + PWA

### Phase 5 — Mobile Polish + PWA
> Optimise for mobile viewing and make it feel native.

- [ ] Pinch-to-zoom with `useZoom.ts` hook
  - [ ] Two-finger pinch to zoom in/out
  - [ ] Pan when zoomed in
  - [ ] Double-tap to reset zoom
- [ ] PWA setup
  - [ ] `manifest.json` — standalone display, dark theme, app name
  - [ ] `sw.js` — cache app shell, show "Disconnected" when offline
  - [ ] Installable on iOS Safari
- [ ] Touch-friendly controls
  - [ ] Haptic feedback on interactions (navigator.vibrate)
  - [ ] Status bar with connection quality indicator
- [ ] Landscape + portrait support
- [ ] Create `start.sh` — dev launcher (pre-flight checks, dep install, Tailscale detection)
- [ ] Create `start-prod.sh` — production mode (build client, serve static)
- [ ] Test: end-to-end on real iPhone over Tailscale

---

## Done

### Phase 4 — Remote Input
- [x] Create `src/daemon/input.ts` — mouse/keyboard injection via cliclick
  - [x] Mouse: click, right-click, double-click, move, drag
  - [x] Keyboard: key press, key combo (modifiers), text input
  - [x] Scroll: vertical and horizontal (via osascript CGEvent)
- [x] Define input protocol (JSON messages, client → server → daemon)
  - [x] `input:mouse` — x, y, button, action (click/dblclick/move/dragstart/dragmove/dragend)
  - [x] `input:scroll` — x, y, deltaX, deltaY
  - [x] `input:key` — key, modifiers[], action
  - [x] `input:text` — raw text string
- [x] Wire input messages through relay server to daemon (already done in Phase 2)
- [x] Create `src/client/src/hooks/useInput.ts` — touch/mouse event capture
  - [x] Map viewport coordinates to Mac screen coordinates
  - [x] Single tap → left click
  - [x] Two-finger tap → right click
  - [x] Touch drag → mouse drag
  - [x] Double-tap detection
  - [x] Wheel events for desktop scroll
- [x] Create `src/client/src/components/TouchOverlay.tsx` — transparent input layer
- [x] Create `src/client/src/components/VirtualKeyboard.tsx` — keyboard toggle
- [x] TypeScript compiles clean (daemon + client), Vite build passes

### Phase 3 — Browser Client (View Only)
- [x] Scaffold React + Vite + TypeScript client (`src/client/`)
- [x] Create `src/client/src/hooks/useWebSocket.ts` — binary frame + JSON message handling
  - [x] Receive binary frames, convert to object URL for `<img>` rendering
  - [x] Receive JSON status messages
  - [x] Auto-reconnect with exponential backoff
- [x] Create `src/client/src/components/ScreenView.tsx` — frame renderer
  - [x] Display latest frame in `<img>` element
  - [x] Responsive scaling to fit viewport
  - [x] Maintain aspect ratio
- [x] Create `src/client/src/components/StatusBar.tsx` — connection state, FPS, latency
- [x] Create `src/client/src/components/Settings.tsx` — server URL config, localStorage
- [x] Create `src/client/src/App.tsx` — root component
- [x] Dark theme (#0a0a0a), mobile-first, system fonts
- [x] Test: TypeScript compiles clean, Vite build passes

### Phase 2 — Relay Server
- [x] Create `src/server/index.ts` — Express + WebSocket server
  - [x] `/daemon` path — single daemon connection, receives binary frames
  - [x] `/client` path — multiple clients, receives JSON input commands
  - [x] Relay binary frames daemon → all clients
  - [x] Relay JSON input commands client → daemon
  - [x] `/health` HTTP endpoint
- [x] Create `src/server/rooms.ts` — connection management (from reference pattern)
  - [x] Single daemon slot + client pool
  - [x] Daemon disconnect notifies clients via status message
- [x] Create `src/server/config.ts` — port + status interval config
- [x] Create `src/server/logger.ts` — structured JSON logging
- [x] Status broadcast every 5s (daemon connected, FPS, client count, latency)
- [x] Test: server starts, accepts connections, relays frames

### Phase 1 — Screen Capture Daemon
- [x] Set up Node.js project (package.json, tsconfig.json) at repo root
- [x] Create `config.json` with capture settings (fps, quality, scale, port)
- [x] Create `src/daemon/config.ts` — load config.json + env var overrides
- [x] Create `src/daemon/capture.ts` — capture screen via `screencapture` CLI
  - [x] Capture to temp file, read as buffer, clean up
  - [x] Configurable FPS, JPEG quality, and scale factor
  - [x] Measure and log capture latency per frame
  - [x] Permission warning with clear instructions if Screen Recording not granted
- [x] Create `src/daemon/index.ts` — entry point with capture loop + WebSocket client
  - [x] `--stdout` mode for testing without server
  - [x] WebSocket mode connecting to relay server at `/daemon`
  - [x] Send binary JPEG frames at configured FPS
  - [x] Auto-reconnect with exponential backoff (1s → 30s max)
  - [x] Graceful shutdown on SIGINT/SIGTERM
- [x] Post-processing via `sips` for quality/scale control
- [x] TypeScript strict, clean compile, structured JSON logging

### Phase 0 — Project Scaffold
- [x] Create project directory structure
- [x] Read and analyse reference codebase (`~/reference/desk-mirror`)
- [x] Document architecture decisions in PRIMER.md
- [x] Create docs/PRIMER.md — project overview and architecture
- [x] Create docs/DEVLOG.md — dev log with reference analysis
- [x] Create docs/TODO.md — task breakdown by phase
- [x] Create .gitignore for Node/TypeScript project
- [x] Create README.md with placeholder structure

---

## Stretch Goals (Post-MVP)

- [ ] WebRTC upgrade — lower latency, adaptive bitrate
- [ ] Multi-monitor support — select which display to stream
- [ ] Adaptive quality — lower resolution/FPS on slow connections
- [ ] Clipboard sync — copy/paste between devices
- [ ] File drag-and-drop — drag files from phone to Mac
- [ ] Audio streaming — stream Mac audio to browser
- [ ] Hotkey bar — configurable shortcut buttons (Cmd+Tab, Cmd+Space, etc.)
- [ ] Session recording — save screen recordings
- [ ] Wake-on-LAN — wake Mac from phone
