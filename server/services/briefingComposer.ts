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
  addTable,
  AG,
  CONTENT_BOTTOM,
  FONT_BODY,
  todayLabel,
  type Brand,
} from "./boardPack";
import { addAgIntelligenceSlides } from "./agIntelligenceSlide";
import { type DeckLibraryRow } from "../storage";
import { deckStore } from "./deckStore";
import { houseLearnings } from "./resultsLearning";
import { vendorById } from "./vendors";
import { CONFIDENCE_FACTOR, ENGAGEMENT_STAGES, playbookById, type AnalystHouseId } from "@shared/assessmentPlaybooks";

// ============================================================================
// Briefing composer — Succeed tab.
//
// Assembles an analyst-house-targeted briefing deck from four honest layers:
//   1. House playbook structure (public assessment definitions; owner guidance
//      when populated — an explicit awaiting-state slide when not)
//   2. Reused content from INGESTED prior decks — verbatim extracted text,
//      ranked by overlap with the briefing topic/region, always with
//      "from <file> · slide N" provenance
//   3. The AnalystGenius read (standing, competitive field, narrative gap)
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

/** Slide budget from briefing length: fixed overhead + content slides. */
function slideBudget(mins: number): { reusedMax: number } {
  if (mins <= 30) return { reusedMax: 3 };
  if (mins <= 45) return { reusedMax: 5 };
  return { reusedMax: 8 };
}

const STOPWORDS = new Set(["the", "and", "for", "with", "our", "your", "from", "into", "that", "this", "are", "was", "will", "has", "have", "been", "its", "of", "in", "on", "to", "a", "an"]);

