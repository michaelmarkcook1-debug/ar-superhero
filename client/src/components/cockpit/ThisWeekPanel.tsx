import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { Pane, Eyebrow } from "@/components/cockpit/atoms";
import { VENDOR_OPTIONS } from "@/lib/cockpit";
import { useAsks, daysUntil, DueBadge } from "@/components/cockpit/AsksPanel";
import { useEvaluationCalendar } from "@/components/cockpit/EvaluationAnniversariesPanel";

// ============================================================================
// This week — the cockpit's time axis, from three real inputs:
//   asks the AR person wrote (overdue, due within seven days),
//   evaluations at or past their anniversary (from the placement history),
//   analysts owed a call (from logged interactions — honestly none yet).
// Empty is a fact here, and each column says what would fill it.
// ============================================================================

const PERSONA_SHORT: Record<string, string> = {
  executive: "Executive",
  strategy: "Strategy",
  product: "Product",
  marketing: "Marketing",
  commercial: "Commercial",
  delivery: "Delivery",
  regional: "Regional",
};

type VendorView = { summary: { named: number; withInteraction: number }; analysts: { name: string; firm: string; last_interaction_at: number | null }[] };

export default function ThisWeekPanel({ vendorId }: { vendorId: string }) {
  const effectiveVendor = vendorId || VENDOR_OPTIONS[0].id;
  const vendorLabel = VENDOR_OPTIONS.find((v) => v.id === effectiveVendor)?.label ?? effectiveVendor;

  const asksQ = useAsks(effectiveVendor);
  const calQ = useEvaluationCalendar(effectiveVendor);
  const viewQ = useQuery<VendorView>({ queryKey: [`/api/analysts/vendor-view?vendorId=${encodeURIComponent(effectiveVendor)}`] });

  const open = (asksQ.data ?? []).filter((a) => a.status === "open");
  const overdue = open.filter((a) => (daysUntil(a.due_date) ?? 1) < 0);
  const dueSoon = open.filter((a) => {
    const d = daysUntil(a.due_date);
    return d !== null && d >= 0 && d <= 7;
  });
  const evals = (calQ.data?.series ?? []).filter((s) => s.band !== "recent").slice(0, 4);
  const view = viewQ.data;
  const owed = (view?.analysts ?? []).filter((a) => a.last_interaction_at !== null).slice(0, 4);

  return (
    <section className="mb-14" data-testid="this-week">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow className="text-white/65">This week · {vendorLabel}</Eyebrow>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
          {overdue.length} overdue · {dueSoon.length} due in 7 days · {evals.length} evaluation{evals.length === 1 ? "" : "s"} to check
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Asks */}
        <Pane glow={overdue.length > 0 ? "gold" : "none"} className="p-5">
          <Eyebrow tone="gold" className="mb-3">
            Asks
          </Eyebrow>
          {asksQ.isLoading && <p className="text-[12.5px] text-white/55">Loading…</p>}
          {!asksQ.isLoading && overdue.length === 0 && dueSoon.length === 0 && (
            <p className="text-[12.5px] leading-relaxed text-white/60" data-testid="this-week-asks-empty">
              {open.length === 0
                ? "No asks recorded yet. Write the first one on a leader's lens in Direct."
                : `${open.length} open, none due this week.`}
            </p>
          )}
          {(overdue.length > 0 || dueSoon.length > 0) && (
            <ul className="space-y-2">
              {[...overdue, ...dueSoon].map((a) => (
                <li key={a.id} className="border-l-2 border-[#a88945]/50 pl-3">
                  <div className="text-[12.5px] font-medium leading-snug text-[#e7e3d8]">{a.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10.5px] text-white/55">
                    <span>{PERSONA_SHORT[a.persona_id] ?? a.persona_id}{a.owner ? ` · ${a.owner}` : ""}</span>
                    <DueBadge due={a.due_date} status={a.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/direct" className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#d5b46b] hover:text-[#f0dca8]">
            Leader lenses <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Pane>

        {/* Evaluations */}
        <Pane className="p-5">
          <Eyebrow tone="gold" className="mb-3">
            Evaluations
          </Eyebrow>
          {calQ.isLoading && <p className="text-[12.5px] text-white/55">Reading the placement history…</p>}
          {!calQ.isLoading && evals.length === 0 && (
            <p className="text-[12.5px] leading-relaxed text-white/60">No evaluation is at or past its anniversary for {vendorLabel}.</p>
          )}
          {evals.length > 0 && (
            <ul className="space-y-2">
              {evals.map((s) => (
                <li key={s.key} className="border-l-2 border-[#3d8f6d]/[0.35] pl-3">
                  <div className="text-[12.5px] font-medium leading-snug text-[#e7e3d8]">{s.report}</div>
                  <div className="mt-0.5 text-[10.5px] text-white/55">
                    {s.firm} · last {Math.round(s.monthsSinceLast)} mo ago ·{" "}
                    <span className={s.band === "verify" ? "text-[#9fe3e8]" : "text-[#e5c989]"}>
                      {s.band === "verify" ? "verify record" : s.band === "anniversary" ? "at anniversary" : "approaching"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[10.5px] leading-relaxed text-white/45">Ages of last placements; SuperHero holds no house calendar.</p>
          <Link href="/succeed" className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#d5b46b] hover:text-[#f0dca8]">
            All evaluations <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Pane>

        {/* Analysts */}
        <Pane className="p-5">
          <Eyebrow tone="teal" className="mb-3">
            Analysts
          </Eyebrow>
          {viewQ.isLoading && <p className="text-[12.5px] text-white/55">Loading…</p>}
          {view && view.summary.withInteraction === 0 && (
            <p className="text-[12.5px] leading-relaxed text-white/60" data-testid="this-week-analysts-empty">
              {view.summary.named} named analysts cover {vendorLabel}; no interaction is logged with any of them, so nothing is owed on record. Log the
              first from the roster.
            </p>
          )}
          {owed.length > 0 && (
            <ul className="space-y-2">
              {owed.map((a) => (
                <li key={`${a.name}|${a.firm}`} className="border-l-2 border-[#00a7b7]/40 pl-3">
                  <div className="text-[12.5px] font-medium leading-snug text-[#e7e3d8]">{a.name}</div>
                  <div className="mt-0.5 text-[10.5px] text-white/55">
                    {a.firm} · last contact {new Date(a.last_interaction_at as number).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/analysts" className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#d5b46b] hover:text-[#f0dca8]">
            Roster <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Pane>
      </div>
    </section>
  );
}
