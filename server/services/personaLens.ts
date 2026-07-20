import type { ArBrief, ArBriefItem } from "./agIntelligence";
import type { PersonaId } from "./directPersonaDeck";

// ============================================================================
// Persona lens — role-scoped view over the live AR brief.
//
// Turns one AR brief into what EACH stakeholder persona needs: their metrics,
// the reputation lenses their role owns, the emergencies/highlights that land
// on their desk, role-scoped advice, and the analyst questions they should
// personally be ready for.
//
// Everything is a deterministic mapping of real AG fields — the role
// relevance rules are declared in PERSONA_RULES below, and every advice line
// carries the signal it derives from. Nothing is generated or invented; if a
// signal is absent, the section is simply shorter.
// ============================================================================

export interface PersonaMetric {
  label: string;
  value: string;
  caption: string;
}

export interface PersonaAdvice {
  line: string;
  source: string; // the AG signal this derives from
}

export interface PersonaView {
  personaId: PersonaId;
  roleTitle: string;
  metrics: PersonaMetric[];
  lenses: { name: string; prev: number; last: number; delta: number; span: string }[];
  emergencies: ArBriefItem[];
  highlights: ArBriefItem[];
  advice: PersonaAdvice[];
  questions: string[];
}

interface PersonaRule {
  roleTitle: string;
  /** Reputation lenses this role owns (matched by name). */
  lenses: string[];
  /** Keywords matching brief.actions "Brief <leader>" routing to this role. */
  leaderKeywords: string[];
  /** Emergency/highlight ids or id-prefixes relevant to the role. */
  itemPrefixes: string[];
  /** Keywords for routing suggestedQuestions to the role. */
  questionKeywords: string[];
}

const PERSONA_RULES: Record<PersonaId, PersonaRule> = {
  executive: {
    roleTitle: "CEO · COO · CSO",
    lenses: ["Financial Analyst"],
    leaderKeywords: ["CFO", "Investor", "Strategy", "CMO"],
    itemPrefixes: ["comp-", "gap-", "rep-drop-Financial", "risk-", "strength-", "rev-growth"],
    questionKeywords: ["strategy", "growth", "invest", "margin", "revenue", "leadership"],
  },
  strategy: {
    roleTitle: "Chief Strategy Officer · Strategy Office",
    lenses: ["Financial Analyst", "Media"],
    leaderKeywords: ["Strategy", "CMO"],
    itemPrefixes: ["gap-", "div-", "comp-"],
    questionKeywords: ["strategy", "market", "position", "compet", "differenti"],
  },
  product: {
    roleTitle: "CPO · CTO · Engineering leadership",
    lenses: ["Employee · Technical"],
    leaderKeywords: ["CTO", "Engineering"],
    itemPrefixes: ["div-", "strength-", "risk-"],
    questionKeywords: ["ai", "product", "platform", "technolog", "innovation", "roadmap"],
  },
  marketing: {
    roleTitle: "CMO · Comms",
    lenses: ["Media", "Social"],
    leaderKeywords: ["Comms", "Marketing", "CMO"],
    itemPrefixes: ["gap-", "div-", "rep-drop-Media", "rep-drop-Social", "rep-up-Media", "rep-up-Social"],
    questionKeywords: ["narrative", "brand", "perception", "message", "market"],
  },
  commercial: {
    roleTitle: "Sales leadership · Deal desk",
    lenses: ["Customer", "Pricing"],
    leaderKeywords: ["Commercial", "Sales", "Deal desk"],
    itemPrefixes: ["comp-", "rep-drop-Customer", "rep-drop-Pricing", "rep-up-Customer", "strength-"],
    questionKeywords: ["customer", "pricing", "deal", "win", "retention", "value"],
  },
  delivery: {
    roleTitle: "Delivery leadership · CHRO",
    lenses: ["Employee", "Employee · Technical"],
    leaderKeywords: ["CHRO", "Delivery"],
    itemPrefixes: ["risk-", "rep-drop-Employee", "rep-up-Employee"],
    questionKeywords: ["talent", "delivery", "workforce", "attrition", "capacity", "scale"],
  },
  regional: {
    roleTitle: "Regional leadership",
    lenses: ["Customer", "Media"],
    leaderKeywords: ["Regional"],
    itemPrefixes: ["gap-", "div-"],
    questionKeywords: ["region", "geograph", "local", "us ", "eu ", "europe", "america", "asia"],
  },
};

