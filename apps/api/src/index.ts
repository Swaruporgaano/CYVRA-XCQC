import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { createSeedState } from "./store/appState.js";
import { createSessionStore } from "./store/neon.js";
import { createSessionRouter } from "./routes/sessions.js";
import { createAuthRouter } from "./routes/auth.js";
import { createTenantsRouter } from "./routes/tenants.js";
import { createLicensesRouter } from "./routes/licenses.js";
import { createCertificatesRouter } from "./routes/certificates.js";

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

export async function createApp() {
  const app = express();
  const { store, mode } = await createSessionStore();
  const state = createSeedState();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "xcqc-api",
      product: "CYVRA XCQC",
      time: new Date().toISOString(),
      store: mode,
      neonConfigured: Boolean(process.env.DATABASE_URL),
      ingestAuth: Boolean(process.env.XCQC_INGEST_TOKEN),
    });
  });

  app.get("/", (_req, res) => {
    res.json({
      product: "CYVRA XCQC",
      message: "Agents collect. API is truth. Web is windows onto truth.",
      store: mode,
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
  createApp()
    .then((app) => {
      app.listen(port, host, () => {
        console.log(`[xcqc-api] listening on http://${host}:${port}`);
      });
    })
    .catch((err) => {
      console.error("[xcqc-api] failed to start", err);
      process.exit(1);
    });
}
