import type pptxgen from "pptxgenjs";
import {
  newDeck,
  deckToBuffer,
  addCover,
  addClosing,
  addBodySlide,
  addBulletList,
  addSectionDivider,
  addSectionLabel,
  addStats,
  addTable,
  AG,
  CONTENT_BOTTOM,
  FONT_BODY,
  fitH,
  todayLabel,
  type Brand,
} from "./boardPack";
import { addAgIntelligenceSlides, readProvenance } from "./agIntelligenceSlide";
import { derivePersonaView, type PersonaView } from "./personaLens";
import { buildPersonaBriefing, type PersonaBriefing } from "./personaBriefing";
import { vendorById } from "./vendors";
import { vendorAnalystView, type VendorAnalyst } from "./rosterSync";
import { publicRankingsStore } from "./publicRankingsStore";
import { askStore, type Ask } from "./askStore";
import type { PublicAnalystRanking } from "@shared/schema";

// ============================================================================
// Direct tab — the persona's own quarterly briefing, in the house style.
//
// A persona deck is the artefact that stakeholder reads in their own meeting:
// where the firm stands against its named peer set, what moved this quarter,
// the competitor field, threats and opportunities, talent, and the published
// record — scoped to the questions that role actually asks. It is not an AR
// work-plan, and it carries no seeded content: every figure is an
// AnalystGenius field, a cited placement, a named analyst's sourced position,
// or an ask the AR team wrote. Where a source is unavailable the slide says
// so; nothing is filled in its place.
// ============================================================================

export type PersonaId = "executive" | "strategy" | "product" | "marketing" | "commercial" | "delivery" | "regional";

