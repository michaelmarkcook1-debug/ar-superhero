import type pptxgen from "pptxgenjs";
import {
  newDeck,
  deckToBuffer,
  addCover,
  addClosing,
  addCeoBioSlide,
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
// Direct tab — persona analyst-influence briefing packs.
//
// These are AnalystGenius-driven persona briefing packs that translate AG
// (demo) data into what each internal AR stakeholder needs to know and do.
// They are NOT generic stakeholder templates: every "what they need to know"
// line is sourced from the AG persona model below, and missing AG fields are
// surfaced as structured "input needed" rows rather than invented content.
//
// Data here is a server-side, demo-safe copy of the Direct persona model,
// authored for the demo customer Capgemini. No outcome/likelihood prediction.
// ============================================================================

export type PersonaId =
  | "executive"
  | "strategy"
  | "product"
  | "marketing"
  | "commercial"
  | "delivery"
  | "regional";

type ProofRow = {
  asset: string;
  why: string;
  state: "Safe" | "Restricted" | "Unsupported" | "Input needed";
  owner: string;
};

type RiskRow = { risk: string; mitigation: string; owner: string };

type Persona = {
  id: PersonaId;
  label: string;
  stakeholder: string;
  whyMatters: string;
  objective: string;
  evidenceConfidence: string; // qualitative, no outcome prediction
  evidenceGrade: "E1" | "E2" | "E3";
  posture: string;
  knows: string[]; // AG-derived implications
  doNext: { action: string; owner: string; timing: string }[];
  proof: ProofRow[];
  guardrails: { approved: string[]; avoid: string[] };
  enablement: string[]; // sales / internal enablement angle
  risks: RiskRow[];
  openInputs: string[]; // structured AG fields needing user evidence
};

// Demo customer for the prototype.
const DEMO_CUSTOMER = "Capgemini";

const PERSONAS: Persona[] = [
  {
    id: "executive",
    label: "Executive",
    stakeholder: "CEO · COO · CSO",
    whyMatters:
      "Executive sponsorship sets the analyst-visible priorities and unblocks the decisions only leadership can make this cycle.",
    objective:
      "Secure two go/no-go decisions and one investment approval so AR can lock the next four weeks of analyst engagement.",
    evidenceConfidence: "Medium",
    evidenceGrade: "E2",
    posture: "Decision-seeking — bring two decisions and one approval, not a status read-out.",
    knows: [
      "Portfolio status: six active analyst moments, one submitted, none declined.",
      "Concentration risk: two reference clients underpin three active moments.",
      "Investment ask: one AnalystGenius readiness session this sprint.",
    ],
    doNext: [
      { action: "Confirm whether the cross-ecosystem assessment is in or deferred this cycle.", owner: "CSO", timing: "This week" },
      { action: "Approve redirecting one reference client to the at-risk submission.", owner: "COO", timing: "This week" },
      { action: "Sponsor the cross-business analyst narrative workshop.", owner: "CEO", timing: "Next sprint" },
    ],
    proof: [
      { asset: "Named cross-industry references (disclosure-ready)", why: "Underpins three active moments; reduces concentration risk.", state: "Restricted", owner: "AR + Commercial" },
      { asset: "Executive POV on category direction", why: "Anchors the analyst-visible strategy.", state: "Input needed", owner: "Strategy Office" },
      { asset: "Investment sign-off for readiness session", why: "Unblocks the weakest assessment view.", state: "Input needed", owner: "Executive" },
    ],
    guardrails: {
      approved: ["Portfolio-level readiness and concentration risk (internal).", "Investment ask framed as readiness, not outcome."],
      avoid: ["Any predicted rating or rank.", "Naming NDA-only references in non-NDA settings."],
    },
    enablement: [
      "A confident executive narrative gives sales leadership air-cover to lead with analyst-grade positioning.",
      "Clear leadership decisions let AR move from reactive to proactive analyst engagement.",
    ],
    risks: [
      { risk: "Evaluation criterion on AI-assisted delivery is underexposed.", mitigation: "Approve a focused proof motion before the next briefing.", owner: "Product + AR" },
      { risk: "Two references carry three moments (concentration).", mitigation: "Diversify references; sequence reuse deliberately.", owner: "Commercial + AR" },
    ],
    openInputs: [
      "Executive point of view on the FY priority categories.",
      "Confirmed budget line for the AnalystGenius readiness session.",
      "Decision on the cross-ecosystem assessment disposition.",
    ],
  },
  {
    id: "strategy",
    label: "Strategy",
    stakeholder: "Chief Strategy Officer · Strategy Office",
    whyMatters:
      "Strategy owns the narratives analysts evaluate against; misalignment here cascades into every submission.",
    objective: "Lock the analyst-visible strategy and anchor narratives for the next four weeks.",
    evidenceConfidence: "Medium",
    evidenceGrade: "E2",
    posture: "Alignment-seeking — confirm anchor narratives so submissions can lock language.",
    knows: [
      "Sequencing the anchor assessment first supports three downstream RFIs.",
      "The AI-operations point of view must be re-stated before two overlapping submission windows.",
      "The cross-ecosystem assessment exposes a cross-business-unit gap.",
    ],
    doNext: [
      { action: "Confirm the anchor narratives so analyst submissions can lock language.", owner: "CSO", timing: "This week" },
      { action: "Sponsor a one-pager on the cross-business operating model.", owner: "Strategy Office", timing: "2 weeks" },
    ],
    proof: [
      { asset: "Confirmed anchor narratives", why: "Lets all submissions use consistent language.", state: "Input needed", owner: "Strategy Office" },
      { asset: "Cross-business operating model one-pager", why: "Required for cross-ecosystem readiness; reusable across moments.", state: "Input needed", owner: "Strategy + AR" },
    ],
    guardrails: {
      approved: ["Internal narrative direction and sequencing.", "Category-weight observations from AG signals."],
      avoid: ["Stating analyst rankings as decided.", "Externalising internal-only narratives."],
    },
    enablement: [
      "A locked analyst-visible strategy gives every other persona a consistent story to reuse.",
      "Anchor narratives shorten AR turnaround on new RFIs.",
    ],
    risks: [
      { risk: "FY strategy and analyst-visible strategy diverge on AI operations.", mitigation: "Re-state the AI-operations POV before overlapping windows.", owner: "Strategy + AR" },
    ],
    openInputs: [
      "Signed-off list of FY anchor narratives.",
      "Cross-business-unit operating model evidence.",
    ],
  },
  {
    id: "product",
    label: "Product",
    stakeholder: "Product / Service Line Leaders",
    whyMatters:
      "Product owns the capability evidence analysts probe hardest; gaps here are the most common reason submissions stall.",
    objective: "Get a service-line decision on three capability/evidence gaps. No roadmap recommendation is made here.",
    evidenceConfidence: "Low",
    evidenceGrade: "E2",
    posture: "Decision-seeking — capability gaps need a service-line owner and a date.",
    knows: [
      "AI-assisted developer co-pilot proof exists as pilots only.",
      "Multi-tier partner delivery has minimal documented client outcomes.",
      "Platform-engineering outcome metrics still need confirmation.",
    ],
    doNext: [
      { action: "Approve the AI co-pilot disclosure motion for two references.", owner: "Service Line Lead", timing: "This week" },
      { action: "Document the partner-led delivery model as a stand-alone capability.", owner: "Product", timing: "2 weeks" },
      { action: "Schedule a readiness session with AnalystGenius on the cross-ecosystem view.", owner: "Product + AR", timing: "Next sprint" },
    ],
    proof: [
      { asset: "Two named AI co-pilot client outcomes", why: "Closes the most-probed evaluation criterion.", state: "Unsupported", owner: "Product + Commercial" },
      { asset: "Partner-led delivery model write-up", why: "Converts an internal capability into analyst-usable proof.", state: "Restricted", owner: "Product" },
      { asset: "Platform-engineering outcome metrics", why: "Confirms a trending-well pilot story.", state: "Input needed", owner: "Service Line Lead" },
    ],
    guardrails: {
      approved: ["Pilot-stage framing of AI co-pilot work.", "Capability descriptions without unproven outcome claims."],
      avoid: ["Claiming production-grade AI tooling before disclosure clears.", "Multi-tier ecosystem leadership claims without proof."],
    },
    enablement: [
      "Cleared capability proof becomes reusable across sales pursuits and analyst briefings.",
      "A documented delivery model gives Commercial a concrete differentiator.",
    ],
    risks: [
      { risk: "AI-assisted dev tooling criterion is currently unsupported.", mitigation: "Run the disclosure motion; keep briefing-only until cleared.", owner: "Product + AR" },
    ],
    openInputs: [
      "Disclosure-ready AI co-pilot outcomes (two named).",
      "Permission to document the partner-led delivery model.",
      "Confirmed platform-engineering KPIs.",
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    stakeholder: "Marketing / Communications",
    whyMatters:
      "Marketing controls how analyst-grade language is reused internally; mishandled, NDA-only material leaks into campaigns.",
    objective: "Refresh two internal assets so analyst narratives are used correctly — internal guidance only, not external campaigns.",
    evidenceConfidence: "Medium",
    evidenceGrade: "E2",
    posture: "Guidance — internal sales-enablement and briefing materials only.",
    knows: [
      "Application-modernisation inquiries are trending up in the demo customer's category.",
      "The AI co-pilot collateral is too sales-led for analyst use.",
      "NDA-only quotes cannot be externalised.",
    ],
    doNext: [
      { action: "Sharpen the internal application-modernisation narrative one-pager.", owner: "Marketing", timing: "This week" },
      { action: "Reposition the AI co-pilot deck for analyst audiences (not buyers).", owner: "Marketing + AR", timing: "2 weeks" },
    ],
    proof: [
      { asset: "Application-modernisation internal one-pager", why: "Open narrative window; keeps internal messaging consistent.", state: "Input needed", owner: "Marketing" },
      { asset: "Analyst-version AI co-pilot deck", why: "Removes buyer-led framing analysts discount.", state: "Restricted", owner: "Marketing + AR" },
    ],
    guardrails: {
      approved: ["Internal narrative guidance for AR briefings.", "Category-trend framing from AG signals."],
      avoid: ["Externalising NDA-only quotes.", "Publishing analyst positioning as external campaign copy."],
    },
    enablement: [
      "Analyst-aligned internal messaging keeps sales, AR and comms telling one story.",
      "A tighter narrative library speeds up briefing prep across personas.",
    ],
    risks: [
      { risk: "NDA-only quotes leaking into campaign drafts.", mitigation: "Run a quote-use policy refresher for marketing managers.", owner: "Marketing" },
    ],
    openInputs: [
      "Approved internal application-modernisation narrative.",
      "Analyst-audience version of the AI co-pilot deck.",
    ],
  },
  {
    id: "commercial",
    label: "Commercial",
    stakeholder: "Sales / Pursuit Leaders",
    whyMatters:
      "Commercial decides how analyst positioning shows up in the sales motion; this is where AR intelligence converts to pipeline credibility.",
    objective: "Enable two active pursuits with analyst-grade, reuse-safe proof. Focus is the sales motion, not deal-room intelligence.",
    evidenceConfidence: "Medium",
    evidenceGrade: "E2",
    posture: "Enablement — equip pursuits with reuse-safe proof and clear do-not-use lines.",
    knows: [
      "Banking sales leaders need a short brief on current analyst visibility.",
      "Two named pursuits are anchored on analyst positioning.",
      "NDA-only analyst quotes cannot be used in commercial conversations.",
    ],
    doNext: [
      { action: "Approve the analyst-visibility two-pager and route to sales leadership.", owner: "Commercial", timing: "This week" },
      { action: "Confirm three proof items as sales-safe for the banking pursuit.", owner: "Commercial + AR", timing: "This week" },
    ],
    proof: [
      { asset: "Analyst-visibility two-pager", why: "Gives sellers a credible, reuse-safe positioning aid.", state: "Restricted", owner: "AR" },
      { asset: "Three sales-safe proof items", why: "Anchors the named pursuit in defensible evidence.", state: "Input needed", owner: "Commercial + AR" },
    ],
    guardrails: {
      approved: ["Safe, marketing-approved client outcomes.", "Public analyst-visibility framing."],
      avoid: ["Reusing NDA-only quotes in deal collateral.", "Unsupported production claims in pursuit decks."],
    },
    enablement: [
      "Analyst-grade enablement raises win-theme credibility in regulated-industry pursuits.",
      "Clear reuse rules let sellers move fast without compliance risk.",
    ],
    risks: [
      { risk: "Pursuit teams reusing NDA-only quotes in collateral.", mitigation: "Mark reuse state on every proof item; brief the pursuit team.", owner: "Commercial + AR" },
    ],
    openInputs: [
      "Confirmed list of sales-safe proof items.",
      "Pursuit-team briefing date.",
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    stakeholder: "Delivery / Operations Leaders",
    whyMatters:
      "Delivery-side proof — operating model, partner integration, AI-assisted ops — is the strongest analyst lever this cycle.",
    objective: "Formalise two operational assets for analyst use and sponsor one delivery-led briefing.",
    evidenceConfidence: "Medium",
    evidenceGrade: "E2",
    posture: "Packaging — turn strong-but-informal delivery proof into analyst-ready assets.",
    knows: [
      "AI-assisted operations evidence is weighing heavier this assessment cycle.",
      "Two delivery outcomes are documented and analyst-cleared.",
      "The partner-led delivery model is documented but not yet packaged.",
    ],
    doNext: [
      { action: "Package the partner-led delivery model for analyst briefings.", owner: "Delivery", timing: "2 weeks" },
      { action: "Sponsor one delivery-led analyst briefing before submission.", owner: "Delivery + AR", timing: "Next sprint" },
    ],
    proof: [
      { asset: "Two cleared delivery outcomes", why: "Strongest current analyst-ready proof.", state: "Safe", owner: "Delivery" },
      { asset: "Packaged partner-led delivery model", why: "Converts internal proof into a briefing asset.", state: "Restricted", owner: "Delivery + AR" },
    ],
    guardrails: {
      approved: ["Analyst-cleared delivery outcomes.", "Operating-model narrative with documented evidence."],
      avoid: ["Over-claiming ecosystem breadth beyond documented partners.", "Using uncleared delivery metrics."],
    },
    enablement: [
      "Packaged delivery proof differentiates pursuits on execution credibility.",
      "A delivery-led briefing diversifies the reference base AR can draw on.",
    ],
    risks: [
      { risk: "Concentration on two reference clients.", mitigation: "Confirm a reference-diversification plan.", owner: "Delivery + Commercial" },
    ],
    openInputs: [
      "Packaged partner-led delivery model artefact.",
      "Confirmed delivery-led briefing slot.",
    ],
  },
  {
    id: "regional",
    label: "Regional",
    stakeholder: "Regional / Country Leaders",
    whyMatters:
      "Regional leaders own reference availability and coverage balance; the analyst load is unevenly distributed this cycle.",
    objective: "Make two coverage decisions: reference rotation and where to invest analyst coverage this half.",
    evidenceConfidence: "Medium",
    evidenceGrade: "E2",
    posture: "Decision-seeking — rotate references and decide coverage investment.",
    knows: [
      "EMEA and North America carry the heaviest analyst-visible load this cycle.",
      "North America has two pursuits anchored on analyst positioning.",
      "APAC analyst coverage is light against rising APAC pipeline.",
    ],
    doNext: [
      { action: "Confirm EMEA reference availability windows.", owner: "EMEA Lead", timing: "This week" },
      { action: "Decide whether to invest in APAC analyst coverage this half.", owner: "APAC Lead", timing: "This month" },
    ],
    proof: [
      { asset: "EMEA reference rotation plan", why: "Reduces reuse strain across three moments.", state: "Input needed", owner: "EMEA Lead" },
      { asset: "APAC coverage decision", why: "Aligns analyst coverage with pipeline.", state: "Input needed", owner: "APAC Lead" },
    ],
    guardrails: {
      approved: ["Region-level coverage and reference observations.", "Pipeline-vs-coverage framing."],
      avoid: ["Committing references without availability confirmation.", "Predicting regional rankings."],
    },
    enablement: [
      "Balanced coverage means pursuits in every region can cite analyst positioning.",
      "Reference rotation protects the most-used clients from briefing fatigue.",
    ],
    risks: [
      { risk: "EMEA reference reuse across three moments.", mitigation: "Activate the rotation plan; stagger reference use.", owner: "EMEA Lead + AR" },
    ],
    openInputs: [
      "EMEA reference availability windows.",
      "APAC analyst coverage investment decision.",
    ],
  },
];

const VENDOR_BRANDS: Record<string, { name: string; mark: string; accent: string }> = {
  capgemini: { name: "Capgemini", mark: "C", accent: "0070AD" },
  cognizant: { name: "Cognizant", mark: "C", accent: "1F70C1" },
  accenture: { name: "Accenture", mark: "A", accent: "A100FF" },
  ibm: { name: "IBM", mark: "IBM", accent: "0F62FE" },
};

function resolveBrand(vendorId: string | undefined, deckLabel: string): Brand {
  const v = VENDOR_BRANDS[(vendorId ?? "capgemini").toLowerCase()] ?? VENDOR_BRANDS.capgemini;
  return { vendorName: v.name, vendorMark: v.mark, vendorAccent: v.accent, deckLabel };
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toneForState(state: ProofRow["state"]): "good" | "warn" | "bad" | "default" {
  if (state === "Safe") return "good";
  if (state === "Restricted") return "warn";
  if (state === "Unsupported") return "bad";
  return "warn"; // Input needed
}

export function getDirectPersonaDeckFilename(personaIds: PersonaId[], vendorId = "capgemini"): string {
  const v = VENDOR_BRANDS[(vendorId ?? "capgemini").toLowerCase()] ?? VENDOR_BRANDS.capgemini;
  const personaPart = personaIds.length === 1 ? slugify(personaById(personaIds[0]).label) : "multi-persona";
  return `${slugify(v.name)}--${personaPart}--analyst-influence-briefing.pptx`;
}

function personaById(id: PersonaId): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

export function listDirectPersonaIds(): PersonaId[] {
  return PERSONAS.map((p) => p.id);
}

// ---------------------------------------------------------------------------
// Deck assembly
// ---------------------------------------------------------------------------

export async function createDirectPersonaDeck(
  personaIds: PersonaId[],
  vendorId = "capgemini"
): Promise<Buffer> {
  const ids = personaIds.length ? personaIds : ["executive" as PersonaId];
  const personas = ids.map(personaById);
  const multi = personas.length > 1;
  const deckLabel = multi ? "Analyst Influence Briefing" : `${personas[0].label} — Analyst Influence Briefing`;
  const brand = resolveBrand(vendorId, deckLabel);

  const pptx = newDeck({
    title: `${brand.vendorName} ${deckLabel}`,
    subject: `AnalystGenius AR Superhero persona briefing pack for ${brand.vendorName}`,
  });

  let n = 0;
  const idx = () => String(++n).padStart(2, "0");

  addCover(pptx, brand, {
    kicker: "AR INTERNAL · EVIDENCE-GRADED",
    bigTitle: multi
      ? `${brand.vendorName} — Analyst Influence Briefing`
      : `${brand.vendorName} — ${personas[0].label} Analyst Influence Briefing`,
    subTitle: multi
      ? `Combined persona pack · ${personas.map((p) => p.label).join(" · ")}`
      : `${personas[0].stakeholder}`,
    generatedLabel: `Generated ${todayLabel()}`,
    contextRight: `Demo customer: ${DEMO_CUSTOMER}`,
    footNote:
      "AnalystGenius-driven persona briefing pack. Built from AG demo data; missing AG fields are shown as open inputs, not inferred. No outcome or ranking prediction.",
  });

  // Combined contents slide for multi-persona packs.
  if (multi) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: "Persona pack contents",
      note: "One section per stakeholder persona. Each section follows the same evidence-graded structure.",
    });
    addTable(slide, {
      x: 0.6,
      y: contentTop,
      w: 12.13,
      colW: [3.2, 3.4, 5.53],
      headers: ["PERSONA", "STAKEHOLDER", "AR OBJECTIVE"],
      rows: personas.map((p) => ({ cells: [p.label, p.stakeholder, p.objective] })),
      fontSize: 10.5,
    });
  }

  for (const persona of personas) {
    addPersonaSection(pptx, brand, persona, idx);
  }

  addProvenanceSlide(pptx, brand, idx, personas);
  addSupportSlide(pptx, brand, idx);

  addClosing(pptx, brand, {
    heading: "AnalystGenius is with you at the point of need.",
    body:
      "This pack turns AnalystGenius intelligence into persona-ready actions so AR can lead the analyst agenda internally. Open inputs above are where AG analysts and your evidence make the biggest difference next.",
    disclaimer:
      "Generated by AnalystGenius AR Superhero. Evidence-graded and confidence-labelled; demo, modelled and open-input sections are clearly marked. This is internal enablement material, not analyst research, a prediction, or a substitute for AnalystGenius expert review. © 2026 AnalystGenius.",
  });

  addCeoBioSlide(pptx);

  return deckToBuffer(pptx);
}

function addPersonaSection(pptx: pptxgen, brand: Brand, p: Persona, idx: () => string) {
  // 1. Briefing summary.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: `${p.label} — briefing summary`,
      note: "AG-data briefing summary. Why this stakeholder matters, the AR objective, and the evidence posture.",
    });
    addMetricCard(slide, { x: 0.6, y: contentTop, w: 3.0, label: "Evidence confidence", value: p.evidenceConfidence, caption: evidenceLabel(p.evidenceGrade, p.evidenceConfidence) });
    addMetricCard(slide, { x: 3.75, y: contentTop, w: 3.0, label: "Stakeholder", value: p.label, caption: p.stakeholder });
    addMetricCard(slide, { x: 6.9, y: contentTop, w: 5.83, label: "Action posture", value: " ", caption: " " });
    slide.addText(p.posture, {
      x: 7.08,
      y: contentTop + 0.4,
      w: 5.5,
      h: 0.7,
      fontFace: "Arial",
      fontSize: 11.5,
      color: PALETTE.ink,
      margin: 0,
      valign: "top",
      fit: "shrink",
    });
    addSectionLabel(slide, "Why this stakeholder matters", { x: 0.6, y: contentTop + 1.45, w: 12 });
    slide.addText(p.whyMatters, {
      x: 0.6,
      y: contentTop + 1.74,
      w: 12.13,
      h: 0.7,
      fontFace: "Arial",
      fontSize: 12.5,
      color: PALETTE.ink,
      margin: 0,
      valign: "top",
      fit: "shrink",
    });
    addSectionLabel(slide, "Current AR objective", { x: 0.6, y: contentTop + 2.6, w: 12 });
    slide.addText(p.objective, {
      x: 0.6,
      y: contentTop + 2.89,
      w: 12.13,
      h: 0.7,
      fontFace: "Arial",
      fontSize: 12.5,
      color: PALETTE.ink,
      margin: 0,
      valign: "top",
      fit: "shrink",
    });
  }

  // 2. What this persona needs to know + what to do next.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: `${p.label} — what to know and do`,
      note: "Left: what AG data says this persona needs to know. Right: role-specific next actions, owners and timing.",
    });
    addSectionLabel(slide, "What AG data says you need to know", { x: 0.6, y: contentTop, w: 6, color: PALETTE.gold });
    addBulletList(slide, p.knows, { x: 0.6, y: contentTop + 0.32, w: 5.9, h: 4.6, fontSize: 12 });

    addSectionLabel(slide, "What to do next", { x: 6.8, y: contentTop, w: 6, color: PALETTE.gold });
    addTable(slide, {
      x: 6.8,
      y: contentTop + 0.32,
      w: 5.93,
      colW: [3.43, 1.4, 1.1],
      headers: ["ACTION", "OWNER", "TIMING"],
      rows: p.doNext.map((d) => ({ cells: [d.action, d.owner, d.timing] })),
      fontSize: 9.5,
      headerFontSize: 9,
    });
  }

  // 3. Proof needed + guardrails.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: `${p.label} — proof needed and message guardrails`,
      note: "Proof/evidence required from this persona, and the analyst-facing message guardrails (NDA vs no-NDA).",
    });
    addSectionLabel(slide, "Proof / evidence needed from this persona", { x: 0.6, y: contentTop, w: 12 });
    addTable(slide, {
      x: 0.6,
      y: contentTop + 0.3,
      w: 12.13,
      colW: [3.8, 4.6, 1.93, 1.8],
      headers: ["ASSET / EVIDENCE", "WHY IT MATTERS", "STATE", "OWNER"],
      rows: p.proof.map((r) => ({ cells: [r.asset, r.why, r.state, r.owner], tone: toneForState(r.state) })),
      fontSize: 9.5,
      headerFontSize: 9,
    });
    const guardY = contentTop + 0.3 + 0.42 * (p.proof.length + 1) + 0.35;
    addSectionLabel(slide, "Approved (incl. under NDA)", { x: 0.6, y: guardY, w: 6, color: PALETTE.good });
    addBulletList(slide, p.guardrails.approved, { x: 0.6, y: guardY + 0.28, w: 5.9, h: 1.4, fontSize: 10.5 });
    addSectionLabel(slide, "Claims to avoid", { x: 6.8, y: guardY, w: 6, color: PALETTE.bad });
    addBulletList(slide, p.guardrails.avoid, { x: 6.8, y: guardY + 0.28, w: 5.93, h: 1.4, fontSize: 10.5 });
  }

  // 4. Enablement + risks + open inputs.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      title: `${p.label} — enablement, risks and open inputs`,
      note: "How AG/AR intelligence helps internally, the risks and mitigations, and the AG inputs still needed.",
    });
    addSectionLabel(slide, "Sales / internal enablement angle", { x: 0.6, y: contentTop, w: 12, color: PALETTE.gold });
    addBulletList(slide, p.enablement, { x: 0.6, y: contentTop + 0.3, w: 12.13, h: 1.0, fontSize: 11.5 });

    const riskY = contentTop + 1.4;
    addSectionLabel(slide, "Risks and mitigations", { x: 0.6, y: riskY, w: 12 });
    addTable(slide, {
      x: 0.6,
      y: riskY + 0.3,
      w: 12.13,
      colW: [4.4, 5.93, 1.8],
      headers: ["RISK", "MITIGATION", "OWNER"],
      rows: p.risks.map((r) => ({ cells: [r.risk, r.mitigation, r.owner], tone: "warn" as const })),
      fontSize: 9.5,
      headerFontSize: 9,
    });
    const openY = riskY + 0.3 + 0.42 * (p.risks.length + 1) + 0.5;
    addSectionLabel(slide, "Open AG inputs needed", { x: 0.6, y: openY, w: 12, color: PALETTE.warn });
    addBulletList(slide, p.openInputs, { x: 0.6, y: openY + 0.28, w: 12.13, h: 1.2, fontSize: 11 });
  }
}

