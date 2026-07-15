// ============================================================================
// AnalystGenius intelligence — client-side types + React Query hooks.
// All requests go through the server proxy at /api/ag/* (the API key never
// reaches the browser). Only real fields are typed; missing values stay null
// and the UI renders them honestly rather than fabricating.
// ============================================================================

import { useQuery } from "@tanstack/react-query";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export interface AgEndpointMeta {
  key: string;
  label: string;
  requiresTicker: boolean;
}
export interface AgStatus {
  configured: boolean;
  connected: boolean;
  upstreamStatus?: number;
  endpoints: AgEndpointMeta[];
}

export interface AgProvider {
  ticker: string;
  name: string;
  displayName?: string | null;
  domain?: string | null;
  level?: string | null;
  segment?: string | null;
  sector?: string | null;
  headquarters?: string | null;
  employeeCount?: number | null;
  isPublic?: boolean | null;
  isForeign?: boolean | null;
  tagline?: string | null;
  assessmentScore?: number | null;
  aiReadinessScore?: number | null;
}

export interface AgQuarterPoint {
  quarter: string;
  revenueUsdM: number;
}
export interface AgSnapshot extends AgProvider {
  ceo?: string | null;
  foundedYear?: number | null;
  revenueUsd?: number | null;
  revenueGrowthYoy?: number | null;
  narrativeRealityGap?: number | null;
  topStrengths?: string[];
  topRisks?: string[];
  agInsight?: string | null;
  quarterlyRevenue?: AgQuarterPoint[];
  quarterlyHeadcount?: unknown[];
}

export interface AgNarrativeSignal {
  source: string;
  sentiment: number;
  volume: number;
  themes: string[];
}
export interface AgRealitySignal {
  label: string;
  value: number | null;
  metric: string;
  percentile: number | null;
}
export interface AgDivergence {
  theme: string;
  basis?: string;
  delta: number;
  metric?: string;
  realityScore?: number;
  narrativeScore?: number;
  interpretation?: string;
}
export interface AgGap {
  ticker: string;
  providerName: string;
  gapScore: number | null;
  direction: string | null;
  headline: string | null;
  generatedAt?: string | null;
  narrativeSignals?: AgNarrativeSignal[];
  realitySignals?: AgRealitySignal[];
  topDivergences?: AgDivergence[];
}

export interface AgSentimentSeries {
  name: string;
  color: string;
  data: number[];
}
export interface AgReputationSection {
  id: string;
  title: string;
  icon?: string;
  status?: string;
  sentimentScore?: number | null;
  trend?: string;
  themes?: { label: string; sentiment?: number }[];
}
export interface AgReputation {
  ticker: string;
  companyName?: string;
  displayName?: string;
  insightTitle?: string | null;
  insightBody?: string | null;
  suggestedQuestions?: string[];
  sentimentTrend?: { quarters: string[]; series: AgSentimentSeries[] };
  sections?: AgReputationSection[];
  generatedAt?: string | null;
}

async function agGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body && (body.error || body.message)) || `${res.status}`;
    throw new Error(String(msg));
  }
  return body as T;
}

export function useAgStatus() {
  return useQuery<AgStatus>({ queryKey: ["/api/ag/status"], queryFn: () => agGet("/api/ag/status") });
}

export function useAgProviders() {
  return useQuery<{ success: boolean; count: number; providers: AgProvider[] }>({
    queryKey: ["/api/ag/providers"],
    queryFn: () => agGet("/api/ag/providers"),
  });
}

export function useAgSnapshot(ticker: string | null) {
  return useQuery<{ success: boolean; snapshot: AgSnapshot | null }>({
    queryKey: ["/api/ag/snapshot", ticker],
    queryFn: () => agGet(`/api/ag/snapshot?ticker=${encodeURIComponent(ticker!)}`),
    enabled: !!ticker,
  });
}

export function useAgGap(ticker: string | null) {
  return useQuery<{ success: boolean; gap: AgGap | null }>({
    queryKey: ["/api/ag/narrative-reality-gap", ticker],
    queryFn: () => agGet(`/api/ag/narrative-reality-gap?ticker=${encodeURIComponent(ticker!)}`),
    enabled: !!ticker,
  });
}

export function useAgReputation(ticker: string | null) {
  return useQuery<AgReputation & { success: boolean }>({
    queryKey: ["/api/ag/reputation-trends", ticker],
    queryFn: () => agGet(`/api/ag/reputation-trends?ticker=${encodeURIComponent(ticker!)}`),
    enabled: !!ticker,
  });
}

// ---- formatting helpers (never fabricate; null -> honest dash) ----
export function fmtUsd(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}
export function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
export function fmtInt(v: number | null | undefined): string {
  return v == null ? "—" : v.toLocaleString();
}
