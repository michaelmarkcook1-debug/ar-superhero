import type pptxgen from "pptxgenjs";
import {
  newDeck,
  deckToBuffer,
  addCover,
  addClosing,
  addCeoBioSlide,
  addBodySlide,
  addBulletList,
  addMetricCard,
  addSectionLabel,
  addTable,
  FONT_BODY,
  PALETTE,
  type Brand,
  type RowTone,
} from "./boardPack";
import { agFetch } from "./agApi";
import { getArBrief, type ArBrief } from "./agIntelligence";
import { derivePersonaView, type PersonaView } from "./personaLens";
import type { PersonaId } from "./directPersonaDeck";
import { houseLearnings } from "./resultsLearning";
import { playbookById, type AnalystHouseId } from "@shared/assessmentPlaybooks";
import { scenarioById } from "@shared/briefingScenarios";

// ============================================================================
// Scenario-driven persona briefing decks.
//
// One deck = one persona × one scenario. The scenario decides WHICH live AG
// intel blocks the deck carries (see shared/briefingScenarios.ts); the persona
// lens decides HOW they are framed. Charts are rendered from verbatim API
// series only — a chart with no real series is not drawn, and the section
// says so instead.
// ============================================================================

const CHART_GOLD = "A88945";
const CHART_TEAL = "00A7B7";
const CHART_SAGE = "59806E";
const LENS_COLORS = ["A88945", "00A7B7", "59806E", "0B1F3A", "C2944F", "8593A5", "2E7D5B"];

const PERSONA_LABEL: Record<PersonaId, string> = {
  executive: "Executive",
  strategy: "Strategy",
  product: "Product",
  marketing: "Marketing",
  commercial: "Commercial",
  delivery: "Delivery",
  regional: "Regional",
};

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Chart helpers — real series only.
// ---------------------------------------------------------------------------

type Box = { x: number; y: number; w: number; h: number };

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
      { name: "Assessment score", labels: rows.map((r) => r.name), values: rows.map((r) => r.assessment ?? 0) },
      { name: "AI readiness", labels: rows.map((r) => r.name), values: rows.map((r) => r.ai ?? 0) },
    ],
    {
      ...box,
      barDir: "col",
      chartColors: [CHART_GOLD, CHART_TEAL],
      showLegend: true,
      legendPos: "b",
      legendFontSize: 9,
      catAxisLabelFontSize: 9,
      valAxisLabelFontSize: 9,
      catAxisLabelColor: PALETTE.slate,
      valAxisLabelColor: PALETTE.slate,
      valAxisMaxVal: 100,
      showValue: true,
      dataLabelFontSize: 8,
      dataLabelColor: PALETTE.ink,
      valGridLine: { color: PALETTE.hair, style: "solid", size: 0.5 },
      catGridLine: { style: "none" },
    }
  );
  return true;
}

function addRevenueLineChart(
  pptx: pptxgen,
  slide: pptxgen.Slide,
  quarterly: { quarter: string; revenueUsdM: number }[],
  box: Box
): boolean {
  const pts = (quarterly ?? []).filter((q) => typeof q.revenueUsdM === "number" && q.quarter);
  if (pts.length < 2) return false;
  const ordered = [...pts].sort((a, b) => a.quarter.localeCompare(b.quarter));
  slide.addChart(
    pptx.ChartType.line,
    [
      {
        name: "Revenue (USD m, reported)",
        labels: ordered.map((q) => q.quarter.slice(0, 7)),
        values: ordered.map((q) => q.revenueUsdM),
      },
    ],
    {
      ...box,
      chartColors: [CHART_GOLD],
      lineSize: 2.5,
      showLegend: false,
      catAxisLabelFontSize: 8.5,
      valAxisLabelFontSize: 8.5,
      catAxisLabelColor: PALETTE.slate,
      valAxisLabelColor: PALETTE.slate,
      valGridLine: { color: PALETTE.hair, style: "solid", size: 0.5 },
      catGridLine: { style: "none" },
      lineDataSymbol: "circle",
      lineDataSymbolSize: 5,
    }
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
      chartColors: LENS_COLORS.slice(0, series.length),
      lineSize: 1.75,
      showLegend: true,
      legendPos: "b",
      legendFontSize: 8,
      catAxisLabelFontSize: 8.5,
      valAxisLabelFontSize: 8.5,
      catAxisLabelColor: PALETTE.slate,
      valAxisLabelColor: PALETTE.slate,
      valGridLine: { color: PALETTE.hair, style: "solid", size: 0.5 },
      catGridLine: { style: "none" },
      lineDataSymbol: "none",
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
    {
      ...box,
      barDir: "col",
      chartColors: [CHART_SAGE],
      showLegend: false,
      catAxisLabelFontSize: 9,
      valAxisLabelFontSize: 8.5,
      catAxisLabelColor: PALETTE.slate,
      valAxisLabelColor: PALETTE.slate,
      showValue: true,
      dataLabelFontSize: 8,
      dataLabelColor: PALETTE.ink,
      valGridLine: { color: PALETTE.hair, style: "solid", size: 0.5 },
      catGridLine: { style: "none" },
    }
  );
  return true;
}

