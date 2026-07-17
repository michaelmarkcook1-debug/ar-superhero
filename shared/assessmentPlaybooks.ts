// ============================================================================
// Assessment leadership playbooks.
//
// One playbook per analyst house: how to reach the leadership position in that
// house's flagship evaluation, with stage-level guidance for the four
// engagement moments every assessment runs through:
//   RFI response → client reference calls → briefing deck → analyst–exec briefing
//
// CONTENT SOURCE: owner-supplied document "Analyst house best practice for
// AR Superhero.docx" (publicly available methodology and process material from
// the seven firms, checked through 15 July 2026). Content is transcribed
// faithfully — light copy-editing only, no invented guidance. The document's
// own evidence boundary is preserved below and must be shown wherever the
// guidance is used.
// ============================================================================

export type AnalystHouseId =
  | "gartner"
  | "forrester"
  | "idc"
  | "hfs"
  | "nelsonhall"
  | "isg"
  | "everest";

export type EngagementStageId = "rfi" | "client-calls" | "briefing-deck" | "exec-briefing";

export interface EngagementStageDef {
  id: EngagementStageId;
  label: string;
  /** What this moment is, house-agnostic — structural description only. */
  what: string;
}

/** The four engagement moments, in process order. */
export const ENGAGEMENT_STAGES: EngagementStageDef[] = [
  {
    id: "rfi",
    label: "RFI response",
    what: "The structured questionnaire, survey or formal vendor submission used by the firm: capability evidence, metrics, references and claims entered into the evaluation instrument.",
  },
  {
    id: "client-calls",
    label: "Client reference calls",
    what: "Formal references, customer surveys and other customer evidence — the independent proof behind the submission.",
  },
  {
    id: "briefing-deck",
    label: "Briefing deck",
    what: "The presentation material that carries your story into the evaluation briefing.",
  },
  {
    id: "exec-briefing",
    label: "Analyst–exec briefing",
    what: "The live session (including any demonstration) where your executives meet the evaluating analysts.",
  },
];

export interface StageGuidance {
  stage: EngagementStageId;
  /**
   * Directional influence rank within this house (1 = greatest practical
   * influence on a defensible Leader case). Per the source document these are
   * directional operating judgements, NOT published point weights.
   */
  rank?: number;
  /** Published facts about how this house runs this moment. */
  note?: string;
  /** Ordered framework steps for this stage at this house. */
  framework: string[];
  dos: string[];
  donts: string[];
  bestPractices: string[];
}

export interface AssessmentModelInfo {
  /** Flagship evaluation name, e.g. "Magic Quadrant". */
  name: string;
  /** Axis labels [x, y] as published by the house. */
  axes: [string, string];
  /** What the leadership position is called and requires, per the house's published definition. */
  leadership: string;
}

export interface HousePlaybook {
  id: AnalystHouseId;
  house: string;
  assessment: AssessmentModelInfo;
  /** Published leadership lens + overarching theme, from the source document. */
  leadershipFramework: string[];
  /** Stage-level guidance for the four engagement moments. */
  stages: StageGuidance[];
  /** House-level lists that apply across all stages. */
  dos: string[];
  donts: string[];
  bestPractices: string[];
  /**
   * What drives the largest ranking shifts at this house — synthesis from the
   * owner-supplied "What Drives Largest Shifts in Analyst Rankings" document.
   * Directional synthesis of published methodologies, not published weights.
   */
  movementDriver: { headline: string; drivers: string[] };
  /** pending = structure ready, guidance content awaiting the source document. */
  status: "populated" | "pending";
  /** Name of the ingested source document once populated. */
  contentSource: string | null;
}

const SOURCE_DOC =
  "Analyst house best practice for AR Superhero.docx + What_Drives_Largest_Shifts_in_Analyst_Rankings.docx (owner-supplied; public methodology material checked through 15 Jul 2026)";

/**
 * The source document's own evidence boundary — shown wherever the guidance
 * is used. Preserved so the playbook never over-claims its basis.
 */
export const EVIDENCE_BOUNDARY: string[] = [
  "No numerical scoring weights have been invented — none of these firms publishes universal weights for RFI versus references versus briefing versus deck.",
  "Component rankings are directional operating judgements based on what each firm says it evaluates and how the inputs are used.",
  "Exact criteria, weightings, inclusion rules and cut-off dates for the individual study always override this general playbook.",
  "Not all of these are literally quadrants: Forrester places vendors in Leader, Strong Performer and Contender bands; HFS uses three Horizons; IDC uses Leaders, Major Players, Contenders and Participants; Everest uses Leaders, Major Contenders and Aspirants.",
  "NelsonHall detail comes from a March 2026 report licensed by NelsonHall for distribution, not an unrestricted methodology page.",
  "Gartner does not publicly disclose one universal RFI process, nor a mandatory vendor-nominated reference-call stage, for every Magic Quadrant.",
  "Movement drivers are a synthesis of published methodologies and long-standing evaluation frameworks — where a firm has not explicitly stated that a factor carries the greatest weight, it is identified as the apparent strongest driver, not presented as fact.",
];

