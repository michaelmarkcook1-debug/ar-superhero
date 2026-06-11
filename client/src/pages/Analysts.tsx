import { useState } from "react";
import { useAppData } from "@/lib/state";
import {
  Card,
  Chip,
  Eyebrow,
  AnalystAvatar,
  StanceChip,
  RatingPill,
  TierChip,
} from "@/components/atoms";
import { cn } from "@/lib/utils";
import { ANALYST_HOUSES } from "@/lib/seed";

export default function Analysts() {
  const data = useAppData();
  const [filterTier, setFilterTier] = useState<"all" | "Tier 1" | "Tier 2">("all");
  const [filterHouse, setFilterHouse] = useState<string>("all");

  const filtered = data.analysts.filter((a) => {
    if (filterTier !== "all" && a.houseTier !== filterTier) return false;
    if (filterHouse !== "all" && a.house !== filterHouse) return false;
    return true;
  });

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 max-w-[1280px] mx-auto space-y-6">
      <div>
        <Eyebrow>Analyst Landscape</Eyebrow>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight">
          {data.analysts.length} tracked analysts · {ANALYST_HOUSES.length} houses
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground max-w-2xl leading-relaxed">
          Population sourced from external AR platform import, public discovery, customer data sync,
          and user review. Click any stance to add evidence or override the system suggestion.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filterTier === "all"} onClick={() => setFilterTier("all")}>All tiers</FilterChip>
        <FilterChip active={filterTier === "Tier 1"} onClick={() => setFilterTier("Tier 1")}>Tier 1</FilterChip>
        <FilterChip active={filterTier === "Tier 2"} onClick={() => setFilterTier("Tier 2")}>Tier 2</FilterChip>
        <div className="h-4 w-px bg-border mx-1" />
        <FilterChip active={filterHouse === "all"} onClick={() => setFilterHouse("all")}>All houses</FilterChip>
        {ANALYST_HOUSES.map((h) => (
          <FilterChip key={h.id} active={filterHouse === h.name} onClick={() => setFilterHouse(h.name)}>
            {h.name}
          </FilterChip>
        ))}
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-w-[920px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-card-border">
              <th className="font-medium px-5 py-3 text-[11px] uppercase tracking-[0.12em]">Analyst</th>
              <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">House</th>
              <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Tier</th>
              <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Rating</th>
              <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Stance</th>
              <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Coverage</th>
              <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, idx) => (
              <tr key={a.id} className={cn("border-b last:border-b-0 border-card-border", idx % 2 === 1 && "bg-card/50")}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <AnalystAvatar initials={a.initials} />
                    <div>
                      <div className="font-medium text-foreground">
                        {a.name} {a.override && <span className="text-[10px] text-accent">· overridden</span>}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">{a.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-foreground/90 whitespace-nowrap">{a.house}</td>
                <td className="px-3 py-3"><TierChip tier={a.houseTier} /></td>
                <td className="px-3 py-3"><RatingPill rating={a.rating} confidence={a.confidence} /></td>
                <td className="px-3 py-3"><StanceChip stance={a.stance} confidence={a.stanceConfidence} /></td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {a.coverage.map((c) => <Chip key={c} tone="muted">{c}</Chip>)}
                  </div>
                </td>
                <td className="px-3 py-3 text-[11.5px] text-muted-foreground whitespace-nowrap">{a.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-[11.5px] hover-elevate",
        active ? "border-primary/40 bg-primary/12 text-primary" : "border-border bg-secondary text-foreground/85"
      )}
    >
      {children}
    </button>
  );
}
