import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { CustomerRecord, CustomerStatus } from "../types/commercial.js";
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

export class MemoryCommercialStore implements CommercialStore {
  private customers = new Map<string, CustomerRecord>();
  private customersByMobile = new Map<string, string>();
  private customersByEmail = new Map<string, string>();
  private otps = new Map<string, OtpTransaction>();

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
