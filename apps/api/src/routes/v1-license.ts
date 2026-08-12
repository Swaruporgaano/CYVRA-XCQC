import { Router } from "express";
import type { Request, Response } from "express";
import { customerFromAuthHeader } from "../lib/jwt.js";
import {
  computeDeviceFingerprint,
  downloadTokenExpiresAt,
  generateDownloadToken,
  generateLicenseKey,
  hashDownloadToken,
  hashLicenseKey,
  hashSerial,
  isDownloadTokenExpired,
  isLicenseDevMode,
  normalizeLicenseKey,
  licenseKeyLast4,
  type FingerprintInput,
} from "../lib/license.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
  signDeviceJwt,
} from "../lib/device-jwt.js";
import { storeRefreshToken as persistRefreshToken } from "../store/refresh-tokens.js";
import {
  hashOtp,
  isOtpExpired,
  maxOtpAttempts,
  normalizeMobile,
  verifyOtpHash,
} from "../lib/otp.js";
import type { CommercialStore } from "../store/commercial.js";
import type { LicenseKeyRecord } from "../types/commercial.js";

function requireSecrets(): { jwtSecret: string; licensePepper: string; otpPepper: string } | null {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const licensePepper = process.env.LICENSE_PEPPER?.trim();
  const otpPepper = process.env.OTP_PEPPER?.trim();
  if (!jwtSecret || !licensePepper || !otpPepper) return null;
  return { jwtSecret, licensePepper, otpPepper };
}

function publicLicense(l: LicenseKeyRecord) {
  return {
    id: l.id,
    keyLast4: l.keyLast4,
    status: l.status,
    createdAt: l.createdAt,
    activatedAt: l.activatedAt ?? null,
  };
}

function requireCustomer(req: Request, res: Response, jwtSecret: string) {
  const payload = customerFromAuthHeader(req.header("authorization"), jwtSecret);
  if (!payload) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  return payload;
}

