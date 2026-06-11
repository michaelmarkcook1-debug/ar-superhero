import type pptxgen from "pptxgenjs";
import {
  newDeck,
  deckToBuffer,
  addCover,
  addClosing,
  addBodySlide,
  addTable,
  addMetricCard,
  addBulletList,
  addSectionLabel,
  evidenceLabel,
  PALETTE,
  type Brand,
} from "./boardPack";

// ============================================================================
// Succeed tab — AR analyst assessment "defence pack".
//
// Board/C-suite style pack that defends a vendor's readiness for a specific
// analyst assessment. Two live demo assessment views only (Overall IT Services,
// Overall AI Readiness). Capgemini is the demo vendor. No predicted rating or
// outcome — this is a readiness and evidence view, with open inputs surfaced
// rather than invented.
// ============================================================================

type ReadinessBand = "Strong" | "Adequate" | "Weak" | "Missing" | "Unsupported";

type AnalystMoment = {
  id: string;
  model: string;
  topic: string;
  cycle: string;
  due: string;
  status: string;
  readiness: ReadinessBand;
  owner: string;
  exposure: string;
  topGaps: string[];
  rfiState: string;
  briefingState: string;
  evidenceCoverage: number;
};

type EvidenceGap = {
  id: string;
  momentId: string;
  title: string;
  severity: string;
  status: string;
  rationale: string;
};

type VendorContext = {
  id: string;
  name: string;
  mark: string;
  accent: string;
  thesis: string;
};

const VENDORS: VendorContext[] = [
  {
    id: "capgemini",
    name: "Capgemini",
    mark: "C",
    accent: "0070AD",
    thesis:
      "Lead with technology and engineering breadth, client co-innovation, industry execution, trust, and sustainable transformation.",
  },
  {
    id: "cognizant",
    name: "Cognizant",
    mark: "C",
    accent: "1F70C1",
    thesis:
      "Lead with industry operating model depth, AI-enabled delivery modernisation, engineering execution, and measurable client transformation outcomes.",
  },
  {
    id: "accenture",
    name: "Accenture",
    mark: "A",
    accent: "A100FF",
    thesis:
      "Lead with transformation scale, industry depth, platform partnerships, and measurable reinvention outcomes.",
  },
  {
    id: "ibm",
    name: "IBM",
    mark: "IBM",
    accent: "0F62FE",
    thesis:
      "Lead with hybrid cloud, AI, consulting execution, ecosystem leverage, and enterprise-grade delivery proof.",
  },
];

const MOMENTS: AnalystMoment[] = [
  {
    id: "m1",
    model: "Overall IT Services",
    topic: "Enterprise IT Services market position",
    cycle: "Live demo view: H1 2026",
    due: "12 Jun",
    status: "On track",
    readiness: "Adequate",
    owner: "Mireille Okonkwo",
    exposure:
      "Current AG-shaped demo data shows defensible delivery scale and client outcome signals, but the executive story still needs sharper proof of repeatability across regions and service lines.",
    topGaps: [
      "Named cross-industry references: three strong examples available, two still approval-limited.",
      "Repeatable operating model proof: narrative exists but needs stronger quantified evidence.",
    ],
    rfiState: "In review",
    briefingState: "Scheduled",
    evidenceCoverage: 0.68,
  },
  {
    id: "m2",
    model: "Overall AI Readiness",
    topic: "AI services and enterprise AI adoption readiness",
    cycle: "Live demo view: H1 2026",
    due: "28 May",
    status: "At risk",
    readiness: "Weak",
    owner: "Dev Patel",
    exposure:
      "AI readiness has visible momentum, but AG-shaped demo data shows uneven production proof, governance evidence, and client value metrics across the portfolio.",
    topGaps: [
      "Production-grade AI outcomes: pilot evidence is stronger than scaled client proof.",
      "Responsible AI governance: policy exists, but assessment-ready operating evidence is thin.",
    ],
    rfiState: "Draft",
    briefingState: "Pending",
    evidenceCoverage: 0.44,
  },
];

