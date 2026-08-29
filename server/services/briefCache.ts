import { getPgSql } from "./deckStore";
import type { ArBrief } from "./agIntelligence";

// ============================================================================
// Durable last-known-good brief.
//
// The in-process cache in agIntelligence is lost whenever a serverless instance
// is recycled — which is exactly when an AG outage would otherwise drop the
// cockpit to demo content. This persists the last COMPLETE live build so the
// fallback survives a cold start.
//
// HONESTY: this stores only real, complete AG reads, and always alongside the
// timestamp of the read. Nothing here is synthesised; the caller labels what it
// serves with the age so a stale figure can never read as a current one.
// ============================================================================

export interface StoredBrief {
  brief: ArBrief;
  at: number;
}

let ensured: Promise<void> | null = null;

function ensureTable(sql: NonNullable<ReturnType<typeof getPgSql>>): Promise<void> {
  if (!ensured) {
    ensured = sql`
      CREATE TABLE IF NOT EXISTS ar_superhero_brief_cache (
        cache_key text PRIMARY KEY,
        captured_at bigint NOT NULL,
        brief_json jsonb NOT NULL
      )
    `.then(async () => {
      await sql`ALTER TABLE ar_superhero_brief_cache ENABLE ROW LEVEL SECURITY`.catch(() => {});
    });
  }
  return ensured;
}

/** Persist a complete live build. Fire-and-forget: never blocks the response. */
export async function saveLastGood(cacheKey: string, brief: ArBrief, at: number): Promise<void> {
  const sql = getPgSql();
  if (!sql) return;
  try {
    await ensureTable(sql);
    await sql`
      INSERT INTO ar_superhero_brief_cache (cache_key, captured_at, brief_json)
      VALUES (${cacheKey}, ${at}, ${sql.json(brief as any)})
      ON CONFLICT (cache_key) DO UPDATE
        SET captured_at = EXCLUDED.captured_at, brief_json = EXCLUDED.brief_json
    `;
  } catch {
    // Durable caching is best-effort; the in-process cache still applies.
  }
}

/** Last complete live build for this key, or null if we have never stored one. */
export async function loadLastGood(cacheKey: string): Promise<StoredBrief | null> {
  const sql = getPgSql();
  if (!sql) return null;
  try {
    await ensureTable(sql);
    const rows = await sql`
      SELECT captured_at, brief_json FROM ar_superhero_brief_cache WHERE cache_key = ${cacheKey} LIMIT 1
    `;
    const r = (rows as any[])[0];
    if (!r) return null;
    // A jsonb column can legitimately hold a JSON *string*; spreading one would
    // yield character keys rather than a brief, so decode before returning.
    const raw = typeof r.brief_json === "string" ? safeParse(r.brief_json) : r.brief_json;
    if (!raw || typeof raw !== "object") return null;
    return { brief: raw as ArBrief, at: Number(r.captured_at) };
  } catch {
    return null;
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
