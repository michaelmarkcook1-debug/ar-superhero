import { analystStore } from "./analystStore";
import { analystCoverageStore } from "./analystCoverageStore";
import type { AnalystCoverage } from "@shared/schema";

// ============================================================================
// Roster sync — fills the analyst roster from public coverage.
//
// The coverage table holds real, named analysts with a source URL for every
// position they have published on a tracked vendor. The roster is the AR
// team's own relationship register. Until this existed the roster sat empty
// while the people it should list were already known, so the "who is writing
// about us" question had an answer the product never surfaced.
//
// HONESTY: a person seeded from coverage carries NO relationship judgement.
// The roster schema defaults every analyst to rating "B" / confidence 50 and a
// firm tier, all of which are the AR team's calls, not facts we hold. A seeded
// row is therefore written with rating "Unrated", confidence 0, and tier
// "Unclassified", and source "Public coverage", so nothing downstream can read
// a default as a measured opinion. The sync never overwrites a rating, tier or
// role a person has set by hand; it only adds people who are missing and widens
// the coverage list on rows it created itself.
// ============================================================================

export const SEEDED_SOURCE = "Public coverage";
export const UNRATED = "Unrated";
export const UNCLASSIFIED_TIER = "Unclassified";

function personKey(name: string, firm: string): string {
  return `${name.trim().toLowerCase()}|${firm.trim().toLowerCase()}`;
}

function markets(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function union(a: string[], b: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of [...a, ...b]) {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
  }
  return out;
}

export interface RosterSyncResult {
  coverageRows: number;
  people: number;
  created: number;
  widened: number;
  unchanged: number;
  rosterTotal: number;
}

/** Add every named analyst in coverage to the roster; idempotent. */
export async function syncRosterFromCoverage(): Promise<RosterSyncResult> {
  const [coverage, roster] = await Promise.all([analystCoverageStore.list(), analystStore.listAnalysts()]);

  // One entry per real person: same name at the same firm.
  const people = new Map<string, { name: string; firm: string; role: string | null; markets: string[] }>();
  for (const r of coverage) {
    const k = personKey(r.analyst_name, r.firm);
    const p = people.get(k) ?? { name: r.analyst_name.trim(), firm: r.firm.trim(), role: null, markets: [] };
    if (!p.role && r.role) p.role = r.role;
    p.markets = union(p.markets, markets(r.coverage));
    people.set(k, p);
  }

  const byKey = new Map(roster.map((a) => [personKey(a.name, a.firm), a] as const));
  let created = 0;
  let widened = 0;
  let unchanged = 0;

  for (const [k, p] of Array.from(people.entries())) {
    const existing = byKey.get(k);
    if (!existing) {
      await analystStore.createAnalyst({
        name: p.name,
        firm: p.firm,
        firm_tier: UNCLASSIFIED_TIER,
        role: p.role,
        rating: UNRATED,
        confidence: 0,
        coverage: JSON.stringify(p.markets),
        source: SEEDED_SOURCE,
      });
      created++;
      continue;
    }
    // Only rows this sync created are ours to widen; a hand-entered analyst is
    // the AR team's record and is left exactly as they wrote it.
    if (existing.source !== SEEDED_SOURCE) {
      unchanged++;
      continue;
    }
    const merged = union(markets(existing.coverage), p.markets);
    const roleFill = !existing.role && p.role ? p.role : existing.role;
    if (merged.length !== markets(existing.coverage).length || roleFill !== existing.role) {
      await analystStore.updateAnalyst(existing.id, { coverage: JSON.stringify(merged), role: roleFill });
      widened++;
    } else {
      unchanged++;
    }
  }

  return {
    coverageRows: coverage.length,
    people: people.size,
    created,
    widened,
    unchanged,
    rosterTotal: roster.length + created,
  };
}

// ----------------------------------------------------------------------------
// Vendor view — the "who is writing about us / who do I owe a call" answer for
// one focal vendor, merging coverage (what they published) with the roster
// (what the AR team has recorded about the relationship).
// ----------------------------------------------------------------------------

/** Commentary older than this is real, but must not read as a current view. */
export const STALE_AFTER_MONTHS = 24;

