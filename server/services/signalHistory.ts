import { randomUUID } from "node:crypto";
import { signalHistoryLocal, type SignalSnapshotRow } from "../storage";
import { getPgSql } from "./deckStore";
import type { ArBrief, ArBriefItem } from "./agIntelligence";

// ============================================================================
// Signal history — real vendor movement over time.
//
// The AG API serves point-in-time values, so movement must come from OUR OWN
// captures: every successful live brief build persists a snapshot per ticker
// (throttled to one per ~20h) into the durable store. "What changed" then
// diffs the latest capture against a baseline at least WINDOW_DAYS old.
//
// HONESTY: only real captured deltas are reported. Until the history is deep
// enough, the brief says "tracking since <date>" instead of inventing a
// baseline. Nothing is reconstructed or estimated.
// ============================================================================

const WINDOW_DAYS = 14;
const CAPTURE_THROTTLE_MS = 20 * 60 * 60 * 1000; // one capture per ticker/~day

type Signals = SignalSnapshotRow["signals"];

interface HistoryStore {
  latest(ticker: string): Promise<SignalSnapshotRow | null>;
  baselineBefore(ticker: string, beforeMs: number): Promise<SignalSnapshotRow | null>;
  insert(row: SignalSnapshotRow): Promise<void>;
}

function makePgHistoryStore(sql: NonNullable<ReturnType<typeof getPgSql>>): HistoryStore {
  let ensured: Promise<void> | null = null;
  function ensureTable(): Promise<void> {
    if (!ensured) {
      ensured = sql`
        CREATE TABLE IF NOT EXISTS ar_superhero_signal_history (
          id uuid PRIMARY KEY,
          ticker text NOT NULL,
          captured_at bigint NOT NULL,
          signals_json jsonb NOT NULL
        )
      `.then(async () => {
        await sql`CREATE INDEX IF NOT EXISTS idx_arsh_sig_hist ON ar_superhero_signal_history (ticker, captured_at)`.catch(() => {});
        await sql`ALTER TABLE ar_superhero_signal_history ENABLE ROW LEVEL SECURITY`.catch(() => {});
      });
    }
    return ensured;
  }
  const map = (r: any): SignalSnapshotRow => ({
    id: r.id,
    ticker: r.ticker,
    capturedAt: Number(r.captured_at),
    signals: r.signals_json as Signals,
  });
  return {
    async latest(ticker) {
      await ensureTable();
      const rows = await sql<any[]>`
        SELECT * FROM ar_superhero_signal_history WHERE ticker = ${ticker} ORDER BY captured_at DESC LIMIT 1
      `;
      return rows.length ? map(rows[0]) : null;
    },
    async baselineBefore(ticker, beforeMs) {
      await ensureTable();
      const at = await sql<any[]>`
        SELECT * FROM ar_superhero_signal_history
        WHERE ticker = ${ticker} AND captured_at <= ${beforeMs}
        ORDER BY captured_at DESC LIMIT 1
      `;
      if (at.length) return map(at[0]);
      const oldest = await sql<any[]>`
        SELECT * FROM ar_superhero_signal_history WHERE ticker = ${ticker} ORDER BY captured_at ASC LIMIT 1
      `;
      return oldest.length ? map(oldest[0]) : null;
    },
    async insert(row) {
      await ensureTable();
      await sql`
        INSERT INTO ar_superhero_signal_history (id, ticker, captured_at, signals_json)
        VALUES (${row.id}, ${row.ticker}, ${row.capturedAt}, ${sql.json(row.signals as any)})
      `;
    },
  };
}

const _sql = getPgSql();
const store: HistoryStore = _sql
  ? makePgHistoryStore(_sql)
  : {
      async latest(t) {
        return signalHistoryLocal.latest(t);
      },
      async baselineBefore(t, b) {
        return signalHistoryLocal.baselineBefore(t, b);
      },
      async insert(r) {
        signalHistoryLocal.insert(r);
      },
    };

// ---------------------------------------------------------------------------
// Capture — called after every successful (non-degraded) live brief build.
// Fire-and-forget from the caller; throttled per ticker.
// ---------------------------------------------------------------------------

function signalsFromBrief(brief: ArBrief, ticker: string): Signals | null {
  if (ticker === brief.focal?.ticker) {
    const lenses: Record<string, number> = {};
    for (const l of brief.reputationLenses ?? []) lenses[l.name] = l.last;
    return {
      assessmentScore: brief.focal.assessmentScore,
      aiReadinessScore: brief.focal.aiReadinessScore,
      gapScore: brief.focal.gapScore,
      gapDirection: brief.focal.gapDirection,
      lenses,
    };
  }
  const c = brief.competitors.find((x) => x.ticker === ticker);
  if (!c) return null;
  return {
    assessmentScore: c.assessmentScore,
    aiReadinessScore: c.aiReadinessScore,
    gapScore: c.gapScore,
    gapDirection: c.gapDirection,
    lenses: {},
  };
}

