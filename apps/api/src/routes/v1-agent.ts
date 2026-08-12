import { Router } from "express";
import type { Request, Response } from "express";
import {
  deviceFromAuthHeader,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
  signDeviceJwt,
} from "../lib/device-jwt.js";
import { findRefreshToken, storeRefreshToken } from "../store/refresh-tokens.js";
import type { CommercialStore } from "../store/commercial.js";

function requireJwtSecret(): string | null {
  return process.env.JWT_SECRET?.trim() ?? null;
}

export function createV1AgentRouter(store: CommercialStore): Router {
  const router = Router();

  router.post("/agent/bootstrap", async (req: Request, res: Response) => {
    const jwtSecret = requireJwtSecret();
    if (!jwtSecret) {
      res.status(503).json({ error: "auth_not_configured" });
      return;
    }

    const body = req.body as { refreshToken?: string; deviceId?: string };
    if (!body.refreshToken?.trim() || !body.deviceId?.trim()) {
      res.status(400).json({ error: "refresh_token_and_device_id_required" });
      return;
    }

    const record = findRefreshToken(body.refreshToken.trim());
    if (!record || record.deviceId !== body.deviceId.trim()) {
      res.status(401).json({ error: "invalid_refresh_token" });
      return;
    }

    const activation = await store.findActivationByDevice(record.deviceId);
    if (!activation || activation.status !== "active") {
      res.status(403).json({ error: "activation_inactive" });
      return;
    }

    await store.updateActivationLastSeen(activation.id);
    await store.touchDevice(record.deviceId);

    const deviceToken = signDeviceJwt(
      {
        sub: record.deviceId,
        customerId: record.customerId,
        licenseId: record.licenseId,
        activationId: record.activationId,
        typ: "device",
      },
      jwtSecret,
    );

    const newRefresh = generateRefreshToken();
    storeRefreshToken({
      tokenHash: hashRefreshToken(newRefresh),
      deviceId: record.deviceId,
      customerId: record.customerId,
      licenseId: record.licenseId,
      activationId: record.activationId,
      expiresAt: refreshTokenExpiresAt(),
    });

    res.json({
      deviceToken,
      refreshToken: newRefresh,
      activation: {
        id: activation.id,
        status: activation.status,
        lastSeenAt: new Date().toISOString(),
      },
    });
  });

  router.post("/agent/heartbeat", async (req: Request, res: Response) => {
    const jwtSecret = requireJwtSecret();
    if (!jwtSecret) {
      res.status(503).json({ error: "auth_not_configured" });
      return;
    }

    const payload = deviceFromAuthHeader(req.header("authorization"), jwtSecret);
    if (!payload) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const activation = await store.findActivationByDevice(payload.sub);
    if (!activation || activation.status !== "active") {
      res.status(403).json({ error: "activation_inactive" });
      return;
    }

    const body = req.body as { agentVersion?: string };
    await store.updateActivationLastSeen(activation.id);
    await store.touchDevice(payload.sub);

    await store.createAuditLog({
      customerId: payload.customerId,
      event: "agent.heartbeat",
      metadata: {
        deviceId: payload.sub,
        agentVersion: body.agentVersion ?? null,
      },
    });

    res.json({
      ok: true,
      deviceId: payload.sub,
      lastSeenAt: new Date().toISOString(),
    });
  });

  return router;
}
