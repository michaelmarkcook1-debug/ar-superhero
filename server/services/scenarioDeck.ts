import type pptxgen from "pptxgenjs";
import {
  newDeck,
  deckToBuffer,
  addCover,
  addClosing,
  addBodySlide,
  addBulletList,
  addCards,
  addRowList,
  addSectionLabel,
  addStats,
  addTable,
  AG,
  CHART_COLORS,
  CONTENT_BOTTOM,
  FONT_BODY,
  fitH,
  todayLabel,
  type Brand,
  type RowTone,
} from "./boardPack";
import { readProvenance } from "./agIntelligenceSlide";
import { agFetch } from "./agApi";
import { getArBrief, type ArBrief } from "./agIntelligence";
import { derivePersonaView, type PersonaView } from "./personaLens";
import { vendorById, vendorByTicker } from "./vendors";
import { publicRankingsStore } from "./publicRankingsStore";
import { analystCoverageStore } from "./analystCoverageStore";
import type { AnalystCoverage, PublicAnalystRanking } from "@shared/schema";
import type { PersonaId } from "./directPersonaDeck";
import { houseLearnings } from "./resultsLearning";
import { playbookById, type AnalystHouseId } from "@shared/assessmentPlaybooks";
import { scenarioById } from "@shared/briefingScenarios";

// ============================================================================
// Scenario-driven persona briefing decks, in the AnalystGenius house style.
//
// One deck = one persona × one scenario. The scenario decides WHICH live
// AnalystGenius intel blocks the deck carries (see shared/briefingScenarios);
// the persona lens decides HOW they are framed. Charts render verbatim API
// series only — a chart with no real series is not drawn, and the slide says
// so instead. Cited placements and named-analyst coverage are the third-party
// record beside the AnalystGenius read; both are real rows with a source.
// ============================================================================

const PERSONA_LABEL: Record<PersonaId, string> = {
  executive: "Executive",
  strategy: "Strategy",
  product: "Product",
  marketing: "Marketing",
  commercial: "Commercial",
  delivery: "Delivery",
  regional: "Regional",
};

const PERSONA_AUDIENCE: Record<PersonaId, string> = {
  executive: "Executive leadership",
  strategy: "Strategy leadership",
  product: "Product and service-line leadership",
  marketing: "Marketing and communications",
  commercial: "Sales and pursuit leadership",
  delivery: "Delivery and operations leadership",
  regional: "Regional leadership",
};

function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Chart helpers — real series only.
// ---------------------------------------------------------------------------

type Box = { x: number; y: number; w: number; h: number };
const AXIS = {
  catAxisLabelFontSize: 9,
  valAxisLabelFontSize: 9,
  catAxisLabelColor: AG.body,
  valAxisLabelColor: AG.body,
  catAxisLabelFontFace: FONT_BODY,
  valAxisLabelFontFace: FONT_BODY,
  valGridLine: { color: AG.hair, style: "solid" as const, size: 0.5 },
  catGridLine: { style: "none" as const },
};

function addCompetitorBarChart(pptx: pptxgen, slide: pptxgen.Slide, brief: ArBrief, box: Box): boolean {
  const f = brief.focal;
  if (!f) return false;
  const rows = [
    { name: f.name, assessment: f.assessmentScore, ai: f.aiReadinessScore },
    ...brief.competitors.map((c) => ({ name: c.name, assessment: c.assessmentScore, ai: c.aiReadinessScore })),
  ].filter((r) => r.assessment != null || r.ai != null);
  if (rows.length < 2) return false;
  slide.addChart(
    pptx.ChartType.bar,
    [
      { name: "Assessment", labels: rows.map((r) => r.name), values: rows.map((r) => r.assessment ?? 0) },
      { name: "AI readiness", labels: rows.map((r) => r.name), values: rows.map((r) => r.ai ?? 0) },
    ],
    {
      ...box,
      h: fitH(box.y, box.h),
      barDir: "col",
      chartColors: [CHART_COLORS[0], CHART_COLORS[2]],
      showLegend: true,
      legendPos: "b",
      legendFontSize: 9,
      legendFontFace: FONT_BODY,
      legendColor: AG.body,
      valAxisMaxVal: 100,
      showValue: true,
      dataLabelFontSize: 8,
      dataLabelColor: AG.ink,
      dataLabelFontFace: FONT_BODY,
      ...AXIS,
    }
  );
  return true;
}

function addRevenueLineChart(pptx: pptxgen, slide: pptxgen.Slide, quarterly: { quarter: string; revenueUsdM: number }[], box: Box): boolean {
  const pts = (quarterly ?? []).filter((q) => typeof q.revenueUsdM === "number" && q.quarter);
  if (pts.length < 2) return false;
  const ordered = [...pts].sort((a, b) => a.quarter.localeCompare(b.quarter));
  slide.addChart(
    pptx.ChartType.line,
    [{ name: "Revenue (USD m, reported)", labels: ordered.map((q) => q.quarter.slice(0, 7)), values: ordered.map((q) => q.revenueUsdM) }],
    { ...box, h: fitH(box.y, box.h), chartColors: [CHART_COLORS[0]], lineSize: 2.5, showLegend: false, lineDataSymbol: "circle", lineDataSymbolSize: 5, ...AXIS }
  );
  return true;
}

