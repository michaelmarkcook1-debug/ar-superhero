// ============================================================================
// Cockpit data model — Succeed / Direct / Enable
//
// All data here is demo data for a fictional IT services firm ("Northstar
// Digital Services"). External signals are explicitly tagged as demo/external
// so the UI can label them. AnalystGenius is shown as the underlying
// intelligence layer; we do not lift up other analyst firms as brand heroes.
// ============================================================================

import type { ReadinessBand } from "./seed";

// ---------------------------------------------------------------------------
// Mode definitions
// ---------------------------------------------------------------------------

export type ModeId = "succeed" | "direct" | "enable";

export type ModeDef = {
  id: ModeId;
  label: string;
  glyph: string; // Single-character glyph for the cockpit cards
  promise: string;
  oneLiner: string;
  metrics: { label: string; value: string; sub?: string }[];
};

export const MODES: ModeDef[] = [
  {
    id: "succeed",
    label: "Succeed",
    glyph: "I",
    promise: "Prepare, prove, and perform in analyst moments.",
    oneLiner:
      "Evaluation readiness, RFI workspace, briefing prep, and outcome learning for every active analyst moment.",
    metrics: [
      { label: "Active moments", value: "6", sub: "Across 6 assessment models" },
      { label: "Readiness exposure", value: "2", sub: "Weak · Missing" },
      { label: "Evidence gaps open", value: "9", sub: "3 high impact" },
    ],
  },
  {
    id: "direct",
    label: "Direct",
    glyph: "II",
    promise: "Turn analyst intelligence into internal action.",
    oneLiner:
      "Stakeholder lenses that tell each leader what they need to know — and what AR needs from them this week.",
    metrics: [
      { label: "Leaders to brief", value: "4", sub: "Exec · Strategy · Commercial · Delivery" },
      { label: "Actions due", value: "7", sub: "2 overdue" },
      { label: "Lenses generated", value: "12", sub: "Last 14 days" },
    ],
  },
  {
    id: "enable",
    label: "Enable",
    glyph: "III",
    promise: "Help the business sell and build market presence.",
    oneLiner:
      "Sales-safe proof, claims to avoid, and analyst-resonant narratives — without producing public campaigns.",
    metrics: [
      { label: "Approved proof", value: "14", sub: "Sales-safe snippets" },
      { label: "Restricted claims", value: "5", sub: "NDA · Unsupported" },
      { label: "Presence gaps", value: "3", sub: "Narrative · Visibility" },
    ],
  },
];

// ---------------------------------------------------------------------------
// AR Superhero Brief — what changed, where exposed, who needs action
// ---------------------------------------------------------------------------

export type BriefItem = {
  id: string;
  category: "changed" | "exposed" | "action" | "impact";
  title: string;
  detail: string;
  source: string;
  tag?: "demo" | "external signal" | "internal";
};

export const BRIEF_ITEMS: BriefItem[] = [
  {
    id: "b1",
    category: "changed",
    title: "Application modernisation criteria tightened mid-cycle",
    detail:
      "Composable architecture and refactor playbooks are weighing more heavily in this year's evaluation. Northstar's current submission leans on legacy lift-and-shift case studies.",
    source: "AnalystGenius intelligence layer",
    tag: "internal",
  },
  {
    id: "b2",
    category: "changed",
    title: "Two BFSI references reused across three active moments",
    detail:
      "Reference concentration risk: a single client withdrawal would dent readiness on three submissions simultaneously.",
    source: "AR Superhero portfolio scan",
    tag: "internal",
  },
  {
    id: "b3",
    category: "exposed",
    title: "Generative enterprise services — OneEcosystem narrative is Weak",
    detail:
      "Submission references two hyperscaler partners only. Multi-tier ecosystem narrative (hyperscaler + ISV + regional) is missing.",
    source: "AR Superhero readiness scan",
    tag: "internal",
  },
  {
    id: "b4",
    category: "exposed",
    title: "AI-assisted developer co-pilot evidence is Unsupported",
    detail:
      "Two BFSI deals could close the gap with named references; both are still pre-disclosure.",
    source: "Sales pipeline · AR Superhero",
    tag: "internal",
  },
  {
    id: "b5",
    category: "action",
    title: "Brief the BFSI CCO before Tuesday's pursuit review",
    detail:
      "Commercial lens shows two named pursuits anchored on analyst-visible positioning. Two-pager required, 3 approved proof items ready.",
    source: "Direct · Commercial lens",
    tag: "internal",
  },
  {
    id: "b6",
    category: "action",
    title: "Confirm interaction record from yesterday's BFSI deep-dive",
    detail:
      "Candidate record auto-created from calendar and analyst portal sync. Three follow-ups proposed — needs AR confirmation before logging.",
    source: "AR platform sync",
    tag: "internal",
  },
  {
    id: "b7",
    category: "impact",
    title: "Evidence gaps closed this quarter",
    detail: "11 closed · 4 opened · net +7. AI-assisted dev tooling remains the top open gap.",
    source: "AR Superhero ledger",
    tag: "internal",
  },
  {
    id: "b8",
    category: "impact",
    title: "Leader briefings prepared",
    detail: "9 lens briefings generated · 7 acted on · 2 awaiting acknowledgement.",
    source: "Direct ledger",
    tag: "internal",
  },
];

// ---------------------------------------------------------------------------
// Succeed — analyst moments, readiness, evidence gaps, RFI/briefing prep
// ---------------------------------------------------------------------------

export type AssessmentModel =
  | "Overall IT Services"
  | "Overall AI Readiness"
  | "Gartner MQ"
  | "IDC MarketScape"
  | "Forrester Wave"
  | "Everest PEAK"
  | "HFS Horizons"
  | "NelsonHall NEAT";

export const ASSESSMENT_MODELS: AssessmentModel[] = [
  "Overall IT Services",
  "Overall AI Readiness",
  "Gartner MQ",
  "IDC MarketScape",
  "Forrester Wave",
  "Everest PEAK",
  "HFS Horizons",
  "NelsonHall NEAT",
];

export type AnalystMoment = {
  id: string;
  model: AssessmentModel;
  topic: string;
  cycle: string;
  due: string;
  status: "On track" | "At risk" | "Blocked" | "Submitted";
  readiness: ReadinessBand;
  owner: string;
  exposure: string;
  topGaps: string[];
  rfiState: "Draft" | "In review" | "Submitted" | "Not started";
  briefingState: "Scheduled" | "Pending" | "Held" | "Not required";
  evidenceCoverage: number; // 0..1
};

export const MOMENTS: AnalystMoment[] = [
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
      "Current AG-shaped data shows defensible delivery scale and client outcome signals, but the executive story still needs sharper proof of repeatability across regions and service lines.",
    topGaps: [
      "Named cross-industry references — 3 strong examples available, 2 still approval-limited.",
      "Repeatable operating model proof — narrative exists but needs stronger quantified evidence.",
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
      "Production-grade AI outcomes — pilot evidence is stronger than scaled client proof.",
      "Responsible AI governance — policy exists, but assessment-ready operating evidence is thin.",
    ],
    rfiState: "Draft",
    briefingState: "Pending",
    evidenceCoverage: 0.44,
  },
  {
    id: "m3",
    model: "Everest PEAK",
    topic: "BFSI IT Services",
    cycle: "Cycle: PEAK 2026",
    due: "19 Jun",
    status: "On track",
    readiness: "Strong",
    owner: "Ana Reis",
    exposure:
      "Strongest active moment. AI-assisted operations evidence is weighing heavier this cycle — two BFSI outcomes are already documented.",
    topGaps: [
      "Add an EMEA insurer outcome to balance the BFSI mix.",
    ],
    rfiState: "Submitted",
    briefingState: "Held",
    evidenceCoverage: 0.86,
  },
  {
    id: "m4",
    model: "HFS Horizons",
    topic: "Generative Enterprise Services",
    cycle: "Cycle: Horizons 2026",
    due: "05 Jul",
    status: "Blocked",
    readiness: "Missing",
    owner: "Mireille Okonkwo",
    exposure:
      "OneEcosystem narrative is incomplete. Submission references two hyperscaler partners only — multi-tier expectation missing.",
    topGaps: [
      "OneEcosystem multi-tier narrative — hyperscaler, ISV, regional.",
      "Generative enterprise outcomes — no named client outcomes documented.",
      "Internal-business-unit collaboration story — undocumented.",
    ],
    rfiState: "Draft",
    briefingState: "Pending",
    evidenceCoverage: 0.24,
  },
  {
    id: "m5",
    model: "IDC MarketScape",
    topic: "AI Services Worldwide",
    cycle: "Cycle: MarketScape 2026",
    due: "30 May",
    status: "Submitted",
    readiness: "Strong",
    owner: "Hideo Tanaka",
    exposure: "Submitted on schedule. Awaiting analyst follow-up. No open exposures.",
    topGaps: [],
    rfiState: "Submitted",
    briefingState: "Held",
    evidenceCoverage: 0.91,
  },
  {
    id: "m6",
    model: "NelsonHall NEAT",
    topic: "Customer Experience Services",
    cycle: "Cycle: NEAT 2026",
    due: "22 Jul",
    status: "On track",
    readiness: "Adequate",
    owner: "Camille Okafor",
    exposure:
      "Two evidence items pending Marketing approval. Briefing window opens next month.",
    topGaps: [
      "Approved CX outcome with named client — 2 in marketing review.",
    ],
    rfiState: "Not started",
    briefingState: "Not required",
    evidenceCoverage: 0.58,
  },
];

