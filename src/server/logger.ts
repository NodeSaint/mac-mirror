/** Structured JSON logging for the relay server. */

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
  const entry = {
    level,
    ts: new Date().toISOString(),
    component: "server",
    msg,
    ...data,
  };
  const out = JSON.stringify(entry) + "\n";
  if (level === "error") {
    process.stderr.write(out);
  } else {
    process.stdout.write(out);
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
};
