/**
 * CYVRA XCQC shared contracts — ReportPayload v1 + live session events.
 * Source of truth for agent upload and API ingest (DOCX: freeze schema first).
 */

export const REPORT_PAYLOAD_VERSION = "1.0.0" as const;

export type PlatformKind = "windows" | "android" | "unknown";
export type DeviceProfile = "laptop" | "desktop" | "server" | "phone" | "tablet" | "unknown";
export type CertificateCompleteness = "full" | "partial" | "blocked";

export type AuthenticityVerdict =
  | "Match"
  | "ChangedSinceLastScan"
  | "SpecMismatch"
  | "Suspicious"
  | "Unknown";

export type AuthenticityMethod =
  | "DirectSerial"
  | "SkuBaseline"
  | "Heuristic"
  | "OemAttestation";

export type FeasibilityClass = "D" | "H" | "P" | "L" | "N";

export interface EvidenceField {
  key: string;
  value: string | number | boolean | null;
  unit?: string;
  feasibility?: FeasibilityClass;
  notes?: string;
}

export interface ComponentAuthenticity {
  component: string;
  verdict: AuthenticityVerdict;
  confidence: number;
  evidence: EvidenceField[];
  method: AuthenticityMethod;
}

export interface PreflightCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "info" | "warn" | "block";
  detail?: string;
}

export interface MissingPrerequisite {
  code: string;
  message: string;
}

/** Wave A — identity / inventory (Windows WMI-first). */
export interface InventorySection {
  manufacturer?: string | null;
  model?: string | null;
  systemFamily?: string | null;
  biosVendor?: string | null;
  biosVersion?: string | null;
  biosReleaseDate?: string | null;
  baseboardManufacturer?: string | null;
  baseboardProduct?: string | null;
  baseboardSerial?: string | null;
  chassisSerial?: string | null;
  chassisAssetTag?: string | null;
  chassisType?: string | null;
  cpuName?: string | null;
  cpuCores?: number | null;
  cpuLogicalProcessors?: number | null;
  osCaption?: string | null;
  osVersion?: string | null;
  osBuild?: string | null;
  osArchitecture?: string | null;
  totalPhysicalMemoryBytes?: number | null;
  secureBootEnabled?: boolean | null;
  tpmPresent?: boolean | null;
  tpmSpecVersion?: string | null;
  isElevated?: boolean | null;
  isVirtualMachineSuspect?: boolean | null;
  ramModules: RamModule[];
  disks: DiskInventory[];
  volumes: VolumeInventory[];
}

export interface RamModule {
  capacityBytes: number | null;
  speedMhz: number | null;
  manufacturer: string | null;
  partNumber: string | null;
  serialNumber: string | null;
  bankLabel: string | null;
  deviceLocator: string | null;
}

export interface DiskInventory {
  index: number | null;
  model: string | null;
  serialNumber: string | null;
  sizeBytes: number | null;
  interfaceType: string | null;
  mediaType: string | null;
  partitions: number | null;
}

export interface VolumeInventory {
  deviceId: string | null;
  driveType: number | null;
  fileSystem: string | null;
  sizeBytes: number | null;
  freeBytes: number | null;
  volumeName: string | null;
}

/** Wave B — battery, SMART, security (Windows WMI-first). */
export interface BatteryHealth {
  present?: boolean | null;
  status?: string | null;
  designCapacityMwh?: number | null;
  fullChargeCapacityMwh?: number | null;
  cycleCount?: number | null;
  wearPercent?: number | null;
  estimatedChargeRemaining?: number | null;
  chemistry?: string | null;
  notes?: string[];
}

export interface SmartDiskHealth {
  diskIndex?: number | null;
  model?: string | null;
  serialNumber?: string | null;
  predictFailure?: boolean | null;
  failureReason?: string | null;
  powerOnHours?: number | null;
  wearLevel?: number | null;
  temperature?: number | null;
  healthStatus?: string | null;
  partialData?: boolean | null;
  notes?: string[];
}

export interface BitLockerVolume {
  driveLetter?: string | null;
  protectionStatus?: number | null;
  protectionStatusLabel?: string | null;
  conversionStatus?: number | null;
  conversionStatusLabel?: string | null;
  encryptionMethod?: string | null;
}

export interface SecurityHealth {
  tpmPresent?: boolean | null;
  tpmSpecVersion?: string | null;
  tpmReady?: boolean | null;
  secureBootEnabled?: boolean | null;
  bitLockerVolumes?: BitLockerVolume[];
  notes?: string[];
}

export interface HealthSection {
  battery?: BatteryHealth | null;
  smart?: SmartDiskHealth[] | null;
  security?: SecurityHealth | null;
  eventHealth?: Record<string, unknown> | null;
}

export interface CompositionDiff {
  component: string;
  previousSerial: string | null;
  currentSerial: string | null;
  changeType: "added" | "removed" | "changed";
}

export interface ModuleResult {
  moduleId: string;
  wave: "A" | "B" | "C" | "D" | "E";
  status: "pending" | "running" | "ok" | "warn" | "failed" | "skipped";
  startedAt?: string;
  finishedAt?: string;
  message?: string;
  evidenceKeys?: string[];
}

