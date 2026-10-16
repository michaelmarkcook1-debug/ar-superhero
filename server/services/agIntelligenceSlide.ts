import type pptxgen from "pptxgenjs";
import {
  addBodySlide,
  addBulletList,
  addSectionLabel,
  addStats,
  addTable,
  AG,
  CONTENT_BOTTOM,
  FONT_BODY,
  type Brand,
  type RowTone,
} from "./boardPack";
import { getArBrief, type ArBrief } from "./agIntelligence";

// ============================================================================
// AnalystGenius read — the slides shared by every deck.
//
// Three slides when the read is available at generation time:
//   1. Where the firm stands — the four figures, exposures and strengths
//   2. The competitive field — peer table, reputation read, the questions
//   3. Narrative and measured reality — divergences, per-source signals
// If the read is unavailable, one slide says so. The deck never carries an
// estimated or stale-implied figure; a read served from the last complete
// snapshot says so in the subtitle.
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

export function readProvenance(brief: ArBrief): string {
  const when = dateLabel(brief.generatedAt);
  return brief.stale
    ? `AnalystGenius read taken ${when}, served from the last complete read because AnalystGenius was not responding at generation time.`
    : `AnalystGenius read taken ${when}.`;
}

export async function addAgIntelligenceSlides(
  pptx: pptxgen,
  brand: Brand,
  idx: () => string,
  competitorTickers?: string[],
  focalTicker?: string,
  section = "The AnalystGenius read"
): Promise<ArBrief> {
  // A deck is a one-shot artefact — it can't self-heal like the website. If the
  // first read is degraded (focal snapshot failed), force one fresh retry
  // rather than baking blank scores into the download.
  let brief = await getArBrief({ competitors: competitorTickers, focalTicker });
  if (brief.degraded) brief = await getArBrief({ competitors: competitorTickers, focalTicker, force: true });

  if (!brief.live || !brief.focal || brief.degraded) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: "The AnalystGenius read was unavailable when this deck was generated",
      note: "No cached or estimated figure is shown in its place.",
      caveat: `Reason: ${brief.reason ?? "upstream unavailable"}. Regenerate the deck once the connection is restored.`,
    });
    addBulletList(slide, ["Every other slide in this deck is built from cited public records or your own inputs, and says which."], {
      x: 0.75,
      y: contentTop + 0.2,
      w: 11.83,
      h: 1.5,
    });
    return brief;
  }

  const f = brief.focal;
  const sources = `Sources: AnalystGenius providers/snapshot, narrative-reality-gap, reputation-tracker/trends. ${readProvenance(brief)}`;

  // -------------------------------------------------------------------------
  // Slide 1 — where the firm stands
  // -------------------------------------------------------------------------
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: `Where ${f.name} stands today`,
      note: "Assessment, AI readiness, reported revenue and the gap between the story and the measured reality.",
      caveat: `${readProvenance(brief)} Each line below names the signal it derives from.`,
      notes: sources,
    });

    addStats(
      slide,
      [
        { value: f.assessmentScore == null ? "—" : String(f.assessmentScore), label: "Assessment", caption: "AnalystGenius composite" },
        { value: f.aiReadinessScore == null ? "—" : String(f.aiReadinessScore), label: "AI readiness", caption: "AnalystGenius signal" },
        { value: fmtUsdB(f.revenueUsd), label: "Revenue", caption: `${fmtPct(f.revenueGrowthYoy)} year on year, as reported` },
        { value: f.gapScore == null ? "—" : String(f.gapScore), label: "Narrative gap", caption: f.gapDirection ?? "no direction reported", valueColor: AG.violet },
      ],
      { x: 0.75, y: contentTop + 0.05, w: 11.83 }
    );

    const colTop = contentTop + 1.45;
    addSectionLabel(slide, "Where the story is exposed", { x: 0.75, y: colTop, w: 5.8 });
    addBulletList(
      slide,
      brief.emergencies.slice(0, 4).map((e) => `${e.title}: ${e.detail}`),
      { x: 0.75, y: colTop + 0.32, w: 5.8, h: CONTENT_BOTTOM - colTop - 0.4, fontSize: 10 }
    );
    addSectionLabel(slide, "What you can lead with", { x: 6.8, y: colTop, w: 5.78 });
    addBulletList(
      slide,
      brief.highlights.slice(0, 4).map((h) => `${h.title}: ${h.detail}`),
      { x: 6.8, y: colTop + 0.32, w: 5.78, h: CONTENT_BOTTOM - colTop - 0.4, fontSize: 10 }
    );
  }

  // -------------------------------------------------------------------------
  // Slide 2 — the competitive field
  // -------------------------------------------------------------------------
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: "The competitive field",
      note: "The named peer set on the same four measures. Rows tinted where a peer scores ahead.",
      caveat: "Revenue growth is as reported to AnalystGenius; a dash means the figure is not carried for that firm.",
      notes: sources,
    });

    const rows: { cells: string[]; tone?: RowTone }[] = [
      {
        cells: [`${f.name} (you)`, f.assessmentScore == null ? "—" : String(f.assessmentScore), f.aiReadinessScore == null ? "—" : String(f.aiReadinessScore), fmtPct(f.revenueGrowthYoy), f.gapDirection ?? "—"],
        tone: "good",
      },
      ...brief.competitors.map((c) => ({
        cells: [c.name, c.assessmentScore == null ? "—" : String(c.assessmentScore), c.aiReadinessScore == null ? "—" : String(c.aiReadinessScore), fmtPct(c.revenueGrowthYoy), c.gapDirection ?? "—"],
        tone: c.assessmentScore != null && f.assessmentScore != null && c.assessmentScore > f.assessmentScore ? ("warn" as RowTone) : ("default" as RowTone),
      })),
    ];
    addTable(slide, {
      x: 0.75,
      y: contentTop + 0.05,
      w: 11.83,
      colW: [3.5, 2.05, 2.05, 2.05, 2.18],
      headers: ["Provider", "Assessment", "AI readiness", "Revenue growth", "Narrative gap"],
      rows,
      fontSize: 10.5,
    });

    const belowTable = contentTop + 0.05 + 0.38 + rows.length * 0.34 + 0.3;
    if (belowTable < CONTENT_BOTTOM - 0.8) {
      if (f.reputationInsightTitle) {
        addSectionLabel(slide, "Reputation read", { x: 0.75, y: belowTable, w: 5.8 });
        slide.addText(`${f.reputationInsightTitle}${f.reputationInsightBody ? ` — ${f.reputationInsightBody}` : ""}`, {
          x: 0.75,
          y: belowTable + 0.3,
          w: 5.8,
          h: CONTENT_BOTTOM - belowTable - 0.35,
          fontFace: FONT_BODY,
          fontSize: 10,
          color: AG.body,
          lineSpacingMultiple: 1.12,
          valign: "top",
          margin: 0,
          fit: "shrink",
        });
      }
      if (brief.suggestedQuestions.length) {
        addSectionLabel(slide, "Questions leadership should be ready for", { x: 6.8, y: belowTable, w: 5.78 });
        addBulletList(slide, brief.suggestedQuestions.slice(0, 3), { x: 6.8, y: belowTable + 0.3, w: 5.78, h: CONTENT_BOTTOM - belowTable - 0.35, fontSize: 10 });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Slide 3 — narrative and measured reality
  // -------------------------------------------------------------------------
  const ga = brief.gapAnalysis;
  if (ga) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: "Narrative and measured reality",
      note: ga.headline ?? undefined,
      caveat: "Narrative scores come from what is published about the firm; reality scores from measured signals. Both are AnalystGenius values, shown as returned.",
      notes: sources,
    });

    let y = contentTop + 0.05;
    if (ga.topDivergences.length) {
      addSectionLabel(slide, "Where the story and the measured reality split", { x: 0.75, y, w: 11.83 });
      addTable(slide, {
        x: 0.75,
        y: y + 0.3,
        w: 11.83,
        colW: [3.2, 1.45, 1.45, 1.0, 4.73],
        headers: ["Theme", "Narrative", "Reality", "Δ", "AnalystGenius interpretation"],
        rows: ga.topDivergences.slice(0, 3).map((d) => ({
          cells: [d.theme, d.narrativeScore == null ? "—" : String(d.narrativeScore), d.realityScore == null ? "—" : String(d.realityScore), d.delta == null ? "—" : String(d.delta), d.interpretation ?? "—"],
          tone: (d.delta ?? 0) < 0 ? ("warn" as RowTone) : ("default" as RowTone),
        })),
        fontSize: 9.5,
      });
      y += 0.3 + 0.38 + Math.min(ga.topDivergences.length, 3) * 0.36 + 0.3;
    }

    if (y < CONTENT_BOTTOM - 1.0) {
      if (ga.narrativeSignals.length) {
        addSectionLabel(slide, "Who is telling the story", { x: 0.75, y, w: 6.2 });
        addTable(slide, {
          x: 0.75,
          y: y + 0.3,
          w: 6.2,
          colW: [1.6, 1.15, 1.0, 2.45],
          headers: ["Source", "Sentiment", "Volume", "Themes"],
          rows: ga.narrativeSignals.slice(0, 5).map((s) => ({
            cells: [s.source, s.sentiment == null ? "—" : s.sentiment.toFixed(2), s.volume == null ? "—" : String(s.volume), s.themes.join(", ") || "—"],
          })),
          fontSize: 8.5,
          headerFontSize: 8.5,
        });
      }
      if (ga.agInsight) {
        addSectionLabel(slide, "AnalystGenius insight", { x: 7.25, y, w: 5.33 });
        slide.addText(ga.agInsight, {
          x: 7.25,
          y: y + 0.3,
          w: 5.33,
          h: CONTENT_BOTTOM - y - 0.35,
          fontFace: FONT_BODY,
          fontSize: 9.5,
          color: AG.body,
          lineSpacingMultiple: 1.12,
          valign: "top",
          margin: 0,
          fit: "shrink",
        });
      }
    }
  }

  return brief;
}
