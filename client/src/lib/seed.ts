// Seed data for Northstar Digital Services — fictional IT services vendor

export type Tier = "Tier 1" | "Tier 2" | "Tier 3";
export type Stance =
  | "Friendly"
  | "Neutral"
  | "Inattentive"
  | "Irrelevant"
  | "Combative"
  | "Unknown";
export type Rating = "A+" | "A" | "B+" | "B";
export type ReadinessBand =
  | "Strong"
  | "Adequate"
  | "Weak"
  | "Missing"
  | "Unsupported";

export const ANALYST_HOUSES = [
  { id: "gartner", name: "Gartner", tier: "Tier 1", model: "Magic Quadrant" },
  { id: "forrester", name: "Forrester", tier: "Tier 1", model: "Wave" },
  { id: "idc", name: "IDC", tier: "Tier 1", model: "MarketScape" },
  { id: "everest", name: "Everest Group", tier: "Tier 2", model: "PEAK Matrix" },
  { id: "hfs", name: "HFS Research", tier: "Tier 2", model: "Horizons" },
  { id: "nelsonhall", name: "NelsonHall", tier: "Tier 2", model: "NEAT" },
  { id: "isg", name: "ISG", tier: "Tier 2", model: "Provider Lens" },
] as const;

export type Analyst = {
  id: string;
  name: string;
  initials: string;
  house: string;
  houseTier: Tier;
  role: string;
  rating: Rating;
  confidence: number; // 0..1
  stance: Stance;
  stanceConfidence: number;
  coverage: string[];
  lastInteraction: string;
  source: "External import" | "Public discovery" | "Customer sync" | "User added";
  override?: boolean;
};

export const ANALYSTS: Analyst[] = [
  {
    id: "a1",
    name: "Priya Subramanian",
    initials: "PS",
    house: "Gartner",
    houseTier: "Tier 1",
    role: "VP Analyst, Application Services",
    rating: "A+",
    confidence: 0.92,
    stance: "Friendly",
    stanceConfidence: 0.78,
    coverage: ["App Modernisation", "Cloud Native"],
    lastInteraction: "9 days ago",
    source: "External import",
  },
  {
    id: "a2",
    name: "Marcus Halberg",
    initials: "MH",
    house: "Gartner",
    houseTier: "Tier 1",
    role: "Sr Director Analyst, Outsourcing",
    rating: "A",
    confidence: 0.88,
    stance: "Neutral",
    stanceConfidence: 0.62,
    coverage: ["IT Outsourcing", "Managed Services"],
    lastInteraction: "31 days ago",
    source: "External import",
  },
  {
    id: "a3",
    name: "Jia Wen Chen",
    initials: "JC",
    house: "Forrester",
    houseTier: "Tier 1",
    role: "Principal Analyst, Modern Application Dev",
    rating: "A",
    confidence: 0.85,
    stance: "Inattentive",
    stanceConfidence: 0.55,
    coverage: ["DevOps", "Platform Engineering"],
    lastInteraction: "62 days ago",
    source: "Public discovery",
  },
  {
    id: "a4",
    name: "Robert Allnatt",
    initials: "RA",
    house: "Forrester",
    houseTier: "Tier 1",
    role: "VP, Principal Analyst",
    rating: "B+",
    confidence: 0.74,
    stance: "Unknown",
    stanceConfidence: 0.40,
    coverage: ["Digital Engineering"],
    lastInteraction: "Never",
    source: "Public discovery",
  },
  {
    id: "a5",
    name: "Aditi Rao",
    initials: "AR",
    house: "IDC",
    houseTier: "Tier 1",
    role: "Research Director, Services",
    rating: "A",
    confidence: 0.81,
    stance: "Friendly",
    stanceConfidence: 0.72,
    coverage: ["AI Services", "Digital Workplace"],
    lastInteraction: "14 days ago",
    source: "External import",
  },
  {
    id: "a6",
    name: "Tomás Bauer",
    initials: "TB",
    house: "Everest Group",
    houseTier: "Tier 2",
    role: "Practice Director, Digital",
    rating: "A",
    confidence: 0.83,
    stance: "Friendly",
    stanceConfidence: 0.81,
    coverage: ["BFSI Services", "PEAK Matrix"],
    lastInteraction: "6 days ago",
    source: "External import",
  },
  {
    id: "a7",
    name: "Saurabh Khanna",
    initials: "SK",
    house: "HFS Research",
    houseTier: "Tier 2",
    role: "Practice Leader, OneOffice",
    rating: "B+",
    confidence: 0.70,
    stance: "Combative",
    stanceConfidence: 0.58,
    coverage: ["BPO", "OneEcosystem"],
    lastInteraction: "21 days ago",
    source: "Public discovery",
  },
  {
    id: "a8",
    name: "Elena Petrova",
    initials: "EP",
    house: "NelsonHall",
    houseTier: "Tier 2",
    role: "Research Director, NEAT",
    rating: "B+",
    confidence: 0.72,
    stance: "Neutral",
    stanceConfidence: 0.60,
    coverage: ["Customer Experience Services"],
    lastInteraction: "44 days ago",
    source: "Customer sync",
  },
  {
    id: "a9",
    name: "James Okafor",
    initials: "JO",
    house: "ISG",
    houseTier: "Tier 2",
    role: "Partner, Provider Lens",
    rating: "B",
    confidence: 0.66,
    stance: "Irrelevant",
    stanceConfidence: 0.50,
    coverage: ["Sourcing Advisory"],
    lastInteraction: "Never",
    source: "Public discovery",
  },
];