const PERSONA_META: Record<PersonaId, { label: string; stakeholder: string; audience: string; question: string }> = {
  executive: { label: "Executive", stakeholder: "CEO · COO · CSO", audience: "Executive leadership", question: "Where does the firm stand against its peers, and what moved this quarter?" },
  strategy: { label: "Strategy", stakeholder: "Chief Strategy Officer · Strategy Office", audience: "Strategy leadership", question: "Where do the market story and the delivered reality diverge?" },
  product: { label: "Product", stakeholder: "Product / Service Line Leaders", audience: "Product and service-line leadership", question: "Where does capability standing lead or lag the peer set?" },
  marketing: { label: "Marketing", stakeholder: "Marketing / Communications", audience: "Marketing and communications", question: "How is the firm's story landing, by channel, against its peers?" },
  commercial: { label: "Commercial", stakeholder: "Sales / Pursuit Leaders", audience: "Sales and pursuit leadership", question: "How is the peer field rated where you sell, and what can be cited?" },
  delivery: { label: "Delivery", stakeholder: "Delivery / Operations Leaders", audience: "Delivery and operations leadership", question: "How do workforce and client sentiment compare across the peer set?" },
  regional: { label: "Regional", stakeholder: "Regional / Country Leaders", audience: "Regional leadership", question: "Where does the firm stand on the measures reported globally?" },
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function listDirectPersonaIds(): PersonaId[] {
  return Object.keys(PERSONA_META) as PersonaId[];
}

export function getDirectPersonaDeckFilename(personaIds: PersonaId[], vendorId = "capgemini"): string {
  const v = vendorById(vendorId);
  const personaPart = personaIds.length === 1 ? slugify(PERSONA_META[personaIds[0]].label) : "multi-persona";
  return `${slugify(v.name)}--${personaPart}--quarterly-briefing.pptx`;
}

function formatDate(d: string | null | undefined, precision?: string | null): string {
  if (!d) return "—";
  if (precision === "year" || /^\d{4}$/.test(d)) return d.slice(0, 4);
  if (precision === "month" || /^\d{4}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDue(due: string | null): string {
  if (!due) return "no date";
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Deck assembly
// ---------------------------------------------------------------------------

export async function createDirectPersonaDeck(personaIds: PersonaId[], vendorId = "capgemini", competitorTickers?: string[]): Promise<Buffer> {
  const ids = (personaIds.length ? personaIds : ["executive"]).filter((id): id is PersonaId => id in PERSONA_META);
  const vendor = vendorById(vendorId);
  const vendorName = vendor.name;
  const multi = ids.length > 1;
  const first = PERSONA_META[ids[0]];
  const deckLabel = multi ? "Quarterly briefing" : `${first.label} quarterly briefing`;
  const brand: Brand = { vendorName, vendorMark: vendor.mark, vendorAccent: vendor.accent, deckLabel };

  // Third-party records, read once and shared by every persona section. Each
  // is optional: a failed read is reported on the slide, never filled in.
  const [view, rankings, asks] = await Promise.all([
    vendorAnalystView(vendorId).catch(() => null),
    publicRankingsStore.listRankings(vendorId).catch(() => null),
    askStore.list(vendorId).catch(() => null),
  ]);

  const pptx = newDeck({ title: `${vendorName} ${deckLabel}`, subject: `AnalystGenius quarterly briefing for ${vendorName}` });
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  // The read is pulled first so the cover can carry the real figures.
  // addAgIntelligenceSlides adds its own slides, so the cover is added before
  // it only in order; pptxgenjs keeps insertion order, hence the two-step.
  const agenda = [
    "The AnalystGenius read",
    ...ids.map((id) => `${PERSONA_META[id].label} — where you stand`),
    "Who is writing about you",
    "The published record",
    "Sources",
    "Next steps",
  ].slice(0, 6);

  const coverNotesParts: string[] = [`Generated by AnalystGenius AR SuperHero on ${todayLabel()} for ${vendorName}.`, `Personas: ${ids.map((id) => PERSONA_META[id].label).join(", ")}.`, `Peer set: ${(competitorTickers ?? []).join(", ") || "AnalystGenius default"}.`];

  // Cover placeholder values are filled after the read; pptxgenjs cannot
  // reorder slides, so the cover is added first with the figures the read
  // returns on a pre-fetch. getArBrief is cached, so this costs no second
  // upstream call.
  const { getArBrief } = await import("./agIntelligence");
  let pre = await getArBrief({ competitors: competitorTickers, focalTicker: vendor.agTicker });
  if (pre.degraded) pre = await getArBrief({ competitors: competitorTickers, focalTicker: vendor.agTicker, force: true });
  const f = pre.live && !pre.degraded ? pre.focal : undefined;

  addCover(pptx, brand, {
    kicker: `Prepared for ${vendorName} · ${todayLabel()}`,
    titleA: multi ? "Where you stand," : `${first.label} briefing:`,
    titleB: multi ? "this quarter." : "where you stand.",
    subTitle: multi ? "Standing against the named peer set, what moved this quarter, and the competitor field — one section per leader." : `${first.question}`,
    contextLines: [multi ? `For ${ids.map((id) => PERSONA_META[id].audience.toLowerCase()).join(", ")}.` : `For ${first.audience.toLowerCase()}.`, "For circulation within the leadership team."],
    stats: f
      ? [
          { value: f.assessmentScore == null ? "—" : String(f.assessmentScore), label: "Assessment" },
          { value: f.aiReadinessScore == null ? "—" : String(f.aiReadinessScore), label: "AI readiness" },
          { value: f.gapScore == null ? "—" : String(f.gapScore), label: "Narrative gap" },
        ]
      : [],
    preparedFor: { name: multi ? "Leadership team" : first.audience, role: vendorName },
    agenda,
    notes: coverNotesParts.join(" "),
  });

  const brief = await addAgIntelligenceSlides(pptx, brand, idx, competitorTickers, vendor.agTicker, agenda[0]);

  for (const id of ids) {
    const meta = PERSONA_META[id];
    const section = `${meta.label} — where you stand`;
    const briefing = await buildPersonaBriefing(brief, id);
    const pv = derivePersonaView(brief, id);

    if (multi) {
      addSectionDivider(pptx, brand, {
        index: idx(),
        section,
        title: `${meta.label}: ${meta.stakeholder}`,
        note: briefing?.lens,
        question: { label: "The central question", text: meta.question },
      });
    }
    if (briefing) addPersonaBriefingSlides(pptx, brand, meta.label, briefing, brief, idx, section);
    if (pv) addPersonaReadSlides(pptx, brand, meta.label, pv, brief, idx, section);
    if (!briefing && !pv) {
      const { slide, contentTop } = addBodySlide(pptx, brand, { index: idx(), section, title: `${meta.label} — the AnalystGenius read was unavailable`, note: "This section needs the live read; nothing is estimated in its place." });
      addBulletList(slide, ["Regenerate once the connection is restored."], { x: 0.75, y: contentTop, w: 11.83, h: 1 });
    }
    const personaAsks = (asks ?? []).filter((a) => a.persona_id === id && a.status === "open");
    if (personaAsks.length) addAsksSlide(pptx, brand, meta.label, personaAsks, idx, section);
  }

  addCoverageSlide(pptx, brand, vendorName, view, idx, "Who is writing about you");
  addPlacementsSlide(pptx, brand, vendorName, rankings, idx, "The published record");
  addSourcesSlide(pptx, brand, brief, view, rankings, asks, idx, "Sources");

  const openAsks = (asks ?? []).filter((a) => ids.includes(a.persona_id as PersonaId) && a.status === "open").slice(0, 3);
  const steps = openAsks.length
    ? openAsks.map((a) => ({ title: a.title.length > 60 ? `${a.title.slice(0, 57)}…` : a.title, body: `${a.owner ? `Owner ${a.owner}` : "No owner named"} · due ${formatDue(a.due_date)}`, owner: `${PERSONA_META[a.persona_id as PersonaId]?.label ?? a.persona_id} ask, recorded by AR` }))
    : [];
  if (steps.length < 3) steps.push({ title: "Regenerate before the meeting", body: "The AnalystGenius read is a point-in-time value and drifts between sessions.", owner: "AnalystGenius follow-up" });
  if (steps.length < 3) steps.push({ title: "Record the asks that come out of the room", body: "What AR needs from each leader becomes trackable the moment it is written down.", owner: `${vendorName} leadership` });
  if (steps.length < 3) steps.push({ title: "Log the first analyst interaction", body: "No interaction is on record yet; the roster fills as briefings are logged.", owner: "AR team" });

  addClosing(pptx, brand, {
    titleA: "The next step",
    titleB: `with ${vendorName}.`,
    body: "Where you stand against your named peer set this quarter, what moved, and what the competitor field looks like. Where a metric is not shown, AnalystGenius does not carry it; the gap is stated, not estimated.",
    nextSteps: steps.slice(0, 3),
    disclaimer: "Generated by AnalystGenius AR SuperHero. Live signals at generation time; cited placements and named-analyst coverage each carry a source; no outcome or ranking prediction. Internal briefing material, not analyst research. © 2026 AnalystGenius.",
  });

  return deckToBuffer(pptx);
}

// ---------------------------------------------------------------------------
// The persona's own briefing — standing, movement, threats, talent, revenue.
// ---------------------------------------------------------------------------

function addPersonaBriefingSlides(pptx: pptxgen, brand: Brand, label: string, b: PersonaBriefing, brief: { generatedAt: string; stale?: boolean }, idx: () => string, section: string) {
  const prov = readProvenance(brief as any);

  // A — standing against the peer set.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: `${label} — where you stand against your peer set`,
      note: b.headline,
      caveat: b.dataGaps[0] ?? prov,
      notes: `Sources: AnalystGenius providers/snapshot (assessment, AI readiness, revenue growth) and narrative-reality-gap (recognition). ${prov} ${b.dataGaps.join(" ")}`,
    });
    addSectionLabel(slide, b.lens, { x: 0.75, y: contentTop, w: 11.83, color: AG.muted });
    addTable(slide, {
      x: 0.75,
      y: contentTop + 0.3,
      w: 11.83,
      colW: [3.43, 2.1, 2.1, 2.1, 2.1],
      headers: b.scorecardHeaders,
      rows: b.peerRows.map((r) => ({ cells: [r.name, r.assessment, r.aiReadiness, r.revenueGrowth, r.recognition], tone: r.isFocal ? ("good" as const) : ("default" as const) })),
      fontSize: 10.5,
    });
    const gapsTop = contentTop + 0.3 + 0.38 + b.peerRows.length * 0.34 + 0.3;
    if (b.dataGaps.length > 1 && gapsTop < CONTENT_BOTTOM - 0.7) {
      addSectionLabel(slide, "What this comparison does not include", { x: 0.75, y: gapsTop, w: 11.83 });
      addBulletList(slide, b.dataGaps.slice(1), { x: 0.75, y: gapsTop + 0.3, w: 11.83, h: CONTENT_BOTTOM - gapsTop - 0.35, fontSize: 9.5 });
    }
  }

  // B — movement this quarter + competitor matrix + market movements.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: `${label} — this quarter's movement and the competitor field`,
      note: b.reputationSpan ? `Reputation movement ${b.reputationSpan}, from AnalystGenius's reputation tracker.` : "Competitor field from AnalystGenius's provider catalogue.",
      caveat: prov,
      notes: `Sources: AnalystGenius reputation-tracker/trends (lens movement), providers/snapshot (competitor scores), AR SuperHero's own 14-day captures (market movements). ${prov}`,
    });
    let y = contentTop;
    if (b.reputation.length) {
      addSectionLabel(slide, "Reputation movement this quarter", { x: 0.75, y, w: 5.8 });
      addTable(slide, {
        x: 0.75,
        y: y + 0.3,
        w: 5.8,
        colW: [2.7, 1.7, 1.4],
        headers: ["Lens", "Movement", "Δ"],
        rows: b.reputation.slice(0, 7).map((r) => ({ cells: [r.lens, r.movement, `${r.delta > 0 ? "+" : ""}${r.delta}`], tone: r.delta <= -5 ? ("warn" as const) : r.delta > 0 ? ("good" as const) : ("default" as const) })),
        fontSize: 9.5,
      });
    }
    if (b.competitorIntel.length) {
      addSectionLabel(slide, "Competitor intelligence", { x: 6.8, y, w: 5.78 });
      addTable(slide, { x: 6.8, y: y + 0.3, w: 5.78, colW: [1.5, 2.14, 2.14], headers: ["Firm", "Standing vs you", "What to watch"], rows: b.competitorIntel.slice(0, 5).map((c) => ({ cells: [c.name, c.standing, c.watchItem] })), fontSize: 8.5 });
    }
    y = contentTop + 2.75;
    if (b.marketMovements.length && y < CONTENT_BOTTOM - 0.8) {
      addSectionLabel(slide, "Market movements against your peer group", { x: 0.75, y, w: 11.83 });
      addBulletList(slide, b.marketMovements.slice(0, 4).map((m) => `${m.title} — ${m.detail}`), { x: 0.75, y: y + 0.3, w: 11.83, h: CONTENT_BOTTOM - y - 0.35, fontSize: 9.5 });
    }
  }

  // C — threats and opportunities.
  if (b.threats.length || b.opportunities.length) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: `${label} — emerging threats and opportunities`,
      note: "From the AnalystGenius pulse. Each line names the signal it derives from.",
      caveat: prov,
      notes: `Sources: ${[...b.threats, ...b.opportunities].map((t) => t.source).filter((v, i, a) => a.indexOf(v) === i).join("; ")}`,
    });
    if (b.threats.length) {
      addSectionLabel(slide, "Emerging threats", { x: 0.75, y: contentTop, w: 5.8 });
      addTable(slide, { x: 0.75, y: contentTop + 0.3, w: 5.8, colW: [2.1, 3.7], headers: ["Signal", "What it means"], rows: b.threats.slice(0, 5).map((t) => ({ cells: [t.title, t.detail], tone: "warn" as const })), fontSize: 9 });
    }
    if (b.opportunities.length) {
      addSectionLabel(slide, "Emerging opportunities", { x: 6.8, y: contentTop, w: 5.78 });
      addTable(slide, { x: 6.8, y: contentTop + 0.3, w: 5.78, colW: [2.1, 3.68], headers: ["Signal", "What it means"], rows: b.opportunities.slice(0, 5).map((o) => ({ cells: [o.title, o.detail], tone: "good" as const })), fontSize: 9 });
    }
  }

  // D — talent competitiveness.
  if (b.talent.length) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: `${label} — talent competitiveness across your peer set`,
      note: "Where talent is moving across the named set. Attrition windows differ per firm and are shown.",
      caveat: b.dataGaps.find((g) => g.startsWith("Talent")) ?? "AnalystGenius reports no company-to-company movement; this is direction across the set, not named destinations.",
      notes: "Sources: AnalystGenius talent/intelligence, reported fields only (headcount, headcount YoY, attrition with its window, net flow, AI skill density). Self-labelled estimates in that payload are not used.",
    });
    addTable(slide, {
      x: 0.75,
      y: contentTop,
      w: 11.83,
      colW: [2.8, 1.6, 1.4, 1.3, 3.0, 1.73],
      headers: ["Firm", "Headcount", "YoY", "Attrition", "Attrition window", "Net flow"],
      rows: b.talent.map((t) => ({ cells: [t.name, t.headcount, t.headcountYoY, t.attrition, t.attritionWindow, t.netFlow], tone: t.isFocal ? ("good" as const) : ("default" as const) })),
      fontSize: 9.5,
    });
    const anaTop = contentTop + 0.38 + b.talent.length * 0.32 + 0.3;
    if (b.talentAnalysis.length && anaTop < CONTENT_BOTTOM - 0.7) {
      addSectionLabel(slide, "What this means", { x: 0.75, y: anaTop, w: 11.83 });
      addBulletList(slide, b.talentAnalysis, { x: 0.75, y: anaTop + 0.3, w: 11.83, h: CONTENT_BOTTOM - anaTop - 0.35, fontSize: 10 });
    }
  }

  // E — revenue trajectory, only when AnalystGenius carries the series.
  if (b.quarterlyRevenue.length >= 2) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: `${label} — quarterly revenue trajectory`,
      note: "AnalystGenius's quarterly revenue series, as reported.",
      caveat: prov,
      notes: "Source: AnalystGenius providers/snapshot quarterlyRevenue.",
    });
    const pts = b.quarterlyRevenue.slice(-8);
    addTable(slide, { x: 0.75, y: contentTop, w: 11.83, colW: [5.9, 5.93], headers: ["Quarter ending", "Revenue (USD m)"], rows: pts.map((q) => ({ cells: [q.quarter, q.revenueUsdM.toLocaleString()] })), fontSize: 10.5 });
    const firstQ = pts[0];
    const lastQ = pts[pts.length - 1];
    const change = firstQ.revenueUsdM ? ((lastQ.revenueUsdM - firstQ.revenueUsdM) / firstQ.revenueUsdM) * 100 : null;
    if (change !== null) {
      const y = contentTop + 0.38 + pts.length * 0.32 + 0.2;
      slide.addText(`Across the reported series: ${firstQ.quarter} ${firstQ.revenueUsdM.toLocaleString()}M → ${lastQ.quarter} ${lastQ.revenueUsdM.toLocaleString()}M (${change > 0 ? "+" : ""}${change.toFixed(1)}%).`, { x: 0.75, y, w: 11.83, h: fitH(y, 0.4), fontFace: FONT_BODY, fontSize: 11, color: AG.ink, margin: 0, fit: "shrink" });
    }
  }
}

