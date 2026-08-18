import type pptxgen from "pptxgenjs";
import {
  newDeck,
  deckToBuffer,
  addCover,
  addClosing,
  addCeoBioSlide,
  addBodySlide,
  addBulletList,
  addSectionLabel,
  addTable,
  FONT_BODY,
  PALETTE,
  type Brand,
} from "./boardPack";
import { addAgIntelligenceSlides } from "./agIntelligenceSlide";
import { type DeckLibraryRow } from "../storage";
import { deckStore } from "./deckStore";
import { houseLearnings } from "./resultsLearning";
import { vendorById } from "./vendors";
import {
  CONFIDENCE_FACTOR,
  ENGAGEMENT_STAGES,
  playbookById,
  type AnalystHouseId,
} from "@shared/assessmentPlaybooks";

// ============================================================================
// Briefing composer — Succeed tab.
//
// Assembles an analyst-house-targeted briefing deck from four honest layers:
//   1. House playbook structure (public assessment definitions; owner guidance
//      when populated — an explicit awaiting-state slide when not)
//   2. Reused content from INGESTED prior decks — verbatim extracted text,
//      ranked by overlap with the briefing topic/region, always with
//      "from <file> · slide N" provenance
//   3. Live AG intelligence slides (signal read, competitive, gap analysis)
//   4. User variables (topic, region, length, executives) driving cover,
//      agenda and slide budget
// Sections that need human content ship as clearly-marked OPEN INPUT slides —
// never auto-filled.
// ============================================================================

export interface ComposerExecutive {
  name: string;
  title: string;
}

export interface ComposerVariables {
  topic: string;
  region?: string;
  briefingLengthMins: number;
  executives: ComposerExecutive[];
  objectives?: string[];
}

export interface ComposeRequest {
  houseId: AnalystHouseId;
  deckIds: string[];
  variables: ComposerVariables;
  vendorId?: string;
  competitorTickers?: string[];
}

interface ReusedSlidePick {
  deck: Pick<DeckLibraryRow, "id" | "filename">;
  slideIndex: number;
  texts: string[];
  score: number;
}

function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Slide budget from briefing length: fixed overhead + content slides. */
function slideBudget(mins: number): { reusedMax: number } {
  if (mins <= 30) return { reusedMax: 3 };
  if (mins <= 45) return { reusedMax: 5 };
  return { reusedMax: 8 };
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "our", "your", "from", "into", "that", "this",
  "are", "was", "will", "has", "have", "been", "its", "of", "in", "on", "to", "a", "an",
]);