function terms(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Rank ingested slides by verbatim term overlap with topic + region. */
function pickReusedSlides(decks: DeckLibraryRow[], vars: ComposerVariables, max: number): ReusedSlidePick[] {
  const queryTerms = new Set([...terms(vars.topic), ...(vars.region ? terms(vars.region) : [])]);
  const picks: ReusedSlidePick[] = [];
  for (const deck of decks) {
    for (const slide of deck.slides) {
      if (!slide.texts.length) continue;
      let score = 0;
      for (const t of terms(slide.texts.join(" "))) if (queryTerms.has(t)) score++;
      picks.push({ deck: { id: deck.id, filename: deck.filename }, slideIndex: slide.index, texts: slide.texts, score });
    }
  }
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

  const decks = (await Promise.all(req.deckIds.map((id) => deckStore.get(id)))).filter((d): d is DeckLibraryRow => d !== null);
  const reused = pickReusedSlides(decks, vars, reusedMax);
  const learnings = (await houseLearnings(req.houseId).catch(() => []))[0];

  const brand: Brand = { vendorName, vendorMark: vendor.mark, vendorAccent: vendor.accent, deckLabel: `${playbook.house} briefing` };
  const pptx = newDeck({ title: `${vendorName} — ${playbook.house} ${vars.topic} briefing`, subject: `AnalystGenius composed briefing for ${playbook.house}` });
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  const agenda = ["Agenda", `Targeting ${playbook.house}`, "The AnalystGenius read", ...(reused.length ? ["Evidence from prior briefings"] : []), "Open inputs", "Next steps"];

  addCover(pptx, brand, {
    kicker: `Prepared for ${vendorName} · ${todayLabel()}`,
    titleA: vars.topic,
    titleB: `for ${playbook.house}.`,
    subTitle: `A ${vars.briefingLengthMins}-minute briefing${vars.region ? ` for ${vars.region}` : ""}, targeted at the ${playbook.house} ${playbook.assessment.name} cycle.`,
    contextLines: [
      vars.executives.length ? `Presenting: ${vars.executives.map((e) => `${e.name} (${e.title})`).join(" · ")}` : "Presenting executives: open input.",
      "Composed draft. Open-input sections are marked and must be completed by the briefing owner.",
    ],
    stats: [
      { value: String(vars.briefingLengthMins), label: "Minutes" },
      { value: String(reused.length), label: "Reused slides" },
      { value: playbook.status === "populated" ? "Ready" : "Open", label: "House guidance" },
    ],
    preparedFor: { name: vars.executives[0] ? `${vars.executives[0].name}` : "Briefing owner", role: vars.executives[0] ? `${vars.executives[0].title}, ${vendorName}` : vendorName },
    agenda,
    notes: `Composed by AnalystGenius AR SuperHero on ${todayLabel()}. Layers: ${playbook.house} playbook structure; ${reused.length} reused slide(s) from ${decks.length} ingested deck(s); the AnalystGenius read; user variables.`,
  });

  // Agenda.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: agenda[0],
      title: `Agenda — ${vars.briefingLengthMins} minutes`,
      note: `Targeted at the ${playbook.house} ${playbook.assessment.name} evaluation cycle.`,
    });
    addRowList(
      slide,
      [
        { title: "Opening and introductions", body: vars.executives.length ? vars.executives.map((e) => e.name).join(", ") : "OPEN INPUT: presenter names." },
        { title: `${vars.topic} — position and momentum`, body: "The position you are taking into the cycle." },
        { title: "Evidence from prior briefings", body: reused.length ? `${reused.length} reused slide${reused.length === 1 ? "" : "s"}, verbatim and provenance-tagged.` : "No prior deck selected." },
        { title: "The AnalystGenius read", body: "Standing, the competitive field, and narrative against measured reality." },
        { title: "OPEN INPUT — client evidence and roadmap specifics", body: "Named, permissioned references and owner-confirmed roadmap." },
        { title: "Analyst discussion", body: "Time held for questions." },
      ],
      { x: 0.75, y: contentTop, w: 11.83, rowH: 0.66 }
    );
  }

  // House targeting.
  {
    const deckStage = playbook.stages.find((s) => s.stage === "briefing-deck");
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: agenda[1],
      title: `Targeting the ${playbook.house} ${playbook.assessment.name}`,
      note: playbook.assessment.leadership,
      caveat: deckStage?.dos[0] ? `House deck rule: ${deckStage.dos[0]}` : "House guidance is a synthesis of published methodology, not published weights.",
    });
    addSectionLabel(slide, "Evaluation structure", { x: 0.75, y: contentTop, w: 5.8 });
    addTable(slide, { x: 0.75, y: contentTop + 0.3, w: 5.8, colW: [1.2, 4.6], headers: ["Axis", "Published label"], rows: [{ cells: ["X", playbook.assessment.axes[0]] }, { cells: ["Y", playbook.assessment.axes[1]] }], fontSize: 10.5 });
    addSectionLabel(slide, `What moves rankings at ${playbook.house}`, { x: 6.8, y: contentTop, w: 5.78 });
    if (playbook.status === "populated") {
      addBulletList(slide, [playbook.movementDriver.headline, ...playbook.movementDriver.drivers.slice(0, 3)], { x: 6.8, y: contentTop + 0.3, w: 5.78, h: 2.2, fontSize: 10.5 });
    } else {
      addBulletList(slide, ["OPEN INPUT — house-specific guidance not yet ingested.", "Structure is ready; this slide fills once the owner playbook document lands."], { x: 6.8, y: contentTop + 0.3, w: 5.78, h: 2.2, fontSize: 10.5, color: AG.muted });
    }
    let y = contentTop + 2.0;
    if (learnings?.lines.length) {
      addSectionLabel(slide, `Learned from your ${playbook.house} results (${learnings.cycles} cycle${learnings.cycles === 1 ? "" : "s"}), observational`, { x: 0.75, y, w: 5.8 });
      addBulletList(slide, learnings.lines.slice(0, 2).map((l) => l.line), { x: 0.75, y: y + 0.3, w: 5.8, h: 1.0, fontSize: 9.5, color: AG.body });
    }
    y = contentTop + 3.2;
    if (y < CONTENT_BOTTOM - 0.5) {
      addSectionLabel(slide, "Engagement moments this deck serves", { x: 0.75, y, w: 11.83 });
      slide.addText(ENGAGEMENT_STAGES.map((s) => s.label).join("   →   "), { x: 0.75, y: y + 0.3, w: 11.83, h: 0.4, fontFace: FONT_BODY, fontSize: 11, color: AG.ink, margin: 0, fit: "shrink" });
    }
  }

  // The AnalystGenius read.
  await addAgIntelligenceSlides(pptx, brand, idx, req.competitorTickers, vendor.agTicker, agenda[2]);

  // Reused prior-deck content — verbatim with provenance.
  for (const pick of reused) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: "Evidence from prior briefings",
      title: pick.texts[0]?.slice(0, 80) || `Reused content — slide ${pick.slideIndex}`,
      note: `Reused verbatim from "${pick.deck.filename}" · slide ${pick.slideIndex}${pick.score > 0 ? ` · matched "${vars.topic}"` : " · general content"}.`,
      caveat: "Review for currency before presenting.",
    });
    addBulletList(slide, pick.texts.slice(1, 11), { x: 0.75, y: contentTop, w: 11.83, h: 4.0, fontSize: 11.5 });
  }
  if (decks.length && !reused.length) {
    const { slide, contentTop } = addBodySlide(pptx, brand, { index: idx(), section: "Evidence from prior briefings", title: "Reused content — nothing matched", note: "The selected prior decks contained no extractable slide text." });
    addBulletList(slide, ["Re-check the uploaded files, or proceed with the open-input sections only."], { x: 0.75, y: contentTop, w: 11.83, h: 1.2 });
  }

  // Open inputs — explicit, never auto-filled.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: "Open inputs",
      title: "OPEN INPUT — what the briefing owner must complete",
      note: "Left unfilled by design. Composing tools must not invent client evidence, roadmap detail or financial claims.",
      caveat: CONFIDENCE_FACTOR.detail.slice(0, 180) + (CONFIDENCE_FACTOR.detail.length > 180 ? "…" : ""),
    });
    const cards = [
      { title: "Client evidence", body: `Named, permissioned references for ${vars.topic}${vars.region ? ` in ${vars.region}` : ""}.` },
      { title: "Roadmap specifics", body: "Investment commitments confirmed by product and strategy owners." },
      { title: "Commercial proof", body: "Proof points and pricing posture cleared for analyst use." },
      ...(vars.objectives?.length ? vars.objectives.slice(0, 3).map((o) => ({ title: "Objective evidence", body: o })) : []),
    ];
    addCards(slide, cards, { x: 0.75, y: contentTop, w: 11.83, cols: 3, h: 1.5 });
  }

  addClosing(pptx, brand, {
    titleA: "The next step",
    titleB: `with ${vendorName}.`,
    body: "A draft that is honest about what it does not know. Everything traces to a named layer: house structure, reused content with provenance, the AnalystGenius read, or your own inputs.",
    nextSteps: [
      { title: "Complete the open inputs", body: "Client evidence, roadmap specifics and commercial proof, from their owners.", owner: `${vendorName} briefing owner` },
      { title: "Review reused slides for currency", body: "Each reused slide names the file and slide it came from.", owner: `${vendorName} briefing owner` },
      { title: "Regenerate before the briefing", body: "The AnalystGenius read is a point-in-time value.", owner: "AnalystGenius follow-up" },
    ],
    disclaimer: "Generated by AnalystGenius AR SuperHero briefing composer. Reused content is verbatim from ingested decks; open-input sections are unfilled by design. Internal draft, not analyst research. © 2026 AnalystGenius.",
  });

  return deckToBuffer(pptx);
}
