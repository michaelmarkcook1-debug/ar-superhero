import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { getPgSql } from "./deckStore";
import { storage } from "../storage";
import type { Analyst, StanceRecord, Interaction, AnalystSignal, InsertAnalystSignal } from "@shared/schema";

// ============================================================================
// Analyst store — durable when DECK_DB_URL is set, local otherwise.
//
// Same dual-backend shape as deckStore.ts, riding the same shared Postgres
// connection. Covers the four analyst-relations tables: analysts, their
// stance history, interactions, and uploaded signals (notes/write-ups that
// feed the perception engine). Production: self-migrating on first use, RLS
// enabled. Development / no env: falls back to the existing local SQLite
// tables (server/storage.ts) so the feature works offline.
// ============================================================================

export interface AnalystStore {
  readonly kind: "postgres" | "sqlite";
  listAnalysts(): Promise<Analyst[]>;
  createAnalyst(input: {
    name: string;
    firm: string;
    firm_tier: string;
    role?: string | null;
    rating?: string;
    confidence?: number;
    coverage?: string;
    source?: string;
  }): Promise<Analyst>;
  getAnalyst(id: string): Promise<Analyst | null>;
  updateAnalyst(id: string, patch: Partial<Analyst>): Promise<Analyst | null>;
  listStances(analystId?: string): Promise<StanceRecord[]>;
  insertStance(input: Omit<StanceRecord, "id" | "recorded_at"> & { id?: string }): Promise<StanceRecord>;
  listInteractions(analystId?: string): Promise<Interaction[]>;
  insertInteraction(
    input: Pick<Interaction, "analyst_id" | "workstream_id" | "type" | "title" | "notes" | "occurred_at"> & {
      id?: string;
      source?: string;
    }
  ): Promise<Interaction>;
  updateInteraction(id: string, patch: Partial<Interaction>): Promise<Interaction | null>;
  listSignals(analystId: string): Promise<AnalystSignal[]>;
  insertSignal(input: InsertAnalystSignal): Promise<AnalystSignal>;
}

// ---------------------------------------------------------------------------
// SQLite fallback — wraps the existing synchronous storage accessor.
// ---------------------------------------------------------------------------

const sqliteStore: AnalystStore = {
  kind: "sqlite",
  async listAnalysts() {
    return storage.listAnalysts();
  },
  async createAnalyst(input) {
    return storage.createAnalyst(input);
  },
  async getAnalyst(id) {
    return storage.getAnalyst(id) ?? null;
  },
  async updateAnalyst(id, patch) {
    return storage.updateAnalyst(id, patch) ?? null;
  },
  async listStances(analystId) {
    return storage.listStances(analystId);
  },
  async insertStance(input) {
    return storage.insertStance(input);
  },
  async listInteractions(analystId) {
    const all = storage.listInteractions();
    return analystId ? all.filter((i) => i.analyst_id === analystId) : all;
  },
  async insertInteraction(input) {
    return storage.createInteraction(input);
  },
  async updateInteraction(id, patch) {
    return storage.updateInteraction(id, patch) ?? null;
  },
  async listSignals(analystId) {
    return storage.listAnalystSignals(analystId);
  },
  async insertSignal(input) {
    return storage.insertAnalystSignal(input);
  },
};

// ---------------------------------------------------------------------------
// Postgres store
// ---------------------------------------------------------------------------