export type EvidenceGap = {
  id: string;
  momentId: string;
  title: string;
  severity: "High" | "Medium" | "Low";
  status: "safe" | "restricted" | "unsupported";
  rationale: string;
};

export const EVIDENCE_GAPS: EvidenceGap[] = [
  {
    id: "g1",
    momentId: "m2",
    title: "Production AI outcomes — scaled proof",
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
    id: "g3",
    momentId: "m4",
    title: "OneEcosystem multi-tier narrative",
    severity: "High",
    status: "unsupported",
    rationale: "Submission references hyperscaler partners only. ISV and regional missing.",
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
    momentId: "m3",
    title: "EMEA insurer outcome",
    severity: "Medium",
    status: "safe",
    rationale: "Approved Q3 case study with named outcome — ready for reuse.",
  },
  {
    id: "g6",
    momentId: "m6",
    title: "Named CX outcome",
    severity: "Medium",
    status: "restricted",
    rationale: "Two outcomes in marketing review. Cleared for analyst use pending approval.",
  },
];

// HFS OneEcosystem guidance card — baseline analyst guidance + AnalystGenius prompt
export const HFS_GUIDANCE = {
  framework: "HFS OneEcosystem",
  baseline: [
    "Multi-tier ecosystem narrative: hyperscaler, ISV/platform, and regional/specialist partners.",
    "Named internal-business-unit collaboration with at least one documented outcome.",
    "Evidence that the ecosystem story persists across deals, not only at marketing moments.",
  ],
  trigger:
    "Your current submission references hyperscaler partners only. Baseline guidance expects a multi-tier narrative.",
  prompt:
    "Open a focused readiness session: AnalystGenius can co-author the OneEcosystem narrative with your AR lead, drawing from approved partner outcomes already in your library.",
};

// ---------------------------------------------------------------------------
// Direct — seven stakeholder lenses
// ---------------------------------------------------------------------------

export type LensId =
  | "executive"
  | "strategy"
  | "product"
  | "marketing"
  | "commercial"
  | "delivery"
  | "regional";

export type Lens = {
  id: LensId;
  label: string;
  stakeholder: string;
  oneLine: string;
  knows: string[];
  needsFromAR: string[];
  risks: { title: string; tone: "risk" | "opportunity" }[];
  briefing: {
    headline: string;
    bullets: string[];
    cta: string;
  };
};

export const LENSES: Lens[] = [
  {
    id: "executive",
    label: "Executive",
    stakeholder: "CEO · COO · CSO",
    oneLine:
      "Three of six active moments are on or ahead of plan. One is At risk; one is Blocked. A 20-minute review on Wave evidence and HFS go/no-go is needed this week.",
    knows: [
      "Portfolio status: 6 active analyst moments, 1 submitted, 0 declined.",
      "Concentration risk: two BFSI references underpin three active moments.",
      "Investment ask: one focused readiness session on HFS Horizons before next sprint.",
    ],
    needsFromAR: [
      "Confirm whether HFS Horizons is in or deferred this cycle.",
      "Approve the redirect of one BFSI reference to the Wave submission.",
      "Sponsor the cross-business OneEcosystem narrative workshop.",
    ],
    risks: [
      { title: "Wave criterion underexposed (AI-assisted dev tooling).", tone: "risk" },
      { title: "PEAK BFSI on track for Leader-band positioning.", tone: "opportunity" },
    ],
    briefing: {
      headline: "Two decisions this week, one approval next.",
      bullets: [
        "Go/no-go on HFS Horizons — readiness is currently Missing.",
        "Permission to share Wave-ready AI co-pilot proof under NDA with named analysts.",
        "Sign-off on the AR investment ask for AnalystGenius readiness session.",
      ],
      cta: "Generate executive brief",
    },
  },
  {
    id: "strategy",
    label: "Strategy",
    stakeholder: "Chief Strategy Officer · Strategy Office",
    oneLine:
      "Analyst-visible strategy must over-index on Application Modernisation and BFSI AI Operations. Gartner MQ and Everest PEAK BFSI align with FY26 priorities; HFS Horizons is the outlier.",
    knows: [
      "Sequencing Gartner MQ as anchor narrative supports three downstream RFIs.",
      "BFSI AI Operations point of view must be re-stated in time for Wave + IDC MarketScape (4-week overlap).",
      "HFS Horizons exposes a strategic gap on cross-business-unit collaboration.",
    ],
    needsFromAR: [
      "Confirm the FY26 anchor narratives so analyst submissions can lock language.",
      "Sponsor a one-pager on cross-business-unit operating model for HFS readiness.",
    ],
    risks: [
      { title: "FY26 strategy and analyst-visible strategy still diverge on AI operations.", tone: "risk" },
      { title: "Composable architecture is climbing in evaluation weight.", tone: "opportunity" },
    ],
    briefing: {
      headline: "Lock the analyst-visible strategy for the next four weeks.",
      bullets: [
        "Confirm two anchor narratives: App Modernisation, BFSI AI Operations.",
        "Decide HFS Horizons disposition.",
        "Approve cross-BU operating model 1-pager for AR reuse.",
      ],
      cta: "Generate strategy brief",
    },
  },
  {
    id: "product",
    label: "Product",
    stakeholder: "Product / Service Line Leaders",
    oneLine:
      "Capability and evidence gaps cluster around AI-assisted developer tooling and partner-led delivery. No roadmap recommendations are made here — gaps below should be reviewed with Product and AnalystGenius analysts.",
    knows: [
      "AI-assisted developer co-pilot — proof points exist as pilots only.",
      "Multi-tier partner delivery — minimal documented client outcomes.",
      "Platform engineering — outcome metrics need confirmation.",
    ],
    needsFromAR: [
      "Two named client outcomes for AI co-pilot — disclosure-ready.",
      "Permission to document the partner-led delivery model as a capability.",
    ],
    risks: [
      { title: "Wave criterion 'AI-assisted dev tooling' is currently Unsupported.", tone: "risk" },
      { title: "Platform engineering pilot data is trending well.", tone: "opportunity" },
    ],
    briefing: {
      headline: "Three capability gaps need a service-line decision.",
      bullets: [
        "Approve AI co-pilot disclosure motion for two BFSI references.",
        "Document partner-led delivery model as a stand-alone capability.",
        "Schedule readiness session with AnalystGenius on Horizons.",
      ],
      cta: "Generate product brief",
    },
  },
  {
    id: "marketing",
    label: "Marketing",
    stakeholder: "Marketing / Communications",
    oneLine:
      "Internal marketing guidance only. Storylines that resonate in current analyst inquiries should be reflected in internal sales-enablement and analyst briefing materials — not in external campaigns.",
    knows: [
      "App Modernisation inquiries trending up 22% QoQ in Northstar's category.",
      "BFSI AI co-pilot collateral is too sales-led for analyst use.",
      "NDA-only quotes cannot be externalised.",
    ],
    needsFromAR: [
      "Sharpen internal narrative on App Modernisation for AR briefings.",
      "Reposition BFSI AI co-pilot deck for analyst audiences (not buyers).",
    ],
    risks: [
      { title: "Risk of leaking NDA-only quotes into campaign drafts.", tone: "risk" },
      { title: "App Modernisation is a rising category — internal narrative window is open.", tone: "opportunity" },
    ],
    briefing: {
      headline: "Two internal assets need a rewrite before the next briefing cycle.",
      bullets: [
        "App Modernisation internal narrative — 1-pager.",
        "BFSI AI co-pilot analyst-version deck.",
        "Quote-use policy refresher for marketing managers.",
      ],
      cta: "Generate marketing brief",
    },
  },
  {
    id: "commercial",
    label: "Commercial",
    stakeholder: "Sales / Pursuit Leaders",
    oneLine:
      "Analyst influence enablement for internal sales leaders. Focus is on shaping how analyst positioning is used inside the sales motion, not on deal-room intelligence or competitor deal dynamics.",
    knows: [
      "BFSI sales leaders need a 2-pager on Northstar's analyst visibility (Gartner, Everest, IDC).",
      "North America Banking pursuit team has 2 named pursuits anchored on analyst positioning.",
      "NDA-only analyst quotes cannot be used in commercial conversations.",
    ],
    needsFromAR: [
      "Approve the 2-pager and route to BFSI sales leadership.",
      "Confirm 3 approved proof items for North America Banking pursuit.",
    ],
    risks: [
      { title: "Pursuit teams reusing NDA-only quotes in deal collateral.", tone: "risk" },
      { title: "PEAK BFSI Leader-band positioning is a sales-grade asset.", tone: "opportunity" },
    ],
    briefing: {
      headline: "Two pursuits this week need analyst-grade enablement.",
      bullets: [
        "Approve BFSI 2-pager for sales leadership distribution.",
        "Brief the North America Banking pursuit team — Tuesday.",
        "Confirm 3 proof items as sales-safe.",
      ],
      cta: "Generate commercial brief",
    },
  },
  {
    id: "delivery",
    label: "Delivery",
    stakeholder: "Delivery / Operations Leaders",
    oneLine:
      "Delivery-side proof — operating model, partner integration, AI-assisted ops — is the strongest analyst lever this cycle. Use it deliberately rather than incidentally.",
    knows: [
      "AI-assisted operations evidence is weighing heavier this PEAK cycle.",
      "Two BFSI delivery outcomes are documented and analyst-cleared.",
      "Partner-led delivery model is documented internally but not yet packaged.",
    ],
    needsFromAR: [
      "Package partner-led delivery model for analyst briefings.",
      "Sponsor one delivery-led briefing with Everest before submission.",
    ],
    risks: [
      { title: "Concentration risk on two BFSI references.", tone: "risk" },
      { title: "Delivery-side proof is the strongest current asset.", tone: "opportunity" },
    ],
    briefing: {
      headline: "Two operational assets to formalise for analyst use.",
      bullets: [
        "Package partner-led delivery model.",
        "Sponsor delivery-led briefing with Everest.",
        "Confirm reference diversification plan.",
      ],
      cta: "Generate delivery brief",
    },
  },
  {
    id: "regional",
    label: "Regional",
    stakeholder: "Regional / Country Leaders",
    oneLine:
      "EMEA and North America carry the heaviest analyst-visible load this cycle. APAC analyst coverage is light and should be reviewed against APAC pursuit momentum.",
    knows: [
      "EMEA Banking carries Gartner MQ and Forrester Wave reference dependencies.",
      "North America has two pursuits anchored on analyst positioning.",
      "APAC coverage is currently thin against rising APAC services pipeline.",
    ],
    needsFromAR: [
      "Confirm EMEA reference availability windows.",
      "Decide whether to invest in APAC analyst coverage this half.",
    ],
    risks: [
      { title: "EMEA reference reuse across three moments.", tone: "risk" },
      { title: "APAC services pipeline is outpacing analyst coverage.", tone: "opportunity" },
    ],
    briefing: {
      headline: "Two regional decisions to make this month.",
      bullets: [
        "EMEA reference rotation plan.",
        "APAC analyst coverage decision.",
        "North America pursuit-team briefing rhythm.",
      ],
      cta: "Generate regional brief",
    },
  },
];