// ---------------------------------------------------------------------------
// Shared slide blocks
// ---------------------------------------------------------------------------

function addPersonaReadSlide(pptx: pptxgen, brand: Brand, view: PersonaView, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: `Your market read — ${view.roleTitle}`,
    note: "Live AnalystGenius signals scoped to your role. Values are verbatim API fields.",
  });
  const cardW = 3.95;
  view.metrics.slice(0, 3).forEach((m, i) => {
    addMetricCard(slide, {
      x: 0.6 + i * (cardW + 0.12),
      y: contentTop + 0.1,
      w: cardW,
      label: m.label,
      value: m.value,
      caption: m.caption,
    });
  });
  const colTop = contentTop + 1.55;
  if (view.lenses.length) {
    addSectionLabel(slide, "Reputation lenses you own", { x: 0.6, y: colTop, w: 5.9 });
    addTable(slide, {
      x: 0.6,
      y: colTop + 0.32,
      w: 5.9,
      colW: [2.7, 1.7, 1.5],
      headers: ["Lens", "Movement", "Δ"],
      rows: view.lenses.map((l) => ({
        cells: [l.name, `${l.prev} → ${l.last}`, `${l.delta > 0 ? "+" : ""}${l.delta}`],
        tone: l.delta <= -5 ? ("warn" as RowTone) : ("default" as RowTone),
      })),
      fontSize: 10,
    });
  }
  const rightX = view.lenses.length ? 6.9 : 0.6;
  const rightW = view.lenses.length ? 5.8 : 12.1;
  const signals = [
    ...view.emergencies.map((e) => `Exposure — ${e.title}: ${e.detail}`),
    ...view.highlights.map((h) => `Lead with — ${h.title}: ${h.detail}`),
  ];
  if (signals.length) {
    addSectionLabel(slide, "Signals on your desk", { x: rightX, y: colTop, w: rightW });
    addBulletList(slide, signals.slice(0, 5), { x: rightX, y: colTop + 0.32, w: rightW, h: 3.9, fontSize: 9.5 });
  }
}

function addAdviceSlide(pptx: pptxgen, brand: Brand, view: PersonaView, idx: () => string) {
  if (!view.advice.length && !view.questions.length) return;
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "AG advice for your role",
    note: "Derived readings of live AG signals — each line names the signal it comes from. No outcome prediction.",
  });
  if (view.advice.length) {
    addSectionLabel(slide, "What the signals mean for you", { x: 0.6, y: contentTop + 0.1, w: 12.1 });
    slide.addText(
      view.advice.flatMap((a) => [
        { text: a.line, options: { bullet: { code: "2022", indent: 14 }, breakLine: true, fontSize: 11, color: PALETTE.ink } },
        { text: `     ${a.source}`, options: { breakLine: true, fontSize: 8, color: PALETTE.slate, italic: true } },
      ]),
      { x: 0.6, y: contentTop + 0.45, w: 12.1, h: 3.6, lineSpacingMultiple: 1.08, paraSpaceAfter: 4, valign: "top", margin: 0, fit: "shrink" }
    );
  }
  if (view.questions.length) {
    const qTop = contentTop + (view.advice.length ? 4.25 : 0.1);
    addSectionLabel(slide, "Questions you should personally be ready for", { x: 0.6, y: qTop, w: 12.1 });
    addBulletList(slide, view.questions, { x: 0.6, y: qTop + 0.32, w: 12.1, h: 1.4, fontSize: 10.5 });
  }
}

