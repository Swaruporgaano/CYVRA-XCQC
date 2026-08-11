import { Router } from "express";
import type { Request, Response } from "express";
import type { GradeResult } from "@cyvra/xcqc-shared";
import type { SessionStore } from "../store/sessions.js";
import type { AppState } from "../store/appState.js";
import { requireRole, userFromAuth } from "../store/appState.js";

function stubGrade(completeness: string): GradeResult {
  if (completeness === "blocked") {
    return { band: "F", score: 0, reasons: ["Pre-flight blocked"], scoredAt: new Date().toISOString() };
  }
  if (completeness === "partial") {
    return {
      band: "B",
      score: 75,
      reasons: ["Partial certificate — elevation or modules incomplete"],
      scoredAt: new Date().toISOString(),
    };
  }
  return {
    band: "A",
    score: 90,
    reasons: ["MVP stub grade from completeness only — real scoring engine TBD"],
    scoredAt: new Date().toISOString(),
  };
}

export function createCertificatesRouter(store: SessionStore, state: AppState): Router {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    const user = userFromAuth(state, req.header("authorization") ?? undefined);
    if (!requireRole(user, "AUDITOR")) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const sessions = await store.list(100);
    const certificates = sessions
      .filter((s) => s.certificateId && s.status === "completed")
      .map((s) => ({
        certificateId: s.certificateId,
        sessionId: s.sessionId,
        reportId: s.report?.reportId ?? null,
        completeness: s.completeness ?? "partial",
        grade: stubGrade(s.completeness ?? "partial"),
        issuedAt: s.updatedAt,
        verifyUrl: `/certificates/${s.certificateId}`,
        profile: s.profile,
        platform: s.platform,
      }));
    res.json({ count: certificates.length, certificates });
  });

  router.get("/:certificateId", async (req: Request, res: Response) => {
    const sessions = await store.list(500);
    const found = sessions.find((s) => s.certificateId === req.params.certificateId);
    if (!found) {
      res.status(404).json({ error: "certificate_not_found" });
      return;
    }
    res.json({
      certificateId: found.certificateId,
      sessionId: found.sessionId,
      reportId: found.report?.reportId,
      completeness: found.completeness,
      grade: stubGrade(found.completeness ?? "partial"),
      issuedAt: found.updatedAt,
      inventory: found.report?.inventory ?? null,
      modules: found.report?.modules ?? [],
      missingPrerequisites: found.report?.missingPrerequisites ?? [],
      message: "MVP certificate stub — signed PDF/JSON-LD comes after Neon + KMS.",
    });
  });

  return router;
}
