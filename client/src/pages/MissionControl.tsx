import { Link } from "wouter";
import { ArrowUpRight, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useArBrief, useCompetitorSelection, useFocalVendor } from "@/lib/agBrief";
import { NarrativeGapHero, CompetitivePanel } from "@/components/cockpit/AgPulsePanel";
import { MODES, BRIEF_ITEMS, VENDOR_OPTIONS, vendorTicker } from "@/lib/cockpit";
import { Pane, Eyebrow } from "@/components/cockpit/atoms";
import CurrentBriefingOpportunities from "@/components/cockpit/CurrentBriefingOpportunities";
import FutureBriefingOpportunities from "@/components/cockpit/FutureBriefingOpportunities";
import PublicRankingsSection from "@/components/cockpit/PublicRankingsSection";
import AnalystCoverageSection from "@/components/cockpit/AnalystCoverageSection";
import YourAnalystsPanel from "@/components/cockpit/YourAnalystsPanel";
import ThisWeekPanel from "@/components/cockpit/ThisWeekPanel";

/** Human-readable age for the stale-read notice. Mirrors the server wording. */
function describeAge(minutes: number): string {
  if (minutes < 1) return "moments ago";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function MissionControl() {
  const { competitors, setCompetitors } = useCompetitorSelection();
  const { focalVendorId, setFocalVendorId } = useFocalVendor();
  const { data: arBrief } = useArBrief(competitors, vendorTicker(focalVendorId));
  // A degraded brief (focal snapshot failed → blank scores) is treated as
  // not-fully-live so the cockpit shows complete labelled demo content rather
  // than half-empty live panels. A *stale* brief is different: AG was
  // unreachable, so the server served the last complete live read. That is real
  // measured data, so it renders as live — with its age stated, not hidden.
  const live = Boolean(arBrief?.live) && !arBrief?.degraded;
  const stale = live && Boolean(arBrief?.stale);

  // Live AnalystGenius-derived brief when available; labelled demo seed otherwise.
  // "What changed" = REAL captured movement over the last 14 days (our own
  // snapshots of the live signals). Until the window fills, quarter-on-quarter
  // lens movement (AG's own series) carries the section with an honest note.
  const movement = arBrief?.movement;
  const quarterMoves = (arBrief?.reputationLenses ?? [])
    .filter((l) => l.delta !== 0)
    .map((l) => ({
      id: `qm-${l.name}`,
      title: `${l.name} lens ${l.delta > 0 ? "up" : "down"} ${Math.abs(l.delta)} pts`,
      detail: `${l.prev} → ${l.last} (${l.span}) — AG's own quarter-on-quarter series.`,
      source: "AG reputation-tracker/trends · sentimentTrend",
      severity: Math.abs(l.delta) >= 5 ? ("HIGH" as const) : ("MEDIUM" as const),
    }));
  const changed = live
    ? movement?.items.length
      ? movement.items
      : quarterMoves
    : BRIEF_ITEMS.filter((b) => b.category === "changed");
  const changedNote = live
    ? movement?.items.length
      ? `Captured movement, last ${movement.windowDays} days`
      : movement?.trackingSince
        ? `14-day tracking active since ${new Date(movement.trackingSince).toLocaleDateString("en-GB")} — quarter-on-quarter movement shown meanwhile`
        : "14-day tracking just started — quarter-on-quarter movement shown meanwhile"
    : undefined;
  // Divergences now lead as the hero, so drop their duplicate list items from
  // the exposure feed.
  const exposed = live
    ? arBrief!.emergencies.filter((e) => !e.id.startsWith("div-"))
    : BRIEF_ITEMS.filter((b) => b.category === "exposed");

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10 lg:py-14">
      {/* ====================================================================
          HERO — Narrative vs reality gap (the headline function)
      ==================================================================== */}
      {/* Focal vendor — which company the whole cockpit brief is about. */}
      <section className="mb-6 flex flex-wrap items-center gap-2" data-testid="focal-vendor-picker">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
          Briefing on
        </span>
        {VENDOR_OPTIONS.map((v) => {
          const on = v.id === focalVendorId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setFocalVendorId(on ? "" : v.id)}
              data-testid={`focal-vendor-${v.id}`}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-medium transition",
                on
                  ? "border-[#a88945]/45 bg-[#a88945]/[0.12] text-[#f0dca8]"
                  : "border-[#3d8f6d]/24 bg-[#1a5540]/[0.18] text-white/55 hover:border-[#3d8f6d]/36 hover:text-white/90"
              )}
            >
              {v.label}
            </button>
          );
        })}
        {!focalVendorId && (
          <span className="text-[11px] text-white/50">· default focal firm</span>
        )}
      </section>

      {live && arBrief ? (
        <section className="mb-12">
          {stale && (
            <p
              data-testid="ag-stale-notice"
              className="mb-3 rounded-lg border border-[#a88945]/35 bg-[#a88945]/[0.10] px-3 py-2 text-[12.5px] leading-relaxed text-[#f0dca8]"
            >
              AnalystGenius is not responding right now. Every figure below is real AnalystGenius data
              from the last complete read
              {typeof arBrief.staleAgeMinutes === "number" ? `, taken ${describeAge(arBrief.staleAgeMinutes)}` : ""} —
              not demo content.
            </p>
          )}
          <NarrativeGapHero brief={arBrief} />
        </section>
      ) : (
        <section className="mb-12">
          <Eyebrow tone="gold" className="mb-3">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a88945] shadow-[0_0_10px_rgba(168,137,69,0.7)]" />
              Mission Control
            </span>
          </Eyebrow>
          <h1 className="text-[38px] font-semibold leading-[1.0] tracking-[-0.03em] text-[#f4eed8] md:text-[48px]">
            Narrative vs reality.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/55">
            Live AnalystGenius connection unavailable — showing labelled demo content below.
          </p>
        </section>
      )}

      {/* ====================================================================
          Your analysts — who is writing about us, who do we owe a call.
          Real named people from coverage, merged with the roster.
      ==================================================================== */}
      <YourAnalystsPanel vendorId={focalVendorId || VENDOR_OPTIONS[0].id} />

      {/* This week — the time axis: asks due, evaluation anniversaries, analysts owed a call */}
      <ThisWeekPanel vendorId={focalVendorId || VENDOR_OPTIONS[0].id} />

      {/* ====================================================================
          What changed / Where exposed — supporting the hero
      ==================================================================== */}
      <section className="mb-14">
        <div className="mb-6 flex items-baseline justify-between">
          <Eyebrow className="text-white/65">The brief · What changed &amp; where exposed</Eyebrow>
          <div
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50"
            title={live ? arBrief?.sourceNote : "Demo content — no live AnalystGenius connection."}
          >
            {live && arBrief
              ? `Live · ${new Date(arBrief.generatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "Demo view · seeded"}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BriefBucket
            glyph="01"
            tone="gold"
            label="What changed"
            note={changedNote}
            items={changed}
            icon={<Sparkles className="h-3.5 w-3.5" />}
          />
          <BriefBucket
            glyph="02"
            tone="teal"
            label="Where exposed"
            items={exposed}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
        </div>
      </section>

      {/* ====================================================================
          AG Pulse — competitive read (live). Gap analysis now leads as hero.
      ==================================================================== */}
      {live && arBrief && (
        <section className="mb-14 space-y-5">
          <div className="flex items-baseline justify-between">
            <Eyebrow className="text-white/65">AG Pulse · Competitive read</Eyebrow>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
              Your set vs the field
            </div>
          </div>
          <CompetitivePanel brief={arBrief} competitors={competitors} onChange={setCompetitors} />
        </section>
      )}

      {/* ====================================================================
          Briefing opportunities — current + future (core AR function,
          reinstated to the main view rather than gated behind a side tab)
      ==================================================================== */}
      <section className="mb-14" data-testid="intelligence-monitor">
        <div className="mb-7 flex items-baseline justify-between">
          <Eyebrow className="text-white/65">Briefing opportunities</Eyebrow>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
            Act now · Prepare ahead
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <CurrentBriefingOpportunities />
          <FutureBriefingOpportunities />
        </div>
      </section>

      {/* ====================================================================
          Tri-mode cockpit
      ==================================================================== */}
      <section className="mb-14">
        <div className="mb-7 flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <Eyebrow className="text-white/65">Choose your mode</Eyebrow>
            <span className="rounded-full border border-[#d5b46b]/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[#d5b46b]">
              demo data
            </span>
          </div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
            Three modes · One cockpit
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {MODES.map((mode, i) => (
            <ModeCard key={mode.id} mode={mode} index={i} />
          ))}
        </div>
      </section>

      {/* ====================================================================
          Public analyst rankings — real, cited placements by analyst firm,
          click through to the 2-year history per firm.
      ==================================================================== */}
      {/* ====================================================================
          Individual analyst coverage — named analysts per firm and what they
          have actually published about the selected vendor.
      ==================================================================== */}
      <AnalystCoverageSection vendorId={focalVendorId || VENDOR_OPTIONS[0].id} />

      <PublicRankingsSection />
    </div>
  );
}

// ============================================================================
// Local components
// ============================================================================

type BucketItem = {
  id: string;
  title: string;
  detail: string;
  source: string;
  severity?: "HIGH" | "MEDIUM" | "LOW";
};

function BriefBucket({
  glyph,
  tone,
  label,
  items,
  icon,
  note,
  topSlot,
}: {
  glyph: string;
  tone: "gold" | "teal";
  label: string;
  items: BucketItem[];
  icon: React.ReactNode;
  note?: string;
  topSlot?: React.ReactNode;
}) {
  return (
    <Pane glow={tone} className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-md border ${
              tone === "gold"
                ? "border-[#a88945]/30 bg-[#a88945]/[0.08] text-[#d5b46b]"
                : "border-[#00a7b7]/30 bg-[#00a7b7]/[0.08] text-[#63d7de]"
            }`}
          >
            {icon}
          </span>
          <Eyebrow tone={tone === "gold" ? "gold" : "teal"}>{label}</Eyebrow>
        </div>
        <span className="font-mono text-[10px] tracking-[0.22em] text-white/50">
          {glyph}
        </span>
      </div>

      {note && <div className="text-[12px] leading-snug text-white/60">{note}</div>}
      {topSlot}

      {/* Provenance rides on the item's tooltip, not the page. Severity is the
          only thing that earns pixels here — it changes what AR does next. */}
      <ul className="space-y-3.5">
        {items.map((item) => (
          <li
            key={item.id}
            title={item.source}
            className={
              item.severity === "HIGH"
                ? "border-l-2 border-[#d5b46b]/70 pl-4"
                : "border-l-2 border-[#3d8f6d]/[0.28] pl-4"
            }
          >
            <div className="text-[13.5px] font-semibold leading-snug tracking-tight text-[#e7e3d8]">
              {item.title}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/55">
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
    </Pane>
  );
}

function ModeCard({ mode, index }: { mode: (typeof MODES)[number]; index: number }) {
  const tones = ["gold", "teal", "gold"] as const;
  const tone = tones[index];
  const accent = tone === "gold" ? "#a88945" : "#00a7b7";
  const accentLight = tone === "gold" ? "#d5b46b" : "#63d7de";

  return (
    <Link
      href={`/${mode.id}`}
      data-testid={`mode-card-${mode.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-[#3d8f6d]/[0.18] bg-[#0c1a15] p-7 transition-all duration-500 hover:border-[#3d8f6d]/32 hover:bg-[#0c1018]"
      style={{
        backgroundImage: `radial-gradient(circle at ${index === 1 ? "85%" : "15%"} 0%, ${accent}22, transparent 55%)`,
      }}
    >
      {/* Decorative inner stroke */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          boxShadow: `inset 0 0 0 1px ${accent}33, 0 0 60px -20px ${accent}55`,
        }}
      />

      <div className="relative">
        <div className="mb-8 flex items-start justify-between">
          <div
            className="font-mono text-[11px] uppercase tracking-[0.26em]"
            style={{ color: accentLight }}
          >
            Mode {mode.glyph}
          </div>
          <ArrowUpRight
            className="h-4 w-4 text-white/50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/80"
          />
        </div>

        <div
          className="mb-5 text-[44px] font-semibold leading-[0.95] tracking-[-0.035em] text-[#f4eed8] md:text-[52px]"
        >
          {mode.label}.
        </div>

        <p className="mb-7 text-[14px] leading-relaxed text-white/55">
          {mode.oneLiner}
        </p>

        <div className="grid grid-cols-3 gap-3 border-t border-[#3d8f6d]/[0.16] pt-5">
          {mode.metrics.map((metric) => (
            <div key={metric.label}>
              <div
                className="font-mono text-[22px] font-medium leading-none tabular-nums"
                style={{ color: accentLight }}
              >
                {metric.value}
              </div>
              <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/65">
                {metric.label}
              </div>
              {metric.sub && (
                <div className="mt-1 text-[10.5px] leading-snug text-white/55">
                  {metric.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
