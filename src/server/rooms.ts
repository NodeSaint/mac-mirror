/** Connection management — single daemon slot + client pool. */

import WebSocket from "ws";
import { logger } from "./logger.js";

let daemon: WebSocket | null = null;
const clients = new Set<WebSocket>();
const startTime = Date.now();
let lastDaemonPing = 0;
let frameCount = 0;
let lastFpsReset = Date.now();
let fps = 0;

// --- Daemon ---

export function setDaemon(ws: WebSocket): boolean {
  if (daemon && daemon.readyState === WebSocket.OPEN) {
    return false; // slot occupied
  }
  daemon = ws;
  lastDaemonPing = Date.now();
  frameCount = 0;
  lastFpsReset = Date.now();
  fps = 0;
  return true;
}

export function removeDaemon(ws: WebSocket): void {
  // Only remove if this is still the active daemon (prevents race condition
  // where an old daemon's close handler nulls out a newer daemon's reference)
  if (daemon !== ws) return;
  daemon = null;
  broadcastJSON({
    type: "status",
    daemonConnected: false,
    clientCount: clients.size,
    fps: 0,
    latencyMs: 0,
    uptimeSeconds: uptimeSeconds(),
  });
}

export function hasDaemon(): boolean {
  return daemon !== null && daemon.readyState === WebSocket.OPEN;
}

export function sendToDaemon(data: string): void {
  if (daemon && daemon.readyState === WebSocket.OPEN) {
    daemon.send(data);
  }
}

// --- Clients ---

export function addClient(ws: WebSocket): void {
  clients.add(ws);
  logger.info("Client connected", { clientCount: clients.size });
}

export function removeClient(ws: WebSocket): void {
  clients.delete(ws);
  logger.info("Client disconnected", { clientCount: clients.size });
}

export function clientCount(): number {
  return clients.size;
}

// --- Broadcasting ---

/** Relay a binary frame from daemon to all connected clients. */
export function broadcastFrame(frame: Buffer): void {
  frameCount++;
  lastDaemonPing = Date.now();

  // Recalculate FPS every second
  const now = Date.now();
  if (now - lastFpsReset >= 1000) {
    fps = frameCount / ((now - lastFpsReset) / 1000);
    frameCount = 0;
    lastFpsReset = now;
  }

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(frame);
    }
  }
}

/** Send a JSON message to all connected clients. */
export function broadcastJSON(msg: Record<string, unknown>): void {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// --- Metrics ---

export function uptimeSeconds(): number {
  return Math.round((Date.now() - startTime) / 1000);
}

export function latencyMs(): number {
  if (!daemon || lastDaemonPing === 0) return 0;
  return Date.now() - lastDaemonPing;
}

export function currentFps(): number {
  return Math.round(fps * 10) / 10;
}

/** Build a status message for periodic broadcast. */
export function buildStatusMessage(): Record<string, unknown> {
  return {
    type: "status",
    daemonConnected: hasDaemon(),
    clientCount: clients.size,
    fps: currentFps(),
    latencyMs: latencyMs(),
    uptimeSeconds: uptimeSeconds(),
  };
}