// ---------------------------------------------------------------------------
// Enable — Sell and Build Market Presence
// ---------------------------------------------------------------------------

export type ProofItem = {
  id: string;
  title: string;
  status: "safe" | "restricted" | "unsupported";
  rationale: string;
  reuse: string;
};

export const SELL_PROOF: ProofItem[] = [
  {
    id: "p1",
    title: "BFSI Core Modernisation — 38% TCO reduction over 24 months",
    status: "safe",
    rationale: "Marketing-approved, customer-named, current.",
    reuse: "Sales decks · Pursuit collateral · Analyst briefings",
  },
  {
    id: "p2",
    title: "Insurer claims automation — 4 weeks to production",
    status: "safe",
    rationale: "Approved RFI library item, last refreshed April.",
    reuse: "Sales decks · Pursuit collateral",
  },
  {
    id: "p3",
    title: "Generative AI delivery factory — country-level headcount",
    status: "restricted",
    rationale: "Cleared for analyst briefings only. Country-level numbers permitted.",
    reuse: "Analyst briefings only",
  },
  {
    id: "p4",
    title: "Retail AI co-pilot pilot — 11% release velocity uplift",
    status: "restricted",
    rationale: "Internal only. Not yet cleared for buyer-facing materials.",
    reuse: "Internal enablement",
  },
  {
    id: "p5",
    title: "AI-assisted developer co-pilot — production claim",
    status: "unsupported",
    rationale: "Production-grade evidence missing. Do not claim until disclosure motion clears.",
    reuse: "Do not use externally",
  },
];

export type ClaimToAvoid = {
  id: string;
  claim: string;
  reason: string;
};

export const CLAIMS_TO_AVOID: ClaimToAvoid[] = [
  {
    id: "c1",
    claim: "Northstar is a Leader in AI-assisted developer tooling.",
    reason: "Forrester Wave criterion currently Unsupported. Claim will be challenged.",
  },
  {
    id: "c2",
    claim: "Quoting NDA-only analyst views in buyer-facing materials.",
    reason: "NDA controls prohibit external reuse. Internal enablement only.",
  },
  {
    id: "c3",
    claim: "Multi-tier ecosystem leadership claim.",
    reason: "OneEcosystem narrative is currently Missing. Build the proof first.",
  },
  {
    id: "c4",
    claim: "Named customer outcomes outside the approved RFI library.",
    reason: "Customer-named outcomes require explicit reuse permission per customer.",
  },
];

export type BuyerGuidance = {
  id: string;
  buyer: string;
  guidance: string;
  approved: string[];
};

export const BUYER_GUIDANCE: BuyerGuidance[] = [
  {
    id: "bg1",
    buyer: "BFSI CIO / CTO",
    guidance:
      "Lead with PEAK BFSI Leader-band positioning. Pair with two named outcomes (TCO reduction, claims automation).",
    approved: ["BFSI Core Modernisation — 38% TCO", "Insurer claims automation — 4 weeks to production"],
  },
  {
    id: "bg2",
    buyer: "Retail CIO",
    guidance:
      "Lead with App Modernisation positioning. Avoid AI co-pilot claims until disclosure clears. Use internal proof points only with sales leadership.",
    approved: ["BFSI Core Modernisation case (cross-industry analog)"],
  },
  {
    id: "bg3",
    buyer: "Insurance CIO",
    guidance:
      "Lead with claims automation outcome. Position partner ecosystem as a multi-vendor approach without overclaiming OneEcosystem readiness.",
    approved: ["Insurer claims automation — 4 weeks to production"],
  },
];

export type Narrative = {
  id: string;
  title: string;
  resonance: "Rising" | "Steady" | "Declining";
  detail: string;
  internalOnly: boolean;
};