function monthsOld(d: string | null): number | null {
  if (!d) return null;
  const iso = /^\d{4}$/.test(d) ? `${d}-06-30` : /^\d{4}-\d{2}$/.test(d) ? `${d}-15` : d;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return (Date.now() - then.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

export interface VendorAnalyst {
  key: string;
  roster_id: string | null;
  name: string;
  firm: string;
  role: string | null;
  profile_url: string | null;
  /** Sourced positions this person has published about THIS vendor. */
  positions: number;
  latest_published: string | null;
  latest_precision: string | null;
  latest_source_url: string | null;
  months_old: number | null;
  stale: boolean;
  /** From the roster; null until the AR team logs something. */
  last_interaction_at: number | null;
  current_stance: { stance: string; confidence: number } | null;
  rating: string | null;
}

export interface VendorAnalystView {
  vendorId: string;
  summary: {
    named: number;
    withPosition: number;
    stale: number;
    inRoster: number;
    withInteraction: number;
    withStance: number;
  };
  analysts: VendorAnalyst[];
}

export async function vendorAnalystView(vendorId: string): Promise<VendorAnalystView> {
  const [coverage, roster, stances] = await Promise.all([
    analystCoverageStore.list(vendorId),
    analystStore.listAnalysts(),
    analystStore.listStances(),
  ]);
  const rosterByKey = new Map(roster.map((a) => [personKey(a.name, a.firm), a] as const));

  type Working = VendorAnalyst & { _rows: AnalystCoverage[] };
  const people = new Map<string, Working>();
  for (const r of coverage) {
    const k = personKey(r.analyst_name, r.firm);
    const fresh: Working = {
        key: k,
        roster_id: null,
        name: r.analyst_name.trim(),
        firm: r.firm.trim(),
        role: r.role ?? null,
        profile_url: r.profile_url ?? null,
        positions: 0,
        latest_published: null,
        latest_precision: null,
        latest_source_url: null,
        months_old: null,
        stale: false,
        last_interaction_at: null,
        current_stance: null,
        rating: null,
        _rows: [],
      };
    const entry: Working = people.get(k) ?? fresh;
    if (!entry.role && r.role) entry.role = r.role;
    if (!entry.profile_url && r.profile_url) entry.profile_url = r.profile_url;
    entry._rows.push(r);
    people.set(k, entry);
  }

  for (const entry of Array.from(people.values())) {
    // Only a row about THIS vendor with a sourced position counts as a position.
    const positioned = entry._rows.filter(
      (r: AnalystCoverage) => r.vendor_id === vendorId && Boolean(r.stance_summary) && Boolean(r.source_url)
    );
    entry.positions = positioned.length;
    const latest = positioned
      .filter((r: AnalystCoverage) => Boolean(r.published_date))
      .sort((a: AnalystCoverage, b: AnalystCoverage) => String(b.published_date).localeCompare(String(a.published_date)))[0];
    if (latest) {
      entry.latest_published = latest.published_date ?? null;
      entry.latest_precision = latest.date_precision ?? null;
      entry.latest_source_url = latest.source_url ?? null;
      entry.months_old = monthsOld(latest.published_date ?? null);
      entry.stale = entry.months_old !== null && entry.months_old >= STALE_AFTER_MONTHS;
    }
    const rosterRow = rosterByKey.get(entry.key);
    if (rosterRow) {
      entry.roster_id = rosterRow.id;
      entry.last_interaction_at = rosterRow.last_interaction_at ?? null;
      entry.rating = rosterRow.rating === UNRATED ? null : rosterRow.rating;
      const confirmed = stances.find((s) => s.analyst_id === rosterRow.id && !s.suggested);
      if (confirmed) entry.current_stance = { stance: confirmed.stance, confidence: confirmed.confidence };
    }
  }

  const analysts = Array.from(people.values())
    .map(({ _rows, ...rest }) => rest)
    .sort((a, b) => {
      if ((a.positions > 0) !== (b.positions > 0)) return a.positions > 0 ? -1 : 1;
      if (a.latest_published !== b.latest_published) {
        if (!a.latest_published) return 1;
        if (!b.latest_published) return -1;
        return b.latest_published.localeCompare(a.latest_published);
      }
      return a.name.localeCompare(b.name);
    });

  return {
    vendorId,
    summary: {
      named: analysts.length,
      withPosition: analysts.filter((a) => a.positions > 0).length,
      stale: analysts.filter((a) => a.stale).length,
      inRoster: analysts.filter((a) => a.roster_id).length,
      withInteraction: analysts.filter((a) => a.last_interaction_at !== null).length,
      withStance: analysts.filter((a) => a.current_stance).length,
    },
    analysts,
  };
}
