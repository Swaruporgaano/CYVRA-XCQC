import { randomUUID } from "node:crypto";
import type pg from "pg";
import type {
  AgentActivationRecord,
  AgentActivationStatus,
  AuditLogRecord,
  CustomerRecord,
  CustomerStatus,
  DeviceRecord,
  DownloadTokenRecord,
  LicenseKeyRecord,
  LicenseKeyStatus,
} from "../types/commercial.js";
import { getPgPool, isNeonConfigured } from "./neon.js";

export interface OtpTransaction {
  id: string;
  mobile: string;
  otpHash: string;
  expiresAt: Date;
  attemptCount: number;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface CommercialStore {
  ping(): Promise<void>;
  findCustomerByMobile(mobile: string): Promise<CustomerRecord | undefined>;
  findCustomerByEmail(email: string): Promise<CustomerRecord | undefined>;
  findCustomerById(id: string): Promise<CustomerRecord | undefined>;
  createCustomer(input: {
    mobile: string;
    email?: string | null;
    name?: string | null;
    status?: CustomerStatus;
  }): Promise<CustomerRecord>;
  updateCustomerStatus(id: string, status: CustomerStatus): Promise<CustomerRecord | undefined>;
  createOtpTransaction(mobile: string, otpHash: string, expiresAt: Date): Promise<OtpTransaction>;
  findOtpTransaction(id: string): Promise<OtpTransaction | undefined>;
  findLatestOtpForMobile(mobile: string): Promise<OtpTransaction | undefined>;
  incrementOtpAttempts(id: string): Promise<OtpTransaction | undefined>;
  markOtpUsed(id: string): Promise<void>;
  countRecentOtpRequests(mobile: string, since: Date): Promise<number>;

  listLicensesByCustomer(customerId: string): Promise<LicenseKeyRecord[]>;
  createLicenseKey(
    customerId: string,
    keyHash: string,
    keyLast4: string,
  ): Promise<LicenseKeyRecord>;
  findLicenseById(id: string): Promise<LicenseKeyRecord | undefined>;
  findLicenseByHash(keyHash: string): Promise<LicenseKeyRecord | undefined>;
  updateLicenseStatus(
    id: string,
    status: LicenseKeyStatus,
    activatedAt?: Date,
  ): Promise<LicenseKeyRecord | undefined>;

  createDownloadToken(
    customerId: string,
    licenseId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<DownloadTokenRecord>;
  findDownloadTokenByHash(tokenHash: string): Promise<DownloadTokenRecord | undefined>;
  consumeDownloadToken(id: string): Promise<void>;

  findDeviceByFingerprint(fingerprint: string): Promise<DeviceRecord | undefined>;
  createDevice(input: {
    customerId: string;
    manufacturer?: string | null;
    model?: string | null;
    serialHash?: string | null;
    uuidHash?: string | null;
    deviceFingerprint: string;
  }): Promise<DeviceRecord>;
  touchDevice(id: string): Promise<void>;

  findActivationByLicense(licenseId: string): Promise<AgentActivationRecord | undefined>;
  findActivationByDevice(deviceId: string): Promise<AgentActivationRecord | undefined>;
  createAgentActivation(input: {
    customerId: string;
    licenseId: string;
    deviceId: string;
    agentVersion?: string | null;
  }): Promise<AgentActivationRecord>;
  updateActivationLastSeen(id: string): Promise<void>;

  createAuditLog(input: {
    customerId?: string | null;
    event: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<AuditLogRecord>;
}

function rowToCustomer(row: {
  id: string;
  name: string | null;
  mobile: string;
  email: string | null;
  status: string;
  created_at: Date;
}): CustomerRecord {
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    status: row.status as CustomerStatus,
    createdAt: row.created_at.toISOString(),
  };
}

function rowToOtp(row: {
  id: string;
  mobile: string;
  otp_hash: string;
  expires_at: Date;
  attempt_count: number;
  used_at: Date | null;
  created_at: Date;
}): OtpTransaction {
  return {
    id: row.id,
    mobile: row.mobile,
    otpHash: row.otp_hash,
    expiresAt: row.expires_at,
    attemptCount: row.attempt_count,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

function rowToLicense(row: {
  id: string;
  customer_id: string;
  key_hash: string;
  key_last4: string;
  status: string;
  created_at: Date;
  activated_at: Date | null;
}): LicenseKeyRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    keyHash: row.key_hash,
    keyLast4: row.key_last4,
    status: row.status as LicenseKeyStatus,
    createdAt: row.created_at.toISOString(),
    activatedAt: row.activated_at?.toISOString() ?? null,
  };
}

function rowToDownloadToken(row: {
  id: string;
  customer_id: string;
  license_id: string;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}): DownloadTokenRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    licenseId: row.license_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at.toISOString(),
    consumedAt: row.consumed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

function rowToDevice(row: {
  id: string;
  customer_id: string;
  manufacturer: string | null;
  model: string | null;
  serial_hash: string | null;
  uuid_hash: string | null;
  device_fingerprint: string;
  first_seen_at: Date;
  last_seen_at: Date;
}): DeviceRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    manufacturer: row.manufacturer,
    model: row.model,
    serialHash: row.serial_hash,
    uuidHash: row.uuid_hash,
    deviceFingerprint: row.device_fingerprint,
    firstSeenAt: row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
  };
}

function rowToActivation(row: {
  id: string;
  customer_id: string;
  license_id: string;
  device_id: string;
  agent_version: string | null;
  status: string;
  activated_at: Date;
  last_seen_at: Date | null;
}): AgentActivationRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    licenseId: row.license_id,
    deviceId: row.device_id,
    agentVersion: row.agent_version,
    status: row.status as AgentActivationStatus,
    activatedAt: row.activated_at.toISOString(),
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
  };
}

