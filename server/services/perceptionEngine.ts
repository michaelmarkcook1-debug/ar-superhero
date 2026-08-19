import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { analystStore } from "./analystStore";
import type { StanceRecord } from "@shared/schema";

// ============================================================================
// Perception engine — Direct tab (analyst ranking/perception).
//
// Reads an analyst's real, human-entered signals (uploaded notes, write-ups,
// interaction logs) and suggests a stance update. The suggestion is stored
// with source "system_suggestion" / suggested: true and is NEVER shown as a
// confirmed fact — the schema already models this duality (analyst_relation-
// ship_stances.source: system_suggestion | ar_confirmed | ar_manual). AR
// staff review the suggestion and either confirm it (re-inserted as
// ar_confirmed) or leave it aside; the model never writes an ar_confirmed
// row itself. No score is invented from nothing — if there are no signals
// yet, the engine declines to suggest rather than guessing.
// ============================================================================

const STANCES = ["Friendly", "Neutral", "Inattentive", "Irrelevant", "Combative", "Unknown"] as const;

const SuggestionSchema = z.object({
  stance: z.enum(STANCES),
  confidence: z.number().int().min(0).max(100),
  rationale: z.string().describe("2-4 sentences citing specifically which uploaded signals/interactions this is based on."),
});

export interface PerceptionResult {
  suggested: boolean;
  stanceRecord?: StanceRecord;
  reason?: string; // set when suggested === false (e.g. "no signals yet")
}

export async function suggestStanceFromSignals(analystId: string): Promise<PerceptionResult> {
  const analyst = await analystStore.getAnalyst(analystId);
  if (!analyst) return { suggested: false, reason: "Analyst not found." };

  const [signals, interactions, priorStances] = await Promise.all([
    analystStore.listSignals(analystId),
    analystStore.listInteractions(analystId),
    analystStore.listStances(analystId),
  ]);

  if (signals.length === 0 && interactions.length === 0) {
    return { suggested: false, reason: "No uploaded notes, write-ups, or logged interactions for this analyst yet." };
  }

  const currentStance = priorStances[0]; // listStances is ordered recorded_at DESC

  const signalBlock = signals
    .slice(0, 20)
    .map((s) => `[${s.kind}, ${new Date(s.created_at).toISOString().slice(0, 10)}] ${s.title}\n${s.content_text}`)
    .join("\n\n---\n\n");
  const interactionBlock = interactions
    .slice(0, 20)
    .map((i) => `[${i.type}, ${new Date(i.occurred_at).toISOString().slice(0, 10)}] ${i.title}${i.notes ? `\n${i.notes}` : ""}`)
    .join("\n\n---\n\n");

  const result = await generateText({
    model: anthropic("claude-sonnet-5"),
    system: `You classify an analyst-relations (AR) team's working relationship with a named industry analyst, based only on real notes and interaction logs the AR team itself wrote. Never invent detail not present in the material you're given.

Valid stances, exactly as defined: Friendly (actively collaborative, positive toward us), Neutral (professional, no clear lean), Inattentive (low engagement, hard to reach or slow to respond), Irrelevant (limited overlap with our coverage/relevance), Combative (actively critical or adversarial), Unknown (insufficient signal to classify).

Rules:
1. Base your classification only on the provided notes/interactions — do not assume industry reputation or anything not written down.
2. If the material is genuinely mixed or thin, say so in the rationale and prefer Neutral or Unknown over guessing at a stronger stance.
3. Confidence should reflect how much and how consistent the evidence is — a single short note should not produce high confidence.
4. The rationale must name specific things from the material (dates, topics, tone described) — not generic language.`,
    prompt: [
      `Analyst: ${analyst.name} (${analyst.firm}${analyst.role ? `, ${analyst.role}` : ""})`,
      currentStance ? `Last recorded stance: ${currentStance.stance} (${currentStance.source}, confidence ${currentStance.confidence})` : "No prior stance recorded.",
      signalBlock ? `UPLOADED NOTES / WRITE-UPS:\n\n${signalBlock}` : "UPLOADED NOTES / WRITE-UPS: none.",
      interactionBlock ? `LOGGED INTERACTIONS:\n\n${interactionBlock}` : "LOGGED INTERACTIONS: none.",
    ].join("\n\n"),
    output: Output.object({ schema: SuggestionSchema }),
    maxOutputTokens: 1024,
  });

  const stanceRecord = await analystStore.insertStance({
    analyst_id: analystId,
    stance: result.output.stance,
    confidence: result.output.confidence,
    source: "system_suggestion",
    note: result.output.rationale,
    suggested: true,
    visible_in_leader_lens: false,
  });

  return { suggested: true, stanceRecord };
}

/** AR staff accepting a suggested stance: re-records it as confirmed. */
export async function confirmStance(analystId: string, stanceId: string): Promise<StanceRecord | null> {
  const stances = await analystStore.listStances(analystId);
  const target = stances.find((s) => s.id === stanceId);
  if (!target) return null;
  return analystStore.insertStance({
    analyst_id: analystId,
    stance: target.stance,
    confidence: target.confidence,
    source: "ar_confirmed",
    note: target.note,
    suggested: false,
    visible_in_leader_lens: true,
  });
}
