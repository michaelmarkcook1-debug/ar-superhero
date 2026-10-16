import { vendorById } from "./vendors";
import { vendorAnalystView } from "./rosterSync";
import { analystCoverageStore } from "./analystCoverageStore";
import { vendorEvaluationCalendar } from "./evaluationCalendar";
import { getArBrief } from "./agIntelligence";
import { publicRankingsStore } from "./publicRankingsStore";
import { askStore } from "./askStore";
import type { SeedInput } from "./workSeed";
import type { AnalystCoverage } from "@shared/schema";

// ============================================================================
// Briefing triggers — when AR should act, derived from real inputs.
//
// This replaces the seeded "briefing opportunities" panel, whose own source
// described it as illustrative content for rehearsal, not verified fact. Every
// trigger here is produced by a stated rule over data the product actually
// holds: named-analyst coverage, cited placements, evaluation anniversaries,
// the AR team's own asks, and the AnalystGenius read. Each carries the rule
// that fired, the date of the evidence, and a source the person can open.
//
// HONESTY: thresholds are operating judgements, not measurements, and they
// are written into every trigger's `rule` so nobody reads them as fact. When
// an input is unavailable its triggers are absent, and the response says so —
// absent is not zero. Nothing is seeded.
// ============================================================================

export type TriggerKind =
  | "new-position"
  | "coverage-stale-soon"
  | "coverage-dated"
  | "evaluation-anniversary"
  | "evaluation-approaching"
  | "evaluation-verify"
  | "reputation-move"
  | "captured-move"
  | "narrative-gap"
  | "recognition"
  | "ask-overdue";

export type TriggerPriority = "now" | "soon" | "later";

export type TriggerAction =
  | { type: "seed"; label: string; request: SeedInput }
  | { type: "link"; label: string; href: string; external: boolean };

export interface BriefingTrigger {
  id: string;
  kind: TriggerKind;
  priority: TriggerPriority;
  title: string;
  detail: string;
  /** The rule that fired, in words, thresholds included. */
  rule: string;
  source: { label: string; url: string | null };
  evidenceDate: string | null;
  action: TriggerAction | null;
}

export interface BriefingTriggers {
  vendorId: string;
  generatedAt: string;
  basis: string;
  inputs: {
    coverage: boolean;
    placements: boolean;
    evaluations: boolean;
    asks: boolean;
    analystGenius: "live" | "stale" | "absent";
  };
  notes: string[];
  counts: Record<TriggerPriority, number>;
  triggers: BriefingTrigger[];
}

// Operating thresholds. They appear verbatim in each trigger's rule text.
const NEW_POSITION_DAYS = 90;
const STALE_SOON_MONTHS = 18;
const DATED_MONTHS = 24;
const RECOGNITION_DAYS = 60;
const LENS_MOVE_NOW = 5;
const LENS_MOVE_SOON = 3;
const GAP_MIN = 15;

export const TRIGGER_BASIS =
  "Derived from named-analyst coverage, cited placements, evaluation anniversaries, your open asks and the AnalystGenius read. Every trigger states the rule that fired and links its source. Nothing here is seeded.";

