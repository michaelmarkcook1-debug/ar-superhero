import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowUpRight, ExternalLink, Sparkles } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "@/components/cockpit/atoms";
import { VENDOR_OPTIONS } from "@/lib/cockpit";
import WorkSeedDialog, { type SeedRequest } from "@/components/cockpit/WorkSeedDialog";

// ============================================================================
// Briefing triggers — when AR should act, from real inputs with the rule
// stated. Replaces the seeded "briefing opportunities" panel. Two columns keep
// the familiar framing: act now, prepare ahead.
// ============================================================================

type TriggerKind =
  | "new-position"
  | "coverage-stale-soon"
  | "coverage-dated"
  | "evaluation-anniversary"
  | "evaluation-approaching"
  | "evaluation-verify"
  | "reputation-move"
  | "captured-move"
  | "narrative-gap"
  | "recognition"
  | "ask-overdue";

type Trigger = {
  id: string;
  kind: TriggerKind;
  priority: "now" | "soon" | "later";
  title: string;
  detail: string;
  rule: string;
  source: { label: string; url: string | null };
  evidenceDate: string | null;
  action:
    | { type: "seed"; label: string; request: SeedRequest }
    | { type: "link"; label: string; href: string; external: boolean }
    | null;
};

type Triggers = {
  vendorId: string;
  generatedAt: string;
  basis: string;
  inputs: { coverage: boolean; placements: boolean; evaluations: boolean; asks: boolean; analystGenius: "live" | "stale" | "absent" };
  notes: string[];
  counts: { now: number; soon: number; later: number };
  triggers: Trigger[];
};

const KIND_LABEL: Record<TriggerKind, string> = {
  "new-position": "New position",
  "coverage-stale-soon": "Going stale",
  "coverage-dated": "Dated coverage",
  "evaluation-anniversary": "Evaluation",
  "evaluation-approaching": "Evaluation",
  "evaluation-verify": "Verify record",
  "reputation-move": "Reputation",
  "captured-move": "Movement",
  "narrative-gap": "Narrative gap",
  recognition: "Recognition",
  "ask-overdue": "Ask overdue",
};

const SHOW = 6;

