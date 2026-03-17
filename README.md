# Mac Mirror

**Your Mac screen, live on any device.**

Mac Mirror captures your Mac's display in real time and streams it to any browser on your Tailscale network. See your screen and control your Mac from your phone, tablet, or another laptop — fully private, zero cloud.

---

## What It Does

- **Real-time screen capture** — streams your Mac's display as live video
- **Remote input** — tap, click, type, and scroll from the viewing device
- **Mobile-optimised** — pinch-to-zoom, touch-friendly, installable as a PWA
- **Secure by default** — runs entirely on your Tailscale network, no public exposure
- **Self-hosted** — everything runs on your Mac, nothing leaves your network

---

## What You Need

- **macOS** (the machine being mirrored)
- **Node.js 20+** — `node --version` to check
- **Tailscale** — installed on both your Mac and your viewing device
- **cliclick** (for remote input) — `brew install cliclick`

---

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd mac-mirror

# 2. Start Mac Mirror
./start.sh

# 3. Open the URL on your phone/tablet
#    (printed in the terminal output)
```

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
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `port` | 3847 | Server port |
| `capture.fps` | 10 | Frames per second |
| `capture.quality` | 60 | JPEG quality (1-100, lower = smaller) |
| `capture.scale` | 0.5 | Resolution scale (0.5 = half resolution) |

---

## Architecture

```
Mac (daemon) → Relay Server → Browser (any device)
     ↑              ↓
     └── input ─────┘
```

All communication over WebSocket on your Tailscale network. Screen frames flow as binary JPEG. Input events flow as JSON.

---

## Troubleshooting

**Screen recording permissions**
Mac Mirror needs screen recording permission. Go to System Settings > Privacy & Security > Screen Recording and add your terminal app.

**cliclick not found**
Install with Homebrew: `brew install cliclick`

**Phone shows "Connecting..."**
Check that Tailscale is active on both devices and the URL matches what the terminal printed.

---

## Tech Stack

| Component | Tech |
|-----------|------|
| Capture daemon | Node.js, TypeScript |
| Relay server | Node.js, Express, ws |
| Browser client | React 18, Vite, TypeScript |
| Screen capture | macOS `screencapture` |
| Input injection | cliclick |
| Networking | Tailscale |

---

## Licence

MIT
