import postgres from "postgres";
import { deckLibrary, type DeckLibraryRow } from "../storage";

// ============================================================================
// Deck library store — durable when DECK_DB_URL is set, local otherwise.
//
// Production: DECK_DB_URL points at a Postgres database (Supabase pooled
// connection string). The store self-migrates its one table
// (ar_superhero_deck_library) on first use over the authenticated connection —
// no external migration step. RLS stays enabled with no API policies upstream,
// so the table is unreachable via the public REST API; only this server's
// connection string can touch it.
//
// Development / no env: falls back to the existing local SQLite table so the
// feature works offline. The two backends share one async interface.
// ============================================================================

export type DeckSummary = Omit<DeckLibraryRow, "slides" | "fileBlob">;

export interface DeckStore {
  readonly kind: "postgres" | "sqlite";
  list(): Promise<DeckSummary[]>;
  get(id: string): Promise<DeckLibraryRow | null>;
  insert(row: DeckLibraryRow): Promise<void>;
  remove(id: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// SQLite fallback — wraps the existing synchronous storage accessor.
// ---------------------------------------------------------------------------

const sqliteStore: DeckStore = {
  kind: "sqlite",
  async list() {
    return deckLibrary.list();
  },
  async get(id) {
    return deckLibrary.get(id);
  },
  async insert(row) {
    deckLibrary.insert(row);
  },
  async remove(id) {
    return deckLibrary.remove(id);
  },
};

// ---------------------------------------------------------------------------
// Postgres store — postgres.js with pgbouncer-safe settings.
// ---------------------------------------------------------------------------

// One shared client per process — deck library and results store both ride it.
// Supabase's pooled endpoint runs pgbouncer in transaction mode — prepared
// statements must stay off. Small pool: serverless instances are many.
let _pgSql: ReturnType<typeof postgres> | null = null;
export function getPgSql(): ReturnType<typeof postgres> | null {
  const url = process.env.DECK_DB_URL ?? "";
  if (!url) return null;
  if (!_pgSql) {
    _pgSql = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 15 });
  }
  return _pgSql;
}

function makePgStore(sql: ReturnType<typeof postgres>): DeckStore {

  let ensured: Promise<void> | null = null;
  function ensureTable(): Promise<void> {
    if (!ensured) {
      ensured = sql`
        CREATE TABLE IF NOT EXISTS ar_superhero_deck_library (
          id uuid PRIMARY KEY,
          filename text NOT NULL,
          house text NOT NULL,
          uploaded_at bigint NOT NULL,
          slide_count integer NOT NULL,
          slides_json jsonb NOT NULL,
          file_blob bytea,
          is_demo boolean NOT NULL DEFAULT false
        )
      `.then(async () => {
        // Belt-and-braces: RLS on means the public REST API cannot reach this
        // table even if API keys leak; our direct connection bypasses RLS.
        await sql`ALTER TABLE ar_superhero_deck_library ENABLE ROW LEVEL SECURITY`.catch(() => {});
        // Additive migration for tables created before these columns existed.
        await sql`ALTER TABLE ar_superhero_deck_library ADD COLUMN IF NOT EXISTS file_blob bytea`.catch(() => {});
        await sql`ALTER TABLE ar_superhero_deck_library ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false`.catch(() => {});
      });
    }
    return ensured;
  }

  return {
    kind: "postgres",
    async list() {
      await ensureTable();
      const rows = await sql<
        { id: string; filename: string; house: string; uploaded_at: string; slide_count: number; is_demo: boolean }[]
      >`
        SELECT id, filename, house, uploaded_at, slide_count, is_demo
        FROM ar_superhero_deck_library
        ORDER BY uploaded_at DESC
      `;
      return rows.map((r) => ({
        id: r.id,
        filename: r.filename,
        house: r.house,
        uploadedAt: Number(r.uploaded_at),
        slideCount: r.slide_count,
        isDemo: r.is_demo,
      }));
    },
    async get(id) {
      await ensureTable();
      const rows = await sql<
        {
          id: string;
          filename: string;
          house: string;
          uploaded_at: string;
          slide_count: number;
          slides_json: unknown;
          file_blob: Buffer | null;
          is_demo: boolean;
        }[]
      >`
        SELECT * FROM ar_superhero_deck_library WHERE id = ${id}
      `;
      if (!rows.length) return null;
      const r = rows[0];
      return {
        id: r.id,
        filename: r.filename,
        house: r.house,
        uploadedAt: Number(r.uploaded_at),
        slideCount: r.slide_count,
        slides: r.slides_json as DeckLibraryRow["slides"],
        fileBlob: r.file_blob ?? null,
        isDemo: r.is_demo,
      };
    },
    async insert(row) {
      await ensureTable();
      await sql`
        INSERT INTO ar_superhero_deck_library
          (id, filename, house, uploaded_at, slide_count, slides_json, file_blob, is_demo)
        VALUES (${row.id}, ${row.filename}, ${row.house}, ${row.uploadedAt}, ${row.slideCount}, ${sql.json(
          row.slides as unknown as postgres.JSONValue
        )}, ${row.fileBlob}, ${row.isDemo})
      `;
    },
    async remove(id) {
      await ensureTable();
      const result = await sql`DELETE FROM ar_superhero_deck_library WHERE id = ${id}`;
      return result.count > 0;
    },
  };
}

const _sharedSql = getPgSql();

export const deckStore: DeckStore = _sharedSql ? makePgStore(_sharedSql) : sqliteStore;
