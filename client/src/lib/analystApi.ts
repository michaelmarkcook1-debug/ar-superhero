// Client-side types for the real, Postgres/SQLite-backed analyst API
// (server/services/analystStore.ts, server/services/perceptionEngine.ts).
//
// Distinct from the fictional roster in ./seed: these mirror shared/schema.ts
// exactly, including the parts that are honestly untyped at the DB layer
// (rating/firm_tier are free text, not enums — display only, never switched
// on). Confidence is stored 0-100; seed-era UI atoms (RatingPill, StanceChip,
// ConfidenceMeter) expect 0..1, so every call site here divides by 100.
import { STANCE_OPTIONS, type Stance } from "./seed";

export type AnalystRow = {
  id: string;
  name: string;
  firm: string;
  firm_tier: string;
  role: string | null;
  rating: string;
  rating_overridden: boolean;
  confidence: number; // 0-100
  coverage: string[];
  source: string;
  last_interaction_at: number | null;
  current_stance: { stance: string; confidence: number; note: string | null } | null;
};

export type StanceRow = {
  id: string;
  analyst_id: string;
  stance: string;
  confidence: number; // 0-100
  source: "system_suggestion" | "ar_confirmed" | "ar_manual" | string;
  note: string | null;
  suggested: boolean;
  visible_in_leader_lens: boolean;
  recorded_at: number;
};

export type SignalKind = "note" | "write_up" | "interaction_log" | "upload";

export type SignalRow = {
  id: string;
  analyst_id: string;
  kind: SignalKind;
  title: string;
  content_text: string;
  filename: string | null;
  uploaded_by: string | null;
  created_at: number;
};

export type PerceptionResult = {
  suggested: boolean;
  stanceRecord?: StanceRow;
  reason?: string; // set when suggested === false, e.g. "no signals yet"
};

export const SIGNAL_KIND_OPTIONS: { value: SignalKind; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "write_up", label: "Write-up" },
  { value: "interaction_log", label: "Interaction log" },
  { value: "upload", label: "Upload" },
];

/** Real `stance` values are unconstrained text at the DB layer; narrow defensively rather than trust the string. */
export function asStance(s: string): Stance {
  return (STANCE_OPTIONS as string[]).includes(s) ? (s as Stance) : "Unknown";
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
