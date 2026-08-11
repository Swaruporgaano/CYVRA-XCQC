import pg from "pg";
import type { SessionEvent, SessionStatus } from "@cyvra/xcqc-shared";
import type { SessionRecord } from "../types/session.js";
import type { SessionStore } from "./sessions.js";
import { MemorySessionStore } from "./sessions.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPgPool(): pg.Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: url.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
    pool.on("error", (err) => {
      console.error("[xcqc-api] pg pool error", err);
    });
  }
  return pool;
}

export async function closePgPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Optional Neon-backed session store — falls back to memory if DATABASE_URL unset or connect fails. */
export async function createSessionStore(): Promise<{
  store: SessionStore;
  mode: "memory" | "file" | "neon";
}> {
  const explicit = (process.env.XCQC_STORE ?? "memory").toLowerCase();

  if (isNeonConfigured()) {
    try {
      const neon = new NeonSessionStore(getPgPool()!);
      await neon.ping();
      console.log("[xcqc-api] store=neon (DATABASE_URL)");
      return { store: neon, mode: "neon" };
    } catch (err) {
      console.warn("[xcqc-api] Neon connect failed — falling back:", err);
    }
  }

  if (explicit === "file") {
    const { FileSessionStore } = await import("./sessions.js");
    const dataDir = process.env.DATA_DIR ?? "./data";
    console.log(`[xcqc-api] store=file dataDir=${dataDir}`);
    return { store: new FileSessionStore(dataDir), mode: "file" };
  }

  console.log("[xcqc-api] store=memory (ephemeral — lost on restart / Render sleep)");
  return { store: new MemorySessionStore(), mode: "memory" };
}

type SessionRow = {
  session_id: string;
  tenant_id: string | null;
  operator_id: string | null;
  status: string;
  profile: string | null;
  platform: string | null;
  agent_version: string | null;
  completeness: string | null;
  certificate_id: string | null;
  created_at: Date;
  updated_at: Date;
};

function rowToSession(row: SessionRow, events: SessionEvent[], report?: SessionRecord["report"]): SessionRecord {
  return {
    sessionId: row.session_id,
    status: row.status as SessionStatus,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    orgId: row.tenant_id ?? undefined,
    operatorId: row.operator_id ?? undefined,
    profile: (row.profile as SessionRecord["profile"]) ?? "unknown",
    platform: (row.platform as SessionRecord["platform"]) ?? "windows",
    agentVersion: row.agent_version ?? undefined,
    completeness: (row.completeness as SessionRecord["completeness"]) ?? undefined,
    certificateId: row.certificate_id,
    events,
    report,
  };
}

export class NeonSessionStore implements SessionStore {
  constructor(private readonly db: pg.Pool) {}

  async ping(): Promise<void> {
    await this.db.query("SELECT 1");
  }

