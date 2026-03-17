/** Mac Mirror — Relay Server entry point.
 *
 * Receives binary JPEG frames from the capture daemon over WebSocket
 * and broadcasts them to all connected browser clients. Routes JSON
 * input commands from clients back to the daemon.
 */

import express from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { PORT, STATUS_INTERVAL } from "./config.js";
import { logger } from "./logger.js";
import {
  setDaemon,
  removeDaemon,
  addClient,
  removeClient,
  broadcastFrame,
  broadcastJSON,
  sendToDaemon,
  buildStatusMessage,
  hasDaemon,
  clientCount,
  uptimeSeconds,
} from "./rooms.js";

// --- HTTP ---

const app = express();

// Quick WebSocket test page
app.get("/wstest", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    </head><body style="margin:0;background:#0a0a0a;overflow:hidden">
    <div id="status" style="position:fixed;top:0;left:0;right:0;height:28px;background:rgba(10,10,10,0.9);color:#ccc;font:12px monospace;display:flex;align-items:center;padding:0 8px;z-index:10"></div>
    <img id="screen" style="width:100%;height:100%;object-fit:contain;padding-top:28px;box-sizing:border-box">
    <script>
      const img = document.getElementById('screen');
      const status = document.getElementById('status');
      let prevUrl = null;
      const url = 'ws://' + location.host + '/client';
      status.textContent = 'Connecting to ' + url + '...';
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => { status.textContent = 'Connected'; status.style.color = '#22c55e'; };
      ws.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) {
          const blob = new Blob([e.data], {type:'image/jpeg'});
          const u = URL.createObjectURL(blob);
          img.src = u;
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          prevUrl = u;
        } else {
          try {
            const m = JSON.parse(e.data);
            if (m.type === 'status') status.textContent = (m.daemonConnected ? '● ' : '○ ') + m.fps + ' FPS · ' + m.clientCount + ' clients · ' + m.latencyMs + 'ms';
          } catch {}
        }
      };
      ws.onerror = () => { status.textContent = 'Error'; status.style.color = '#ef4444'; };
      ws.onclose = () => { status.textContent = 'Disconnected'; status.style.color = '#ef4444'; };
    </script></body></html>`);
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    daemonConnected: hasDaemon(),
    clientCount: clientCount(),
    uptimeSeconds: uptimeSeconds(),
  });
});

// Serve built client if dist/ exists
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = resolve(__dirname, "..", "client", "dist");
if (existsSync(clientDist)) {
  // No caching during dev — ensures fresh builds are always served
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    next();
  });
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for all non-API routes
  app.get("/{*path}", (_req, res) => {
    res.sendFile(resolve(clientDist, "index.html"));
  });
  logger.info("Serving client from dist/", { path: clientDist });
}

const httpServer = createServer(app);

// --- WebSocket ---

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (pathname === "/daemon" || pathname === "/client") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, pathname);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws: WebSocket, _req: unknown, pathname: string) => {
  if (pathname === "/daemon") {
    handleDaemon(ws);
  } else if (pathname === "/client") {
    handleClient(ws);
  }
});

// --- Daemon handler ---

function handleDaemon(ws: WebSocket): void {
  if (!setDaemon(ws)) {
    logger.warn("Daemon connection rejected — slot occupied");
    ws.close(4000, "Daemon slot occupied");
    return;
  }

  logger.info("Daemon connected");

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      // Binary frame — relay to all clients
      broadcastFrame(data as Buffer);
    } else {
      // JSON message from daemon (future: acks, errors)
      logger.debug("Daemon JSON message", { data: String(data) });
    }
  });

  ws.on("close", () => {
    logger.info("Daemon disconnected");
    removeDaemon(ws);
  });

  ws.on("error", (err) => {
    logger.error("Daemon socket error", { error: String(err) });
  });
}

// --- Client handler ---

function handleClient(ws: WebSocket): void {
  addClient(ws);

  // Send current status immediately
  ws.send(JSON.stringify(buildStatusMessage()));

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(String(raw)) as Record<string, unknown>;
      const type = msg["type"] as string | undefined;

      if (type?.startsWith("input:")) {
        // Route input commands to daemon
        sendToDaemon(String(raw));
      } else {
        logger.debug("Unknown client message", { type });
      }
    } catch {
      logger.warn("Malformed client message");
    }
  });

  ws.on("close", () => {
    removeClient(ws);
  });

  ws.on("error", (err) => {
    logger.error("Client socket error", { error: String(err) });
  });
}

// --- Status broadcast ---

const statusTimer = setInterval(() => {
  broadcastJSON(buildStatusMessage());
}, STATUS_INTERVAL);

// --- Start ---

httpServer.listen(PORT, "0.0.0.0", () => {
  logger.info("Relay server listening", { port: PORT, host: "0.0.0.0" });
});

// --- Graceful shutdown ---

function shutdown(): void {
  logger.info("Shutting down...");
  clearInterval(statusTimer);
  wss.close();
  httpServer.close(() => {
    logger.info("Server stopped");
    process.exit(0);
  });
  // Force exit after 5s
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
