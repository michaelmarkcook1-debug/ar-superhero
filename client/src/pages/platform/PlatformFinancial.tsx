import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, KeyValue } from "@/components/atoms";
import { TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { useAgSnapshot, fmtUsd, fmtPct, fmtInt } from "@/lib/agApi";
import { PlatformHeader, ProviderPicker, NoData, LoadingCard, ScoreBar } from "./shared";

export default function PlatformFinancial() {
  const [ticker, setTicker] = useState<string | null>("ACN");
  const { data, isLoading, error } = useAgSnapshot(ticker);
  const s = data?.snapshot ?? null;

  const revenue = (s?.quarterlyRevenue ?? [])
    .slice()
    .reverse()
    .map((q) => ({ quarter: q.quarter.slice(0, 7), value: q.revenueUsdM }));

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10 lg:px-8 lg:py-12">
      <PlatformHeader
        title="Financial Snapshot"
        description="Reported financials and AnalystGenius assessment for any tracked provider — revenue, growth, and quarterly trend, with strengths and risks."
      />

      <div className="mb-6">
        <ProviderPicker ticker={ticker} onSelect={setTicker} />
      </div>

      {isLoading && <LoadingCard lines={5} />}
      {error && <NoData message={`Snapshot unavailable (${error.message}).`} />}
      {!isLoading && !error && !s && <NoData message="No snapshot is published for this provider yet." />}

      {s && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h2 className="text-[19px] font-semibold tracking-tight">{s.displayName ?? s.name}</h2>
                  <span className="font-mono text-[12px] text-muted-foreground">{s.ticker}</span>
                </div>
                {s.tagline && <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-foreground/80">{s.tagline}</p>}
              </div>
              {s.revenueGrowthYoy != null && (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium ${
                    s.revenueGrowthYoy >= 0
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {s.revenueGrowthYoy >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {fmtPct(s.revenueGrowthYoy)} YoY
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <KeyValue label="Revenue" value={fmtUsd(s.revenueUsd)} mono />
              <KeyValue label="Employees" value={fmtInt(s.employeeCount)} mono />
              <KeyValue label="CEO" value={s.ceo ?? "—"} />
              <KeyValue label="Founded" value={s.foundedYear ?? "—"} mono />
              <KeyValue label="HQ" value={s.headquarters ?? "—"} />
              <KeyValue label="Sector" value={s.segment ?? "—"} />
              <KeyValue label="Public" value={s.isPublic == null ? "—" : s.isPublic ? "Yes" : "No"} />
              <KeyValue label="Narrative–reality gap" value={s.narrativeRealityGap ?? "—"} mono />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ScoreBar label="Assessment score" value={s.assessmentScore} />
              <ScoreBar label="AI readiness" value={s.aiReadinessScore} />
            </div>
          </Card>

          {revenue.length > 0 && (
            <Card>
              <div className="mb-3 text-[13px] font-semibold text-foreground">Quarterly revenue (US$M)</div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`$${v.toLocaleString()}M`, "Revenue"]}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {revenue.map((_, i) => (
                        <Cell key={i} fill="hsl(41 58% 52%)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {(s.topStrengths?.length || s.topRisks?.length) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {s.topStrengths?.length ? (
                <Card>
                  <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-primary">Top strengths</div>
                  <ul className="space-y-1.5">
                    {s.topStrengths.map((t, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-foreground/85">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {s.topRisks?.length ? (
                <Card>
                  <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Top risks</div>
                  <ul className="space-y-1.5">
                    {s.topRisks.map((t, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-foreground/85">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          )}

          {s.agInsight && (
            <Card className="border-primary/20 bg-primary/[0.04]">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">AnalystGenius insight</div>
              <p className="text-[13.5px] leading-relaxed text-foreground/90">{s.agInsight}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