function addProvenanceSlide(pptx: pptxgen, brand: Brand, idx: () => string, personas: Persona[]) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "Data basis and provenance",
    note: "Every section is labelled by source. Estimated, demo and open-input content is marked — nothing here is audited fact.",
  });
  addTable(slide, {
    x: 0.6,
    y: contentTop,
    w: 12.13,
    colW: [4.6, 7.53],
    headers: ["SECTION", "BASIS"],
    rows: [
      { cells: ["Persona model, what-to-know, objectives", "AG DEMO DATA — derived from the AnalystGenius Direct persona model for the demo customer."], tone: "default" },
      { cells: ["Next actions, owners, timing", "AG DEMO DATA + TEMPLATE — illustrative owners/timing; confirm with named leaders before use."], tone: "default" },
      { cells: ["Proof / evidence states", "AG DEMO DATA — Safe / Restricted / Unsupported reflect demo reuse states; revalidate per client."], tone: "default" },
      { cells: ["Risks and mitigations", "MODELLED / TEMPLATE — directional risk framing, not a probability or outcome prediction."], tone: "warn" },
      { cells: ["Open inputs", "MISSING INPUTS — fields requiring user uploads or AnalystGenius evidence before client-ready use."], tone: "warn" },
      { cells: ["External market signals", "EXTERNAL DEMO SIGNALS — illustrative, to be verified against live AnalystGenius intelligence."], tone: "default" },
    ],
    fontSize: 10,
    headerFontSize: 9.5,
  });
}

