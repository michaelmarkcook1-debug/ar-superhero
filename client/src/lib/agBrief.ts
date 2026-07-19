import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Shared client state for the live AG AR-brief: competitor selection
// (localStorage-persisted) and the ar-brief query keyed by that selection.
// ============================================================================

const STORAGE_KEY = "ag-competitor-tickers";
export const MAX_COMPETITORS = 5;

export type ArBriefItem = {
  id: string;
  title: string;
  detail: string;
  source: string;
  severity?: "HIGH" | "MEDIUM" | "LOW";
  metric?: string;
};

export type ArCompetitorRead = {
  ticker: string;
  name: string;
  assessmentScore: number | null;
  aiReadinessScore: number | null;
  revenueGrowthYoy: number | null;
  gapDirection: string | null;
  gapScore: number | null;
};

export type ArGapAnalysis = {
  headline: string | null;
  gapScore: number | null;
  direction: string | null;
  agInsight: string | null;
  narrativeSignals: { source: string; sentiment: number | null; volume: number | null; themes: string[] }[];
  realitySignals: { metric: string; label: string; value: number | null }[];
  topDivergences: {
    theme: string;
    narrativeScore: number | null;
    realityScore: number | null;
    delta: number | null;
    interpretation: string | null;
  }[];
  generatedAt: string | null;
};

export type ArBrief = {
  live: boolean;
  degraded?: boolean;
  reason?: string;
  generatedAt: string;
  focal?: {
    ticker: string;
    name: string;
    assessmentScore: number | null;
    aiReadinessScore: number | null;
    revenueUsd: number | null;
    revenueGrowthYoy: number | null;
    gapScore: number | null;
    gapDirection: string | null;
    gapHeadline: string | null;
    reputationInsightTitle: string | null;
    reputationInsightBody: string | null;
  };
  gapAnalysis?: ArGapAnalysis;
  competitorTickers: string[];
  emergencies: ArBriefItem[];
  highlights: ArBriefItem[];
  actions: ArBriefItem[];
  competitors: ArCompetitorRead[];
  suggestedQuestions: string[];
  sourceNote: string;
};

export type AgProvider = {
  ticker: string;
  name: string;
  displayName?: string | null;
  segment?: string | null;
  sector?: string | null;
};

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((t) => typeof t === "string").slice(0, MAX_COMPETITORS) : [];
  } catch {
    return [];
  }
}

/** localStorage-persisted competitor tickers. Empty array = server default set. */
export function useCompetitorSelection() {
  const [competitors, setCompetitorsState] = useState<string[]>(readStored);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setCompetitorsState(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCompetitors = useCallback((next: string[]) => {
    const capped = next.slice(0, MAX_COMPETITORS);
    setCompetitorsState(capped);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    } catch {
      // Storage unavailable (private mode) — selection still works for the session.
    }
  }, []);

  return { competitors, setCompetitors };
}

/** The live AR brief for the given competitor set (empty = server default). */
export function useArBrief(competitors: string[]) {
  const qs = competitors.length ? `?competitors=${encodeURIComponent(competitors.join(","))}` : "";
  return useQuery<ArBrief>({ queryKey: [`/api/ag/ar-brief${qs}`] });
}

/** Full provider catalog for the competitor picker. */
export function useAgProviders() {
  return useQuery<{ success: boolean; providers: AgProvider[] }>({
    queryKey: ["/api/ag/providers"],
  });
}

/** Read the stored selection outside React (deck-generation payloads). */
export function storedCompetitorTickers(): string[] {
  return readStored();
}