interface TrendSeries {
  quarters: string[];
  series: { name: string; data: number[] }[];
}

function addReputationLineChart(pptx: pptxgen, slide: pptxgen.Slide, trend: TrendSeries, box: Box): boolean {
  const series = trend.series.filter((s) => Array.isArray(s.data) && s.data.some((v) => typeof v === "number"));
  if (!series.length || !trend.quarters?.length) return false;
  slide.addChart(
    pptx.ChartType.line,
    series.map((s) => ({ name: s.name, labels: trend.quarters, values: s.data })),
    {
      ...box,
      h: fitH(box.y, box.h),
      chartColors: CHART_COLORS.slice(0, series.length),
      lineSize: 1.75,
      showLegend: true,
      legendPos: "b",
      legendFontSize: 8,
      legendFontFace: FONT_BODY,
      legendColor: AG.body,
      lineDataSymbol: "none",
      ...AXIS,
    }
  );
  return true;
}

function addNarrativeVolumeChart(pptx: pptxgen, slide: pptxgen.Slide, brief: ArBrief, box: Box): boolean {
  const signals = brief.gapAnalysis?.narrativeSignals?.filter((s) => s.volume != null) ?? [];
  if (signals.length < 2) return false;
  const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  slide.addChart(
    pptx.ChartType.bar,
    [{ name: "Volume", labels: signals.map((s) => label(s.source)), values: signals.map((s) => s.volume ?? 0) }],
    { ...box, h: fitH(box.y, box.h), barDir: "col", chartColors: [CHART_COLORS[2]], showLegend: false, showValue: true, dataLabelFontSize: 8, dataLabelColor: AG.ink, dataLabelFontFace: FONT_BODY, ...AXIS }
  );
  return true;
}

// ---------------------------------------------------------------------------
// Published analyst placements — the third-party record.
// ---------------------------------------------------------------------------

function formatPlacementDate(published: string, precision: string): string {
  if (precision === "year") return published;
  if (precision === "month") {
    const [y, m] = published.split("-").map(Number);
    if (!y || !m) return published;
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const d = new Date(published);
  return Number.isNaN(d.getTime()) ? published : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface PlacementSet {
  focal: PublicAnalystRanking[];
  peers: PublicAnalystRanking[];
  coarseDropped?: number;
  unavailable?: boolean;
}

function filterRecent(rows: PublicAnalystRanking[], sinceISO: string): { kept: PublicAnalystRanking[]; coarse: number } {
  let coarse = 0;
  const kept = rows.filter((r) => {
    if (r.date_precision === "year") {
      coarse++;
      return false;
    }
    const d = r.date_precision === "month" ? `${r.published_date}-01` : r.published_date;
    return d >= sinceISO;
  });
  return { kept, coarse };
}

async function loadPlacements(vendorId: string, competitorTickers: string[] | undefined, houseName?: string, sinceISO?: string): Promise<PlacementSet> {
  try {
    const all = await publicRankingsStore.listRankings();
    const inHouse = houseName ? all.filter((r) => r.analyst_firm === houseName) : all;
    const peerIds = new Set((competitorTickers ?? []).map((t) => vendorByTicker(t)?.id).filter((v): v is string => Boolean(v) && v !== vendorId));
    const focalAll = inHouse.filter((r) => r.vendor_id === vendorId).sort((a, b) => b.published_date.localeCompare(a.published_date));
    const peersAll = inHouse.filter((r) => peerIds.has(r.vendor_id)).sort((a, b) => b.published_date.localeCompare(a.published_date));
    if (!sinceISO) return { focal: focalAll, peers: peersAll };
    const f = filterRecent(focalAll, sinceISO);
    const p = filterRecent(peersAll, sinceISO);
    return { focal: f.kept, peers: p.kept, coarseDropped: f.coarse + p.coarse };
  } catch {
    return { focal: [], peers: [], unavailable: true };
  }
}

function sourceSplit(rows: PublicAnalystRanking[]): string {
  const confirmed = rows.filter((r) => r.source_type === "analyst_firm_page").length;
  return `${confirmed} of ${rows.length} confirmed on the analyst firm's own page; the rest are vendor-reported.`;
}

function addPlacementSlide(
  pptx: pptxgen,
  brand: Brand,
  idx: () => string,
  section: string,
  vendorName: string,
  placements: PlacementSet,
  opts: { title: string; note: string }
) {
  if (placements.unavailable) {
    addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: opts.title,
      note: "The placement record could not be read when this deck was generated.",
      caveat: "Absent, not empty: regenerate the deck to include the cited placements.",
    });
    return;
  }
  if (!placements.focal.length && !placements.peers.length) return;
  const all = [...placements.focal, ...placements.peers];
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: opts.title,
    note: opts.note,
    caveat:
      sourceSplit(all) +
      (placements.coarseDropped
        ? ` ${placements.coarseDropped} further placement${placements.coarseDropped === 1 ? " is" : "s are"} dated by year only and cannot be placed in the window, so ${placements.coarseDropped === 1 ? "it is" : "they are"} not listed.`
        : ""),
    notes: `Sources: cited public placements held by AR SuperHero, each with a source URL. ${sourceSplit(all)}`,
  });

  const rowsFor = (rs: PublicAnalystRanking[], withVendor: boolean) =>
    rs.slice(0, 7).map((r) => ({
      cells: withVendor
        ? [vendorById(r.vendor_id).name, r.analyst_firm, r.report_name, r.placement, formatPlacementDate(r.published_date, r.date_precision)]
        : [r.analyst_firm, r.report_name, r.placement, formatPlacementDate(r.published_date, r.date_precision)],
    }));

  let y = contentTop;
  if (placements.focal.length) {
    addSectionLabel(slide, `${vendorName} — published placements`, { x: 0.75, y, w: 11.83 });
    const n = Math.min(placements.focal.length, 7);
    addTable(slide, { x: 0.75, y: y + 0.3, w: 11.83, colW: [2.0, 5.4, 2.4, 2.03], headers: ["Analyst firm", "Report", "Placement", "Published"], rows: rowsFor(placements.focal, false), fontSize: 9 });
    y += 0.3 + 0.36 + n * 0.3 + 0.3;
  } else {
    addSectionLabel(slide, `${vendorName} — no placement logged for this scope`, { x: 0.75, y, w: 11.83 });
    y += 0.42;
  }
  if (placements.peers.length && y < CONTENT_BOTTOM - 1.1) {
    const room = Math.floor((CONTENT_BOTTOM - y - 0.7) / 0.3);
    addSectionLabel(slide, "Peer placements — same scope", { x: 0.75, y, w: 11.83 });
    addTable(slide, { x: 0.75, y: y + 0.3, w: 11.83, colW: [1.6, 1.8, 4.2, 2.2, 2.03], headers: ["Firm", "Analyst firm", "Report", "Placement", "Published"], rows: rowsFor(placements.peers, true).slice(0, Math.max(1, room)), fontSize: 8.5 });
  }
}

