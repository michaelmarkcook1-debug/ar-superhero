// ============================================================================
// AnalystGenius intelligence API client (server-side only).
// The key is read from env and never exposed to the browser — the client goes
// through /api/ag/* proxy routes registered in routes.ts.
// ============================================================================

const AG_API_BASE =
  process.env.AG_API_BASE ?? "https://ag-api-dev-verdant-echo-2983.fly.dev/api/v1";
const AG_API_KEY = process.env.AG_API_KEY ?? "";

// Resources confirmed to exist on the upstream API (respond 401 without a key,
// i.e. they are real routes behind auth). Anything else is rejected locally.
export const AG_RESOURCES = [
  "news",
  "financial",
  "companies",
  "providers",
  "competitors",
] as const;
export type AgResource = (typeof AG_RESOURCES)[number];

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