const EVIDENCE_GAPS: EvidenceGap[] = [
  {
    id: "g1",
    momentId: "m2",
    title: "Production AI outcomes: scaled proof",
    severity: "High",
    status: "unsupported",
    rationale: "Pilot metrics are available, but named production outcomes and adoption depth are not yet assessment-ready.",
  },
  {
    id: "g2",
    momentId: "m1",
    title: "Cross-industry reference permission",
    severity: "High",
    status: "restricted",
    rationale: "Three strong references exist; two remain NDA-limited to analyst briefing use only.",
  },
  {
    id: "g4",
    momentId: "m1",
    title: "Repeatable IT services operating model proof",
    severity: "Medium",
    status: "restricted",
    rationale: "Operating model narrative exists, but reusable quantified evidence is not yet cleared for analyst-facing use.",
  },
  {
    id: "g5",
    momentId: "m2",
    title: "Responsible AI operating evidence",
    severity: "Medium",
    status: "restricted",
    rationale: "Policy and governance materials exist, but operating evidence needs permissioned examples and controls proof.",
  },
];

function getVendor(vendorId?: string): VendorContext {
  return VENDORS.find((v) => v.id === (vendorId ?? "capgemini").toLowerCase()) ?? VENDORS[0];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function readinessConfidence(band: ReadinessBand): string {
  if (band === "Strong") return "High";
  if (band === "Adequate") return "Medium";
  return "Low";
}

function severityTone(severity: string, status: string): "good" | "warn" | "bad" {
  if (status === "unsupported") return "bad";
  if (severity === "High") return "bad";
  if (severity === "Medium") return "warn";
  return "good";
}

export function getBriefingDeckFilename(momentId: string, vendorId = "capgemini"): string {
  const moment = MOMENTS.find((m) => m.id === momentId) ?? MOMENTS[0];
  const vendor = getVendor(vendorId);
  return `${slugify(vendor.name)}--${slugify(moment.model)}--defence-pack.pptx`;
}

export async function createBriefingDeck(momentId: string, vendorId = "capgemini"): Promise<Buffer> {
  const moment = MOMENTS.find((m) => m.id === momentId) ?? MOMENTS[0];
  const vendor = getVendor(vendorId);
  const gaps = EVIDENCE_GAPS.filter((g) => g.momentId === moment.id);

  const deckLabel = `${moment.model} — Analyst Assessment Defence Pack`;
  const brand: Brand = {
    vendorName: vendor.name,
    vendorMark: vendor.mark,
    vendorAccent: vendor.accent,
    deckLabel,
  };

  const pptx = newDeck({
    title: `${vendor.name} ${moment.model} Analyst Assessment Defence Pack`,
    subject: `AnalystGenius AR Superhero assessment defence pack for ${vendor.name}`,
  });

  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  addCover(pptx, brand, {
    kicker: "AR / C-SUITE ONLY · EVIDENCE-GRADED",
    bigTitle: `${vendor.name} — Analyst Assessment Defence Pack`,
    subTitle: `${moment.model} · ${moment.cycle}`,
    generatedLabel: `Generated ${todayLabel()}`,
    contextRight: `Assessment owner: ${moment.owner}`,
    footNote:
      "AnalystGenius-driven readiness and evidence view. Built from AG demo data; missing fields are shown as open inputs, not inferred. No predicted rating, rank, or outcome.",
  });

  addReadinessSummary(pptx, brand, moment, gaps, idx);
  addWhyMatters(pptx, brand, moment, idx);
  addReadinessSnapshot(pptx, brand, moment, idx);
  addEvidenceGaps(pptx, brand, gaps, idx);
  addBriefingStrategy(pptx, brand, moment, idx);
  addRfiPlan(pptx, brand, moment, idx);
  addRiskRegister(pptx, brand, moment, idx);
  addProvenance(pptx, brand, idx);
  addSupport(pptx, brand, idx);

  addClosing(pptx, brand, {
    heading: "Defend the readiness, not a predicted score.",
    body:
      "This pack equips AR to lead the assessment conversation with evidence. Close the open inputs above with permissioned proof, and bring AnalystGenius in where the evidence is thin.",
    disclaimer:
      "Generated by AnalystGenius AR Superhero. Evidence-graded and confidence-labelled; demo, modelled and open-input sections are clearly marked. This is internal readiness material, not analyst research, a prediction, or a substitute for AnalystGenius expert review. © 2026 AnalystGenius.",
  });

  return deckToBuffer(pptx);
}

function addReadinessSummary(
  pptx: pptxgen,
  brand: Brand,
  moment: AnalystMoment,
  gaps: EvidenceGap[],
  idx: () => string
) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "The readiness summary",
    note: "Readiness and evidence posture for this assessment view. This defends a readiness position, not a predicted result.",
  });
  const conf = readinessConfidence(moment.readiness);
  addMetricCard(slide, { x: 0.6, y: contentTop, w: 2.9, label: "Readiness band", value: moment.readiness, caption: evidenceLabel("E2", conf) });
  addMetricCard(slide, { x: 3.65, y: contentTop, w: 2.9, label: "Evidence coverage", value: `${Math.round(moment.evidenceCoverage * 100)}%`, caption: "AG demo data" });
  addMetricCard(slide, { x: 6.7, y: contentTop, w: 2.9, label: "Open evidence gaps", value: String(gaps.length), caption: "See gaps slide" });
  addMetricCard(slide, { x: 9.75, y: contentTop, w: 2.98, label: "Posture", value: conf === "Low" ? "Build proof" : "Hold & sharpen", caption: `Status: ${moment.status}` });

  addSectionLabel(slide, "Context", { x: 0.6, y: contentTop + 1.45, w: 12 });
  addTable(slide, {
    x: 0.6,
    y: contentTop + 1.75,
    w: 12.13,
    colW: [3.0, 9.13],
    headers: ["FIELD", "VALUE"],
    rows: [
      { cells: ["Assessment view", `${moment.model} — ${moment.topic}`] },
      { cells: ["Cycle", moment.cycle] },
      { cells: ["Owner / due", `${moment.owner} · due ${moment.due}`] },
      { cells: ["RFI / briefing", `${moment.rfiState} · ${moment.briefingState}`] },
    ],
    fontSize: 10.5,
  });
}

