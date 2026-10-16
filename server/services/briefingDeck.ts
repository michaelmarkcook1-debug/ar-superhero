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
  fitH,
  todayLabel,
  type Brand,
} from "./boardPack";
import { addAgIntelligenceSlides } from "./agIntelligenceSlide";
import { vendorById, vendorByTicker } from "./vendors";
import { publicRankingsStore } from "./publicRankingsStore";
import { analystCoverageStore } from "./analystCoverageStore";
import { vendorEvaluationCalendar } from "./evaluationCalendar";
import { baseReportName } from "./workSeed";
import { houseLearnings } from "./resultsLearning";
import {
  CONFIDENCE_FACTOR,
  CROSS_HOUSE_FRAMEWORK,
  ENGAGEMENT_STAGES,
  EVIDENCE_BOUNDARY,
  HARD_TRUTH,
  UNIVERSAL_SHIFT_DRIVERS,
  playbookById,
  type AnalystHouseId,
  type HousePlaybook,
} from "@shared/assessmentPlaybooks";
import type { AnalystCoverage, PublicAnalystRanking } from "@shared/schema";

// ============================================================================
// Succeed tab — the evaluation defence pack.
//
// Prepares a vendor for the next cycle of a specific analyst evaluation, from
// what AR SuperHero actually holds:
//   - the AnalystGenius read (standing, competitive field, narrative gap)
//   - the vendor's cited placement history in that evaluation
//   - what the house evaluates and what moves its rankings (house playbook)
//   - the four engagement moments with the house's own dos and don'ts
//   - the named analysts who cover the vendor at that house
//   - what the house has published about the peer set
//   - the evidence the vendor must supply — stated as open inputs
// Nothing here is a readiness score, a predicted placement, or a seeded
// evidence gap. Where the pack has no house (the general form), the
// cross-house framework carries the guidance and the full record is shown.
// ============================================================================

export interface BriefingDeckInput {
  /** Legacy caller: a Succeed moment id. Produces the general form. */
  momentId?: string;
  /** Evaluation form: the analyst firm and report name of a cited series. */
  firm?: string;
  reportName?: string;
  vendorId?: string;
  competitorTickers?: string[];
}

