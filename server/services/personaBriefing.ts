import { agFetch } from "./agApi";
import type { ArBrief } from "./agIntelligence";
import type { PersonaId } from "./directPersonaDeck";

// ============================================================================
// Persona briefing — the COMPETITIVE INTELLIGENCE the persona receives.
//
// This is deliberately NOT an AR work-plan. A persona deck is the artefact
// that stakeholder reads in their own meeting: where the firm stands against
// its named peer set, what moved this quarter, and what the competitor field
// looks like — scoped to the questions that role actually asks.
//
// FACTUAL-DATA RULES enforced here:
//  - Every figure is a verbatim AG field. Nothing is modelled or interpolated.
//  - A peer with no value for a metric renders "—", never a zero or a guess.
//  - Metrics AG genuinely does not carry (share price is the notable one) are
//    reported in `dataGaps` so the deck states the absence rather than
//    quietly omitting it and implying full coverage.
//  - Private companies legitimately have no market/financial series; that is
//    surfaced as a fact about the company, not as a data failure.
// ============================================================================

export interface PeerRow {
  name: string;
  ticker: string;
  isFocal: boolean;
  assessment: string;
  aiReadiness: string;
  revenueGrowth: string;
  recognition: string;
}

export interface CompetitorIntelRow {
  name: string;
  standing: string;
  quarterRead: string;
  watchItem: string;
}

export interface ReputationRow {
  lens: string;
  movement: string;
  delta: number;
  span: string;
}

export interface QuarterPoint {
  quarter: string;
  revenueUsdM: number;
}

export interface PersonaBriefing {
  personaId: PersonaId;
  /** Headline stating this persona's position — derived, never predictive. */
  headline: string;
  /** What this role is accountable for in the peer comparison. */
  lens: string;
  scorecardHeaders: string[];
  peerRows: PeerRow[];
  reputation: ReputationRow[];
  reputationSpan: string | null;
  competitorIntel: CompetitorIntelRow[];
  marketMovements: { title: string; detail: string; source: string }[];
  quarterlyRevenue: QuarterPoint[];
  /** Honest statement of metrics that are unavailable, and why. */
  dataGaps: string[];
}

// Which comparison each role leads with. The scorecard columns are the same
// real fields throughout — the ORDER and the headline framing change, because
// a CFO-facing read and a CMO-facing read weight the same field differently.
//
// leadMetric is deliberately limited to the three genuinely RANKABLE numerics.
// Recognition gap is not one: a larger gap is not "worse" (under-recognized is
// an opportunity, over-hyped is a risk), so ranking peers on it would imply an
// ordering the data does not support. Roles that care about recognition get it
// as a scorecard column and a dedicated section instead of a false ranking.
const PERSONA_LENS: Record<PersonaId, { lens: string; leadMetric: "assessment" | "ai" | "growth" }> = {
  executive: {
    lens: "Overall standing, financial trajectory and recognition versus the named peer set.",
    leadMetric: "assessment",
  },
  strategy: {
    lens: "Positioning versus peers: where the market story and the delivered reality diverge.",
    leadMetric: "assessment",
  },
  product: {
    lens: "Capability standing versus peers, led by AI readiness.",
    leadMetric: "ai",
  },
  marketing: {
    lens: "Narrative standing versus peers: recognition gap and reputation by channel.",
    leadMetric: "assessment",
  },
  commercial: {
    lens: "Competitive standing in live deals: how the peer field is rated where you sell.",
    leadMetric: "assessment",
  },
  delivery: {
    lens: "Delivery-side standing versus peers, led by workforce and client sentiment.",
    leadMetric: "assessment",
  },
  regional: {
    lens: "Peer standing on the metrics AG reports globally.",
    leadMetric: "assessment",
  },
};

function num(v: number | null | undefined, suffix = ""): string {
  return v === null || v === undefined ? "—" : `${v}${suffix}`;
}