function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function matchItems(items: ArBriefItem[], prefixes: string[]): ArBriefItem[] {
  return items.filter((it) => prefixes.some((p) => it.id.startsWith(p)));
}

function containsAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w.toLowerCase()));
}

/** Role-scoped metric cards, all verbatim AG values. */
function metricsFor(personaId: PersonaId, brief: ArBrief): PersonaMetric[] {
  const f = brief.focal;
  if (!f) return [];
  const bestComp = brief.competitors.reduce<{ name: string; score: number } | null>((best, c) => {
    if (c.assessmentScore == null) return best;
    return !best || c.assessmentScore > best.score ? { name: c.name, score: c.assessmentScore } : best;
  }, null);

  const assessment: PersonaMetric = {
    label: "Assessment score",
    value: f.assessmentScore == null ? "—" : String(f.assessmentScore),
    caption: bestComp ? `Best competitor: ${bestComp.name} ${bestComp.score}` : "AG composite assessment",
  };
  const aiReadiness: PersonaMetric = {
    label: "AI readiness",
    value: f.aiReadinessScore == null ? "—" : String(f.aiReadinessScore),
    caption: "AG AI-readiness signal",
  };
  const gap: PersonaMetric = {
    label: "Narrative–reality gap",
    value: f.gapScore == null ? "—" : String(f.gapScore),
    caption: f.gapDirection ?? "—",
  };
  const growth: PersonaMetric = {
    label: "Revenue growth",
    value: fmtPct(f.revenueGrowthYoy),
    caption: "YoY, as reported to AG",
  };

  switch (personaId) {
    case "executive":
      return [assessment, gap, growth];
    case "strategy":
      return [gap, assessment, aiReadiness];
    case "product":
      return [aiReadiness, assessment, gap];
    case "marketing": {
      const media = brief.gapAnalysis?.narrativeSignals.find((s) => s.source === "media");
      const social = brief.gapAnalysis?.narrativeSignals.find((s) => s.source === "social");
      const m: PersonaMetric[] = [gap];
      if (media)
        m.push({
          label: "Media sentiment",
          value: media.sentiment == null ? "—" : `${media.sentiment > 0 ? "+" : ""}${media.sentiment.toFixed(2)}`,
          caption: `Volume ${media.volume ?? "—"}${media.themes.length ? ` · ${media.themes.join(", ")}` : ""}`,
        });
      if (social)
        m.push({
          label: "Social sentiment",
          value: social.sentiment == null ? "—" : `${social.sentiment > 0 ? "+" : ""}${social.sentiment.toFixed(2)}`,
          caption: `Volume ${social.volume ?? "—"}${social.themes.length ? ` · ${social.themes.join(", ")}` : ""}`,
        });
      return m;
    }
    case "commercial": {
      const ahead = brief.competitors.filter(
        (c) => c.assessmentScore != null && f.assessmentScore != null && c.assessmentScore > f.assessmentScore
      );
      return [
        assessment,
        {
          label: "Competitors scoring ahead",
          value: String(ahead.length),
          caption: ahead.length ? ahead.map((c) => c.name).join(" · ") : "None in the selected set",
        },
        growth,
      ];
    }
    case "delivery":
      return [assessment, aiReadiness, growth];
    case "regional":
      return [gap, assessment, growth];
  }
}

