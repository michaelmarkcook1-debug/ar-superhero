import { agConfigured, agFetch } from "./agApi";
import { captureSignals, deriveMovement, type MovementReport } from "./signalHistory";

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

// Default focal company — used whenever a caller doesn't specify one (the
// cockpit's own AG Pulse always tracks "us", i.e. this default). Deck
// generators that let the user pick a vendor pass their own focalTicker
// instead (see server/services/vendors.ts for the vendor -> ticker map).
export const DEFAULT_FOCAL_TICKER = process.env.AG_FOCAL_TICKER ?? "CGEMY";
const DEFAULT_COMPETITOR_TICKERS = (process.env.AG_COMPETITOR_TICKERS ?? "ACN,CTSH,IBM")
  .split(",")
  .map((t) => t.trim().toUpperCase())
  .filter(Boolean);

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_COMPETITORS = 5;
const TICKER_RE = /^[A-Z0-9.]{1,12}$/;

/** Sanitise a caller-supplied competitor list: uppercase, well-formed, no focal, capped. */
export function normaliseCompetitors(raw: string[] | undefined, focalTicker: string): string[] {
  const fallback = DEFAULT_COMPETITOR_TICKERS.filter((t) => t !== focalTicker);
  if (!raw?.length) return fallback.length ? fallback : DEFAULT_COMPETITOR_TICKERS;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const up = t.trim().toUpperCase();
    if (!TICKER_RE.test(up) || up === focalTicker || seen.has(up)) continue;
    seen.add(up);
    out.push(up);
    if (out.length >= MAX_COMPETITORS) break;
  }
  return out.length ? out : fallback.length ? fallback : DEFAULT_COMPETITOR_TICKERS;
}

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

// Raw-but-typed passthrough of the AG Pulse narrative–reality gap analysis.
// Values are relayed verbatim from the API; nulls stay null (rendered as "—").
export interface ArGapAnalysis {
  headline: string | null;
  gapScore: number | null;
  direction: string | null;
  agInsight: string | null;
  narrativeSignals: { source: string; sentiment: number | null; volume: number | null; themes: string[] }[];
  realitySignals: { metric: string; label: string; value: number | null }[];
  topDivergences: {
    theme: string;
    narrativeScore: number | null;
    realityScore: number | null;
    delta: number | null;
    interpretation: string | null;
  }[];
  generatedAt: string | null;
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
  gapAnalysis?: ArGapAnalysis;
  /** Real captured movement over the tracking window (our own snapshots). */
  movement?: MovementReport;
  /** Reputation lens movement (last two periods), verbatim from AG trends. */
  reputationLenses?: { name: string; prev: number; last: number; delta: number; span: string }[];
  competitorTickers: string[];
  emergencies: ArBriefItem[];
  highlights: ArBriefItem[];
  actions: ArBriefItem[];
  competitors: ArCompetitorRead[];
  suggestedQuestions: string[];
  sourceNote: string;
  // True when the focal snapshot (the source of the core scores) did NOT load.
  // A degraded brief is never cached, so the next request retries fresh rather
  // than serving blank scores for the whole cache window.
  degraded?: boolean;
}

interface SentimentSeries {
  name: string;
  data: number[];
}

const _cache = new Map<string, { brief: ArBrief; at: number }>();

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

// ---------------------------------------------------------------------------
// Gap-headline verification.
//
// AG returns `headline` as editorial copy alongside the measured `gapScore`
// and `direction`. The two can disagree — a firm measured "aligned" at gap 6
// has shipped the headline "the most under-recognized provider in AG's
// tracking set" while two other tracked firms measured 24. Publishing that
// unchecked puts a false claim in the hero and in every deck, so the headline
// is only used when it agrees with the measurement.
//
// Two checks, both conservative (only demonstrable contradictions are caught):
//   1. Direction — if the copy asserts a lean the measurement contradicts.
//   2. Superlative — if the copy claims a rank the tracked set contradicts.
// On failure the headline is replaced with one derived from the real figures,
// never left to imply something the numbers do not support.
// ---------------------------------------------------------------------------

