import { Router } from "express";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type {
  CreateSessionRequest,
  FinalizeSessionRequest,
  SessionEventType,
} from "@cyvra/xcqc-shared";
import { REPORT_PAYLOAD_VERSION } from "@cyvra/xcqc-shared";
import type { SessionStore } from "../store/sessions.js";
import { assertTransition, newEvent } from "../store/sessions.js";
import type { SessionRecord } from "../types/session.js";

export function createSessionRouter(store: SessionStore): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as CreateSessionRequest;
    const now = new Date().toISOString();
    const sessionId = randomUUID();

    const session: SessionRecord = {
      sessionId,
      status: "created",
      createdAt: now,
      updatedAt: now,
      orgId: body.orgId,
      operatorId: body.operatorId,
      profile: body.profile ?? "unknown",
      platform: body.platform ?? "windows",
      agentVersion: body.agentVersion,
      deviceHint: body.deviceHint,
      events: [],
    };

    session.events.push(
      newEvent(sessionId, {
        type: "session.created",
        message: "Session created",
        data: {
          orgId: session.orgId,
          operatorId: session.operatorId,
          profile: session.profile,
          platform: session.platform,
        },
      }),
    );

    await store.create(session);

    res.status(201).json({
      sessionId,
      status: session.status,
      createdAt: now,
      ingestTokenRequired: Boolean(process.env.XCQC_INGEST_TOKEN),
    });
  });

  router.get("/", async (_req: Request, res: Response) => {
    const sessions = await store.list(100);
    res.json({
      count: sessions.length,
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        profile: s.profile,
        platform: s.platform,
        completeness: s.completeness ?? null,
        certificateId: s.certificateId ?? null,
        eventCount: s.events.length,
      })),
    });
  });

  router.get("/:sessionId", async (req: Request, res: Response) => {
    const session = await store.get(req.params.sessionId!);
    if (!session) {
      res.status(404).json({ error: "session_not_found" });
      return;
    }
    res.json(session);
  });

  router.post("/:sessionId/events", async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId!;
    const body = (req.body ?? {}) as {
      type?: SessionEventType;
      moduleId?: string;
      percent?: number;
      message?: string;
      data?: Record<string, unknown>;
    };

    if (!body.type) {
      res.status(400).json({ error: "type_required" });
      return;
    }

    const updated = await store.update(sessionId, (s) => {
      if (s.status === "created" && body.type !== "session.created") {
        s.status = "running";
        s.events.push(
          newEvent(sessionId, {
            type: "session.started",
            message: "Session marked running on first event",
          }),
        );
      }
      s.events.push(
        newEvent(sessionId, {
          type: body.type!,
          moduleId: body.moduleId,
          percent: body.percent,
          message: body.message,
          data: body.data,
        }),
      );
    });

    if (!updated) {
      res.status(404).json({ error: "session_not_found" });
      return;
    }

    res.status(201).json({
      sessionId,
      status: updated.status,
      eventCount: updated.events.length,
      lastEvent: updated.events[updated.events.length - 1],
    });
  });

  router.post("/:sessionId/finalize", async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId!;
    const body = (req.body ?? {}) as FinalizeSessionRequest;

    if (!body.payload) {
      res.status(400).json({ error: "payload_required" });
      return;
    }

    const payload = body.payload;
    if (payload.sessionId && payload.sessionId !== sessionId) {
      res.status(400).json({
        error: "session_id_mismatch",
        message: "payload.sessionId must match URL sessionId",
      });
      return;
    }

    payload.sessionId = sessionId;
    if (!payload.schemaVersion) {
      payload.schemaVersion = REPORT_PAYLOAD_VERSION;
    }
    if (!payload.reportId) {
      payload.reportId = randomUUID();
    }

    const existing = await store.get(sessionId);
    if (!existing) {
      res.status(404).json({ error: "session_not_found" });
      return;
    }

    if (existing.status === "completed") {
      res.status(409).json({
        error: "already_finalized",
        sessionId,
        reportId: existing.report?.reportId,
        certificateId: existing.certificateId ?? null,
      });
      return;
    }

    // Soft transition — accept finalize from created/running
    if (!["created", "running", "finalizing"].includes(existing.status)) {
      res.status(409).json({
        error: "invalid_status",
        status: existing.status,
      });
      return;
    }

    const certificateId = `xcqc-cert-${payload.reportId.slice(0, 8)}`;
    const storedAt = new Date().toISOString();

    const updated = await store.update(sessionId, (s) => {
      if (assertTransition(s.status, "finalizing") || s.status === "running" || s.status === "created") {
        s.status = "finalizing";
      }
      s.events.push(
        newEvent(sessionId, {
          type: "report.finalize",
          message: "Report payload received",
          data: {
            reportId: payload.reportId,
            completeness: payload.completeness,
            moduleCount: payload.modules?.length ?? 0,
          },
        }),
      );
      s.report = payload;
      s.completeness = payload.completeness;
      s.certificateId = certificateId;
      s.status = "completed";
      s.profile = payload.profile ?? s.profile;
      s.platform = payload.platform ?? s.platform;
      s.agentVersion = payload.agentVersion ?? s.agentVersion;
      s.orgId = payload.orgId ?? s.orgId;
      s.operatorId = payload.operatorId ?? s.operatorId;
    });

    if (!updated) {
      res.status(404).json({ error: "session_not_found" });
      return;
    }

    res.status(200).json({
      sessionId,
      status: updated.status,
      completeness: payload.completeness,
      reportId: payload.reportId,
      storedAt,
      certificateId,
      message:
        "MVP finalize stored in-memory/file. Neon + server-side scoring not enabled yet.",
    });
  });

  return router;
}