export type Workstream = {
  id: string;
  title: string;
  house: string;
  model: string;
  owner: string;
  due: string;
  progress: number; // 0..100
  status: "On track" | "At risk" | "Blocked" | "Submitted";
  readiness: ReadinessBand;
  analystIds: string[];
};

export const WORKSTREAMS: Workstream[] = [
  {
    id: "w1",
    title: "Gartner MQ — Application Modernisation 2026",
    house: "Gartner",
    model: "Magic Quadrant",
    owner: "Mireille Okonkwo",
    due: "12 Jun",
    progress: 62,
    status: "On track",
    readiness: "Adequate",
    analystIds: ["a1", "a2"],
  },
  {
    id: "w2",
    title: "Forrester Wave — Modern Application Development Services",
    house: "Forrester",
    model: "Wave",
    owner: "Dev Patel",
    due: "28 May",
    progress: 41,
    status: "At risk",
    readiness: "Weak",
    analystIds: ["a3", "a4"],
  },
  {
    id: "w3",
    title: "Everest PEAK Matrix — BFSI IT Services",
    house: "Everest Group",
    model: "PEAK Matrix",
    owner: "Ana Reis",
    due: "19 Jun",
    progress: 78,
    status: "On track",
    readiness: "Strong",
    analystIds: ["a6"],
  },
  {
    id: "w4",
    title: "HFS Horizons — Generative Enterprise Services",
    house: "HFS Research",
    model: "Horizons",
    owner: "Mireille Okonkwo",
    due: "05 Jul",
    progress: 24,
    status: "Blocked",
    readiness: "Missing",
    analystIds: ["a7"],
  },
  {
    id: "w5",
    title: "IDC MarketScape — AI Services Worldwide",
    house: "IDC",
    model: "MarketScape",
    owner: "Hideo Tanaka",
    due: "30 May",
    progress: 88,
    status: "Submitted",
    readiness: "Strong",
    analystIds: ["a5"],
  },
];

export type SuggestedTask = {
  id: string;
  title: string;
  workstreamId: string;
  due: string;
  basis: string;
  confidence: number;
  source: string;
};

export const SUGGESTED_TASKS: SuggestedTask[] = [
  {
    id: "t1",
    title: "Schedule 30-min briefing with Priya Subramanian on App Modernisation case studies",
    workstreamId: "w1",
    due: "in 4 days",
    basis: "RFI section 3.2 references 2 anonymised clients — Gartner historically requires 5+ named references for Leader placement.",
    confidence: 0.81,
    source: "Gartner MQ — App Modernisation RFI draft v3",
  },
  {
    id: "t2",
    title: "Source proof point on BFSI AI Co-pilot deployment for Forrester Wave",
    workstreamId: "w2",
    due: "in 9 days",
    basis: "Wave criterion 'AI-assisted dev tooling' is currently Unsupported. Sales pipeline shows 2 active BFSI AI Co-pilot deals.",
    confidence: 0.73,
    source: "Forrester Wave criteria checklist",
  },
  {
    id: "t3",
    title: "Confirm OneEcosystem narrative for HFS Horizons RFI",
    workstreamId: "w4",
    due: "in 2 days",
    basis: "Draft RFI section on partner ecosystem mentions 2 hyperscaler partners only. HFS OneEcosystem framework expects multi-tier ecosystem narrative.",
    confidence: 0.86,
    source: "HFS Horizons RFI draft v1",
  },
  {
    id: "t4",
    title: "Capture interaction record for Tomás Bauer briefing on 06 May",
    workstreamId: "w3",
    due: "overdue 1 day",
    basis: "Calendar event 'Northstar / Everest BFSI deep-dive' marked complete; no interaction record logged.",
    confidence: 0.92,
    source: "Calendar sync",
  },
];

