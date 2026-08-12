import { Router } from "express";
import type { Request, Response } from "express";
import { customerFromAuthHeader, signCustomerJwt } from "../lib/jwt.js";
import {
  generateOtpCode,
  hashOtp,
  isOtpExpired,
  maxOtpAttempts,
  normalizeEmail,
  normalizeMobile,
  otpExpiresAt,
  verifyOtpHash,
} from "../lib/otp.js";
import type { CommercialStore } from "../store/commercial.js";
import type { CustomerRecord } from "../types/commercial.js";

const OTP_RATE_LIMIT = 5;
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000;

function requireSecrets(): { jwtSecret: string; otpPepper: string } | null {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const otpPepper = process.env.OTP_PEPPER?.trim();
  if (!jwtSecret || !otpPepper) return null;
  return { jwtSecret, otpPepper };
}

function isDevOtpMode(): boolean {
  return process.env.OTP_DEV_MODE === "true" || process.env.SMS_PROVIDER === "console";
}

function publicCustomer(c: CustomerRecord) {
  return {
    id: c.id,
    name: c.name,
    mobile: c.mobile,
    email: c.email,
    status: c.status,
    createdAt: c.createdAt,
  };
}

function clientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );
}

async function issueOtp(
  store: CommercialStore,
  mobile: string,
  otpPepper: string,
): Promise<{ otpId: string; expiresAt: string; devOtp?: string }> {
  const since = new Date(Date.now() - OTP_RATE_WINDOW_MS);
  const recent = await store.countRecentOtpRequests(mobile, since);
  if (recent >= OTP_RATE_LIMIT) {
    const err = new Error("rate_limited") as Error & { retryAfter?: number };
    err.retryAfter = 3600;
    throw err;
  }

  const code = generateOtpCode();
  const expiresAt = otpExpiresAt();
  const tx = await store.createOtpTransaction(mobile, hashOtp(code, otpPepper), expiresAt);

  console.log(`[xcqc-api][otp] mobile=${mobile} otpId=${tx.id} code=${code} (dev/console)`);

  const out: { otpId: string; expiresAt: string; devOtp?: string } = {
    otpId: tx.id,
    expiresAt: expiresAt.toISOString(),
  };
  if (isDevOtpMode()) {
    out.devOtp = code;
  }
  return out;
}

async function verifyOtpAndLogin(
  store: CommercialStore,
  mobile: string,
  otp: string,
  otpId: string | undefined,
  jwtSecret: string,
  otpPepper: string,
): Promise<{ token: string; customer: ReturnType<typeof publicCustomer> }> {
  const customer = await store.findCustomerByMobile(mobile);
  if (!customer) {
    throw new Error("customer_not_found");
  }

  const tx = otpId
    ? await store.findOtpTransaction(otpId)
    : await store.findLatestOtpForMobile(mobile);

  if (!tx || tx.mobile !== mobile) {
    throw new Error("otp_not_found");
  }
  if (tx.usedAt) {
    throw new Error("otp_used");
  }
  if (isOtpExpired(tx.expiresAt)) {
    throw new Error("otp_expired");
  }
  if (tx.attemptCount >= maxOtpAttempts()) {
    throw new Error("otp_locked");
  }

  if (!verifyOtpHash(otp, otpPepper, tx.otpHash)) {
    await store.incrementOtpAttempts(tx.id);
    throw new Error("otp_invalid");
  }

  await store.markOtpUsed(tx.id);
  const active =
    customer.status === "active"
      ? customer
      : (await store.updateCustomerStatus(customer.id, "active")) ?? customer;

  const token = signCustomerJwt(
    { sub: active.id, mobile: active.mobile, typ: "customer" },
    jwtSecret,
  );

  return { token, customer: publicCustomer(active) };
}

