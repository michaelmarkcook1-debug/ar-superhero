import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getArBrief } from "./agIntelligence";

// ============================================================================
// RFP/RFI analyzer — Enable tab.
//
// Reviews an uploaded draft RFP/RFI response and suggests concrete
// improvements, grounded in two real sources only: (1) live AnalystGenius
// market intelligence for the focal company, and (2) the caller's own
// approved proof-point / claims-to-avoid library. The model is explicitly
// forbidden from inventing statistics, client names, or scores, and from
// suggesting restricted evidence for external use. Every suggestion is
// either tied to a named source or marked as a general (non-evidence)
// clarity/structure note — never presented as verified fact.
// ============================================================================

export interface ProofPointInput {
  title: string;
  status: "safe" | "restricted" | "unsupported";
  reuse: string;
}

export interface ClaimToAvoidInput {
  claim: string;
  reason: string;
}

const SuggestionSchema = z.object({
  category: z.enum(["evidence-gap", "proof-point", "risk", "clarity", "competitive-positioning"]),
  title: z.string(),
  detail: z.string(),
  suggestedAction: z.string(),
  groundedIn: z
    .string()
    .nullable()
    .describe("The specific data point or proof point this suggestion is based on, or null for a general writing/structure note."),
});

const RfpAnalysisSchema = z.object({
  documentSummary: z.string().describe("Neutral 2-3 sentence summary of what the document is asking for."),
  suggestions: z.array(SuggestionSchema).max(12),
  strengthsFound: z.array(z.string()).max(6).describe("Things the draft already does well."),
});

export type RfpAnalysis = z.infer<typeof RfpAnalysisSchema>;

export interface AnalyzeRfpInput {
  documentText: string;
  filename: string;
  competitorTickers?: string[];
  proofPoints: ProofPointInput[];
  claimsToAvoid: ClaimToAvoidInput[];
}

export interface AnalyzeRfpResult extends RfpAnalysis {
  usedLiveData: boolean;
  liveDataReason: string | null;
}

export async function analyzeRfp(input: AnalyzeRfpInput): Promise<AnalyzeRfpResult> {
  const brief = await getArBrief({ competitors: input.competitorTickers });
  const usedLiveData = brief.live && !brief.degraded && Boolean(brief.focal);

  const safeProof = input.proofPoints.filter((p) => p.status === "safe");
  const restrictedProof = input.proofPoints.filter((p) => p.status !== "safe");

  const contextBlocks = [
    usedLiveData && brief.focal
      ? `LIVE MARKET INTELLIGENCE (from AnalystGenius, real, generated ${brief.generatedAt}):
- Company: ${brief.focal.name}
- Assessment score: ${brief.focal.assessmentScore ?? "unknown"}
- AI readiness score: ${brief.focal.aiReadinessScore ?? "unknown"}
- Revenue growth YoY: ${brief.focal.revenueGrowthYoy ?? "unknown"}%
- Narrative-reality gap: ${brief.focal.gapScore ?? "unknown"} (${brief.focal.gapDirection ?? "unknown"}) — ${brief.focal.gapHeadline ?? "no headline"}
- Competitive read: ${brief.competitors.length ? brief.competitors.map((c) => `${c.name} (assessment ${c.assessmentScore ?? "—"})`).join(", ") : "no competitor data"}`
      : `LIVE MARKET INTELLIGENCE: unavailable for this analysis (${brief.reason ?? "unknown reason"}). Do not invent scores or competitive data — explicitly note this limitation instead of guessing.`,
    safeProof.length
      ? `APPROVED, EXTERNALLY-SAFE PROOF POINTS (may be suggested for this RFP response):\n${safeProof.map((p) => `- ${p.title}`).join("\n")}`
      : "APPROVED, EXTERNALLY-SAFE PROOF POINTS: none provided.",
    restrictedProof.length
      ? `RESTRICTED OR UNSUPPORTED EVIDENCE — DO NOT SUGGEST CITING THESE EXTERNALLY:\n${restrictedProof
          .map((p) => `- ${p.title} (${p.status}: ${p.reuse})`)
          .join("\n")}`
      : "",
    input.claimsToAvoid.length
      ? `CLAIMS TO AVOID (would be challenged if used):\n${input.claimsToAvoid.map((c) => `- "${c.claim}" — ${c.reason}`).join("\n")}`
      : "",
  ].filter(Boolean);

  const result = await generateText({
    model: anthropic("claude-sonnet-5"),
    system: `You are reviewing a draft RFP/RFI response for an analyst-relations and bid team. Find concrete, specific improvements — do not rewrite the document, and do not invent facts.

Rules, followed exactly:
1. Every suggestion must trace either to something explicit in the document text, or to one of the real data points given to you. Never invent a statistic, client name, score, or competitor detail not provided to you.
2. Never suggest citing a restricted or unsupported proof point externally, under any framing.
3. If a suggestion is a general clarity/structure point not tied to a specific data point, set groundedIn to null rather than fabricating a source.
4. If live market intelligence is marked unavailable, say so plainly in your suggestions rather than guessing at scores or positioning.
5. Be specific and actionable: "add evidence" is not useful; "insert the named proof point in the cost section to support the reduction claim" is useful.`,
    prompt: `${contextBlocks.join("\n\n")}\n\n---\n\nDRAFT RFP/RFI RESPONSE (from ${input.filename}):\n\n${input.documentText}`,
    output: Output.object({ schema: RfpAnalysisSchema }),
    maxOutputTokens: 4096,
  });

  return {
    ...result.output,
    usedLiveData,
    liveDataReason: usedLiveData ? null : brief.reason ?? "unavailable",
  };
}