// ---------------------------------------------------------------------------
// Role-scoped read and advice.
// ---------------------------------------------------------------------------

function addPersonaReadSlides(pptx: pptxgen, brand: Brand, label: string, view: PersonaView, brief: { generatedAt: string; stale?: boolean }, idx: () => string, section: string) {
  const prov = readProvenance(brief as any);
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: `${label} — your market read`,
      note: `The AnalystGenius signals that land on your desk, scoped to ${view.roleTitle}.`,
      caveat: `${prov} Values are shown as returned.`,
      notes: `Sources: AnalystGenius providers/snapshot, narrative-reality-gap, reputation-tracker/trends. ${prov}`,
    });
    addStats(slide, view.metrics.slice(0, 3).map((m) => ({ value: m.value, label: m.label, caption: m.caption })), { x: 0.75, y: contentTop + 0.05, w: 11.83 });
    const colTop = contentTop + 1.45;
    if (view.lenses.length) {
      addSectionLabel(slide, "Reputation lenses you own", { x: 0.75, y: colTop, w: 5.8 });
      addTable(slide, { x: 0.75, y: colTop + 0.3, w: 5.8, colW: [2.7, 1.7, 1.4], headers: ["Lens", "Movement", "Δ"], rows: view.lenses.map((l) => ({ cells: [l.name, `${l.prev} → ${l.last}`, `${l.delta > 0 ? "+" : ""}${l.delta}`], tone: l.delta <= -5 ? ("warn" as const) : ("default" as const) })), fontSize: 10 });
    }
    const rightX = view.lenses.length ? 6.8 : 0.75;
    const rightW = view.lenses.length ? 5.78 : 11.83;
    const signals = [...view.emergencies.map((e) => `Exposure — ${e.title}: ${e.detail}`), ...view.highlights.map((h) => `Lead with — ${h.title}: ${h.detail}`)];
    if (signals.length) {
      addSectionLabel(slide, "Signals on your desk", { x: rightX, y: colTop, w: rightW });
      addBulletList(slide, signals.slice(0, 5), { x: rightX, y: colTop + 0.3, w: rightW, h: CONTENT_BOTTOM - colTop - 0.35, fontSize: 9.5 });
    }
  }
  if (view.advice.length || view.questions.length) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: `${label} — what this means for your role`,
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
}

