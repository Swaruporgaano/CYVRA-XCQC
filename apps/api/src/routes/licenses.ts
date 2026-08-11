import { Router } from "express";
import type { Request, Response } from "express";
import type { AppState } from "../store/appState.js";
import { requireRole, userFromAuth } from "../store/appState.js";

export function createLicensesRouter(state: AppState): Router {
  const router = Router();

  router.get("/:tenantId", (req: Request, res: Response) => {
    const user = userFromAuth(state, req.header("authorization") ?? undefined);
    if (!requireRole(user, "OPERATOR")) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const pool = state.licenses.get(req.params.tenantId!);
    if (!pool) {
      res.status(404).json({ error: "license_pool_not_found" });
      return;
    }
    res.json({ license: pool });
  });

  /** Stub consume — real metering stays server-side forever. */
  router.post("/:tenantId/consume", (req: Request, res: Response) => {
    const user = userFromAuth(state, req.header("authorization") ?? undefined);
    if (!requireRole(user, "OPERATOR")) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const pool = state.licenses.get(req.params.tenantId!);
    if (!pool) {
      res.status(404).json({ error: "license_pool_not_found" });
      return;
    }
    const amount = Number((req.body as { amount?: number })?.amount ?? 1);
    if (pool.creditsRemaining < amount) {
      res.status(402).json({ error: "insufficient_credits", license: pool });
      return;
    }
    pool.creditsRemaining -= amount;
    res.json({
      ok: true,
      consumed: amount,
      license: pool,
      message: "MVP license consume stub — wire Neon ledger before production billing.",
    });
  });

  return router;
}
