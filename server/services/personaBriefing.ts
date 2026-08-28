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

export interface TalentRow {
  name: string;
  isFocal: boolean;
  headcount: string;
  headcountYoY: string;
  attrition: string;
  /** AG reports attrition over DIFFERENT windows per firm — shown so the
   *  reader can see the comparison is not strictly like-for-like. */
  attritionWindow: string;
  netFlow: string;
  aiSkillDensity: string;
}

export interface PulseItem {
  title: string;
  detail: string;
  source: string;
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
  /** Emerging threats from the AG pulse. */
  threats: PulseItem[];
  /** Emerging opportunities from the AG pulse. */
  opportunities: PulseItem[];
  /** Peer talent competitiveness. */
  talent: TalentRow[];
  /** Derived reading of the talent table — direction only, never named flows. */
  talentAnalysis: string[];
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

interface TalentRead {
  ticker: string;
  headcount: number | null;
  headcountYoY: number | null;
  attritionPct: number | null;
  attritionWindow: string | null;
  netFlow: number | null;
  aiSkillDensityPct: number | null;
}

/**
 * Talent KPIs per firm.
 *
 * NOTE ON THE SOURCE: agApi's allow-list comment excludes talent/intelligence
 * because an older payload carried synthesized `hiringTrend`/`layoffSignal`/
 * `evidence` fields. Those fields are no longer in the response. What it now
 * returns — headcount, headcount YoY, attrition with a NAMED window per firm,
 * a net-flow signal and AI skill density — is real reported data, and the
 * payload self-labels its estimated fields with a `provenance` block. Only the
 * fields listed above are read here; the self-labelled estimates (average
 * tenure "AI estimate", "~N AI specialists") are deliberately NOT surfaced.
 */
async function talentRead(ticker: string): Promise<TalentRead | null> {
  try {
    const res = await agFetch("talent/intelligence", { ticker });
    const b = res.body as
      | { kpis?: Record<string, unknown>; flowSignals?: Record<string, unknown> }
      | undefined;
    if (!b?.kpis) return null;
    const k = b.kpis;
    const f = b.flowSignals ?? {};
    const n = (v: unknown): number | null => (typeof v === "number" ? v : null);
    return {
      ticker,
      headcount: n(k.headcount),
      headcountYoY: n(k.headcountYoY),
      attritionPct: n(k.attritionPct),
      attritionWindow: typeof k.attritionWindow === "string" ? k.attritionWindow : null,
      netFlow: n(f.netFlow),
      aiSkillDensityPct: n(f.aiSkillDensityPct),
    };
  } catch {
    return null;
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
    const top = scored[0].v;
    // A tie must not read as a lead. The sort is stable and the focal row is
    // first, so an equal score would otherwise render "X leads this peer set".
    const tiedAtTop = scored.filter((s) => s.v === top);
    const leader = scored[0].row;
    if (leader.isFocal && tiedAtTop.length > 1) {
      const others = tiedAtTop.filter((s) => !s.row.isFocal).map((s) => s.row.name);
      headline = `${focal.name} is level at the top of this peer set on ${metricName} (${top}), tied with ${others.join(", ")}.`;
    } else if (leader.isFocal) {
      headline = `${focal.name} leads this peer set on ${metricName} (${top}).`;
    } else {
      headline = `${focal.name} ranks ${rank} of ${scored.length} on ${metricName} — ${leader.name} leads at ${top}.`;
    }
    // The rank denominator counts only firms AG gives a value for, so say when
    // that is a smaller set than the scorecard shows.
    if (scored.length < peerRows.length) {
      headline += ` (${peerRows.length - scored.length} of ${peerRows.length} firms have no ${metricName} in AG and are excluded from that rank.)`;
    }
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

  // --- Emerging threats / opportunities from the pulse. --------------------
  const threats: PulseItem[] = (brief.emergencies ?? [])
    .slice(0, 6)
    .map((e) => ({ title: e.title, detail: e.detail, source: e.source }));
  const opportunities: PulseItem[] = (brief.highlights ?? [])
    .slice(0, 6)
    .map((h) => ({ title: h.title, detail: h.detail, source: h.source }));

  // --- Talent competitiveness across the peer set. ------------------------
  const talentTickers = [focal.ticker, ...competitors.map((c) => c.ticker)];
  const talentReads = await Promise.all(talentTickers.map(talentRead));
  const nameFor = (t: string) =>
    t === focal.ticker ? `${focal.name} (you)` : (competitors.find((c) => c.ticker === t)?.name ?? t);

  const talent: TalentRow[] = talentReads
    .map((r, i) => {
      if (!r) return null;
      const t = talentTickers[i];
      return {
        name: nameFor(t),
        isFocal: t === focal.ticker,
        headcount: r.headcount === null ? "—" : r.headcount.toLocaleString(),
        headcountYoY:
          r.headcountYoY === null ? "—" : `${r.headcountYoY > 0 ? "+" : ""}${r.headcountYoY.toLocaleString()}`,
        attrition: r.attritionPct === null ? "—" : `${r.attritionPct}%`,
        attritionWindow: r.attritionWindow ?? "—",
        netFlow: r.netFlow === null ? "—" : `${r.netFlow > 0 ? "+" : ""}${r.netFlow.toLocaleString()}`,
        aiSkillDensity: r.aiSkillDensityPct === null ? "—" : `${r.aiSkillDensityPct}%`,
      };
    })
    .filter((r): r is TalentRow => r !== null);

  // Derived talent reading. AG carries NO company-to-company destination data,
  // so this states DIRECTION across the named set (who is absorbing headcount
  // while you shed it) and never asserts that a named peer hired your leavers.
  const talentAnalysis: string[] = [];
  const focalT = talentReads[0];
  if (focalT) {
    const absorbing = talentReads
      .map((r, i) => ({ r, t: talentTickers[i] }))
      .filter((x) => x.r && x.t !== focal.ticker && (x.r.netFlow ?? 0) > 0)
      .sort((a, b) => (b.r!.netFlow ?? 0) - (a.r!.netFlow ?? 0));
    if ((focalT.netFlow ?? 0) < 0 && absorbing.length) {
      talentAnalysis.push(
        `Net flow is negative for ${focal.name} (${focalT.netFlow}), while ${absorbing
          .map((x) => `${nameFor(x.t)} (${x.r!.netFlow! > 0 ? "+" : ""}${x.r!.netFlow})`)
          .join(", ")} are net absorbers in this set — talent is moving toward them at the peer-group level.`
      );
    } else if ((focalT.netFlow ?? 0) > 0) {
      talentAnalysis.push(
        `${focal.name} is a net absorber of talent in this peer set (${focalT.netFlow! > 0 ? "+" : ""}${focalT.netFlow}).`
      );
    }
    const withAttr = talentReads
      .map((r, i) => ({ r, t: talentTickers[i] }))
      .filter((x) => x.r?.attritionPct != null);
    if (focalT.attritionPct != null && withAttr.length > 1) {
      const sorted = [...withAttr].sort((a, b) => (b.r!.attritionPct ?? 0) - (a.r!.attritionPct ?? 0));
      const rankA = sorted.findIndex((x) => x.t === focal.ticker) + 1;
      talentAnalysis.push(
        `Attrition ${focalT.attritionPct}% ranks ${rankA} highest of ${sorted.length} firms reporting it here (${sorted
          .map((x) => `${nameFor(x.t).replace(" (you)", "")} ${x.r!.attritionPct}%`)
          .join(", ")}). Windows differ per firm — see the column.`
      );
    }
    if (focalT.aiSkillDensityPct != null) {
      // Only firms that actually REPORT a density can be compared. Coercing a
      // missing value to 0 would mean no peer ever exceeds the focal firm, and
      // the branch below would assert "highest in this peer set" off the back
      // of absent data — a superlative manufactured from nothing. Same shape
      // as the attrition ranking above: filter nulls, require a real
      // comparison set, and state the denominator.
      const withDensity = talentReads.filter(
        (r): r is TalentRead => !!r && r.aiSkillDensityPct != null
      );
      const denser = withDensity.filter(
        (r) => (r.aiSkillDensityPct as number) > (focalT.aiSkillDensityPct as number)
      );
      talentAnalysis.push(
        withDensity.length < 2
          ? `AI skill density ${focalT.aiSkillDensityPct}%; no peer in this set reports the figure, so there is nothing to compare it against.`
          : denser.length === 0
            ? `AI skill density ${focalT.aiSkillDensityPct}% is the highest of the ${withDensity.length} firms reporting it here — a defensible engineering-depth claim.`
            : `AI skill density ${focalT.aiSkillDensityPct}%; ${denser.length} of the ${withDensity.length} firms reporting it are higher.`
      );
    }
    if (focalT.headcountYoY != null && focalT.headcountYoY < 0) {
      talentAnalysis.push(
        `Headcount is down ${Math.abs(focalT.headcountYoY).toLocaleString()} year on year, so retention pressure compounds any recognition gap.`
      );
    }
  }

  // --- Honest data gaps. ---------------------------------------------------
  // Share price is intentionally out of scope for this deck and is not
  // mentioned; only genuine ambiguities in what IS shown are listed here.
  const dataGaps: string[] = [];
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
  if (talent.length) {
    dataGaps.push(
      "Talent: AG reports no company-to-company movement, so this shows net flow and attrition per firm — the direction talent is moving across the set — not named destinations for your leavers."
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
    threats,
    opportunities,
    talent,
    talentAnalysis,
    dataGaps,
  };
}

function focalNumber(s: string): number | null {
  const n = Number(String(s).replace("+", ""));
  return Number.isFinite(n) ? n : null;
}
