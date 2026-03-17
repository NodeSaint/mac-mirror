/** Mac Mirror — Capture Daemon entry point.
 *
 * Captures the Mac screen at a configured FPS and streams JPEG frames
 * to the relay server via WebSocket. Falls back to stdout logging if
 * --stdout flag is passed (useful for testing capture without a server).
 */

import { captureScreenOptimised } from "./capture.js";
import {
  CAPTURE_FPS,
  CAPTURE_INTERVAL,
  CAPTURE_SCALE,
  CAPTURE_QUALITY,
  SERVER_HOST,
  SERVER_PORT,
  INPUT_ENABLED,
} from "./config.js";
import { handleInput, type InputMessage } from "./input.js";

const args = process.argv.slice(2);
const stdoutMode = args.includes("--stdout");

/** Log to stderr so stdout stays clean for piped output. */
function log(msg: string, data?: Record<string, unknown>): void {
  const entry = {
    level: "info",
    ts: new Date().toISOString(),
    msg,
    ...data,
  };
  process.stderr.write(JSON.stringify(entry) + "\n");
}

async function runStdoutMode(): Promise<void> {
  log("Starting capture daemon in stdout mode", {
    fps: CAPTURE_FPS,
    quality: CAPTURE_QUALITY,
    scale: CAPTURE_SCALE,
    intervalMs: CAPTURE_INTERVAL,
  });

  let running = true;
  let frameCount = 0;
  const startTime = Date.now();

  process.on("SIGINT", () => { running = false; });
  process.on("SIGTERM", () => { running = false; });

  while (running) {
    const frameStart = performance.now();

    try {
      const buffer = await captureScreenOptimised(CAPTURE_SCALE);
      frameCount++;
      const elapsed = performance.now() - frameStart;

      // Log frame stats every 10 frames
      if (frameCount % 10 === 0) {
        const totalElapsed = (Date.now() - startTime) / 1000;
        const actualFps = frameCount / totalElapsed;
        log("Capture stats", {
          frame: frameCount,
          sizeKB: Math.round(buffer.length / 1024),
          captureMs: Math.round(elapsed),
          actualFps: Math.round(actualFps * 10) / 10,
        });
      }

      // Sleep for remaining interval
      const sleepMs = Math.max(0, CAPTURE_INTERVAL - elapsed);
      if (sleepMs > 0 && running) {
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
    } catch (err) {
      log("Capture error", { error: String(err) });
      // Brief pause before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  log("Daemon stopped", { totalFrames: frameCount });
}

async function runWebSocketMode(): Promise<void> {
  const { default: WebSocket } = await import("ws");

  const url = `ws://${SERVER_HOST}:${SERVER_PORT}/daemon`;
  log("Starting capture daemon in WebSocket mode", {
    url,
    fps: CAPTURE_FPS,
    quality: CAPTURE_QUALITY,
    scale: CAPTURE_SCALE,
  });

  let running = true;
  process.on("SIGINT", () => { running = false; });
  process.on("SIGTERM", () => { running = false; });

  let backoff = 1000;
  const maxBackoff = 30000;

  while (running) {
    try {
      const ws = await new Promise<InstanceType<typeof WebSocket>>((resolve, reject) => {
        const socket = new WebSocket(url);
        socket.on("open", () => resolve(socket));
        socket.on("error", reject);
      });

      log("Connected to relay server");
      backoff = 1000;

      let frameCount = 0;
      const sessionStart = Date.now();

      // Listen for input commands from server
      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(String(raw)) as InputMessage;

          if (msg.type?.startsWith("input:")) {
            if (!INPUT_ENABLED) return;
            handleInput(msg).catch((err) => {
              log("Input error", { type: msg.type, error: String(err) });
            });
          }
        } catch {
          // Malformed message — ignore
        }
      });

      // Capture loop
      while (running && ws.readyState === WebSocket.OPEN) {
        const frameStart = performance.now();

        try {
          const buffer = await captureScreenOptimised(CAPTURE_SCALE);
          frameCount++;

          // Send as binary WebSocket frame
          ws.send(buffer);

          const elapsed = performance.now() - frameStart;

          if (frameCount % 30 === 0) {
            const totalElapsed = (Date.now() - sessionStart) / 1000;
            const actualFps = frameCount / totalElapsed;
            log("Capture stats", {
              frame: frameCount,
              sizeKB: Math.round(buffer.length / 1024),
              captureMs: Math.round(elapsed),
              actualFps: Math.round(actualFps * 10) / 10,
            });
          }

          const sleepMs = Math.max(0, CAPTURE_INTERVAL - elapsed);
          if (sleepMs > 0 && running) {
            await new Promise((resolve) => setTimeout(resolve, sleepMs));
          }
        } catch (err) {
          log("Capture error", { error: String(err) });
          break;
        }
      }

      ws.close();
      log("Disconnected from relay server", { totalFrames: frameCount });

    } catch (err) {
      log("Connection failed", { error: String(err), retryMs: backoff });
    }

    if (running) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
      backoff = Math.min(backoff * 2, maxBackoff);
    }
  }

  log("Daemon stopped");
}

// --- Entry point ---

if (stdoutMode) {
  runStdoutMode().catch((err) => {
    log("Fatal error", { error: String(err) });
    process.exit(1);
  });
} else {
  runWebSocketMode().catch((err) => {
    log("Fatal error", { error: String(err) });
    process.exit(1);
  });
}
