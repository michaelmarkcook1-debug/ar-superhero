// ============================================================================
// AnalystGenius intelligence API client (server-side only).
// The key is read from env and never exposed to the browser — the client goes
// through /api/ag/* proxy routes registered in routes.ts.
// ============================================================================

const AG_API_BASE =
  process.env.AG_API_BASE ?? "https://ag-api-dev-verdant-echo-2983.fly.dev/api/v1";
const AG_API_KEY = process.env.AG_API_KEY ?? "";

// Honest endpoint allow-list. Sourced from the authoritative AnalystGenius
// extractor (AG Sourcing Tool: packages/etl/src/extract/analystgenius.ts),
// which lands this same API into the pipeline.
//
// FACTUAL-DATA GATE: per AnalystGenius's own DATA_AUDIT_2026_06.md, two upstream
// endpoints return real-LOOKING but FABRICATED values and are deliberately NOT
// ingested — they are excluded here too so the app can never surface them:
//   - /financial          (priceChangePercent 0/null for all firms — never real)
//   - /talent/intelligence (hiringTrend/layoffSignal/evidence are synthesized)
//
// Each entry: `path` is the upstream path; `requiresTicker` marks the ones that
// need a ?ticker= query param. `real` flags how much of the payload is trusted.
export interface AgEndpoint {
  key: string;
  path: string;
  requiresTicker: boolean;
  label: string;
}

export const AG_ENDPOINTS: readonly AgEndpoint[] = [
  { key: "providers", path: "providers", requiresTicker: false, label: "Provider catalog" },
  { key: "snapshot", path: "providers/snapshot", requiresTicker: true, label: "Per-firm snapshot detail" },
  { key: "narrative-reality-gap", path: "narrative-reality-gap", requiresTicker: true, label: "Narrative–reality gap signal" },
  { key: "reputation-trends", path: "reputation-tracker/trends", requiresTicker: true, label: "Reputation trend signal" },
] as const;

export function getEndpoint(key: string): AgEndpoint | undefined {
  return AG_ENDPOINTS.find((e) => e.key === key);
}

export const AG_ENDPOINT_KEYS = AG_ENDPOINTS.map((e) => e.key);

export function agConfigured(): boolean {
  return AG_API_KEY.length > 0;
}

export interface AgFetchResult {
  status: number;
  body: unknown;
}

export async function agFetch(
  path: string,
  query?: Record<string, string>
): Promise<AgFetchResult> {
  if (!agConfigured()) {
    return {
      status: 503,
      body: {
        success: false,
        error: "AG_API_KEY is not configured on this server",
        code: "AG_NOT_CONFIGURED",
      },
    };
  }

  const url = new URL(`${AG_API_BASE}/${path.replace(/^\/+/, "")}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      headers: { "X-API-Key": AG_API_KEY, Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { success: false, error: "Upstream returned non-JSON response", raw: text.slice(0, 500) };
    }
    return { status: res.status, body };
  } catch (err) {
    return {
      status: 502,
      body: {
        success: false,
        error: err instanceof Error ? err.message : "Upstream request failed",
        code: "AG_UPSTREAM_ERROR",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