/** The document's executive conclusion — the frame for everything below. */
export const HARD_TRUTH = {
  headline: "You cannot present your way into a leadership position.",
  detail:
    "A strong AR operation makes capabilities easier to understand, prevents factual errors and ensures the best evidence is considered. It cannot sustainably compensate for weak customer outcomes, limited production adoption, poor delivery performance, inconsistent financial or operational data, an unfunded roadmap, or references who do not support the vendor narrative.",
  formula:
    "Leadership = scope fit × current execution × quantified customer value × repeatable scale × credible future direction × evidence consistency. It is effectively multiplicative — if one factor is close to zero, an excellent deck will not rescue the position.",
};

/** Cross-house operating framework — applies to every assessment. */
export const CROSS_HOUSE_FRAMEWORK: { title: string; points: string[] }[] = [
  {
    title: "Create one criterion-level evidence ledger",
    points: [
      "The same ledger should drive the RFI, reference selection, executive preparation, deck and fact review.",
    ],
  },
  {
    title: "Use a disciplined RFI answer pattern",
    points: [
      "Direct answer → evidence → scale → customer outcome → differentiation → future investment → honest limitation.",
      "This prevents three common failures: a long answer that never addresses the criterion; an attractive claim without evidence; a roadmap claim mistaken for current capability.",
    ],
  },
  {
    title: "Select references by relevance, not prestige",
    points: [
      "A strong reference scores well on: exact assessment scope and geography; meaningful production scale; quantified value; breadth of use; strategic and operational visibility; ability to explain your contribution; candour and reliability; no undisclosed critical dispute.",
      "A famous customer that used only a narrow pilot is generally weaker than a less recognisable enterprise that can validate scaled, measurable results.",
    ],
  },
  {
    title: "Maintain one source of truth",
    points: [
      "Revenue, client count, active deployments, growth, headcount and skills, delivery locations, product release dates, investment, case-study outcomes, partner contribution, and current-versus-planned functionality must reconcile across all submissions and conversations.",
      "Analysts reasonably interpret unexplained inconsistencies as either weak operating control or unreliable evidence.",
    ],
  },
  {
    title: "Red-team the executive briefing",
    points: [
      "Test the team against: the weakest criterion; inconsistent numbers; customer complaints; limited geographic coverage; roadmap dependencies; delayed releases; low adoption of purported innovation; competitive disadvantages; unsuccessful implementations; gaps between corporate messaging and actual delivery.",
      "The objective is not to manufacture better answers — it is to eliminate evasive, contradictory or unsupported answers.",
    ],
  },
  {
    title: "Build the deck last",
    points: [
      "Confirm scope and eligibility → identify capability and evidence gaps → improve delivery and customer outcomes → build the evidence ledger → secure appropriate references → complete the structured submission → rehearse the executive session and demonstration → build the deck as the concise navigation layer → conduct a final cross-channel fact check.",
    ],
  },
];

const SOURCE_DOC_SHIFTS =
  "What_Drives_Largest_Shifts_in_Analyst_Rankings.docx (owner-supplied synthesis of published methodologies)";

/**
 * What moves rankings the most across all seven houses — from the
 * owner-supplied shifts document. The biggest movements are almost never
 * caused by one new feature or one great briefing; they happen when analysts
 * become convinced that the market's perception of the vendor has
 * fundamentally changed.
 */
export const UNIVERSAL_SHIFT_DRIVERS: string[] = [
  "Strong customer outcomes validated independently.",
  "Clear execution against current market needs.",
  "Credible, funded future strategy.",
  "Demonstrable market momentum.",
  "Consistent evidence across every interaction.",
  "Broad delivery capability at scale.",
  "Differentiation that customers genuinely value.",
];

/** The hidden factor behind analyst judgement — confidence through consistency. */
export const CONFIDENCE_FACTOR = {
  headline: "The hidden factor: confidence.",
  detail:
    "Analysts develop confidence because every source of evidence points in the same direction. Confidence is weakened when analysts encounter inconsistencies such as changing metrics, roadmaps presented as current capability, or customer feedback contradicting executive claims. These issues may not have explicit scoring criteria but can materially influence analyst judgement.",
  evidenceSources: [
    "RFI responses",
    "Executive briefings",
    "Product demonstrations",
    "Customer references",
    "Public announcements",
    "Financial results",
    "Product releases",
    "Analyst inquiries",
    "Ongoing interactions",
  ],
};

// ---------------------------------------------------------------------------
// The seven house playbooks.
// ---------------------------------------------------------------------------

