/**
 * Commercial identity types — schema-aligned stubs for L2+ API work.
 * Tables: see apps/api/sql/neon-schema-l1-commercial.sql
 */
export type CustomerStatus = "pending" | "active" | "suspended";

export type LicenseKeyStatus = "available" | "activated" | "revoked";

export type AgentActivationStatus = "active" | "revoked" | "suspended";

export type DeviceScanStatus = "in_progress" | "completed" | "failed";

export type FunctionalTestResult =
  | "AUTOMATED_PASS"
  | "AUTOMATED_FAIL"
  | "NOT_TESTED"
  | "OPERATOR_VERIFIED"
  | "NOT_SUPPORTED";

export interface CustomerRecord {
  id: string;
  name?: string | null;
  mobile: string;
  email?: string | null;
  status: CustomerStatus;
  createdAt: string;
}

export interface LicenseKeyRecord {
  id: string;
  customerId: string;
  keyHash: string;
  keyLast4: string;
  status: LicenseKeyStatus;
  createdAt: string;
  activatedAt?: string | null;
}

export interface DeviceRecord {
  id: string;
  customerId: string;
  manufacturer?: string | null;
  model?: string | null;
  deviceFingerprint: string;
  firstSeenAt: string;
  lastSeenAt: string;
}