// ---------------------------------------------------------------------------
// Named-analyst coverage at a house — who will be in the room.
// ---------------------------------------------------------------------------

async function addCoverageSlide(pptx: pptxgen, brand: Brand, idx: () => string, section: string, vendorId: string, vendorName: string, house?: string) {
  let rows: AnalystCoverage[] = [];
  let unavailable = false;
  try {
    rows = await analystCoverageStore.list(vendorId);
  } catch {
    unavailable = true;
  }
  if (unavailable) {
    addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: house ? `Who covers you at ${house}` : "Who is writing about you",
      note: "Named-analyst coverage could not be read when this deck was generated.",
      caveat: "Absent, not empty: regenerate the deck to include the named analysts.",
    });
    return;
  }
  const scoped = house ? rows.filter((r) => r.firm === house) : rows;
  const positioned = scoped
    .filter((r) => r.vendor_id === vendorId && r.stance_summary && r.source_url)
    .sort((a, b) => String(b.published_date ?? "").localeCompare(String(a.published_date ?? "")));
  const silent = scoped.filter((r) => !positioned.includes(r)).map((r) => `${r.analyst_name}${r.role ? ` (${r.role})` : ""}`);
  if (!positioned.length && !silent.length) return;

  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: house ? `Who covers you at ${house}` : "Who is writing about you",
    note: `${positioned.length} named analyst${positioned.length === 1 ? "" : "s"} with a published, sourced position on ${vendorName}${house ? ` at ${house}` : ""}.`,
    caveat: "Positions are shown as published, with the date. A position more than two years old is historic coverage, not a current view.",
    notes: `Sources: named-analyst coverage held by AR SuperHero; every position carries a source URL. ${positioned.map((r) => `${r.analyst_name} — ${r.source_url}`).join("; ")}`,
  });
  let y = contentTop;
  if (positioned.length) {
    addTable(slide, {
      x: 0.75,
      y,
      w: 11.83,
      colW: [2.3, 1.9, 6.1, 1.53],
      headers: ["Analyst", "Firm", "Published position", "Date"],
      rows: positioned.slice(0, 6).map((r) => ({
        cells: [r.analyst_name + (r.role ? `\n${r.role}` : ""), r.firm, r.stance_summary ?? "", formatPlacementDate(r.published_date ?? "", r.date_precision ?? "day")],
      })),
      fontSize: 9,
    });
    y += 0.36 + Math.min(positioned.length, 6) * 0.52 + 0.25;
  }
  if (silent.length && y < CONTENT_BOTTOM - 0.6) {
    addSectionLabel(slide, `Also covering this market${house ? ` at ${house}` : ""}, no published position on ${vendorName} found`, { x: 0.75, y, w: 11.83 });
    slide.addText(silent.slice(0, 12).join("  ·  "), { x: 0.75, y: y + 0.28, w: 11.83, h: fitH(y + 0.28, 0.6), fontFace: FONT_BODY, fontSize: 10, color: AG.body, margin: 0, fit: "shrink", valign: "top" });
  }
}

// ---------------------------------------------------------------------------
// Role-scoped slides
// ---------------------------------------------------------------------------