const HOUSE_BY_FIRM: Record<string, AnalystHouseId> = {
  gartner: "gartner",
  forrester: "forrester",
  idc: "idc",
  "hfs research": "hfs",
  hfs: "hfs",
  nelsonhall: "nelsonhall",
  isg: "isg",
  "everest group": "everest",
  everest: "everest",
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function fmtDate(d: string, precision: string): string {
  if (precision === "year" || /^\d{4}$/.test(d)) return d.slice(0, 4);
  if (precision === "month" || /^\d{4}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function sourceSplit(rows: PublicAnalystRanking[]): string {
  const confirmed = rows.filter((r) => r.source_type === "analyst_firm_page").length;
  return `${confirmed} of ${rows.length} confirmed on the analyst firm's own page; the rest are vendor-reported.`;
}

export function getBriefingDeckFilename(input: BriefingDeckInput | string, vendorIdLegacy = "capgemini"): string {
  const inp: BriefingDeckInput = typeof input === "string" ? { momentId: input, vendorId: vendorIdLegacy } : input;
  const vendor = vendorById(inp.vendorId);
  const scope = inp.firm && inp.reportName ? `${slugify(inp.firm)}--${slugify(baseReportName(inp.reportName))}` : "analyst-record";
  return `${slugify(vendor.name)}--${scope}--defence-pack.pptx`;
}

export async function createBriefingDeck(input: BriefingDeckInput | string, vendorIdLegacy = "capgemini", competitorsLegacy?: string[]): Promise<Buffer> {
  const inp: BriefingDeckInput = typeof input === "string" ? { momentId: input, vendorId: vendorIdLegacy, competitorTickers: competitorsLegacy } : input;
  const vendor = vendorById(inp.vendorId);
  const vendorName = vendor.name;
  const series = Boolean(inp.firm && inp.reportName);
  const firm = inp.firm?.trim() ?? "";
  const baseName = inp.reportName ? baseReportName(inp.reportName) : "";
  const houseId = series ? HOUSE_BY_FIRM[firm.toLowerCase()] : undefined;
  const playbook: HousePlaybook | null = houseId ? playbookById(houseId) : null;
  const houseName = playbook?.house ?? firm;

  // Records, each optional and reported honestly when absent.
  const [allRankings, coverage, calendar, learnings] = await Promise.all([
    publicRankingsStore.listRankings().catch(() => null),
    analystCoverageStore.list(vendor.id).catch(() => null),
    vendorEvaluationCalendar(vendor.id).catch(() => null),
    houseId ? houseLearnings(houseId).catch(() => []) : Promise.resolve([]),
  ]);
  const vendorRows = (allRankings ?? []).filter((r) => r.vendor_id === vendor.id);
  const editions = series ? vendorRows.filter((r) => r.analyst_firm.toLowerCase() === firm.toLowerCase() && baseReportName(r.report_name).toLowerCase() === baseName.toLowerCase()).sort((a, b) => b.published_date.localeCompare(a.published_date)) : [];
  const peerIds = new Set((inp.competitorTickers ?? []).map((t) => vendorByTicker(t)?.id).filter((v): v is string => Boolean(v) && v !== vendor.id));
  const peerRows = (allRankings ?? [])
    .filter((r) => peerIds.has(r.vendor_id) && (!series || r.analyst_firm.toLowerCase() === firm.toLowerCase()))
    .sort((a, b) => b.published_date.localeCompare(a.published_date));
  const seriesEntry = calendar?.series.find((s) => s.firm.toLowerCase() === firm.toLowerCase() && s.report.toLowerCase() === baseName.toLowerCase());

  const deckLabel = series ? `${houseName} defence pack` : "Analyst record defence pack";
  const brand: Brand = { vendorName, vendorMark: vendor.mark, vendorAccent: vendor.accent, deckLabel };
  const pptx = newDeck({ title: `${vendorName} — ${deckLabel}`, subject: `AnalystGenius evaluation defence pack for ${vendorName}` });
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  const agenda = series
    ? ["The AnalystGenius read", "Your record in this evaluation", `What ${houseName} evaluates`, "The four engagement moments", `Who covers you at ${houseName}`, "The evidence you must supply"]
    : ["The AnalystGenius read", "Your published record", "What drives a defensible position", "The four engagement moments", "Who is writing about you", "The evidence you must supply"];

  addCover(pptx, brand, {
    kicker: `Prepared for ${vendorName} · ${todayLabel()}`,
    titleA: series ? "Defending the next" : "Defending your",
    titleB: series ? `${houseName} cycle.` : "analyst record.",
    subTitle: series ? `${baseName}: what the house evaluates, what it has published about you, and the evidence the next submission needs.` : "Your cited placement record, the named analysts who cover you, and the evidence a defensible position needs.",
    contextLines: [series && seriesEntry ? `Last logged edition ${fmtDate(seriesEntry.last.date, seriesEntry.last.precision)}, ${Math.round(seriesEntry.monthsSinceLast)} months ago.` : `${vendorRows.length} cited placements on record.`, "For the AR team and the executives who will present."],
    stats: series
      ? [
          { value: String(editions.length), label: editions.length === 1 ? "Edition on record" : "Editions on record" },
          { value: editions[0]?.placement ?? "—", label: "Last placement" },
          { value: seriesEntry ? `${Math.round(seriesEntry.monthsSinceLast)} mo` : "—", label: "Since last edition" },
        ]
      : [
          { value: String(vendorRows.length), label: "Cited placements" },
          { value: String(new Set(vendorRows.map((r) => r.analyst_firm)).size), label: "Analyst firms" },
          { value: coverage ? String(new Set(coverage.filter((c) => c.vendor_id === vendor.id && c.stance_summary).map((c) => c.analyst_name)).size) : "—", label: "Analysts with a position" },
        ],
    preparedFor: { name: "Analyst relations", role: vendorName },
    agenda,
    notes: `Generated by AnalystGenius AR SuperHero on ${todayLabel()}. Scope: ${series ? `${houseName} · ${baseName}` : "general analyst record"}. Peer set: ${(inp.competitorTickers ?? []).join(", ") || "none named"}.`,
  });

  // 1–3. The AnalystGenius read.
  await addAgIntelligenceSlides(pptx, brand, idx, inp.competitorTickers, vendor.agTicker, agenda[0]);

  // 4. Your record.
  addRecordSlide(pptx, brand, idx, agenda[1], vendorName, series ? editions : vendorRows, allRankings === null, series ? `Your record in ${baseName}` : "Your published record", seriesEntry?.note);

  // 5. What the house evaluates / what drives a defensible position.
  addWhatMovesSlide(pptx, brand, idx, agenda[2], playbook, learnings[0]);

  // 6. The four engagement moments.
  addMomentsSlide(pptx, brand, idx, agenda[3], playbook);

  // 7. Who covers you.
  addCoverageSlide(pptx, brand, idx, agenda[4], vendor.id, vendorName, coverage, series ? houseName : undefined);

  // 8. What the field has published (peers in this scope).
  if (peerRows.length) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: agenda[1],
      title: series ? `What ${houseName} has published about your peers` : "What the field has published",
      note: `${peerRows.length} cited placements for the named peer set${series ? ` at ${houseName}` : ""}. The most recent are listed.`,
      caveat: sourceSplit(peerRows),
      notes: `Source: cited public placements held by AR SuperHero. ${peerRows.slice(0, 8).map((r) => `${vendorById(r.vendor_id).name} · ${r.report_name} — ${r.source_url}`).join("; ")}`,
    });
    addTable(slide, {
      x: 0.75,
      y: contentTop,
      w: 11.83,
      colW: [1.7, 1.8, 4.3, 2.0, 2.03],
      headers: ["Firm", "Analyst firm", "Report", "Placement", "Published"],
      rows: peerRows.slice(0, 9).map((r) => ({ cells: [vendorById(r.vendor_id).name, r.analyst_firm, r.report_name, r.placement, fmtDate(r.published_date, r.date_precision)] })),
      fontSize: 8.5,
    });
  }

  // 9. The evidence you must supply.
  addEvidenceSlide(pptx, brand, idx, agenda[5], houseName || null);

  addClosing(pptx, brand, {
    titleA: "The next step",
    titleB: `with ${vendorName}.`,
    body: series ? `Enter the ${houseName} cycle with the record in hand, the house's rules in view, and every claim traceable to evidence the firm will stand behind.` : "Take the published record and the named coverage into the next cycle, with every claim traceable to evidence the firm will stand behind.",
    nextSteps: [
      { title: series ? `Confirm the ${houseName} timetable` : "Confirm the next cycle", body: series ? "The research “as of” date and submission deadline, from the house. AR SuperHero holds no house calendar." : "Which evaluation is next, and its “as of” date, from the house.", owner: "AR team" },
      { title: "Build the criterion-to-evidence ledger", body: "One row per criterion, with GA state, date and owner. The house framework's first rule.", owner: "AR team with evidence owners" },
      { title: "Choose references by relevance", body: "Not prestige. Confirm availability before committing a name.", owner: `${vendorName} commercial leadership` },
    ],
    disclaimer: "Generated by AnalystGenius AR SuperHero. Cited placements and coverage carry sources; house guidance is a synthesis of published methodology, not published weights; no placement or outcome is predicted. © 2026 AnalystGenius.",
  });

  return deckToBuffer(pptx);
}