export const NARRATIVES: Narrative[] = [
  {
    id: "n1",
    title: "Composable application modernisation",
    resonance: "Rising",
    detail:
      "Analyst category weight is climbing. Northstar's two refactor cases land; the playbook narrative is missing.",
    internalOnly: true,
  },
  {
    id: "n2",
    title: "AI-assisted operations in regulated industries",
    resonance: "Rising",
    detail:
      "Carries the strongest signal across PEAK BFSI and IDC MarketScape. Reuse PEAK-cleared outcomes for analyst briefings.",
    internalOnly: true,
  },
  {
    id: "n3",
    title: "Multi-tier partner ecosystem",
    resonance: "Steady",
    detail:
      "Required for HFS Horizons readiness. Current narrative is hyperscaler-centric — needs ISV and regional layers.",
    internalOnly: true,
  },
  {
    id: "n4",
    title: "Outcome-led delivery model",
    resonance: "Steady",
    detail:
      "Delivery-led narrative is well-supported by current outcomes. Package as a stand-alone capability story.",
    internalOnly: true,
  },
];

export type PresenceGap = {
  id: string;
  area: string;
  gap: string;
  guidance: string;
};

export const PRESENCE_GAPS: PresenceGap[] = [
  {
    id: "pg1",
    area: "Cross-business-unit collaboration",
    gap: "No documented internal-BU narrative for analyst use.",
    guidance:
      "Sponsor a one-pager with Strategy. Required for HFS Horizons; reusable across PEAK and Wave.",
  },
  {
    id: "pg2",
    area: "AI-assisted developer tooling",
    gap: "Production proof missing. Two BFSI deals could close this in disclosure.",
    guidance:
      "Coordinate disclosure motion with Commercial and Product. Briefing-only until cleared.",
  },
  {
    id: "pg3",
    area: "Multi-tier partner ecosystem",
    gap: "Submission references hyperscaler partners only.",
    guidance:
      "Map ISV and regional partners with documented outcomes; cleared partners only.",
  },
];

// ---------------------------------------------------------------------------
// Impact ledger
// ---------------------------------------------------------------------------

export const IMPACT_STATS = [
  { label: "Evidence gaps closed", value: "11", delta: "+4 vs last quarter" },
  { label: "Briefings prepared", value: "9", delta: "7 acted on" },
  { label: "Analyst moments supported", value: "6", delta: "5 active · 1 submitted" },
  { label: "Leader actions triggered", value: "14", delta: "10 done · 4 in flight" },
];

// ============================================================================
// Analyst moment material uploads + Succeed decision model
// ============================================================================
//
// Uploaded third-party analyst material is used for the customer's own
// readiness (Succeed) and for AnalystGenius model learning only where
// permitted/validated. We never imply AnalystGenius republishes other firms'
// IP. Cross-client learning is gated on AnalystGenius researcher validation
// (the "Pending AG validation" state).

export type SucceedMaterialType =
  | "rfi"
  | "invitation"
  | "correspondence"
  | "deck"
  | "outcome"
  | "writeup"
  | "screenshot"
  | "spreadsheet";

export type MaterialState =
  | "Analysed"
  | "Needs review"
  | "Feeding readiness"
  | "Outcome captured"
  | "Pending AG validation";

export type SucceedUpload = {
  id: string;
  filename: string;
  type: SucceedMaterialType;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  momentId?: string; // links to MOMENTS
  state: MaterialState;
  summary: string;
  signals: string[]; // short bullets of what the model extracted
  permission: "Permitted for internal learning" | "Customer readiness only" | "Restricted reuse";
};

export const SUCCEED_MATERIAL_TYPES: {
  id: SucceedMaterialType;
  label: string;
  hint: string;
}[] = [
  { id: "rfi", label: "RFI / questionnaire", hint: "Analyst RFI or assessment questionnaire (DOCX, XLSX, PDF)." },
  { id: "invitation", label: "Invitation / kickoff email", hint: "Initial invitation or kickoff email from the analyst firm." },
  { id: "correspondence", label: "Analyst correspondence", hint: "Email threads, clarification requests, scheduling notes." },
  { id: "deck", label: "Briefing / assessment deck", hint: "Analyst assessment deck or briefing deck shared with you." },
  { id: "outcome", label: "Assessment outcome", hint: "Final result, position rationale, scorecard, ranking." },
  { id: "writeup", label: "Vendor-specific write-up", hint: "Analyst commentary specifically about your firm." },
  { id: "screenshot", label: "Screenshot / image", hint: "Screenshots of analyst portals, dashboards, scorecards." },
  { id: "spreadsheet", label: "Spreadsheet / data export", hint: "Scoring grids, criteria weights, evidence trackers." },
];

export const SUCCEED_UPLOADS: SucceedUpload[] = [
  {
    id: "su1",
    filename: "Gartner_MQ_AppMod_RFI_v3.docx",
    type: "rfi",
    size: "182 KB",
    uploadedBy: "Mireille Okonkwo",
    uploadedAt: "11 May · 09:14",
    momentId: "m1",
    state: "Analysed",
    summary:
      "Composable architecture criterion weight has risen. 14 of 32 questions touch refactor playbooks.",
    signals: [
      "Composable architecture weight ↑",
      "Refactor playbook called out 4×",
      "BFSI references expected in 6 questions",
    ],
    permission: "Customer readiness only",
  },
  {
    id: "su2",
    filename: "HFS_Horizons_Invitation.eml",
    type: "invitation",
    size: "24 KB",
    uploadedBy: "Mireille Okonkwo",
    uploadedAt: "09 May · 16:42",
    momentId: "m4",
    state: "Feeding readiness",
    summary:
      "Multi-tier ecosystem (hyperscaler + ISV + regional) is named as a baseline expectation in the invitation.",
    signals: [
      "OneEcosystem multi-tier named as baseline",
      "Internal-BU collaboration evidence expected",
      "Submission window: 8 weeks",
    ],
    permission: "Customer readiness only",
  },
  {
    id: "su3",
    filename: "Forrester_Wave_AppDev_briefing_v2.pptx",
    type: "deck",
    size: "8.4 MB",
    uploadedBy: "Dev Patel",
    uploadedAt: "08 May · 11:05",
    momentId: "m2",
    state: "Needs review",
    summary:
      "Strategy demo declined last cycle is flagged in analyst notes — appears to have weighted against the score.",
    signals: [
      "Strategy demo gap flagged",
      "Developer co-pilot evidence requested",
      "Two questions reference platform engineering KPIs",
    ],
    permission: "Restricted reuse",
  },
  {
    id: "su4",
    filename: "Everest_PEAK_BFSI_outcome.pdf",
    type: "outcome",
    size: "2.1 MB",
    uploadedBy: "Ana Reis",
    uploadedAt: "06 May · 14:30",
    momentId: "m3",
    state: "Outcome captured",
    summary:
      "Strong band achieved. Rationale cites two BFSI outcomes and the AI-assisted operations narrative. Two learning signals extracted.",
    signals: [
      "AI-assisted operations weight ↑",
      "EMEA insurer outcome would broaden BFSI mix",
      "2 cross-client learning signals captured",
    ],
    permission: "Permitted for internal learning",
  },
  {
    id: "su5",
    filename: "IDC_AI_Services_vendor_writeup.pdf",
    type: "writeup",
    size: "0.9 MB",
    uploadedBy: "Hideo Tanaka",
    uploadedAt: "04 May · 10:18",
    momentId: "m5",
    state: "Pending AG validation",
    summary:
      "Vendor-specific write-up from the analyst. One generalisable signal pending AnalystGenius researcher validation before reuse across clients.",
    signals: [
      "Outcome-led delivery narrative resonates",
      "1 cross-client signal awaiting validation",
    ],
    permission: "Customer readiness only",
  },
  {
    id: "su6",
    filename: "NelsonHall_CX_correspondence.eml",
    type: "correspondence",
    size: "56 KB",
    uploadedBy: "Camille Okafor",
    uploadedAt: "02 May · 17:55",
    momentId: "m6",
    state: "Analysed",
    summary:
      "Analyst requested two named CX outcomes; both currently in marketing review. Briefing window opens next month.",
    signals: [
      "Two named CX outcomes requested",
      "Briefing window: opens 12 Jun",
    ],
    permission: "Customer readiness only",
  },
];

// Succeed decision model — eight stages, each fed by uploads
export type DecisionStage<F = string> = {
  id: string;
  label: string;
  short: string;
  feeds: F[];
  output: string;
  tone: "gold" | "teal" | "muted";
};