type GapDir = "under" | "over" | "aligned" | null;

function claimedDirection(headline: string): GapDir {
  const h = headline.toLowerCase();
  // Directional leans are checked first, so a headline that names a lean is
  // never mistaken for an alignment claim because it also says "aligned".
  if (/under-recognis|under-recogniz|under-narrat|under-distribut|under-told|under-represent/.test(h)) return "under";
  if (/over-hyped|over-stat|over-claim|over-represent|ahead of (its|their) delivery/.test(h)) return "over";
  // Alignment claims. AG has shipped "narrative and reality are close" on a
  // firm measured over-hyped at gap 15, which reads as a clean bill of health
  // the measurement does not support. Kept narrow — the phrase must actually
  // be about the narrative/story/reality being in step, so wording like
  // "leads on narrative coherence but reality signals show slower conversion"
  // (a genuine over-hyped read) is not caught.
  if (
    /\b(broadly|closely|largely|well|fully)[- ]aligned\b/.test(h) ||
    /\b(narrative|story|messaging)\b[^.]{0,60}\b(is|are)\s+(broadly\s+|closely\s+)?(aligned|in step|in line|close)\b/.test(h) ||
    /\b(narrative|story)\s+(and|vs\.?|versus)\s+(the\s+)?(measured\s+)?(reality|delivery)\b[^.]{0,30}\b(are|is)\s+(close|aligned|matched|in step)\b/.test(h)
  ) {
    return "aligned";
  }
  return null;
}

function measuredDirection(direction: string | null): GapDir {
  if (!direction) return null;
  const d = direction.toLowerCase();
  if (d.includes("under")) return "under";
  if (d.includes("over")) return "over";
  if (d.includes("align")) return "aligned";
  return null;
}

function derivedHeadline(name: string, score: number | null, direction: string | null): string {
  const dir = measuredDirection(direction);
  const scorePart = score === null ? "" : ` (gap ${score})`;
  if (dir === "aligned") return `${name}'s narrative and measured reality are broadly aligned${scorePart}.`;
  if (dir === "under") return `${name} is delivering ahead of its market story${scorePart}.`;
  if (dir === "over") return `${name}'s market story is running ahead of the measured delivery${scorePart}.`;
  return `${name}: narrative–reality gap${scorePart}.`;
}