export function createV1AuthRouter(store: CommercialStore): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      version: "v1",
      status: "live",
      phase: "L2",
      auth: [
        "POST /api/v1/auth/register",
        "POST /api/v1/auth/request-otp",
        "POST /api/v1/auth/verify-otp",
        "POST /api/v1/auth/login",
        "GET /api/v1/auth/me",
      ],
      license: "L3 — not implemented",
    });
  });

  router.post("/auth/register", async (req: Request, res: Response) => {
    const secrets = requireSecrets();
    if (!secrets) {
      res.status(503).json({ error: "auth_not_configured", message: "Set JWT_SECRET and OTP_PEPPER" });
      return;
    }

    const body = req.body as { mobile?: string; email?: string; name?: string };
    let mobile: string;
    try {
      if (!body.mobile?.trim()) {
        res.status(400).json({ error: "mobile_required" });
        return;
      }
      mobile = normalizeMobile(body.mobile);
    } catch {
      res.status(400).json({ error: "invalid_mobile" });
      return;
    }

    let email: string | null = null;
    if (body.email?.trim()) {
      try {
        email = normalizeEmail(body.email);
      } catch {
        res.status(400).json({ error: "invalid_email" });
        return;
      }
    }

    const existing = await store.findCustomerByMobile(mobile);
    if (existing) {
      res.status(409).json({ error: "mobile_exists", customer: publicCustomer(existing) });
      return;
    }

    if (email) {
      const byEmail = await store.findCustomerByEmail(email);
      if (byEmail) {
        res.status(409).json({ error: "email_exists" });
        return;
      }
    }

    const customer = await store.createCustomer({
      mobile,
      email,
      name: body.name?.trim() || null,
      status: "pending",
    });

    try {
      const otp = await issueOtp(store, mobile, secrets.otpPepper);
      res.status(201).json({
        customer: publicCustomer(customer),
        otp,
        message: "Registered. Verify OTP to activate your account.",
      });
    } catch (err) {
      if ((err as Error).message === "rate_limited") {
        res.status(429).json({
          error: "rate_limited",
          retryAfter: (err as Error & { retryAfter?: number }).retryAfter ?? 3600,
        });
        return;
      }
      throw err;
    }
  });

  router.post("/auth/request-otp", async (req: Request, res: Response) => {
    const secrets = requireSecrets();
    if (!secrets) {
      res.status(503).json({ error: "auth_not_configured" });
      return;
    }

    const body = req.body as { mobile?: string };
    let mobile: string;
    try {
      if (!body.mobile?.trim()) {
        res.status(400).json({ error: "mobile_required" });
        return;
      }
      mobile = normalizeMobile(body.mobile);
    } catch {
      res.status(400).json({ error: "invalid_mobile" });
      return;
    }

    const customer = await store.findCustomerByMobile(mobile);
    if (!customer) {
      res.status(404).json({ error: "customer_not_found", hint: "Register first at POST /api/v1/auth/register" });
      return;
    }

    try {
      const otp = await issueOtp(store, mobile, secrets.otpPepper);
      res.json({
        otp,
        message: "OTP sent (console/dev mode when OTP_DEV_MODE=true)",
        ip: clientIp(req),
      });
    } catch (err) {
      if ((err as Error).message === "rate_limited") {
        res.status(429).json({
          error: "rate_limited",
          retryAfter: (err as Error & { retryAfter?: number }).retryAfter ?? 3600,
        });
        return;
      }
      throw err;
    }
  });

  router.post("/auth/verify-otp", async (req: Request, res: Response) => {
    const secrets = requireSecrets();
    if (!secrets) {
      res.status(503).json({ error: "auth_not_configured" });
      return;
    }

    const body = req.body as { mobile?: string; otp?: string; otpId?: string };
    let mobile: string;
    try {
      if (!body.mobile?.trim() || !body.otp?.trim()) {
        res.status(400).json({ error: "mobile_and_otp_required" });
        return;
      }
      mobile = normalizeMobile(body.mobile);
    } catch {
      res.status(400).json({ error: "invalid_mobile" });
      return;
    }

    try {
      const result = await verifyOtpAndLogin(
        store,
        mobile,
        body.otp.trim(),
        body.otpId,
        secrets.jwtSecret,
        secrets.otpPepper,
      );
      res.json(result);
    } catch (err) {
      const code = (err as Error).message;
      const status =
        code === "otp_invalid" ? 401 : code === "otp_locked" || code === "otp_expired" ? 410 : 400;
      res.status(status).json({ error: code });
    }
  });

  router.post("/auth/login", async (req: Request, res: Response) => {
    const secrets = requireSecrets();
    if (!secrets) {
      res.status(503).json({ error: "auth_not_configured" });
      return;
    }

    const body = req.body as { mobile?: string; otp?: string; otpId?: string };
    let mobile: string;
    try {
      if (!body.mobile?.trim()) {
        res.status(400).json({ error: "mobile_required" });
        return;
      }
      mobile = normalizeMobile(body.mobile);
    } catch {
      res.status(400).json({ error: "invalid_mobile" });
      return;
    }

    if (!body.otp?.trim()) {
      const customer = await store.findCustomerByMobile(mobile);
      if (!customer) {
        res.status(404).json({ error: "customer_not_found" });
        return;
      }
      try {
        const otp = await issueOtp(store, mobile, secrets.otpPepper);
        res.json({ step: "otp_required", otp });
      } catch (err) {
        if ((err as Error).message === "rate_limited") {
          res.status(429).json({ error: "rate_limited", retryAfter: 3600 });
          return;
        }
        throw err;
      }
      return;
    }

    try {
      const result = await verifyOtpAndLogin(
        store,
        mobile,
        body.otp.trim(),
        body.otpId,
        secrets.jwtSecret,
        secrets.otpPepper,
      );
      res.json({ ...result, step: "authenticated" });
    } catch (err) {
      const code = (err as Error).message;
      const status =
        code === "otp_invalid" ? 401 : code === "otp_locked" || code === "otp_expired" ? 410 : 400;
      res.status(status).json({ error: code });
    }
  });

  router.get("/auth/me", async (req: Request, res: Response) => {
    const secrets = requireSecrets();
    if (!secrets) {
      res.status(503).json({ error: "auth_not_configured" });
      return;
    }

    const payload = customerFromAuthHeader(req.header("authorization"), secrets.jwtSecret);
    if (!payload) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const customer = await store.findCustomerById(payload.sub);
    if (!customer) {
      res.status(404).json({ error: "customer_not_found" });
      return;
    }

    res.json({ customer: publicCustomer(customer) });
  });

  return router;
}
