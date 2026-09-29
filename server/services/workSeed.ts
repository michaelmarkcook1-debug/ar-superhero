import { randomUUID } from "node:crypto";
import { vendorById } from "./vendors";
import { vendorAnalystView } from "./rosterSync";
import { analystCoverageStore } from "./analystCoverageStore";
import { publicRankingsStore } from "./publicRankingsStore";
import { getArBrief } from "./agIntelligence";
import { scenarioById } from "@shared/briefingScenarios";
import { playbookById, type AnalystHouseId } from "@shared/assessmentPlaybooks";
import type { AnalystCoverage, PublicAnalystRanking } from "@shared/schema";

// ============================================================================
// Work seed — "Start work on this".
//
// AR SuperHero knows WHAT an AR person should work on and holds the material;
// WorkEngine (TalentGenius's brief-and-playbook skill) knows HOW a person and
// AI get it done. A work seed is the hand-off between them: one goal, the
// sources behind it with their provenance stated the way WorkEngine records
// provenance, the AR SuperHero capabilities a playbook may name, and a prompt
// the person pastes into Claude with the WorkEngine skill loaded.
//
// HONESTY: a seed is only offered where SuperHero holds REAL material for it —
// a named analyst with sourced coverage, a scenario for a tracked vendor with
// its live read and placements, or an evaluation the vendor has a cited
// placement history in. Nothing seeded here comes from demo content. Every
// source is a page the person can open or a reference to SuperHero's own data
// marked as unread; nothing is described as read, endorsed or permitted when
// it is not. Absent material is a stated caveat, never a filled default.
// ============================================================================

export type SeedKind = "analyst-briefing" | "scenario" | "evaluation";

export type SeedInput =
  | { kind: "analyst-briefing"; vendorId: string; analystKey: string }
  | { kind: "scenario"; vendorId: string; personaId: string; scenarioId: string; houseId?: AnalystHouseId }
  | { kind: "evaluation"; vendorId: string; firm: string; reportName: string };

/** Mirrors the source record WorkEngine keeps for provenance. */
export interface SeedSource {
  source_ref: string;
  role: "authoritative" | "required" | "example" | "background" | "inspiration";
  permitted_use: "copy" | "adapt" | "reference-only" | "unknown";
  currency_state: "current" | "possibly-stale" | "unknown";
  read_state: "read" | "available-unread" | "inaccessible";
  user_endorsement: "endorsed" | "not-endorsed" | "unknown";
  note: string;
}

/** Mirrors an entry in WorkEngine's capability catalogue. */
export interface SeedCapability {
  kind: "tool" | "skill" | "harness" | "agent";
  name: string;
  description: string;
  when: string;
}

export interface WorkSeed {
  kind: SeedKind;
  title: string;
  goal: string;
  /** Exactly the envelope WorkEngine's `begin` reads from .workengine/request.json. */
  request: { request_id: string; goal: string; mode: "express"; attachment_ids: string[] };
  sources: SeedSource[];
  /** Real figures and positions from SuperHero, each traceable to a source above. */
  context: string[];
  caveats: string[];
  capabilities: SeedCapability[];
  handoff_prompt: string;
  generated_at: string;
}

// What SuperHero can bring to a task, in the catalogue's own shape. Listed so a
// playbook can name "the AR SuperHero deck generator" rather than a generic
// pptx skill. Conservative: only things that exist in the product today.
export const SUPERHERO_CAPABILITIES: Record<string, SeedCapability> = {
  brief: {
    kind: "tool",
    name: "ar-superhero-brief",
    description:
      "The AnalystGenius read for a tracked vendor: assessment and AI-readiness scores, narrative–reality gap, peer scorecard, reputation lens movement. Point-in-time; drifts between sessions.",
    when: "The task needs the analyst-side view of the vendor or its peers.",
  },
  deck: {
    kind: "tool",
    name: "ar-superhero-scenario-deck",
    description:
      "Persona and scenario briefing decks (PPTX) built deterministically from the AnalystGenius read, cited placements and named-analyst coverage.",
    when: "The deliverable is a leader briefing and slides are the expected form.",
  },
  rankings: {
    kind: "tool",
    name: "ar-superhero-rankings",
    description:
      "Cited public placement history per vendor and analyst firm, each row with its source and whether it is analyst-confirmed or vendor-reported.",
    when: "The task needs the vendor's placement record or a competitor's.",
  },
  coverage: {
    kind: "tool",
    name: "ar-superhero-coverage",
    description: "Named analysts by firm and the positions they have published on a vendor, each with a source and date.",
    when: "The task concerns a specific analyst, firm, or what has been said about the vendor.",
  },
  perception: {
    kind: "tool",
    name: "ar-superhero-perception-engine",
    description:
      "Proposes a relationship-stance change from the AR team's own debrief notes and interaction logs. Suggests only; the AR team confirms.",
    when: "After a briefing or inquiry, to record what was learned about the relationship.",
  },
  rfp: {
    kind: "tool",
    name: "ar-superhero-rfp-analyser",
    description: "Reviews an RFP or RFI against the vendor's cleared proof points and its claims-to-avoid register.",
    when: "The task is a pursuit response.",
  },
};

