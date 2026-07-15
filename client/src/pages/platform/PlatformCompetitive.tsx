import { useState } from "react";
import { Card } from "@/components/atoms";
import { useAgGap, type AgNarrativeSignal } from "@/lib/agApi";
import { PlatformHeader, ProviderPicker, NoData, LoadingCard } from "./shared";

const HOUSE_LABELS: Record<string, string> = {
  gartner: "Gartner",
  forrester: "Forrester",
  idc: "IDC",
  hfs: "HFS",
  everest: "Everest",
  nelsonhall: "NelsonHall",
  isg: "ISG",
  media: "Trade press",
  social: "Social",
};

function sentimentTone(v: number): string {
  // sentiment roughly -1..1; map to a neutral→gold scale (no red↔green).
  if (v >= 0.15) return "text-primary";
  if (v <= -0.05) return "text-muted-foreground";
  return "text-foreground/70";
}

function NarrativeRow({ sig }: { sig: AgNarrativeSignal }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2.5 last:border-0">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground">{HOUSE_LABELS[sig.source] ?? sig.source}</div>
        {sig.themes?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {sig.themes.map((t, i) => (
              <span key={i} className="rounded-full bg-muted/50 px-2 py-0.5 text-[10.5px] text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className={`font-mono text-[13px] tabular ${sentimentTone(sig.sentiment)}`}>
          {sig.sentiment > 0 ? "+" : ""}
          {sig.sentiment.toFixed(2)}
        </div>
        <div className="text-[10.5px] text-muted-foreground">vol {sig.volume}</div>
      </div>
    </div>
  );
}

export default function PlatformCompetitive() {
  const [ticker, setTicker] = useState<string | null>("ACN");
  const { data, isLoading, error } = useAgGap(ticker);
  const gap = data?.gap ?? null;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10 lg:px-8 lg:py-12">
      <PlatformHeader
        title="Competitive Intel"
        description="The narrative–reality gap: how the analyst-house and media story about a provider compares to its measured performance, with the widest divergences called out."
      />

      <div className="mb-6">
        <ProviderPicker ticker={ticker} onSelect={setTicker} />
      </div>

      {isLoading && <LoadingCard lines={5} />}
      {error && <NoData message={`Gap analysis unavailable (${error.message}).`} />}
      {!isLoading && !error && !gap && <NoData message="No narrative–reality gap signal for this provider yet." />}

      {gap && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Narrative–reality gap
                </div>
                <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-foreground">{gap.headline}</p>
              </div>
              <div className="shrink-0 text-center">
                <div className="font-mono text-[34px] font-semibold leading-none text-primary">{gap.gapScore ?? "—"}</div>
                <div className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">gap score</div>
                {gap.direction && (
                  <div className="mt-1.5 inline-block rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/80">
                    {gap.direction}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            {gap.narrativeSignals?.length ? (
              <Card>
                <div className="mb-1 text-[13px] font-semibold text-foreground">Narrative signals</div>
                <p className="mb-2 text-[11.5px] text-muted-foreground">Sentiment &amp; volume by analyst house / media</p>
                <div>
                  {gap.narrativeSignals.map((sig, i) => (
                    <NarrativeRow key={i} sig={sig} />
                  ))}
                </div>
              </Card>
            ) : null}

            {gap.realitySignals?.length ? (
              <Card>
                <div className="mb-1 text-[13px] font-semibold text-foreground">Reality signals</div>
                <p className="mb-2 text-[11.5px] text-muted-foreground">Measured performance metrics</p>
                <div>
                  {gap.realitySignals.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 border-b border-border/50 py-2.5 last:border-0">
                      <span className="text-[13px] text-foreground/85">{r.label}</span>
                      <span className="font-mono text-[13px] tabular text-foreground">
                        {r.value == null ? "—" : r.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          {gap.topDivergences?.length ? (
            <Card>
              <div className="mb-3 text-[13px] font-semibold text-foreground">Top divergences</div>
              <div className="space-y-3">
                {gap.topDivergences.map((d, i) => (
                  <div key={i} className="rounded-lg border border-border/60 bg-card/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-medium text-foreground">{d.theme}</span>
                      {typeof d.delta === "number" && (
                        <span className="font-mono text-[12px] tabular text-primary">Δ {d.delta}</span>
                      )}
                    </div>
                    {(d.narrativeScore != null || d.realityScore != null) && (
                      <div className="mt-1.5 flex gap-4 text-[11.5px] text-muted-foreground">
                        {d.narrativeScore != null && <span>narrative {d.narrativeScore}</span>}
                        {d.realityScore != null && <span>reality {d.realityScore}</span>}
                      </div>
                    )}
                    {d.interpretation && <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/80">{d.interpretation}</p>}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {gap.generatedAt && (
            <p className="text-[11px] text-muted-foreground">
              Generated {new Date(gap.generatedAt).toLocaleDateString()} · AnalystGenius narrative-reality engine
            </p>
          )}
        </div>
      )}
    </div>
  );
}