// ---------------------------------------------------------------------------

function addRecordSlide(pptx: pptxgen, brand: Brand, idx: () => string, section: string, vendorName: string, rows: PublicAnalystRanking[], unavailable: boolean, title: string, anniversaryNote?: string) {
  if (unavailable) {
    addBodySlide(pptx, brand, { index: idx(), section, title, note: "The placement record could not be read when this deck was generated.", caveat: "Absent, not empty: regenerate the deck to include the cited placements." });
    return;
  }
  if (!rows.length) {
    const { slide, contentTop } = addBodySlide(pptx, brand, { index: idx(), section, title, note: `No cited placement is logged for ${vendorName} in this scope.`, caveat: "Logged means found and cited; it does not mean none exists. Verify against the house before the cycle." });
    addBulletList(slide, ["A placement is added to the record only with a source URL that carries the claim."], { x: 0.75, y: contentTop, w: 11.83, h: 1 });
    return;
  }
  const sorted = [...rows].sort((a, b) => b.published_date.localeCompare(a.published_date));
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title,
    note: anniversaryNote ?? `${sorted.length} cited placement${sorted.length === 1 ? "" : "s"} on record. The most recent are listed.`,
    caveat: `${sourceSplit(sorted)} Every row carries a source URL.`,
    notes: `Source: cited public placements held by AR SuperHero. ${sorted.slice(0, 10).map((r) => `${r.report_name} ${r.published_date} — ${r.source_url}`).join("; ")}`,
  });
  addTable(slide, {
    x: 0.75,
    y: contentTop,
    w: 11.83,
    colW: [1.9, 5.1, 2.6, 2.23],
    headers: ["Analyst firm", "Report", "Placement", "Published"],
    rows: sorted.slice(0, 9).map((r) => ({ cells: [r.analyst_firm, r.report_name, r.placement, fmtDate(r.published_date, r.date_precision)] })),
    fontSize: 9,
  });
}

