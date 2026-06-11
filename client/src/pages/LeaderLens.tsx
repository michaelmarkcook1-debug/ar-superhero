import { useState } from "react";
import { useAppData } from "@/lib/state";
import { Card, Chip, Eyebrow, AnalystAvatar, RatingPill } from "@/components/atoms";
import { LENSES } from "@/lib/seed";
import { cn } from "@/lib/utils";
import { FileDown, Check } from "lucide-react";

export default function LeaderLens() {
  const data = useAppData();
  const [active, setActive] = useState("strategy");
  const [includeStance, setIncludeStance] = useState(false);
  const lens = LENSES.find((l) => l.id === active)!;

  const groupedByRating = data.analysts.reduce<Record<string, typeof data.analysts>>((acc, a) => {
    acc[a.rating] = acc[a.rating] || [];
    acc[a.rating].push(a);
    return acc;
  }, {});

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 max-w-[1280px] mx-auto space-y-6">
      <div>
        <Eyebrow>Leader Lens</Eyebrow>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight">
          Internal AR lead briefings
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground max-w-2xl leading-relaxed">
          Aggregation across all AnalystGenius and AR Superhero data — not per-document summaries. P0 lenses are below. Country and Industry are P1.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LENSES.map((l) => (
          <button
            key={l.id}
            onClick={() => setActive(l.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-[12.5px] hover-elevate font-medium",
              active === l.id ? "border-primary/40 bg-primary/12 text-primary" : "border-border bg-secondary text-foreground/85"
            )}
          >
            {l.name}
          </button>
        ))}
        <span className="ml-2 inline-flex items-center text-[11px] text-muted-foreground">
          <span className="dot bg-muted-foreground/40 mr-1.5" /> Country, Industry — P1
        </span>
      </div>

      <Card className="p-6 lg:p-7">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <Eyebrow className="text-primary/80 mb-1">{lens.name} lens</Eyebrow>
            <h2 className="text-[18px] font-semibold tracking-tight">Northstar Digital Services · Q2 2026 briefing</h2>
          </div>
          <div className="flex items-center gap-2">
            {["PDF", "PPTX", "DOCX", "Markdown"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => data.logExport(lens.name, fmt)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-[12px] hover-elevate"
              >
                <FileDown className="h-3 w-3" /> {fmt}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[14px] leading-relaxed text-foreground/95 max-w-3xl">{lens.summary}</p>

        <ul className="mt-5 space-y-2.5">
          {lens.points.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13.5px]">
              <span className="mt-2 h-1 w-1 rounded-full bg-primary shrink-0" />
              <span className="text-foreground/95">{p}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-5 border-t border-card-border flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <input
              type="checkbox"
              className="accent-primary"
              checked={includeStance}
              onChange={(e) => setIncludeStance(e.target.checked)}
              data-testid="checkbox-include-stance"
            />
            Include relationship stance labels in export
            <span className="text-[11px]">(default off · AR controls)</span>
          </label>
          <span className="text-[11.5px] text-muted-foreground">Includes all analysts in workstream, grouped by rating</span>
        </div>
      </Card>

      <section>
        <Eyebrow className="mb-3">Analysts in this briefing · grouped by rating</Eyebrow>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {["A+", "A", "B+", "B"].map((rating) => {
            const list = groupedByRating[rating] || [];
            if (list.length === 0) return null;
            return (
              <Card key={rating} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] font-semibold">{rating} analysts</div>
                  <span className="text-[11.5px] text-muted-foreground tabular">{list.length}</span>
                </div>
                <ul className="space-y-2">
                  {list.map((a) => (
                    <li key={a.id} className="flex items-center gap-3">
                      <AnalystAvatar initials={a.initials} size={24} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-foreground truncate">{a.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{a.house}</div>
                      </div>
                      <RatingPill rating={a.rating} confidence={a.confidence} />
                      {includeStance && <Chip tone="muted">{a.stance}</Chip>}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      {data.exportLog.length > 0 && (
        <Card>
          <Eyebrow className="mb-2">Export activity · this session</Eyebrow>
          <ul className="space-y-1.5">
            {data.exportLog.slice(-6).reverse().map((e, i) => (
              <li key={i} className="text-[12.5px] text-foreground/90 flex items-center gap-2">
                <Check className="h-3 w-3 text-primary" />
                {e.lens} lens · {e.format}
                <span className="text-muted-foreground">— {e.at.toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
