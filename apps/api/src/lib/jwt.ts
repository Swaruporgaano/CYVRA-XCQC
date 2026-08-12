import { createHmac, timingSafeEqual } from "node:crypto";

const JWT_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

export interface CustomerJwtPayload {
  sub: string;
  mobile: string;
  typ: "customer";
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function b64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export function signCustomerJwt(payload: CustomerJwtPayload, secret: string): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + JWT_TTL_SEC,
    }),
  );
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest();
  return `${header}.${body}.${b64url(sig)}`;
}

export function verifyCustomerJwt(token: string, secret: string): CustomerJwtPayload | null {
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
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as CustomerJwtPayload & {
      exp?: number;
      iat?: number;
    };
    if (payload.typ !== "customer" || !payload.sub || !payload.mobile) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub, mobile: payload.mobile, typ: "customer" };
  } catch {
    return null;
  }
}

export function customerFromAuthHeader(
  authorization: string | undefined,
  secret: string,
): CustomerJwtPayload | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  return verifyCustomerJwt(authorization.slice(7), secret);
}