const PERSONA_LABEL: Record<string, string> = {
  executive: "Executive (CEO · COO · CSO)",
  strategy: "Strategy (Chief Strategy Officer · Strategy Office)",
  product: "Product and service-line leaders",
  marketing: "Marketing and communications",
  commercial: "Sales and pursuit leaders",
  delivery: "Delivery and operations leaders",
  regional: "Regional and country leaders",
};

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

function personKey(name: string, firm: string): string {
  return `${name.trim().toLowerCase()}|${firm.trim().toLowerCase()}`;
}

function monthsOld(d: string | null | undefined): number | null {
  if (!d) return null;
  const iso = /^\d{4}$/.test(d) ? `${d}-06-30` : /^\d{4}-\d{2}$/.test(d) ? `${d}-15` : d;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return (Date.now() - then.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function currencyOf(published: string | null | undefined): SeedSource["currency_state"] {
  const age = monthsOld(published);
  if (age === null) return "unknown";
  return age < 24 ? "current" : "possibly-stale";
}

function fmtDate(d: string | null | undefined, precision?: string | null): string {
  if (!d) return "undated";
  if (precision === "year" || /^\d{4}$/.test(d)) return d.slice(0, 4);
  if (precision === "month" || /^\d{4}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** A public web page the person can open. Reference-only: we hold no licence to copy it. */
function webSource(url: string, role: SeedSource["role"], note: string, published: string | null | undefined): SeedSource {
  return {
    source_ref: url,
    role,
    permitted_use: "reference-only",
    currency_state: currencyOf(published),
    read_state: "available-unread",
    user_endorsement: "unknown",
    note,
  };
}

/** A reference into SuperHero's own data. Not a web page; marked unread and of unknown permitted use. */
function connectorSource(ref: string, role: SeedSource["role"], note: string, current: boolean): SeedSource {
  return {
    source_ref: ref,
    role,
    permitted_use: "unknown",
    currency_state: current ? "current" : "possibly-stale",
    read_state: "available-unread",
    user_endorsement: "unknown",
    note,
  };
}

/**
 * The edition-independent name of a report, so editions of one series group
 * together: "Report 2025", "Report, 2026", "Report 2025-26", "… 2025 Vendor
 * Assessment" and "…, Q4 2025" all normalise to the same base. Years, year
 * ranges and quarter markers are stripped anywhere in the name; nothing else
 * is touched, so genuinely different reports stay distinct. Same rule is
 * applied to both sides of every match.
 */
export function baseReportName(name: string): string {
  return name
    .replace(/\b(?:19|20)\d{2}(?:\s*[–-]\s*(?:(?:19|20)?\d{2}))?\b/g, " ")
    .replace(/\bQ[1-4]\b/g, " ")
    .replace(/\s*[–—-]\s*edition\b/gi, " ")
    .replace(/\s+([,:;)])/g, "$1")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,:;–-]+$/g, "")
    .trim();
}

function requestId(kind: SeedKind): string {
  return `ars-${kind}-${randomUUID().slice(0, 8)}`;
}

function byDateDesc<T extends { published_date: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => String(b.published_date ?? "").localeCompare(String(a.published_date ?? "")));
}

