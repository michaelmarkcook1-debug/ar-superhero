import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { getPgSql } from "./deckStore";
import type { AnalystCoverage, InsertAnalystCoverage } from "@shared/schema";

// ============================================================================
// Analyst coverage store — named analysts and their published commentary on a
// tracked vendor. Same dual-backend shape as the other stores in this service
// layer: durable Postgres when DECK_DB_URL is set, self-migrating on first use.
//
// Local fallback is in-memory rather than SQLite: this table is a curated,
// research-sourced dataset loaded through the API, not something the local dev
// flow writes to. An empty local list is the honest answer offline.
// ============================================================================

export interface AnalystCoverageStore {
  readonly kind: "postgres" | "memory";
  list(vendorId?: string): Promise<AnalystCoverage[]>;
  insert(input: InsertAnalystCoverage): Promise<AnalystCoverage>;
}

function row(input: InsertAnalystCoverage): AnalystCoverage {
  return {
    id: input.id ?? `cov_${randomUUID()}`,
    analyst_name: input.analyst_name,
    firm: input.firm,
    role: input.role ?? null,
    coverage: input.coverage ?? "[]",
    profile_url: input.profile_url ?? null,
    vendor_id: input.vendor_id ?? null,
    stance_summary: input.stance_summary ?? null,
    quote: input.quote ?? null,
    source_url: input.source_url ?? null,
    source_type: input.source_type ?? null,
    published_date: input.published_date ?? null,
    date_precision: input.date_precision ?? null,
    created_at: Date.now(),
  };
}

const memoryRows: AnalystCoverage[] = [];

const memoryStore: AnalystCoverageStore = {
  kind: "memory",
  async list(vendorId) {
    // A vendor view still includes profile-only analysts (vendor_id null), so
    // the surface can show who covers the space alongside who has spoken.
    return vendorId ? memoryRows.filter((r) => r.vendor_id === vendorId || r.vendor_id === null) : [...memoryRows];
  },
  async insert(input) {
    const r = row(input);
    memoryRows.push(r);
    return r;
  },
};

function makePgStore(sql: ReturnType<typeof postgres>): AnalystCoverageStore {
  let ensured: Promise<void> | null = null;
  function ensureTable(): Promise<void> {
    if (!ensured) {
      ensured = (async () => {
        await sql`
          CREATE TABLE IF NOT EXISTS ar_superhero_analyst_coverage (
            id text PRIMARY KEY,
            analyst_name text NOT NULL,
            firm text NOT NULL,
            role text,
            coverage text NOT NULL DEFAULT '[]',
            profile_url text,
            vendor_id text,
            stance_summary text,
            quote text,
            source_url text,
            source_type text,
            published_date text,
            date_precision text,
            created_at bigint NOT NULL
          )
        `;
        await sql.unsafe(`ALTER TABLE ar_superhero_analyst_coverage ENABLE ROW LEVEL SECURITY`).catch(() => {});
      })();
    }
    return ensured;
  }

  return {
    kind: "postgres",
    async list(vendorId) {
      await ensureTable();
      const rows = vendorId
        ? await sql`
            SELECT * FROM ar_superhero_analyst_coverage
            WHERE vendor_id = ${vendorId} OR vendor_id IS NULL
            ORDER BY firm ASC, analyst_name ASC
          `
        : await sql`SELECT * FROM ar_superhero_analyst_coverage ORDER BY firm ASC, analyst_name ASC`;
      return rows.map((r: any) => ({ ...r, created_at: Number(r.created_at) })) as AnalystCoverage[];
    },
    async insert(input) {
      await ensureTable();
      const r = row(input);
      await sql`
        INSERT INTO ar_superhero_analyst_coverage
          (id, analyst_name, firm, role, coverage, profile_url, vendor_id, stance_summary, quote,
           source_url, source_type, published_date, date_precision, created_at)
        VALUES (${r.id}, ${r.analyst_name}, ${r.firm}, ${r.role}, ${r.coverage}, ${r.profile_url},
          ${r.vendor_id}, ${r.stance_summary}, ${r.quote}, ${r.source_url}, ${r.source_type},
          ${r.published_date}, ${r.date_precision}, ${r.created_at})
      `;
      return r;
    },
  };
}

const _sql = getPgSql();

export const analystCoverageStore: AnalystCoverageStore = _sql ? makePgStore(_sql) : memoryStore;
