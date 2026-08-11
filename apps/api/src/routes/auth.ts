import { Router } from "express";
import type { Request, Response } from "express";
import type { AppState } from "../store/appState.js";
import { issueDemoToken, userFromAuth } from "../store/appState.js";

export function createAuthRouter(state: AppState): Router {
  const router = Router();

  /** MVP stub — email maps to seeded users; password ignored. */
  router.post("/login", (req: Request, res: Response) => {
    const email = String((req.body as { email?: string })?.email ?? "").toLowerCase();
    const user = state.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      res.status(401).json({
        error: "invalid_credentials",
        hint: "Try super@cyvra.local | admin@lab.local | ops@lab.local",
      });
      return;
    }
    const token = issueDemoToken(state, user.userId);
    res.json({ token, user });
  });

  router.get("/me", (req: Request, res: Response) => {
    const user = userFromAuth(state, req.header("authorization") ?? undefined);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ user });
  });

  router.get("/demo-tokens", (_req: Request, res: Response) => {
    res.json({
      tokens: {
        PLATFORM_SUPER: "demo-super",
        TENANT_ADMIN: "demo-admin",
        OPERATOR: "demo-ops",
      },
      note: "MVP only — replace with real JWT/OIDC before production.",
    });
  });

  return router;
}