function pointInTime(date: string | null | undefined, precision?: string | null): Date | null {
  if (!date) return null;
  const iso =
    precision === "year" || /^\d{4}$/.test(date)
      ? `${date.slice(0, 4)}-07-01`
      : precision === "month" || /^\d{4}-\d{2}$/.test(date)
        ? `${date.slice(0, 7)}-15`
        : date;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(date: string | null | undefined, precision?: string | null): number | null {
  const d = pointInTime(date, precision);
  if (!d) return null;
  return (Date.now() - d.getTime()) / 86400000;
}

function fmtDate(d: string | null | undefined, precision?: string | null): string {
  if (!d) return "undated";
  if (precision === "year" || /^\d{4}$/.test(d)) return d.slice(0, 4);
  if (precision === "month" || /^\d{4}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function personKey(name: string, firm: string): string {
  return `${name.trim().toLowerCase()}|${firm.trim().toLowerCase()}`;
}

const PRIORITY_ORDER: Record<TriggerPriority, number> = { now: 0, soon: 1, later: 2 };
const KIND_ORDER: Record<TriggerKind, number> = {
  "ask-overdue": 0,
  "new-position": 1,
  "captured-move": 2,
  "reputation-move": 3,
  "evaluation-anniversary": 4,
  "narrative-gap": 5,
  "recognition": 6,
  "evaluation-approaching": 7,
  "coverage-stale-soon": 8,
  "evaluation-verify": 9,
  "coverage-dated": 10,
};

export async function deriveBriefingTriggers(vendorId: string): Promise<BriefingTriggers> {
  const vendor = vendorById(vendorId);
  // Coverage, placements and the calendar are the core inputs. Asks and the
  // AnalystGenius read are optional: if either is unavailable its triggers are
  // absent and the response says so, rather than the whole panel failing.
  let asksAvailable = true;
  const [view, coverage, calendar, rankings, asks, brief] = await Promise.all([
    vendorAnalystView(vendorId),
    analystCoverageStore.list(vendorId),
    vendorEvaluationCalendar(vendorId),
    publicRankingsStore.listRankings(vendorId),
    askStore.list(vendorId).catch(() => {
      asksAvailable = false;
      return [];
    }),
    getArBrief({ focalTicker: vendor.agTicker }),
  ]);

  const triggers: BriefingTrigger[] = [];
  const notes: string[] = [];
  if (!asksAvailable) notes.push("Your asks could not be read just now, so overdue-ask triggers are absent — absent, not zero.");

  // ---- coverage: named analysts ------------------------------------------
  const latestSummary = new Map<string, AnalystCoverage>();
  for (const r of coverage) {
    if (r.vendor_id !== vendorId || !r.stance_summary || !r.source_url) continue;
    const k = personKey(r.analyst_name, r.firm);
    const cur = latestSummary.get(k);
    if (!cur || String(r.published_date ?? "").localeCompare(String(cur.published_date ?? "")) > 0) latestSummary.set(k, r);
  }
  for (const a of view.analysts) {
    if (a.positions === 0 || !a.latest_published) continue;
    const days = daysSince(a.latest_published, a.latest_precision);
    const months = a.months_old;
    const row = latestSummary.get(a.key);
    const seed: TriggerAction = {
      type: "seed",
      label: "Prepare briefing",
      request: { kind: "analyst-briefing", vendorId, analystKey: a.key },
    };
    const src = { label: `${a.firm} · ${fmtDate(a.latest_published, a.latest_precision)}`, url: a.latest_source_url };
    if (days !== null && days <= NEW_POSITION_DAYS) {
      triggers.push({
        id: `new-position:${a.key}`,
        kind: "new-position",
        priority: "now",
        title: `Follow up with ${a.name} (${a.firm})`,
        detail: `Published a position on ${vendor.name} on ${fmtDate(a.latest_published, a.latest_precision)}${row?.stance_summary ? `: ${row.stance_summary}` : "."}`,
        rule: `A named analyst published a sourced position within the last ${NEW_POSITION_DAYS} days.`,
        source: src,
        evidenceDate: a.latest_published,
        action: seed,
      });
    } else if (months !== null && months >= STALE_SOON_MONTHS && months < DATED_MONTHS) {
      triggers.push({
        id: `stale-soon:${a.key}`,
        kind: "coverage-stale-soon",
        priority: "soon",
        title: `Refresh ${a.name} (${a.firm})`,
        detail: `Their last position on ${vendor.name} is ${Math.round(months)} months old; at ${DATED_MONTHS} it no longer reads as a current view.`,
        rule: `Latest sourced position is ${STALE_SOON_MONTHS}–${DATED_MONTHS} months old.`,
        source: src,
        evidenceDate: a.latest_published,
        action: seed,
      });
    } else if (a.stale) {
      triggers.push({
        id: `dated:${a.key}`,
        kind: "coverage-dated",
        priority: "later",
        title: `Re-engage ${a.name} (${a.firm})`,
        detail: `Their last position on ${vendor.name} is over two years old (${fmtDate(a.latest_published, a.latest_precision)}).`,
        rule: `Latest sourced position is ${DATED_MONTHS} months old or more.`,
        source: src,
        evidenceDate: a.latest_published,
        action: seed,
      });
    }
  }

  // ---- evaluations: anniversaries ----------------------------------------
  for (const s of calendar.series) {
    const src = { label: `${s.firm} · last edition ${fmtDate(s.last.date, s.last.precision)}`, url: s.last.source_url };
    if (s.band === "anniversary") {
      triggers.push({
        id: `eval-anniversary:${s.key}`,
        kind: "evaluation-anniversary",
        priority: "now",
        title: `Check ${s.firm}'s agenda: ${s.report}`,
        detail: `About a year since the last logged edition (${fmtDate(s.last.date, s.last.precision)}, ${s.last.placement}).`,
        rule: "Last placement 11–13 months ago. Most recurring evaluations run annually; SuperHero holds no house calendar.",
        source: src,
        evidenceDate: s.last.date,
        action: { type: "seed", label: "Prepare next cycle", request: { kind: "evaluation", vendorId, firm: s.firm, reportName: s.report } },
      });
    } else if (s.band === "approaching") {
      triggers.push({
        id: `eval-approaching:${s.key}`,
        kind: "evaluation-approaching",
        priority: "soon",
        title: `Prepare for ${s.firm}'s ${s.report}`,
        detail: `Last edition ${Math.round(s.monthsSinceLast)} months ago (${s.last.placement}); if it runs annually the next cycle is near.`,
        rule: "Last placement 10–11 months ago.",
        source: src,
        evidenceDate: s.last.date,
        action: { type: "seed", label: "Prepare next cycle", request: { kind: "evaluation", vendorId, firm: s.firm, reportName: s.report } },
      });
    } else if (s.band === "verify") {
      triggers.push({
        id: `eval-verify:${s.key}`,
        kind: "evaluation-verify",
        priority: "later",
        title: `Verify the record: ${s.report}`,
        detail: `No edition logged for ${Math.round(s.monthsSinceLast)} months (${s.firm}). Check whether a newer edition exists that the record has missed.`,
        rule: "Last logged placement more than 13 months ago.",
        source: src,
        evidenceDate: s.last.date,
        action: { type: "link", label: "Last edition", href: s.last.source_url, external: true },
      });
    }
  }

  // ---- placements: recognitions to leverage -------------------------------
  for (const r of rankings) {
    const days = daysSince(r.published_date, r.date_precision);
    if (days === null || days > RECOGNITION_DAYS) continue;
    triggers.push({
      id: `recognition:${r.id}`,
      kind: "recognition",
      priority: "soon",
      title: `Leverage: ${r.placement} in ${r.report_name}`,
      detail: `${r.analyst_firm}, published ${fmtDate(r.published_date, r.date_precision)} (${r.source_type.replace(/_/g, " ")}). Usage of analyst-firm recognitions is governed by the firm's licence; confirm rights before any external use.`,
      rule: `A cited placement was published within the last ${RECOGNITION_DAYS} days.`,
      source: { label: `${r.analyst_firm} · ${r.source_type.replace(/_/g, " ")}`, url: r.source_url },
      evidenceDate: r.published_date,
      action: { type: "link", label: "Placement source", href: r.source_url, external: true },
    });
  }

  // ---- asks: overdue --------------------------------------------------------
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  for (const a of asks) {
    if (a.status !== "open" || !a.due_date || a.due_date >= todayIso) continue;
    triggers.push({
      id: `ask-overdue:${a.id}`,
      kind: "ask-overdue",
      priority: "now",
      title: `Chase ${a.owner ?? "the owner"}: ${a.title}`,
      detail: `Due ${fmtDate(a.due_date)} · ${a.persona_id} lens.`,
      rule: "An open ask you recorded is past its due date.",
      source: { label: "Your asks", url: null },
      evidenceDate: a.due_date,
      action: { type: "link", label: "Open lens", href: "/direct", external: false },
    });
  }

  // ---- AnalystGenius: reputation, captured movement, narrative gap ----------
  const agState: BriefingTriggers["inputs"]["analystGenius"] = brief.live && !brief.degraded ? (brief.stale ? "stale" : "live") : "absent";
  if (agState === "absent") {
    notes.push("AnalystGenius was unreachable, so reputation, movement and narrative-gap triggers are absent — absent, not zero.");
  } else {
    const agLabel = brief.stale ? "AnalystGenius (last complete read)" : "AnalystGenius";
    for (const l of brief.reputationLenses ?? []) {
      const mag = Math.abs(l.delta);
      if (mag < LENS_MOVE_SOON) continue;
      triggers.push({
        id: `lens:${l.name}`,
        kind: "reputation-move",
        priority: mag >= LENS_MOVE_NOW ? "now" : "soon",
        title: `${l.name} lens ${l.delta > 0 ? "up" : "down"} ${mag} pts`,
        detail: `${l.prev} → ${l.last} (${l.span}), AnalystGenius's own quarter-on-quarter series. Brief the owner of this lens on the driver.`,
        rule: `A reputation lens moved by ${LENS_MOVE_NOW} or more (act now) or ${LENS_MOVE_SOON}–${LENS_MOVE_NOW - 1} (prepare) between the last two periods.`,
        source: { label: `${agLabel} · reputation-tracker/trends`, url: null },
        evidenceDate: brief.generatedAt.slice(0, 10),
        action: { type: "seed", label: "Reputation pulse", request: { kind: "scenario", vendorId, personaId: "marketing", scenarioId: "reputation-pulse" } },
      });
    }
    for (const item of brief.movement?.items ?? []) {
      triggers.push({
        id: `move:${item.id}`,
        kind: "captured-move",
        priority: "now",
        title: item.title,
        detail: `${item.detail}${item.metric ? ` (${item.metric})` : ""}`,
        rule: `Real movement captured by SuperHero's own snapshots over the last ${brief.movement?.windowDays ?? 14} days.`,
        source: { label: item.source, url: null },
        evidenceDate: brief.generatedAt.slice(0, 10),
        action: { type: "seed", label: "Competitive shift", request: { kind: "scenario", vendorId, personaId: "strategy", scenarioId: "competitive-shift" } },
      });
    }
    const gap = brief.focal?.gapScore ?? null;
    const dir = brief.focal?.gapDirection ?? "";
    if (gap !== null && gap >= GAP_MIN) {
      const under = /under/i.test(dir);
      const top = brief.gapAnalysis?.topDivergences?.[0];
      triggers.push({
        id: "narrative-gap",
        kind: "narrative-gap",
        priority: "soon",
        title: under ? `Close the narrative gap (${gap})` : `Narrative ahead of delivery (${gap})`,
        detail: under
          ? `AnalystGenius measures ${vendor.name}'s story behind its measured reality${top?.theme ? `; largest divergence: ${top.theme}${top.interpretation ? ` — ${top.interpretation}` : ""}` : ""}. An analyst briefing on the under-told evidence is the direct response.`
          : `AnalystGenius measures ${vendor.name}'s story ahead of its measured reality${top?.theme ? `; largest divergence: ${top.theme}` : ""}. Brief with evidence, not claims.`,
        rule: `Narrative–reality gap of ${GAP_MIN} or more in either direction.`,
        source: { label: `${agLabel} · narrative-reality-gap`, url: null },
        evidenceDate: brief.generatedAt.slice(0, 10),
        action: {
          type: "seed",
          label: under ? "Narrative campaign" : "Pre-briefing prep",
          request: under
            ? { kind: "scenario", vendorId, personaId: "marketing", scenarioId: "narrative-campaign" }
            : { kind: "scenario", vendorId, personaId: "strategy", scenarioId: "pre-briefing-prep" },
        },
      });
    }
  }

  triggers.sort((a, b) => {
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    return String(b.evidenceDate ?? "").localeCompare(String(a.evidenceDate ?? ""));
  });

  const counts = { now: 0, soon: 0, later: 0 };
  for (const t of triggers) counts[t.priority]++;

  return {
    vendorId,
    generatedAt: new Date().toISOString(),
    basis: TRIGGER_BASIS,
    inputs: {
      coverage: view.analysts.length > 0,
      placements: rankings.length > 0,
      evaluations: calendar.series.length > 0,
      asks: asksAvailable && asks.length > 0,
      analystGenius: agState,
    },
    notes,
    counts,
    triggers,
  };
}
