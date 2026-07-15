import { agConfigured, agFetch } from "./agApi";

// ============================================================================
// AG intelligence → AR brief derivation.
//
// Turns live AnalystGenius signals into the three things the AR cockpit and
// stakeholder decks run on: emergencies (where the org is exposed), highlights
// (what AR can lead with), and stakeholder actions (who needs a briefing and
// with what). Every item is derived from a named field of a real API response
// and carries its source — nothing is invented. If the live fetch fails the
// brief returns { live:false } and callers keep their clearly-labelled demo
// content instead.
// ============================================================================

const FOCAL_TICKER = process.env.AG_FOCAL_TICKER ?? "CGEMY";
const COMPETITOR_TICKERS = (process.env.AG_COMPETITOR_TICKERS ?? "ACN,CTSH,IBM")
  .split(",")
  .map((t) => t.trim().toUpperCase())
  .filter(Boolean);

const CACHE_TTL_MS = 10 * 60 * 1000;

export interface ArBriefItem {
  id: string;
  title: string;
  detail: string;
  source: string; // upstream endpoint + field the item is derived from
  severity?: "HIGH" | "MEDIUM" | "LOW";
  metric?: string; // the raw number(s) behind the item, for display
}

export interface ArCompetitorRead {
  ticker: string;
  name: string;
  assessmentScore: number | null;
  aiReadinessScore: number | null;
  revenueGrowthYoy: number | null;
  gapDirection: string | null;
  gapScore: number | null;
}

export interface ArBrief {
  live: boolean;
  reason?: string;
  generatedAt: string;
  focal?: {
    ticker: string;
    name: string;
    assessmentScore: number | null;
    aiReadinessScore: number | null;
    revenueUsd: number | null;
    revenueGrowthYoy: number | null;
    gapScore: number | null;
    gapDirection: string | null;
    gapHeadline: string | null;
    reputationInsightTitle: string | null;
    reputationInsightBody: string | null;
  };
  emergencies: ArBriefItem[];
  highlights: ArBriefItem[];
  actions: ArBriefItem[];
  competitors: ArCompetitorRead[];
  suggestedQuestions: string[];
  sourceNote: string;
}

interface SentimentSeries {
  name: string;
  data: number[];
}

let _cache: { brief: ArBrief; at: number } | null = null;

function ok(r: { status: number; body: unknown }): any | null {
  if (r.status < 200 || r.status >= 300) return null;
  const b = r.body as any;
  return b && b.success !== false ? b : null;
}

// Which stakeholder lens cares about which reputation lens moving.
const LENS_STAKEHOLDER: Record<string, { leader: string; why: string }> = {
  "Financial Analyst": { leader: "CFO / Investor Relations", why: "analyst-day and guidance narrative" },
  Media: { leader: "Comms / Marketing", why: "press narrative and rapid-response lines" },
  Social: { leader: "Comms / Marketing", why: "social narrative and employee advocacy" },
  Customer: { leader: "Commercial / Sales leadership", why: "reference programme and win-loss story" },
  Employee: { leader: "CHRO / Delivery leadership", why: "talent retention and employer-brand proof" },
  "Employee · Technical": { leader: "CTO / Engineering leadership", why: "technical talent story and platform credibility" },
  Pricing: { leader: "Commercial / Deal desk", why: "pricing-pressure counter-narrative and value evidence" },
};

function deriveLensMoves(series: SentimentSeries[], quarters: string[]) {
  const moves: { name: string; delta: number; last: number; prev: number; span: string }[] = [];
  for (const s of series) {
    const d = (s.data ?? []).filter((v) => typeof v === "number");
    if (d.length < 2) continue;
    const last = d[d.length - 1];
    const prev = d[d.length - 2];
    const span =
      quarters.length >= 2 ? `${quarters[quarters.length - 2]} → ${quarters[quarters.length - 1]}` : "last two periods";
    moves.push({ name: s.name, delta: last - prev, last, prev, span });
  }
  return moves;
}

