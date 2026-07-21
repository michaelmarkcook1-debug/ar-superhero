import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Plus, RotateCcw, X } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "./atoms";
import {
  MAX_COMPETITORS,
  useAgProviders,
  type ArBrief,
  type ArCompetitorRead,
} from "@/lib/agBrief";

// ============================================================================
// Live AG Pulse panels for Mission Control:
//   1. NarrativeGapPanel — the narrative–reality gap and its AG Pulse analysis
//   2. CompetitivePanel — competitor selection + core competitive metrics
// Both render ONLY live API values; nulls show as "—". No red/green for
// scores — gold carries "reality", muted white carries "narrative".
// ============================================================================

const HOUSE_LABEL: Record<string, string> = {
  gartner: "Gartner",
  forrester: "Forrester",
  idc: "IDC",
  hfs: "HFS",
  media: "Media",
  social: "Social",
};

function fmtSentiment(v: number | null): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// 1. Narrative–reality gap panel
// ---------------------------------------------------------------------------

export function NarrativeGapPanel({ brief }: { brief: ArBrief }) {
  const ga = brief.gapAnalysis;
  if (!brief.live || !ga || !brief.focal) return null;

  return (
    <Pane glow="gold" className="p-7" as="section" data-testid="narrative-gap-panel">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow tone="gold" className="mb-2">
            Narrative–reality gap · Live from AG Pulse
          </Eyebrow>
          <div className="text-[20px] font-semibold leading-snug tracking-tight text-[#f4eed8]">
            {ga.headline ?? "Narrative–reality gap"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <div className="text-right">
            <div className="font-mono text-[34px] font-medium leading-none text-[#f0dca8] tabular-nums">
              {ga.gapScore ?? "—"}
            </div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
              Gap score
            </div>
          </div>
          <div className="rounded-full border border-[#a88945]/35 bg-[#a88945]/[0.08] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#d5b46b]">
            {ga.direction ?? "—"}
          </div>
        </div>
      </div>

      {/* Per-house narrative signals */}
      {ga.narrativeSignals.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/40">
            Who is telling the story — per-house signals
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {ga.narrativeSignals.map((s) => (
              <div
                key={s.source}
                className="rounded-lg border border-[#3d8f6d]/[0.14] bg-[#1a5540]/[0.16] px-3 py-2.5"
                title={s.themes.join(", ")}
              >
                <div className="text-[12px] font-medium text-white/80">
                  {HOUSE_LABEL[s.source] ?? s.source}
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[13px] text-[#d5b46b] tabular-nums">
                    {fmtSentiment(s.sentiment)}
                  </span>
                  <span className="font-mono text-[10px] text-white/35 tabular-nums">
                    vol {s.volume ?? "—"}
                  </span>
                </div>
                {s.themes.length > 0 && (
                  <div className="mt-1 truncate text-[10.5px] text-white/40">{s.themes.join(" · ")}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {ga.agInsight && (
        <>
          <HairLine className="mb-4" />
          <p className="border-l-2 border-[#a88945]/50 pl-4 text-[13px] leading-relaxed text-white/70">
            {ga.agInsight}
          </p>
        </>
      )}

      <div className="mt-5 flex justify-end">
        <Link
          href="/admin/platform/competitive"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-white/50 transition hover:text-[#d5b46b]"
          data-testid="link-full-pulse"
        >
          Full analysis <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </Pane>
  );
}

export function ScoreBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "gold" | "muted";
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-3">
      <span className="w-[72px] shrink-0 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1a5540]/[0.34]">
        <div
          className={tone === "gold" ? "h-full rounded-full bg-[#d5b46b]" : "h-full rounded-full bg-white/35"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[11.5px] text-white/70 tabular-nums">
        {value ?? "—"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Competitive panel — picker + core metrics
// ---------------------------------------------------------------------------

export function CompetitivePanel({
  brief,
  competitors,
  onChange,
}: {
  brief: ArBrief;
  competitors: string[];
  onChange: (next: string[]) => void;
}) {
  const { data: catalog } = useAgProviders();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const focal = brief.focal;
  const activeTickers = brief.competitorTickers ?? [];

  const options = useMemo(() => {
    const all = catalog?.providers ?? [];
    const q = search.trim().toLowerCase();
    return all
      .filter((p) => p.ticker !== focal?.ticker && !activeTickers.includes(p.ticker))
      .filter(
        (p) =>
          !q ||
          p.ticker.toLowerCase().includes(q) ||
          (p.displayName ?? p.name).toLowerCase().includes(q) ||
          (p.segment ?? "").toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [catalog, search, focal?.ticker, activeTickers]);

  if (!brief.live || !focal) return null;

  const rows: (ArCompetitorRead & { isFocal?: boolean })[] = [
    {
      ticker: focal.ticker,
      name: `${focal.name} (you)`,
      assessmentScore: focal.assessmentScore,
      aiReadinessScore: focal.aiReadinessScore,
      revenueGrowthYoy: focal.revenueGrowthYoy,
      gapDirection: focal.gapDirection,
      gapScore: focal.gapScore,
      isFocal: true,
    },
    ...brief.competitors,
  ];

  return (
    <Pane className="p-7" as="section" data-testid="competitive-panel">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="text-[17px] font-semibold tracking-tight text-[#e7e3d8]">
          {focal.name} vs your set
        </div>
        <div className="flex items-center gap-2">
          {competitors.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              data-testid="button-reset-competitors"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3d8f6d]/24 px-3 py-1.5 text-[12px] font-medium text-white/50 transition hover:text-white/80"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            data-testid="button-add-competitor"
            disabled={activeTickers.length >= MAX_COMPETITORS}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#00a7b7]/35 bg-[#00a7b7]/[0.08] px-3 py-1.5 text-[12px] font-medium text-[#63d7de] transition hover:bg-[#00a7b7]/[0.14] disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> Add competitor
          </button>
        </div>
      </div>

      {/* Selected chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {activeTickers.map((t) => {
          const read = brief.competitors.find((c) => c.ticker === t);
          return (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3d8f6d]/26 bg-[#1a5540]/[0.26] px-2.5 py-1 text-[12px] text-white/75"
            >
              {read?.name ?? t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                data-testid={`button-remove-${t}`}
                onClick={() => onChange(activeTickers.filter((x) => x !== t))}
                className="text-white/40 transition hover:text-white/80"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        {competitors.length === 0 && (
          <span className="text-[12px] text-white/35">Default set — add competitors to re-cut every metric below.</span>
        )}
      </div>

      {/* Picker */}
      {pickerOpen && (
        <div className="mb-5 rounded-xl border border-[#3d8f6d]/[0.20] bg-[#0c1a15] p-3">
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 65 tracked providers…"
            data-testid="input-competitor-search"
            className="mb-2 h-9 w-full rounded-md border border-[#3d8f6d]/24 bg-[#1a5540]/[0.22] px-3 text-[13px] text-white/85 placeholder:text-white/30 focus:border-[#00a7b7]/40 focus:outline-none"
          />
          <ul className="max-h-56 overflow-y-auto">
            {options.map((p) => (
              <li key={p.ticker}>
                <button
                  type="button"
                  data-testid={`option-${p.ticker}`}
                  onClick={() => {
                    onChange([...activeTickers, p.ticker]);
                    setSearch("");
                    setPickerOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition hover:bg-[#1a5540]/[0.30]"
                >
                  <span className="text-[13px] text-white/85">{p.displayName ?? p.name}</span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/35">
                    {p.segment ?? p.ticker}
                  </span>
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-2.5 py-2 text-[12px] text-white/40">No matching providers.</li>
            )}
          </ul>
        </div>
      )}

      {/* Metrics table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#3d8f6d]/[0.20]">
              <Th>Provider</Th>
              <Th className="text-right">Assessment</Th>
              <Th className="text-right">AI readiness</Th>
              <Th className="text-right">Rev growth YoY</Th>
              <Th className="text-right">Narrative gap</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.ticker}
                className={
                  r.isFocal
                    ? "border-b border-[#3d8f6d]/[0.14] bg-[#a88945]/[0.06]"
                    : "border-b border-[#3d8f6d]/[0.14]"
                }
              >
                <td className="py-2.5 pr-3 text-[13px] font-medium text-white/85">{r.name}</td>
                <ScoreCell value={r.assessmentScore} best={bestOf(rows, "assessmentScore")} />
                <ScoreCell value={r.aiReadinessScore} best={bestOf(rows, "aiReadinessScore")} />
                <td className="py-2.5 pl-3 text-right font-mono text-[12.5px] text-white/70 tabular-nums">
                  {fmtPct(r.revenueGrowthYoy)}
                </td>
                <td className="py-2.5 pl-3 text-right">
                  <span className="font-mono text-[12.5px] text-white/70 tabular-nums">{r.gapScore ?? "—"}</span>
                  {r.gapDirection && (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.1em] text-white/40">
                      {r.gapDirection}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[12px] text-white/35">
        Your selection also shapes every composed briefing deck.
      </div>
    </Pane>
  );
}

function bestOf(rows: { [k: string]: unknown }[], key: string): number | null {
  const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
  return vals.length ? Math.max(...vals) : null;
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`pb-2 pr-3 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40 last:pr-0 ${className}`}
    >
      {children}
    </th>
  );
}

function ScoreCell({ value, best }: { value: number | null; best: number | null }) {
  const isBest = value != null && best != null && value === best;
  return (
    <td className="py-2.5 pl-3 text-right">
      <span
        className={
          isBest
            ? "font-mono text-[12.5px] font-semibold text-[#f0dca8] tabular-nums"
            : "font-mono text-[12.5px] text-white/70 tabular-nums"
        }
      >
        {value ?? "—"}
      </span>
    </td>
  );
}