function addSupportSlide(pptx: pptxgen, brand: Brand, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(),
    title: "AnalystGenius expert support",
    note: "Point-of-need support — bring AG analysts in where evidence is thin or stakes are high.",
  });

  addSectionLabel(slide, "When to bring AnalystGenius in", { x: 0.6, y: contentTop, w: 12 });
  addTable(slide, {
    x: 0.6,
    y: contentTop + 0.3,
    w: 12.13,
    colW: [4.6, 6.13, 1.4],
    headers: ["TRIGGER", "HOW AG HELPS", "OUTPUT"],
    rows: [
      { cells: ["High-severity open inputs remain", "Run a readiness session to close the gaps in this pack.", "Readiness session"] },
      { cells: ["Restricted / Unsupported proof states", "Validate reuse states before client-facing use.", "Cleared proof"] },
      { cells: ["Analyst briefing imminent", "Pressure-test each persona's analyst-facing narrative.", "Briefing dry-run"] },
      { cells: ["Modelled risk framing only", "Convert directional risks into evidence-backed positioning.", "Evidence pack"] },
    ],
    fontSize: 10,
    headerFontSize: 9.5,
  });

  const angleY = contentTop + 0.3 + 0.42 * 5 + 0.5;
  addSectionLabel(slide, "Why this makes AR a superhero internally", { x: 0.6, y: angleY, w: 12, color: PALETTE.gold });
  addBulletList(
    slide,
    [
      "AR walks into every leadership conversation with evidence-graded, persona-ready actions.",
      "Open inputs become a shared work-list with AnalystGenius, not an AR-only burden.",
    ],
    { x: 0.6, y: angleY + 0.3, w: 12.13, h: 1.2, fontSize: 11.5 }
  );
}
