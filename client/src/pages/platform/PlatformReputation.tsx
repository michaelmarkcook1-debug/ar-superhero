import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card } from "@/components/atoms";
import { HelpCircle } from "lucide-react";
import { useAgReputation } from "@/lib/agApi";
import { PlatformHeader, ProviderPicker, NoData, LoadingCard } from "./shared";

export default function PlatformReputation() {
  const [ticker, setTicker] = useState<string | null>("ACN");
  const { data, isLoading, error } = useAgReputation(ticker);
  const rep = data && data.success ? data : null;
  const trend = rep?.sentimentTrend;

  const chartData =
    trend?.quarters.map((q, i) => {
      const row: Record<string, string | number> = { quarter: q };
      for (const s of trend.series) row[s.name] = s.data[i];
      return row;
    }) ?? [];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10 lg:px-8 lg:py-12">
      <PlatformHeader
        title="Reputation Tracker"
        description="Sentiment across analyst, media, social, customer, and employee lenses over time — with an AI-generated read of what's driving the trend and the questions to put to the provider."
      />

      <div className="mb-6">
        <ProviderPicker ticker={ticker} onSelect={setTicker} />
      </div>

      {isLoading && <LoadingCard lines={5} />}
      {error && <NoData message={`Reputation data unavailable (${error.message}).`} />}
      {!isLoading && !error && !rep && <NoData message="No reputation signal for this provider yet." />}

      {rep && (
        <div className="space-y-4">
          {rep.insightTitle && (
            <Card>
              <h2 className="text-[16px] font-semibold leading-snug tracking-tight text-foreground">{rep.insightTitle}</h2>
              {rep.insightBody && <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/85">{rep.insightBody}</p>}
            </Card>
          )}

          {chartData.length > 0 && trend && (
            <Card>
              <div className="mb-3 text-[13px] font-semibold text-foreground">Sentiment trend by lens</div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
                    {trend.series.map((s) => (
                      <Line
                        key={s.name}
                        type="monotone"
                        dataKey={s.name}
                        stroke={s.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {rep.sections?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {rep.sections.map((sec) => (
                <Card key={sec.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-foreground">{sec.title}</div>
                    {sec.sentimentScore != null && (
                      <span className="font-mono text-[15px] tabular text-primary">{sec.sentimentScore}</span>
                    )}
                  </div>
                  {sec.trend && <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{sec.trend}</div>}
                  {sec.themes?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sec.themes.map((t, i) => (
                        <span key={i} className="rounded-full bg-muted/50 px-2 py-0.5 text-[10.5px] text-muted-foreground">
                          {t.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : null}

          {rep.suggestedQuestions?.length ? (
            <Card>
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                Questions to put to the provider
              </div>
              <ul className="space-y-2">
                {rep.suggestedQuestions.map((qn, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground/85">
                    <span className="font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {qn}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {rep.generatedAt && (
            <p className="text-[11px] text-muted-foreground">
              Generated {new Date(rep.generatedAt).toLocaleDateString()} · AnalystGenius reputation engine
            </p>
          )}
        </div>
      )}
    </div>
  );
}