async function buildBrief(): Promise<ArBrief> {
  const generatedAt = new Date().toISOString();
  const empty: ArBrief = {
    live: false,
    generatedAt,
    emergencies: [],
    highlights: [],
    actions: [],
    competitors: [],
    suggestedQuestions: [],
    sourceNote: "AnalystGenius live intelligence unavailable — cockpit is showing labelled demo content.",
  };

  if (!agConfigured()) return { ...empty, reason: "AG_API_KEY not configured" };

  // Fetch focal signals + competitor snapshots in parallel.
  const [snapR, gapR, repR, ...compRs] = await Promise.all([
    agFetch("providers/snapshot", { ticker: FOCAL_TICKER }),
    agFetch("narrative-reality-gap", { ticker: FOCAL_TICKER }),
    agFetch("reputation-tracker/trends", { ticker: FOCAL_TICKER }),
    ...COMPETITOR_TICKERS.flatMap((t) => [
      agFetch("providers/snapshot", { ticker: t }),
      agFetch("narrative-reality-gap", { ticker: t }),
    ]),
  ]);

  const snap = ok(snapR)?.snapshot ?? null;
  const gap = ok(gapR)?.gap ?? null;
  const rep = ok(repR);

  if (!snap && !gap && !rep) return { ...empty, reason: `no live data for ${FOCAL_TICKER}` };

  const emergencies: ArBriefItem[] = [];
  const highlights: ArBriefItem[] = [];
  const actions: ArBriefItem[] = [];

  const focalName: string = snap?.displayName ?? snap?.name ?? gap?.providerName ?? FOCAL_TICKER;

  // ---- Reputation lens movement → emergencies / highlights / actions ----
  const trend = rep?.sentimentTrend;
  if (trend?.series?.length) {
    const moves = deriveLensMoves(trend.series, trend.quarters ?? []);
    for (const m of moves.sort((a, b) => a.delta - b.delta)) {
      if (m.delta <= -5) {
        emergencies.push({
          id: `rep-drop-${m.name}`,
          title: `${m.name} sentiment falling`,
          detail: `${m.name} lens dropped ${Math.abs(m.delta)} pts (${m.prev} → ${m.last}, ${m.span}). ${
            rep?.insightTitle ? `Context: ${rep.insightTitle}.` : ""
          }`.trim(),
          source: "AG reputation-tracker/trends · sentimentTrend",
          severity: m.delta <= -10 ? "HIGH" : "MEDIUM",
          metric: `${m.prev} → ${m.last}`,
        });
        const stake = LENS_STAKEHOLDER[m.name];
        if (stake) {
          actions.push({
            id: `act-${m.name}`,
            title: `Brief ${stake.leader}`,
            detail: `${m.name} sentiment is down ${Math.abs(m.delta)} pts (${m.span}) — they own the ${stake.why}. Arm them with the underlying signal before it reaches them second-hand.`,
            source: "AG reputation-tracker/trends · sentimentTrend",
            severity: m.delta <= -10 ? "HIGH" : "MEDIUM",
          });
        }
      } else if (m.delta >= 5) {
        highlights.push({
          id: `rep-up-${m.name}`,
          title: `${m.name} sentiment improving`,
          detail: `${m.name} lens up ${m.delta} pts (${m.prev} → ${m.last}, ${m.span}) — usable as momentum proof in briefings.`,
          source: "AG reputation-tracker/trends · sentimentTrend",
          metric: `${m.prev} → ${m.last}`,
        });
      }
    }
  }

  // ---- Narrative–reality gap → emergency or opportunity ----
  if (gap) {
    if (gap.direction === "over-hyped" && (gap.gapScore ?? 0) >= 15) {
      emergencies.push({
        id: "gap-overhyped",
        title: "Narrative running ahead of reality",
        detail: `${gap.headline ?? "Narrative–reality gap flagged."} Gap score ${gap.gapScore}. Claims risk being challenged in the next assessment cycle.`,
        source: "AG narrative-reality-gap",
        severity: (gap.gapScore ?? 0) >= 30 ? "HIGH" : "MEDIUM",
        metric: `gap ${gap.gapScore} · ${gap.direction}`,
      });
    } else if (gap.direction === "under-recognized") {
      highlights.push({
        id: "gap-underrecognized",
        title: "Reality running ahead of the narrative",
        detail: `${gap.headline ?? ""} Gap score ${gap.gapScore} (under-recognized) — measured performance outpaces the analyst/media story. This is AR's proactive-briefing opening.`,
        source: "AG narrative-reality-gap",
        metric: `gap ${gap.gapScore} · under-recognized`,
      });
      actions.push({
        id: "act-strategy-gap",
        title: "Brief Strategy / CMO on the recognition gap",
        detail: `The narrative under-tells measured reality (gap ${gap.gapScore}). Commission a proactive analyst briefing wave with the reality signals as the spine.`,
        source: "AG narrative-reality-gap",
        severity: "MEDIUM",
      });
    }
    for (const d of (gap.topDivergences ?? []).slice(0, 2)) {
      if (typeof d.delta === "number" && Math.abs(d.delta) >= 15) {
        emergencies.push({
          id: `div-${(d.theme ?? "theme").toLowerCase().replace(/\W+/g, "-")}`,
          title: `Divergence: ${d.theme}`,
          detail: `${d.interpretation ?? "Narrative and measured reality diverge on this theme."} (narrative ${d.narrativeScore ?? "—"} vs reality ${d.realityScore ?? "—"}).`,
          source: "AG narrative-reality-gap · topDivergences",
          severity: Math.abs(d.delta) >= 25 ? "HIGH" : "MEDIUM",
          metric: `Δ ${d.delta}`,
        });
      }
    }
  }

  // ---- Snapshot strengths/risks → highlights / emergencies ----
  if (snap) {
    for (const [i, st] of (snap.topStrengths ?? []).slice(0, 3).entries()) {
      highlights.push({
        id: `strength-${i}`,
        title: "Provable strength",
        detail: String(st),
        source: "AG providers/snapshot · topStrengths",
      });
    }
    for (const [i, r] of (snap.topRisks ?? []).slice(0, 2).entries()) {
      emergencies.push({
        id: `risk-${i}`,
        title: "Flagged risk",
        detail: String(r),
        source: "AG providers/snapshot · topRisks",
        severity: "MEDIUM",
      });
    }
    if (typeof snap.revenueGrowthYoy === "number" && snap.revenueGrowthYoy > 0) {
      highlights.push({
        id: "rev-growth",
        title: `Revenue growing ${snap.revenueGrowthYoy}% YoY`,
        detail: `Reported revenue ${snap.revenueUsd ? `$${(snap.revenueUsd / 1e9).toFixed(1)}B` : "—"} — quantified scale proof for evaluation narratives.`,
        source: "AG providers/snapshot · revenueUsd / revenueGrowthYoy",
        metric: `${snap.revenueGrowthYoy}% YoY`,
      });
    }
  }

  // ---- Competitor reads ----
  const competitors: ArCompetitorRead[] = [];
  for (let i = 0; i < COMPETITOR_TICKERS.length; i++) {
    const cSnap = ok(compRs[i * 2])?.snapshot ?? null;
    const cGap = ok(compRs[i * 2 + 1])?.gap ?? null;
    if (!cSnap && !cGap) continue;
    competitors.push({
      ticker: COMPETITOR_TICKERS[i],
      name: cSnap?.displayName ?? cSnap?.name ?? cGap?.providerName ?? COMPETITOR_TICKERS[i],
      assessmentScore: cSnap?.assessmentScore ?? null,
      aiReadinessScore: cSnap?.aiReadinessScore ?? null,
      revenueGrowthYoy: cSnap?.revenueGrowthYoy ?? null,
      gapDirection: cGap?.direction ?? null,
      gapScore: cGap?.gapScore ?? null,
    });
  }
  if (snap?.assessmentScore != null) {
    for (const c of competitors) {
      if (c.assessmentScore != null && c.assessmentScore > snap.assessmentScore) {
        emergencies.push({
          id: `comp-${c.ticker}`,
          title: `${c.name} scores ahead`,
          detail: `${c.name} assessment score ${c.assessmentScore} vs ${focalName} ${snap.assessmentScore}. Expect the comparison in evaluations — prepare the counter-evidence.`,
          source: "AG providers/snapshot · assessmentScore (both firms)",
          severity: "MEDIUM",
          metric: `${c.assessmentScore} vs ${snap.assessmentScore}`,
        });
      }
    }
  }

  // Cap list lengths — answer-first, most severe first.
  const sevRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  emergencies.sort((a, b) => sevRank[a.severity ?? "LOW"] - sevRank[b.severity ?? "LOW"]);
  actions.sort((a, b) => sevRank[a.severity ?? "LOW"] - sevRank[b.severity ?? "LOW"]);

  return {
    live: true,
    generatedAt,
    focal: {
      ticker: FOCAL_TICKER,
      name: focalName,
      assessmentScore: snap?.assessmentScore ?? null,
      aiReadinessScore: snap?.aiReadinessScore ?? null,
      revenueUsd: snap?.revenueUsd ?? null,
      revenueGrowthYoy: snap?.revenueGrowthYoy ?? null,
      gapScore: gap?.gapScore ?? null,
      gapDirection: gap?.direction ?? null,
      gapHeadline: gap?.headline ?? null,
      reputationInsightTitle: rep?.insightTitle ?? null,
      reputationInsightBody: rep?.insightBody ?? null,
    },
    emergencies: emergencies.slice(0, 5),
    highlights: highlights.slice(0, 5),
    actions: actions.slice(0, 5),
    competitors,
    suggestedQuestions: (rep?.suggestedQuestions ?? []).slice(0, 5),
    sourceNote:
      "Derived from live AnalystGenius signals (providers/snapshot, narrative-reality-gap, reputation-tracker/trends). Each item names the field it comes from.",
  };
}

export async function getArBrief(force = false): Promise<ArBrief> {
  const now = Date.now();
  if (!force && _cache && now - _cache.at < CACHE_TTL_MS) return _cache.brief;
  try {
    const brief = await buildBrief();
    // Only cache successful live builds; keep retrying failures on next call.
    if (brief.live) _cache = { brief, at: now };
    return brief;
  } catch (err) {
    return {
      live: false,
      reason: err instanceof Error ? err.message : "derivation failed",
      generatedAt: new Date().toISOString(),
      emergencies: [],
      highlights: [],
      actions: [],
      competitors: [],
      suggestedQuestions: [],
      sourceNote: "AnalystGenius live intelligence unavailable — cockpit is showing labelled demo content.",
    };
  }
}
