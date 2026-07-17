import { useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "./atoms";
import {
  CONFIDENCE_FACTOR,
  CROSS_HOUSE_FRAMEWORK,
  ENGAGEMENT_STAGES,
  EVIDENCE_BOUNDARY,
  HARD_TRUTH,
  HOUSE_PLAYBOOKS,
  UNIVERSAL_SHIFT_DRIVERS,
  playbookById,
  stageDef,
  type AnalystHouseId,
  type EngagementStageId,
  type HousePlaybook,
  type StageGuidance,
} from "@shared/assessmentPlaybooks";

// ============================================================================
// Assessment leadership playbooks — Succeed tab.
//
// Per-house assessment playbooks from the owner-supplied best-practice
// document: house rail → flagship model card (axes + leadership definition +
// framework) → four-stage engagement guidance (RFI, client calls, briefing
// deck, exec briefing) with do's / don'ts and directional influence ranks →
// cross-house operating framework. The document's evidence boundary is
// rendered alongside — ranks are directional judgements, not published
// weights.
// ============================================================================

export default function AssessmentPlaybooks() {
  const [houseId, setHouseId] = useState<AnalystHouseId>("gartner");
  const [stageId, setStageId] = useState<EngagementStageId>("rfi");
  const [showBoundary, setShowBoundary] = useState(false);

  const playbook = playbookById(houseId);
  const stage = playbook.stages.find((s) => s.stage === stageId) ?? playbook.stages[0];
  const stageMeta = stageDef(stageId);

  return (
    <section className="mb-14" data-testid="assessment-playbooks">
      <div className="mb-6 flex items-baseline justify-between">
        <Eyebrow className="text-white/45">Assessment leadership playbooks</Eyebrow>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
          Seven houses · Four engagement moments
        </div>
      </div>

      {/* The hard truth — the document's executive frame */}
      <Pane glow="gold" className="mb-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <div className="text-[19px] font-semibold leading-snug tracking-tight text-[#f4eed8]">
              {HARD_TRUTH.headline}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/60">{HARD_TRUTH.detail}</p>
            <p className="mt-3 font-mono text-[11.5px] leading-relaxed text-[#d5b46b]">{HARD_TRUTH.formula}</p>
          </div>
          <button
            type="button"
            data-testid="button-evidence-boundary"
            onClick={() => setShowBoundary((v) => !v)}
            className="shrink-0 rounded-full border border-white/12 px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45 transition hover:text-white/75"
          >
            {showBoundary ? "Hide" : "Evidence boundary"}
          </button>
        </div>
        {showBoundary && (
          <ul className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-4">
            {EVIDENCE_BOUNDARY.map((line, i) => (
              <li key={i} className="flex gap-2.5 text-[12px] leading-relaxed text-white/50">
                <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-white/25" />
                {line}
              </li>
            ))}
          </ul>
        )}
      </Pane>

      {/* House rail */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {HOUSE_PLAYBOOKS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-testid={`playbook-house-${p.id}`}
            onClick={() => setHouseId(p.id)}
            className={
              p.id === houseId
                ? "inline-flex items-center gap-2 rounded-full border border-[#a88945]/40 bg-[#a88945]/[0.1] px-3.5 py-2 text-[12px] font-medium text-[#f0dca8]"
                : "inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 text-[12px] font-medium text-white/55 transition hover:border-white/[0.16] hover:text-white/85"
            }
          >
            {p.house}
            <span
              className={
                p.id === houseId
                  ? "font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#d5b46b]/80"
                  : "font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/30"
              }
            >
              {p.assessment.name}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        {/* Left: model card + cross-house framework */}
        <div className="space-y-5">
          <ModelCard playbook={playbook} />
          <CrossHouseFramework />
        </div>

        {/* Right: engagement stage guidance */}
        <Pane className="p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Eyebrow tone="teal">Engagement moments · {playbook.house}</Eyebrow>
            <span
              className="truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-[#63d7de]"
              title={playbook.contentSource ?? undefined}
            >
              {playbook.status === "populated" ? "Owner playbook ingested" : "Awaiting playbook document"}
            </span>
          </div>

          {/* Stage stepper with influence ranks */}
          <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
            {ENGAGEMENT_STAGES.map((s, i) => {
              const g = playbook.stages.find((x) => x.stage === s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  data-testid={`playbook-stage-${s.id}`}
                  onClick={() => setStageId(s.id)}
                  className={
                    s.id === stageId
                      ? "rounded-xl border border-[#00a7b7]/40 bg-[#00a7b7]/[0.08] px-3 py-3 text-left"
                      : "rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-3 text-left transition hover:border-white/[0.14]"
                  }
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        s.id === stageId
                          ? "font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#63d7de]"
                          : "font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/30"
                      }
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {g?.rank && (
                      <span
                        className={
                          g.rank === 1
                            ? "rounded-sm border border-[#a88945]/45 bg-[#a88945]/[0.12] px-1.5 py-px font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#f0dca8]"
                            : "rounded-sm border border-white/10 px-1.5 py-px font-mono text-[8.5px] uppercase tracking-[0.12em] text-white/40"
                        }
                        title="Directional influence rank within this house (1 = greatest practical influence). Not a published weight."
                      >
                        Rank {g.rank}
                      </span>
                    )}
                  </div>
                  <div
                    className={
                      s.id === stageId
                        ? "mt-1 text-[12.5px] font-semibold text-white/95"
                        : "mt-1 text-[12.5px] font-medium text-white/65"
                    }
                  >
                    {s.label}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mb-3 text-[12.5px] leading-relaxed text-white/50">{stageMeta.what}</p>
          {stage.note && (
            <p className="mb-5 rounded-lg border border-[#00a7b7]/25 bg-[#00a7b7]/[0.05] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#9fe3e8]">
              {stage.note}
            </p>
          )}

          <StageGuidancePanel playbook={playbook} guidance={stage} />
        </Pane>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function ModelCard({ playbook }: { playbook: HousePlaybook }) {
  const [xAxis, yAxis] = playbook.assessment.axes;
  return (
    <Pane glow="gold" className="p-7">
      <div className="mb-4 flex items-center justify-between">
        <Eyebrow tone="gold">{playbook.house} · Flagship evaluation</Eyebrow>
      </div>
      <div className="text-[24px] font-semibold leading-tight tracking-tight text-[#f4eed8]">
        {playbook.assessment.name}
      </div>

      {/* Minimal axes sketch */}
      <div className="mt-5 flex items-stretch gap-3">
        <div className="flex items-center">
          <span
            className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-white/40"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {yAxis}
          </span>
        </div>
        <div className="flex-1">
          <div className="relative h-32 rounded-lg border border-white/[0.08] bg-white/[0.015]">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.06]" />
            <div className="absolute right-2 top-2 rounded-md border border-[#a88945]/40 bg-[#a88945]/[0.12] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#f0dca8]">
              Leadership
            </div>
          </div>
          <div className="mt-2 text-center text-[9.5px] font-medium uppercase tracking-[0.16em] text-white/40">
            {xAxis}
          </div>
        </div>
      </div>

      <HairLine className="my-5" />
      <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/40">
        What leadership means here
      </div>
      <p className="text-[13px] leading-relaxed text-white/70">{playbook.assessment.leadership}</p>

      <div className="mt-5">
        <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/40">
          Leadership lens & theme
        </div>
        {playbook.leadershipFramework.length ? (
          <ol className="space-y-2">
            {playbook.leadershipFramework.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3.5 py-2.5">
                <span className="font-mono text-[10px] tracking-[0.22em] text-[#d5b46b]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[12.5px] leading-relaxed text-white/80">{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <AwaitingContent what={`the ${playbook.house} leadership framework`} />
        )}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#d5b46b]">
          What moves rankings here
        </div>
        <div className="rounded-lg border border-[#a88945]/25 bg-[#a88945]/[0.05] px-3.5 py-3">
          <div className="text-[13px] font-semibold text-[#f0dca8]">{playbook.movementDriver.headline}</div>
          <ul className="mt-2 space-y-1.5">
            {playbook.movementDriver.drivers.map((d, i) => (
              <li key={i} className="flex gap-2.5 text-[12px] leading-relaxed text-white/70">
                <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-[#a88945]/60" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/30">
        Structure: published assessment definitions · Guidance: owner playbook documents
      </div>
    </Pane>
  );
}

function CrossHouseFramework() {
  return (
    <Pane className="p-7">
      <Eyebrow className="mb-2">What moves rankings — all seven houses</Eyebrow>
      <ol className="mb-5 space-y-1.5">
        {UNIVERSAL_SHIFT_DRIVERS.map((d, i) => (
          <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-white/75">
            <span className="shrink-0 font-mono text-[9.5px] tracking-[0.2em] text-[#d5b46b]">
              {String(i + 1).padStart(2, "0")}
            </span>
            {d}
          </li>
        ))}
      </ol>

      <div className="mb-5 rounded-lg border border-[#00a7b7]/25 bg-[#00a7b7]/[0.05] px-3.5 py-3">
        <div className="text-[12.5px] font-semibold text-[#9fe3e8]">{CONFIDENCE_FACTOR.headline}</div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">{CONFIDENCE_FACTOR.detail}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          Evidence sources that must all point the same way: {CONFIDENCE_FACTOR.evidenceSources.join(" · ")}.
        </p>
      </div>

      <HairLine className="mb-4" />
      <Eyebrow className="mb-2">Cross-house operating framework</Eyebrow>
      <p className="mb-4 text-[12px] leading-relaxed text-white/45">
        Applies to every assessment, regardless of house.
      </p>
      <ol className="space-y-3">
        {CROSS_HOUSE_FRAMEWORK.map((item, i) => (
          <li key={i} className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-3.5 py-3">
            <div className="flex gap-3">
              <span className="font-mono text-[10px] tracking-[0.22em] text-[#63d7de]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white/85">{item.title}</div>
                {item.points.map((pt, j) => (
                  <p key={j} className="mt-1.5 text-[12px] leading-relaxed text-white/55">
                    {pt}
                  </p>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Pane>
  );
}

function StageGuidancePanel({ playbook, guidance }: { playbook: HousePlaybook; guidance: StageGuidance }) {
  const blocks: { key: keyof Pick<StageGuidance, "framework" | "dos" | "donts" | "bestPractices">; label: string; tone: string }[] = [
    { key: "framework", label: "Framework", tone: "text-white/40" },
    { key: "dos", label: "Do", tone: "text-[#d5b46b]" },
    { key: "donts", label: "Don't", tone: "text-white/60" },
    { key: "bestPractices", label: "Best practice", tone: "text-[#63d7de]" },
  ];
  const anyContent = blocks.some((b) => guidance[b.key].length > 0);

  if (!anyContent) {
    return <AwaitingContent what={`${playbook.house} guidance for this moment`} tall />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {blocks.map(
        (b) =>
          guidance[b.key].length > 0 && (
            <div key={b.key} className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-4">
              <div className={`mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.18em] ${b.tone}`}>
                {b.label}
              </div>
              <ul className="space-y-2">
                {guidance[b.key].map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-white/75">
                    <span className="shrink-0 font-mono text-[9.5px] tracking-[0.2em] text-white/30">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
      )}
    </div>
  );
}

function AwaitingContent({ what, tall = false }: { what: string; tall?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.01] px-4 ${
        tall ? "py-10" : "py-5"
      }`}
      data-testid="awaiting-content"
    >
      <FileText className="h-4 w-4 shrink-0 text-white/30" />
      <div>
        <div className="text-[12.5px] font-medium text-white/60">
          Structure ready — awaiting the playbook document for {what}.
        </div>
        <div className="mt-1 text-[11.5px] leading-relaxed text-white/35">
          This panel fills from the owner-supplied source document. Nothing is auto-generated here — guidance
          appears once the document is ingested.
        </div>
      </div>
    </div>
  );
}