function buildPrompt(seed: Omit<WorkSeed, "handoff_prompt">): string {
  const lines: string[] = [];
  lines.push(
    "I want to start a piece of work with the WorkEngine skill. Everything below comes from AR SuperHero. Treat the sources as material I am providing, with the provenance stated; do not invent any others. The connector:// references point at AR SuperHero's own data — they are not web pages, so ask me to export anything you need to read.",
    "",
    "GOAL",
    seed.goal,
    "",
    "REQUEST — write this to .workengine/request.json before you run begin:",
    JSON.stringify(seed.request, null, 2),
    "",
    "SOURCES"
  );
  for (const s of seed.sources) {
    lines.push(
      `- ${s.source_ref}`,
      `  role: ${s.role} · permitted use: ${s.permitted_use} · currency: ${s.currency_state} · ${s.read_state} · endorsement: ${s.user_endorsement}`,
      `  ${s.note}`
    );
  }
  if (seed.context.length) {
    lines.push("", "CONTEXT FROM AR SUPERHERO (real, point-in-time; each line traces to a source above)");
    for (const c of seed.context) lines.push(`- ${c}`);
  }
  if (seed.caveats.length) {
    lines.push("", "CAVEATS");
    for (const c of seed.caveats) lines.push(`- ${c}`);
  }
  lines.push("", "CAPABILITIES AVAILABLE BESIDES YOUR OWN");
  for (const c of seed.capabilities) lines.push(`- ${c.name}: ${c.description} Use when: ${c.when}`);
  lines.push(
    "",
    "Please shape the Current Focus and Work Brief from this. Keep judgement, relationships and every figure with me, and say plainly where AI does not belong."
  );
  return lines.join("\n");
}

function finish(seed: Omit<WorkSeed, "handoff_prompt">): WorkSeed {
  return { ...seed, handoff_prompt: buildPrompt(seed) };
}

// ----------------------------------------------------------------------------

async function analystBriefingSeed(vendorId: string, analystKey: string): Promise<WorkSeed> {
  const vendor = vendorById(vendorId);
  const view = await vendorAnalystView(vendorId);
  const person = view.analysts.find((a) => a.key === analystKey);
  if (!person) throw new Error("That analyst is not in the coverage held for this vendor.");

  const rows = (await analystCoverageStore.list(vendorId)).filter(
    (r: AnalystCoverage) => personKey(r.analyst_name, r.firm) === analystKey
  );
  const positioned = byDateDesc(
    rows.filter((r: AnalystCoverage) => r.vendor_id === vendorId && Boolean(r.stance_summary) && Boolean(r.source_url))
  );

  const sources: SeedSource[] = positioned.map((r) =>
    webSource(
      r.source_url as string,
      "background",
      `${person.name} on ${vendor.name}, ${fmtDate(r.published_date, r.date_precision)}: ${r.stance_summary}`,
      r.published_date
    )
  );
  if (person.profile_url) {
    sources.push(webSource(person.profile_url, "background", `${person.name}'s profile at ${person.firm}.`, null));
  }

  const context = positioned.map(
    (r) => `${fmtDate(r.published_date, r.date_precision)} — ${r.stance_summary}${r.quote ? ` Quoted: “${r.quote}”` : ""}`
  );

  const caveats: string[] = [];
  if (person.last_interaction_at === null) {
    caveats.push(
      "No interaction with this analyst is logged in AR SuperHero and no relationship stance is confirmed. Treat the relationship as unknown, not neutral."
    );
  }
  if (positioned.length === 0) {
    caveats.push(`No published position on ${vendor.name} was found for this analyst; the sources are their profile and market coverage only.`);
  }
  if (person.stale) {
    caveats.push("Their most recent position is more than two years old and must not be read as a current view.");
  }

  const role = person.role ? `, ${person.role}` : "";
  return finish({
    kind: "analyst-briefing",
    title: `Briefing: ${person.name}, ${person.firm}`,
    goal: `Prepare and hold a briefing with ${person.name} (${person.firm}${role}) about ${vendor.name}: what they have published, what they are likely to probe, and a debrief afterwards that records what was learned about the relationship.`,
    request: {
      request_id: requestId("analyst-briefing"),
      goal: `Prepare and hold a briefing with ${person.name} (${person.firm}) about ${vendor.name}, and debrief it.`,
      mode: "express",
      attachment_ids: [],
    },
    sources,
    context,
    caveats,
    capabilities: [SUPERHERO_CAPABILITIES.coverage, SUPERHERO_CAPABILITIES.brief, SUPERHERO_CAPABILITIES.perception],
    generated_at: new Date().toISOString(),
  });
}