function addPersonaReadSlide(pptx: pptxgen, brand: Brand, view: PersonaView, brief: ArBrief, idx: () => string, section: string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: `Your market read — ${view.roleTitle}`,
    note: "The AnalystGenius signals that land on your desk, scoped to your role.",
    caveat: `${readProvenance(brief)} Values are shown as returned.`,
    notes: `Sources: AnalystGenius providers/snapshot, narrative-reality-gap, reputation-tracker/trends. ${readProvenance(brief)}`,
  });
  addStats(slide, view.metrics.slice(0, 3).map((m) => ({ value: m.value, label: m.label, caption: m.caption })), { x: 0.75, y: contentTop + 0.05, w: 11.83 });
  const colTop = contentTop + 1.45;
  if (view.lenses.length) {
    addSectionLabel(slide, "Reputation lenses you own", { x: 0.75, y: colTop, w: 5.8 });
    addTable(slide, {
      x: 0.75,
      y: colTop + 0.3,
      w: 5.8,
      colW: [2.7, 1.7, 1.4],
      headers: ["Lens", "Movement", "Δ"],
      rows: view.lenses.map((l) => ({ cells: [l.name, `${l.prev} → ${l.last}`, `${l.delta > 0 ? "+" : ""}${l.delta}`], tone: l.delta <= -5 ? ("warn" as RowTone) : ("default" as RowTone) })),
      fontSize: 10,
    });
  }
  const rightX = view.lenses.length ? 6.8 : 0.75;
  const rightW = view.lenses.length ? 5.78 : 11.83;
  const signals = [...view.emergencies.map((e) => `Exposure — ${e.title}: ${e.detail}`), ...view.highlights.map((h) => `Lead with — ${h.title}: ${h.detail}`)];
  if (signals.length) {
    addSectionLabel(slide, "Signals on your desk", { x: rightX, y: colTop, w: rightW });
    addBulletList(slide, signals.slice(0, 5), { x: rightX, y: colTop + 0.3, w: rightW, h: CONTENT_BOTTOM - colTop - 0.35, fontSize: 9.5 });
  }
}

function addAdviceSlide(pptx: pptxgen, brand: Brand, view: PersonaView, idx: () => string, section: string) {
  if (!view.advice.length && !view.questions.length) return;
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: "What this means for your role",
    note: "Readings of the signals above. Each line names the signal it comes from.",
    caveat: "Derived readings, not predictions. No outcome or ranking is forecast.",
  });
  if (view.advice.length) {
    addSectionLabel(slide, "What the signals mean for you", { x: 0.75, y: contentTop, w: 11.83 });
    slide.addText(
      view.advice.flatMap((a) => [
        { text: a.line, options: { bullet: { code: "25A0", indent: 14 }, breakLine: true, fontSize: 11, color: AG.ink } },
        { text: `     ${a.source}`, options: { breakLine: true, fontSize: 8, color: AG.muted, italic: true } },
      ]),
      { x: 0.75, y: contentTop + 0.3, w: 11.83, h: fitH(contentTop + 0.3, view.questions.length ? 2.6 : 3.9), fontFace: FONT_BODY, lineSpacingMultiple: 1.08, paraSpaceAfter: 4, valign: "top", margin: 0, fit: "shrink" }
    );
  }
  if (view.questions.length) {
    const qTop = contentTop + (view.advice.length ? 3.05 : 0);
    addSectionLabel(slide, "Questions you should personally be ready for", { x: 0.75, y: qTop, w: 11.83 });
    addBulletList(slide, view.questions, { x: 0.75, y: qTop + 0.3, w: 11.83, h: 1.1, fontSize: 10.5 });
  }
}

function addUnavailableSlide(pptx: pptxgen, brand: Brand, idx: () => string, section: string, reason?: string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: "The AnalystGenius read was unavailable when this deck was generated",
    note: "No cached or estimated figure is shown in its place.",
    caveat: `Reason: ${reason ?? "upstream unavailable"}. Regenerate once the connection is restored.`,
  });
  addBulletList(slide, ["The cited placements and named-analyst coverage below are unaffected; they are held by AR SuperHero."], { x: 0.75, y: contentTop + 0.2, w: 11.83, h: 1.2 });
}

// ---------------------------------------------------------------------------
// Scenario deck composer
// ---------------------------------------------------------------------------

export interface ScenarioDeckRequest {
  personaId: PersonaId;
  scenarioId: string;
  houseId?: AnalystHouseId;
  competitorTickers?: string[];
  vendorId?: string;
}

export function scenarioDeckFilename(req: ScenarioDeckRequest): string {
  return `${req.personaId}--${req.scenarioId}--market-briefing.pptx`;
}

type Plan = { titleA: string; titleB: string; agenda: string[] };