export async function captureSignals(brief: ArBrief): Promise<void> {
  if (!brief.live || brief.degraded || !brief.focal) return;
  const tickers = [brief.focal.ticker, ...brief.competitors.map((c) => c.ticker)];
  const now = Date.now();
  for (const ticker of tickers) {
    try {
      const last = await store.latest(ticker);
      if (last && now - last.capturedAt < CAPTURE_THROTTLE_MS) continue;
      const signals = signalsFromBrief(brief, ticker);
      if (!signals) continue;
      await store.insert({ id: randomUUID(), ticker, capturedAt: now, signals });
    } catch {
      // History capture must never break the brief.
    }
  }
}

// ---------------------------------------------------------------------------
// Movement — real deltas between the latest capture and a ≥window baseline.
// ---------------------------------------------------------------------------

export interface MovementReport {
  windowDays: number;
  trackingSince: string | null; // ISO of oldest usable baseline capture
  baselineIsFullWindow: boolean; // true when the baseline is >= windowDays old
  items: ArBriefItem[];
}

function num(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function deriveMovement(brief: ArBrief): Promise<MovementReport> {
  const empty: MovementReport = { windowDays: WINDOW_DAYS, trackingSince: null, baselineIsFullWindow: false, items: [] };
  if (!brief.live || !brief.focal) return empty;

  const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const names: Record<string, string> = { [brief.focal.ticker]: brief.focal.name };
  for (const c of brief.competitors) names[c.ticker] = c.name;

  const items: ArBriefItem[] = [];
  let oldestBaseline: number | null = null;
  let fullWindow = false;

  for (const ticker of Object.keys(names)) {
    try {
      const latest = await store.latest(ticker);
      const baseline = await store.baselineBefore(ticker, cutoff);
      if (!latest || !baseline || latest.id === baseline.id) continue;

      oldestBaseline = oldestBaseline == null ? baseline.capturedAt : Math.min(oldestBaseline, baseline.capturedAt);
      if (baseline.capturedAt <= cutoff) fullWindow = true;

      const spanDays = Math.max(1, Math.round((latest.capturedAt - baseline.capturedAt) / 86_400_000));
      const span = `${spanDays}d`;
      const nm = names[ticker];

      const pairs: [string, number | null, number | null][] = [
        ["Assessment score", num(baseline.signals.assessmentScore), num(latest.signals.assessmentScore)],
        ["AI readiness", num(baseline.signals.aiReadinessScore), num(latest.signals.aiReadinessScore)],
        ["Narrative gap", num(baseline.signals.gapScore), num(latest.signals.gapScore)],
      ];
      for (const [label, prev, curr] of pairs) {
        if (prev == null || curr == null || prev === curr) continue;
        const d = curr - prev;
        items.push({
          id: `mv-${ticker}-${label}`,
          title: `${nm}: ${label.toLowerCase()} moved ${d > 0 ? "+" : ""}${Math.round(d * 10) / 10}`,
          detail: `${label} ${prev} → ${curr} over the last ${span} (our captures of the live AG signal).`,
          source: "AR SuperHero signal history · captured AG values",
          severity: Math.abs(d) >= 5 ? "HIGH" : "MEDIUM",
          metric: `${prev} → ${curr}`,
        });
      }

      if (
        baseline.signals.gapDirection &&
        latest.signals.gapDirection &&
        baseline.signals.gapDirection !== latest.signals.gapDirection
      ) {
        items.push({
          id: `mv-${ticker}-gapdir`,
          title: `${nm}: narrative gap direction changed`,
          detail: `Gap direction moved ${baseline.signals.gapDirection} → ${latest.signals.gapDirection} over the last ${span}.`,
          source: "AR SuperHero signal history · captured AG values",
          severity: "HIGH",
          metric: `${baseline.signals.gapDirection} → ${latest.signals.gapDirection}`,
        });
      }

      // Focal lens moves between captures.
      for (const [lens, prev] of Object.entries(baseline.signals.lenses ?? {})) {
        const curr = latest.signals.lenses?.[lens];
        if (typeof curr !== "number" || curr === prev) continue;
        const d = curr - prev;
        items.push({
          id: `mv-${ticker}-lens-${lens}`,
          title: `${nm}: ${lens} lens moved ${d > 0 ? "+" : ""}${d}`,
          detail: `${lens} sentiment ${prev} → ${curr} over the last ${span}.`,
          source: "AR SuperHero signal history · captured AG values",
          severity: Math.abs(d) >= 5 ? "HIGH" : "MEDIUM",
          metric: `${prev} → ${curr}`,
        });
      }
    } catch {
      // A single ticker's history failure never blanks the report.
    }
  }

  const sevRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  items.sort((a, b) => sevRank[a.severity ?? "LOW"] - sevRank[b.severity ?? "LOW"]);

  return {
    windowDays: WINDOW_DAYS,
    trackingSince: oldestBaseline ? new Date(oldestBaseline).toISOString() : null,
    baselineIsFullWindow: fullWindow,
    items: items.slice(0, 6),
  };
}