function addWhatMovesSlide(pptx: pptxgen, brand: Brand, idx: () => string, section: string, playbook: HousePlaybook | null, learning?: { cycles: number; lines: { line: string }[] }) {
  if (playbook) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section,
      title: `What ${playbook.house} evaluates, and what moves its rankings`,
      note: playbook.assessment.leadership,
      caveat: "A synthesis of published methodology and the owner playbook, not published weights. The study's own criteria, inclusion rules and cut-off dates override it.",
      notes: `Source: house playbook (${playbook.contentSource ?? "owner-supplied"}). Evidence boundary: ${EVIDENCE_BOUNDARY[0]}`,
    });
    addSectionLabel(slide, `${playbook.assessment.name} — published axes`, { x: 0.75, y: contentTop, w: 5.8 });
    addTable(slide, { x: 0.75, y: contentTop + 0.3, w: 5.8, colW: [1.0, 4.8], headers: ["Axis", "Published label"], rows: [{ cells: ["X", playbook.assessment.axes[0]] }, { cells: ["Y", playbook.assessment.axes[1]] }], fontSize: 10.5 });
    addSectionLabel(slide, "Leadership framework", { x: 0.75, y: contentTop + 1.45, w: 5.8 });
    addBulletList(slide, playbook.leadershipFramework.slice(0, 3), { x: 0.75, y: contentTop + 1.75, w: 5.8, h: CONTENT_BOTTOM - contentTop - 1.8, fontSize: 9.5 });
    addSectionLabel(slide, playbook.movementDriver.headline, { x: 6.8, y: contentTop, w: 5.78 });
    addBulletList(slide, playbook.movementDriver.drivers.slice(0, 6), { x: 6.8, y: contentTop + 0.3, w: 5.78, h: learning?.lines.length ? 2.2 : CONTENT_BOTTOM - contentTop - 0.35, fontSize: 10 });
    if (learning?.lines.length) {
      const lTop = contentTop + 2.7;
      addSectionLabel(slide, `Learned from your ${playbook.house} results (${learning.cycles} cycle${learning.cycles === 1 ? "" : "s"}), observational`, { x: 6.8, y: lTop, w: 5.78 });
      addBulletList(slide, learning.lines.slice(0, 3).map((l) => l.line), { x: 6.8, y: lTop + 0.3, w: 5.78, h: CONTENT_BOTTOM - lTop - 0.35, fontSize: 9.5 });
    }
    return;
  }
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: HARD_TRUTH.headline,
    note: HARD_TRUTH.detail,
    caveat: HARD_TRUTH.formula,
    notes: `Source: cross-house framework from the owner playbook. ${EVIDENCE_BOUNDARY[1]}`,
  });
  addSectionLabel(slide, "What drives the largest shifts in analyst rankings, across houses", { x: 0.75, y: contentTop, w: 11.83 });
  addCards(slide, UNIVERSAL_SHIFT_DRIVERS.slice(0, 6).map((d) => ({ title: d.replace(/\.$/, ""), body: "" })), { x: 0.75, y: contentTop + 0.3, w: 11.83, cols: 3, h: 0.95 });
}

function addMomentsSlide(pptx: pptxgen, brand: Brand, idx: () => string, section: string, playbook: HousePlaybook | null) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: playbook ? `The four engagement moments at ${playbook.house}` : "The four engagement moments",
    note: playbook ? "Each moment with the house's first rule to follow and first to avoid, in rank order of practical influence where the playbook states one." : "Each moment with the cross-house framework rule that applies.",
    caveat: playbook ? "Ranks are directional operating judgements, not published weights." : CONFIDENCE_FACTOR.headline + " " + CONFIDENCE_FACTOR.detail.slice(0, 120) + "…",
  });
  const cards = ENGAGEMENT_STAGES.map((st, i) => {
    const guidance = playbook?.stages.find((s) => s.stage === st.id);
    const framework = CROSS_HOUSE_FRAMEWORK[i];
    const body = guidance
      ? [guidance.dos[0] ? `Do: ${guidance.dos[0]}` : null, guidance.donts[0] ? `Avoid: ${guidance.donts[0]}` : null].filter(Boolean).join("\n")
      : framework
        ? `${framework.title}. ${framework.points[0] ?? ""}`
        : st.what;
    return { tag: guidance?.rank ? `Influence rank ${guidance.rank}` : st.label, title: st.label, body };
  });
  addCards(slide, cards, { x: 0.75, y: contentTop, w: 11.83, cols: 2, h: 1.85, numbered: false });
}

