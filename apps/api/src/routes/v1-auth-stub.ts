/**
 * L2 stub — route map for /api/v1/auth/* (not implemented until L2).
 * See docs/GAP-BRIDGE-PLAN.md Phase L2.
 */
import { Router } from "express";

const PLANNED_AUTH_ROUTES = [
  "POST /api/v1/auth/register",
  "POST /api/v1/auth/request-otp",
  "POST /api/v1/auth/verify-otp",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/logout",
  "POST /api/v1/auth/refresh",
] as const;

const PLANNED_LICENSE_ROUTES = [
  "POST /api/v1/license/issue",
  "GET /api/v1/license/status",
  "POST /api/v1/license/download-authorize",
  "GET /api/v1/license/download",
  "POST /api/v1/license/activate",
] as const;

const PLANNED_AGENT_ROUTES = [
  "POST /api/v1/agent/bootstrap",
  "POST /api/v1/agent/heartbeat",
] as const;

export function createV1AuthStubRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      version: "v1",
      status: "stub",
      phase: "L2",
      message: "Commercial auth/licensing routes planned — see docs/GAP-BRIDGE-PLAN.md",
      planned: {
        auth: PLANNED_AUTH_ROUTES,
        license: PLANNED_LICENSE_ROUTES,
        agent: PLANNED_AGENT_ROUTES,
      },
    });
  });

  router.all("/auth/*", (_req, res) => {
    res.status(501).json({
      error: "not_implemented",
      phase: "L2",
      message: "Auth API not implemented. Apply L1 schema and complete L2.",
    });
  });

  return router;
}