function formatDate(d: string | null): string | null {
  if (!d) return null;
  if (/^\d{4}$/.test(d)) return d;
  if (/^\d{4}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export type { TriggerKind };

export default function BriefingTriggersPanel({
  vendorId,
  kinds,
  eyebrow = "Briefing triggers",
  emptyNow,
  emptyAhead,
  footerHref = "/succeed",
  footerLabel = "Evaluations",
}: {
  vendorId: string;
  /** Restrict to these trigger kinds (e.g. the evaluation kinds on Succeed). */
  kinds?: TriggerKind[];
  eyebrow?: string;
  emptyNow?: string;
  emptyAhead?: string;
  footerHref?: string | null;
  footerLabel?: string;
}) {
  const effectiveVendor = vendorId || VENDOR_OPTIONS[0].id;
  const vendorLabel = VENDOR_OPTIONS.find((v) => v.id === effectiveVendor)?.label ?? effectiveVendor;
  const { data, isLoading, isError } = useQuery<Triggers>({
    queryKey: [`/api/briefing-triggers?vendorId=${encodeURIComponent(effectiveVendor)}`],
  });
  const [seedRequest, setSeedRequest] = useState<SeedRequest | null>(null);
  const [showAll, setShowAll] = useState<{ now: boolean; ahead: boolean }>({ now: false, ahead: false });

  const all = (data?.triggers ?? []).filter((t) => !kinds || kinds.includes(t.kind));
  const now = all.filter((t) => t.priority === "now");
  const ahead = all.filter((t) => t.priority !== "now");

  const column = (label: string, items: Trigger[], key: "now" | "ahead", tone: "gold" | "teal", empty: string) => {
    const shown = showAll[key] ? items : items.slice(0, SHOW);
    return (
      <Pane glow={key === "now" && items.length > 0 ? "gold" : "none"} className="flex flex-col gap-4 p-6" data-testid={`triggers-${key}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                tone === "gold" ? "border-[#a88945]/30 bg-[#a88945]/[0.08] text-[#d5b46b]" : "border-[#00a7b7]/30 bg-[#00a7b7]/[0.08] text-[#63d7de]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <Eyebrow tone={tone}>{label}</Eyebrow>
          </div>
          <span className="font-mono text-[10px] tracking-[0.22em] text-white/50">{items.length}</span>
        </div>

        {isLoading && <p className="text-[12.5px] text-white/55">Deriving triggers…</p>}
        {!isLoading && items.length === 0 && <p className="text-[12.5px] leading-relaxed text-white/60">{empty}</p>}

        {shown.length > 0 && (
          <ul className="space-y-3.5">
            {shown.map((t) => (
              <li key={t.id} data-testid={`trigger-${t.kind}`} className={`border-l-2 pl-4 ${t.priority === "now" ? "border-[#d5b46b]/70" : "border-[#3d8f6d]/[0.28]"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#3d8f6d]/24 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">
                    {KIND_LABEL[t.kind]}
                  </span>
                  {t.evidenceDate && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">{formatDate(t.evidenceDate)}</span>}
                </div>
                <div className="mt-1 text-[13.5px] font-semibold leading-snug tracking-tight text-[#e7e3d8]">{t.title}</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">{t.detail}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/45">Why: {t.rule}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  {t.source.url ? (
                    <a
                      href={t.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#d5b46b] transition hover:text-[#f0dca8]"
                    >
                      {t.source.label} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-white/50">{t.source.label}</span>
                  )}
                  {t.action?.type === "seed" && (
                    <button
                      type="button"
                      onClick={() => setSeedRequest(t.action!.type === "seed" ? t.action!.request : null)}
                      data-testid={`trigger-seed-${t.id.replace(/[^a-z0-9]+/gi, "-")}`}
                      className="rounded-full border border-[#3d8f6d]/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 transition hover:border-[#d5b46b]/50 hover:text-[#f0dca8]"
                    >
                      {t.action.label}
                    </button>
                  )}
                  {t.action?.type === "link" &&
                    (t.action.external ? (
                      <a
                        href={t.action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-[#3d8f6d]/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 transition hover:border-[#d5b46b]/50 hover:text-[#f0dca8]"
                      >
                        {t.action.label}
                      </a>
                    ) : (
                      <Link
                        href={t.action.href}
                        className="rounded-full border border-[#3d8f6d]/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 transition hover:border-[#d5b46b]/50 hover:text-[#f0dca8]"
                      >
                        {t.action.label}
                      </Link>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > SHOW && (
          <button
            type="button"
            onClick={() => setShowAll((s) => ({ ...s, [key]: !s[key] }))}
            className="self-start text-[11px] font-medium uppercase tracking-[0.16em] text-white/55 transition hover:text-[#f0dca8]"
          >
            {showAll[key] ? "Show fewer" : `Show all ${items.length}`}
          </button>
        )}
      </Pane>
    );
  };

  return (
    <section className="mb-14" data-testid="briefing-triggers">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow className="text-white/65">{eyebrow} · {vendorLabel}</Eyebrow>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
          {data ? `${now.length} act now · ${ahead.length} prepare ahead` : "Act now · Prepare ahead"}
        </div>
      </div>

      {isError && (
        <Pane className="p-6">
          <p className="text-[13px] text-[#e89797]">Could not derive briefing triggers.</p>
        </Pane>
      )}

      {!isError && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {column("Act now", now, "now", "gold", emptyNow ?? `Nothing is firing for ${vendorLabel} right now: no position published in the last 90 days, no evaluation at its anniversary, no lens moving, no ask overdue.`)}
          {column("Prepare ahead", ahead, "ahead", "teal", emptyAhead ?? `Nothing to prepare ahead of for ${vendorLabel}: no coverage going stale, no evaluation approaching, no recognition in its leverage window.`)}
        </div>
      )}

      {data && (
        <>
          <HairLine className="my-4" />
          <div className="flex flex-wrap items-start justify-between gap-3 text-[11.5px] leading-relaxed text-white/50">
            <p className="max-w-3xl">
              {data.basis}
              {data.inputs.analystGenius === "stale" ? " The AnalystGenius read is the last complete one; AnalystGenius was not responding." : ""}
              {data.notes.map((n) => ` ${n}`).join("")}
            </p>
            {footerHref && (
              <Link href={footerHref} className="inline-flex items-center gap-1 font-medium uppercase tracking-[0.16em] text-[#d5b46b] hover:text-[#f0dca8]">
                {footerLabel} <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </>
      )}

      <WorkSeedDialog request={seedRequest} onClose={() => setSeedRequest(null)} />
    </section>
  );
}
