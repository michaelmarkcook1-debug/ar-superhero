import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { getPgSql } from "./deckStore";

// ============================================================================
// Asks — what AR needs from a leader, with an owner, a due date and a status.
//
// This is the first user-owned time axis in the cockpit. Every ask is written
// by the AR person; nothing is seeded, suggested or inferred here. Status
// vocabulary follows WorkEngine's task outcomes (open · done · skipped ·
// not_needed) so a mirrored playbook task and a hand-entered ask read the same
// way, and "skipped" and "not needed" stay distinguishable facts.
//
// Durable Postgres when DECK_DB_URL is set, self-migrating on first use; an
// in-memory list otherwise (honest empty offline, never a fixture).
// ============================================================================

export type AskStatus = "open" | "done" | "skipped" | "not_needed";
export const ASK_STATUSES: AskStatus[] = ["open", "done", "skipped", "not_needed"];

export interface Ask {
  id: string;
  vendor_id: string;
  persona_id: string;
  title: string;
  owner: string | null;
  due_date: string | null; // YYYY-MM-DD
  status: AskStatus;
  note: string | null;
  created_at: number;
  updated_at: number;
}

export interface InsertAsk {
  vendor_id: string;
  persona_id: string;
  title: string;
  owner?: string | null;
  due_date?: string | null;
  note?: string | null;
}

export type AskPatch = Partial<Pick<Ask, "title" | "owner" | "due_date" | "status" | "note">>;

export interface AskStore {
  readonly kind: "postgres" | "memory";
  list(vendorId?: string, personaId?: string): Promise<Ask[]>;
  insert(input: InsertAsk): Promise<Ask>;
  update(id: string, patch: AskPatch): Promise<Ask | null>;
  remove(id: string): Promise<boolean>;
}

function row(input: InsertAsk): Ask {
  const now = Date.now();
  return {
    id: `ask_${randomUUID()}`,
    vendor_id: input.vendor_id,
    persona_id: input.persona_id,
    title: input.title.trim(),
    owner: input.owner?.trim() || null,
    due_date: input.due_date || null,
    status: "open",
    note: input.note?.trim() || null,
    created_at: now,
    updated_at: now,
  };
}

// Open first; nearest due first with undated last; newest first after that.
function order(a: Ask, b: Ask): number {
  if ((a.status === "open") !== (b.status === "open")) return a.status === "open" ? -1 : 1;
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  }
  return b.created_at - a.created_at;
}

const memoryRows: Ask[] = [];

const memoryStore: AskStore = {
  kind: "memory",
  async list(vendorId, personaId) {
    return memoryRows
      .filter((r) => (!vendorId || r.vendor_id === vendorId) && (!personaId || r.persona_id === personaId))
      .sort(order);
  },
  async insert(input) {
    const r = row(input);
    memoryRows.push(r);
    return r;
  },
  async update(id, patch) {
    const r = memoryRows.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, patch, { updated_at: Date.now() });
    return r;
  },
  async remove(id) {
    const i = memoryRows.findIndex((x) => x.id === id);
    if (i < 0) return false;
    memoryRows.splice(i, 1);
    return true;
  },
};

function makePgStore(sql: ReturnType<typeof postgres>): AskStore {
  let ensured: Promise<void> | null = null;
  function ensureTable(): Promise<void> {
    if (!ensured) {
      ensured = (async () => {
        await sql`
          CREATE TABLE IF NOT EXISTS ar_superhero_asks (
            id text PRIMARY KEY,
            vendor_id text NOT NULL,
            persona_id text NOT NULL,
            title text NOT NULL,
            owner text,
            due_date text,
            status text NOT NULL DEFAULT 'open',
            note text,
            created_at bigint NOT NULL,
            updated_at bigint NOT NULL
          )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_arsh_asks_vendor ON ar_superhero_asks (vendor_id, persona_id)`.catch(() => {});
        await sql.unsafe(`ALTER TABLE ar_superhero_asks ENABLE ROW LEVEL SECURITY`).catch(() => {});
      })();
    }
    return ensured;
  }
  const map = (r: any): Ask => ({
    id: r.id,
    vendor_id: r.vendor_id,
    persona_id: r.persona_id,
    title: r.title,
    owner: r.owner ?? null,
    due_date: r.due_date ?? null,
    status: r.status,
    note: r.note ?? null,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
  });
  return {
    kind: "postgres",
    async list(vendorId, personaId) {
      await ensureTable();
      const rows =
        vendorId && personaId
          ? await sql`SELECT * FROM ar_superhero_asks WHERE vendor_id = ${vendorId} AND persona_id = ${personaId}`
          : vendorId
            ? await sql`SELECT * FROM ar_superhero_asks WHERE vendor_id = ${vendorId}`
            : await sql`SELECT * FROM ar_superhero_asks`;
      return (rows as any[]).map(map).sort(order);
    },
    async insert(input) {
      await ensureTable();
      const r = row(input);
      await sql`
        INSERT INTO ar_superhero_asks (id, vendor_id, persona_id, title, owner, due_date, status, note, created_at, updated_at)
        VALUES (${r.id}, ${r.vendor_id}, ${r.persona_id}, ${r.title}, ${r.owner}, ${r.due_date}, ${r.status}, ${r.note}, ${r.created_at}, ${r.updated_at})
      `;
      return r;
    },
    async update(id, patch) {
      await ensureTable();
      const existing = (await sql`SELECT * FROM ar_superhero_asks WHERE id = ${id} LIMIT 1`) as any[];
      if (!existing[0]) return null;
      const merged = { ...map(existing[0]), ...patch, updated_at: Date.now() };
      await sql`
        UPDATE ar_superhero_asks SET
          title = ${merged.title}, owner = ${merged.owner}, due_date = ${merged.due_date},
          status = ${merged.status}, note = ${merged.note}, updated_at = ${merged.updated_at}
        WHERE id = ${id}
      `;
      return merged;
    },
    async remove(id) {
      await ensureTable();
      const res = await sql`DELETE FROM ar_superhero_asks WHERE id = ${id}`;
      return (res as any).count > 0;
    },
  };
}

const _sql = getPgSql();
export const askStore: AskStore = _sql ? makePgStore(_sql) : memoryStore;
