# Mac Mirror

**Your Mac screen, live on any device.**

Mac Mirror captures your Mac's display in real time and streams it to any browser on your Tailscale network. See your screen and control your Mac from your phone, tablet, or another laptop — fully private, zero cloud.

---

## What It Does

- **Real-time screen streaming** — your Mac's display as live JPEG frames at ~3-4 FPS
- **Full remote control** — tap to click, drag to move windows, type with virtual keyboard
- **Touch gestures** — single tap (click), double-tap (double-click), two-finger tap (right-click), drag (move/resize windows)
- **Works on any device** — phone, tablet, laptop — anything with a browser
- **Secure by default** — runs entirely on your Tailscale mesh, no cloud, no accounts, no exposure
- **Single port** — everything runs on port 3847 (server, viewer, WebSocket)

---

## What You Need

- **macOS** — the machine being mirrored
- **Node.js 20+** — check with `node --version`
- **Tailscale** — installed and connected on both your Mac and viewing device
- **cliclick** — for remote input — `brew install cliclick`

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/NodeSaint/mac-mirror.git
cd mac-mirror

# 2. Install dependencies
npm install

# 3. Start everything (server + daemon)
./start-prod.sh
```

The terminal will print your Tailscale IP. On your phone/tablet, open:

```
http://<your-tailscale-ip>:3847
```

That's it. You should see your Mac screen with a status bar showing FPS and latency.

---

## Controls

| Gesture | Action |
|---------|--------|
| **Tap** | Left click |
| **Double-tap** | Double-click |
| **Two-finger tap** | Right-click |
| **Touch and drag** | Drag (move windows, select text, etc.) |
| **Keyboard icon** (top right) | Toggle virtual keyboard for typing |

Keys typed in the virtual keyboard are sent directly to your Mac, including modifier combos (Cmd, Alt, Ctrl, Shift).

---

## Configuration

Edit `config.json` in the project root:

```json
{
  "port": 3847,
  "capture": {
    "fps": 10,
    "quality": 60,
    "scale": 0.5
  },
  "input": {
    "enabled": true
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `port` | 3847 | Server port (HTTP + WebSocket) |
| `capture.fps` | 10 | Target frames per second (actual will depend on machine) |
| `capture.quality` | 60 | JPEG quality (1-100, lower = smaller frames, faster) |
| `capture.scale` | 0.5 | Resolution scale (0.5 = half resolution, good for mobile) |
| `input.enabled` | true | Set to false to disable remote input (view only) |

Environment variable overrides: `MAC_MIRROR_PORT`, `MAC_MIRROR_HOST`, `MAC_MIRROR_FPS`, `MAC_MIRROR_QUALITY`, `MAC_MIRROR_SCALE`.

---

## Architecture

```
Mac (daemon)  ──binary JPEG frames──>  Relay Server  ──frames──>  Browser
                                            │
              <──JSON input commands──      │      <──touch/keyboard──
```

- **Daemon** (`src/daemon/`) — captures screen via macOS `screencapture`, injects input via `cliclick`
- **Server** (`src/server/`) — Express + WebSocket relay on port 3847, serves the viewer page
- **Viewer** (`src/viewer/`) — standalone HTML/JS page with touch input handling

All traffic stays on your Tailscale network. Screen frames are binary JPEG over WebSocket (~150-250KB each). Input events are small JSON messages routed back through the server to the daemon.

---

## Troubleshooting

### Screen Recording permission

The daemon needs Screen Recording permission to capture your display. If you see a permission error:

1. Open **System Settings > Privacy & Security > Screen Recording**
2. Enable your terminal app (Terminal, iTerm2, VS Code, etc.)
3. Restart the terminal and try again

### "Cannot GET /" or blank page

You're probably hitting an old cached version. Hard-refresh the page or open in an incognito/private tab.

### Daemon connect/disconnect loop

This happens when multiple daemon processes are competing for the single daemon slot. Fix:

```bash
# Kill all stale processes
pkill -f "tsx src/daemon"
pkill -f "tsx src/server"
lsof -ti:3847 | xargs kill -9

# Then start fresh
./start-prod.sh
```

The start scripts now do this automatically, but if you started processes manually (e.g. `npm run server` and `npm run daemon` separately), orphan processes can linger.

### Phone shows "Connecting..." or "Disconnected"

1. **Check Tailscale** — make sure it's connected on both devices. Run `tailscale status` on your Mac.
2. **Check the URL** — use your Mac's Tailscale IP (starts with `100.`), not your local network IP. Find it with `tailscale ip -4`.
3. **Check the server** — visit `http://<tailscale-ip>:3847/health` in your phone's browser. You should see a JSON response.
4. **Firewall** — macOS firewall must allow Node.js. Check System Settings > Network > Firewall > Options.

### cliclick not found

Remote input (click, type, drag) requires cliclick:

```bash
brew install cliclick
```

Without it, the viewer will display your screen but taps/keyboard won't do anything.

### Low FPS or laggy

- Lower the quality: set `capture.quality` to 40 in `config.json`
- Lower the scale: set `capture.scale` to 0.25
- The `screencapture` CLI approach tops out around 3-5 FPS — this is a known limitation

### Phone disconnects when screen locks

This is normal. The browser suspends WebSocket connections when the phone screen locks. The viewer will auto-reconnect when you unlock.

---

## Scripts

| Script | Description |
|--------|-------------|
| `./start-prod.sh` | Production launcher — builds client, starts server + daemon, shows URLs |
| `./start.sh` | Dev launcher — same but also starts Vite dev server |
| `npm run server` | Start relay server only |
| `npm run daemon` | Start capture daemon only |

---

## Tech Stack

| Component | Tech |
|-----------|------|
| Capture daemon | Node.js, TypeScript, macOS `screencapture` + `sips` |
| Relay server | Node.js, Express 5, ws (WebSocket) |
| Viewer | Vanilla HTML/JS (258 lines) |
| Input injection | cliclick (mouse/keyboard), osascript (scroll) |
| Networking | Tailscale |

---

## Licence

MIT
