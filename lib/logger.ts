// lib/logger.ts
// Lightweight logger to standardize auth/OAuth diagnostics.
// Controlled by process.env.DEBUG_AUTH ("1", "true" enable debug-level output)
import { v4 as uuidv4 } from "uuid";

function randomUUID(): string {
    return uuidv4();
}

export type LogLevel = "debug" | "info" | "warn" | "error";

const isDebug = () => {
  const v = String(process.env.DEBUG_AUTH || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
};

export function redact(value: any, keepStart = 4, keepEnd = 4): string {
  if (value === undefined || value === null) return String(value);
  const s = String(value);
  if (s.length <= keepStart + keepEnd + 3) return "***"; // too short, fully redact
  return `${s.slice(0, keepStart)}***${s.slice(-keepEnd)}`;
}

export function createRequestLogger(context: string, requestId?: string) {
  const id = requestId || randomUUID();

  function base(level: LogLevel, message: string, meta?: Record<string, any>) {
    // Only emit debug logs when DEBUG_AUTH is enabled; always emit warn/error
    if (level === "debug" && !isDebug()) return;
    const prefix = `[AuthFlow][${context}][${level.toUpperCase()}][${id}]`;
    if (meta) {
      try {
        // Avoid logging large/complex objects unsafely
        console.log(prefix, message, JSON.stringify(meta));
      } catch {
        console.log(prefix, message, meta);
      }
    } else {
      console.log(prefix, message);
    }
  }

  return {
    id,
    debug: (msg: string, meta?: Record<string, any>) => base("debug", msg, meta),
    info: (msg: string, meta?: Record<string, any>) => base("info", msg, meta),
    warn: (msg: string, meta?: Record<string, any>) => base("warn", msg, meta),
    error: (msg: string, meta?: Record<string, any>) => base("error", msg, meta),
  };
}
