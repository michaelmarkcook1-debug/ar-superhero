import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowUpRight, CalendarClock, ExternalLink } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "@/components/cockpit/atoms";
import { VENDOR_OPTIONS } from "@/lib/cockpit";

// ============================================================================
// Evaluation anniversaries — how long since each evaluation last placed the
// vendor. The honest form of a calendar: SuperHero holds no house research
// agenda, so nothing here is a date. An approaching anniversary is a prompt to
// check the house's agenda; a long gap is a prompt to verify the record.
// ============================================================================

type Band = "recent" | "approaching" | "anniversary" | "verify";

type Series = {
  key: string;
  firm: string;
  report: string;
  editions: { date: string; precision: string; placement: string; source_url: string; source_type: string }[];
  last: { date: string; precision: string; placement: string; source_url: string; source_type: string };
  monthsSinceLast: number;
  band: Band;
  observedCadenceMonths: number | null;
  note: string;
};

type Calendar = {
  vendorId: string;
  generatedAt: string;
  counts: { series: number; recent: number; approaching: number; anniversary: number; verify: number };
  caveat: string;
  series: Series[];
};

const BAND_LABEL: Record<Band, string> = {
  anniversary: "at anniversary",
  approaching: "approaching",
  verify: "verify record",
  recent: "recent",
};

const BAND_CLASS: Record<Band, string> = {
  anniversary: "border-[#a88945]/45 bg-[#a88945]/[0.10] text-[#e5c989]",
  approaching: "border-[#a88945]/30 text-[#d5b46b]",
  verify: "border-[#00a7b7]/35 bg-[#00a7b7]/[0.06] text-[#9fe3e8]",
  recent: "border-[#3d8f6d]/24 text-white/55",
};

function formatDate(d: string, precision: string): string {
  if (precision === "year" || /^\d{4}$/.test(d)) return d.slice(0, 4);
  if (precision === "month" || /^\d{4}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function useEvaluationCalendar(vendorId: string) {
  return useQuery<Calendar>({ queryKey: [`/api/evaluations/calendar?vendorId=${encodeURIComponent(vendorId)}`] });
}

export default function EvaluationAnniversariesPanel({
  vendorId,
  compact = false,
  limit,
}: {
  vendorId: string;
  /** Compact: only the bands that need action, capped, with a link to the full list. */
  compact?: boolean;
  limit?: number;
}) {
  const effectiveVendor = vendorId || VENDOR_OPTIONS[0].id;
  const vendorLabel = VENDOR_OPTIONS.find((v) => v.id === effectiveVendor)?.label ?? effectiveVendor;
  const { data, isLoading, isError } = useEvaluationCalendar(effectiveVendor);

  const all = data?.series ?? [];
  const actionable = all.filter((s) => s.band !== "recent");
  const shown = (compact ? actionable : all).slice(0, limit ?? (compact ? 6 : 60));
  const hidden = (compact ? actionable : all).length - shown.length;

  return (
    <section className={compact ? "" : "mb-14"} data-testid="evaluation-anniversaries">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow className="text-white/65">Evaluation anniversaries · {vendorLabel}</Eyebrow>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
          {data
            ? `${data.counts.series} evaluations on record · ${data.counts.anniversary} at anniversary · ${data.counts.verify} to verify`
            : "From the placement history"}
        </div>
      </div>

      <Pane className="p-6">
        {isLoading && <p className="text-[13px] text-white/55">Reading the placement history…</p>}
        {isError && <p className="text-[13px] text-[#e89797]">Could not read the placement history.</p>}

        {data && (
          <p className="mb-4 text-[12px] leading-relaxed text-white/55" data-testid="evaluation-caveat">
            {data.caveat}
          </p>
        )}

        {data && shown.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <CalendarClock className="h-6 w-6 text-white/50" />
            <p className="text-[13px] font-medium text-white/65">
              {compact ? `No evaluation is at or past its anniversary for ${vendorLabel}.` : `No placements logged for ${vendorLabel} yet.`}
            </p>
          </div>
        )}

        {shown.length > 0 && (
          <ul className="divide-y divide-white/[0.05]">
            {shown.map((s) => (
              <li key={s.key} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1.5 py-3" data-testid={`eval-series-${s.band}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ${BAND_CLASS[s.band]}`}>
                      {BAND_LABEL[s.band]}
                    </span>
                    <span className="text-[13.5px] font-semibold text-[#e7e3d8]">{s.report}</span>
                    <span className="text-[11.5px] text-white/55">{s.firm}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-white/60">
                    <span>
                      Last: {formatDate(s.last.date, s.last.precision)} · {s.last.placement}
                    </span>
                    <a
                      href={s.last.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#d5b46b] transition hover:text-[#f0dca8]"
                    >
                      source <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {!compact && <p className="mt-1 text-[11.5px] leading-relaxed text-white/50">{s.note}</p>}
                </div>
                <div className="shrink-0 text-right font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/55">
                  {Math.round(s.monthsSinceLast)} mo ago
                </div>
              </li>
            ))}
          </ul>
        )}

        {hidden > 0 && (
          <>
            <HairLine className="my-3" />
            <div className="flex items-center justify-between text-[11.5px] text-white/55">
              <span>{hidden} more on record.</span>
              {compact && (
                <Link href="/succeed" className="inline-flex items-center gap-1 font-medium uppercase tracking-[0.16em] text-[#d5b46b] hover:text-[#f0dca8]">
                  All evaluations <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </>
        )}
      </Pane>
    </section>
  );
}