export type EvidenceItem = {
  id: string;
  title: string;
  type: "Case study" | "Metric" | "Client reference" | "Capability proof" | "Outcome";
  workstreamId: string;
  readiness: ReadinessBand;
  reuse: string;
  status: "Suggested" | "Approved" | "Approved with restrictions" | "Rejected";
  provenance: string;
  confidence: number;
};

export const EVIDENCE: EvidenceItem[] = [
  {
    id: "e1",
    title: "BFSI Core Modernisation — 38% TCO reduction over 24 months",
    type: "Outcome",
    workstreamId: "w1",
    readiness: "Strong",
    reuse: "Analyst briefing approved under NDA",
    status: "Approved",
    provenance: "Q3 2025 case study, Marketing approved, customer-named",
    confidence: 0.91,
  },
  {
    id: "e2",
    title: "Retail AI Co-pilot pilot — 11% release velocity uplift",
    type: "Metric",
    workstreamId: "w2",
    readiness: "Adequate",
    reuse: "Internal only",
    status: "Suggested",
    provenance: "Extracted from SharePoint: Retail Practice QBR Q1 2026",
    confidence: 0.72,
  },
  {
    id: "e3",
    title: "Insurer claims automation — 4 weeks to production",
    type: "Case study",
    workstreamId: "w3",
    readiness: "Strong",
    reuse: "RFI approved",
    status: "Approved",
    provenance: "Approved RFI library, last refreshed 18 Apr 2026",
    confidence: 0.89,
  },
  {
    id: "e4",
    title: "OneEcosystem partner narrative — proposed",
    type: "Capability proof",
    workstreamId: "w4",
    readiness: "Weak",
    reuse: "Internal only",
    status: "Suggested",
    provenance: "Drafted by AR Superhero from public partner page + 3 internal QBRs",
    confidence: 0.61,
  },
  {
    id: "e5",
    title: "Generative AI delivery factory — headcount + cities",
    type: "Capability proof",
    workstreamId: "w5",
    readiness: "Adequate",
    reuse: "Analyst briefing approved no NDA required",
    status: "Approved with restrictions",
    provenance: "HR system sync — restricted to country-level numbers only",
    confidence: 0.79,
  },
];

export type IntelSignal = {
  id: string;
  title: string;
  source: string;
  when: string;
  type: "Public" | "Internal sync" | "AR platform" | "Email";
  workstreamId?: string;
  summary: string;
  needsConfirmation?: boolean;
};

export const SIGNALS: IntelSignal[] = [
  {
    id: "s1",
    title: "Gartner research note published: 'How to Win in App Modernisation 2026'",
    source: "Gartner.com",
    when: "2 hours ago",
    type: "Public",
    workstreamId: "w1",
    summary:
      "Note emphasises composable architectures and named refactor playbooks. Mentions 3 competitors; Northstar Digital not referenced.",
  },
  {
    id: "s2",
    title: "Saurabh Khanna (HFS) — LinkedIn post on OneEcosystem maturity",
    source: "LinkedIn (public)",
    when: "5 hours ago",
    type: "Public",
    workstreamId: "w4",
    summary:
      "Argues that 70%+ of vendors underweight internal-business-unit collaboration; calls for tighter partner + internal motion.",
  },
  {
    id: "s3",
    title: "Briefing held: Tomás Bauer / Everest — BFSI deep dive",
    source: "Calendar + Spotlight Analyst Portals",
    when: "Yesterday",
    type: "AR platform",
    workstreamId: "w3",
    summary:
      "Candidate interaction record auto-created from calendar + Spotlight. Three follow-ups proposed.",
    needsConfirmation: true,
  },
  {
    id: "s4",
    title: "Inbound email: Priya Subramanian — RFI clarification",
    source: "AR shared mailbox",
    when: "Yesterday",
    type: "Email",
    workstreamId: "w1",
    summary:
      "Requests 2 additional named references in EMEA Banking. Suggested task created.",
  },
  {
    id: "s5",
    title: "ARchitect: Forrester Wave inclusion confirmed",
    source: "ARchitect / ARInsights",
    when: "3 days ago",
    type: "AR platform",
    workstreamId: "w2",
    summary: "Status field synced from ARchitect. Workstream auto-linked.",
  },
];