export const HOUSE_PLAYBOOKS: HousePlaybook[] = [
  {
    id: "gartner",
    house: "Gartner",
    assessment: {
      name: "Magic Quadrant",
      axes: ["Completeness of Vision", "Ability to Execute"],
      leadership:
        "Leaders quadrant — providers with mature offerings that meet demand and sufficient vision and investment to lead or affect market direction.",
    },
    leadershipFramework: [
      "Gartner evaluates providers against up to 15 weighted criteria under Ability to Execute and Completeness of Vision. Execution includes product or service capability, viability, sales and pricing, market responsiveness, marketing execution, customer experience and operations. Vision includes market understanding, marketing and sales strategy, offering strategy, business model, industry strategy, innovation and geographic strategy.",
      "Theme: show that you are successfully serving the current market while making credible choices that will influence its future.",
      "A company that executes strongly but cannot articulate the future risks being viewed as a Challenger. A company with an attractive vision but insufficient delivery proof risks being viewed as a Visionary.",
    ],
    stages: [
      {
        stage: "rfi",
        rank: 1,
        framework: [],
        dos: [
          "Build a criterion-to-evidence matrix covering both axes.",
          "For every execution claim, provide scale, adoption, operating performance, customer results and supporting dates.",
          "For every vision claim, show committed investment, milestones, talent, product decisions and evidence that customers are moving in that direction.",
          "Separate clearly: generally available and in production; limited availability or beta; pilot; roadmap.",
          "Lock all evidence to the research “as of” date — Gartner states that events after that date are not reflected.",
          "Include operating evidence, not just product functionality: support, customer success, implementation, pricing, partner coverage, sales execution and viability.",
        ],
        donts: [
          "Submit a feature catalogue and assume it proves Ability to Execute.",
          "Describe an aspiration as a funded strategy.",
          "Use post-cut-off announcements as though they were available during the assessment period.",
          "Provide different revenue, customer, deployment or employee numbers in different sections.",
          "Assume commercial spend with Gartner affects placement — Gartner explicitly says client status does not affect inclusion or position.",
        ],
        bestPractices: [],
      },
      {
        stage: "client-calls",
        rank: 2,
        note: "Gartner publicly identifies customer sentiment as one factor relevant to market relevance and says Peer Insights reviews may be considered as one input among many — not a direct proxy for placement.",
        framework: [],
        dos: [
          "Build a continuing pipeline of credible customer outcomes across the industries, geographies, company sizes and use cases relevant to the Magic Quadrant.",
          "Track recurring implementation, support and value-realisation issues before they become analyst evidence.",
          "Make measurable outcomes available through case studies, validated reviews and customer conversations where appropriate.",
          "Prioritise customer evidence that demonstrates production adoption, time to value, reliability, support experience, expansion and renewal, and willingness to recommend.",
        ],
        donts: [
          "Treat review volume as an MQ score.",
          "Pursue large numbers of shallow or narrowly concentrated reviews at the expense of credible market coverage.",
          "Pressure customers or attempt to prescribe their comments.",
          "Ignore negative patterns because the average rating remains acceptable.",
        ],
        bestPractices: [],
      },
      {
        stage: "briefing-deck",
        rank: 4,
        note: "Gartner recommends presenting the main story in under five minutes: who you are, why customers buy, what problem you solve, how you differ, where you fit competitively and what milestones come next.",
        framework: [],
        dos: [
          "Lead with one market thesis and three supporting proof points.",
          "Use a short core deck with an indexed evidence appendix.",
          "Put the claim, metric, timeframe and source on the same slide.",
          "Show present execution and future direction as separate but connected narratives.",
        ],
        donts: [
          "Spend the opening on company history, executive biographies or a logo wall.",
          "Use dense capability diagrams that do not establish customer value.",
          "Make “industry-leading”, “unique” or “first” claims without a defined comparison.",
          "Read the slides aloud.",
        ],
        bestPractices: [],
      },
      {
        stage: "exec-briefing",
        rank: 3,
        note: "Gartner vendor briefings are typically 45 minutes and recorded for Gartner analyst use. Analysts cannot discuss forthcoming assessments, advise on positioning, disclose scores or review briefing materials.",
        framework: [],
        dos: [
          "Use an executive who owns the relevant product, service line or P&L.",
          "Answer questions directly before adding context.",
          "Explain strategic choices: what you are funding, what you are not funding and why.",
          "Acknowledge material gaps and show the remediation plan.",
          "Use regular pre-assessment briefings to keep market understanding accurate, rather than introducing the entire strategy during the evaluation window.",
        ],
        donts: [
          "Ask where you will be placed.",
          "Ask the analyst to validate your deck or messaging.",
          "Debate the methodology.",
          "Send only a corporate spokesperson who cannot answer product, customer or financial questions.",
          "Attack competitors — explain your differentiation through evidence.",
        ],
        bestPractices: [],
      },
    ],
    dos: [],
    donts: [],
    bestPractices: [],
    movementDriver: {
      headline: "Market execution plus strategic credibility.",
      drivers: [
        "Market perception changes: winning major enterprise clients, becoming recognised for AI leadership, consistently winning competitive deals, and significantly improving customer experience.",
        "Strategy becomes believable through investment, acquisitions, product launches, adoption and executive commitment.",
        "Execution catches up with vision through stronger delivery, broader capability and operational maturity.",
      ],
    },
    status: "populated",
    contentSource: SOURCE_DOC,
  },
  {
    id: "forrester",
    house: "Forrester",
    assessment: {
      name: "Forrester Wave",
      axes: ["Strategy", "Current Offering"],
      leadership:
        "Leader band — strongest combined position on Current Offering and Strategy (Forrester now places vendors in Leader, Strong Performer and Contender bands), with Market Presence shown as marker size.",
    },
    leadershipFramework: [
      "Forrester identifies three formal vendor inputs: the questionnaire, an executive strategy/product demonstration session and reference customers. The questionnaire contains all evaluation criteria; the briefing and demonstration follow those criteria and any scenarios supplied by Forrester. Forrester generally evaluates products available by the questionnaire due date.",
      "For Waves under the current methodology, customer feedback appears on the graphic: Forrester considers the number and response rate of references, breadth of relevant functionality used, enterprise representation, satisfaction and customer feedback gathered outside the formal Wave process.",
      "Theme: prove each important criterion at the required scale, demonstrate it under Forrester's scenarios and have customers corroborate the result.",
    ],
    stages: [
      {
        stage: "rfi",
        rank: 1,
        note: "The questionnaire contains all evaluation criteria.",
        framework: [],
        dos: [
          "Answer the exact criterion and scoring scale — not the broader marketing topic.",
          "Put the direct answer first, followed by evidence.",
          "Use criterion-specific proof rather than repeatedly referring to the same general case study.",
          "State exact product availability and release dates.",
          "Distinguish current capability from roadmap.",
          "Complete every requested input so that you retain access to the full scorecard-review process.",
        ],
        donts: [
          "Answer a narrow criterion with an expansive corporate narrative.",
          "Count a beta, private preview or planned capability as generally available.",
          "Leave ambiguous answers for the demonstration to resolve.",
          "Insert unsupported claims that will not survive the product demo.",
          "Treat all criteria as equally important when Forrester has provided different weightings.",
        ],
        bestPractices: [],
      },
      {
        stage: "client-calls",
        rank: 3,
        note: "Rank 3, close to Rank 2 — customer feedback appears on the Wave graphic under the current methodology.",
        framework: [],
        dos: [
          "Supply the full requested complement of references.",
          "Select enterprise customers using a meaningful breadth of the evaluated product or service.",
          "Prefer customers who can discuss implementation, adoption, outcomes, support and strategic relationship.",
          "Check availability and administrative details before nomination.",
          "Maintain backup candidates.",
        ],
        donts: [
          "Select references primarily because their logo is prestigious.",
          "Use a senior sponsor who has little knowledge of the implementation.",
          "Contact references after their Forrester interview to discuss or revise their response — Forrester says this may lead to forfeiture of part or all of the review process.",
          "Attempt to dispute Forrester's interpretation of customer feedback during escalation.",
        ],
        bestPractices: [],
      },
      {
        stage: "briefing-deck",
        rank: 4,
        framework: [],
        dos: [
          "Make the deck the navigation layer for the strategy briefing and demonstration.",
          "Label every claim by criterion.",
          "Include a compact appendix containing architecture, release dates, supporting metrics and customer examples.",
          "Make the evidence easy to retrieve during questions.",
        ],
        donts: [
          "Treat the deck as a fourth formal evidence stream — Forrester identifies the questionnaire, session and references as the three primary inputs.",
          "Reuse a generic corporate analyst deck.",
          "Hide weak evidence behind polished diagrams.",
          "Overload slides with claims that cannot be demonstrated.",
        ],
        bestPractices: [],
      },
      {
        stage: "exec-briefing",
        rank: 2,
        note: "At Forrester this moment includes the strategy and product demonstration session, which follows the questionnaire criteria and any Forrester-supplied scenarios.",
        framework: [],
        dos: [
          "Follow the questionnaire criteria and Forrester scenarios exactly.",
          "Demonstrate production functionality rather than presenting screenshots.",
          "Use the product owner or an experienced operator as the demonstrator.",
          "Rehearse: starting state, required workflow, user experience, administrative controls, integration and governance, and result.",
          "Keep strategy and product evidence connected: show how strategic investment appears in the actual product or service.",
          "Pair a senior strategy owner with the product or service leader who can demonstrate execution.",
          "Prepare exact responses to likely scale-definition and availability questions.",
          "Use the formal review stage for factual corrections supported by evidence.",
        ],
        donts: [
          "Deliver the standard sales demonstration.",
          "Substitute a strategy presentation for product evidence.",
          "Avoid difficult scenarios by showing a pre-recorded “happy path”.",
          "Introduce capabilities that were unavailable at the questionnaire cut-off as though they formed part of the evaluated product.",
          "Allow multiple executives to interrupt or redirect the demonstrator.",
          "Challenge criteria or weightings merely because they disadvantage your firm.",
          "Raise competitor-placement concerns.",
          "Wait for the courtesy preview to introduce new evidence — Forrester limits escalation to facts, process and methodology compliance and does not accept new information at the final courtesy-preview stage.",
        ],
        bestPractices: [],
      },
    ],
    dos: [],
    donts: [],
    bestPractices: [],
    movementDriver: {
      headline: "Demonstrated capability against evaluation criteria.",
      drivers: [
        "Movement generally occurs when vendors improve multiple scored criteria: new functionality, better UX, stronger AI capability, governance, integrations, roadmap and customer validation.",
        "Messaging alone rarely changes positioning.",
      ],
    },
    status: "populated",
    contentSource: SOURCE_DOC,
  },
  {
    id: "idc",
    house: "IDC",
    assessment: {
      name: "IDC MarketScape",
      axes: ["Strategies", "Capabilities"],
      leadership:
        "Leaders category (bands: Leaders, Major Players, Contenders, Participants) — competitive fitness today plus a three-to-five-year strategy aligned with buyer requirements. Market share is bubble size, not an axis.",
    },
    leadershipFramework: [
      "IDC's Capabilities axis measures product or service capability, go-to-market and business execution in the short term. Its Strategy axis measures alignment with customer requirements over approximately three to five years. IDC describes the framework as assessing competitive fitness rather than simply market share.",
      "IDC's criteria, weightings and scores represent analyst judgement informed by market leaders, participants, end users, buyer surveys and IDC experts. Vendor positions draw on detailed surveys and interviews, publicly available information and end-user experience.",
      "Theme: show that you are competitively fit today and that your three-to-five-year strategy is aligned with how buyers — not merely your company — expect the market to develop.",
    ],
    stages: [
      {
        stage: "rfi",
        rank: 1,
        framework: [],
        dos: [
          "Divide evidence explicitly into current capabilities (product, service, sales, delivery, operations, customer success) and future strategy (buyer need, funded roadmap, talent, partnerships, geographic plans, business model).",
          "Quantify adoption, revenue or growth where requested: active customers, delivery footprint, deployment scale and measurable outcomes.",
          "Explain how the go-to-market model supports the offering.",
          "Reconcile submitted figures with public financial disclosures and previous IDC submissions.",
        ],
        donts: [
          "Mix current capability and future intention in the same answer.",
          "Assume a large market share automatically produces Leader placement — share is bubble size; the axes concern Capabilities and Strategies.",
          "Present a three-to-five-year strategy without investment, people, milestones or accountability.",
          "Use a single global number when the study asks about a defined region or segment.",
        ],
        bestPractices: [],
      },
      {
        stage: "client-calls",
        rank: 2,
        framework: [],
        dos: [
          "Choose customers in the exact market, geography and deployment category being assessed.",
          "Use references that can quantify business value and describe both strengths and shortcomings.",
          "Ensure references understand the full relationship, not just one technical implementation.",
          "Demonstrate repeatability across more than one customer.",
        ],
        donts: [
          "Use a customer whose deployment falls outside the MarketScape definition.",
          "Rely solely on satisfaction — combine satisfaction with adoption and business outcomes.",
          "Select only implementation partners or resellers when IDC needs end-user experience.",
          "Assume the RFI narrative will override contradictory customer experience.",
        ],
        bestPractices: [],
      },
      {
        stage: "briefing-deck",
        rank: 4,
        framework: [],
        dos: [
          "Organise it around: buyer requirements, present capability, current market execution, customer outcomes, three-to-five-year strategy, investments and milestones.",
          "Show how the roadmap answers identified buyer requirements.",
        ],
        donts: [
          "Lead with corporate size or total company revenue.",
          "Present an undifferentiated list of acquisitions, partnerships or innovation centres.",
          "Conflate broad company capability with capability in the assessed segment.",
          "Use market forecasts without explaining your strategic response.",
        ],
        bestPractices: [],
      },
      {
        stage: "exec-briefing",
        rank: 3,
        framework: [],
        dos: [
          "Use the executive accountable for the evaluated business, together with a product, delivery or operations leader.",
          "Explain which buyer requirements are changing and the choices made in response.",
          "Demonstrate that the roadmap is funded and operationally deliverable.",
          "Discuss weaknesses and trade-offs honestly.",
        ],
        donts: [
          "Present a vision unsupported by current execution.",
          "Have the executive repeat quantitative answers already in the survey.",
          "Change the definitions used in the RFI during the interview.",
          "Assume charisma will compensate for an unconvincing operating model.",
        ],
        bestPractices: [],
      },
    ],
    dos: [],
    donts: [],
    bestPractices: [],
    movementDriver: {
      headline: "Alignment with future customer demand.",
      drivers: [
        "Largest movement comes when a vendor demonstrates alignment with where enterprise buyers are going: enterprise adoption, ecosystem maturity, investment commitment and realistic strategy.",
      ],
    },
    status: "populated",
    contentSource: SOURCE_DOC,
  },
  {
    id: "hfs",
    house: "HFS Research",
    assessment: {
      name: "HFS Horizons",
      axes: ["Value proposition", "Execution & innovation capability"],
      leadership:
        "Horizon 3 — providers distinguished by ecosystem orchestration and the ability to create innovation value rather than relying primarily on cost or skills arbitrage.",
    },
    leadershipFramework: [
      "Current HFS Horizons studies position providers across functional, enterprise and ecosystem levels of innovation and value. Recent studies used detailed provider briefings, enterprise-client references, technology-partner references and HFS demand-side data.",
      "Theme: move customers from isolated functional efficiency to end-to-end enterprise transformation and ultimately to ecosystem-level value, with production evidence rather than innovation theatre.",
      "The exact dimensions, thresholds and evidence requirements are study-specific — do not carry numerical weights or case requirements from one HFS Horizons report into another.",
    ],
    stages: [
      {
        stage: "rfi",
        rank: 3,
        note: "The structured submission and supporting material.",
        framework: [],
        dos: [
          "Provide case-level evidence rather than aggregate claims alone.",
          "Distinguish functional efficiency, enterprise integration and experience, and ecosystem or new-value creation.",
          "Quantify production adoption and duration.",
          "Explain reusable IP, platforms, agents or accelerators and their actual client adoption.",
          "Show the provider's specific role within partner-led outcomes.",
        ],
        donts: [
          "Count headcount, patents, partnerships or prototypes as customer value.",
          "Use unnamed cases that cannot be validated.",
          "Submit technology features without changes in process, operating model or business outcome.",
          "Equate cost reduction alone with Horizon 3 leadership.",
        ],
        bestPractices: [],
      },
      {
        stage: "client-calls",
        rank: 1,
        note: "Client AND technology-partner references both count — HFS validates ecosystem claims with the partners themselves.",
        framework: [],
        dos: [
          "Select clients who can demonstrate progression beyond a pilot or single-function deployment.",
          "Use references that can explain: baseline problem, intervention, production scale, measured outcome, organisational change and repeatability.",
          "Include appropriate ecosystem partners who can validate co-development, interoperability and provider contribution.",
          "Use references with authority to discuss commercial and strategic value.",
        ],
        donts: [
          "Present a proof of concept as scaled transformation.",
          "Choose references who can discuss delivery efficiency but not enterprise value.",
          "Treat the existence of a technology alliance as evidence of ecosystem orchestration.",
          "Overprepare references to the point that their responses sound scripted.",
          "Hide material delivery problems likely to surface during a reference check.",
        ],
        bestPractices: [],
      },
      {
        stage: "briefing-deck",
        rank: 4,
        framework: [],
        dos: [
          "Build each major case as: baseline → intervention → production scale → outcome → repeatability → next value horizon.",
          "Show the customer, employee and partner implications.",
          "Include outcome-linked commercial models where they genuinely exist.",
          "Keep technical architecture in the appendix unless it proves scale or differentiation.",
        ],
        donts: [
          "Use a generic capabilities wheel.",
          "Lead with innovation labs or partner logos.",
          "Show only the intended future state.",
          "Claim ecosystem value where no external participant will validate it.",
        ],
        bestPractices: [],
      },
      {
        stage: "exec-briefing",
        rank: 2,
        note: "The senior leadership briefing.",
        framework: [],
        dos: [
          "Use a senior practice or P&L leader who can discuss client value, delivery model, productisation, AI and automation in production, ecosystem strategy, commercial model and investment priorities.",
          "Explain what is structurally different about your approach.",
          "Show how innovation becomes repeatable rather than remaining bespoke consulting.",
          "Discuss lessons from implementations that did not initially scale.",
        ],
        donts: [
          "Send an executive who can describe market trends but not operating reality.",
          "Lead with technology terminology rather than enterprise outcomes.",
          "Claim transformation while the commercial and delivery model remains unchanged.",
          "Describe every capability as Horizon 3.",
        ],
        bestPractices: [],
      },
    ],
    dos: [],
    donts: [],
    bestPractices: [],
    movementDriver: {
      headline: "Demonstrated enterprise transformation.",
      drivers: [
        "Largest movement comes when vendors prove AI delivers enterprise transformation, new operating models, ecosystem orchestration and measurable business value rather than isolated automation.",
      ],
    },
    status: "populated",
    contentSource: SOURCE_DOC,
  },
  {
    id: "nelsonhall",
    house: "NelsonHall",
    assessment: {
      name: "NEAT",
      axes: ["Ability to meet future client requirements", "Ability to deliver immediate benefit"],
      leadership:
        "Leaders quadrant — scoring highly relative to peers on both immediate benefit delivery and ability to meet future client requirements.",
    },
    leadershipFramework: [
      "NEAT assesses ability to deliver immediate benefit (offering maturity, delivery capability, benefits achieved, customer presence) and ability to meet future client requirements (partnership, innovation mechanisms, investment, financial stability).",
      "Per the March 2026 licensed report: vendor scoring combines analyst assessment — principally supporting immediate-benefit measurements — and client interviews, principally supporting partnership and ability to meet future requirements.",
      "Theme: prove measurable value now and demonstrate that you are the safe, innovative and financially credible partner for the client's next contract period.",
    ],
    stages: [
      {
        stage: "rfi",
        rank: 2,
        note: "Client evidence and structured vendor evidence are effectively co-primary because they support different NEAT axes.",
        framework: [],
        dos: [
          "Create two distinct evidence sets — immediate benefit: offering maturity, delivery scale and capacity, customer presence, case-backed delivery results, benefits achieved; future requirements: investment, innovation process, future offering, financial commitment, flexibility and adaptability, partnership governance.",
          "Show benefits at contract level rather than merely platform-level potential.",
          "Include evidence of delivery across the relevant customer segments.",
        ],
        donts: [
          "Overweight the roadmap while under-evidencing current benefit.",
          "List capabilities without showing delivery impact.",
          "Treat a lab, centre of excellence or innovation fund as proof of adopted innovation.",
          "Avoid presenting market or geographic coverage gaps.",
        ],
        bestPractices: [],
      },
      {
        stage: "client-calls",
        rank: 1,
        framework: [],
        dos: [
          "Select references with visibility of both delivery performance and the strategic relationship.",
          "Use a sponsor who can discuss benefits achieved, responsiveness, governance, innovation mechanisms, adaptability and future roadmap.",
          "Ensure measurable benefits can be expressed against a baseline and timeframe.",
          "Prefer references from the particular market segment represented in the NEAT.",
        ],
        donts: [
          "Use only an operational manager who cannot discuss partnership or future plans.",
          "Select a client with a successful pilot but no scaled benefit.",
          "Assume long contract duration proves strategic partnership.",
          "Coach the customer to avoid discussing weaknesses.",
          "Ignore dissatisfaction around responsiveness, governance or innovation adoption.",
        ],
        bestPractices: [],
      },
      {
        stage: "briefing-deck",
        rank: 4,
        framework: [],
        dos: [
          "Divide the core deck visibly into the two NEAT axes.",
          "Use case-backed benefit statements.",
          "Connect future investments to problems customers expect to face during the next contract.",
          "Include delivery-scale and financial-stability evidence in the appendix.",
        ],
        donts: [
          "Blend immediate and future claims into an undifferentiated transformation story.",
          "Use innovation examples without client adoption.",
          "Substitute general corporate strength for specific service-line viability.",
          "Hide current weaknesses behind future ambition.",
        ],
        bestPractices: [],
      },
      {
        stage: "exec-briefing",
        rank: 3,
        framework: [],
        dos: [
          "Include the service-line leader and a senior delivery or customer-success executive.",
          "Explain the mechanism by which ideas move from innovation pipeline to client deployment.",
          "Show financial and organisational commitment to the service.",
          "Be explicit about commercial accountability and risk-sharing where relevant.",
        ],
        donts: [
          "Confuse relationship longevity with partnership quality.",
          "Use “co-creation” without describing governance, investment and deployed results.",
          "Present future capability without a credible migration path for existing customers.",
          "Send only a sales executive.",
        ],
        bestPractices: [],
      },
    ],
    dos: [],
    donts: [],
    bestPractices: [],
    movementDriver: {
      headline: "Immediate customer value plus innovation partnership.",
      drivers: [
        "Movement occurs when customers consistently report immediate measurable business outcomes while expressing confidence in future innovation partnership.",
      ],
    },
    status: "populated",
    contentSource: SOURCE_DOC,
  },
  {
    id: "isg",
    house: "ISG",
    assessment: {
      name: "ISG Provider Lens",
      axes: ["Competitive Strength", "Portfolio Attractiveness"],
      leadership:
        "Leader designation — combining market presence, comprehensive offerings, stability, client alignment and consistent innovation in the exact quadrant and geography.",
    },
    leadershipFramework: [
      "Portfolio Attractiveness includes offering breadth and depth, quality, technology, skills, differentiation, security, compliance, strategy, investment and local support or infrastructure. Competitive Strength includes revenue and growth, market awareness, customer satisfaction, innovation, stability, ecosystem, business model and go-to-market.",
      "ISG's published process includes detailed capability questionnaires, client reference interviews, product or service demonstrations and independent market analysis, with additional validation from analysts and advisors.",
      "Theme: win the precise capability in the precise geography — combine a complete, high-quality and locally relevant portfolio with market traction, customer satisfaction and a viable go-to-market model.",
    ],
    stages: [
      {
        stage: "rfi",
        rank: 1,
        note: "The capability questionnaire.",
        framework: [],
        dos: [
          "Answer for the exact quadrant, service definition, customer size and geography.",
          "Provide evidence for both axes: portfolio breadth, quality and differentiation; local delivery, support and infrastructure; revenue, growth and active clients; satisfaction and retention; innovation, stability and ecosystem; sales and go-to-market.",
          "Identify which figures are global and which apply to the assessed geography.",
          "Reconcile the questionnaire with demonstrations, customer nominations and public information.",
        ],
        donts: [
          "Reuse a worldwide response without local evidence.",
          "Claim local presence based only on sales coverage.",
          "Count global clients that do not use the assessed service in the evaluated region.",
          "Emphasise technical capability while ignoring GTM, stability or customer satisfaction.",
          "Submit capability claims that the local executive cannot explain.",
        ],
        bestPractices: [],
      },
      {
        stage: "client-calls",
        rank: 2,
        note: "ISG states that its Star of Excellence customer-experience data informs Provider Lens evaluations and quadrant positioning. Nominate clients before or during the research phase; relationship sponsors, business leaders, IT directors and CIO/CTOs are particularly useful respondents.",
        framework: [],
        dos: [
          "Nominate relevant clients before or early in the study.",
          "Match the client to the exact geography, service line and quadrant.",
          "Build diversity across industries, customer sizes and engagement types.",
          "Choose respondents with strategic as well as operational visibility.",
          "Maintain enough valid references that one unavailable customer does not compromise the evidence set.",
        ],
        donts: [
          "Wait until the end of the research phase.",
          "Nominate a prominent global client whose engagement is outside the assessed quadrant.",
          "Use the same narrow engagement as proof across several unrelated quadrants.",
          "Assume one highly satisfied customer proves market-wide consistency.",
          "Attempt to complete or influence the survey on the customer's behalf.",
        ],
        bestPractices: [],
      },
      {
        stage: "briefing-deck",
        rank: 4,
        framework: [],
        dos: [
          "Tailor every slide to the exact quadrant and region.",
          "Make local proof visible: clients, delivery centres, relevant skills and certifications, support, regulatory capability, case outcomes.",
          "Map portfolio proof to the Portfolio Attractiveness axis and competitive proof to the Competitive Strength axis.",
        ],
        donts: [
          "Use a global boilerplate deck.",
          "Rely on a logo wall without specifying geography and service.",
          "Include broad partner claims without explaining your delivery role.",
          "Hide regional weaknesses beneath worldwide company scale.",
        ],
        bestPractices: [],
      },
      {
        stage: "exec-briefing",
        rank: 3,
        note: "At ISG this moment includes the product or service demonstration.",
        framework: [],
        dos: [
          "Use the regional or local P&L/service leader where the study is geography-specific.",
          "Demonstrate local delivery capability and implementation experience.",
          "Explain how the portfolio is sold, supported and scaled in that market.",
          "Address security, compliance, architecture and ecosystem contribution directly.",
          "Show how innovation has been adopted by local clients.",
        ],
        donts: [
          "Send only a global visionary executive with no local numbers.",
          "Discuss worldwide capability when the analyst asks about local market traction.",
          "Claim innovation based solely on partner technology.",
          "Avoid questions about delivery capacity, attrition, support or financial stability.",
        ],
        bestPractices: [],
      },
    ],
    dos: [],
    donts: [],
    bestPractices: [],
    movementDriver: {
      headline: "Customer experience combined with portfolio completeness.",
      drivers: [
        "Largest movements occur when vendors demonstrate stronger regional capability, improved customer satisfaction, wider services, stronger ecosystem and measurable market momentum.",
      ],
    },
    status: "populated",
    contentSource: SOURCE_DOC,
  },
  {
    id: "everest",
    house: "Everest Group",
    assessment: {
      name: "PEAK Matrix",
      axes: ["Vision & Capability", "Market Impact"],
      leadership:
        "Leaders segment (bands: Leaders, Major Contenders, Aspirants) — market success (revenue, clients, year-on-year growth) plus delivery capability (scale, scope, technology and innovation, delivery footprint, buyer satisfaction).",
    },
    leadershipFramework: [
      "Everest assesses providers through market success and delivery capability, and describes buyer-reference interviews as a critical part of the process.",
      "Everest's published process components: an RFI collecting quantitative information on operations, offerings, functionality and business model; a PowerPoint profile template; a 60-minute target-market leadership briefing; and 30-minute buyer-reference calls or surveys. RFI information is essential, although submitting an RFI does not guarantee inclusion.",
      "Theme: prove market impact and delivery capability at meaningful scale, backed by investment, adoption, operating depth and buyer satisfaction.",
    ],
    stages: [
      {
        stage: "rfi",
        rank: 1,
        framework: [],
        dos: [
          "Complete every relevant field.",
          "Establish a controlled data dictionary before answering — define market scope, revenue treatment, active client, engagement, FTE or resource count, delivery location, production deployment and year-on-year growth.",
          "Reconcile totals and subtotals.",
          "Provide dates, denominators and units.",
          "Show adoption and value — not merely availability.",
          "Flag estimates transparently and explain methodology.",
        ],
        donts: [
          "Leave blanks that the analyst must interpret.",
          "Change definitions between years without explanation.",
          "Submit figures that do not reconcile with the profile or briefing.",
          "Count adjacent services that fall outside the scoping document.",
          "Use aggregate company investment where the RFI asks about the assessed practice.",
          "Substitute a strong narrative for incomplete quantitative data.",
        ],
        bestPractices: [],
      },
      {
        stage: "client-calls",
        rank: 2,
        note: "30-minute buyer-reference calls or surveys; Everest describes buyer-reference interviews as a critical part of the process.",
        framework: [],
        dos: [
          "Select clients who can discuss: why they selected you, deployment scope, value realised, delivery quality, innovation, areas requiring improvement, and expansion or renewal.",
          "Match reference seniority to the assessed subject.",
          "Use measurable outcomes with a baseline and timeframe.",
          "Ensure the client can distinguish your contribution from partner contribution.",
        ],
        donts: [
          "Select a client solely because of brand recognition.",
          "Use a reference with a very small or unrepresentative engagement.",
          "Script answers.",
          "Conceal unresolved disputes or material delivery problems.",
          "Assume satisfaction alone proves market success or capability.",
        ],
        bestPractices: [],
      },
      {
        stage: "briefing-deck",
        rank: 4,
        note: "Everest's process uses a PowerPoint profile template — treat the profile as a factual, publication-ready representation of capability.",
        framework: [],
        dos: [
          "Ensure complete consistency with the RFI.",
          "Use concise proof of scope, footprint, investment, customer outcomes and differentiation.",
          "Maintain a detailed supporting appendix.",
        ],
        donts: [
          "Treat the PowerPoint profile as a replacement for the RFI.",
          "Insert new figures that have not been quality-controlled.",
          "Turn the profile into advertising copy.",
          "Overstate market position or use undefined superlatives.",
          "Present future capability as currently delivered.",
        ],
        bestPractices: [],
      },
      {
        stage: "exec-briefing",
        rank: 3,
        note: "A 60-minute target-market leadership briefing.",
        framework: [],
        dos: [
          "Use the accountable target-market practice leader.",
          "Spend the session on what the RFI cannot convey effectively: strategic direction, investment choices, differentiation, commercial model, talent strategy, M&A or partnership integration, and delivery evolution.",
          "Explain why the practice will gain share or capability over the next assessment period.",
          "Be prepared to reconcile every major number.",
        ],
        donts: [
          "Recite the RFI.",
          "Send an executive unfamiliar with the target market.",
          "Make strategic claims without budget, talent or milestones.",
          "Use all the available time for presentation and eliminate analyst questions.",
          "Redefine an unfavourable metric during the meeting.",
        ],
        bestPractices: [],
      },
    ],
    dos: [],
    donts: [],
    bestPractices: [],
    movementDriver: {
      headline: "Market success at scale.",
      drivers: [
        "Largest movements generally occur when vendors demonstrate rapid growth, significant new customers, stronger delivery footprint, increased AI capability, successful scaling and strong buyer references.",
      ],
    },
    status: "populated",
    contentSource: SOURCE_DOC,
  },
];

export function playbookById(id: AnalystHouseId): HousePlaybook {
  return HOUSE_PLAYBOOKS.find((p) => p.id === id) ?? HOUSE_PLAYBOOKS[0];
}

export function stageDef(id: EngagementStageId): EngagementStageDef {
  return ENGAGEMENT_STAGES.find((s) => s.id === id) ?? ENGAGEMENT_STAGES[0];
}
