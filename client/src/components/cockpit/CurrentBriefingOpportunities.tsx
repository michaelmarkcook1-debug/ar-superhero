import { useQuery } from "@tanstack/react-query";
import { Bell, AlertTriangle, ExternalLink, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";
import { Pane, Eyebrow, Glyph, HairLine } from "@/components/cockpit/atoms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  BriefingSeverity,
  IntelligenceMonitorResponse,
  ScoredFinding,
} from "@shared/intelligenceMonitor";

const SEVERITY: Record<
  BriefingSeverity,
  { dot: string; label: string; chip: string; rowHover: string }
> = {
  HIGH: {
    dot: "bg-[#d56a6a] shadow-[0_0_10px_-2px_rgba(213,106,106,0.7)]",
    label: "text-[#e89797]",
    chip: "border-[#d56a6a]/30 bg-[#d56a6a]/[0.07] text-[#e89797]",
    rowHover: "hover:bg-[#d56a6a]/[0.04]",
  },
  MEDIUM: {
    dot: "bg-[#d5b46b] shadow-[0_0_10px_-2px_rgba(213,180,107,0.7)]",
    label: "text-[#e5c989]",
    chip: "border-[#d5b46b]/30 bg-[#d5b46b]/[0.07] text-[#e5c989]",
    rowHover: "hover:bg-[#d5b46b]/[0.04]",
  },
  LOW: {
    dot: "bg-white/30",
    label: "text-white/55",
    chip: "border-white/12 bg-white/[0.03] text-white/55",
    rowHover: "hover:bg-white/[0.025]",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CurrentBriefingOpportunities() {
  const { data, isLoading, isError } = useQuery<IntelligenceMonitorResponse>({
    queryKey: ["/api/intelligence-monitor"],
  });

  const [selected, setSelected] = useState<ScoredFinding | null>(null);
  const [showOlder, setShowOlder] = useState(false);

  const findings = data?.findings ?? [];
  const active = findings.filter((f) => !f.discounted);
  // Older items kept as background context (drop low-severity noise).
  const older = findings.filter((f) => f.discounted && f.severity !== "LOW");

  const highCount = active.filter((f) => f.severity === "HIGH").length;
  const medCount = active.filter((f) => f.severity === "MEDIUM").length;

  return (
    <Pane glow="gold" className="flex h-full flex-col overflow-hidden p-6" data-testid="panel-current-briefing">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#a88945]/30 bg-[#a88945]/[0.08] text-[#d5b46b]">
            <Bell className="h-3.5 w-3.5" />
          </span>
          <div>
            <Eyebrow tone="gold">Current Briefing Opportunities</Eyebrow>
            <p className="mt-1 text-[12px] leading-snug text-white/45">
              {data?.meta.organisation ?? "Organisation"} · {data?.meta.ticker ?? ""} · recent signals AR can act on
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" data-testid="current-briefing-counts">
          {highCount > 0 && (
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] tabular-nums", SEVERITY.HIGH.chip)}>
              <AlertTriangle className="h-2.5 w-2.5" />
              {highCount} alert{highCount !== 1 ? "s" : ""}
            </span>
          )}
          {medCount > 0 && (
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] tabular-nums", SEVERITY.MEDIUM.chip)}>
              {medCount} medium
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1">
        {isLoading ? (
          <p className="py-8 text-center text-[13px] text-white/40" data-testid="current-briefing-loading">
            Loading signals…
          </p>
        ) : isError ? (
          <p className="py-8 text-center text-[13px] text-[#e89797]" data-testid="current-briefing-error">
            Could not load briefing signals.
          </p>
        ) : active.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center" data-testid="current-briefing-empty">
            <Bell className="h-7 w-7 text-white/15" />
            <p className="text-[13px] font-medium text-white/55">No active signals right now</p>
            <p className="text-[11.5px] text-white/35">New opportunities surface here as they are detected.</p>
          </div>
        ) : (
          <ul className="space-y-2.5" data-testid="current-briefing-list">
            {active.map((f) => {
              const cfg = SEVERITY[f.severity];
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(f)}
                    data-testid={`current-finding-${f.id}`}
                    className={cn(
                      "w-full rounded-xl border border-white/[0.05] bg-white/[0.015] px-3.5 py-3 text-left transition",
                      cfg.rowHover
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn("mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full", cfg.dot)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {f.severity === "HIGH" && (
                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]", cfg.chip)}>
                              <AlertTriangle className="h-2.5 w-2.5" /> Alert
                            </span>
                          )}
                          <span className={cn("rounded-full border px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.12em]", cfg.chip)}>
                            {f.category}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[13.5px] font-semibold leading-snug text-[#e7e3d8]">
                          {f.headline}
                        </p>
                        <div className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-white/55">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#d5b46b]" />
                          <span className="line-clamp-2"><span className="text-white/40">AR move — </span>{f.recommendedAction}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
                          <span>{formatDate(f.date)}</span>
                          <span className="text-white/15">·</span>
                          <span className={cfg.label}>Likelihood {f.briefingLikelihood}</span>
                          <span className="text-white/15">·</span>
                          <span>{f.tag}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Older context */}
        {older.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowOlder((v) => !v)}
              data-testid="current-briefing-older-toggle"
              className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left transition hover:bg-white/[0.02]"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                Older signals — background context ({older.length})
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5 text-white/35 transition-transform", showOlder && "rotate-180")} />
            </button>
            {showOlder && (
              <ul className="space-y-1.5 pt-1" data-testid="current-briefing-older-list">
                {older.map((f) => {
                  const cfg = SEVERITY[f.severity];
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(f)}
                        data-testid={`current-older-${f.id}`}
                        className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left opacity-60 transition hover:opacity-100"
                      >
                        <span className={cn("mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full", cfg.dot)} />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-[12px] text-white/70">{f.headline}</p>
                          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/30">
                            {formatDate(f.date)} · {f.category}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <HairLine className="my-4" />
      <div className="flex items-center justify-between gap-2">
        <Glyph>Active window ≤ {data?.windows.discountDays ?? 18}d</Glyph>
        {data?.meta.isDemo && (
          <span className="rounded-full border border-[#d5b46b]/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[#d5b46b]">
            demo data
          </span>
        )}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl border-white/10 bg-[#0a0d14] text-[#e7e3d8]" data-testid="current-finding-modal">
          {selected && (
            <>
              <DialogHeader>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]", SEVERITY[selected.severity].chip)}>
                    {selected.category}
                  </span>
                  <span className="rounded-full border border-white/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/45">
                    {formatDate(selected.date)}
                  </span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]", SEVERITY[selected.severity].chip)}>
                    Likelihood {selected.briefingLikelihood}
                  </span>
                </div>
                <DialogTitle className="text-[18px] font-semibold leading-snug text-[#f4eed8]">
                  {selected.headline}
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px] leading-relaxed text-white/70">{selected.summary}</p>
              <div className="mt-3 rounded-xl border border-[#a88945]/25 bg-[#a88945]/[0.06] p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#d5b46b]" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#d5b46b]">Recommended AR action</span>
                </div>
                <p className="text-[13px] leading-relaxed text-white/80" data-testid="current-finding-action">
                  {selected.recommendedAction}
                </p>
              </div>
              <DialogFooter className="mt-2">
                <a
                  href={selected.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="current-finding-source"
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-[#d5b46b] transition hover:text-[#f0dca8]"
                >
                  {selected.sourceLabel} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Pane>
  );
}
