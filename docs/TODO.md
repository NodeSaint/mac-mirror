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

### Phase 1 — Screen Capture Daemon
> Get frames off the screen and into a WebSocket pipe.

- [ ] Set up Node.js project (package.json, tsconfig.json) at repo root
- [ ] Create `config.json` with capture settings (fps, quality, scale, port)
- [ ] Create `src/daemon/config.ts` — load config.json + env var overrides
- [ ] Create `src/daemon/capture.ts` — capture screen via `screencapture` CLI
  - [ ] Capture to temp file, read as buffer, clean up
  - [ ] Configurable FPS, JPEG quality, and scale factor
  - [ ] Measure and log capture latency per frame
- [ ] Create `src/daemon/index.ts` — entry point with capture loop + WebSocket client
  - [ ] Connect to relay server at `/daemon`
  - [ ] Send binary JPEG frames at configured FPS
  - [ ] Auto-reconnect with exponential backoff
  - [ ] Graceful shutdown on SIGINT/SIGTERM
- [ ] Test: daemon runs, captures frames, logs output

### Phase 2 — Relay Server
> Receive frames from daemon, broadcast to browser clients, route input back.

- [ ] Create `src/server/index.ts` — Express + WebSocket server
  - [ ] `/daemon` path — single daemon connection, receives binary frames
  - [ ] `/client` path — multiple clients, receives JSON input commands
  - [ ] Relay binary frames daemon → all clients
  - [ ] Relay JSON input commands client → daemon
  - [ ] `/health` HTTP endpoint
- [ ] Create `src/server/rooms.ts` — connection management (from reference pattern)
  - [ ] Single daemon slot + client pool
  - [ ] Daemon disconnect notifies clients via status message
- [ ] Create `src/server/config.ts` — port + status interval config
- [ ] Create `src/server/logger.ts` — structured JSON logging
- [ ] Status broadcast every 5s (daemon connected, FPS, client count, latency)
- [ ] Test: server starts, accepts connections, relays frames

### Phase 3 — Browser Client (View Only)
> Display the screen stream in a browser. No input yet.

- [ ] Scaffold React + Vite + TypeScript client (`src/client/`)
- [ ] Create `src/client/src/hooks/useWebSocket.ts` — binary frame + JSON message handling
  - [ ] Receive binary frames, convert to object URL for `<img>` rendering
  - [ ] Receive JSON status messages
  - [ ] Auto-reconnect with exponential backoff
- [ ] Create `src/client/src/components/ScreenView.tsx` — frame renderer
  - [ ] Display latest frame in `<img>` element (fastest) or `<canvas>`
  - [ ] Responsive scaling to fit viewport
  - [ ] Maintain aspect ratio
- [ ] Create `src/client/src/components/StatusBar.tsx` — connection state, FPS, latency
- [ ] Create `src/client/src/components/Settings.tsx` — server URL config, localStorage
- [ ] Create `src/client/src/App.tsx` — root component, routing
- [ ] Dark theme (#0a0a0a), mobile-first, system fonts
- [ ] Test: browser connects, displays live screen capture

### Phase 4 — Remote Input
> Send mouse and keyboard events from browser back to Mac.

- [ ] Create `src/daemon/input.ts` — mouse/keyboard injection via cliclick
  - [ ] Mouse: click, right-click, double-click, move, drag
  - [ ] Keyboard: key press, key combo (modifiers), text input
  - [ ] Scroll: vertical and horizontal
- [ ] Define input protocol (JSON messages, client → server → daemon)
  - [ ] `input:mouse` — x, y, button, action (click/down/up/move)
  - [ ] `input:scroll` — x, y, deltaX, deltaY
  - [ ] `input:key` — key, modifiers[], action (down/up)
  - [ ] `input:text` — raw text string
- [ ] Wire input messages through relay server to daemon
- [ ] Create `src/client/src/hooks/useInput.ts` — touch/mouse event capture
  - [ ] Map viewport coordinates to Mac screen coordinates
  - [ ] Single tap → left click
  - [ ] Two-finger tap → right click
  - [ ] Touch drag → mouse move/drag
- [ ] Create `src/client/src/components/TouchOverlay.tsx` — transparent input layer
- [ ] Virtual keyboard toggle for text input
- [ ] Test: tap on phone triggers click on Mac, typing works

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