export type LearningItem = {
  id: string;
  signal: string;
  state:
    | "Raw signal"
    | "Candidate pattern"
    | "Watchlist"
    | "Validated pattern"
    | "Deprecated pattern"
    | "Rejected signal";
  scope: string;
  anonymised: boolean;
  reviewer: string;
};

export const LEARNING: LearningItem[] = [
  {
    id: "l1",
    signal:
      "HFS RFIs scoring 'Strong' more often when partner narrative covers 3+ ecosystem tiers (hyperscaler, ISV, regional)",
    state: "Candidate pattern",
    scope: "HFS Horizons — all vendors",
    anonymised: true,
    reviewer: "Awaiting AnalystGenius head researcher",
  },
  {
    id: "l2",
    signal:
      "Gartner MQ App Modernisation: named references in 3+ regions correlated with movement towards Leader quadrant",
    state: "Validated pattern",
    scope: "Gartner MQ — App Modernisation",
    anonymised: true,
    reviewer: "Cross-checked by AnalystGenius",
  },
  {
    id: "l3",
    signal:
      "Forrester Wave: vendors who decline strategy demo lose 1-2 criteria score points on average",
    state: "Watchlist",
    scope: "Forrester Wave — services categories",
    anonymised: true,
    reviewer: "AnalystGenius monitoring",
  },
  {
    id: "l4",
    signal:
      "Everest PEAK BFSI: AI-assisted operations evidence weighs heavier in 2026 cycle",
    state: "Raw signal",
    scope: "Everest PEAK BFSI",
    anonymised: true,
    reviewer: "Not yet reviewed",
  },
];

export type Integration = {
  id: string;
  name: string;
  category:
    | "Public intelligence"
    | "AR platform"
    | "Document store"
    | "Email & calendar";
  mode: "Read-only" | "Continuous sync" | "Off";
  scope: string;
  lastSync: string;
  enabled: boolean;
};

export const INTEGRATIONS: Integration[] = [
  { id: "i1", name: "Gartner.com public", category: "Public intelligence", mode: "Continuous sync", scope: "Watched analysts + Magic Quadrants", lastSync: "12m ago", enabled: true },
  { id: "i2", name: "Forrester.com public", category: "Public intelligence", mode: "Continuous sync", scope: "Watched analysts + Wave categories", lastSync: "18m ago", enabled: true },
  { id: "i3", name: "HFS Research public", category: "Public intelligence", mode: "Continuous sync", scope: "OneOffice + Horizons", lastSync: "1h ago", enabled: true },
  { id: "i4", name: "LinkedIn public posts", category: "Public intelligence", mode: "Continuous sync", scope: "Watched analyst list", lastSync: "23m ago", enabled: true },

  { id: "i5", name: "ARchitect / ARInsights", category: "AR platform", mode: "Read-only", scope: "All workstreams, interactions", lastSync: "42m ago", enabled: true },
  { id: "i6", name: "AR Connect", category: "AR platform", mode: "Read-only", scope: "Briefing requests", lastSync: "1h ago", enabled: true },
  { id: "i7", name: "Spotlight Oz", category: "AR platform", mode: "Read-only", scope: "ANZ analysts", lastSync: "2h ago", enabled: false },
  { id: "i8", name: "Spotlight Analyst Portals", category: "AR platform", mode: "Continuous sync", scope: "Active assessments", lastSync: "37m ago", enabled: true },

  { id: "i9", name: "SharePoint — AR Workspace", category: "Document store", mode: "Read-only", scope: "/AR Submissions, /Case Studies", lastSync: "5m ago", enabled: true },
  { id: "i10", name: "OneDrive", category: "Document store", mode: "Read-only", scope: "AR team folder", lastSync: "11m ago", enabled: true },
  { id: "i11", name: "Google Drive", category: "Document store", mode: "Off", scope: "—", lastSync: "—", enabled: false },
  { id: "i12", name: "Box", category: "Document store", mode: "Off", scope: "—", lastSync: "—", enabled: false },
  { id: "i13", name: "Dropbox", category: "Document store", mode: "Off", scope: "—", lastSync: "—", enabled: false },

  { id: "i14", name: "AR shared mailbox", category: "Email & calendar", mode: "Continuous sync", scope: "ar@northstar.example", lastSync: "4m ago", enabled: true },
  { id: "i15", name: "AR team calendars", category: "Email & calendar", mode: "Continuous sync", scope: "5 calendars", lastSync: "4m ago", enabled: true },
];