function planFor(scenarioId: string, vendorName: string, house: string): Plan {
  switch (scenarioId) {
    case "quarterly-update":
      return { titleA: "The quarter,", titleB: "measured.", agenda: ["Your market read", "The quarter in charts", "Reputation this quarter", "Placements this quarter", "What this means for your role", "Next steps"] };
    case "pre-briefing-prep":
      return { titleA: "Before the briefing", titleB: `with ${house}.`, agenda: ["Your market read", `What ${house} will probe`, `Who covers you at ${house}`, `What ${house} has published`, "What this means for your role", "Next steps"] };
    case "assessment-kickoff":
      return { titleA: "Entering the", titleB: `${house} cycle.`, agenda: ["Your market read", `What moves rankings at ${house}`, "The competitive field", `Who covers you at ${house}`, "Your published record", "Next steps"] };
    case "competitive-shift":
      return { titleA: "The field", titleB: "has moved.", agenda: ["Your market read", "The competitive field, measured", "Published placements across the field", "What this means for your role", "Next steps"] };
    case "reputation-pulse":
      return { titleA: "Reputation,", titleB: "this quarter.", agenda: ["Your market read", "Reputation across every lens", "What this means for your role", "Next steps"] };
    case "narrative-campaign":
      return { titleA: "The story and", titleB: "the evidence.", agenda: ["Your market read", "Who is telling the story", "What this means for your role", "Next steps"] };
    case "deal-support":
      return { titleA: "Positioning for", titleB: "the pursuit.", agenda: ["Your market read", "Analyst-grade positioning", "Placements you can cite", "What this means for your role", "Next steps"] };
    case "leadership-onboarding":
      return { titleA: `${vendorName} in the`, titleB: "analyst market.", agenda: ["Your market read", "One pass on standing", "The competitive field", "Who is writing about you", "The published record", "Next steps"] };
    default:
      return { titleA: vendorName, titleB: "briefing.", agenda: ["Your market read", "What this means for your role", "Next steps"] };
  }
}