function addWhyMatters(pptx: pptxgen, brand: Brand, moment: AnalystMoment, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "Why this assessment matters, and why now",
    note: "Internal impact for AR, sales, leadership, delivery and marketing — and the timing pressure this cycle.",
  });
  addSectionLabel(slide, "Why it matters internally", { x: 0.6, y: contentTop, w: 6, color: PALETTE.gold });
  addBulletList(
    slide,
    [
      "AR: anchors the analyst narrative for the next briefing cycle.",
      "Sales: positioning feeds active pursuits citing analyst visibility.",
      "Leadership: concentration and evidence risk need a decision.",
      "Delivery: operating-model proof is the strongest available lever.",
      "Marketing: internal narrative must stay aligned and NDA-safe.",
    ],
    { x: 0.6, y: contentTop + 0.32, w: 5.9, h: 4.4, fontSize: 11.5 }
  );
  addSectionLabel(slide, "Why now", { x: 6.8, y: contentTop, w: 6, color: PALETTE.gold });
  addBulletList(
    slide,
    [
      `Cycle timing: ${moment.cycle}, due ${moment.due}.`,
      `RFI is ${moment.rfiState.toLowerCase()} and the briefing is ${moment.briefingState.toLowerCase()}.`,
      "The evaluation narrative is moving; evidence risk grows the longer gaps stay open.",
      moment.exposure,
    ],
    { x: 6.8, y: contentTop + 0.32, w: 5.93, h: 4.4, fontSize: 11.5 }
  );
}

function addReadinessSnapshot(pptx: pptxgen, brand: Brand, moment: AnalystMoment, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "Assessment readiness snapshot",
    note: "Readiness by criterion, with the current evidence state. No criterion is scored or predicted.",
  });
  const rows = [
    { cells: ["Delivery scale & client outcomes", "Adequate", "AG demo signals present; quantify repeatability."], tone: "warn" as const },
    { cells: ["Named references", "Restricted", "Strong examples exist; approval-limited for reuse."], tone: "warn" as const },
    { cells: ["Operating model repeatability", "Weak", "Narrative exists; quantified proof not yet cleared."], tone: "bad" as const },
    { cells: ["Innovation / roadmap proof", "Input needed", "Requires user evidence before client-ready use."], tone: "warn" as const },
  ];
  addTable(slide, {
    x: 0.6,
    y: contentTop,
    w: 12.13,
    colW: [4.6, 2.5, 5.03],
    headers: ["CRITERION", "READINESS", "EVIDENCE STATE"],
    rows,
    fontSize: 10.5,
  });
  slide.addText(
    "Readiness reflects current AG demo evidence only. Where a criterion is marked 'Input needed', supply permissioned proof rather than asserting a position.",
    { x: 0.6, y: contentTop + 2.9, w: 12.13, h: 0.5, fontFace: "Arial", fontSize: 10.5, italic: true, color: PALETTE.slate, margin: 0, fit: "shrink" }
  );
}