export class MemoryCommercialStore implements CommercialStore {
  private customers = new Map<string, CustomerRecord>();
  private customersByMobile = new Map<string, string>();
  private customersByEmail = new Map<string, string>();
  private otps = new Map<string, OtpTransaction>();
  private licenses = new Map<string, LicenseKeyRecord>();
  private licensesByHash = new Map<string, string>();
  private downloadTokens = new Map<string, DownloadTokenRecord>();
  private downloadTokensByHash = new Map<string, string>();
  private devices = new Map<string, DeviceRecord>();
  private devicesByFingerprint = new Map<string, string>();
  private activations = new Map<string, AgentActivationRecord>();
  private activationsByLicense = new Map<string, string>();
  private auditLogs: AuditLogRecord[] = [];

  async ping(): Promise<void> {}

  async findCustomerByMobile(mobile: string): Promise<CustomerRecord | undefined> {
    const id = this.customersByMobile.get(mobile);
    return id ? this.customers.get(id) : undefined;
  }

  async findCustomerByEmail(email: string): Promise<CustomerRecord | undefined> {
    const id = this.customersByEmail.get(email);
    return id ? this.customers.get(id) : undefined;
  }

  async findCustomerById(id: string): Promise<CustomerRecord | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(input: {
    mobile: string;
    email?: string | null;
    name?: string | null;
    status?: CustomerStatus;
  }): Promise<CustomerRecord> {
    const record: CustomerRecord = {
      id: randomUUID(),
      mobile: input.mobile,
      email: input.email ?? null,
      name: input.name ?? null,
      status: input.status ?? "pending",
      createdAt: new Date().toISOString(),
    };
    this.customers.set(record.id, record);
    this.customersByMobile.set(record.mobile, record.id);
    if (record.email) this.customersByEmail.set(record.email, record.id);
    return structuredClone(record);
  }

  async updateCustomerStatus(id: string, status: CustomerStatus): Promise<CustomerRecord | undefined> {
    const current = this.customers.get(id);
    if (!current) return undefined;
    const updated = { ...current, status };
    this.customers.set(id, updated);
    return structuredClone(updated);
  }

  async createOtpTransaction(mobile: string, otpHash: string, expiresAt: Date): Promise<OtpTransaction> {
    const tx: OtpTransaction = {
      id: randomUUID(),
      mobile,
      otpHash,
      expiresAt,
      attemptCount: 0,
      usedAt: null,
      createdAt: new Date(),
    };
    this.otps.set(tx.id, tx);
    return structuredClone(tx);
  }

  async findOtpTransaction(id: string): Promise<OtpTransaction | undefined> {
    const tx = this.otps.get(id);
    return tx ? structuredClone(tx) : undefined;
  }

