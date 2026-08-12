import type { RefreshTokenRecord } from "../lib/device-jwt.js";
import { hashRefreshToken } from "../lib/device-jwt.js";

const refreshTokens = new Map<string, RefreshTokenRecord>();

export function storeRefreshToken(record: RefreshTokenRecord): void {
  refreshTokens.set(record.tokenHash, record);
}

export function findRefreshToken(token: string): RefreshTokenRecord | undefined {
  const hash = hashRefreshToken(token);
  const record = refreshTokens.get(hash);
  if (!record) return undefined;
  if (record.expiresAt.getTime() <= Date.now()) {
    refreshTokens.delete(hash);
    return undefined;
  }
  return record;
}

export function revokeRefreshToken(token: string): void {
  refreshTokens.delete(hashRefreshToken(token));
}
