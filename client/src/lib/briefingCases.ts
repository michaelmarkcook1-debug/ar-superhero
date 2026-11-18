// Curated, public-source sample. Relationship events are presenter-controlled examples.
export const vendorEvidence = [
  { date: "20 Jun 2025", title: "Julie Sweet set out the rationale", detail: "Sweet linked the combination of five service lines to faster client value from AI. This establishes the executive’s public commitment.", url: "https://newsroom.accenture.com/news/2025/accenture-changes-growth-model-to-reinvent-itself-for-the-age-of-ai" },
  { date: "13 Mar 2026", title: "Accenture named the operating units", detail: "Accenture announced leadership for seven Reinvention Partners and three Reinvention Engines. This documents an organisational step. Client adoption and financial returns still need separate evidence.", url: "https://newsroom.accenture.com/news/2026/accenture-announces-reinvention-services-leadership" },
];

export const cases = {
  holger: {
    name: "Holger Mueller", firm: "Constellation Research", lens: "Platform architecture", initials: "HM",
    headline: "Show what Accenture owns in one live deployment.",
    rationale: "Mueller has publicly questioned how easier AI implementation affects consulting demand. His two technology shortlists offer a way to probe the answer. Before discussing scale, establish whether Accenture supplies the runtime, a reusable component or the implementation service.",
    question: "If the customer changed its underlying model or cloud, which parts of this deployment would Accenture still operate and support?",
    opening: "Start with a customer workflow. Trace an invoice from intake through the agent runtime to human review. Label the customer, partner and Accenture components. Bring the architecture lead into the discussion at the first ownership boundary.",
    gap: "The public reorganisation establishes who leads Digital Core. It supplies neither a deployment diagram nor an adoption count for a specific Accenture component.",
    boundary: "His earlier comments address Accenture’s business directly. The two later shortlists assess technology categories. Using their criteria to prepare this discussion is an AR SuperHero interpretation.",
    sources: [
      {date:"19 Dec 2024", title:"Mueller on Accenture’s consulting exposure", detail:"In Constellation’s earnings coverage, Mueller identified two pressures: customers need help using AI, while easier implementation can reduce their dependence on consultants.",url:"https://www.constellationr.com/insights/news/accenture-raises-fiscal-2025-outlook-genai-bookings-continue-grow"},
      {date:"25 Feb 2026", title:"Enterprise agentic platforms", detail:"Mueller’s shortlist sets a threshold above 10,000 active or trained users, alongside cloud deployment and a roadmap. The unit of analysis is the platform.",url:"https://www.constellationr.com/research/constellation-shortlist-agentic-platforms-of-the-enterprise"},
      {date:"25 Feb 2026", title:"AI frameworks", detail:"His framework shortlist raises the threshold above 100,000 and asks about on-premises and cloud deployment. Firm-wide AI training cannot establish adoption of a particular framework.",url:"https://www.constellationr.com/research/constellation-shortlist-ai-frameworks"}
    ],
    request:"AR promised a diagram separating Accenture-owned components from partner services.",
    reply:"An architecture slide arrived. It names the components but leaves ownership and production status blank.",
    stages: [
      { owner:"Architecture lead", action:"Prepare a production reference", body:"Select one deployment. Identify the runtime owner, the reusable Accenture components and the customer’s responsibilities. Define exactly what any adoption figure counts." },
      { owner:"AR lead + solution architect", action:"Deliver the promised ownership map", body:"Move the platform overview to the appendix. Open the next discussion with the outstanding diagram and seek clearance for one customer reference." },
      { owner:"Production service owner", action:"Keep the request open", body:"Annotate the slide with runtime ownership, deployment environment and operating responsibility. Ask the service owner to verify each before the diagram goes back to the analyst." }
    ],
  },
  phil: {
    name: "Phil Fersht", firm: "HFS Research", lens: "Services economics", initials: "PF",
    headline: "Show who kept the value of a faster invoice.",
    rationale: "Fersht publicly connects agent-enabled contracts with outcomes. HFS has already published the Accenture invoice example. Repeating its headline metrics wastes the opportunity to explain what changed for the buyer.",
    question: "When average handling time fell by half, what happened to cost per accepted invoice once exceptions, oversight and supplier charges were included?",
    opening: "Acknowledge the case HFS already knows. Ask the finance operations lead to walk through one accepted invoice and one exception. Then show how the commercial agreement distributes any saving between buyer and provider.",
    gap: "HFS reports 96% accuracy and a 50% reduction in average handle time in one invoice-validation case. Neither figure establishes a 50% cost saving, buyer margin or portfolio-wide performance.",
    boundary: "The summit transcript records Fersht’s own remarks. The invoice example is a co-authored HFS finding. Its cost base and contract terms are absent from the public summary.",
    sources: [
      {date:"2026 · Spring summit",title:"Fersht on services contracts",detail:"At 03:00, Fersht describes work with buyers and providers on moving existing engagements toward AI-enabled contracts and defining outcomes.",url:"https://www.hfsresearch.com/ny-spring-summit-2026/day-1/services-as-software-is-here/"},
      {date:"2026 · Horizons report",title:"Agentic Services",detail:"Fersht and three co-authors report the Accenture invoice result within an assessment of 36 providers. The study-wide sample does not establish the invoice-case sample size.",url:"https://www.hfsresearch.com/research/hfs-horizons-agentic-services-2026/"}
    ],
    request:"AR promised a buyer-side cost baseline, including human review and exception handling.",
    reply:"A delivery slide arrived with the published handling-time reduction. It contains no fully loaded costs.",
    stages: [
      { owner:"Finance operations lead", action:"Reconcile speed with buyer economics", body:"Request volume, cost per accepted invoice, incidence and cost of exceptions, and the comparable baseline period. Agree with the buyer which measures can be attributed." },
      { owner:"Account commercial lead", action:"Close the baseline commitment", body:"Return to the open request before presenting another case. Pair the cost bridge with contract terms showing which party pays for exceptions and who captures the benefit." },
      { owner:"Client finance controller", action:"Keep the savings claim on hold", body:"Ask the controller to reconcile labour, review, rework and fees against accepted invoice volume in both periods. Keep the verified handling-time result available as a separate measure." }
    ],
  }
} as const;
export type CaseId = keyof typeof cases;
export type Stage = 0 | 1 | 2;

export const checks = {
  holger: ["Component inventory", "Runtime ownership", "Production environment", "Operating responsibility"],
  phil: ["Handling-time measure", "Comparable cost baseline", "Exception and oversight costs", "Accepted invoice volume"],
} as const;

export function assessExhibit(id: CaseId, supplied: readonly string[]) {
  const required = checks[id];
  const missing = required.filter(item => !supplied.includes(item));
  return { missing, covered: required.length - missing.length, readyForReview: missing.length === 0 };
}
