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
    personas: ["executive", "strategy", "product", "regional"],
    intel: [
      "Questions analysts are likely to ask (AG suggested questions)",
      "Narrative–reality divergences (probe areas)",
      "House exec-briefing do's and don'ts (playbook)",
      "Role-scoped exposures",
    ],
    houseScoped: true,
  },
  {
    id: "assessment-kickoff",
    label: "Assessment cycle kick-off",
    when: "An evaluation window is opening — align the team on what moves the ranking.",
    personas: ["executive", "strategy", "product", "delivery"],
    intel: [
      "What moves rankings at this house (playbook)",
      "Learned-from-results observations (your cycles)",
      "Competitive positions entering the cycle",
      "RFI-stage do's (playbook)",
    ],
    houseScoped: true,
  },
  {
    id: "competitive-shift",
    label: "Competitive shift response",
    when: "A competitor moved — sizing the shift and the counter-evidence.",
    personas: ["executive", "strategy", "commercial", "marketing"],
    intel: [
      "Competitor score chart (assessment + AI readiness)",
      "Per-competitor narrative gap directions",
      "Competitors-scoring-ahead exposures",
      "Divergence themes to contest",
    ],
    houseScoped: false,
  },
  {
    id: "reputation-pulse",
    label: "Reputation pulse check",
    when: "Sentiment moved on a lens you own — the trend, the driver, the response.",
    personas: ["executive", "marketing", "commercial", "delivery"],
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
    personas: ["marketing", "strategy"],
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
    personas: ["commercial", "regional"],
    intel: [
      "Competitor comparison chart",
      "Provable strengths (AG snapshot)",
      "Customer + pricing lens state",
      "Claims at risk if the story is over-hyped",
    ],
    houseScoped: false,
  },
  {
    id: "leadership-onboarding",
    label: "Leadership onboarding landscape",
    when: "A new leader needs the analyst-market landscape in one pass.",
    personas: ["executive", "delivery", "regional"],
    intel: [
      "Focal profile (reported revenue, growth, scale)",
      "Full reputation lens table",
      "Top strengths and flagged risks",
      "Competitive field chart",
    ],
    houseScoped: false,
  },
];

export function scenariosForPersona(personaId: ScenarioPersonaId): BriefingScenario[] {
  return BRIEFING_SCENARIOS.filter((s) => s.personas.includes(personaId));
}

export function scenarioById(id: string): BriefingScenario | undefined {
  return BRIEFING_SCENARIOS.find((s) => s.id === id);
}
