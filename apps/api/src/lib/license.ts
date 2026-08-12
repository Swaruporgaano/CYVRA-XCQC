import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

const DOWNLOAD_TTL_MS = 15 * 60 * 1000;

/** Luhn check digit for 16-digit numeric license keys. */
function luhnCheckDigit(digits15: string): string {
  let sum = 0;
  for (let i = 0; i < digits15.length; i++) {
    let n = Number(digits15[i]);
    if ((digits15.length - i) % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return String((10 - (sum % 10)) % 10);
}

export function generateLicenseKey(): string {
  let key: string;
  do {
    const prefix = String(randomInt(1_000_000_000_000_000, 9_999_999_999_999_999));
    const body = prefix.slice(0, 15);
    key = body + luhnCheckDigit(body);
  } while (!isValidLicenseKeyFormat(key));
  return key;
}

export function isValidLicenseKeyFormat(key: string): boolean {
  if (!/^\d{16}$/.test(key)) return false;
  const body = key.slice(0, 15);
  return key[15] === luhnCheckDigit(body);
}

export function normalizeLicenseKey(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!isValidLicenseKeyFormat(digits)) {
    throw new Error("invalid_license_key");
  }
  return digits;
}

export function hashLicenseKey(key: string, pepper: string): string {
  return createHmac("sha256", pepper).update(key).digest("hex");
}

export function licenseKeyLast4(key: string): string {
  return key.slice(-4);
}

export function generateDownloadToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDownloadToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function downloadTokenExpiresAt(): Date {
  return new Date(Date.now() + DOWNLOAD_TTL_MS);
}

export function isDownloadTokenExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

export interface FingerprintInput {
  manufacturer?: string | null;
  model?: string | null;
  chassisSerial?: string | null;
  baseboardSerial?: string | null;
  systemUuid?: string | null;
  cpuId?: string | null;
  diskSerial?: string | null;
  [key: string]: unknown;
}

/** Canonical device fingerprint — stable hash of best-effort signals (SAME_DEVICE policy). */
export function computeDeviceFingerprint(input: FingerprintInput): string {
  const signals: string[] = [];
  const add = (label: string, val: unknown) => {
    if (val != null && String(val).trim()) {
      signals.push(`${label}:${String(val).trim().toLowerCase()}`);
    }
  };
  add("chassis", input.chassisSerial);
  add("board", input.baseboardSerial);
  add("uuid", input.systemUuid);
  add("cpu", input.cpuId);
  add("disk", input.diskSerial);
  add("mfr", input.manufacturer);
  add("model", input.model);
  if (signals.length === 0) {
    signals.push(`fallback:${JSON.stringify(input)}`);
  }
  signals.sort();
  return createHash("sha256").update(signals.join("|")).digest("hex");
}

export function hashSerial(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function isLicenseDevMode(): boolean {
  return process.env.LICENSE_DEV_MODE === "true";
}
