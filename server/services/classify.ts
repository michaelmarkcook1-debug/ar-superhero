import type { NormalisedItem } from "../connectors/types";
import type { Workstream, Analyst, SyncedItem } from "@shared/schema";

// ============================================================================
// Deterministic, signal-based item classification and auto-linking.
// Pure functions so behaviour is easy to reason about and unit-test.
// ============================================================================

export interface ClassifyResult {
  workstreamId: string | null;
  confidence: number; // 0-100
  reason: string;
}

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let count = 0;
  a.forEach((t) => {
    if (b.has(t)) count++;
  });
  return count;
}

export function classify(item: NormalisedItem, workstreams: Workstream[]): ClassifyResult {
  // Score each workstream against the item signals.
  let best: ClassifyResult = { workstreamId: null, confidence: 0, reason: "" };
  const itemTokens = tokenSet(
    [
      item.title,
      item.body_excerpt ?? "",
      ...(item.signals.markets ?? []),
      ...(item.signals.keywords ?? []),
      item.signals.assessment_type ?? "",
    ].join(" ")
  );
  const itemFirms = (item.signals.firms ?? []).map((s) => s.toLowerCase());
  const itemAnalystNames = (item.signals.analyst_names ?? []).map((s) => s.toLowerCase());

  for (const ws of workstreams) {
    const wsKeywords = parseJson<string[]>(ws.keywords, []);
    const wsTokens = tokenSet([ws.name, ws.market ?? "", ws.firm, ws.model, ...wsKeywords].join(" "));
    let score = 0;
    const reasons: string[] = [];

    // Firm match — strong signal.
    if (itemFirms.some((f) => f.toLowerCase().includes(ws.firm.toLowerCase()) || ws.firm.toLowerCase().includes(f))) {
      score += 35;
      reasons.push(`firm match (${ws.firm})`);
    }
    // Assessment-type / model match.
    if (item.signals.assessment_type && ws.model.toLowerCase().includes(item.signals.assessment_type.toLowerCase().split(" ")[0])) {
      score += 25;
      reasons.push(`model match (${ws.model})`);
    }
    // Market / keyword overlap.
    const ov = overlap(itemTokens, wsTokens);
    if (ov > 0) {
      const bonus = Math.min(30, ov * 6);
      score += bonus;
      reasons.push(`${ov} keyword overlap`);
    }
    // File path hints (e.g. /AR Submissions/Gartner_MQ_...).
    if (item.signals.file_path) {
      const path = item.signals.file_path.toLowerCase();
      if (path.includes(ws.firm.toLowerCase()) || path.includes(ws.model.toLowerCase().split(" ")[0])) {
        score += 15;
        reasons.push("file path hint");
      }
    }
    // Sender domain hint (analyst houses).
    if (item.signals.sender_domain) {
      const dom = item.signals.sender_domain.toLowerCase();
      const firmKey = ws.firm.toLowerCase().split(" ")[0];
      if (dom.includes(firmKey)) {
        score += 10;
        reasons.push(`sender domain ${dom}`);
      }
    }

    if (score > best.confidence) {
      best = {
        workstreamId: ws.id,
        confidence: Math.min(95, score),
        reason: reasons.join("; ") || "no signal",
      };
    }
  }

  return best;
}

export function findAnalystByName(name: string, analysts: Analyst[]): Analyst | undefined {
  const target = name.toLowerCase().trim();
  return analysts.find((a) => a.name.toLowerCase() === target);
}

// Heuristic for whether the item should auto-create a "Needs confirmation" interaction.
export function shouldAutoAddInteraction(item: NormalisedItem, classify: ClassifyResult): boolean {
  if (classify.confidence < 50) return false;
  return (
    item.type === "calendar_event" ||
    item.type === "briefing_request" ||
    (item.type === "email" && (item.signals.analyst_names?.length ?? 0) > 0)
  );
}

// Suggest evidence candidates from synced items.
export function suggestEvidence(item: SyncedItem, signals: NormalisedItem["signals"]): {
  title: string;
  detail?: string;
} | null {
  if (item.type === "document" || item.type === "analyst_research") {
    return {
      title: `Candidate evidence: ${item.title}`,
      detail: item.body_excerpt ?? undefined,
    };
  }
  if (item.type === "email" && (signals.keywords ?? []).some((k) => /reference|case study|outcome|metric/i.test(k))) {
    return {
      title: `Candidate evidence (email): ${item.title}`,
      detail: item.body_excerpt ?? undefined,
    };
  }
  return null;
}

// Suggest tasks from synced items (NOT auto-accepted).
export function suggestTasks(item: SyncedItem, signals: NormalisedItem["signals"]): {
  title: string;
  detail?: string;
}[] {
  const tasks: { title: string; detail?: string }[] = [];
  const body = `${item.title} ${item.body_excerpt ?? ""}`.toLowerCase();

  if (body.includes("reference") || body.includes("references")) {
    tasks.push({
      title: "Provide additional references",
      detail: `Triggered by synced item: ${item.title}`,
    });
  }
  if (body.includes("questionnaire") || body.includes("rfi") || body.includes("response")) {
    tasks.push({
      title: "Prepare vendor questionnaire response",
      detail: `Triggered by synced item: ${item.title}`,
    });
  }
  if (body.includes("briefing")) {
    tasks.push({
      title: "Confirm briefing logistics & prep pack",
      detail: `Triggered by synced item: ${item.title}`,
    });
  }
  if (signals.assessment_type) {
    tasks.push({
      title: `Refresh ${signals.assessment_type} positioning`,
      detail: `Triggered by synced item: ${item.title}`,
    });
  }
  return tasks.slice(0, 2); // keep suggestions focused
}

// Suggest a stance update (suggestion only, never auto-applies).
export function suggestStanceUpdate(
  analyst: Analyst,
  signals: NormalisedItem["signals"]
): { stance: string; confidence: number; note: string } | null {
  const kw = (signals.keywords ?? []).join(" ").toLowerCase();
  const body = `${kw}`;
  if (body.includes("declined") || body.includes("combative") || body.includes("critical")) {
    return {
      stance: "Combative",
      confidence: 60,
      note: "Synced item language suggests a more critical posture — confirm before applying.",
    };
  }
  if (body.includes("supportive") || body.includes("positive") || body.includes("endorsed")) {
    return {
      stance: "Friendly",
      confidence: 65,
      note: "Synced item language suggests a friendlier posture — confirm before applying.",
    };
  }
  return null;
}