  async create(session: SessionRecord): Promise<SessionRecord> {
    await this.db.query(
      `INSERT INTO test_sessions (
        session_id, tenant_id, operator_id, status, profile, platform, agent_version, completeness, certificate_id
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        session.sessionId,
        session.orgId ?? null,
        session.operatorId ?? null,
        session.status,
        session.profile,
        session.platform,
        session.agentVersion ?? null,
        session.completeness ?? null,
        session.certificateId ?? null,
      ],
    );

    for (const ev of session.events) {
      await this.insertEvent(session.sessionId, ev);
    }

    return structuredClone(session);
  }

  async get(sessionId: string): Promise<SessionRecord | undefined> {
    const sess = await this.db.query<SessionRow>(
      `SELECT session_id, tenant_id, operator_id, status, profile, platform, agent_version,
              completeness, certificate_id, created_at, updated_at
       FROM test_sessions WHERE session_id = $1::uuid`,
      [sessionId],
    );
    if (sess.rowCount === 0) return undefined;
    const row = sess.rows[0]!;
    const events = await this.loadEvents(sessionId);
    const report = await this.loadReport(sessionId);
    return rowToSession(row, events, report);
  }

  async update(
    sessionId: string,
    mutator: (s: SessionRecord) => void,
  ): Promise<SessionRecord | undefined> {
    const current = await this.get(sessionId);
    if (!current) return undefined;

    const beforeEventCount = current.events.length;
    mutator(current);
    current.updatedAt = new Date().toISOString();

    await this.db.query(
      `UPDATE test_sessions SET
        status = $2, profile = $3, platform = $4, agent_version = $5,
        completeness = $6, certificate_id = $7, tenant_id = $8, operator_id = $9, updated_at = now()
       WHERE session_id = $1::uuid`,
      [
        sessionId,
        current.status,
        current.profile,
        current.platform,
        current.agentVersion ?? null,
        current.completeness ?? null,
        current.certificateId ?? null,
        current.orgId ?? null,
        current.operatorId ?? null,
      ],
    );

    const newEvents = current.events.slice(beforeEventCount);
    for (const ev of newEvents) {
      await this.insertEvent(sessionId, ev);
    }

    if (current.report) {
      await this.db.query(
        `INSERT INTO reports (report_id, session_id, payload, payload_sha256)
         VALUES ($1::uuid, $2::uuid, $3::jsonb, $4)
         ON CONFLICT (report_id) DO UPDATE SET payload = EXCLUDED.payload, payload_sha256 = EXCLUDED.payload_sha256`,
        [
          current.report.reportId,
          sessionId,
          JSON.stringify(current.report),
          current.report.payloadSha256 ?? null,
        ],
      );

      if (current.certificateId) {
        await this.db.query(
          `INSERT INTO certificates (certificate_id, session_id, report_id, completeness)
           VALUES ($1, $2::uuid, $3::uuid, $4)
           ON CONFLICT (certificate_id) DO NOTHING`,
          [
            current.certificateId,
            sessionId,
            current.report.reportId,
            current.completeness ?? current.report.completeness,
          ],
        );
      }
    }

    return structuredClone(current);
  }

  async list(limit = 50): Promise<SessionRecord[]> {
    const sess = await this.db.query<SessionRow>(
      `SELECT session_id, tenant_id, operator_id, status, profile, platform, agent_version,
              completeness, certificate_id, created_at, updated_at
       FROM test_sessions ORDER BY updated_at DESC LIMIT $1`,
      [limit],
    );
    const out: SessionRecord[] = [];
    for (const row of sess.rows) {
      const events = await this.loadEvents(row.session_id);
      out.push(rowToSession(row, events));
    }
    return out;
  }

  private async loadEvents(sessionId: string): Promise<SessionEvent[]> {
    const res = await this.db.query<{
      event_id: string;
      event_type: string;
      module_id: string | null;
      percent: number | null;
      message: string | null;
      data: Record<string, unknown> | null;
      ts: Date;
    }>(
      `SELECT event_id, event_type, module_id, percent, message, data, ts
       FROM session_events WHERE session_id = $1::uuid ORDER BY ts ASC`,
      [sessionId],
    );
    return res.rows.map((r) => ({
      id: r.event_id,
      sessionId,
      type: r.event_type as SessionEvent["type"],
      moduleId: r.module_id ?? undefined,
      percent: r.percent ?? undefined,
      message: r.message ?? undefined,
      data: r.data ?? undefined,
      ts: r.ts.toISOString(),
    }));
  }

  private async loadReport(sessionId: string): Promise<SessionRecord["report"]> {
    const res = await this.db.query<{ payload: SessionRecord["report"] }>(
      `SELECT payload FROM reports WHERE session_id = $1::uuid ORDER BY created_at DESC LIMIT 1`,
      [sessionId],
    );
    if (res.rowCount === 0) return undefined;
    return res.rows[0]!.payload;
  }

  private async insertEvent(sessionId: string, ev: SessionEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO session_events (event_id, session_id, event_type, module_id, percent, message, data, ts)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)`,
      [
        ev.id,
        sessionId,
        ev.type,
        ev.moduleId ?? null,
        ev.percent ?? null,
        ev.message ?? null,
        ev.data ? JSON.stringify(ev.data) : null,
        ev.ts,
      ],
    );
  }
}