/** Role-scoped advice — each line a deterministic reading of a named signal. */
function adviceFor(personaId: PersonaId, brief: ArBrief, view: Omit<PersonaView, "advice" | "questions">): PersonaAdvice[] {
  const advice: PersonaAdvice[] = [];
  const f = brief.focal;
  const ga = brief.gapAnalysis;

  // Actions the brief already routed to this role's leaders.
  const rule = PERSONA_RULES[personaId];
  for (const a of brief.actions) {
    if (containsAny(a.title, rule.leaderKeywords)) {
      advice.push({ line: `${a.title}: ${a.detail}`, source: a.source });
    }
  }

  // Gap-direction reading, phrased for the role that acts on it.
  if (ga?.direction === "under-recognized" && f) {
    const line =
      personaId === "marketing"
        ? `Measured performance is running ahead of the story (gap ${ga.gapScore}) — the recognition gap is yours to close; use the divergence themes as the campaign spine.`
        : personaId === "strategy"
          ? `The market under-tells your measured reality (gap ${ga.gapScore}) — commission the proactive analyst wave and pick the divergence themes to lead with.`
          : personaId === "executive"
            ? `Reality outruns the narrative (gap ${ga.gapScore}, under-recognized) — a proactive briefing programme is the cheapest score move available this cycle.`
            : `Narrative gap ${ga.gapScore} (under-recognized): your evidence is stronger than the market story — surface it through AR.`;
    advice.push({ line, source: "AG narrative-reality-gap · direction/gapScore" });
  }
  if (ga?.direction === "over-hyped") {
    advice.push({
      line: `The story is running ahead of measured reality (gap ${ga.gapScore}) — tighten claims before analysts test them${personaId === "commercial" ? "; brief sellers on which claims are defensible" : ""}.`,
      source: "AG narrative-reality-gap · direction/gapScore",
    });
  }

  // Divergence interpretations, routed where the theme belongs.
  for (const d of ga?.topDivergences ?? []) {
    const technical = containsAny(d.theme, ["ai", "engineering", "platform", "technical", "product"]);
    const regional = containsAny(d.interpretation ?? "", ["us", "eu", "region", "coverage", "local"]);
    const fits =
      personaId === "strategy" ||
      personaId === "marketing" ||
      (personaId === "product" && technical) ||
      (personaId === "regional" && regional) ||
      (personaId === "executive" && Math.abs(d.delta ?? 0) >= 15);
    if (fits && d.interpretation) {
      advice.push({
        line: `${d.theme}: ${d.interpretation} (narrative ${d.narrativeScore ?? "—"} vs reality ${d.realityScore ?? "—"}).`,
        source: "AG narrative-reality-gap · topDivergences",
      });
    }
  }

  // Lens movements this role owns.
  for (const l of view.lenses) {
    if (l.delta <= -5) {
      advice.push({
        line: `${l.name} sentiment fell ${Math.abs(l.delta)} pts (${l.prev} → ${l.last}, ${l.span}) — this lens is yours; get ahead of it before it reaches your counterparts second-hand.`,
        source: "AG reputation-tracker/trends · sentimentTrend",
      });
    } else if (l.delta >= 5) {
      advice.push({
        line: `${l.name} sentiment is up ${l.delta} pts (${l.span}) — momentum you can cite in your next leadership and analyst conversations.`,
        source: "AG reputation-tracker/trends · sentimentTrend",
      });
    }
  }

  return advice.slice(0, 6);
}

/**
 * Build the role-scoped view. Returns null when the brief is not fully live —
 * callers fall back to their labelled demo content instead of blank sections.
 */
export function derivePersonaView(brief: ArBrief, personaId: PersonaId): PersonaView | null {
  if (!brief.live || brief.degraded || !brief.focal) return null;
  const rule = PERSONA_RULES[personaId];

  const lenses = (brief.reputationLenses ?? []).filter((l) => rule.lenses.includes(l.name));
  const partial: Omit<PersonaView, "advice" | "questions"> = {
    personaId,
    roleTitle: rule.roleTitle,
    metrics: metricsFor(personaId, brief),
    lenses,
    emergencies: matchItems(brief.emergencies, rule.itemPrefixes).slice(0, 3),
    highlights: matchItems(brief.highlights, rule.itemPrefixes).slice(0, 3),
  };

  const questions = brief.suggestedQuestions
    .filter((q) => containsAny(q, rule.questionKeywords))
    .slice(0, 3);
  // Every persona should own at least one question; fall back to the top one.
  if (!questions.length && brief.suggestedQuestions.length) {
    questions.push(brief.suggestedQuestions[0]);
  }

  return { ...partial, advice: adviceFor(personaId, brief, partial), questions };
}
