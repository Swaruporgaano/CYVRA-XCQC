import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionEvent, SessionStatus } from "@cyvra/xcqc-shared";
import type { SessionRecord } from "../types/session.js";

export interface SessionStore {
  create(session: SessionRecord): Promise<SessionRecord>;
  get(sessionId: string): Promise<SessionRecord | undefined>;
  update(sessionId: string, mutator: (s: SessionRecord) => void): Promise<SessionRecord | undefined>;
  list(limit?: number): Promise<SessionRecord[]>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();

  async create(session: SessionRecord): Promise<SessionRecord> {
    this.sessions.set(session.sessionId, clone(session));
    return clone(session);
  }

  async get(sessionId: string): Promise<SessionRecord | undefined> {
    const found = this.sessions.get(sessionId);
    return found ? clone(found) : undefined;
  }

  async update(
    sessionId: string,
    mutator: (s: SessionRecord) => void,
  ): Promise<SessionRecord | undefined> {
    const current = this.sessions.get(sessionId);
    if (!current) return undefined;
    mutator(current);
    current.updatedAt = new Date().toISOString();
    this.sessions.set(sessionId, current);
    return clone(current);
  }

  async list(limit = 50): Promise<SessionRecord[]> {
    return [...this.sessions.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(clone);
  }
}

/** File-backed MVP store — single-process only; replace with Neon when multi-instance. */
export class FileSessionStore implements SessionStore {
  private readonly filePath: string;
  private loaded = false;
  private readonly memory = new MemorySessionStore();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "sessions.json");
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as SessionRecord[];
      for (const s of parsed) {
        await this.memory.create(s);
      }
    } catch {
      // first run or empty
    }
  }

  private async persist(): Promise<void> {
    const all = await this.memory.list(10_000);
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(all, null, 2), "utf8");
  }

  async create(session: SessionRecord): Promise<SessionRecord> {
    await this.ensureLoaded();
    const created = await this.memory.create(session);
    await this.persist();
    return created;
  }

  async get(sessionId: string): Promise<SessionRecord | undefined> {
    await this.ensureLoaded();
    return this.memory.get(sessionId);
  }

  async update(
    sessionId: string,
    mutator: (s: SessionRecord) => void,
  ): Promise<SessionRecord | undefined> {
    await this.ensureLoaded();
    const updated = await this.memory.update(sessionId, mutator);
    if (updated) await this.persist();
    return updated;
  }

  async list(limit = 50): Promise<SessionRecord[]> {
    await this.ensureLoaded();
    return this.memory.list(limit);
  }
}

export function newEvent(
  sessionId: string,
  partial: Omit<SessionEvent, "id" | "sessionId" | "ts"> & { ts?: string },
): SessionEvent {
  return {
    id: randomUUID(),
    sessionId,
    ts: partial.ts ?? new Date().toISOString(),
    type: partial.type,
    moduleId: partial.moduleId,
    percent: partial.percent,
    message: partial.message,
    data: partial.data,
  };
}

export function assertTransition(from: SessionStatus, to: SessionStatus): boolean {
  const allowed: Record<SessionStatus, SessionStatus[]> = {
    created: ["running", "abandoned", "failed"],
    running: ["finalizing", "completed", "failed", "abandoned"],
    finalizing: ["completed", "failed"],
    completed: [],
    failed: [],
    abandoned: [],
  };
  return allowed[from]?.includes(to) ?? false;
}
