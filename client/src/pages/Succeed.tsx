import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { useFocalVendor } from "@/lib/agBrief";
import AssessmentPlaybooks from "@/components/cockpit/AssessmentPlaybooks";
import BriefingComposer from "@/components/cockpit/BriefingComposer";
import BriefingTriggersPanel from "@/components/cockpit/BriefingTriggersPanel";
import EvaluationAnniversariesPanel, { useEvaluationCalendar } from "@/components/cockpit/EvaluationAnniversariesPanel";
import AssessmentResults from "@/components/cockpit/AssessmentResults";
import { DueBadge, useAsks } from "@/components/cockpit/AsksPanel";
import { VENDOR_OPTIONS } from "@/lib/cockpit";
import { Pane, Eyebrow, SectionTitle, HairLine, Glyph, NumberMark } from "@/components/cockpit/atoms";

// ============================================================================
// Succeed — win the analyst evaluations that matter.
//
// Everything on this page is a record SuperHero holds or a rule it states:
// the vendor's cited placement history (and how long since each evaluation
// last placed them), the evaluation triggers derived from that history and
// from named coverage, the asks the AR team has written for each leader, the
// assessment results the team has logged, the house playbooks, and the
// briefing composer over ingested decks. There is no readiness score and no
// predicted placement: where the honest answer is "not logged", it says so.
// ============================================================================

const EVALUATION_TRIGGER_KINDS = [
  "evaluation-anniversary",
  "evaluation-approaching",
  "evaluation-verify",
  "new-position",
  "coverage-dated",
  "recognition",
] as const;

const PERSONA_LABEL: Record<string, string> = {
  executive: "Executive",
  strategy: "Strategy",
  product: "Product",
  marketing: "Marketing",
  commercial: "Commercial",
  delivery: "Delivery",
  regional: "Regional",
};

type VendorAnalystView = {
  vendorId: string;
  summary: { named: number; withPosition: number; stale: number; withInteraction: number };
};

