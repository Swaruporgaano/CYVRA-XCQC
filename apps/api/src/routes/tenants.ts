import { Router } from "express";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { AppState } from "../store/appState.js";
import { requireRole, userFromAuth } from "../store/appState.js";

export function createTenantsRouter(state: AppState): Router {
  const router = Router();

  router.get("/", (req: Request, res: Response) => {
    const user = userFromAuth(state, req.header("authorization") ?? undefined);
    if (!requireRole(user, "AUDITOR")) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (user!.role === "PLATFORM_SUPER" || user!.role === "PLATFORM_SUPPORT") {
      res.json({ tenants: state.tenants });
      return;
    }
    res.json({
      tenants: state.tenants.filter((t) => t.tenantId === user!.tenantId),
    });
  });

  router.post("/", (req: Request, res: Response) => {
    const user = userFromAuth(state, req.header("authorization") ?? undefined);
    if (!requireRole(user, "PLATFORM_SUPER")) {
      res.status(403).json({ error: "forbidden", need: "PLATFORM_SUPER" });
      return;
    }
    const name = String((req.body as { name?: string })?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "name_required" });
      return;
    }
    const tenant = {
      tenantId: `tenant-${randomUUID().slice(0, 8)}`,
      name,
      status: "active" as const,
      createdAt: new Date().toISOString(),
    };
    state.tenants.push(tenant);
    state.licenses.set(tenant.tenantId, {
      tenantId: tenant.tenantId,
      creditsRemaining: 50,
      creditsTotal: 50,
      plan: "mvp-demo",
    });
    res.status(201).json({ tenant });
  });

  router.get("/:tenantId/users", (req: Request, res: Response) => {
    const user = userFromAuth(state, req.header("authorization") ?? undefined);
    if (!requireRole(user, "TENANT_ADMIN") && !requireRole(user, "PLATFORM_SUPPORT")) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const tenantId = req.params.tenantId!;
    res.json({
      users: state.users.filter((u) => u.tenantId === tenantId || u.tenantId === null),
    });
  });

  return router;
}