// ---------------------------------------------------------------------------
// Real records the AR team holds: asks, named coverage, placements, sources.
// ---------------------------------------------------------------------------

function addAsksSlide(pptx: pptxgen, brand: Brand, label: string, asks: Ask[], idx: () => string, section: string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: `${label} — what AR needs from you`,
    note: `${asks.length} open ask${asks.length === 1 ? "" : "s"} recorded by the AR team for this role.`,
    caveat: "Written by the AR team in AR SuperHero; nothing here is suggested or inferred.",
    notes: "Source: AR SuperHero asks, recorded by the AR team.",
  });
  addTable(slide, {
    x: 0.75,
    y: contentTop,
    w: 11.83,
    colW: [6.0, 2.4, 1.6, 1.83],
    headers: ["Ask", "Owner", "Due", "Status"],
    rows: asks.slice(0, 8).map((a) => ({ cells: [a.title + (a.note ? `\n${a.note}` : ""), a.owner ?? "No owner named", formatDue(a.due_date), a.status] })),
    fontSize: 10,
  });
}

function addCoverageSlide(pptx: pptxgen, brand: Brand, vendorName: string, view: Awaited<ReturnType<typeof vendorAnalystView>> | null, idx: () => string, section: string) {
  if (!view) {
    addBodySlide(pptx, brand, { index: idx(), section, title: "Who is writing about you", note: "Named-analyst coverage could not be read when this deck was generated.", caveat: "Absent, not empty: regenerate the deck to include the named analysts." });
    return;
  }
  const positioned: VendorAnalyst[] = view.analysts.filter((a) => a.positions > 0);
  const silent = view.analysts.filter((a) => a.positions === 0);
  if (!positioned.length && !silent.length) return;
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: "Who is writing about you",
    note: `${view.summary.named} named analysts cover ${vendorName}; ${view.summary.withPosition} have a published, sourced position${view.summary.stale ? `, ${view.summary.stale} of them more than two years old` : ""}.`,
    caveat: view.summary.withInteraction === 0 ? "No interaction with any of these analysts is logged yet, so the relationship is unknown rather than neutral." : `${view.summary.withInteraction} have a logged interaction.`,
    notes: `Source: named-analyst coverage held by AR SuperHero; every position carries a source URL. ${positioned.slice(0, 8).map((a) => `${a.name} — ${a.latest_source_url ?? ""}`).join("; ")}`,
  });
  if (positioned.length) {
    addTable(slide, {
      x: 0.75,
      y: contentTop,
      w: 11.83,
      colW: [2.9, 2.3, 1.6, 1.6, 3.43],
      headers: ["Analyst", "Firm", "Positions", "Latest", "Relationship"],
      rows: positioned.slice(0, 8).map((a) => ({
        cells: [a.name + (a.role ? `\n${a.role}` : ""), a.firm, String(a.positions), `${formatDate(a.latest_published, a.latest_precision)}${a.stale ? " · dated" : ""}`, a.last_interaction_at ? `Last contact ${new Date(a.last_interaction_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "No interaction logged"],
      })),
      fontSize: 9,
    });
  }
  const y = contentTop + 0.38 + Math.min(positioned.length, 8) * 0.44 + 0.25;
  if (silent.length && y < CONTENT_BOTTOM - 0.6) {
    addSectionLabel(slide, `Also covering this market, no published position on ${vendorName} found`, { x: 0.75, y, w: 11.83 });
    slide.addText(silent.slice(0, 12).map((a) => `${a.name} (${a.firm})`).join("  ·  "), { x: 0.75, y: y + 0.28, w: 11.83, h: fitH(y + 0.28, 0.6), fontFace: FONT_BODY, fontSize: 9.5, color: AG.body, margin: 0, fit: "shrink", valign: "top" });
  }
}

function addPlacementsSlide(pptx: pptxgen, brand: Brand, vendorName: string, rankings: PublicAnalystRanking[] | null, idx: () => string, section: string) {
  if (!rankings) {
    addBodySlide(pptx, brand, { index: idx(), section, title: "The published record", note: "The placement record could not be read when this deck was generated.", caveat: "Absent, not empty: regenerate the deck to include the cited placements." });
    return;
  }
  if (!rankings.length) return;
  const rows = [...rankings].sort((a, b) => b.published_date.localeCompare(a.published_date));
  const confirmed = rows.filter((r) => r.source_type === "analyst_firm_page").length;
  const firms = new Set(rows.map((r) => r.analyst_firm)).size;
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: "The published record",
    note: `${rows.length} cited placements for ${vendorName} across ${firms} analyst firms. The most recent are listed.`,
    caveat: `${confirmed} of ${rows.length} are confirmed on the analyst firm's own page; the rest are vendor-reported. Every row carries a source.`,
    notes: `Source: cited public placements held by AR SuperHero. ${rows.slice(0, 10).map((r) => `${r.report_name} — ${r.source_url}`).join("; ")}`,
  });
  addTable(slide, {
    x: 0.75,
    y: contentTop,
    w: 11.83,
    colW: [1.9, 5.3, 2.4, 2.23],
    headers: ["Analyst firm", "Report", "Placement", "Published"],
    rows: rows.slice(0, 9).map((r) => ({ cells: [r.analyst_firm, r.report_name, r.placement, formatDate(r.published_date, r.date_precision)] })),
    fontSize: 9,
  });
}

function addSourcesSlide(pptx: pptxgen, brand: Brand, brief: { live: boolean; generatedAt: string; stale?: boolean; degraded?: boolean }, view: Awaited<ReturnType<typeof vendorAnalystView>> | null, rankings: PublicAnalystRanking[] | null, asks: Ask[] | null, idx: () => string, section: string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: "Sources",
    note: "Every section names where its figures come from. Nothing in this deck is estimated or seeded.",
    caveat: "AnalystGenius values are point-in-time and drift between reads; placements and coverage are cited public records; asks are written by the AR team.",
  });
  const rows: { cells: string[]; tone?: "default" | "good" | "warn" | "bad" }[] = [
    { cells: ["AnalystGenius read", brief.live && !brief.degraded ? readProvenance(brief as any) : "Unavailable at generation time; nothing shown in its place.", "providers/snapshot · narrative-reality-gap · reputation-tracker/trends · talent/intelligence (reported fields)"], tone: brief.live && !brief.degraded ? "default" : "warn" },
    { cells: ["Named-analyst coverage", view ? `${view.summary.named} analysts, ${view.summary.withPosition} with a sourced position` : "Could not be read", "AR SuperHero coverage records; every position carries a source URL"], tone: view ? "default" : "warn" },
    { cells: ["Published placements", rankings ? `${rankings.length} cited placements, ${rankings.filter((r) => r.source_type === "analyst_firm_page").length} confirmed on the analyst firm's own page` : "Could not be read", "AR SuperHero placement records; every row carries a source URL"], tone: rankings ? "default" : "warn" },
    { cells: ["Asks", asks ? `${asks.filter((a) => a.status === "open").length} open` : "Could not be read", "Written by the AR team in AR SuperHero"], tone: asks ? "default" : "warn" },
  ];
  addTable(slide, { x: 0.75, y: contentTop, w: 11.83, colW: [2.6, 4.6, 4.63], headers: ["Section", "What was available", "Source"], rows, fontSize: 10 });
}
