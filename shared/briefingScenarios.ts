// ============================================================================
// Persona briefing scenarios — the situations in which each stakeholder needs
// an analyst market-update briefing, and the AG intelligence each one draws on.
//
// Scenario research basis: the four engagement moments and stakeholder-lens
// model already in the app, the owner playbook documents (movement drivers,
// confidence factor), and the live AG signal set (snapshot, narrative–reality
// gap, reputation trends, competitor reads). Every scenario lists the REAL
// intel blocks its deck pulls — decks render only live values, with honest
// fallbacks when a signal is unavailable.
// ============================================================================

export type PersonaScenarioId =
  | "quarterly-update"
  | "pre-briefing-prep"
  | "assessment-kickoff"
  | "competitive-shift"
  | "reputation-pulse"
  | "narrative-campaign"
  | "deal-support"
  | "leadership-onboarding";

// Mirrors the Direct lens ids / deck PersonaIds.
export type ScenarioPersonaId =
  | "executive"
  | "strategy"
  | "product"
  | "marketing"
  | "commercial"
  | "delivery"
  | "regional";

export interface BriefingScenario {
  id: PersonaScenarioId;
  label: string;
  /** When a stakeholder reaches for this briefing. */
  when: string;
  /** Personas this scenario applies to. */
  personas: ScenarioPersonaId[];
  /** The AG intel blocks the deck draws on — shown in the picker. */
  intel: string[];
  /** True when the deck also needs an analyst-house context (playbook tie-in). */
  houseScoped: boolean;
  /**
   * False hides the scenario from the Direct stakeholder deck-creation menu
   * while leaving the deck itself fully generatable (scenarioById still
   * resolves it, the API still builds it). Defaults to visible when omitted.
   */
  showInDirectMenu?: boolean;
}

export const BRIEFING_SCENARIOS: BriefingScenario[] = [
  {
    id: "quarterly-update",
    label: "Quarterly market update",
    when: "The regular cadence read — where the market, the scores and the story moved this quarter.",
    personas: ["executive", "strategy", "product", "marketing", "commercial", "delivery", "regional"],
    intel: [
      "Focal assessment + AI-readiness scores",
      "Quarterly revenue trend (reported)",
      "Reputation lens movement",
      "Competitive score chart",
      "Narrative–reality gap direction",
    ],
    houseScoped: false,
  },
  {
    id: "pre-briefing-prep",
    label: "Pre-briefing preparation",
    when: "An analyst–exec briefing is coming up — what they will probe and how to answer.",
    // Delivery and commercial added: analysts probe delivery models and client
    // references hardest in briefings, and those leaders are routinely in the
    // room to answer for them.
    personas: ["executive", "strategy", "product", "regional", "delivery", "commercial"],
    intel: [
      "Questions analysts are likely to ask (AG suggested questions)",
      "Narrative–reality divergences (probe areas)",
      "House exec-briefing do's and don'ts (playbook)",
      "Role-scoped exposures",
      "This house's published placements for you and your peers",
    ],
    houseScoped: true,
  },
  {
    id: "assessment-kickoff",
    label: "Assessment cycle kick-off",
    when: "An evaluation window is opening — align the team on what moves the ranking.",
    // Commercial and marketing added: commercial supplies the client references
    // that decide most assessments, and marketing owns the narrative that gets
    // submitted. Excluding them from the kick-off is how submissions stall.
    // Regional included: several houses run country-scoped studies (ISG
    // Provider Lens has Australia / Brazil / UK editions), so a geography lead
    // owns their own assessment cycle.
    personas: ["executive", "strategy", "product", "delivery", "commercial", "marketing", "regional"],
    intel: [
      "What moves rankings at this house (playbook)",
      "Your published placement history with this house (2 years)",
      "Peer placements with this house entering the cycle",
      "Learned-from-results observations (your cycles)",
      "Competitive positions entering the cycle",
      "RFI-stage do's (playbook)",
    ],
    houseScoped: true,
    // Withdrawn from the Direct stakeholder menu (owner request). The deck and
    // its house-scoped placement record remain available via the API.
    showInDirectMenu: false,
  },
  {
    id: "competitive-shift",
    label: "Competitive shift response",
    when: "A competitor moved — sizing the shift and the counter-evidence.",
    // Product added: a competitor capability move lands on the service-line
    // owner, who has to answer it with evidence.
    // Regional included: competitor moves are often region-specific, and the
    // geography lead is the one who meets them in-market.
    personas: ["executive", "strategy", "commercial", "marketing", "product", "regional"],
    intel: [
      "Competitor score chart (assessment + AI readiness)",
      "Per-competitor narrative gap directions",
      "Competitors-scoring-ahead exposures",
      "Divergence themes to contest",
      "Competitor placements published in the last two years",
    ],
    houseScoped: false,
  },
  {
    id: "reputation-pulse",
    label: "Reputation pulse check",
    when: "Sentiment moved on a lens you own — the trend, the driver, the response.",
    // Strategy added: reputation trajectory is a direct input to positioning.
    personas: ["executive", "marketing", "commercial", "delivery", "strategy"],
    intel: [
      "Seven-lens sentiment trend chart (full series)",
      "Falling / rising lens callouts",
      "AG reputation insight (verbatim)",
      "Lens-owner actions",
    ],
    houseScoped: false,
  },
  {
    id: "narrative-campaign",
    label: "Narrative campaign planning",
    when: "Building the next narrative push — where the story lags the measured reality.",
    // Product added: capability narrative is co-owned with the service line.
    personas: ["marketing", "strategy", "product"],
    intel: [
      "Per-house narrative sentiment + volume chart",
      "Narrative themes in circulation",
      "Under-recognized gap as the campaign spine",
      "Divergence interpretations",
    ],
    houseScoped: false,
  },
  {
    id: "deal-support",
    label: "Deal support brief",
    when: "A major pursuit needs analyst-grade positioning against named competitors.",
    // Delivery added: delivery credibility is what a major pursuit turns on
    // once the commercial case is made.
    personas: ["commercial", "regional", "delivery"],
    intel: [
      "Competitor comparison chart",
      "Provable strengths (AG snapshot)",
      "Customer + pricing lens state",
      "Claims at risk if the story is over-hyped",
      "Published analyst placements usable as third-party proof",
    ],
    houseScoped: false,
  },
  {
    id: "leadership-onboarding",
    label: "Leadership onboarding landscape",
    when: "A new leader needs the analyst-market landscape in one pass.",
    // Every persona: an incoming leader in ANY function needs the landscape.
    // That is the whole point of an onboarding read.
    personas: ["executive", "delivery", "regional", "strategy", "product", "marketing", "commercial"],
    intel: [
      "Focal profile (reported revenue, growth, scale)",
      "Full reputation lens table",
      "Top strengths and flagged risks",
      "Competitive field chart",
      "Two-year published analyst placement record",
    ],
    houseScoped: false,
  },
];

/**
 * Scenarios offered in the Direct stakeholder deck-creation menu for a persona.
 * Excludes any scenario flagged showInDirectMenu: false — those decks still
 * exist and still generate, they are just not offered here.
 */
export function scenariosForPersona(personaId: ScenarioPersonaId): BriefingScenario[] {
  return BRIEFING_SCENARIOS.filter(
    (s) => s.showInDirectMenu !== false && s.personas.includes(personaId)
  );
}

export function scenarioById(id: string): BriefingScenario | undefined {
  return BRIEFING_SCENARIOS.find((s) => s.id === id);
}