export const SUCCEED_DECISION_STAGES: DecisionStage<SucceedMaterialType>[] = [
  {
    id: "s1",
    label: "Criteria extraction",
    short: "What the analyst is weighing.",
    feeds: ["rfi", "invitation", "deck"],
    output: "Per-criterion weights and named expectations.",
    tone: "gold",
  },
  {
    id: "s2",
    label: "Analyst ask detection",
    short: "What they explicitly asked you for.",
    feeds: ["correspondence", "invitation", "deck"],
    output: "Tracked questions, deadlines, follow-ups.",
    tone: "gold",
  },
  {
    id: "s3",
    label: "Evidence gap mapping",
    short: "Where your proof is missing or restricted.",
    feeds: ["rfi", "deck"],
    output: "Gap list with severity and reuse status.",
    tone: "gold",
  },
  {
    id: "s4",
    label: "Readiness band update",
    short: "Strong · Adequate · Weak · Missing · Unsupported.",
    feeds: ["rfi", "deck", "writeup"],
    output: "Updated readiness band per assessment.",
    tone: "teal",
  },
  {
    id: "s5",
    label: "Briefing prep prompts",
    short: "What to walk the analyst through.",
    feeds: ["deck", "correspondence"],
    output: "Briefing outline + talk track suggestions.",
    tone: "teal",
  },
  {
    id: "s6",
    label: "RFI response guidance",
    short: "How to answer, with which proof.",
    feeds: ["rfi", "writeup"],
    output: "Per-question proof packs (internal use).",
    tone: "teal",
  },
  {
    id: "s7",
    label: "Outcome learning signal",
    short: "What this cycle taught us.",
    feeds: ["outcome", "writeup"],
    output: "Patterns added to AR's own learning log.",
    tone: "muted",
  },
  {
    id: "s8",
    label: "AG researcher validation",
    short: "Cross-client signals gated by AnalystGenius researchers.",
    feeds: ["outcome", "writeup"],
    output: "Validated patterns can inform other clients; raw third-party IP never reused.",
    tone: "muted",
  },
];

// Model impacts — observed changes after recent uploads (no prediction language)
export type ModelImpact = {
  id: string;
  trigger: string; // what was uploaded
  observed: string; // what the model captured
  scope: "Customer readiness" | "AG cross-client (validated)" | "AG cross-client (pending)";
};

export const SUCCEED_MODEL_IMPACTS: ModelImpact[] = [
  {
    id: "mi1",
    trigger: "Partner evidence pack uploaded against HFS Horizons.",
    observed:
      "HFS OneEcosystem alignment moved from Weak to Adequate. Multi-tier narrative now references hyperscaler, ISV, and one regional partner.",
    scope: "Customer readiness",
  },
  {
    id: "mi2",
    trigger: "Everest PEAK BFSI outcome write-up captured.",
    observed:
      "Outcome write-up created 2 learning signals pending AG validation. Validated signals can inform other clients without reusing the analyst's IP.",
    scope: "AG cross-client (pending)",
  },
  {
    id: "mi3",
    trigger: "Gartner AppMod RFI v3 analysed.",
    observed:
      "Composable architecture criterion weight reflected in readiness band. Two evidence gaps re-prioritised to High severity.",
    scope: "Customer readiness",
  },
  {
    id: "mi4",
    trigger: "Forrester Wave briefing deck flagged.",
    observed:
      "Briefing prep prompt added: walk the analyst through the AI-assisted developer co-pilot pilot, then the platform engineering KPIs.",
    scope: "Customer readiness",
  },
  {
    id: "mi5",
    trigger: "IDC vendor write-up uploaded.",
    observed:
      "1 generalisable pattern (outcome-led delivery resonance) routed to AG researcher queue. No third-party text reused.",
    scope: "AG cross-client (pending)",
  },
];

// ============================================================================
// Direct upload workflow — internal material that feeds stakeholder lenses
// ============================================================================

export type DirectMaterialType =
  | "leadership-note"
  | "briefing-request"
  | "exec-update"
  | "service-update"
  | "delivery-update"
  | "regional-update"
  | "internal-plan"
  | "meeting-notes"
  | "approved-summary";

export const DIRECT_MATERIAL_TYPES: {
  id: DirectMaterialType;
  label: string;
  hint: string;
}[] = [
  { id: "leadership-note", label: "Leadership note", hint: "Internal note from a leader (executive, strategy, product, regional)." },
  { id: "briefing-request", label: "Briefing request", hint: "A leader asking AR for a tailored briefing." },
  { id: "exec-update", label: "Board / exec update draft", hint: "Draft board pack or executive readout." },
  { id: "service-update", label: "Service-line / product update", hint: "Capability or product line changes that affect positioning." },
  { id: "delivery-update", label: "Delivery update", hint: "Delivery quality, run-rate, or escalation notes." },
  { id: "regional-update", label: "Regional update", hint: "Country, region, or geography-specific update." },
  { id: "internal-plan", label: "Marketing / commercial plan", hint: "Internal-only campaign or pursuit plan." },
  { id: "meeting-notes", label: "Internal meeting notes", hint: "Notes from leadership or working group meetings." },
  { id: "approved-summary", label: "Approved analyst summary", hint: "Analyst-derived summary already approved for internal use." },
];

export type DirectUpload = {
  id: string;
  filename: string;
  type: DirectMaterialType;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  lensId?: LensId; // links to LENSES
  state: "Analysed" | "Routed to lens" | "Needs review" | "Briefing-ready";
  summary: string;
  signals: string[];
};

export const DIRECT_UPLOADS: DirectUpload[] = [
  {
    id: "du1",
    filename: "Q2_Board_Pack_draft_v2.docx",
    type: "exec-update",
    size: "1.3 MB",
    uploadedBy: "Mireille Okonkwo",
    uploadedAt: "12 May · 08:20",
    lensId: "executive",
    state: "Briefing-ready",
    summary:
      "Board readout draft. Three slides relate to active analyst moments; AR-relevant talking points extracted.",
    signals: [
      "Add HFS Horizons status to slide 7",
      "Replace lift-and-shift case study with refactor outcome",
      "Quantify analyst moment exposure on slide 12",
    ],
  },
  {
    id: "du2",
    filename: "EMEA_Delivery_Run_Rate_W19.pdf",
    type: "delivery-update",
    size: "0.7 MB",
    uploadedBy: "Ana Reis",
    uploadedAt: "11 May · 17:04",
    lensId: "delivery",
    state: "Routed to lens",
    summary:
      "EMEA delivery health is green. One BFSI client outcome maturing — usable in Gartner MQ once approved.",
    signals: [
      "One BFSI outcome reaching marketing-approval gate",
      "No delivery risk to active references",
    ],
  },
  {
    id: "du3",
    filename: "Product_AI_CoPilot_Update.docx",
    type: "service-update",
    size: "0.4 MB",
    uploadedBy: "Camille Okafor",
    uploadedAt: "10 May · 14:12",
    lensId: "product",
    state: "Analysed",
    summary:
      "AI-assisted developer co-pilot capability is moving from pilot to GA in Q3. Affects Forrester Wave positioning.",
    signals: [
      "Co-pilot GA aligns with Wave submission",
      "Production-grade proof still pending — track in Succeed",
    ],
  },
  {
    id: "du4",
    filename: "APAC_Regional_Note_May.eml",
    type: "regional-update",
    size: "18 KB",
    uploadedBy: "Hideo Tanaka",
    uploadedAt: "08 May · 09:36",
    lensId: "regional",
    state: "Routed to lens",
    summary:
      "APAC growth in BFSI outpaces forecast. Regional reference list refreshed; one Japanese bank cleared for analyst use.",
    signals: [
      "1 new APAC reference cleared for analyst use",
      "BFSI growth signal for Strategy lens",
    ],
  },
  {
    id: "du5",
    filename: "Commercial_Pursuit_Plan_Q3.pptx",
    type: "internal-plan",
    size: "3.2 MB",
    uploadedBy: "Dev Patel",
    uploadedAt: "07 May · 11:48",
    lensId: "commercial",
    state: "Needs review",
    summary:
      "Pursuit plan references claims that need cross-checking against AR's restricted list.",
    signals: [
      "2 pursuit claims flagged for restricted-list review",
      "Sales-safe substitutions suggested",
    ],
  },
  {
    id: "du6",
    filename: "Strategy_Offsite_Notes_May.docx",
    type: "meeting-notes",
    size: "0.2 MB",
    uploadedBy: "Mireille Okonkwo",
    uploadedAt: "05 May · 19:02",
    lensId: "strategy",
    state: "Analysed",
    summary:
      "Strategy offsite endorsed the OneEcosystem multi-tier narrative. Action: package narrative as briefing-ready by 25 May.",
    signals: [
      "OneEcosystem narrative endorsed by Strategy",
      "Owner: Strategy + AR; due 25 May",
    ],
  },
];

