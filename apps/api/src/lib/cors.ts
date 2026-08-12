import type { CorsOptions } from "cors";
import type { NextFunction, Request, Response } from "express";

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

/** Always allowed — env entries are merged in, not a replacement. */
const DEFAULT_ORIGIN_PATTERNS = [
  "http://localhost:*",
  "http://127.0.0.1:*",
  "https://cyvra-xcqc.orgaanoagrolab.workers.dev",
  "https://*.workers.dev",
  "https://*.cyvoriq.com",
];

const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Content-Type,Authorization,x-xcqc-ingest-token";

export function isOriginAllowed(origin: string, patterns: Array<RegExp | null>): boolean {
  return patterns.some((re) => re?.test(origin));
}

function loadOriginPatterns(): Array<RegExp | null> {
  const fromEnv = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const patternStrings = [...new Set([...DEFAULT_ORIGIN_PATTERNS, ...fromEnv])];
  return patternStrings.map(parseOriginPattern);
}

/** Resolve request Origin to reflected ACAO value, or null when not allowed. */
export function resolveAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;

  const fromEnv = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv.includes("*")) return origin;

  const patterns = loadOriginPatterns();
  return isOriginAllowed(origin, patterns) ? origin : null;
}

/**
 * Explicit CORS middleware — sets ACAO on GET/POST (not only OPTIONS) and ends preflight with 204.
 * Safer than relying solely on the cors package when Render env overrides blocked Worker origins.
 */
export function createCorsMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    const allowed = resolveAllowedOrigin(origin);

    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", allowed);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
      if (allowed) {
        res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
        res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
        res.setHeader("Access-Control-Max-Age", "86400");
        res.status(204).end();
        return;
      }
      res.status(403).end();
      return;
    }

    next();
  };
}

/** cors package options — kept for compatibility; createCorsMiddleware is primary on the app. */
export function buildCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed = resolveAllowedOrigin(origin);
      callback(null, allowed ?? false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-xcqc-ingest-token"],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };
}