function addCoverageSlide(pptx: pptxgen, brand: Brand, idx: () => string, section: string, vendorId: string, vendorName: string, coverage: AnalystCoverage[] | null, house?: string) {
  const title = house ? `Who covers you at ${house}` : "Who is writing about you";
  if (!coverage) {
    addBodySlide(pptx, brand, { index: idx(), section, title, note: "Named-analyst coverage could not be read when this deck was generated.", caveat: "Absent, not empty: regenerate the deck to include the named analysts." });
    return;
  }
  const scoped = house ? coverage.filter((r) => r.firm.toLowerCase() === house.toLowerCase()) : coverage;
  const positioned = scoped.filter((r) => r.vendor_id === vendorId && r.stance_summary && r.source_url).sort((a, b) => String(b.published_date ?? "").localeCompare(String(a.published_date ?? "")));
  const silent = scoped.filter((r) => !positioned.includes(r)).map((r) => `${r.analyst_name}${r.role ? ` (${r.role})` : ""}`);
  if (!positioned.length && !silent.length) {
    const { slide, contentTop } = addBodySlide(pptx, brand, { index: idx(), section, title, note: `No named analyst${house ? ` at ${house}` : ""} with a sourced position on ${vendorName} is on record.`, caveat: "On record means found and cited; it does not mean nobody covers you." });
    addBulletList(slide, ["Named coverage is added only with a source URL carrying the position."], { x: 0.75, y: contentTop, w: 11.83, h: 1 });
    return;
  }
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title,
    note: `${positioned.length} named analyst${positioned.length === 1 ? "" : "s"} with a published, sourced position on ${vendorName}${house ? ` at ${house}` : ""}.`,
    caveat: "Positions are shown as published, with the date. A position more than two years old is historic coverage, not a current view.",
    notes: `Source: named-analyst coverage held by AR SuperHero. ${positioned.slice(0, 8).map((r) => `${r.analyst_name} — ${r.source_url}`).join("; ")}`,
  });
  let y = contentTop;
  if (positioned.length) {
    addTable(slide, {
      x: 0.75,
      y,
      w: 11.83,
      colW: [2.3, 1.9, 6.1, 1.53],
      headers: ["Analyst", "Firm", "Published position", "Date"],
      rows: positioned.slice(0, 6).map((r) => ({ cells: [r.analyst_name + (r.role ? `\n${r.role}` : ""), r.firm, r.stance_summary ?? "", fmtDate(r.published_date ?? "", r.date_precision ?? "day")] })),
      fontSize: 9,
    });
    y += 0.38 + Math.min(positioned.length, 6) * 0.52 + 0.25;
  }
  if (silent.length && y < CONTENT_BOTTOM - 0.6) {
    addSectionLabel(slide, `Also covering this market${house ? ` at ${house}` : ""}, no published position on ${vendorName} found`, { x: 0.75, y, w: 11.83 });
    slide.addText(silent.slice(0, 12).join("  ·  "), { x: 0.75, y: y + 0.28, w: 11.83, h: fitH(y + 0.28, 0.6), fontFace: FONT_BODY, fontSize: 10, color: AG.body, margin: 0, fit: "shrink", valign: "top" });
  }
}

function addEvidenceSlide(pptx: pptxgen, brand: Brand, idx: () => string, section: string, house: string | null) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    section,
    title: "The evidence you must supply",
    note: "Open inputs, by design. AR SuperHero holds the public record; the submission's proof comes from the firm.",
    caveat: `${CONFIDENCE_FACTOR.headline} ${CONFIDENCE_FACTOR.detail.slice(0, 150)}…`,
    notes: `Source: cross-house framework from the owner playbook. Evidence sources analysts triangulate: ${CONFIDENCE_FACTOR.evidenceSources.join(", ")}.`,
  });
  addRowList(
    slide,
    CROSS_HOUSE_FRAMEWORK.slice(0, 5).map((f) => ({ title: f.title, body: f.points[0] ?? "" })),
    { x: 0.75, y: contentTop, w: 11.83, rowH: 0.78 }
  );
  if (house) {
    // Nothing house-specific is invented here; the house's own criteria
    // override the framework, and that is said on the slide above.
  }
}