function addEvidenceGaps(pptx: pptxgen, brand: Brand, gaps: EvidenceGap[], idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "Evidence gaps and required actions",
    note: "Each gap carries a severity, current evidence state, owner and next action. Unsupported items must not be claimed.",
  });
  const owners = ["AR + Commercial", "AR", "Delivery + AR", "AR + Compliance"];
  const actions = [
    "Run a disclosure motion for two named outcomes.",
    "Confirm reuse permission; mark NDA-only references.",
    "Clear quantified operating-model evidence for analyst use.",
    "Assemble responsible-AI operating evidence pack.",
  ];
  const rows = gaps.length
    ? gaps.map((g, i) => ({
        cells: [g.title, g.severity, g.status, owners[i % owners.length], actions[i % actions.length]],
        tone: severityTone(g.severity, g.status),
      }))
    : [{ cells: ["No open evidence gaps captured", "—", "—", "—", "Confirm none are hidden outside the platform."], tone: "good" as const }];
  addTable(slide, {
    x: 0.6,
    y: contentTop,
    w: 12.13,
    colW: [3.5, 1.2, 1.7, 2.2, 3.53],
    headers: ["GAP", "SEVERITY", "EVIDENCE STATE", "OWNER", "NEXT ACTION"],
    rows,
    fontSize: 9.5,
    headerFontSize: 9,
  });
}

function addBriefingStrategy(pptx: pptxgen, brand: Brand, moment: AnalystMoment, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "Analyst briefing strategy",
    note: "NDA vs no-NDA split, likely analyst questions, and the proof to bring. No claims beyond cleared evidence.",
  });
  addSectionLabel(slide, "Approved (incl. under NDA)", { x: 0.6, y: contentTop, w: 6, color: PALETTE.good });
  addBulletList(
    slide,
    [
      "Marketing-approved client outcomes (named, current).",
      "Analyst-cleared delivery outcomes.",
      "Country-level delivery scale figures.",
    ],
    { x: 0.6, y: contentTop + 0.3, w: 5.9, h: 1.8, fontSize: 11 }
  );
  addSectionLabel(slide, "Requires no-NDA / do not claim", { x: 6.8, y: contentTop, w: 6, color: PALETTE.bad });
  addBulletList(
    slide,
    [
      "Production-grade AI tooling claims (currently unsupported).",
      "NDA-only references in non-NDA settings.",
      "Ecosystem-leadership claims without documented proof.",
    ],
    { x: 6.8, y: contentTop + 0.3, w: 5.93, h: 1.8, fontSize: 11 }
  );
  addSectionLabel(slide, "Likely analyst questions & proof to bring", { x: 0.6, y: contentTop + 2.3, w: 12 });
  addTable(slide, {
    x: 0.6,
    y: contentTop + 2.6,
    w: 12.13,
    colW: [6.6, 5.53],
    headers: ["LIKELY QUESTION", "PROOF TO BRING"],
    rows: [
      { cells: ["How does this repeat across regions and service lines?", "Quantified operating-model evidence (once cleared)."] },
      { cells: ["Where is production-grade AI proof, not pilots?", "Named production outcomes (open input)."] },
      { cells: ["What governance backs the AI claims?", "Responsible-AI operating evidence pack (open input)."] },
    ],
    fontSize: 10,
  });
}

function addRfiPlan(pptx: pptxgen, brand: Brand, moment: AnalystMoment, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "RFI response plan",
    note: "Section ownership, status, input needed, and evidence classification for the RFI response.",
  });
  addTable(slide, {
    x: 0.6,
    y: contentTop,
    w: 12.13,
    colW: [3.2, 2.0, 4.43, 2.5],
    headers: ["SECTION", "STATUS", "INPUT NEEDED", "EVIDENCE CLASS"],
    rows: [
      { cells: ["Delivery scale & outcomes", "In review", "Confirm quantified repeatability evidence.", "AG demo / restricted"], tone: "warn" },
      { cells: ["References", "Draft", "Permission state for two NDA-limited refs.", "Restricted"], tone: "warn" },
      { cells: ["AI readiness", "Draft", "Named production outcomes; governance proof.", "Unsupported / open"], tone: "bad" },
      { cells: ["Sustainability / trust", "Not started", "Supply current commitments and evidence.", "Input needed"], tone: "warn" },
    ],
    fontSize: 9.5,
    headerFontSize: 9,
  });
  slide.addText(`Owner: ${moment.owner} · RFI state: ${moment.rfiState} · Due ${moment.due}.`, {
    x: 0.6,
    y: contentTop + 2.7,
    w: 12.13,
    h: 0.35,
    fontFace: "Arial",
    fontSize: 11,
    color: PALETTE.slate,
    margin: 0,
    fit: "shrink",
  });
}