export const DIRECT_DECISION_STAGES: DecisionStage<DirectMaterialType>[] = [
  {
    id: "d1",
    label: "Lens routing",
    short: "Which leader does this concern.",
    feeds: ["leadership-note", "briefing-request", "regional-update"],
    output: "Material routed to the right stakeholder lens.",
    tone: "gold",
  },
  {
    id: "d2",
    label: "Brief input extraction",
    short: "What the leader needs to know.",
    feeds: ["exec-update", "approved-summary", "meeting-notes"],
    output: "Stakeholder-specific brief inputs ready to use.",
    tone: "gold",
  },
  {
    id: "d3",
    label: "Action ask detection",
    short: "What AR needs from this leader.",
    feeds: ["briefing-request", "service-update", "delivery-update"],
    output: "Per-lens action list with owners and dates.",
    tone: "teal",
  },
  {
    id: "d4",
    label: "Risk / opportunity mapping",
    short: "By lens — surfaced, not predicted.",
    feeds: ["delivery-update", "regional-update", "internal-plan"],
    output: "Risks and opportunities tagged to each lens.",
    tone: "teal",
  },
  {
    id: "d5",
    label: "Briefing-ready summary",
    short: "One-page leader summary.",
    feeds: ["exec-update", "approved-summary"],
    output: "Source-traced briefing summary, NDA controls applied.",
    tone: "muted",
  },
];

export const DIRECT_MODEL_IMPACTS: ModelImpact[] = [
  {
    id: "dmi1",
    trigger: "Q2 board pack draft uploaded.",
    observed:
      "Executive lens picked up three AR-relevant talking points. Briefing-action card updated to reference HFS Horizons status.",
    scope: "Customer readiness",
  },
  {
    id: "dmi2",
    trigger: "EMEA delivery run-rate uploaded.",
    observed:
      "Delivery lens shows no risk to active references. One BFSI outcome flagged as ready for analyst use once marketing approves.",
    scope: "Customer readiness",
  },
  {
    id: "dmi3",
    trigger: "Strategy offsite notes captured.",
    observed:
      "Strategy lens action list updated: package OneEcosystem narrative briefing-ready by 25 May.",
    scope: "Customer readiness",
  },
  {
    id: "dmi4",
    trigger: "Commercial pursuit plan uploaded.",
    observed:
      "Two pursuit claims flagged for restricted-list review. Sales-safe substitutions suggested in Enable.",
    scope: "Customer readiness",
  },
];

// ============================================================================
// Enable upload workflow — material that feeds sell + market presence
// ============================================================================

export type EnableMaterialType =
  | "sales-deck"
  | "proof-point"
  | "case-study"
  | "reference"
  | "messaging-draft"
  | "campaign-plan"
  | "thought-leadership"
  | "website-copy"
  | "enablement-note"
  | "claim-list"
  | "recognition-snippet"
  | "comms-draft";

export const ENABLE_MATERIAL_TYPES: {
  id: EnableMaterialType;
  label: string;
  hint: string;
}[] = [
  { id: "sales-deck", label: "Sales deck", hint: "Pursuit or capability deck used in deals." },
  { id: "proof-point", label: "Approved proof point", hint: "Cleared snippet or metric for buyer conversations." },
  { id: "case-study", label: "Case study", hint: "Published or internal case study." },
  { id: "reference", label: "Customer reference", hint: "Named or anonymised reference record." },
  { id: "messaging-draft", label: "Messaging draft", hint: "Marketing messaging or positioning draft." },
  { id: "campaign-plan", label: "Campaign plan", hint: "Internal campaign or always-on plan." },
  { id: "thought-leadership", label: "Thought leadership draft", hint: "POV, article, or briefing draft." },
  { id: "website-copy", label: "Website copy", hint: "Website copy snippets pending review." },
  { id: "enablement-note", label: "Commercial enablement note", hint: "Sales-leader or pursuit-team enablement note." },
  { id: "claim-list", label: "Claim list", hint: "List of claims used in pitches or assets." },
  { id: "recognition-snippet", label: "Analyst recognition snippet", hint: "Approved-for-reuse analyst recognition line." },
  { id: "comms-draft", label: "Internal comms draft", hint: "All-hands or internal newsletter draft." },
];

export type EnableUpload = {
  id: string;
  filename: string;
  type: EnableMaterialType;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  state:
    | "Analysed"
    | "Cleared for sell"
    | "Restricted"
    | "Claims flagged"
    | "Presence gap mapped";
  summary: string;
  signals: string[];
  routedTo: "Sell" | "Build market presence" | "Both";
};

export const ENABLE_UPLOADS: EnableUpload[] = [
  {
    id: "eu1",
    filename: "Northstar_BFSI_Pursuit_Deck_v6.pptx",
    type: "sales-deck",
    size: "11.8 MB",
    uploadedBy: "Dev Patel",
    uploadedAt: "12 May · 10:11",
    state: "Claims flagged",
    summary:
      "Two claims on slides 14 and 22 use Unsupported evidence. Sales-safe substitutions suggested.",
    signals: [
      "Slide 14 claim → restricted-list match",
      "Slide 22 claim → unsupported (no named reference)",
      "9 sales-safe alternatives available",
    ],
    routedTo: "Sell",
  },
  {
    id: "eu2",
    filename: "EMEA_Bank_CaseStudy_FINAL.pdf",
    type: "case-study",
    size: "1.6 MB",
    uploadedBy: "Camille Okafor",
    uploadedAt: "11 May · 16:23",
    state: "Cleared for sell",
    summary:
      "Approved EMEA bank case study. Three sales-safe proof snippets extracted for buyer conversations.",
    signals: [
      "3 sales-safe snippets created",
      "Permitted reuse: buyer-facing, analyst-facing",
    ],
    routedTo: "Both",
  },
  {
    id: "eu3",
    filename: "Composable_Arch_POV_draft.docx",
    type: "thought-leadership",
    size: "0.3 MB",
    uploadedBy: "Mireille Okonkwo",
    uploadedAt: "10 May · 12:46",
    state: "Presence gap mapped",
    summary:
      "Composable architecture POV. Closes a known presence gap in App Modernisation conversations.",
    signals: [
      "Closes composable architecture presence gap",
      "Pairs with two BFSI refactor outcomes",
      "Briefing-grade; not public-campaign-ready",
    ],
    routedTo: "Build market presence",
  },
  {
    id: "eu4",
    filename: "Customer_Reference_List_Q2.xlsx",
    type: "reference",
    size: "0.2 MB",
    uploadedBy: "Ana Reis",
    uploadedAt: "09 May · 09:58",
    state: "Restricted",
    summary:
      "Reference list refresh. Two new BFSI references; one NDA-restricted to analyst briefing only.",
    signals: [
      "2 new BFSI references",
      "1 NDA-restricted to analyst briefing",
    ],
    routedTo: "Sell",
  },
  {
    id: "eu5",
    filename: "AI_Services_Messaging_Draft.docx",
    type: "messaging-draft",
    size: "0.4 MB",
    uploadedBy: "Hideo Tanaka",
    uploadedAt: "07 May · 13:31",
    state: "Claims flagged",
    summary:
      "Messaging draft contains one claim about scale that is currently Unsupported. Internal-only until proof lands.",
    signals: [
      "1 scale claim → unsupported",
      "Hold for production-grade proof",
    ],
    routedTo: "Build market presence",
  },
  {
    id: "eu6",
    filename: "Approved_Recognition_Snippets.docx",
    type: "recognition-snippet",
    size: "0.1 MB",
    uploadedBy: "Camille Okafor",
    uploadedAt: "05 May · 11:09",
    state: "Cleared for sell",
    summary:
      "Approved-for-reuse analyst recognition lines. Cleared by legal for buyer-facing conversations.",
    signals: [
      "4 lines cleared",
      "Approved for buyer-facing reuse",
    ],
    routedTo: "Sell",
  },
];