async function scenarioSeed(vendorId: string, personaId: string, scenarioId: string, houseId?: AnalystHouseId): Promise<WorkSeed> {
  const vendor = vendorById(vendorId);
  const scenario = scenarioById(scenarioId);
  if (!scenario) throw new Error("Unknown briefing scenario.");
  const personaLabel = PERSONA_LABEL[personaId] ?? personaId;
  const personaShort = personaLabel.split(" (")[0];

  const [brief, rankings, coverage] = await Promise.all([
    getArBrief({ focalTicker: vendor.agTicker }),
    publicRankingsStore.listRankings(vendorId),
    analystCoverageStore.list(vendorId),
  ]);

  const sources: SeedSource[] = [];
  const context: string[] = [];
  const caveats: string[] = [];

  const readLive = brief.live && !brief.degraded;
  if (readLive && brief.focal) {
    const f = brief.focal;
    const when = new Date(brief.generatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    sources.push(
      connectorSource(
        `connector://analystgenius/ar-brief?focalTicker=${vendor.agTicker}`,
        "required",
        `AnalystGenius read for ${vendor.name} taken ${when}${brief.stale ? " (served from the last complete read; AnalystGenius was not responding)" : ""}. Point-in-time: regenerate before the briefing.`,
        !brief.stale
      )
    );
    if (f.assessmentScore !== null || f.aiReadinessScore !== null) {
      context.push(
        `${vendor.name}: assessment ${f.assessmentScore ?? "not reported"} · AI readiness ${f.aiReadinessScore ?? "not reported"} (AnalystGenius, ${when})`
      );
    }
    if (f.gapScore !== null) {
      context.push(`Narrative–reality gap ${f.gapScore}${f.gapDirection ? ` (${f.gapDirection})` : ""}`);
    }
    const peers = brief.competitors
      .filter((c) => c.assessmentScore !== null || c.aiReadinessScore !== null)
      .map((c) => `${c.name} ${c.assessmentScore ?? "–"}/${c.aiReadinessScore ?? "–"}`);
    if (peers.length) context.push(`Peers (assessment/AI readiness): ${peers.join(" · ")}`);
    for (const l of brief.reputationLenses ?? []) {
      if (l.delta !== 0) context.push(`${l.name} lens ${l.delta > 0 ? "up" : "down"} ${Math.abs(l.delta)} (${l.prev} → ${l.last}, ${l.span})`);
    }
  } else {
    caveats.push("AnalystGenius was unreachable when this seed was built, so the live read is absent — absent, not zero. Regenerate the seed before planning.");
  }

  for (const r of byDateDesc(rankings).slice(0, 6)) {
    sources.push(
      webSource(
        r.source_url,
        "background",
        `${r.analyst_firm} · ${r.report_name} · ${r.placement} (${r.source_type.replace(/_/g, " ")}), ${fmtDate(r.published_date, r.date_precision)}.`,
        r.published_date
      )
    );
  }
  const positioned = byDateDesc(
    coverage.filter((r: AnalystCoverage) => r.vendor_id === vendorId && Boolean(r.stance_summary) && Boolean(r.source_url))
  ).slice(0, 6);
  for (const r of positioned) {
    sources.push(
      webSource(
        r.source_url as string,
        "background",
        `${r.analyst_name} (${r.firm}), ${fmtDate(r.published_date, r.date_precision)}: ${r.stance_summary}`,
        r.published_date
      )
    );
  }
  if (scenario.houseScoped && houseId) {
    const pb = playbookById(houseId);
    sources.push(
      connectorSource(
        `connector://ar-superhero/house-playbook/${houseId}`,
        "required",
        `${pb.house} engagement playbook: ${pb.assessment.name} on ${pb.assessment.axes.join(" and ")}; stage guidance, dos and don'ts. Directional synthesis of published methodology, not published weights.`,
        true
      )
    );
  }
  caveats.push(
    "The deck generator in AR SuperHero can produce the first draft of this deliverable. Which asks go to which leader, and what relationship stance is disclosed, stay with the person."
  );

  return finish({
    kind: "scenario",
    title: `${scenario.label} · ${personaShort} · ${vendor.name}`,
    goal: `Prepare the ${scenario.label.toLowerCase()} for ${vendor.name}'s ${personaLabel}: ${scenario.when}`,
    request: {
      request_id: requestId("scenario"),
      goal: `Prepare the ${scenario.label.toLowerCase()} for ${vendor.name}'s ${personaShort} leaders.`,
      mode: "express",
      attachment_ids: [],
    },
    sources,
    context,
    caveats,
    capabilities: [SUPERHERO_CAPABILITIES.brief, SUPERHERO_CAPABILITIES.deck, SUPERHERO_CAPABILITIES.rankings, SUPERHERO_CAPABILITIES.coverage],
    generated_at: new Date().toISOString(),
  });
}

async function evaluationSeed(vendorId: string, firm: string, reportName: string): Promise<WorkSeed> {
  const vendor = vendorById(vendorId);
  const baseName = baseReportName(reportName);
  const all = await publicRankingsStore.listRankings(vendorId);
  const rows = byDateDesc(
    all.filter(
      (r: PublicAnalystRanking) =>
        r.analyst_firm.trim().toLowerCase() === firm.trim().toLowerCase() &&
        baseReportName(r.report_name).toLowerCase() === baseName.toLowerCase()
    )
  );
  if (rows.length === 0) throw new Error("No cited placement history for that report and vendor.");

  const houseId = HOUSE_BY_FIRM[firm.trim().toLowerCase()];
  const playbook = houseId ? playbookById(houseId) : null;

  const sources: SeedSource[] = rows.map((r) =>
    webSource(
      r.source_url,
      "background",
      `${r.report_name}: ${r.placement} (${r.source_type.replace(/_/g, " ")}), ${fmtDate(r.published_date, r.date_precision)}. ${r.summary}`,
      r.published_date
    )
  );
  if (playbook && houseId) {
    sources.push(
      connectorSource(
        `connector://ar-superhero/house-playbook/${houseId}`,
        "required",
        `${playbook.house} engagement playbook: ${playbook.assessment.name} on ${playbook.assessment.axes.join(" and ")}; RFI, reference, deck and briefing guidance with dos and don'ts. Directional synthesis of published methodology, not published weights.`,
        true
      )
    );
  }

  const context = rows.map((r) => `${fmtDate(r.published_date, r.date_precision)}: ${r.placement} (${r.source_type.replace(/_/g, " ")})`);
  if (playbook) {
    context.push(`${playbook.house} evaluates on ${playbook.assessment.axes.join(" and ")}. Leadership: ${playbook.assessment.leadership}`);
  }

  const caveats = [
    "AR SuperHero does not hold the evaluation calendar. Confirm the research “as of” date and the submission deadline with the house before planning.",
  ];
  if (!playbook) caveats.push("No house playbook is held for this firm; guidance comes from the cross-house framework only.");
  const vendorReported = rows.filter((r) => r.source_type !== "analyst_firm_page").length;
  if (vendorReported > 0) {
    caveats.push(
      `${vendorReported} of ${rows.length} placements in this history are vendor-reported rather than confirmed on the analyst firm's own page.`
    );
  }

  return finish({
    kind: "evaluation",
    title: `Next cycle: ${firm} · ${baseName}`,
    goal: `Prepare ${vendor.name}'s next submission to ${firm}'s ${baseName}: a defensible Leader case built on a criterion-level evidence ledger, references chosen by relevance rather than prestige, and every figure owned by a named person.`,
    request: {
      request_id: requestId("evaluation"),
      goal: `Prepare ${vendor.name}'s next submission to ${firm}'s ${baseName}.`,
      mode: "express",
      attachment_ids: [],
    },
    sources,
    context,
    caveats,
    capabilities: [SUPERHERO_CAPABILITIES.rankings, SUPERHERO_CAPABILITIES.coverage, SUPERHERO_CAPABILITIES.brief, SUPERHERO_CAPABILITIES.deck],
    generated_at: new Date().toISOString(),
  });
}

export async function buildWorkSeed(input: SeedInput): Promise<WorkSeed> {
  switch (input.kind) {
    case "analyst-briefing":
      return analystBriefingSeed(input.vendorId, input.analystKey);
    case "scenario":
      return scenarioSeed(input.vendorId, input.personaId, input.scenarioId, input.houseId);
    case "evaluation":
      return evaluationSeed(input.vendorId, input.firm, input.reportName);
  }
}