function terms(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Rank ingested slides by verbatim term overlap with topic + region. */
function pickReusedSlides(decks: DeckLibraryRow[], vars: ComposerVariables, max: number): ReusedSlidePick[] {
  const queryTerms = new Set([...terms(vars.topic), ...(vars.region ? terms(vars.region) : [])]);
  const picks: ReusedSlidePick[] = [];
  for (const deck of decks) {
    for (const slide of deck.slides) {
      if (!slide.texts.length) continue;
      const slideTerms = terms(slide.texts.join(" "));
      let score = 0;
      for (const t of slideTerms) if (queryTerms.has(t)) score++;
      picks.push({
        deck: { id: deck.id, filename: deck.filename },
        slideIndex: slide.index,
        texts: slide.texts,
        score,
      });
    }
  }
  // Highest topical overlap first; slides with zero overlap only fill leftover space.
  return picks.sort((a, b) => b.score - a.score).slice(0, max);
}

export function composerFilename(req: ComposeRequest): string {
  const playbook = playbookById(req.houseId);
  return `${slugify(playbook.house)}--${slugify(req.variables.topic)}--briefing.pptx`;
}

export async function composeBriefingDeck(req: ComposeRequest): Promise<Buffer> {
  const playbook = playbookById(req.houseId);
  const vars = req.variables;
  const vendor = vendorById(req.vendorId);
  const vendorName = vendor.name;
  const { reusedMax } = slideBudget(vars.briefingLengthMins);

  const decks = (await Promise.all(req.deckIds.map((id) => deckStore.get(id)))).filter(
    (d): d is DeckLibraryRow => d !== null
  );
  const reused = pickReusedSlides(decks, vars, reusedMax);
  const learnings = (await houseLearnings(req.houseId).catch(() => []))[0];

  const brand: Brand = {
    vendorName,
    vendorMark: vendor.mark,
    vendorAccent: vendor.accent,
    deckLabel: `${playbook.house} ${playbook.assessment.name} briefing`,
  };

  const pptx = newDeck({
    title: `${vendorName} — ${playbook.house} ${vars.topic} briefing`,
    subject: `AnalystGenius AR SuperHero composed briefing for ${playbook.house}`,
  });

  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  // 1. Cover — variables-driven.
  addCover(pptx, brand, {
    kicker: `${playbook.house.toUpperCase()} · ${playbook.assessment.name.toUpperCase()} · AR INTERNAL DRAFT`,
    bigTitle: `${vendorName} — ${vars.topic}`,
    subTitle: [vars.region, `${vars.briefingLengthMins}-minute briefing`].filter(Boolean).join(" · "),
    generatedLabel: `Composed ${todayLabel()}`,
    contextRight: vars.executives.length
      ? `Presenting: ${vars.executives.map((e) => `${e.name} (${e.title})`).join(" · ")}`
      : "Presenting executives: open input",
    footNote:
      "Composed draft: house playbook structure + reused prior-deck content (verbatim, provenance-tagged) + live AnalystGenius signals. Open-input sections are explicitly marked and must be completed by the briefing owner.",
  });

  // 2. Agenda — scaled to briefing length.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: `Agenda — ${vars.briefingLengthMins} minutes`,
      note: `Targeted at the ${playbook.house} ${playbook.assessment.name} evaluation cycle.`,
    });
    const agenda = [
      `Opening & introductions${vars.executives.length ? ` — ${vars.executives.map((e) => e.name).join(", ")}` : " — OPEN INPUT: presenter names"}`,
      `${vars.topic} — position and momentum`,
      "Evidence from prior briefings (reused, provenance-tagged)",
      "Live market signals (AnalystGenius)",
      "OPEN INPUT — client evidence & roadmap specifics",
      "Q&A / analyst discussion time",
    ];
    addBulletList(slide, agenda, { x: 0.6, y: contentTop + 0.2, w: 12.1, h: 4.6, fontSize: 13 });
  }

  // 3. House targeting slide — playbook structure + guidance state.
  {
    const deckStage = playbook.stages.find((s) => s.stage === "briefing-deck");
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: `Targeting the ${playbook.house} ${playbook.assessment.name}`,
      note: deckStage?.dos[0]
        ? `${playbook.assessment.leadership} House deck rule #1: ${deckStage.dos[0]}`
        : playbook.assessment.leadership,
    });
    addSectionLabel(slide, "Evaluation structure", { x: 0.6, y: contentTop + 0.1, w: 5.9 });
    addTable(slide, {
      x: 0.6,
      y: contentTop + 0.42,
      w: 5.9,
      colW: [2.4, 3.5],
      headers: ["Axis", "Published label"],
      rows: [
        { cells: ["X", playbook.assessment.axes[0]] },
        { cells: ["Y", playbook.assessment.axes[1]] },
      ],
      fontSize: 10.5,
    });

    addSectionLabel(slide, `What moves rankings at ${playbook.house}`, { x: 6.9, y: contentTop + 0.1, w: 5.8 });
    if (playbook.status === "populated") {
      const lines = [
        playbook.movementDriver.headline,
        ...playbook.movementDriver.drivers.slice(0, 3),
      ];
      addBulletList(slide, lines, {
        x: 6.9,
        y: contentTop + 0.42,
        w: 5.8,
        h: 3.6,
        fontSize: 10.5,
      });
    } else {
      addBulletList(
        slide,
        [
          "OPEN INPUT — house-specific guidance not yet ingested.",
          "The owner playbook document populates: leadership framework, stage-level do's/don'ts, best practice.",
          "Structure is ready; this slide fills automatically once the document lands.",
        ],
        { x: 6.9, y: contentTop + 0.42, w: 5.8, h: 3.6, fontSize: 10.5, color: PALETTE.slate }
      );
    }

    // Learned-from-results lines — observational, augmenting the playbook.
    if (learnings?.lines.length) {
      addSectionLabel(slide, `Learned from your ${playbook.house} results (${learnings.cycles} cycle${learnings.cycles === 1 ? "" : "s"}) — observational`, {
        x: 0.6,
        y: contentTop + 2.35,
        w: 12.1,
      });
      addBulletList(slide, learnings.lines.slice(0, 2).map((l) => l.line), {
        x: 0.6,
        y: contentTop + 2.67,
        w: 12.1,
        h: 0.85,
        fontSize: 9,
        color: PALETTE.slate,
      });
    }

    // Engagement moments strip.
    const stripY = contentTop + 3.55;
    addSectionLabel(slide, "Engagement moments this deck serves", { x: 0.6, y: stripY, w: 12.1 });
    slide.addText(
      ENGAGEMENT_STAGES.map((s) => s.label).join("   →   "),
      {
        x: 0.6,
        y: stripY + 0.32,
        w: 12.1,
        h: 0.4,
        fontFace: FONT_BODY,
        fontSize: 11,
        color: PALETTE.ink,
        margin: 0,
      }
    );
  }

  // 4. Live AG intelligence overlay (signal read + competitive + gap analysis).
  await addAgIntelligenceSlides(pptx, brand, idx, req.competitorTickers, vendor.agTicker);

  // 5. Reused prior-deck content — verbatim with provenance.
  for (const pick of reused) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: pick.texts[0]?.slice(0, 80) || `Reused content — slide ${pick.slideIndex}`,
      note: `Reused verbatim from "${pick.deck.filename}" · slide ${pick.slideIndex}${
        pick.score > 0 ? ` · matched "${vars.topic}"` : " · general content"
      }. Review for currency before presenting.`,
    });
    addBulletList(slide, pick.texts.slice(1, 11), {
      x: 0.6,
      y: contentTop + 0.2,
      w: 12.1,
      h: 4.8,
      fontSize: 11.5,
    });
  }
  if (decks.length && !reused.length) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: "Reused content — nothing matched",
      note: "The selected prior decks contained no extractable slide text.",
    });
    addBulletList(slide, ["Re-check the uploaded files, or proceed with open-input sections only."], {
      x: 0.6,
      y: contentTop + 0.2,
      w: 12.1,
      h: 1.5,
    });
  }

  // 6. Open-input sections — explicit, never auto-filled.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: "OPEN INPUT — sections the briefing owner must complete",
      note: "These are deliberately left unfilled. Composing tools must not invent client evidence, roadmap detail, or financial claims.",
    });
    const openSections = [
      `Client evidence for ${vars.topic}${vars.region ? ` in ${vars.region}` : ""} — named, permissioned references only.`,
      "Roadmap specifics and investment commitments — must come from product/strategy owners.",
      "Commercial proof points and pricing posture — must be cleared for analyst use.",
      ...(vars.objectives?.length ? vars.objectives.map((o) => `Objective evidence: ${o}`) : []),
      `Consistency check before the briefing: ${CONFIDENCE_FACTOR.detail}`,
    ];
    addBulletList(slide, openSections, { x: 0.6, y: contentTop + 0.25, w: 12.1, h: 4.6, fontSize: 12.5 });
  }

  addClosing(pptx, brand, {
    heading: "A draft that is honest about what it doesn't know.",
    body:
      "Everything in this deck traces to a named layer: house structure, reused prior-deck content with provenance, live AnalystGenius signals, or your own inputs. Complete the open-input sections before the briefing.",
    disclaimer:
      "Generated by AnalystGenius AR SuperHero briefing composer. Reused content is verbatim from ingested decks; live signals are AnalystGenius API values at composition time; open-input sections are unfilled by design. Internal draft — not analyst research. © 2026 AnalystGenius.",
  });

  addCeoBioSlide(pptx);

  return deckToBuffer(pptx);
}