export const ENABLE_DECISION_STAGES: DecisionStage<EnableMaterialType>[] = [
  {
    id: "e1",
    label: "Proof clearance",
    short: "What is sales-safe to send into a deal.",
    feeds: ["proof-point", "case-study", "reference"],
    output: "Cleared, source-traced proof snippets.",
    tone: "gold",
  },
  {
    id: "e2",
    label: "Claim audit",
    short: "What not to say.",
    feeds: ["sales-deck", "messaging-draft", "claim-list"],
    output: "Restricted and unsupported claims surfaced with substitutions.",
    tone: "gold",
  },
  {
    id: "e3",
    label: "Audience-permitted reuse",
    short: "Where each proof can travel.",
    feeds: ["case-study", "recognition-snippet", "proof-point"],
    output: "Reuse controls (buyer / analyst / internal-only).",
    tone: "teal",
  },
  {
    id: "e4",
    label: "Presence gap mapping",
    short: "Where the story isn't landing.",
    feeds: ["thought-leadership", "messaging-draft", "website-copy"],
    output: "Gap list with internal owner suggestions.",
    tone: "teal",
  },
  {
    id: "e5",
    label: "Thought leadership prompts",
    short: "Briefing-grade only — no public campaigns.",
    feeds: ["thought-leadership", "campaign-plan", "enablement-note"],
    output: "Internal prompts for AR + Strategy + Marketing.",
    tone: "muted",
  },
  {
    id: "e6",
    label: "Internal marketing guidance",
    short: "How to talk about this internally.",
    feeds: ["comms-draft", "enablement-note"],
    output: "Source-traced talking points for internal channels.",
    tone: "muted",
  },
];

export const ENABLE_MODEL_IMPACTS: ModelImpact[] = [
  {
    id: "emi1",
    trigger: "BFSI pursuit deck uploaded.",
    observed:
      "Two claims auto-flagged against the restricted list. Nine sales-safe substitutions surfaced for the pursuit team.",
    scope: "Customer readiness",
  },
  {
    id: "emi2",
    trigger: "EMEA bank case study cleared.",
    observed:
      "Three sales-safe proof snippets added to Approved proof. Reuse permitted for buyer-facing and analyst-facing conversations.",
    scope: "Customer readiness",
  },
  {
    id: "emi3",
    trigger: "Composable architecture POV drafted.",
    observed:
      "Presence gap (composable architecture) marked as Closing. Pairs with two BFSI refactor outcomes for briefing reuse.",
    scope: "Customer readiness",
  },
  {
    id: "emi4",
    trigger: "AI services messaging draft uploaded.",
    observed:
      "One scale claim moved to internal-only. Held until production-grade proof lands.",
    scope: "Customer readiness",
  },
];

// Shared note used across upload panels
export const UPLOAD_BACKEND_NOTE =
  "Live document ingestion will use the backend parser pipeline. This view shows the analysed state.";

// ============================================================================
// Deliverables — AnalystGenius-controlled output templates
// ============================================================================
//
// These are *not* a user-custom template builder. AnalystGenius ships a
// curated set of deliverable templates per stakeholder / Enable category.
// The customer selects a deliverable and a format; AnalystGenius assembles
// it from the analysed material library. Prototype does not generate real
// files — the export button shows a status ("Template queued").

export type DeliverableFormat = "DOCX" | "PPTX" | "XLSX" | "PDF";

export type DeliverableTemplate = {
  id: string;
  name: string;
  summary: string;
  formats: DeliverableFormat[];
  primaryFormat: DeliverableFormat; // visually emphasised
  templateState: "AG curated" | "AG curated · v2" | "Beta template";
  approval: "Source-traced" | "NDA controls" | "Internal-only";
  // What goes into the deliverable — feeds the model-fed badge list.
  composedFrom: string[];
};

// ---------------------------------------------------------------------------
// Direct — one deliverable family per stakeholder lens (LensId)
// ---------------------------------------------------------------------------

