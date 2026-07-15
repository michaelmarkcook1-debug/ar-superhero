import type pptxgen from "pptxgenjs";
import {
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
import { getArBrief, type ArBrief } from "./agIntelligence";

// ============================================================================
// Live AnalystGenius intelligence slides — shared by every stakeholder deck
// (assessment defence pack, persona decks, board pack).
//
// Two slides when live data is available at generation time:
//   1. "Live signal read" — focal metrics + emergencies + highlights
//   2. "Competitive & reputation read" — competitor table + insight + questions
// If the live fetch fails, one honest slide states that — the deck never
// carries fabricated or stale-implied numbers.
// ============================================================================

function fmtUsdB(v: number | null | undefined): string {
  return v == null ? "—" : `$${(v / 1e9).toFixed(1)}B`;
}
function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export async function addAgIntelligenceSlides(
  pptx: pptxgen,
  brand: Brand,
  idx: () => string
): Promise<ArBrief> {
  const brief = await getArBrief();

  if (!brief.live || !brief.focal) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: "Live AnalystGenius signals — unavailable at generation time",
      note: "This deck was generated without a live connection to the AnalystGenius intelligence API.",
    });
    addBulletList(
      slide,
      [
        `Reason: ${brief.reason ?? "upstream unavailable"}.`,
        "No cached or estimated figures are shown in place of live data — regenerate the deck once the connection is restored.",
        "All other slides in this pack are built from clearly-labelled demo or evidence-graded content.",
      ],
      { x: 0.6, y: contentTop + 0.2, w: 12.1, h: 2.5 }
    );
    return brief;
  }

  const f = brief.focal;

  // -------------------------------------------------------------------------
  // Slide 1 — live signal read: metrics, emergencies, highlights
  // -------------------------------------------------------------------------
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: `Live AnalystGenius read — ${f.name}`,
      note: `Pulled ${dateLabel(brief.generatedAt)} from the AnalystGenius intelligence API. Every item names the signal it is derived from.`,
    });

    const cardW = 2.95;
    const gap = 0.11;
    addMetricCard(slide, {
      x: 0.6,
      y: contentTop + 0.1,
      w: cardW,
      label: "Assessment score",
      value: f.assessmentScore == null ? "—" : String(f.assessmentScore),
      caption: "AG composite assessment",
    });
    addMetricCard(slide, {
      x: 0.6 + (cardW + gap),
      y: contentTop + 0.1,
      w: cardW,
      label: "AI readiness",
      value: f.aiReadinessScore == null ? "—" : String(f.aiReadinessScore),
      caption: "AG AI-readiness signal",
    });
    addMetricCard(slide, {
      x: 0.6 + (cardW + gap) * 2,
      y: contentTop + 0.1,
      w: cardW,
      label: "Revenue",
      value: fmtUsdB(f.revenueUsd),
      caption: `Growth ${fmtPct(f.revenueGrowthYoy)} YoY (reported)`,
    });
    addMetricCard(slide, {
      x: 0.6 + (cardW + gap) * 3,
      y: contentTop + 0.1,
      w: cardW,
      label: "Narrative–reality gap",
      value: f.gapScore == null ? "—" : String(f.gapScore),
      caption: f.gapDirection ?? "—",
      valueColor: PALETTE.gold,
    });

    const colTop = contentTop + 1.55;
    addSectionLabel(slide, "AR emergencies — where the story is exposed", { x: 0.6, y: colTop, w: 6.0 });
    addBulletList(
      slide,
      brief.emergencies.slice(0, 4).map((e) => `${e.title}: ${e.detail}`),
      { x: 0.6, y: colTop + 0.32, w: 6.0, h: 3.9, fontSize: 10 }
    );

    addSectionLabel(slide, "Highlights — what AR can lead with", { x: 6.9, y: colTop, w: 5.8, color: PALETTE.gold });
    addBulletList(
      slide,
      brief.highlights.slice(0, 4).map((h) => `${h.title}: ${h.detail}`),
      { x: 6.9, y: colTop + 0.32, w: 5.8, h: 3.9, fontSize: 10 }
    );
  }

  // -------------------------------------------------------------------------
  // Slide 2 — competitive table + reputation insight + questions
  // -------------------------------------------------------------------------
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: "Competitive & reputation read — live signals",
      note: brief.sourceNote,
    });

    const rows: { cells: string[]; tone?: RowTone }[] = [
      {
        cells: [
          `${f.name} (focal)`,
          f.assessmentScore == null ? "—" : String(f.assessmentScore),
          f.aiReadinessScore == null ? "—" : String(f.aiReadinessScore),
          fmtPct(f.revenueGrowthYoy),
          f.gapDirection ?? "—",
        ],
        tone: "good",
      },
      ...brief.competitors.map((c) => ({
        cells: [
          c.name,
          c.assessmentScore == null ? "—" : String(c.assessmentScore),
          c.aiReadinessScore == null ? "—" : String(c.aiReadinessScore),
          fmtPct(c.revenueGrowthYoy),
          c.gapDirection ?? "—",
        ],
        tone:
          c.assessmentScore != null && f.assessmentScore != null && c.assessmentScore > f.assessmentScore
            ? ("warn" as RowTone)
            : ("default" as RowTone),
      })),
    ];

    addTable(slide, {
      x: 0.6,
      y: contentTop + 0.15,
      w: 12.1,
      colW: [3.6, 2.1, 2.1, 2.1, 2.2],
      headers: ["Provider", "Assessment", "AI readiness", "Revenue growth", "Narrative gap"],
      rows,
      fontSize: 10.5,
    });

    const belowTable = contentTop + 0.15 + 0.4 + rows.length * 0.36 + 0.35;

    if (f.reputationInsightTitle) {
      addSectionLabel(slide, "Reputation read", { x: 0.6, y: belowTable, w: 6.0 });
      slide.addText(`${f.reputationInsightTitle}${f.reputationInsightBody ? ` — ${f.reputationInsightBody}` : ""}`, {
        x: 0.6,
        y: belowTable + 0.32,
        w: 6.0,
        h: 2.6,
        fontFace: FONT_BODY,
        fontSize: 9.5,
        color: PALETTE.ink,
        lineSpacingMultiple: 1.12,
        valign: "top",
        margin: 0,
        fit: "shrink",
      });
    }

    if (brief.suggestedQuestions.length) {
      addSectionLabel(slide, "Questions leadership should be ready for", { x: 6.9, y: belowTable, w: 5.8 });
      addBulletList(slide, brief.suggestedQuestions.slice(0, 3), {
        x: 6.9,
        y: belowTable + 0.32,
        w: 5.8,
        h: 2.6,
        fontSize: 9.5,
      });
    }
  }

  return brief;
}