function addRiskRegister(pptx: pptxgen, brand: Brand, moment: AnalystMoment, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "Risk register and controls",
    note: "Directional risk framing and the controls that keep evidence reuse safe. Not a probability or outcome prediction.",
  });
  addSectionLabel(slide, "Risk register", { x: 0.6, y: contentTop, w: 12 });
  addTable(slide, {
    x: 0.6,
    y: contentTop + 0.3,
    w: 12.13,
    colW: [4.4, 1.6, 4.33, 1.8],
    headers: ["RISK", "SEVERITY", "MITIGATION", "OWNER"],
    rows: [
      { cells: ["Unsupported AI claim challenged in briefing", "High", "Keep AI tooling briefing-only until disclosure clears.", "Product + AR"], tone: "bad" },
      { cells: ["Reference concentration across moments", "Medium", "Diversify and rotate references deliberately.", "Commercial + AR"], tone: "warn" },
      { cells: ["NDA-only material reused externally", "Medium", "Mark reuse state on every proof item.", "Marketing + AR"], tone: "warn" },
    ],
    fontSize: 9.5,
    headerFontSize: 9,
  });
  const cY = contentTop + 0.3 + 0.42 * 4 + 0.3;
  addSectionLabel(slide, "Controls & governance", { x: 0.6, y: cY, w: 12 });
  addTable(slide, {
    x: 0.6,
    y: cY + 0.3,
    w: 12.13,
    colW: [6.6, 3.53, 2.0],
    headers: ["CONTROL", "DESCRIPTION", "STATUS"],
    rows: [
      { cells: ["Evidence reuse classification", "Every proof item carries Safe / Restricted / Unsupported.", "In place"], tone: "good" },
      { cells: ["NDA control on analyst quotes", "NDA-only material flagged and blocked from external reuse.", "In place"], tone: "good" },
      { cells: ["AnalystGenius validation gate", "Cross-client learning gated on AG researcher validation.", "Recommended"], tone: "default" },
    ],
    fontSize: 9.5,
    headerFontSize: 9,
  });
}

function addProvenance(pptx: pptxgen, brand: Brand, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "Assumptions, open inputs and provenance",
    note: "Where the content comes from. Estimated, demo and open-input sections are marked — nothing here is audited fact.",
  });
  addTable(slide, {
    x: 0.6,
    y: contentTop,
    w: 12.13,
    colW: [4.6, 7.53],
    headers: ["SECTION", "BASIS"],
    rows: [
      { cells: ["Readiness band, coverage, gaps", "AG DEMO DATA — derived from the AnalystGenius Succeed model for the demo customer."], tone: "default" },
      { cells: ["Readiness snapshot by criterion", "AG DEMO DATA — current demo evidence states; revalidate per assessment."], tone: "default" },
      { cells: ["Briefing strategy, RFI plan", "AG DEMO DATA + TEMPLATE — illustrative ownership and structure; confirm before submission."], tone: "default" },
      { cells: ["Risk register", "MODELLED / TEMPLATE — directional risk framing, not a probability or outcome prediction."], tone: "warn" },
      { cells: ["Open inputs", "MISSING INPUTS — fields requiring user uploads or AnalystGenius evidence before client-ready use."], tone: "warn" },
    ],
    fontSize: 10,
    headerFontSize: 9.5,
  });
}

function addSupport(pptx: pptxgen, brand: Brand, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "AnalystGenius expert support",
    note: "Point-of-need support — bring AG analysts in where evidence is thin or the assessment is high-stakes.",
  });
  addBulletList(
    slide,
    [
      "Open a readiness session to close the highest-severity evidence gaps in this pack.",
      "Ask AnalystGenius to validate Restricted / Unsupported proof before client-facing reuse.",
      "Use AG analysts to rehearse the briefing and pressure-test likely analyst questions.",
      "Bring AG in to convert modelled risk framing into evidence-backed positioning.",
    ],
    { x: 0.6, y: contentTop, w: 12.13, h: 3.6, fontSize: 13 }
  );
}