export const DIRECT_DELIVERABLES: Record<LensId, DeliverableTemplate[]> = {
  executive: [
    {
      id: "dir-exec-pack",
      name: "Executive Briefing Pack",
      summary:
        "Cinematic exec readout: what changed, where Northstar is exposed, what AR is doing, what the exec must decide.",
      formats: ["PPTX", "PDF"],
      primaryFormat: "PPTX",
      templateState: "AG curated · v2",
      approval: "Source-traced",
      composedFrom: ["Active moments", "Readiness exposure", "AR Superhero Brief", "Impact ledger"],
    },
    {
      id: "dir-exec-memo",
      name: "Exec Decision Memo",
      summary:
        "One-page memo distilling the three exec decisions needed this cycle, with source trace and NDA controls applied.",
      formats: ["DOCX", "PDF"],
      primaryFormat: "DOCX",
      templateState: "AG curated",
      approval: "NDA controls",
      composedFrom: ["Top exposures", "Decision asks", "Action owners"],
    },
  ],
  strategy: [
    {
      id: "dir-strat-memo",
      name: "Strategy Implication Memo",
      summary:
        "Implications of current analyst signals on portfolio bets, capability gaps, and partner moves. Internal use only.",
      formats: ["DOCX", "PDF"],
      primaryFormat: "DOCX",
      templateState: "AG curated · v2",
      approval: "Source-traced",
      composedFrom: ["Criteria shifts", "Capability gaps", "Ecosystem narrative status"],
    },
    {
      id: "dir-strat-deck",
      name: "Portfolio Implications Deck",
      summary:
        "Working deck for Strategy + AR. Frames criteria shifts as portfolio bets, not predictions.",
      formats: ["PPTX", "PDF"],
      primaryFormat: "PPTX",
      templateState: "AG curated",
      approval: "Internal-only",
      composedFrom: ["Criteria shifts", "Portfolio bets", "Working assumptions"],
    },
  ],
  product: [
    {
      id: "dir-prod-grid",
      name: "Product Evidence Gap Grid",
      summary:
        "Per-product evidence gap matrix: capability × moment × proof state × restricted-list flags.",
      formats: ["XLSX", "PDF"],
      primaryFormat: "XLSX",
      templateState: "AG curated · v2",
      approval: "Source-traced",
      composedFrom: ["Evidence gaps", "Capability map", "Proof-clearance status"],
    },
    {
      id: "dir-prod-memo",
      name: "Service Line Update Memo",
      summary:
        "Narrative summary of what each service line owes AR this cycle, with owners and dates.",
      formats: ["DOCX", "PDF"],
      primaryFormat: "DOCX",
      templateState: "AG curated",
      approval: "Internal-only",
      composedFrom: ["Service-line updates", "Action asks", "Owners"],
    },
  ],
  marketing: [
    {
      id: "dir-mkt-guidance",
      name: "Marketing Claim Guidance",
      summary:
        "Internal-only claim guidance — what can be said, what is restricted, what must not be claimed. Per claim, with rationale.",
      formats: ["DOCX", "XLSX", "PDF"],
      primaryFormat: "DOCX",
      templateState: "AG curated · v2",
      approval: "NDA controls",
      composedFrom: ["Approved proof", "Restricted reuse", "Unsupported claims"],
    },
    {
      id: "dir-mkt-register",
      name: "Approved / Restricted Claims Register",
      summary:
        "Spreadsheet register for marketing operations. Each row is one claim with its source trace, audience, and expiry.",
      formats: ["XLSX", "PDF"],
      primaryFormat: "XLSX",
      templateState: "AG curated",
      approval: "Source-traced",
      composedFrom: ["Claims library", "Audience controls", "Source trace"],
    },
  ],
  commercial: [
    {
      id: "dir-comm-brief",
      name: "Commercial Sales Enablement Brief",
      summary:
        "Pursuit-team brief: sales-safe proof, claims to avoid, buyer objection support. Internal-only.",
      formats: ["PPTX", "PDF"],
      primaryFormat: "PPTX",
      templateState: "AG curated · v2",
      approval: "Source-traced",
      composedFrom: ["Sales-safe proof", "Claims to avoid", "Buyer objection support"],
    },
    {
      id: "dir-comm-memo",
      name: "Pursuit Risk Memo",
      summary:
        "Memo flagging pursuit-deck claims that fail the restricted-list check, with sales-safe substitutions.",
      formats: ["DOCX", "PDF"],
      primaryFormat: "DOCX",
      templateState: "AG curated",
      approval: "Internal-only",
      composedFrom: ["Pursuit decks", "Restricted list", "Substitutions"],
    },
  ],
  delivery: [
    {
      id: "dir-del-grid",
      name: "Delivery Proof Request Grid",
      summary:
        "Per-account proof request grid: which delivery outcomes AR needs cleared, with owners and dates.",
      formats: ["XLSX", "DOCX"],
      primaryFormat: "XLSX",
      templateState: "AG curated · v2",
      approval: "Source-traced",
      composedFrom: ["Delivery updates", "Outcome candidates", "Clearance status"],
    },
    {
      id: "dir-del-memo",
      name: "Delivery Risk Memo",
      summary:
        "Memo describing delivery risks to active references and the contingency reference pool.",
      formats: ["DOCX", "PDF"],
      primaryFormat: "DOCX",
      templateState: "AG curated",
      approval: "NDA controls",
      composedFrom: ["Delivery health", "Reference exposure", "Contingency pool"],
    },
  ],
  regional: [
    {
      id: "dir-reg-brief",
      name: "Regional Analyst Readiness Brief",
      summary:
        "Region-specific brief: which moments hit this region, references cleared for analyst use, regional capability story.",
      formats: ["PPTX", "PDF", "DOCX"],
      primaryFormat: "PPTX",
      templateState: "AG curated · v2",
      approval: "Source-traced",
      composedFrom: ["Regional updates", "Cleared references", "Regional narratives"],
    },
    {
      id: "dir-reg-grid",
      name: "Regional Reference Clearance Grid",
      summary:
        "Spreadsheet of regional references with clearance state and permitted reuse.",
      formats: ["XLSX", "PDF"],
      primaryFormat: "XLSX",
      templateState: "AG curated",
      approval: "Internal-only",
      composedFrom: ["Reference pool", "Clearance state", "Permitted reuse"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Enable — deliverables grouped by Sell vs Build Market Presence
// ---------------------------------------------------------------------------

export const ENABLE_SELL_DELIVERABLES: DeliverableTemplate[] = [
  {
    id: "sell-proof-pack",
    name: "Sales-Safe Proof Pack",
    summary:
      "Curated set of cleared proof snippets for buyer-facing use. Each snippet shows audience controls and source trace.",
    formats: ["PPTX", "PDF"],
    primaryFormat: "PPTX",
    templateState: "AG curated · v2",
    approval: "Source-traced",
    composedFrom: ["Approved proof", "Audience controls", "Source trace"],
  },
  {
    id: "sell-approved-claims",
    name: "Approved Claims Sheet",
    summary:
      "Spreadsheet of approved claims, with permitted audience, source, and expiry. For deal-room reuse.",
    formats: ["XLSX", "PDF"],
    primaryFormat: "XLSX",
    templateState: "AG curated · v2",
    approval: "Source-traced",
    composedFrom: ["Approved claims", "Permitted audiences", "Expiry"],
  },
  {
    id: "sell-claims-avoid",
    name: "Claims to Avoid / Restricted Claims Register",
    summary:
      "Register of claims that are restricted, unsupported, or NDA-bound — with rationale and substitutions.",
    formats: ["XLSX", "PDF"],
    primaryFormat: "XLSX",
    templateState: "AG curated · v2",
    approval: "NDA controls",
    composedFrom: ["Claims to avoid", "Restricted list", "Substitutions"],
  },
  {
    id: "sell-credibility",
    name: "Analyst Credibility One-Pager",
    summary:
      "One-pager summarising the analyst recognition Northstar can safely reference. Internal-only briefing aid.",
    formats: ["DOCX", "PDF"],
    primaryFormat: "PDF",
    templateState: "AG curated",
    approval: "Source-traced",
    composedFrom: ["Recognition snippets", "Permitted reuse", "Source trace"],
  },
  {
    id: "sell-objection",
    name: "Buyer Objection Support Sheet",
    summary:
      "For each common objection, the cleared proof points that respond — and the claims to hold back.",
    formats: ["XLSX", "DOCX", "PDF"],
    primaryFormat: "XLSX",
    templateState: "Beta template",
    approval: "Internal-only",
    composedFrom: ["Buyer objections", "Cleared responses", "Held-back claims"],
  },
  {
    id: "sell-talking-points",
    name: "Commercial Talking-Points Brief",
    summary:
      "Concise brief for pursuit leaders. Sales-safe story arcs, with restricted claims flagged in-line.",
    formats: ["PPTX", "DOCX", "PDF"],
    primaryFormat: "DOCX",
    templateState: "AG curated · v2",
    approval: "Source-traced",
    composedFrom: ["Talking points", "Restricted flags", "Cleared substitutions"],
  },
];

export const ENABLE_PRESENCE_DELIVERABLES: DeliverableTemplate[] = [
  {
    id: "pres-mkt-guidance",
    name: "Internal Marketing Guidance Memo",
    summary:
      "Memo telling internal marketing what story is landing, what to hold back, and what proof can support it. Internal-only.",
    formats: ["DOCX", "PDF"],
    primaryFormat: "DOCX",
    templateState: "AG curated · v2",
    approval: "Internal-only",
    composedFrom: ["Narratives", "Proof status", "Hold-back claims"],
  },
  {
    id: "pres-leadership",
    name: "Thought Leadership Opportunity Brief",
    summary:
      "Briefing-grade prompts for AR + Strategy + Marketing. Internal direction only — not a public campaign.",
    formats: ["PPTX", "PDF"],
    primaryFormat: "PPTX",
    templateState: "AG curated",
    approval: "Internal-only",
    composedFrom: ["Opportunity prompts", "Owner suggestions", "Briefing scope"],
  },
  {
    id: "pres-gap-report",
    name: "Market Presence Gap Report",
    summary:
      "Where the story isn't landing, with AR's view of why and what would close each gap. Briefing-grade.",
    formats: ["DOCX", "PDF"],
    primaryFormat: "PDF",
    templateState: "AG curated · v2",
    approval: "Source-traced",
    composedFrom: ["Presence gaps", "AR rationale", "Closure suggestions"],
  },
  {
    id: "pres-claims-register",
    name: "Approved / Restricted Claims Register",
    summary:
      "Same canonical register used in Sell, scoped to marketing-facing claims. Audience and expiry tracked.",
    formats: ["XLSX", "PDF"],
    primaryFormat: "XLSX",
    templateState: "AG curated · v2",
    approval: "NDA controls",
    composedFrom: ["Claims library", "Audience controls", "Expiry"],
  },
  {
    id: "pres-narrative-map",
    name: "Analyst-Resonant Narrative Map",
    summary:
      "Map of the narratives analysts are currently weighing, with Northstar's proof coverage per narrative.",
    formats: ["PPTX", "PDF"],
    primaryFormat: "PPTX",
    templateState: "AG curated",
    approval: "Source-traced",
    composedFrom: ["Narratives", "Proof coverage", "Owner"],
  },
  {
    id: "pres-recognition",
    name: "Recognition Usage Guidance",
    summary:
      "How (and how not) to use analyst recognition in internal and approved buyer-facing channels.",
    formats: ["DOCX", "PDF"],
    primaryFormat: "DOCX",
    templateState: "AG curated · v2",
    approval: "NDA controls",
    composedFrom: ["Recognition snippets", "Permitted channels", "Restricted use"],
  },
];

export const ENABLE_DELIVERABLES_NOTE =
  "Enable produces internal guidance and controlled proof / claim artefacts. Public campaign assets are out of scope in MVP.";

export const DIRECT_DELIVERABLES_NOTE =
  "Deliverables are AnalystGenius-controlled templates. Custom template authoring is out of scope in MVP.";
