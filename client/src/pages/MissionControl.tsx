import { Link } from "wouter";
import { ArrowUpRight, Activity, AlertTriangle, Sparkles } from "lucide-react";
import { useArBrief, useCompetitorSelection } from "@/lib/agBrief";
import { NarrativeGapHero, CompetitivePanel } from "@/components/cockpit/AgPulsePanel";
import {
  MODES,
  BRIEF_ITEMS,
  MOMENTS,
  EVIDENCE_GAPS,
  LENSES,
  SELL_PROOF,
  CLAIMS_TO_AVOID,
  PRESENCE_GAPS,
} from "@/lib/cockpit";
import {
  Pane,
  Eyebrow,
  StatusDot,
  ReadinessBar,
  HairLine,
  Glyph,
} from "@/components/cockpit/atoms";
import CurrentBriefingOpportunities from "@/components/cockpit/CurrentBriefingOpportunities";
import FutureBriefingOpportunities from "@/components/cockpit/FutureBriefingOpportunities";

export default function MissionControl() {
  const { competitors, setCompetitors } = useCompetitorSelection();
  const { data: arBrief } = useArBrief(competitors);
  // A degraded brief (focal snapshot failed → blank scores) is treated as
  // not-fully-live so the cockpit shows complete labelled demo content rather
  // than half-empty live panels.
  const live = Boolean(arBrief?.live) && !arBrief?.degraded;

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

  const exposedMoments = MOMENTS.filter((m) =>
    ["Weak", "Missing", "Unsupported"].includes(m.readiness)
  );
  const onTrackMoments = MOMENTS.filter((m) => m.status === "On track" || m.status === "Submitted");

  const highGaps = EVIDENCE_GAPS.filter((g) => g.severity === "High");
  const restrictedClaims = CLAIMS_TO_AVOID.length;
  const presenceGapCount = PRESENCE_GAPS.length;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10 lg:py-14">
      {/* ====================================================================
          HERO — Narrative vs reality gap (the headline function)
      ==================================================================== */}
      {live && arBrief ? (
        <section className="mb-12">
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
          What changed / Where exposed — supporting the hero
      ==================================================================== */}
      <section className="mb-14">
        <div className="mb-6 flex items-baseline justify-between">
          <Eyebrow className="text-white/45">The brief · What changed &amp; where exposed</Eyebrow>
          <div
            className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30"
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
          Briefing opportunities — current + future (core AR function,
          reinstated to the main view rather than gated behind a side tab)
      ==================================================================== */}
      <section className="mb-14" data-testid="intelligence-monitor">
        <div className="mb-7 flex items-baseline justify-between">
          <Eyebrow className="text-white/45">Briefing opportunities</Eyebrow>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
            Act now · Prepare ahead
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <CurrentBriefingOpportunities />
          <FutureBriefingOpportunities />
        </div>
      </section>

      {/* ====================================================================
          AG Pulse — competitive read (live). Gap analysis now leads as hero.
      ==================================================================== */}
      {live && arBrief && (
        <section className="mb-14 space-y-5">
          <div className="flex items-baseline justify-between">
            <Eyebrow className="text-white/45">AG Pulse · Competitive read</Eyebrow>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
              Your set vs the field
            </div>
          </div>
          <CompetitivePanel brief={arBrief} competitors={competitors} onChange={setCompetitors} />
        </section>
      )}

      {/* ====================================================================
          Tri-mode cockpit
      ==================================================================== */}
      <section className="mb-14">
        <div className="mb-7 flex items-baseline justify-between">
          <Eyebrow className="text-white/45">Choose your mode</Eyebrow>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
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
          Snapshots — three thin panes summarising each mode
      ==================================================================== */}
      <section className="mb-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Succeed snapshot */}
        <Pane glow="gold" className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Glyph>I · Succeed</Glyph>
            </div>
            <Link
              href="/succeed"
              data-testid="snapshot-succeed-link"
              className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/55 transition hover:text-[#d5b46b]"
            >
              Open <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mb-5">
            <div className="text-[18px] font-semibold leading-snug tracking-tight text-[#e7e3d8]">
              Analyst moments in flight
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
              {MOMENTS.length} active across {new Set(MOMENTS.map((m) => m.model)).size} assessment
              models. {exposedMoments.length} exposed today.
            </p>
          </div>
          <ul className="space-y-2.5">
            {MOMENTS.slice(0, 4).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#3d8f6d]/[0.14] bg-[#1a5540]/[0.16] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium text-white/85">
                    {m.topic}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                    {m.model} · Due {m.due}
                  </div>
                </div>
                <ReadinessBar band={m.readiness} size="sm" />
              </li>
            ))}
          </ul>
          <HairLine className="my-5" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniStat value={String(highGaps.length)} label="High gaps" />
            <MiniStat value={String(exposedMoments.length)} label="Exposed" />
            <MiniStat value={String(onTrackMoments.length)} label="On track" />
          </div>
        </Pane>

        {/* Direct snapshot */}
        <Pane className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <Glyph>II · Direct</Glyph>
            <Link
              href="/direct"
              data-testid="snapshot-direct-link"
              className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/55 transition hover:text-[#d5b46b]"
            >
              Open <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mb-5">
            <div className="text-[18px] font-semibold leading-snug tracking-tight text-[#e7e3d8]">
              Leaders needing briefings
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
              {LENSES.length} stakeholder lenses. Four flagged for AR action this
              week.
            </p>
          </div>
          <ul className="space-y-1">
            {LENSES.slice(0, 5).map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 border-b border-white/[0.04] py-2 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/30">
                    {l.label.slice(0, 3)}
                  </span>
                  <span className="text-[13px] text-white/80">{l.label}</span>
                </div>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/35">
                  {l.briefing.bullets.length} actions
                </span>
              </li>
            ))}
          </ul>
          <HairLine className="my-5" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniStat value="4" label="To brief" />
            <MiniStat value="7" label="Actions due" />
            <MiniStat value="12" label="Lenses gen'd" />
          </div>
        </Pane>

        {/* Enable snapshot */}
        <Pane glow="teal" className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <Glyph>III · Enable</Glyph>
            <Link
              href="/enable"
              data-testid="snapshot-enable-link"
              className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/55 transition hover:text-[#d5b46b]"
            >
              Open <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mb-5">
            <div className="text-[18px] font-semibold leading-snug tracking-tight text-[#e7e3d8]">
              Sales-safe proof + claims to avoid
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
              Approved proof for sellers and the claims that would be challenged
              if used.
            </p>
          </div>
          <ul className="space-y-2.5">
            {SELL_PROOF.slice(0, 4).map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-[#3d8f6d]/[0.14] bg-[#1a5540]/[0.16] px-3 py-2.5"
              >
                <StatusDot status={p.status} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-white/85">
                    {p.title}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <HairLine className="my-5" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniStat value={String(SELL_PROOF.filter((p) => p.status === "safe").length)} label="Safe" />
            <MiniStat value={String(restrictedClaims)} label="Avoid" />
            <MiniStat value={String(presenceGapCount)} label="Presence gaps" />
          </div>
        </Pane>
      </section>
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
        <span className="font-mono text-[10px] tracking-[0.22em] text-white/25">
          {glyph}
        </span>
      </div>

      {note && <div className="text-[12px] leading-snug text-white/40">{note}</div>}
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
            className="h-4 w-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/80"
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
              <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
                {metric.label}
              </div>
              {metric.sub && (
                <div className="mt-1 text-[10.5px] leading-snug text-white/35">
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

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-[18px] font-medium leading-none text-[#f0dca8] tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.16em] text-white/40">
        {label}
      </div>
    </div>
  );
}
