import { useMemo, useState } from "react";
import { Card } from "@/components/atoms";
import { useAgProviders } from "@/lib/agApi";
import { PlatformHeader, NoData, LoadingCard, ScoreBar, scoreColor } from "./shared";

const SECTOR_LABELS: Record<string, string> = {
  "global-si": "Global SI",
  "contact-center": "Contact Centre",
  consulting: "Consulting",
  "data-ai-platform": "Data & AI Platform",
  saas: "SaaS",
};

export default function PlatformPulse() {
  const { data, isLoading, error } = useAgProviders();
  const [sector, setSector] = useState<string>("all");
  const [q, setQ] = useState("");

  const providers = data?.providers ?? [];
  const sectors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of providers) counts.set(p.sector ?? "other", (counts.get(p.sector ?? "other") ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [providers]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return providers
      .filter((p) => sector === "all" || p.sector === sector)
      .filter(
        (p) =>
          !s ||
          p.name.toLowerCase().includes(s) ||
          p.ticker.toLowerCase().includes(s) ||
          (p.segment ?? "").toLowerCase().includes(s),
      )
      .sort((a, b) => (b.assessmentScore ?? -1) - (a.assessmentScore ?? -1));
  }, [providers, sector, q]);

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-10 lg:px-8 lg:py-12">
      <PlatformHeader
        title="The Pulse"
        description="Live market intelligence across the IT & business-services provider universe — assessment and AI-readiness scores for every tracked firm, sourced from the AnalystGenius intelligence engine."
      />

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      )}

      {error && <NoData message={`Live provider catalog is unavailable right now (${error.message}).`} />}

      {!isLoading && !error && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSector("all")}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
                sector === "all" ? "border-primary/35 bg-primary/12 text-primary" : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              All {providers.length}
            </button>
            {sectors.map(([s, n]) => (
              <button
                key={s}
                type="button"
                onClick={() => setSector(s)}
                className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
                  sector === s ? "border-primary/35 bg-primary/12 text-primary" : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {SECTOR_LABELS[s] ?? s} {n}
              </button>
            ))}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search providers…"
              className="ml-auto h-8 w-[200px] rounded-lg border border-border bg-card/70 px-3 text-[12.5px] outline-none placeholder:text-muted-foreground/70 focus:border-primary/40"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Card key={p.ticker} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-semibold text-foreground">{p.displayName ?? p.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{p.ticker}</span>
                      <span>·</span>
                      <span className="truncate">{p.segment}</span>
                    </div>
                  </div>
                  {p.level && (
                    <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {p.level}
                    </span>
                  )}
                </div>

                {p.tagline && <p className="line-clamp-2 text-[12px] leading-relaxed text-foreground/75">{p.tagline}</p>}

                <div className="mt-auto space-y-2 pt-1">
                  <ScoreBar label="Assessment" value={p.assessmentScore} />
                  <ScoreBar label="AI readiness" value={p.aiReadinessScore} />
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <span className="truncate">{p.headquarters ?? "—"}</span>
                  <span>{p.employeeCount != null ? `${p.employeeCount.toLocaleString()} staff` : "—"}</span>
                </div>
              </Card>
            ))}
          </div>

          <p className="mt-6 text-[11.5px] text-muted-foreground">
            {filtered.length} of {providers.length} tracked providers
            {data?.count != null && data.count !== providers.length ? ` (catalog reports ${data.count})` : ""}. Scores
            are AnalystGenius composite assessments; a dash means the firm is catalogued but not yet scored.
          </p>
        </>
      )}
    </div>
  );
}