export default function Succeed() {
  // One vendor context across the cockpit: the selection Mission Control and
  // Direct share, persisted, rather than a page-local default.
  const { focalVendorId, setFocalVendorId } = useFocalVendor();
  const selectedVendorId = focalVendorId || VENDOR_OPTIONS[0].id;
  const selectedVendor = VENDOR_OPTIONS.find((vendor) => vendor.id === selectedVendorId) ?? VENDOR_OPTIONS[0];

  const calendar = useEvaluationCalendar(selectedVendorId);
  const coverage = useQuery<VendorAnalystView>({ queryKey: [`/api/analysts/vendor-view?vendorId=${encodeURIComponent(selectedVendorId)}`] });
  const results = useQuery<{ results: unknown[] }>({ queryKey: ["/api/assessment-results"] });
  const asks = useAsks(selectedVendorId);
  const openAsks = (asks.data ?? []).filter((a) => a.status === "open").sort((a, b) => String(a.due_date ?? "9999").localeCompare(String(b.due_date ?? "9999")));

  const n = (v: number | undefined, loading: boolean) => (loading ? "…" : v == null ? "—" : String(v));

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10 lg:py-14">
      {/* Hero */}
      <section className="mb-14">
        <Eyebrow tone="gold" className="mb-3">
          <span className="inline-flex items-center gap-2">
            <Glyph>Mode I</Glyph>
            <span className="text-white/50">·</span>
            <span>Succeed</span>
          </span>
        </Eyebrow>
        <h1 className="text-[44px] font-semibold leading-[0.98] tracking-[-0.035em] text-[#f4eed8] md:text-[56px] lg:text-[64px]">
          Succeed in <span className="text-[#a88945]">analyst evaluations.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-white/55 md:text-[16.5px]">
          Each evaluation that has placed {selectedVendor.label}, how long since it last did, who covers you at that house,
          what the house evaluates, and the evidence the next submission needs. Every line is a cited record or a stated
          rule; nothing here is a readiness score or a predicted placement.
        </p>
        <div className="mt-7 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-[#a88945]/25 bg-[#a88945]/[0.06] px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d5b46b]">Preparing</div>
            <div className="mt-0.5 text-[13px] text-white/55">Shared with Mission Control and Direct. Defence packs use this company.</div>
          </div>
          <select
            value={selectedVendorId}
            onChange={(event) => setFocalVendorId(event.target.value)}
            data-testid="select-briefing-deck-vendor"
            className="min-w-[220px] rounded-full border border-white/[0.12] bg-[#090d14] px-4 py-2 text-[13px] font-medium text-[#f4eed8] outline-none transition hover:border-[#d5b46b]/45 focus:border-[#d5b46b]"
          >
            {VENDOR_OPTIONS.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Headline numbers — each one a count of a real record, with its source */}
      <section className="mb-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#3d8f6d]/[0.16] bg-[#1a5540]/[0.26] md:grid-cols-5" data-testid="succeed-headline">
        <div className="bg-[#0c1a15] p-6">
          <NumberMark value={n(calendar.data?.counts.series, calendar.isLoading)} label="Evaluations on record" sub="Cited placement series" />
        </div>
        <div className="bg-[#0c1a15] p-6">
          <NumberMark value={n(calendar.data?.counts.anniversary, calendar.isLoading)} label="At anniversary" sub="11–13 months since last edition" />
        </div>
        <div className="bg-[#0c1a15] p-6">
          <NumberMark value={n(calendar.data?.counts.verify, calendar.isLoading)} label="To verify" sub="More than 13 months since last edition" />
        </div>
        <div className="bg-[#0c1a15] p-6">
          <NumberMark
            value={n(coverage.data?.summary.withPosition, coverage.isLoading)}
            label="Analysts with a position"
            sub={coverage.data ? `of ${coverage.data.summary.named} named analysts` : "Sourced, named coverage"}
          />
        </div>
        <div className="bg-[#0c1a15] p-6">
          <NumberMark value={n(results.data?.results.length, results.isLoading)} label="Results logged" sub="Outcomes the team has recorded" />
        </div>
      </section>
      {(calendar.isError || coverage.isError || results.isError) && (
        <p className="-mt-10 mb-14 text-[12px] text-[#e89797]" data-testid="succeed-headline-error">
          Some records could not be read. A dash means unavailable, not zero.
        </p>
      )}

      {/* Evaluation anniversaries — the record, one defence pack per series */}
      <EvaluationAnniversariesPanel vendorId={selectedVendorId} />

      {/* Evaluation triggers — derived from the record, rule stated */}
      <BriefingTriggersPanel
        vendorId={selectedVendorId}
        kinds={[...EVALUATION_TRIGGER_KINDS]}
        eyebrow="Evaluation triggers"
        emptyNow={`No evaluation trigger is firing for ${selectedVendor.label} right now: no evaluation at its anniversary and no new position published in the last 90 days.`}
        emptyAhead={`Nothing to prepare ahead of for ${selectedVendor.label}: no evaluation approaching its anniversary and no recognition in its leverage window.`}
        footerHref="/mission"
        footerLabel="All triggers"
      />

      {/* Open asks across leaders — what AR has asked for, by role */}
      <section className="mb-14" data-testid="succeed-asks">
        <SectionTitle
          eyebrow="Open asks across leaders"
          title="What the team has asked each leader for."
          description="Written by the AR team on the Direct tab, with an owner and a due date. The evidence a submission needs usually starts here."
        />
        <Pane className="p-6">
          {asks.isLoading && <p className="text-[13px] text-white/55">Reading asks…</p>}
          {asks.isError && <p className="text-[13px] text-[#e89797]">Could not read asks.</p>}
          {asks.data && openAsks.length === 0 && (
            <p className="text-[13px] text-white/65">
              No open ask is recorded for {selectedVendor.label}. Asks are written per leader on{" "}
              <Link href="/direct" className="font-medium text-[#d5b46b] hover:text-[#f0dca8]">
                Direct
              </Link>
              .
            </p>
          )}
          {openAsks.length > 0 && (
            <ul className="divide-y divide-white/[0.05]">
              {openAsks.slice(0, 12).map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1.5 py-3" data-testid={`succeed-ask-${a.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#3d8f6d]/24 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">
                        {PERSONA_LABEL[a.persona_id] ?? a.persona_id}
                      </span>
                      <span className="text-[13.5px] font-semibold text-[#e7e3d8]">{a.title}</span>
                    </div>
                    <div className="mt-1 text-[11.5px] text-white/60">{a.owner ? `Owner ${a.owner}` : "No owner named"}{a.note ? ` · ${a.note}` : ""}</div>
                  </div>
                  <DueBadge due={a.due_date} status={a.status} />
                </li>
              ))}
            </ul>
          )}
          {openAsks.length > 12 && (
            <>
              <HairLine className="my-3" />
              <div className="flex items-center justify-between text-[11.5px] text-white/55">
                <span>{openAsks.length - 12} more open.</span>
                <Link href="/direct" className="inline-flex items-center gap-1 font-medium uppercase tracking-[0.16em] text-[#d5b46b] hover:text-[#f0dca8]">
                  Direct <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </>
          )}
        </Pane>
      </section>

      {/* Logged outcomes, what each house evaluates, and the composer over ingested decks */}
      <AssessmentResults />

      <AssessmentPlaybooks />

      <BriefingComposer />

      <p className="mt-2 text-[12px] text-white/50">
        How material moves through Succeed, and what each output is built from:{" "}
        <Link href="/how-it-works" className="font-medium uppercase tracking-[0.14em] text-[#d5b46b] transition hover:text-[#f0dca8]">
          See how it works
        </Link>
      </p>
    </div>
  );
}
