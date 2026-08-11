import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { FileSessionStore, MemorySessionStore } from "./store/sessions.js";
import { createSeedState } from "./store/appState.js";
import { createSessionRouter } from "./routes/sessions.js";
import { createAuthRouter } from "./routes/auth.js";
import { createTenantsRouter } from "./routes/tenants.js";
import { createLicensesRouter } from "./routes/licenses.js";
import { createCertificatesRouter } from "./routes/certificates.js";

function createStore() {
  const mode = (process.env.XCQC_STORE ?? "memory").toLowerCase();
  if (mode === "file") {
    const dataDir = process.env.DATA_DIR ?? "./data";
    console.log(`[xcqc-api] store=file dataDir=${dataDir}`);
    return new FileSessionStore(dataDir);
  }
  console.log("[xcqc-api] store=memory (ephemeral — lost on restart / Render sleep)");
  return new MemorySessionStore();
}

function ingestAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.XCQC_INGEST_TOKEN;
  if (!expected) {
    next();
    return;
  }
  const header = req.header("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const alt = req.header("x-xcqc-ingest-token") ?? "";
  if (bearer === expected || alt === expected) {
    next();
    return;
  }
  res.status(401).json({ error: "unauthorized", message: "Invalid or missing ingest token" });
}

export function createApp() {
  const app = express();
  const store = createStore();
  const state = createSeedState();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "xcqc-api",
      product: "CYVRA XCQC",
      time: new Date().toISOString(),
      store: (process.env.XCQC_STORE ?? "memory").toLowerCase(),
      neonConfigured: Boolean(process.env.DATABASE_URL),
      ingestAuth: Boolean(process.env.XCQC_INGEST_TOKEN),
    });
  });

  app.get("/", (_req, res) => {
    res.json({
      product: "CYVRA XCQC",
      message: "Agents collect. API is truth. Web is windows onto truth.",
      endpoints: [
        "GET /health",
        "POST /auth/login",
        "GET /auth/me",
        "GET /auth/demo-tokens",
        "GET|POST /tenants",
        "GET /tenants/:id/users",
        "GET /licenses/:tenantId",
        "POST /licenses/:tenantId/consume",
        "POST /sessions",
        "GET /sessions",
        "GET /sessions/:sessionId",
        "POST /sessions/:sessionId/events",
        "POST /sessions/:sessionId/finalize",
        "GET /certificates",
        "GET /certificates/:certificateId",
      ],
    });
  });

  app.use("/auth", createAuthRouter(state));
  app.use("/tenants", createTenantsRouter(state));
  app.use("/licenses", createLicensesRouter(state));
  app.use("/sessions", ingestAuth, createSessionRouter(store));
  app.use("/certificates", createCertificatesRouter(store, state));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";

if (process.env.XCQC_SKIP_LISTEN !== "1") {
  const app = createApp();
  app.listen(port, host, () => {
    console.log(`[xcqc-api] listening on http://${host}:${port}`);
  });
}
