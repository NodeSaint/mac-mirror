/** Server configuration — reads from config.json and environment variables. */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, "..", "..", "config.json");

interface FileConfig {
  readonly port?: number;
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

/** Port to listen on. */
export const PORT: number =
  parseInt(process.env["MAC_MIRROR_PORT"] ?? "", 10) ||
  (fileConfig.port ?? 3847);

/** Interval between status broadcasts to clients (ms). */
export const STATUS_INTERVAL: number = 5000;
