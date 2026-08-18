import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { getPgSql } from "./deckStore";
import { storage } from "../storage";
import type { PublicAnalystRanking, InsertPublicAnalystRanking } from "../storage";

// ============================================================================
// Public analyst rankings store — durable when DECK_DB_URL is set, local
// otherwise. Same dual-backend shape as deckStore.ts/analystStore.ts, riding
// the same shared Postgres connection. Every row is real, cited evidence
// found via web research (report name, placement, publish date, source URL)
// — this store has no notion of an "estimated" ranking.
// ============================================================================

export interface PublicRankingsStore {
  readonly kind: "postgres" | "sqlite";
  listRankings(vendorId?: string): Promise<PublicAnalystRanking[]>;
  insertRanking(input: InsertPublicAnalystRanking): Promise<PublicAnalystRanking>;
}

// ---------------------------------------------------------------------------
// SQLite fallback
// ---------------------------------------------------------------------------

const sqliteStore: PublicRankingsStore = {
  kind: "sqlite",
  async listRankings(vendorId) {
    return storage.listPublicRankings(vendorId);
  },
  async insertRanking(input) {
    return storage.insertPublicRanking(input);
  },
};

// ---------------------------------------------------------------------------
// Postgres store
// ---------------------------------------------------------------------------

function makePgStore(sql: ReturnType<typeof postgres>): PublicRankingsStore {
  let ensured: Promise<void> | null = null;
  function ensureTable(): Promise<void> {
    if (!ensured) {
      ensured = (async () => {
        await sql`
          CREATE TABLE IF NOT EXISTS ar_superhero_public_rankings (
            id text PRIMARY KEY,
            vendor_id text NOT NULL,
            analyst_firm text NOT NULL,
            report_name text NOT NULL,
            category text,
            placement text NOT NULL,
            published_date text NOT NULL,
            date_precision text NOT NULL DEFAULT 'day',
            source_url text NOT NULL,
            source_type text NOT NULL,
            summary text NOT NULL,
            created_at bigint NOT NULL
          )
        `;
        await sql.unsafe(`ALTER TABLE ar_superhero_public_rankings ENABLE ROW LEVEL SECURITY`).catch(() => {});
      })();
    }
    return ensured;
  }

  return {
    kind: "postgres",

    async listRankings(vendorId) {
      await ensureTable();
      const rows = vendorId
        ? await sql`SELECT * FROM ar_superhero_public_rankings WHERE vendor_id = ${vendorId} ORDER BY published_date DESC`
        : await sql`SELECT * FROM ar_superhero_public_rankings ORDER BY published_date DESC`;
      return rows.map((r: any) => ({ ...r, created_at: Number(r.created_at) })) as PublicAnalystRanking[];
    },

    async insertRanking(input) {
      await ensureTable();
      const row: PublicAnalystRanking = {
        id: input.id ?? `pr_${randomUUID()}`,
        vendor_id: input.vendor_id,
        analyst_firm: input.analyst_firm,
        report_name: input.report_name,
        category: input.category ?? null,
        placement: input.placement,
        published_date: input.published_date,
        date_precision: input.date_precision ?? "day",
        source_url: input.source_url,
        source_type: input.source_type,
        summary: input.summary,
        created_at: Date.now(),
      };
      await sql`
        INSERT INTO ar_superhero_public_rankings
          (id, vendor_id, analyst_firm, report_name, category, placement, published_date, date_precision, source_url, source_type, summary, created_at)
        VALUES (${row.id}, ${row.vendor_id}, ${row.analyst_firm}, ${row.report_name}, ${row.category}, ${row.placement},
          ${row.published_date}, ${row.date_precision}, ${row.source_url}, ${row.source_type}, ${row.summary}, ${row.created_at})
      `;
      return row;
    },
  };
}

const _sharedSql = getPgSql();

export const publicRankingsStore: PublicRankingsStore = _sharedSql ? makePgStore(_sharedSql) : sqliteStore;