function makePgStore(sql: ReturnType<typeof postgres>): AnalystStore {
  let ensured: Promise<void> | null = null;
  function ensureTables(): Promise<void> {
    if (!ensured) {
      ensured = (async () => {
        await sql`
          CREATE TABLE IF NOT EXISTS ar_superhero_analysts (
            id text PRIMARY KEY,
            name text NOT NULL,
            firm text NOT NULL,
            firm_tier text NOT NULL,
            role text,
            rating text NOT NULL DEFAULT 'B',
            rating_overridden boolean NOT NULL DEFAULT false,
            confidence integer NOT NULL DEFAULT 50,
            coverage text NOT NULL DEFAULT '[]',
            source text NOT NULL DEFAULT 'Public discovery',
            last_interaction_at bigint
          )
        `;
        await sql`
          CREATE TABLE IF NOT EXISTS ar_superhero_analyst_stances (
            id text PRIMARY KEY,
            analyst_id text NOT NULL,
            stance text NOT NULL,
            confidence integer NOT NULL DEFAULT 50,
            source text NOT NULL DEFAULT 'ar_manual',
            note text,
            suggested boolean NOT NULL DEFAULT false,
            visible_in_leader_lens boolean NOT NULL DEFAULT false,
            recorded_at bigint NOT NULL
          )
        `;
        await sql`
          CREATE TABLE IF NOT EXISTS ar_superhero_interactions (
            id text PRIMARY KEY,
            analyst_id text,
            workstream_id text,
            type text NOT NULL,
            title text NOT NULL,
            notes text,
            occurred_at bigint NOT NULL,
            source text NOT NULL DEFAULT 'manual',
            needs_confirmation boolean NOT NULL DEFAULT false,
            synced_item_id text
          )
        `;
        await sql`
          CREATE TABLE IF NOT EXISTS ar_superhero_analyst_signals (
            id text PRIMARY KEY,
            analyst_id text NOT NULL,
            kind text NOT NULL,
            title text NOT NULL,
            content_text text NOT NULL,
            filename text,
            uploaded_by text,
            created_at bigint NOT NULL
          )
        `;
        for (const table of [
          "ar_superhero_analysts",
          "ar_superhero_analyst_stances",
          "ar_superhero_interactions",
          "ar_superhero_analyst_signals",
        ]) {
          await sql.unsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`).catch(() => {});
        }
      })();
    }
    return ensured;
  }

  return {
    kind: "postgres",

    async listAnalysts() {
      await ensureTables();
      const rows = await sql<
        {
          id: string;
          name: string;
          firm: string;
          firm_tier: string;
          role: string | null;
          rating: string;
          rating_overridden: boolean;
          confidence: number;
          coverage: string;
          source: string;
          last_interaction_at: string | null;
        }[]
      >`SELECT * FROM ar_superhero_analysts ORDER BY name ASC`;
      return rows.map((r) => ({
        ...r,
        rating_overridden: r.rating_overridden,
        last_interaction_at: r.last_interaction_at == null ? null : Number(r.last_interaction_at),
      })) as unknown as Analyst[];
    },

    async createAnalyst(input) {
      await ensureTables();
      const row = {
        id: `an_${randomUUID()}`,
        name: input.name,
        firm: input.firm,
        firm_tier: input.firm_tier,
        role: input.role ?? null,
        rating: input.rating ?? "B",
        rating_overridden: false,
        confidence: input.confidence ?? 50,
        coverage: input.coverage ?? "[]",
        source: input.source ?? "User added",
        last_interaction_at: null as number | null,
      };
      await sql`
        INSERT INTO ar_superhero_analysts
          (id, name, firm, firm_tier, role, rating, rating_overridden, confidence, coverage, source, last_interaction_at)
        VALUES (${row.id}, ${row.name}, ${row.firm}, ${row.firm_tier}, ${row.role}, ${row.rating},
          ${row.rating_overridden}, ${row.confidence}, ${row.coverage}, ${row.source}, ${row.last_interaction_at})
      `;
      return row as Analyst;
    },

    async getAnalyst(id) {
      await ensureTables();
      const rows = await sql`SELECT * FROM ar_superhero_analysts WHERE id = ${id}`;
      if (!rows.length) return null;
      const r = rows[0] as any;
      return { ...r, last_interaction_at: r.last_interaction_at == null ? null : Number(r.last_interaction_at) };
    },

    async updateAnalyst(id, patch) {
      await ensureTables();
      const existing = await this.getAnalyst(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch };
      await sql`
        UPDATE ar_superhero_analysts SET
          name = ${updated.name},
          firm = ${updated.firm},
          firm_tier = ${updated.firm_tier},
          role = ${updated.role},
          rating = ${updated.rating},
          rating_overridden = ${updated.rating_overridden},
          confidence = ${updated.confidence},
          coverage = ${updated.coverage},
          source = ${updated.source},
          last_interaction_at = ${updated.last_interaction_at}
        WHERE id = ${id}
      `;
      return updated;
    },

    async listStances(analystId) {
      await ensureTables();
      const rows = analystId
        ? await sql`SELECT * FROM ar_superhero_analyst_stances WHERE analyst_id = ${analystId} ORDER BY recorded_at DESC`
        : await sql`SELECT * FROM ar_superhero_analyst_stances ORDER BY recorded_at DESC`;
      return rows.map((r: any) => ({ ...r, recorded_at: Number(r.recorded_at) })) as StanceRecord[];
    },

    async insertStance(input) {
      await ensureTables();
      const row: StanceRecord = {
        id: input.id ?? `stance_${randomUUID()}`,
        analyst_id: input.analyst_id,
        stance: input.stance,
        confidence: input.confidence,
        source: input.source,
        note: input.note ?? null,
        suggested: input.suggested,
        visible_in_leader_lens: input.visible_in_leader_lens,
        recorded_at: Date.now(),
      };
      await sql`
        INSERT INTO ar_superhero_analyst_stances
          (id, analyst_id, stance, confidence, source, note, suggested, visible_in_leader_lens, recorded_at)
        VALUES (${row.id}, ${row.analyst_id}, ${row.stance}, ${row.confidence}, ${row.source}, ${row.note},
          ${row.suggested}, ${row.visible_in_leader_lens}, ${row.recorded_at})
      `;
      return row;
    },

    async listInteractions(analystId) {
      await ensureTables();
      const rows = analystId
        ? await sql`SELECT * FROM ar_superhero_interactions WHERE analyst_id = ${analystId} ORDER BY occurred_at DESC`
        : await sql`SELECT * FROM ar_superhero_interactions ORDER BY occurred_at DESC`;
      return rows.map((r: any) => ({ ...r, occurred_at: Number(r.occurred_at) })) as Interaction[];
    },

    async insertInteraction(input) {
      await ensureTables();
      const row: Interaction = {
        id: input.id ?? `intx_${randomUUID()}`,
        analyst_id: input.analyst_id ?? null,
        workstream_id: input.workstream_id ?? null,
        type: input.type,
        title: input.title,
        notes: input.notes ?? null,
        occurred_at: input.occurred_at,
        source: input.source ?? "manual",
        needs_confirmation: false,
        synced_item_id: null,
      };
      await sql`
        INSERT INTO ar_superhero_interactions
          (id, analyst_id, workstream_id, type, title, notes, occurred_at, source, needs_confirmation, synced_item_id)
        VALUES (${row.id}, ${row.analyst_id}, ${row.workstream_id}, ${row.type}, ${row.title}, ${row.notes},
          ${row.occurred_at}, ${row.source}, ${row.needs_confirmation}, ${row.synced_item_id})
      `;
      return row;
    },

    async updateInteraction(id, patch) {
      await ensureTables();
      const rows = await sql`SELECT * FROM ar_superhero_interactions WHERE id = ${id}`;
      if (!rows.length) return null;
      const existing = { ...(rows[0] as any), occurred_at: Number((rows[0] as any).occurred_at) } as Interaction;
      const updated = { ...existing, ...patch };
      await sql`
        UPDATE ar_superhero_interactions SET
          analyst_id = ${updated.analyst_id},
          workstream_id = ${updated.workstream_id},
          type = ${updated.type},
          title = ${updated.title},
          notes = ${updated.notes},
          occurred_at = ${updated.occurred_at},
          source = ${updated.source},
          needs_confirmation = ${updated.needs_confirmation},
          synced_item_id = ${updated.synced_item_id}
        WHERE id = ${id}
      `;
      return updated;
    },

    async listSignals(analystId) {
      await ensureTables();
      const rows = await sql`
        SELECT * FROM ar_superhero_analyst_signals WHERE analyst_id = ${analystId} ORDER BY created_at DESC
      `;
      return rows.map((r: any) => ({ ...r, created_at: Number(r.created_at) })) as AnalystSignal[];
    },

    async insertSignal(input) {
      await ensureTables();
      const row: AnalystSignal = {
        id: input.id ?? `sig_${randomUUID()}`,
        analyst_id: input.analyst_id,
        kind: input.kind,
        title: input.title,
        content_text: input.content_text,
        filename: input.filename ?? null,
        uploaded_by: input.uploaded_by ?? null,
        created_at: Date.now(),
      };
      await sql`
        INSERT INTO ar_superhero_analyst_signals
          (id, analyst_id, kind, title, content_text, filename, uploaded_by, created_at)
        VALUES (${row.id}, ${row.analyst_id}, ${row.kind}, ${row.title}, ${row.content_text}, ${row.filename},
          ${row.uploaded_by}, ${row.created_at})
      `;
      return row;
    },
  };
}

const _sharedSql = getPgSql();

export const analystStore: AnalystStore = _sharedSql ? makePgStore(_sharedSql) : sqliteStore;
