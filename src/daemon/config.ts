/** Daemon configuration — reads from config.json and environment variables. */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, "..", "..", "config.json");

interface FileConfig {
  readonly port?: number;
  readonly capture?: {
    readonly fps?: number;
    readonly quality?: number;
    readonly scale?: number;
    readonly format?: string;
  };
  readonly input?: {
    readonly enabled?: boolean;
  };
}

function loadFileConfig(): FileConfig {
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as FileConfig;
  } catch {
    return {};
  }
}

const fileConfig = loadFileConfig();

/** Server port to connect to. */
export const SERVER_PORT: number =
  parseInt(process.env["MAC_MIRROR_PORT"] ?? "", 10) ||
  (fileConfig.port ?? 3847);

/** Server host to connect to. */
export const SERVER_HOST: string =
  process.env["MAC_MIRROR_HOST"] ?? "localhost";

/** Frames per second for screen capture. */
export const CAPTURE_FPS: number =
  parseInt(process.env["MAC_MIRROR_FPS"] ?? "", 10) ||
  (fileConfig.capture?.fps ?? 10);

/** JPEG quality (1-100). Lower = smaller files, worse quality. */
export const CAPTURE_QUALITY: number =
  parseInt(process.env["MAC_MIRROR_QUALITY"] ?? "", 10) ||
  (fileConfig.capture?.quality ?? 60);

/** Resolution scale factor (0.5 = half resolution). */
export const CAPTURE_SCALE: number =
  parseFloat(process.env["MAC_MIRROR_SCALE"] ?? "") ||
  (fileConfig.capture?.scale ?? 0.5);

/** Whether remote input is enabled. */
export const INPUT_ENABLED: boolean =
  fileConfig.input?.enabled ?? true;

/** Interval between frames in milliseconds. */
export const CAPTURE_INTERVAL: number = Math.round(1000 / CAPTURE_FPS);
