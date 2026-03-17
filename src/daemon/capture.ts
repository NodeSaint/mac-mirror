/** Screen capture using macOS screencapture CLI. */

import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { CAPTURE_QUALITY } from "./config.js";

const execFileAsync = promisify(execFile);

let frameCounter = 0;
let permissionWarningShown = false;

/**
 * Capture the screen and return the JPEG buffer.
 *
 * Uses macOS `screencapture` with:
 *   -x  no shutter sound
 *   -C  include cursor
 *   -t jpg  output format
 */
export async function captureScreen(): Promise<Buffer> {
  const tmpPath = join(tmpdir(), `mac-mirror-frame-${frameCounter++}.jpg`);

  try {
    await execFileAsync("screencapture", [
      "-x",       // silent (no shutter sound)
      "-C",       // include cursor
      "-t", "jpg",
      tmpPath,
    ]);

    const buffer = await readFile(tmpPath);
    return buffer;
  } catch (err) {
    if (!permissionWarningShown && String(err).includes("could not create image")) {
      permissionWarningShown = true;
      process.stderr.write(
        "\n" +
        "╔═══════════════════════════════════════════════════════════════╗\n" +
        "║  Screen Recording permission required                       ║\n" +
        "║                                                             ║\n" +
        "║  1. Open System Settings > Privacy & Security               ║\n" +
        "║  2. Click Screen Recording                                  ║\n" +
        "║  3. Add your terminal app (Terminal, iTerm, Warp, etc.)     ║\n" +
        "║  4. Toggle it ON, then restart this daemon                  ║\n" +
        "╚═══════════════════════════════════════════════════════════════╝\n" +
        "\n"
      );
    }
    throw err;
  } finally {
    unlink(tmpPath).catch(() => {});
  }
}

/**
 * Capture screen with quality/scale applied via sips post-processing.
 *
 * screencapture doesn't support JPEG quality directly,
 * so we capture then resize/recompress with sips.
 */
export async function captureScreenOptimised(scale: number): Promise<Buffer> {
  const tmpPath = join(tmpdir(), `mac-mirror-frame-${frameCounter++}.jpg`);
  const resizedPath = join(tmpdir(), `mac-mirror-resized-${frameCounter}.jpg`);

  try {
    // Capture full screen
    try {
      await execFileAsync("screencapture", [
        "-x", "-C", "-t", "jpg",
        tmpPath,
      ]);
    } catch (err) {
      if (!permissionWarningShown && String(err).includes("could not create image")) {
        permissionWarningShown = true;
        process.stderr.write(
          "\n" +
          "╔═══════════════════════════════════════════════════════════════╗\n" +
          "║  Screen Recording permission required                       ║\n" +
          "║                                                             ║\n" +
          "║  1. Open System Settings > Privacy & Security               ║\n" +
          "║  2. Click Screen Recording                                  ║\n" +
          "║  3. Add your terminal app (Terminal, iTerm, Warp, etc.)     ║\n" +
          "║  4. Toggle it ON, then restart this daemon                  ║\n" +
          "╚═══════════════════════════════════════════════════════════════╝\n" +
          "\n"
        );
      }
      throw err;
    }

    if (scale < 1.0) {
      // Get current dimensions
      const { stdout: infoOut } = await execFileAsync("sips", [
        "-g", "pixelWidth", tmpPath,
      ]);
      const widthMatch = infoOut.match(/pixelWidth:\s*(\d+)/);
      if (widthMatch) {
        const originalWidth = parseInt(widthMatch[1]!, 10);
        const newWidth = Math.round(originalWidth * scale);

        // Resize and set quality
        await execFileAsync("sips", [
          "--resampleWidth", String(newWidth),
          "-s", "formatOptions", String(CAPTURE_QUALITY),
          tmpPath,
          "--out", resizedPath,
        ]);

        const buffer = await readFile(resizedPath);
        return buffer;
      }
    }

    // No scaling needed — just recompress with target quality
    await execFileAsync("sips", [
      "-s", "formatOptions", String(CAPTURE_QUALITY),
      tmpPath,
      "--out", resizedPath,
    ]);

    const buffer = await readFile(resizedPath);
    return buffer;
  } finally {
    unlink(tmpPath).catch(() => {});
    unlink(resizedPath).catch(() => {});
  }
}