export async function composeScenarioDeck(req: ScenarioDeckRequest): Promise<Buffer> {
  const scenario = scenarioById(req.scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${req.scenarioId}`);
  const personaLabel = PERSONA_LABEL[req.personaId] ?? req.personaId;
  const audience = PERSONA_AUDIENCE[req.personaId] ?? personaLabel;
  const vendor = vendorById(req.vendorId);
  const vendorName = vendor.name;
  const houseId: AnalystHouseId = req.houseId ?? "gartner";
  const playbook = playbookById(houseId);

  let brief = await getArBrief({ competitors: req.competitorTickers, focalTicker: vendor.agTicker });
  if (brief.degraded) brief = await getArBrief({ competitors: req.competitorTickers, focalTicker: vendor.agTicker, force: true });
  const view = brief.live && !brief.degraded ? derivePersonaView(brief, req.personaId) : null;

  const focalTicker = brief.focal?.ticker ?? vendor.agTicker;
  const [snapR, repR] = await Promise.all([agFetch("providers/snapshot", { ticker: focalTicker }), agFetch("reputation-tracker/trends", { ticker: focalTicker })]);
  const snap = snapR.status === 200 ? (snapR.body as any)?.snapshot : null;
  const quarterly: { quarter: string; revenueUsdM: number }[] = snap?.quarterlyRevenue ?? [];
  const repBody = repR.status === 200 ? (repR.body as any) : null;
  const trend: TrendSeries | null = repBody?.sentimentTrend?.series?.length ? repBody.sentimentTrend : null;

  const brand: Brand = { vendorName, vendorMark: vendor.mark, vendorAccent: vendor.accent, deckLabel: scenario.label };
  const plan = planFor(scenario.id, vendorName, playbook.house);
  const pptx = newDeck({ title: `${vendorName} — ${personaLabel} ${scenario.label}`, subject: `AnalystGenius briefing: ${scenario.label} for ${audience}` });
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");
  const f = brief.focal;

  addCover(pptx, brand, {
    kicker: `Prepared for ${vendorName} · ${todayLabel()}`,
    titleA: plan.titleA,
    titleB: plan.titleB,
    subTitle: scenario.when,
    contextLines: [`${scenario.label} for ${audience.toLowerCase()}.`, "For circulation within the leadership team."],
    stats: f
      ? [
          { value: f.assessmentScore == null ? "—" : String(f.assessmentScore), label: "Assessment" },
          { value: f.aiReadinessScore == null ? "—" : String(f.aiReadinessScore), label: "AI readiness" },
          { value: f.gapScore == null ? "—" : String(f.gapScore), label: "Narrative gap" },
        ]
      : [],
    preparedFor: { name: audience, role: vendorName },
    agenda: plan.agenda,
    notes: `Generated by AnalystGenius AR SuperHero on ${todayLabel()}. Scenario: ${scenario.label}. Persona: ${personaLabel}. Peer set: ${(req.competitorTickers ?? []).join(", ") || "AnalystGenius default"}. ${brief.live ? readProvenance(brief) : "AnalystGenius read unavailable."}`,
  });

  const sec = (i: number) => plan.agenda[i] ?? scenario.label;

  if (!view || !f) {
    addUnavailableSlide(pptx, brand, idx, sec(0), brief.reason);
  } else {
    addPersonaReadSlide(pptx, brand, view, brief, idx, sec(0));

    switch (scenario.id) {
      case "quarterly-update": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          section: sec(1),
          title: "The quarter in charts",
          note: "Reported revenue trend and the competitive score field.",
          caveat: `${readProvenance(brief)} Charts draw verbatim series only; a missing series is stated, not estimated.`,
        });
        const drewRev = addRevenueLineChart(pptx, slide, quarterly, { x: 0.75, y: contentTop + 0.3, w: 5.8, h: 3.6 });
        addSectionLabel(slide, drewRev ? "Revenue trend (USD m, reported)" : "Revenue trend — no series carried", { x: 0.75, y: contentTop, w: 5.8 });
        const drewComp = addCompetitorBarChart(pptx, slide, brief, { x: 6.8, y: contentTop + 0.3, w: 5.78, h: 3.6 });
        addSectionLabel(slide, drewComp ? "Competitive field" : "Competitive field — unavailable", { x: 6.8, y: contentTop, w: 5.78 });
        if (trend) {
          const s2 = addBodySlide(pptx, brand, { index: idx(), section: sec(2), title: "Reputation across every lens this quarter", note: "Sentiment trend by lens, as tracked by AnalystGenius.", caveat: readProvenance(brief) });
          addReputationLineChart(pptx, s2.slide, trend, { x: 0.75, y: s2.contentTop + 0.1, w: 11.83, h: 3.9 });
        }
        const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        addPlacementSlide(pptx, brand, idx, sec(3), vendorName, await loadPlacements(vendor.id, req.competitorTickers, undefined, since), {
          title: "Analyst placements published this quarter",
          note: `Cited placements dated on or after ${formatPlacementDate(since, "day")} for you and your peer set.`,
        });
        break;
      }

      case "pre-briefing-prep": {
        const stage = playbook.stages.find((s) => s.stage === "exec-briefing");
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          section: sec(1),
          title: `What ${playbook.house} will probe, and how to answer`,
          note: stage?.note ?? playbook.assessment.leadership,
          caveat: "House rules are a synthesis of published methodology and the owner playbook, not published weights. The study's own criteria override them.",
        });
        addSectionLabel(slide, "Probe areas — narrative against measured reality", { x: 0.75, y: contentTop, w: 11.83 });
        const divergences = (brief.gapAnalysis?.topDivergences ?? []).map((d) => `${d.theme}: narrative ${d.narrativeScore ?? "—"} vs reality ${d.realityScore ?? "—"} — ${d.interpretation ?? ""}`);
        addBulletList(slide, divergences.length ? divergences : ["No divergence data available at generation time."], { x: 0.75, y: contentTop + 0.3, w: 11.83, h: 1.4, fontSize: 10.5 });
        addSectionLabel(slide, `${playbook.house} briefing rules`, { x: 0.75, y: contentTop + 1.85, w: 11.83 });
        const rules = [...(stage?.dos.slice(0, 3) ?? []).map((d) => `Do — ${d}`), ...(stage?.donts.slice(0, 3) ?? []).map((d) => `Don't — ${d}`)];
        addBulletList(slide, rules, { x: 0.75, y: contentTop + 2.15, w: 11.83, h: 1.9, fontSize: 10 });
        await addCoverageSlide(pptx, brand, idx, sec(2), vendor.id, vendorName, playbook.house);
        addPlacementSlide(pptx, brand, idx, sec(3), vendorName, await loadPlacements(vendor.id, req.competitorTickers, playbook.house), {
          title: `What ${playbook.house} has already published`,
          note: `Cited ${playbook.house} placements for you and your peer set — the record behind the questions they will ask.`,
        });
        break;
      }

      case "assessment-kickoff": {
        const rfi = playbook.stages.find((s) => s.stage === "rfi");
        const learnings = (await houseLearnings(houseId).catch(() => []))[0];
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          section: sec(1),
          title: `Entering the ${playbook.house} ${playbook.assessment.name} cycle`,
          note: playbook.movementDriver.headline,
          caveat: "Movement drivers are a synthesis of published methodology, not published weights.",
        });
        addSectionLabel(slide, `What moves rankings at ${playbook.house}`, { x: 0.75, y: contentTop, w: 5.8 });
        addBulletList(slide, playbook.movementDriver.drivers, { x: 0.75, y: contentTop + 0.3, w: 5.8, h: 2.0, fontSize: 10 });
        addSectionLabel(slide, "RFI-stage rules", { x: 6.8, y: contentTop, w: 5.78 });
        addBulletList(slide, rfi?.dos.slice(0, 4) ?? [], { x: 6.8, y: contentTop + 0.3, w: 5.78, h: 2.0, fontSize: 10 });
        const lTop = contentTop + 2.5;
        addSectionLabel(
          slide,
          learnings?.lines.length ? `Learned from your ${playbook.house} results (${learnings.cycles} cycle${learnings.cycles === 1 ? "" : "s"}), observational` : "Learned from your results — none logged yet for this house",
          { x: 0.75, y: lTop, w: 11.83 }
        );
        if (learnings?.lines.length) addBulletList(slide, learnings.lines.slice(0, 3).map((l) => l.line), { x: 0.75, y: lTop + 0.3, w: 11.83, h: 1.3, fontSize: 9.5 });
        const s2 = addBodySlide(pptx, brand, { index: idx(), section: sec(2), title: "Competitive positions entering the cycle", caveat: readProvenance(brief) });
        addCompetitorBarChart(pptx, s2.slide, brief, { x: 0.75, y: s2.contentTop + 0.1, w: 11.83, h: 4.2 });
        await addCoverageSlide(pptx, brand, idx, sec(3), vendor.id, vendorName, playbook.house);
        addPlacementSlide(pptx, brand, idx, sec(4), vendorName, await loadPlacements(vendor.id, req.competitorTickers, playbook.house), {
          title: `${playbook.house} — your published placement record`,
          note: `Cited ${playbook.house} placements for you and your peer set: what the house has already said in public.`,
        });
        break;
      }

      case "competitive-shift": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          section: sec(1),
          title: "The competitive field, measured",
          note: "Assessment and AI-readiness scores with each provider's narrative gap.",
          caveat: `${readProvenance(brief)} Rows tinted where a peer's assessment is ahead of yours.`,
        });
        addCompetitorBarChart(pptx, slide, brief, { x: 0.75, y: contentTop, w: 11.83, h: 2.3 });
        addTable(slide, {
          x: 0.75,
          y: contentTop + 2.45,
          w: 11.83,
          colW: [4.0, 3.9, 3.93],
          headers: ["Provider", "Narrative gap", "Direction"],
          rows: [
            { cells: [`${f.name} (you)`, String(f.gapScore ?? "—"), f.gapDirection ?? "—"], tone: "good" as RowTone },
            ...brief.competitors.slice(0, 4).map((c) => ({
              cells: [c.name, String(c.gapScore ?? "—"), c.gapDirection ?? "—"],
              tone: c.assessmentScore != null && f.assessmentScore != null && c.assessmentScore > f.assessmentScore ? ("warn" as RowTone) : ("default" as RowTone),
            })),
          ],
          fontSize: 9.5,
        });
        addPlacementSlide(pptx, brand, idx, sec(2), vendorName, await loadPlacements(vendor.id, req.competitorTickers), {
          title: "Published placements across the field",
          note: "Cited analyst placements on record for you and the named competitors.",
        });
        break;
      }

      case "reputation-pulse": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          section: sec(1),
          title: "Reputation across every lens",
          note: f.reputationInsightTitle ?? "Sentiment trend across the lenses AnalystGenius tracks.",
          caveat: readProvenance(brief),
        });
        const drew = trend ? addReputationLineChart(pptx, slide, trend, { x: 0.75, y: contentTop, w: 11.83, h: 2.7 }) : false;
        if (!drew) addBulletList(slide, ["Sentiment series unavailable at generation time."], { x: 0.75, y: contentTop + 0.2, w: 11.83, h: 0.6 });
        if (f.reputationInsightBody) {
          slide.addText(f.reputationInsightBody, { x: 0.75, y: contentTop + 2.9, w: 11.83, h: fitH(contentTop + 2.9, 1.2), fontFace: FONT_BODY, fontSize: 10, color: AG.body, lineSpacingMultiple: 1.1, valign: "top", margin: 0, fit: "shrink" });
        }
        break;
      }

      case "narrative-campaign": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          section: sec(1),
          title: "Who is telling the story, and how loudly",
          note: brief.gapAnalysis?.headline ?? undefined,
          caveat: `${readProvenance(brief)} Volumes and sentiment are per source as returned.`,
        });
        const drew = addNarrativeVolumeChart(pptx, slide, brief, { x: 0.75, y: contentTop + 0.3, w: 5.8, h: 2.3 });
        addSectionLabel(slide, drew ? "Narrative volume by source" : "Narrative volume — unavailable", { x: 0.75, y: contentTop, w: 5.8 });
        addSectionLabel(slide, "Sentiment and themes by source", { x: 6.8, y: contentTop, w: 5.78 });
        addTable(slide, {
          x: 6.8,
          y: contentTop + 0.3,
          w: 5.78,
          colW: [1.5, 1.1, 3.18],
          headers: ["Source", "Sent.", "Themes"],
          rows: (brief.gapAnalysis?.narrativeSignals ?? []).slice(0, 5).map((s) => ({ cells: [s.source, s.sentiment == null ? "—" : s.sentiment.toFixed(2), s.themes.join(", ") || "—"] })),
          fontSize: 8.5,
          headerFontSize: 8.5,
        });
        const spine = contentTop + 2.85;
        addSectionLabel(slide, "Campaign spine — themes where reality outruns the story", { x: 0.75, y: spine, w: 11.83 });
        addBulletList(slide, (brief.gapAnalysis?.topDivergences ?? []).map((d) => `${d.theme} — ${d.interpretation ?? ""} (Δ ${d.delta ?? "—"})`), { x: 0.75, y: spine + 0.3, w: 11.83, h: 1.0, fontSize: 9.5 });
        break;
      }

      case "deal-support": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          section: sec(1),
          title: "Analyst-grade positioning for the pursuit",
          note: "Provable strengths and the measured competitive field. Claims must stay inside the evidence.",
          caveat: `${readProvenance(brief)} Strengths are AnalystGenius's snapshot fields, shown as returned.`,
        });
        addCompetitorBarChart(pptx, slide, brief, { x: 0.75, y: contentTop + 0.3, w: 5.8, h: 3.5 });
        addSectionLabel(slide, "Competitive field", { x: 0.75, y: contentTop, w: 5.8 });
        addSectionLabel(slide, "Provable strengths", { x: 6.8, y: contentTop, w: 5.78 });
        const strengths: string[] = snap?.topStrengths ?? [];
        addBulletList(slide, strengths.length ? strengths : ["Strength list unavailable at generation time."], { x: 6.8, y: contentTop + 0.3, w: 5.78, h: 2.0, fontSize: 10 });
        if (f.gapDirection === "over-hyped") {
          addSectionLabel(slide, "Caution — the story is running ahead of measured reality", { x: 6.8, y: contentTop + 2.5, w: 5.78, color: AG.gold });
          addBulletList(slide, [`Gap ${f.gapScore}: brief sellers on which claims are defensible before analysts or clients test them.`], { x: 6.8, y: contentTop + 2.8, w: 5.78, h: 0.9, fontSize: 9.5 });
        }
        addPlacementSlide(pptx, brand, idx, sec(2), vendorName, await loadPlacements(vendor.id, req.competitorTickers), {
          title: "Analyst placements you can cite in this pursuit",
          note: "Published, source-linked placements: third-party proof, and what the competitor can cite back.",
        });
        break;
      }

      case "leadership-onboarding": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          section: sec(1),
          title: `${f.name} in the analyst market, in one pass`,
          note: snap?.tagline ?? undefined,
          caveat: `${readProvenance(brief)} Employee count and headquarters are snapshot fields as returned.`,
        });
        addStats(
          slide,
          [
            { value: String(f.assessmentScore ?? "—"), label: "Assessment", caption: "AnalystGenius composite" },
            { value: String(f.aiReadinessScore ?? "—"), label: "AI readiness", caption: "AnalystGenius signal" },
            { value: f.revenueUsd ? `$${(f.revenueUsd / 1e9).toFixed(1)}B` : "—", label: "Revenue", caption: `Growth ${fmtPct(f.revenueGrowthYoy)} (reported)` },
            { value: snap?.employeeCount ? snap.employeeCount.toLocaleString("en-GB") : "—", label: "Employees", caption: snap?.headquarters ?? "" },
          ],
          { x: 0.75, y: contentTop + 0.05, w: 11.83 }
        );
        addSectionLabel(slide, "Top strengths", { x: 0.75, y: contentTop + 1.4, w: 5.8 });
        addBulletList(slide, snap?.topStrengths ?? [], { x: 0.75, y: contentTop + 1.7, w: 5.8, h: 1.3, fontSize: 9.5 });
        addSectionLabel(slide, "Flagged risks", { x: 6.8, y: contentTop + 1.4, w: 5.78 });
        addBulletList(slide, snap?.topRisks ?? [], { x: 6.8, y: contentTop + 1.7, w: 5.78, h: 1.3, fontSize: 9.5 });
        const lensTop = contentTop + 3.1;
        if ((brief.reputationLenses ?? []).length && lensTop < CONTENT_BOTTOM - 0.9) {
          addSectionLabel(slide, "Reputation lenses (movement, last two periods)", { x: 0.75, y: lensTop, w: 11.83 });
          addTable(slide, {
            x: 0.75,
            y: lensTop + 0.3,
            w: 11.83,
            colW: [4.0, 3.9, 3.93],
            headers: ["Lens", "Movement", "Δ"],
            rows: (brief.reputationLenses ?? []).slice(0, 4).map((l) => ({ cells: [l.name, `${l.prev} → ${l.last}`, `${l.delta > 0 ? "+" : ""}${l.delta}`], tone: l.delta <= -5 ? ("warn" as RowTone) : ("default" as RowTone) })),
            fontSize: 9,
            headerFontSize: 9,
          });
        }
        const s2 = addBodySlide(pptx, brand, { index: idx(), section: sec(2), title: "The competitive field", caveat: readProvenance(brief) });
        addCompetitorBarChart(pptx, s2.slide, brief, { x: 0.75, y: s2.contentTop + 0.1, w: 11.83, h: 4.2 });
        await addCoverageSlide(pptx, brand, idx, sec(3), vendor.id, vendorName);
        addPlacementSlide(pptx, brand, idx, sec(4), vendorName, await loadPlacements(vendor.id, req.competitorTickers), {
          title: "The published analyst record",
          note: "Cited placements across the analyst firms covering this market.",
        });
        break;
      }
    }

    addAdviceSlide(pptx, brand, view, idx, plan.agenda[plan.agenda.length - 2] ?? "What this means for your role");
  }

  // Next steps: the role's own advice lines where the read is live, otherwise
  // the two process steps that are always true of a point-in-time read.
  const steps = (view?.advice ?? []).slice(0, 2).map((a) => ({ title: a.line.length > 60 ? `${a.line.slice(0, 57)}…` : a.line, body: a.line, owner: a.source }));
  steps.push({ title: "Regenerate before the meeting", body: "The AnalystGenius read is a point-in-time value and drifts between sessions.", owner: "AnalystGenius follow-up" });
  if (steps.length < 3) steps.push({ title: "Log what the room decided", body: "Record the outcome against this scenario so the next read starts from it.", owner: `${vendorName} leadership` });

  addClosing(pptx, brand, {
    titleA: "The next step",
    titleB: `with ${vendorName}.`,
    body: `${scenario.label} for ${audience.toLowerCase()}, grounded in what the signals say. Where a signal was unavailable it is stated as such; nothing is estimated in its place.`,
    nextSteps: steps.slice(0, 3),
    disclaimer: "Generated by AnalystGenius AR SuperHero. Live signals at generation time; no outcome prediction. Internal briefing material, not analyst research. © 2026 AnalystGenius.",
  });

  return deckToBuffer(pptx);
}
