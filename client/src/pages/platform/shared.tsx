// Shared building blocks for the AnalystGenius platform pages.
import { useMemo, useState } from "react";
import { Eyebrow } from "@/components/atoms";
import { useAgProviders, useAgStatus, type AgProvider } from "@/lib/agApi";
import { ChevronDown, Search, Wifi, WifiOff } from "lucide-react";

// Gold ramp for 0–100 scores (clarity standard: no red↔green for scores).
export function scoreColor(v: number | null | undefined): string {
  if (v == null) return "hsl(var(--muted-foreground))";
  const t = Math.max(0, Math.min(100, v)) / 100;
  // pale straw -> deep gold
  const light = 78 - t * 34; // 78% -> 44%
  return `hsl(41 62% ${light}%)`;
}

export function ScoreBar({ value, label }: { value: number | null | undefined; label?: string }) {
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
          <span className="font-mono text-[12px] tabular text-foreground">{value == null ? "—" : value}</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value == null ? 0 : Math.max(2, Math.min(100, value))}%`, background: scoreColor(value) }}
        />
      </div>
    </div>
  );
}

export function PlatformHeader({
  eyebrow = "AnalystGenius platform",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  const { data: status } = useAgStatus();
  const live = status?.configured && status?.connected;
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
          live
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-muted/40 text-muted-foreground"
        }`}
        title={
          status?.configured
            ? live
              ? "Live AnalystGenius API"
              : `API configured; upstream ${status?.upstreamStatus ?? "unreachable"}`
            : "API key not configured — no live data"
        }
      >
        {live ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {live ? "Live data" : status?.configured ? "Upstream down" : "Not configured"}
      </div>
    </div>
  );
}

// Not-configured / error empty state — honest, no fabricated fallback.
export function NoData({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
      <div className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">Insufficient data</div>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] text-foreground/85">{message}</p>
    </div>
  );
}

export function LoadingCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3 rounded-xl border border-card-border bg-card p-5">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-muted/60" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

// Searchable provider selector used by the ticker-scoped pages.
export function ProviderPicker({
  ticker,
  onSelect,
}: {
  ticker: string | null;
  onSelect: (t: string) => void;
}) {
  const { data } = useAgProviders();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const providers = data?.providers ?? [];
  const selected = providers.find((p) => p.ticker === ticker);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return providers;
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.ticker.toLowerCase().includes(s) ||
        (p.segment ?? "").toLowerCase().includes(s),
    );
  }, [providers, q]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 min-w-[240px] items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-[13px] hover-elevate"
      >
        <span className="truncate">
          {selected ? (
            <>
              <span className="font-medium text-foreground">{selected.displayName ?? selected.name}</span>
              <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{selected.ticker}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select a provider…</span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1.5 max-h-[360px] w-[320px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search 65 providers…"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto py-1">
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-center text-[12.5px] text-muted-foreground">No matches</div>
              )}
              {filtered.map((p) => (
                <button
                  key={p.ticker}
                  type="button"
                  onClick={() => {
                    onSelect(p.ticker);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] hover-elevate ${
                    p.ticker === ticker ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="min-w-0 truncate">
                    <span className="text-foreground">{p.displayName ?? p.name}</span>
                    <span className="ml-1.5 text-[11px] text-muted-foreground">{p.segment}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{p.ticker}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export type { AgProvider };