export function verifiedGapHeadline(
  headline: string | null,
  score: number | null,
  direction: string | null,
  focalName: string,
  competitors: ArCompetitorRead[]
): string | null {
  if (!headline) return null;
  const measured = measuredDirection(direction);

  // 1. Directional contradiction.
  const claimed = claimedDirection(headline);
  if (claimed && measured && claimed !== measured) {
    return derivedHeadline(focalName, score, direction);
  }

  // 2. Superlative contradiction — only checkable against the tracked set.
  if (/\b(most|least|highest|lowest|biggest|largest|widest|#1|number one)\b/i.test(headline)) {
    const peers = competitors.filter((c) => typeof c.gapScore === "number");
    if (peers.length && typeof score === "number") {
      const beaten = peers.filter((c) => (c.gapScore as number) > score);
      if (beaten.length) return derivedHeadline(focalName, score, direction);
    }
    // A superlative on a firm measured "aligned" is unsupportable regardless
    // of the peer set — aligned means least divergent, not most.
    if (measured === "aligned") return derivedHeadline(focalName, score, direction);
  }

  return headline;
}

/**
 * The same verification for AG's `agInsight` narrative, which carries the same
 * class of claim in prose (observed: "one of the most under-recognized
 * providers in our tracking set" on a firm measured aligned at the lowest gap
 * in the set). Only the offending SENTENCE is dropped — the rest of the
 * insight is usually sound and worth keeping. If nothing survives, the caller
 * gets null and the section is simply shorter, per the pattern used
 * throughout this service.
 */
export function verifiedInsight(
  insight: string | null,
  score: number | null,
  direction: string | null,
  competitors: ArCompetitorRead[]
): string | null {
  if (!insight) return null;
  const measured = measuredDirection(direction);
  const peers = competitors.filter((c) => typeof c.gapScore === "number");
  const outranked =
    typeof score === "number" && peers.some((c) => (c.gapScore as number) > score);

  const kept = insight
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => {
      const claimed = claimedDirection(sentence);
      if (claimed && measured && claimed !== measured) return false;
      if (/\b(most|least|highest|lowest|biggest|largest|widest|#1|number one)\b/i.test(sentence)) {
        if (measured === "aligned") return false;
        if (outranked) return false;
      }
      return true;
    })
    .join(" ")
    .trim();

  // A stub left over from filtering ("Prime AIEO target.") reads as a dangling
  // fragment rather than an insight. Below a sensible minimum, drop it and let
  // the section not render at all.
  return kept.length >= 60 ? kept : null;
}

async function buildBrief(competitorTickers: string[], focalTicker: string): Promise<ArBrief> {
  const generatedAt = new Date().toISOString();
  const empty: ArBrief = {
    live: false,
    generatedAt,
    competitorTickers,
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
    agFetch("providers/snapshot", { ticker: focalTicker }),
    agFetch("narrative-reality-gap", { ticker: focalTicker }),
    agFetch("reputation-tracker/trends", { ticker: focalTicker }),
    ...competitorTickers.flatMap((t) => [
      agFetch("providers/snapshot", { ticker: t }),
      agFetch("narrative-reality-gap", { ticker: t }),
    ]),
  ]);

  const snap = ok(snapR)?.snapshot ?? null;
  const gap = ok(gapR)?.gap ?? null;
  const rep = ok(repR);

  if (!snap && !gap && !rep) return { ...empty, reason: `no live data for ${focalTicker}` };

  // The focal snapshot carries the core scores (assessment, AI readiness,
  // revenue, gap). If it failed to load we still return what we have, but flag
  // the brief degraded so it is NOT cached — the next request retries fresh.
  const degraded = !snap;

  const emergencies: ArBriefItem[] = [];
  const highlights: ArBriefItem[] = [];
  const actions: ArBriefItem[] = [];

  const focalName: string = snap?.displayName ?? snap?.name ?? gap?.providerName ?? focalTicker;

  // ---- Reputation lens movement → emergencies / highlights / actions ----
  const trend = rep?.sentimentTrend;
  let reputationLenses: ArBrief["reputationLenses"];
  if (trend?.series?.length) {
    const moves = deriveLensMoves(trend.series, trend.quarters ?? []);
    reputationLenses = moves.map((m) => ({ name: m.name, prev: m.prev, last: m.last, delta: m.delta, span: m.span }));
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
  for (let i = 0; i < competitorTickers.length; i++) {
    const cSnap = ok(compRs[i * 2])?.snapshot ?? null;
    const cGap = ok(compRs[i * 2 + 1])?.gap ?? null;
    if (!cSnap && !cGap) continue;
    competitors.push({
      ticker: competitorTickers[i],
      name: cSnap?.displayName ?? cSnap?.name ?? cGap?.providerName ?? competitorTickers[i],
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

  // AG's `headline` is editorial copy and can contradict AG's OWN measured
  // gapScore/direction on the same record (observed: a provider measured
  // "aligned" at gap 6 carrying the headline "the most under-recognized
  // provider in AG's tracking set", while two other tracked firms measured 24).
  // Rendering that as the hero states a falsehood, so the claim is checked
  // against the measurement and replaced with a derived one when it conflicts.
  const safeHeadline = verifiedGapHeadline(
    gap?.headline ?? null,
    gap?.gapScore ?? null,
    gap?.direction ?? null,
    focalName,
    competitors
  );

  return {
    live: true,
    degraded,
    generatedAt,
    focal: {
      ticker: focalTicker,
      name: focalName,
      assessmentScore: snap?.assessmentScore ?? null,
      aiReadinessScore: snap?.aiReadinessScore ?? null,
      revenueUsd: snap?.revenueUsd ?? null,
      revenueGrowthYoy: snap?.revenueGrowthYoy ?? null,
      gapScore: gap?.gapScore ?? null,
      gapDirection: gap?.direction ?? null,
      gapHeadline: safeHeadline,
      reputationInsightTitle: rep?.insightTitle ?? null,
      reputationInsightBody: rep?.insightBody ?? null,
    },
    gapAnalysis: gap
      ? {
          headline: safeHeadline,
          gapScore: gap.gapScore ?? null,
          direction: gap.direction ?? null,
          agInsight: verifiedInsight(
            snap?.agInsight ?? null,
            gap.gapScore ?? null,
            gap.direction ?? null,
            competitors
          ),
          narrativeSignals: (gap.narrativeSignals ?? []).map((s: any) => ({
            source: String(s.source ?? "unknown"),
            sentiment: typeof s.sentiment === "number" ? s.sentiment : null,
            volume: typeof s.volume === "number" ? s.volume : null,
            themes: Array.isArray(s.themes) ? s.themes.map(String) : [],
          })),
          realitySignals: (gap.realitySignals ?? []).map((s: any) => ({
            metric: String(s.metric ?? ""),
            label: String(s.label ?? s.metric ?? ""),
            value: typeof s.value === "number" ? s.value : null,
          })),
          topDivergences: (gap.topDivergences ?? []).map((d: any) => ({
            theme: String(d.theme ?? ""),
            narrativeScore: typeof d.narrativeScore === "number" ? d.narrativeScore : null,
            realityScore: typeof d.realityScore === "number" ? d.realityScore : null,
            delta: typeof d.delta === "number" ? d.delta : null,
            interpretation: d.interpretation ? String(d.interpretation) : null,
          })),
          generatedAt: gap.generatedAt ?? null,
        }
      : undefined,
    reputationLenses,
    competitorTickers,
    emergencies: emergencies.slice(0, 5),
    highlights: highlights.slice(0, 5),
    actions: actions.slice(0, 5),
    competitors,
    suggestedQuestions: (rep?.suggestedQuestions ?? []).slice(0, 5),
    sourceNote:
      "Derived from live AnalystGenius signals (providers/snapshot, narrative-reality-gap, reputation-tracker/trends). Each item names the field it comes from.",
  };
}

export async function getArBrief(
  opts: { competitors?: string[]; force?: boolean; focalTicker?: string } = {}
): Promise<ArBrief> {
  const focalTicker = (opts.focalTicker || DEFAULT_FOCAL_TICKER).trim().toUpperCase();
  const competitorTickers = normaliseCompetitors(opts.competitors, focalTicker);
  const cacheKey = `${focalTicker}|${competitorTickers.join(",")}`;
  const now = Date.now();
  const hit = _cache.get(cacheKey);
  if (!opts.force && hit && now - hit.at < CACHE_TTL_MS) return hit.brief;
  try {
    const brief = await buildBrief(competitorTickers, focalTicker);
    if (brief.live && !brief.degraded) {
      // Persist a history snapshot (throttled, fire-and-forget) and attach
      // the real movement report before caching.
      void captureSignals(brief);
      brief.movement = await deriveMovement(brief).catch(() => undefined);
    }
    // Cache only a COMPLETE live build. A degraded brief (focal snapshot
    // failed → blank scores) is returned but never cached, so the next request
    // retries fresh instead of serving blanks for the whole cache window.
    if (brief.live && !brief.degraded) _cache.set(cacheKey, { brief, at: now });
    return brief;
  } catch (err) {
    return {
      live: false,
      reason: err instanceof Error ? err.message : "derivation failed",
      generatedAt: new Date().toISOString(),
      competitorTickers,
      emergencies: [],
      highlights: [],
      actions: [],
      competitors: [],
      suggestedQuestions: [],
      sourceNote: "AnalystGenius live intelligence unavailable — cockpit is showing labelled demo content.",
    };
  }
}
