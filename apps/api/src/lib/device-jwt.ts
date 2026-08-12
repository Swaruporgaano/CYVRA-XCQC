import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const DEVICE_JWT_TTL_SEC = 24 * 60 * 60; // 24h access token
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface DeviceJwtPayload {
  sub: string;
  customerId: string;
  licenseId: string;
  activationId: string;
  typ: "device";
}

export interface RefreshTokenRecord {
  tokenHash: string;
  deviceId: string;
  customerId: string;
  licenseId: string;
  activationId: string;
  expiresAt: Date;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function b64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export function signDeviceJwt(payload: DeviceJwtPayload, secret: string): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + DEVICE_JWT_TTL_SEC,
    }),
  );
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest();
  return `${header}.${body}.${b64url(sig)}`;
}

export function verifyDeviceJwt(token: string, secret: string): DeviceJwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = parts[0]!;
  const body = parts[1]!;
  const sig = parts[2]!;
  const expected = createHmac("sha256", secret).update(`${header}.${body}`).digest();
  const actual = b64urlDecode(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as DeviceJwtPayload & {
      exp?: number;
    };
    if (payload.typ !== "device" || !payload.sub || !payload.customerId) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      sub: payload.sub,
      customerId: payload.customerId,
      licenseId: payload.licenseId,
      activationId: payload.activationId,
      typ: "device",
    };
  } catch {
    return null;
  }
}

export function deviceFromAuthHeader(
  authorization: string | undefined,
  secret: string,
): DeviceJwtPayload | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  return verifyDeviceJwt(authorization.slice(7), secret);
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHmac("sha256", process.env.JWT_SECRET ?? "dev").update(token).digest("hex");
}

export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TTL_MS);
}
