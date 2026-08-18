import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { asStance, initialsOf, type AnalystRow } from "@/lib/analystApi";

export default function Analysts() {
  const { data: analysts, isLoading, isError, error } = useQuery<AnalystRow[]>({
    queryKey: ["/api/analysts"],
  });
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterFirm, setFilterFirm] = useState<string>("all");

  const tiers = useMemo(
    () => Array.from(new Set((analysts ?? []).map((a) => a.firm_tier))).sort(),
    [analysts]
  );
  const firms = useMemo(
    () => Array.from(new Set((analysts ?? []).map((a) => a.firm))).sort(),
    [analysts]
  );

  const filtered = (analysts ?? []).filter((a) => {
    if (filterTier !== "all" && a.firm_tier !== filterTier) return false;
    if (filterFirm !== "all" && a.firm !== filterFirm) return false;
    return true;
  });

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 max-w-[1280px] mx-auto space-y-6">
      <div>
        <Eyebrow>Analyst Landscape</Eyebrow>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight">
          {isLoading
            ? "Loading analysts…"
            : `${(analysts ?? []).length} tracked analysts · ${firms.length} firm${firms.length === 1 ? "" : "s"}`}
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground max-w-2xl leading-relaxed">
          Live from the AR relationship database. Stance shown is the latest confirmed record — upload
          notes, write-ups, or interactions from Command Centre to feed the perception engine a fresh suggestion.
        </p>
      </div>

      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <p className="text-[13px] text-destructive">
            Couldn't load analysts: {(error as Error)?.message ?? "unknown error"}
          </p>
        </Card>
      )}

      {isLoading && (
        <Card>
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        </Card>
      )}

      {!isLoading && !isError && (analysts ?? []).length === 0 && (
        <Card>
          <p className="text-[13px] text-muted-foreground">
            No analysts on record yet.
          </p>
        </Card>
      )}

      {!isLoading && !isError && (analysts ?? []).length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filterTier === "all"} onClick={() => setFilterTier("all")}>All tiers</FilterChip>
            {tiers.map((t) => (
              <FilterChip key={t} active={filterTier === t} onClick={() => setFilterTier(t)}>{t}</FilterChip>
            ))}
            <div className="h-4 w-px bg-border mx-1" />
            <FilterChip active={filterFirm === "all"} onClick={() => setFilterFirm("all")}>All firms</FilterChip>
            {firms.map((f) => (
              <FilterChip key={f} active={filterFirm === f} onClick={() => setFilterFirm(f)}>
                {f}
              </FilterChip>
            ))}
          </div>

          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[920px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-card-border">
                    <th className="font-medium px-5 py-3 text-[11px] uppercase tracking-[0.12em]">Analyst</th>
                    <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Firm</th>
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
                          <AnalystAvatar initials={initialsOf(a.name)} />
                          <div>
                            <div className="font-medium text-foreground">
                              {a.name}{" "}
                              {a.rating_overridden && <span className="text-[10px] text-accent">· overridden</span>}
                            </div>
                            <div className="text-[11.5px] text-muted-foreground">{a.role ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-foreground/90 whitespace-nowrap">{a.firm}</td>
                      <td className="px-3 py-3"><TierChip tier={a.firm_tier} /></td>
                      <td className="px-3 py-3"><RatingPill rating={a.rating} confidence={a.confidence / 100} /></td>
                      <td className="px-3 py-3">
                        {a.current_stance ? (
                          <StanceChip
                            stance={asStance(a.current_stance.stance)}
                            confidence={a.current_stance.confidence / 100}
                          />
                        ) : (
                          <StanceChip stance="Unknown" />
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.coverage.length > 0 ? (
                            a.coverage.map((c) => <Chip key={c} tone="muted">{c}</Chip>)
                          ) : (
                            <span className="text-[11.5px] text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11.5px] text-muted-foreground whitespace-nowrap">{a.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
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