export interface ReportPayload {
  schemaVersion: typeof REPORT_PAYLOAD_VERSION | string;
  reportId: string;
  sessionId: string;
  orgId?: string | null;
  operatorId?: string | null;
  profile: DeviceProfile;
  platform: PlatformKind;
  agentVersion: string;
  collectedAt: string;
  timezone?: string | null;
  completeness: CertificateCompleteness;
  missingPrerequisites: MissingPrerequisite[];
  preflight: PreflightCheck[];
  modules: ModuleResult[];
  inventory: InventorySection;
  health?: HealthSection | null;
  compositionDiffs?: CompositionDiff[];
  authenticity?: ComponentAuthenticity[];
  agentBinaryHash?: string | null;
  payloadSha256?: string | null;
  rawNotes?: string | null;
}

export type SessionStatus =
  | "created"
  | "running"
  | "finalizing"
  | "completed"
  | "failed"
  | "abandoned";

export type SessionEventType =
  | "session.created"
  | "session.started"
  | "module.started"
  | "module.progress"
  | "module.finished"
  | "module.failed"
  | "heartbeat"
  | "preflight.completed"
  | "report.finalize"
  | "error";

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: SessionEventType;
  ts: string;
  moduleId?: string;
  percent?: number;
  message?: string;
  data?: Record<string, unknown>;
}

export interface CreateSessionRequest {
  orgId?: string;
  operatorId?: string;
  profile?: DeviceProfile;
  platform?: PlatformKind;
  agentVersion?: string;
  deviceHint?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  status: SessionStatus;
  createdAt: string;
  ingestTokenRequired: boolean;
}

export interface FinalizeSessionRequest {
  payload: ReportPayload;
}

export interface FinalizeSessionResponse {
  sessionId: string;
  status: SessionStatus;
  completeness: CertificateCompleteness;
  reportId: string;
  storedAt: string;
  /** MVP: no Neon / scoring yet — placeholder for Phase 1 certificate. */
  certificateId: string | null;
  message: string;
}

export const ADMIN_ROLES = [
  "PLATFORM_SUPER",
  "PLATFORM_SUPPORT",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPERVISOR",
  "OPERATOR",
  "AUDITOR",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_RANK: Record<AdminRole, number> = {
  PLATFORM_SUPER: 100,
  PLATFORM_SUPPORT: 90,
  TENANT_OWNER: 80,
  TENANT_ADMIN: 70,
  SUPERVISOR: 50,
  OPERATOR: 30,
  AUDITOR: 20,
};

/** Trade-in / warranty grade bands (server-side scoring owns final grade). */
export type GradeBand = "A" | "B" | "C" | "D" | "F" | "NFF" | "UNKNOWN";

export interface GradeResult {
  band: GradeBand;
  score: number | null;
  reasons: string[];
  scoredAt?: string;
  /** Never trust client-submitted price — server only. */
  priceHint?: number | null;
}

export type ReportFamily =
  | "post_production"
  | "oqc_iqc"
  | "business"
  | "compliance";

export type TestProfile =
  | "quick"
  | "standard"
  | "iqc"
  | "oqc"
  | "trade_in"
  | "warranty"
  | "server";

export interface TenantSummary {
  tenantId: string;
  name: string;
  status: "active" | "suspended";
  createdAt: string;
}

export interface UserSummary {
  userId: string;
  email: string;
  displayName: string;
  role: AdminRole;
  tenantId: string | null;
}

export interface LicensePool {
  tenantId: string;
  creditsRemaining: number;
  creditsTotal: number;
  plan: string;
}

export interface CertificateStub {
  certificateId: string;
  sessionId: string;
  reportId: string;
  tenantId?: string | null;
  completeness: CertificateCompleteness;
  grade?: GradeResult | null;
  issuedAt: string;
  verifyUrl?: string | null;
}

export function roleAtLeast(role: AdminRole, minimum: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** L3 — commercial license API DTOs (customer portal + Electron). */
export type LicenseKeyStatus = "available" | "activated" | "revoked";

export interface LicenseSummary {
  id: string;
  keyLast4: string;
  status: LicenseKeyStatus;
  createdAt: string;
  activatedAt?: string | null;
}

export interface ActivationSummary {
  id: string;
  status: "active" | "revoked" | "suspended";
  deviceId: string;
  activatedAt: string;
  lastSeenAt?: string | null;
}

export interface LicenseStatusResponse {
  licenses: Array<LicenseSummary & { activation?: ActivationSummary | null }>;
  policy: "SAME_DEVICE";
  downloadTokenTtlMinutes: number;
}

export interface DeviceFingerprintInput {
  manufacturer?: string | null;
  model?: string | null;
  chassisSerial?: string | null;
  baseboardSerial?: string | null;
  systemUuid?: string | null;
  cpuId?: string | null;
  diskSerial?: string | null;
}

export interface ActivateLicenseRequest {
  mobile: string;
  licenseKey: string;
  otp: string;
  otpId?: string;
  fingerprint: DeviceFingerprintInput;
  agentVersion?: string;
}

export interface ActivateLicenseResponse {
  activation: ActivationSummary;
  device: { id: string; fingerprint: string };
  deviceToken: string;
  refreshToken: string;
  reactivated?: boolean;
  message?: string;
}