export const STANCE_OPTIONS: Stance[] = [
  "Friendly",
  "Neutral",
  "Inattentive",
  "Irrelevant",
  "Combative",
  "Unknown",
];

export const READINESS_BANDS: ReadinessBand[] = [
  "Strong",
  "Adequate",
  "Weak",
  "Missing",
  "Unsupported",
];

export const LENSES = [
  {
    id: "strategy",
    name: "Strategy",
    summary:
      "Northstar's analyst-visible strategy must over-index on App Modernisation and BFSI AI Operations. Two flagship assessments (Gartner MQ, Everest PEAK BFSI) align with stated FY26 priorities; HFS Horizons is the outlier requiring a sharper ecosystem narrative.",
    points: [
      "Sequence Gartner MQ as anchor narrative — leader-band positioning supports 3 downstream RFIs.",
      "Re-state BFSI AI Operations point of view in time for Forrester Wave and IDC MarketScape (overlap window: 4 weeks).",
      "Decide whether to pursue HFS Horizons in this cycle or defer; current readiness is Weak/Missing on OneEcosystem narrative.",
    ],
  },
  {
    id: "executive",
    name: "Executive",
    summary:
      "Three of five active assessments are on or ahead of plan. One (Forrester Wave) is At risk; one (HFS Horizons) is Blocked. Recommend a 20-minute exec review focused on Wave evidence gaps and HFS go/no-go.",
    points: [
      "Pipeline: 5 active assessments, 1 submitted, 0 declined.",
      "Risk: 2 assessments dependent on the same 2 BFSI references — concentration risk.",
      "Investment ask: 1 strategy session with AnalystGenius on HFS Horizons before next sprint.",
    ],
  },
  {
    id: "product",
    name: "Product",
    summary:
      "Capability and evidence gaps cluster around AI-assisted developer tooling and partner-led delivery. No roadmap recommendations are made here — gaps below should be reviewed with Product leadership and AnalystGenius analysts.",
    points: [
      "Capability gap: AI-assisted developer co-pilot — proof points exist as pilots only.",
      "Evidence gap: Multi-tier partner delivery — minimal documented client outcomes.",
      "Suggested next step: schedule a strategy session with AnalystGenius on Horizons readiness.",
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    summary:
      "Internal marketing guidance only. Storylines that resonate in current analyst inquiries should be reflected in internal sales-enablement and analyst briefing materials — not in external campaigns.",
    points: [
      "Sharpen internal narrative on App Modernisation — Gartner inquiries trending up 22% QoQ.",
      "Reposition BFSI AI co-pilot collateral for analyst briefings; existing pieces are too sales-led.",
      "Do not externalise analyst quotes without explicit approval (NDA controls apply).",
    ],
  },
  {
    id: "commercial",
    name: "Commercial",
    summary:
      "Analyst influence enablement for internal sales leaders. Focus is on shaping how analyst positioning is used inside the sales motion, not on deal-room intelligence or competitor deal dynamics.",
    points: [
      "Equip BFSI sales leaders with 2-pager on Northstar's analyst visibility (Gartner, Everest, IDC).",
      "Brief North America Banking pursuit team ahead of 2 named pursuits; reference 3 approved evidence items.",
      "Flag: Restrict use of NDA-only analyst quotes in commercial conversations.",
    ],
  },
];
