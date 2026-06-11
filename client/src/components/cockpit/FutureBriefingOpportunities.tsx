import { useQuery } from "@tanstack/react-query";
import { CalendarClock, AlertTriangle, Sparkles } from "lucide-react";
import { Pane, Eyebrow, Glyph, HairLine } from "@/components/cockpit/atoms";
import { cn } from "@/lib/utils";
import type { IntelligenceMonitorResponse } from "@shared/intelligenceMonitor";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysLabel(n: number) {
  if (n === 0) return "Today";
  if (n === 1) return "1d";
  return `${n}d`;
}

export default function FutureBriefingOpportunities() {
  const { data, isLoading, isError } = useQuery<IntelligenceMonitorResponse>({
    queryKey: ["/api/intelligence-monitor"],
  });

  const upcoming = data?.upcoming ?? [];
  const horizon = data?.windows.preemptDays ?? 21;

  return (
    <Pane glow="teal" className="flex h-full flex-col overflow-hidden p-6" data-testid="panel-future-briefing">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#00a7b7]/30 bg-[#00a7b7]/[0.08] text-[#63d7de]">
            <CalendarClock className="h-3.5 w-3.5" />
          </span>
          <div>
            <Eyebrow tone="teal">Future Briefing Opportunities</Eyebrow>
            <p className="mt-1 text-[12px] leading-snug text-white/45">
              Events to prepare for in the next {horizon} days
            </p>
          </div>
        </div>
        {upcoming.length > 0 && (
          <span
            className="rounded-full border border-[#00a7b7]/30 bg-[#00a7b7]/[0.07] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#63d7de]"
            data-testid="future-briefing-count"
          >
            {upcoming.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1">
        {isLoading ? (
          <p className="py-8 text-center text-[13px] text-white/40" data-testid="future-briefing-loading">
            Loading calendar…
          </p>
        ) : isError ? (
          <p className="py-8 text-center text-[13px] text-[#e89797]" data-testid="future-briefing-error">
            Could not load upcoming events.
          </p>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center" data-testid="future-briefing-empty">
            <CalendarClock className="h-7 w-7 text-white/15" />
            <p className="text-[13px] font-medium text-white/55">No events in the next {horizon} days</p>
            <p className="text-[11.5px] text-white/35">Pre-alerts appear here as briefing windows approach.</p>
          </div>
        ) : (
          <ul className="space-y-2.5" data-testid="future-briefing-list">
            {upcoming.map((ev) => (
              <li
                key={ev.id}
                data-testid={`future-event-${ev.id}`}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3.5 py-3 transition",
                  ev.isUrgent ? "border-[#d5b46b]/20 bg-[#d5b46b]/[0.04]" : "hover:bg-white/[0.025]"
                )}
              >
                {/* Days pill */}
                <div className="shrink-0">
                  <span
                    className={cn(
                      "block w-12 rounded-lg py-1.5 text-center font-mono text-[12px] font-bold tabular-nums",
                      ev.isUrgent
                        ? "bg-[#d5b46b]/15 text-[#e5c989]"
                        : ev.isBlackout
                          ? "bg-[#d56a6a]/12 text-[#e89797]"
                          : "bg-[#00a7b7]/12 text-[#63d7de]"
                    )}
                  >
                    {daysLabel(ev.daysUntil)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-[13.5px] font-semibold leading-snug text-[#e7e3d8]">{ev.event}</p>
                    {ev.isUrgent && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#d5b46b]/30 bg-[#d5b46b]/[0.07] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#e5c989]">
                        <AlertTriangle className="h-2.5 w-2.5" /> Imminent
                      </span>
                    )}
                    {ev.isBlackout && !ev.isUrgent && (
                      <span className="shrink-0 rounded-full border border-[#d56a6a]/30 bg-[#d56a6a]/[0.07] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#e89797]">
                        Blackout
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                    {formatDate(ev.date)}
                    {ev.endDate && ` – ${formatDate(ev.endDate)}`} · {ev.tag}
                  </p>
                  <div className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-white/55">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#63d7de]" />
                    <span><span className="text-white/40">AR prep — </span>{ev.recommendedAction}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <HairLine className="my-4" />
      <div className="flex items-center justify-between gap-2">
        <Glyph>Pre-alert horizon {horizon}d</Glyph>
        {data?.meta.isDemo && (
          <span className="rounded-full border border-[#63d7de]/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[#63d7de]">
            demo data
          </span>
        )}
      </div>
    </Pane>
  );
}