  async findLatestOtpForMobile(mobile: string): Promise<OtpTransaction | undefined> {
    const list = [...this.otps.values()]
      .filter((t) => t.mobile === mobile && !t.usedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list[0] ? structuredClone(list[0]) : undefined;
  }

  async incrementOtpAttempts(id: string): Promise<OtpTransaction | undefined> {
    const tx = this.otps.get(id);
    if (!tx) return undefined;
    tx.attemptCount += 1;
    return structuredClone(tx);
  }

  async markOtpUsed(id: string): Promise<void> {
    const tx = this.otps.get(id);
    if (tx) tx.usedAt = new Date();
  }

  async countRecentOtpRequests(mobile: string, since: Date): Promise<number> {
    return [...this.otps.values()].filter(
      (t) => t.mobile === mobile && t.createdAt.getTime() >= since.getTime(),
    ).length;
  }

  async listLicensesByCustomer(customerId: string): Promise<LicenseKeyRecord[]> {
    return [...this.licenses.values()]
      .filter((l) => l.customerId === customerId)
      .map((l) => structuredClone(l));
  }

  async createLicenseKey(
    customerId: string,
    keyHash: string,
    keyLast4: string,
  ): Promise<LicenseKeyRecord> {
    const record: LicenseKeyRecord = {
      id: randomUUID(),
      customerId,
      keyHash,
      keyLast4,
      status: "available",
      createdAt: new Date().toISOString(),
      activatedAt: null,
    };
    this.licenses.set(record.id, record);
    this.licensesByHash.set(keyHash, record.id);
    return structuredClone(record);
  }

  async findLicenseById(id: string): Promise<LicenseKeyRecord | undefined> {
    const l = this.licenses.get(id);
    return l ? structuredClone(l) : undefined;
  }

  async findLicenseByHash(keyHash: string): Promise<LicenseKeyRecord | undefined> {
    const id = this.licensesByHash.get(keyHash);
    return id ? this.findLicenseById(id) : undefined;
  }

  async updateLicenseStatus(
    id: string,
    status: LicenseKeyStatus,
    activatedAt?: Date,
  ): Promise<LicenseKeyRecord | undefined> {
    const current = this.licenses.get(id);
    if (!current) return undefined;
    const updated: LicenseKeyRecord = {
      ...current,
      status,
      activatedAt: activatedAt?.toISOString() ?? current.activatedAt,
    };
    this.licenses.set(id, updated);
    return structuredClone(updated);
  }

  async createDownloadToken(
    customerId: string,
    licenseId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<DownloadTokenRecord> {
    const record: DownloadTokenRecord = {
      id: randomUUID(),
      customerId,
      licenseId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      consumedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.downloadTokens.set(record.id, record);
    this.downloadTokensByHash.set(tokenHash, record.id);
    return structuredClone(record);
  }

  async findDownloadTokenByHash(tokenHash: string): Promise<DownloadTokenRecord | undefined> {
    const id = this.downloadTokensByHash.get(tokenHash);
    const t = id ? this.downloadTokens.get(id) : undefined;
    return t ? structuredClone(t) : undefined;
  }

  async consumeDownloadToken(id: string): Promise<void> {
    const t = this.downloadTokens.get(id);
    if (t) t.consumedAt = new Date().toISOString();
  }

  async findDeviceByFingerprint(fingerprint: string): Promise<DeviceRecord | undefined> {
    const id = this.devicesByFingerprint.get(fingerprint);
    const d = id ? this.devices.get(id) : undefined;
    return d ? structuredClone(d) : undefined;
  }

  async createDevice(input: {
    customerId: string;
    manufacturer?: string | null;
    model?: string | null;
    serialHash?: string | null;
    uuidHash?: string | null;
    deviceFingerprint: string;
  }): Promise<DeviceRecord> {
    const now = new Date().toISOString();
    const record: DeviceRecord = {
      id: randomUUID(),
      customerId: input.customerId,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      serialHash: input.serialHash ?? null,
      uuidHash: input.uuidHash ?? null,
      deviceFingerprint: input.deviceFingerprint,
      firstSeenAt: now,
      lastSeenAt: now,
    };
    this.devices.set(record.id, record);
    this.devicesByFingerprint.set(record.deviceFingerprint, record.id);
    return structuredClone(record);
  }

  async touchDevice(id: string): Promise<void> {
    const d = this.devices.get(id);
    if (d) d.lastSeenAt = new Date().toISOString();
  }

  async findActivationByLicense(licenseId: string): Promise<AgentActivationRecord | undefined> {
    const id = this.activationsByLicense.get(licenseId);
    const a = id ? this.activations.get(id) : undefined;
    return a ? structuredClone(a) : undefined;
  }

  async findActivationByDevice(deviceId: string): Promise<AgentActivationRecord | undefined> {
    return [...this.activations.values()].find((a) => a.deviceId === deviceId);
  }

  async createAgentActivation(input: {
    customerId: string;
    licenseId: string;
    deviceId: string;
    agentVersion?: string | null;
  }): Promise<AgentActivationRecord> {
    const record: AgentActivationRecord = {
      id: randomUUID(),
      customerId: input.customerId,
      licenseId: input.licenseId,
      deviceId: input.deviceId,
      agentVersion: input.agentVersion ?? null,
      status: "active",
      activatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    this.activations.set(record.id, record);
    this.activationsByLicense.set(input.licenseId, record.id);
    return structuredClone(record);
  }

  async updateActivationLastSeen(id: string): Promise<void> {
    const a = this.activations.get(id);
    if (a) a.lastSeenAt = new Date().toISOString();
  }

  async createAuditLog(input: {
    customerId?: string | null;
    event: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      id: randomUUID(),
      customerId: input.customerId ?? null,
      event: input.event,
      metadata: input.metadata ?? null,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.push(record);
    return structuredClone(record);
  }
}

export class NeonCommercialStore implements CommercialStore {
  constructor(private readonly db: pg.Pool) {}

  async ping(): Promise<void> {
    await this.db.query("SELECT 1");
  }

  async findCustomerByMobile(mobile: string): Promise<CustomerRecord | undefined> {
    const res = await this.db.query(
      `SELECT id, name, mobile, email, status, created_at FROM customers WHERE mobile = $1`,
      [mobile],
    );
    if (res.rowCount === 0) return undefined;
    return rowToCustomer(res.rows[0]!);
  }

  async findCustomerByEmail(email: string): Promise<CustomerRecord | undefined> {
    const res = await this.db.query(
      `SELECT id, name, mobile, email, status, created_at FROM customers WHERE email = $1`,
      [email],
    );
    if (res.rowCount === 0) return undefined;
    return rowToCustomer(res.rows[0]!);
  }

  async findCustomerById(id: string): Promise<CustomerRecord | undefined> {
    const res = await this.db.query(
      `SELECT id, name, mobile, email, status, created_at FROM customers WHERE id = $1::uuid`,
      [id],
    );
    if (res.rowCount === 0) return undefined;
    return rowToCustomer(res.rows[0]!);
  }

  async createCustomer(input: {
    mobile: string;
    email?: string | null;
    name?: string | null;
    status?: CustomerStatus;
  }): Promise<CustomerRecord> {
    const res = await this.db.query(
      `INSERT INTO customers (mobile, email, name, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, mobile, email, status, created_at`,
      [input.mobile, input.email ?? null, input.name ?? null, input.status ?? "pending"],
    );
    return rowToCustomer(res.rows[0]!);
  }

  async updateCustomerStatus(id: string, status: CustomerStatus): Promise<CustomerRecord | undefined> {
    const res = await this.db.query(
      `UPDATE customers SET status = $2 WHERE id = $1::uuid
       RETURNING id, name, mobile, email, status, created_at`,
      [id, status],
    );
    if (res.rowCount === 0) return undefined;
    return rowToCustomer(res.rows[0]!);
  }

  async createOtpTransaction(mobile: string, otpHash: string, expiresAt: Date): Promise<OtpTransaction> {
    const res = await this.db.query(
      `INSERT INTO otp_transactions (mobile, otp_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, mobile, otp_hash, expires_at, attempt_count, used_at, created_at`,
      [mobile, otpHash, expiresAt],
    );
    return rowToOtp(res.rows[0]!);
  }

  async findOtpTransaction(id: string): Promise<OtpTransaction | undefined> {
    const res = await this.db.query(
      `SELECT id, mobile, otp_hash, expires_at, attempt_count, used_at, created_at
       FROM otp_transactions WHERE id = $1::uuid`,
      [id],
    );
    if (res.rowCount === 0) return undefined;
    return rowToOtp(res.rows[0]!);
  }

  async findLatestOtpForMobile(mobile: string): Promise<OtpTransaction | undefined> {
    const res = await this.db.query(
      `SELECT id, mobile, otp_hash, expires_at, attempt_count, used_at, created_at
       FROM otp_transactions
       WHERE mobile = $1 AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [mobile],
    );
    if (res.rowCount === 0) return undefined;
    return rowToOtp(res.rows[0]!);
  }

  async incrementOtpAttempts(id: string): Promise<OtpTransaction | undefined> {
    const res = await this.db.query(
      `UPDATE otp_transactions SET attempt_count = attempt_count + 1
       WHERE id = $1::uuid
       RETURNING id, mobile, otp_hash, expires_at, attempt_count, used_at, created_at`,
      [id],
    );
    if (res.rowCount === 0) return undefined;
    return rowToOtp(res.rows[0]!);
  }

  async markOtpUsed(id: string): Promise<void> {
    await this.db.query(`UPDATE otp_transactions SET used_at = now() WHERE id = $1::uuid`, [id]);
  }

  async countRecentOtpRequests(mobile: string, since: Date): Promise<number> {
    const res = await this.db.query(
      `SELECT COUNT(*)::int AS c FROM otp_transactions WHERE mobile = $1 AND created_at >= $2`,
      [mobile, since],
    );
    return res.rows[0]?.c ?? 0;
  }

  async listLicensesByCustomer(customerId: string): Promise<LicenseKeyRecord[]> {
    const res = await this.db.query(
      `SELECT id, customer_id, key_hash, key_last4, status, created_at, activated_at
       FROM license_keys WHERE customer_id = $1::uuid ORDER BY created_at DESC`,
      [customerId],
    );
    return res.rows.map(rowToLicense);
  }

  async createLicenseKey(
    customerId: string,
    keyHash: string,
    keyLast4: string,
  ): Promise<LicenseKeyRecord> {
    const res = await this.db.query(
      `INSERT INTO license_keys (customer_id, key_hash, key_last4)
       VALUES ($1::uuid, $2, $3)
       RETURNING id, customer_id, key_hash, key_last4, status, created_at, activated_at`,
      [customerId, keyHash, keyLast4],
    );
    return rowToLicense(res.rows[0]!);
  }

  async findLicenseById(id: string): Promise<LicenseKeyRecord | undefined> {
    const res = await this.db.query(
      `SELECT id, customer_id, key_hash, key_last4, status, created_at, activated_at
       FROM license_keys WHERE id = $1::uuid`,
      [id],
    );
    if (res.rowCount === 0) return undefined;
    return rowToLicense(res.rows[0]!);
  }

  async findLicenseByHash(keyHash: string): Promise<LicenseKeyRecord | undefined> {
    const res = await this.db.query(
      `SELECT id, customer_id, key_hash, key_last4, status, created_at, activated_at
       FROM license_keys WHERE key_hash = $1`,
      [keyHash],
    );
    if (res.rowCount === 0) return undefined;
    return rowToLicense(res.rows[0]!);
  }

  async updateLicenseStatus(
    id: string,
    status: LicenseKeyStatus,
    activatedAt?: Date,
  ): Promise<LicenseKeyRecord | undefined> {
    const res = await this.db.query(
      `UPDATE license_keys SET status = $2, activated_at = COALESCE($3, activated_at)
       WHERE id = $1::uuid
       RETURNING id, customer_id, key_hash, key_last4, status, created_at, activated_at`,
      [id, status, activatedAt ?? null],
    );
    if (res.rowCount === 0) return undefined;
    return rowToLicense(res.rows[0]!);
  }

  async createDownloadToken(
    customerId: string,
    licenseId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<DownloadTokenRecord> {
    const res = await this.db.query(
      `INSERT INTO download_tokens (customer_id, license_id, token_hash, expires_at)
       VALUES ($1::uuid, $2::uuid, $3, $4)
       RETURNING id, customer_id, license_id, token_hash, expires_at, consumed_at, created_at`,
      [customerId, licenseId, tokenHash, expiresAt],
    );
    return rowToDownloadToken(res.rows[0]!);
  }

  async findDownloadTokenByHash(tokenHash: string): Promise<DownloadTokenRecord | undefined> {
    const res = await this.db.query(
      `SELECT id, customer_id, license_id, token_hash, expires_at, consumed_at, created_at
       FROM download_tokens WHERE token_hash = $1`,
      [tokenHash],
    );
    if (res.rowCount === 0) return undefined;
    return rowToDownloadToken(res.rows[0]!);
  }

  async consumeDownloadToken(id: string): Promise<void> {
    await this.db.query(`UPDATE download_tokens SET consumed_at = now() WHERE id = $1::uuid`, [id]);
  }

  async findDeviceByFingerprint(fingerprint: string): Promise<DeviceRecord | undefined> {
    const res = await this.db.query(
      `SELECT id, customer_id, manufacturer, model, serial_hash, uuid_hash, device_fingerprint,
              first_seen_at, last_seen_at
       FROM devices WHERE device_fingerprint = $1`,
      [fingerprint],
    );
    if (res.rowCount === 0) return undefined;
    return rowToDevice(res.rows[0]!);
  }

  async createDevice(input: {
    customerId: string;
    manufacturer?: string | null;
    model?: string | null;
    serialHash?: string | null;
    uuidHash?: string | null;
    deviceFingerprint: string;
  }): Promise<DeviceRecord> {
    const res = await this.db.query(
      `INSERT INTO devices (customer_id, manufacturer, model, serial_hash, uuid_hash, device_fingerprint)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)
       RETURNING id, customer_id, manufacturer, model, serial_hash, uuid_hash, device_fingerprint,
                 first_seen_at, last_seen_at`,
      [
        input.customerId,
        input.manufacturer ?? null,
        input.model ?? null,
        input.serialHash ?? null,
        input.uuidHash ?? null,
        input.deviceFingerprint,
      ],
    );
    return rowToDevice(res.rows[0]!);
  }

  async touchDevice(id: string): Promise<void> {
    await this.db.query(`UPDATE devices SET last_seen_at = now() WHERE id = $1::uuid`, [id]);
  }

  async findActivationByLicense(licenseId: string): Promise<AgentActivationRecord | undefined> {
    const res = await this.db.query(
      `SELECT id, customer_id, license_id, device_id, agent_version, status, activated_at, last_seen_at
       FROM agent_activations WHERE license_id = $1::uuid`,
      [licenseId],
    );
    if (res.rowCount === 0) return undefined;
    return rowToActivation(res.rows[0]!);
  }

  async findActivationByDevice(deviceId: string): Promise<AgentActivationRecord | undefined> {
    const res = await this.db.query(
      `SELECT id, customer_id, license_id, device_id, agent_version, status, activated_at, last_seen_at
       FROM agent_activations WHERE device_id = $1::uuid ORDER BY activated_at DESC LIMIT 1`,
      [deviceId],
    );
    if (res.rowCount === 0) return undefined;
    return rowToActivation(res.rows[0]!);
  }

  async createAgentActivation(input: {
    customerId: string;
    licenseId: string;
    deviceId: string;
    agentVersion?: string | null;
  }): Promise<AgentActivationRecord> {
    const res = await this.db.query(
      `INSERT INTO agent_activations (customer_id, license_id, device_id, agent_version)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
       RETURNING id, customer_id, license_id, device_id, agent_version, status, activated_at, last_seen_at`,
      [input.customerId, input.licenseId, input.deviceId, input.agentVersion ?? null],
    );
    return rowToActivation(res.rows[0]!);
  }

  async updateActivationLastSeen(id: string): Promise<void> {
    await this.db.query(`UPDATE agent_activations SET last_seen_at = now() WHERE id = $1::uuid`, [
      id,
    ]);
  }

  async createAuditLog(input: {
    customerId?: string | null;
    event: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<AuditLogRecord> {
    const res = await this.db.query(
      `INSERT INTO audit_logs (customer_id, event, metadata)
       VALUES ($1::uuid, $2, $3)
       RETURNING id, customer_id, event, metadata, created_at`,
      [input.customerId ?? null, input.event, input.metadata ? JSON.stringify(input.metadata) : null],
    );
    const row = res.rows[0]!;
    return {
      id: row.id,
      customerId: row.customer_id,
      event: row.event,
      metadata: row.metadata,
      createdAt: row.created_at.toISOString(),
    };
  }
}

export async function createCommercialStore(): Promise<{
  store: CommercialStore;
  mode: "memory" | "neon";
}> {
  if (isNeonConfigured()) {
    try {
      const pool = getPgPool()!;
      const neon = new NeonCommercialStore(pool);
      await neon.ping();
      console.log("[xcqc-api] commercial store=neon");
      return { store: neon, mode: "neon" };
    } catch (err) {
      console.warn("[xcqc-api] commercial Neon failed — memory fallback:", err);
    }
  }
  console.log("[xcqc-api] commercial store=memory");
  return { store: new MemoryCommercialStore(), mode: "memory" };
}