function growthLabel(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v > 0 ? "+" : ""}${v}%`;
}

function recognitionLabel(direction: string | null | undefined, score: number | null | undefined): string {
  if (!direction) return "—";
  return score === null || score === undefined ? direction : `${direction} (${score})`;
}

/**
 * Fetch the focal firm's quarterly revenue series. Returns [] when AG carries
 * none — which is the honest answer for a private company, not an error.
 */
async function focalQuarterlyRevenue(ticker: string): Promise<QuarterPoint[]> {
  try {
    const res = await agFetch("providers/snapshot", { ticker });
    const body = res.body as { snapshot?: { quarterlyRevenue?: unknown } } | undefined;
    const raw = body?.snapshot?.quarterlyRevenue;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (q): q is { quarter: string; revenueUsdM: number } =>
          !!q &&
          typeof (q as { quarter?: unknown }).quarter === "string" &&
          typeof (q as { revenueUsdM?: unknown }).revenueUsdM === "number"
      )
      .map((q) => ({ quarter: q.quarter, revenueUsdM: q.revenueUsdM }))
      .sort((a, b) => a.quarter.localeCompare(b.quarter));
  } catch {
    return [];
  }
}

export async function buildPersonaBriefing(
  brief: ArBrief,
  personaId: PersonaId
): Promise<PersonaBriefing | null> {
  const focal = brief.focal;
  if (!focal) return null;

  const rule = PERSONA_LENS[personaId] ?? PERSONA_LENS.executive;
  const competitors = brief.competitors ?? [];

  // --- Peer scorecard: focal first, then each named competitor. ------------
  const peerRows: PeerRow[] = [
    {
      name: `${focal.name} (you)`,
      ticker: focal.ticker,
      isFocal: true,
      assessment: num(focal.assessmentScore),
      aiReadiness: num(focal.aiReadinessScore),
      revenueGrowth: growthLabel(focal.revenueGrowthYoy),
      recognition: recognitionLabel(focal.gapDirection, focal.gapScore),
    },
    ...competitors.map((c) => ({
      name: c.name,
      ticker: c.ticker,
      isFocal: false,
      assessment: num(c.assessmentScore),
      aiReadiness: num(c.aiReadinessScore),
      revenueGrowth: growthLabel(c.revenueGrowthYoy),
      recognition: recognitionLabel(c.gapDirection, c.gapScore),
    })),
  ];

  // --- Where the focal firm ranks on its lead metric. ----------------------
  const scored = peerRows
    .map((r) => {
      const v =
        rule.leadMetric === "ai"
          ? focalNumber(r.aiReadiness)
          : rule.leadMetric === "growth"
            ? focalNumber(r.revenueGrowth.replace("%", ""))
            : focalNumber(r.assessment);
      return { row: r, v };
    })
    .filter((x) => x.v !== null) as { row: PeerRow; v: number }[];
  scored.sort((a, b) => b.v - a.v);
  const rank = scored.findIndex((x) => x.row.isFocal) + 1;
  const metricName =
    rule.leadMetric === "ai" ? "AI readiness" : rule.leadMetric === "growth" ? "revenue growth" : "assessment score";

  let headline: string;
  if (rank > 0 && scored.length > 1) {
    const leader = scored[0].row;
    headline = leader.isFocal
      ? `${focal.name} leads this peer set on ${metricName} (${scored[0].v}).`
      : `${focal.name} ranks ${rank} of ${scored.length} on ${metricName} — ${leader.name} leads at ${scored[0].v}.`;
  } else {
    headline = `${focal.name}: peer comparison on ${metricName} is incomplete — AG carries no value for some of this set.`;
  }
  if (focal.gapDirection) {
    headline += ` AG reads the firm as ${focal.gapDirection}${focal.gapScore !== null ? ` (gap ${focal.gapScore})` : ""}.`;
  }

  // --- Reputation movement this quarter. ----------------------------------
  const lenses = brief.reputationLenses ?? [];
  const reputation: ReputationRow[] = lenses.map((l) => ({
    lens: l.name,
    movement: `${l.prev} → ${l.last}`,
    delta: l.delta,
    span: l.span,
  }));
  const reputationSpan = lenses.length ? lenses[0].span : null;

  // --- Competitor intel matrix. -------------------------------------------
  const competitorIntel: CompetitorIntelRow[] = competitors.map((c) => {
    const standing =
      c.assessmentScore !== null && focal.assessmentScore !== null
        ? c.assessmentScore > focal.assessmentScore
          ? `Ahead of you (${c.assessmentScore} vs ${focal.assessmentScore})`
          : c.assessmentScore < focal.assessmentScore
            ? `Behind you (${c.assessmentScore} vs ${focal.assessmentScore})`
            : `Level with you (${c.assessmentScore})`
        : "AG carries no assessment score for this pair";
    const quarterRead =
      c.revenueGrowthYoy !== null
        ? `Revenue ${growthLabel(c.revenueGrowthYoy)} YoY; AI readiness ${num(c.aiReadinessScore)}.`
        : `AI readiness ${num(c.aiReadinessScore)}; AG carries no revenue growth for this firm.`;
    const watchItem =
      c.gapDirection === "over-hyped"
        ? "Narrative running ahead of delivery — contestable in evaluations."
        : c.gapDirection === "under-recognized"
          ? "Delivering ahead of its story — likely to gain recognition."
          : c.gapDirection === "aligned"
            ? "Story and delivery aligned — expect stable positioning."
            : "AG carries no recognition read for this firm.";
    return { name: c.name, standing, quarterRead, watchItem };
  });

  // --- Market movements, framed against the peer group. --------------------
  const movementItems = brief.movement?.items ?? [];
  const marketMovements = (movementItems.length ? movementItems : brief.emergencies ?? [])
    .slice(0, 6)
    .map((m) => ({ title: m.title, detail: m.detail, source: m.source }));

  // --- Quarterly revenue series (focal). ----------------------------------
  const quarterlyRevenue = await focalQuarterlyRevenue(focal.ticker);

  // --- Honest data gaps. ---------------------------------------------------
  const dataGaps: string[] = [];
  dataGaps.push(
    "Share-price performance is not shown: AnalystGenius carries no market-price series for any firm, and its /financial endpoint is excluded from this product because its values are not real. Add a market-data source to include it."
  );
  if (focal.revenueUsd === null && focal.revenueGrowthYoy === null) {
    dataGaps.push(
      `${focal.name} is privately held, so AG carries no revenue or market series for it. Financial comparison below is therefore peer-side only.`
    );
  }
  if (!quarterlyRevenue.length && focal.revenueUsd !== null) {
    dataGaps.push(`AG carries no quarterly revenue series for ${focal.name} in this response.`);
  }
  const missingGrowth = competitors.filter((c) => c.revenueGrowthYoy === null).map((c) => c.name);
  if (missingGrowth.length) {
    dataGaps.push(`No revenue-growth figure in AG for: ${missingGrowth.join(", ")}.`);
  }
  // AG's providers/snapshot currently returns the same number for assessment
  // and AI readiness, while its provider catalogue reports them differently.
  // Two identical columns would read as two measures agreeing, so say plainly
  // that they are one value repeated rather than independent corroboration.
  const withBoth = [
    { a: focal.assessmentScore, b: focal.aiReadinessScore },
    ...competitors.map((c) => ({ a: c.assessmentScore, b: c.aiReadinessScore })),
  ].filter((x) => x.a !== null && x.b !== null);
  if (withBoth.length > 1 && withBoth.every((x) => x.a === x.b)) {
    dataGaps.push(
      "Assessment and AI-readiness show the same value for every firm here: AG's snapshot endpoint returns one figure for both fields (its provider catalogue reports them separately). Read them as a single score, not as two measures agreeing."
    );
  }

  return {
    personaId,
    headline,
    lens: rule.lens,
    scorecardHeaders: ["FIRM", "ASSESSMENT", "AI READINESS", "REVENUE YOY", "RECOGNITION"],
    peerRows,
    reputation,
    reputationSpan,
    competitorIntel,
    marketMovements,
    quarterlyRevenue,
    dataGaps,
  };
}

function focalNumber(s: string): number | null {
  const n = Number(String(s).replace("+", ""));
  return Number.isFinite(n) ? n : null;
}