export function createV1LicenseRouter(store: CommercialStore): Router {
  const router = Router();

  router.get("/license/status", async (req: Request, res: Response) => {
    const secrets = requireSecrets();
    if (!secrets) {
      res.status(503).json({ error: "license_not_configured", message: "Set JWT_SECRET, LICENSE_PEPPER, OTP_PEPPER" });
      return;
    }

    const payload = requireCustomer(req, res, secrets.jwtSecret);
    if (!payload) return;

    const licenses = await store.listLicensesByCustomer(payload.sub);
    const enriched = await Promise.all(
      licenses.map(async (lic) => {
        const act = await store.findActivationByLicense(lic.id);
        return {
          ...publicLicense(lic),
          activation: act
            ? {
                id: act.id,
                status: act.status,
                deviceId: act.deviceId,
                activatedAt: act.activatedAt,
                lastSeenAt: act.lastSeenAt ?? null,
              }
            : null,
        };
      }),
    );

    res.json({
      licenses: enriched,
      policy: "SAME_DEVICE",
      downloadTokenTtlMinutes: 15,
    });
  });

  router.post("/license/issue", async (req: Request, res: Response) => {
    const secrets = requireSecrets();
    if (!secrets) {
      res.status(503).json({ error: "license_not_configured" });
      return;
    }

    const payload = requireCustomer(req, res, secrets.jwtSecret);
    if (!payload) return;

    const customer = await store.findCustomerById(payload.sub);
    if (!customer) {
      res.status(404).json({ error: "customer_not_found" });
      return;
    }

    const existing = await store.listLicensesByCustomer(payload.sub);
    const available = existing.filter((l) => l.status === "available");
    if (available.length >= 3 && !isLicenseDevMode()) {
      res.status(409).json({ error: "license_limit", message: "Max 3 available keys per customer" });
      return;
    }

    const key = generateLicenseKey();
    const keyHash = hashLicenseKey(key, secrets.licensePepper);
    const license = await store.createLicenseKey(payload.sub, keyHash, licenseKeyLast4(key));

    await store.createAuditLog({
      customerId: payload.sub,
      event: "license.issued",
      metadata: { licenseId: license.id, keyLast4: license.keyLast4 },
    });

    const out: Record<string, unknown> = {
      license: publicLicense(license),
      message: "Save your 16-digit key — it will not be shown again.",
    };
    if (isLicenseDevMode()) {
      out.licenseKey = key;
      out.devMode = true;
    } else {
      out.licenseKey = key;
      out.displayOnce = true;
    }

    res.status(201).json(out);
  });

  router.post("/license/download-authorize", async (req: Request, res: Response) => {
    const secrets = requireSecrets();
    if (!secrets) {
      res.status(503).json({ error: "license_not_configured" });
      return;
    }

    const payload = requireCustomer(req, res, secrets.jwtSecret);
    if (!payload) return;

    const body = req.body as { licenseId?: string };
    if (!body.licenseId?.trim()) {
      res.status(400).json({ error: "license_id_required" });
      return;
    }

    const license = await store.findLicenseById(body.licenseId.trim());
    if (!license || license.customerId !== payload.sub) {
      res.status(404).json({ error: "license_not_found" });
      return;
    }
    if (license.status === "revoked") {
      res.status(403).json({ error: "license_revoked" });
      return;
    }

    const token = generateDownloadToken();
    const expiresAt = downloadTokenExpiresAt();
    const record = await store.createDownloadToken(
      payload.sub,
      license.id,
      hashDownloadToken(token),
      expiresAt,
    );

    await store.createAuditLog({
      customerId: payload.sub,
      event: "download.authorized",
      metadata: { licenseId: license.id, downloadTokenId: record.id },
    });

    res.json({
      downloadToken: token,
      expiresAt: expiresAt.toISOString(),
      downloadUrl: `/api/v1/license/download`,
      message: "Single-use token — expires in 15 minutes. License stays AVAILABLE until activation.",
    });
  });

  router.get("/license/download", async (req: Request, res: Response) => {
    const auth = req.header("authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      res.status(401).json({ error: "download_token_required" });
      return;
    }

    const token = auth.slice(7);
    const tokenHash = hashDownloadToken(token);
    const record = await store.findDownloadTokenByHash(tokenHash);
    if (!record) {
      res.status(401).json({ error: "invalid_download_token" });
      return;
    }
    if (record.consumedAt) {
      res.status(410).json({ error: "download_token_consumed" });
      return;
    }
    if (isDownloadTokenExpired(new Date(record.expiresAt))) {
      res.status(410).json({ error: "download_token_expired" });
      return;
    }

    await store.consumeDownloadToken(record.id);
    await store.createAuditLog({
      customerId: record.customerId,
      event: "download.consumed",
      metadata: { licenseId: record.licenseId, downloadTokenId: record.id },
    });

    const placeholder = [
      "CYVRA-XCQC Agent Installer (placeholder)",
      `License: ****${(await store.findLicenseById(record.licenseId))?.keyLast4 ?? "????"}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "Replace with signed electron-builder artifact in L5.",
    ].join("\n");

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="CYVRA-XCQC-setup-stub.exe"');
    res.send(Buffer.from(placeholder, "utf8"));
  });

  router.post("/license/activate", async (req: Request, res: Response) => {
    const secrets = requireSecrets();
    if (!secrets) {
      res.status(503).json({ error: "license_not_configured" });
      return;
    }

    const body = req.body as {
      mobile?: string;
      licenseKey?: string;
      otp?: string;
      otpId?: string;
      fingerprint?: FingerprintInput;
      agentVersion?: string;
    };

    let mobile: string;
    let licenseKey: string;
    try {
      if (!body.mobile?.trim() || !body.licenseKey?.trim() || !body.otp?.trim()) {
        res.status(400).json({ error: "mobile_license_key_otp_required" });
        return;
      }
      mobile = normalizeMobile(body.mobile);
      licenseKey = normalizeLicenseKey(body.licenseKey);
    } catch {
      res.status(400).json({ error: "invalid_input" });
      return;
    }

    if (!body.fingerprint || typeof body.fingerprint !== "object") {
      res.status(400).json({ error: "fingerprint_required" });
      return;
    }

    const customer = await store.findCustomerByMobile(mobile);
    if (!customer) {
      res.status(404).json({ error: "customer_not_found" });
      return;
    }

    const tx = body.otpId
      ? await store.findOtpTransaction(body.otpId)
      : await store.findLatestOtpForMobile(mobile);
    if (!tx || tx.mobile !== mobile) {
      res.status(400).json({ error: "otp_not_found" });
      return;
    }
    if (tx.usedAt) {
      res.status(410).json({ error: "otp_used" });
      return;
    }
    if (isOtpExpired(tx.expiresAt)) {
      res.status(410).json({ error: "otp_expired" });
      return;
    }
    if (tx.attemptCount >= maxOtpAttempts()) {
      res.status(410).json({ error: "otp_locked" });
      return;
    }
    if (!verifyOtpHash(body.otp.trim(), secrets.otpPepper, tx.otpHash)) {
      await store.incrementOtpAttempts(tx.id);
      res.status(401).json({ error: "otp_invalid" });
      return;
    }
    await store.markOtpUsed(tx.id);

    const keyHash = hashLicenseKey(licenseKey, secrets.licensePepper);
    const license = await store.findLicenseByHash(keyHash);
    if (!license || license.customerId !== customer.id) {
      res.status(404).json({ error: "license_not_found" });
      return;
    }
    if (license.status === "revoked") {
      res.status(403).json({ error: "license_revoked" });
      return;
    }

    const fp = computeDeviceFingerprint(body.fingerprint);
    const existingActivation = await store.findActivationByLicense(license.id);

    if (existingActivation) {
      const existingDeviceFp = body.fingerprint;
      const requestFp = computeDeviceFingerprint(existingDeviceFp);
      const activatedDevice = await store.findDeviceByFingerprint(requestFp);

      if (activatedDevice && activatedDevice.id === existingActivation.deviceId) {
        await store.touchDevice(activatedDevice.id);
        await store.updateActivationLastSeen(existingActivation.id);
        const deviceToken = signDeviceJwt(
          {
            sub: activatedDevice.id,
            customerId: customer.id,
            licenseId: license.id,
            activationId: existingActivation.id,
            typ: "device",
          },
          secrets.jwtSecret,
        );
        const refreshToken = generateRefreshToken();
        persistRefreshToken({
          tokenHash: hashRefreshToken(refreshToken),
          deviceId: activatedDevice.id,
          customerId: customer.id,
          licenseId: license.id,
          activationId: existingActivation.id,
          expiresAt: refreshTokenExpiresAt(),
        });
        res.json({
          reactivated: true,
          activation: {
            id: existingActivation.id,
            status: existingActivation.status,
            activatedAt: existingActivation.activatedAt,
          },
          device: { id: activatedDevice.id, fingerprint: requestFp },
          deviceToken,
          refreshToken,
        });
        return;
      }

      res.status(409).json({
        error: "license_already_activated",
        message: "One-device policy — contact support for device transfer (SAME_DEVICE stub).",
        policy: "SAME_DEVICE",
      });
      return;
    }

    if (license.status === "activated" && !existingActivation) {
      res.status(409).json({ error: "license_already_activated", policy: "SAME_DEVICE" });
      return;
    }

    let device = await store.findDeviceByFingerprint(fp);
    if (!device) {
      device = await store.createDevice({
        customerId: customer.id,
        manufacturer: body.fingerprint.manufacturer ?? null,
        model: body.fingerprint.model ?? null,
        serialHash: hashSerial(body.fingerprint.chassisSerial),
        uuidHash: hashSerial(body.fingerprint.systemUuid),
        deviceFingerprint: fp,
      });
    } else {
      await store.touchDevice(device.id);
    }

    const activation = await store.createAgentActivation({
      customerId: customer.id,
      licenseId: license.id,
      deviceId: device.id,
      agentVersion: body.agentVersion ?? null,
    });

    await store.updateLicenseStatus(license.id, "activated", new Date());
    await store.createAuditLog({
      customerId: customer.id,
      event: "license.activated",
      metadata: { licenseId: license.id, deviceId: device.id, activationId: activation.id },
    });

    const deviceToken = signDeviceJwt(
      {
        sub: device.id,
        customerId: customer.id,
        licenseId: license.id,
        activationId: activation.id,
        typ: "device",
      },
      secrets.jwtSecret,
    );
    const refreshToken = generateRefreshToken();
    persistRefreshToken({
      tokenHash: hashRefreshToken(refreshToken),
      deviceId: device.id,
      customerId: customer.id,
      licenseId: license.id,
      activationId: activation.id,
      expiresAt: refreshTokenExpiresAt(),
    });

    res.status(201).json({
      activation: {
        id: activation.id,
        status: activation.status,
        activatedAt: activation.activatedAt,
      },
      device: { id: device.id, fingerprint: fp },
      deviceToken,
      refreshToken,
      message: "License activated. Use deviceToken for agent ingest (or refresh via /api/v1/agent/bootstrap).",
    });
  });

  return router;
}
