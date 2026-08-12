import type { CorsOptions } from "cors";

function parseOriginPattern(pattern: string): RegExp | null {
  const trimmed = pattern.trim();
  if (!trimmed) return null;
  if (trimmed === "*") return null;

  if (trimmed.includes("*")) {
    const escaped = trimmed
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`, "i");
  }
  return new RegExp(`^${trimmed.replace(/[.+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

const DEFAULT_ORIGIN_PATTERNS = [
  "http://localhost:*",
  "http://127.0.0.1:*",
  "https://*.workers.dev",
  "https://*.cyvoriq.com",
];

export function buildCorsOptions(): CorsOptions {
  const fromEnv = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const patterns = (fromEnv.length > 0 ? fromEnv : DEFAULT_ORIGIN_PATTERNS).map(parseOriginPattern);

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (fromEnv.includes("*")) {
        callback(null, true);
        return;
      }
      const allowed = patterns.some((re) => re?.test(origin));
      callback(null, allowed);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-xcqc-ingest-token"],
  };
}