function addUnavailableSlide(pptx: pptxgen, brand: Brand, idx: () => string, reason?: string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "Live AnalystGenius signals — unavailable at generation time",
    note: "This deck was generated without a complete live connection to the AnalystGenius intelligence API.",
  });
  addBulletList(
    slide,
    [
      `Reason: ${reason ?? "upstream unavailable"}.`,
      "No cached or estimated figures are shown in place of live data — regenerate once the connection is restored.",
    ],
    { x: 0.6, y: contentTop + 0.2, w: 12.1, h: 2 }
  );
}

// ---------------------------------------------------------------------------
// Scenario deck composer
// ---------------------------------------------------------------------------

export interface ScenarioDeckRequest {
  personaId: PersonaId;
  scenarioId: string;
  houseId?: AnalystHouseId;
  competitorTickers?: string[];
  vendorName?: string;
}

export function scenarioDeckFilename(req: ScenarioDeckRequest): string {
  return `${req.personaId}--${req.scenarioId}--market-briefing.pptx`;
}

export async function composeScenarioDeck(req: ScenarioDeckRequest): Promise<Buffer> {
  const scenario = scenarioById(req.scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${req.scenarioId}`);
  const personaLabel = PERSONA_LABEL[req.personaId] ?? req.personaId;
  const vendorName = req.vendorName?.trim() || "Capgemini";
  const houseId: AnalystHouseId = req.houseId ?? "gartner";
  const playbook = playbookById(houseId);

  // Live data: the AR brief (degraded → one forced retry), plus the raw
  // snapshot and reputation series for the charts.
  let brief = await getArBrief({ competitors: req.competitorTickers });
  if (brief.degraded) brief = await getArBrief({ competitors: req.competitorTickers, force: true });
  const view = brief.live && !brief.degraded ? derivePersonaView(brief, req.personaId) : null;

  const focalTicker = brief.focal?.ticker ?? "CGEMY";
  const [snapR, repR] = await Promise.all([
    agFetch("providers/snapshot", { ticker: focalTicker }),
    agFetch("reputation-tracker/trends", { ticker: focalTicker }),
  ]);
  const snap = snapR.status === 200 ? (snapR.body as any)?.snapshot : null;
  const quarterly: { quarter: string; revenueUsdM: number }[] = snap?.quarterlyRevenue ?? [];
  const repBody = repR.status === 200 ? (repR.body as any) : null;
  const trend: TrendSeries | null = repBody?.sentimentTrend?.series?.length ? repBody.sentimentTrend : null;

  const brand: Brand = {
    vendorName,
    vendorMark: vendorName.slice(0, 1).toUpperCase(),
    vendorAccent: "0070AD",
    deckLabel: `${personaLabel} · ${scenario.label}`,
  };

  const pptx = newDeck({
    title: `${vendorName} — ${personaLabel} ${scenario.label}`,
    subject: `AnalystGenius scenario briefing: ${scenario.label} for ${personaLabel}`,
  });
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  addCover(pptx, brand, {
    kicker: `${personaLabel.toUpperCase()} BRIEFING · ${scenario.label.toUpperCase()} · AR INTERNAL`,
    bigTitle: `${vendorName} — ${scenario.label}`,
    subTitle: scenario.when,
    generatedLabel: `Generated ${todayLabel()}`,
    contextRight: `Prepared for: ${personaLabel} stakeholders`,
    footNote:
      "Scenario briefing composed from live AnalystGenius signals scoped to this role. Charts render verbatim API series only; unavailable signals are stated, never estimated.",
  });

  if (!view || !brief.focal) {
    addUnavailableSlide(pptx, brand, idx, brief.reason);
  } else {
    const f = brief.focal;

    // Every scenario opens with the role's own market read.
    addPersonaReadSlide(pptx, brand, view, idx);

    switch (scenario.id) {
      case "quarterly-update": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          title: "The quarter in charts",
          note: "Reported revenue trend and the competitive score field — verbatim AG series.",
        });
        const drewRev = addRevenueLineChart(pptx, slide, quarterly, { x: 0.6, y: contentTop + 0.35, w: 5.9, h: 3.9 });
        addSectionLabel(slide, drewRev ? "Revenue trend (USD m, reported)" : "Revenue trend — series unavailable", {
          x: 0.6,
          y: contentTop + 0.05,
          w: 5.9,
        });
        const drewComp = addCompetitorBarChart(pptx, slide, brief, { x: 6.9, y: contentTop + 0.35, w: 5.8, h: 3.9 });
        addSectionLabel(slide, drewComp ? "Competitive field" : "Competitive field — unavailable", {
          x: 6.9,
          y: contentTop + 0.05,
          w: 5.8,
        });
        if (trend) {
          const s2 = addBodySlide(pptx, brand, {
            index: idx(),
            title: "Reputation lenses this quarter",
            note: "Sentiment trend across all lenses — verbatim AG series.",
          });
          addReputationLineChart(pptx, s2.slide, trend, { x: 0.6, y: s2.contentTop + 0.2, w: 12.1, h: 4.4 });
        }
        break;
      }

      case "pre-briefing-prep": {
        const stage = playbook.stages.find((s) => s.stage === "exec-briefing");
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          title: `What ${playbook.house} will probe — and how to answer`,
          note: stage?.note ?? playbook.assessment.leadership,
        });
        addSectionLabel(slide, "Probe areas — narrative vs measured reality", { x: 0.6, y: contentTop + 0.1, w: 12.1 });
        const divergences = (brief.gapAnalysis?.topDivergences ?? []).map(
          (d) => `${d.theme}: narrative ${d.narrativeScore ?? "—"} vs reality ${d.realityScore ?? "—"} — ${d.interpretation ?? ""}`
        );
        addBulletList(slide, divergences.length ? divergences : ["No divergence data available at generation time."], {
          x: 0.6,
          y: contentTop + 0.42,
          w: 12.1,
          h: 1.6,
          fontSize: 10.5,
        });
        addSectionLabel(slide, `${playbook.house} exec-briefing rules (owner playbook)`, { x: 0.6, y: contentTop + 2.2, w: 12.1 });
        const rules = [
          ...(stage?.dos.slice(0, 3) ?? []).map((d) => `Do — ${d}`),
          ...(stage?.donts.slice(0, 3) ?? []).map((d) => `Don't — ${d}`),
        ];
        addBulletList(slide, rules, { x: 0.6, y: contentTop + 2.52, w: 12.1, h: 2.4, fontSize: 10 });
        break;
      }

      case "assessment-kickoff": {
        const rfi = playbook.stages.find((s) => s.stage === "rfi");
        const learnings = (await houseLearnings(houseId).catch(() => []))[0];
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          title: `Entering the ${playbook.house} ${playbook.assessment.name} cycle`,
          note: playbook.movementDriver.headline,
        });
        addSectionLabel(slide, `What moves rankings at ${playbook.house}`, { x: 0.6, y: contentTop + 0.1, w: 5.9 });
        addBulletList(slide, playbook.movementDriver.drivers, { x: 0.6, y: contentTop + 0.42, w: 5.9, h: 2.2, fontSize: 10 });
        addSectionLabel(slide, "RFI-stage rules (owner playbook)", { x: 6.9, y: contentTop + 0.1, w: 5.8 });
        addBulletList(slide, rfi?.dos.slice(0, 4) ?? [], { x: 6.9, y: contentTop + 0.42, w: 5.8, h: 2.2, fontSize: 10 });
        addSectionLabel(
          slide,
          learnings?.lines.length
            ? `Learned from your ${playbook.house} results (${learnings.cycles} cycle${learnings.cycles === 1 ? "" : "s"}) — observational`
            : "Learned from your results — none logged yet for this house",
          { x: 0.6, y: contentTop + 2.85, w: 12.1 }
        );
        if (learnings?.lines.length) {
          addBulletList(slide, learnings.lines.slice(0, 3).map((l) => l.line), {
            x: 0.6,
            y: contentTop + 3.17,
            w: 12.1,
            h: 1.7,
            fontSize: 9,
          });
        }
        const s2 = addBodySlide(pptx, brand, { index: idx(), title: "Competitive positions entering the cycle" });
        addCompetitorBarChart(pptx, s2.slide, brief, { x: 0.6, y: s2.contentTop + 0.2, w: 12.1, h: 4.4 });
        break;
      }

      case "competitive-shift": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          title: "The competitive field, measured",
          note: "Assessment and AI-readiness scores with each provider's narrative gap — verbatim AG values.",
        });
        addCompetitorBarChart(pptx, slide, brief, { x: 0.6, y: contentTop + 0.15, w: 12.1, h: 3.4 });
        addTable(slide, {
          x: 0.6,
          y: contentTop + 3.75,
          w: 12.1,
          colW: [4.1, 4.0, 4.0],
          headers: ["Provider", "Narrative gap", "Direction"],
          rows: [
            { cells: [`${f.name} (you)`, String(f.gapScore ?? "—"), f.gapDirection ?? "—"], tone: "good" as RowTone },
            ...brief.competitors.map((c) => ({
              cells: [c.name, String(c.gapScore ?? "—"), c.gapDirection ?? "—"],
              tone:
                c.assessmentScore != null && f.assessmentScore != null && c.assessmentScore > f.assessmentScore
                  ? ("warn" as RowTone)
                  : ("default" as RowTone),
            })),
          ],
          fontSize: 10,
        });
        break;
      }

      case "reputation-pulse": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          title: "Reputation pulse — all lenses",
          note: f.reputationInsightTitle ?? "Sentiment trend across the seven lenses — verbatim AG series.",
        });
        const drew = trend ? addReputationLineChart(pptx, slide, trend, { x: 0.6, y: contentTop + 0.2, w: 12.1, h: 3.6 }) : false;
        if (!drew) {
          addBulletList(slide, ["Sentiment series unavailable at generation time."], { x: 0.6, y: contentTop + 0.3, w: 12.1, h: 0.8 });
        }
        if (f.reputationInsightBody) {
          slide.addText(f.reputationInsightBody, {
            x: 0.6,
            y: contentTop + 4.0,
            w: 12.1,
            h: 1.2,
            fontFace: FONT_BODY,
            fontSize: 9.5,
            color: PALETTE.ink,
            lineSpacingMultiple: 1.1,
            valign: "top",
            margin: 0,
            fit: "shrink",
          });
        }
        break;
      }

      case "narrative-campaign": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          title: "Who is telling the story — and how loudly",
          note: brief.gapAnalysis?.headline ?? undefined,
        });
        const drew = addNarrativeVolumeChart(pptx, slide, brief, { x: 0.6, y: contentTop + 0.35, w: 5.9, h: 3.6 });
        addSectionLabel(slide, drew ? "Narrative volume by source" : "Narrative volume — unavailable", {
          x: 0.6,
          y: contentTop + 0.05,
          w: 5.9,
        });
        addSectionLabel(slide, "Sentiment + themes by source", { x: 6.9, y: contentTop + 0.05, w: 5.8 });
        addTable(slide, {
          x: 6.9,
          y: contentTop + 0.37,
          w: 5.8,
          colW: [1.5, 1.2, 3.1],
          headers: ["Source", "Sent.", "Themes"],
          rows: (brief.gapAnalysis?.narrativeSignals ?? []).map((s) => ({
            cells: [s.source, s.sentiment == null ? "—" : s.sentiment.toFixed(2), s.themes.join(", ") || "—"],
          })),
          fontSize: 8.5,
          headerFontSize: 8.5,
        });
        addSectionLabel(slide, "Campaign spine — themes where reality outruns the story", { x: 0.6, y: contentTop + 4.15, w: 12.1 });
        addBulletList(
          slide,
          (brief.gapAnalysis?.topDivergences ?? []).map((d) => `${d.theme} — ${d.interpretation ?? ""} (Δ ${d.delta ?? "—"})`),
          { x: 0.6, y: contentTop + 4.47, w: 12.1, h: 1.0, fontSize: 9.5 }
        );
        break;
      }

      case "deal-support": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          title: "Analyst-grade positioning for the pursuit",
          note: "Provable strengths and the measured competitive field. Claims must stay inside the evidence.",
        });
        addCompetitorBarChart(pptx, slide, brief, { x: 0.6, y: contentTop + 0.35, w: 5.9, h: 3.7 });
        addSectionLabel(slide, "Competitive field", { x: 0.6, y: contentTop + 0.05, w: 5.9 });
        addSectionLabel(slide, "Provable strengths (AG snapshot)", { x: 6.9, y: contentTop + 0.05, w: 5.8 });
        const strengths: string[] = snap?.topStrengths ?? [];
        addBulletList(slide, strengths.length ? strengths : ["Strength list unavailable at generation time."], {
          x: 6.9,
          y: contentTop + 0.37,
          w: 5.8,
          h: 2.2,
          fontSize: 10,
        });
        if (f.gapDirection === "over-hyped") {
          addSectionLabel(slide, "Caution — story is running ahead of measured reality", {
            x: 6.9,
            y: contentTop + 2.75,
            w: 5.8,
            color: PALETTE.warn,
          });
          addBulletList(
            slide,
            [`Gap ${f.gapScore}: brief sellers on which claims are defensible before analysts or clients test them.`],
            { x: 6.9, y: contentTop + 3.07, w: 5.8, h: 0.9, fontSize: 9.5 }
          );
        }
        break;
      }

      case "leadership-onboarding": {
        const { slide, contentTop } = addBodySlide(pptx, brand, {
          index: idx(),
          title: `${f.name} in the analyst market — one pass`,
          note: snap?.tagline ?? undefined,
        });
        const cardW = 2.95;
        const cards = [
          { label: "Assessment", value: String(f.assessmentScore ?? "—"), caption: "AG composite" },
          { label: "AI readiness", value: String(f.aiReadinessScore ?? "—"), caption: "AG signal" },
          {
            label: "Revenue",
            value: f.revenueUsd ? `$${(f.revenueUsd / 1e9).toFixed(1)}B` : "—",
            caption: `Growth ${fmtPct(f.revenueGrowthYoy)} (reported)`,
          },
          {
            label: "Employees",
            value: snap?.employeeCount ? snap.employeeCount.toLocaleString("en-GB") : "—",
            caption: snap?.headquarters ?? "",
          },
        ];
        cards.forEach((c, i) =>
          addMetricCard(slide, { x: 0.6 + i * (cardW + 0.11), y: contentTop + 0.1, w: cardW, label: c.label, value: c.value, caption: c.caption })
        );
        addSectionLabel(slide, "Top strengths", { x: 0.6, y: contentTop + 1.6, w: 5.9 });
        addBulletList(slide, snap?.topStrengths ?? [], { x: 0.6, y: contentTop + 1.92, w: 5.9, h: 1.7, fontSize: 9.5 });
        addSectionLabel(slide, "Flagged risks", { x: 6.9, y: contentTop + 1.6, w: 5.8 });
        addBulletList(slide, snap?.topRisks ?? [], { x: 6.9, y: contentTop + 1.92, w: 5.8, h: 1.7, fontSize: 9.5 });
        addSectionLabel(slide, "Reputation lenses (movement, last two periods)", { x: 0.6, y: contentTop + 3.75, w: 12.1 });
        addTable(slide, {
          x: 0.6,
          y: contentTop + 4.07,
          w: 12.1,
          colW: [4.1, 4.0, 4.0],
          headers: ["Lens", "Movement", "Δ"],
          rows: (brief.reputationLenses ?? []).map((l) => ({
            cells: [l.name, `${l.prev} → ${l.last}`, `${l.delta > 0 ? "+" : ""}${l.delta}`],
            tone: l.delta <= -5 ? ("warn" as RowTone) : ("default" as RowTone),
          })),
          fontSize: 9,
          headerFontSize: 9,
        });
        const s2 = addBodySlide(pptx, brand, { index: idx(), title: "The competitive field" });
        addCompetitorBarChart(pptx, s2.slide, brief, { x: 0.6, y: s2.contentTop + 0.2, w: 12.1, h: 4.4 });
        break;
      }
    }

    // Every scenario closes on what the role should do.
    addAdviceSlide(pptx, brand, view, idx);
  }

  addClosing(pptx, brand, {
    heading: `${scenario.label} — grounded in what the signals actually say.`,
    body: `This ${personaLabel.toLowerCase()} briefing carries live AnalystGenius signals scoped to the role, with charts drawn from verbatim API series. Where a signal was unavailable it is stated as such — nothing is estimated in its place.`,
    disclaimer:
      "Generated by AnalystGenius AR Superhero. Live signals at generation time; observational learnings labelled with cycle counts; no outcome prediction. Internal briefing material, not analyst research. © 2026 AnalystGenius.",
  });
  addCeoBioSlide(pptx);

  return deckToBuffer(pptx);
}
