import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, ExternalLink, ChevronRight } from "lucide-react";
import { Pane, Eyebrow, Glyph, HairLine } from "@/components/cockpit/atoms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { VENDOR_OPTIONS } from "@/lib/cockpit";

// ============================================================================
// Public analyst rankings — real, cited placements (Magic Quadrant, Wave,
// PEAK Matrix, Horizons, NEAT, Provider Lens, etc.) for the tracked vendors,
// grouped by analyst firm. Every entry links to the real source it was found
// at; there is no modelled or estimated placement here. An empty state means
// no public placement has been logged yet for that firm — not a zero score.
// ============================================================================

type RankingRow = {
  id: string;
  vendor_id: string;
  analyst_firm: string;
  report_name: string;
  category: string | null;
  placement: string;
  published_date: string;
  date_precision: "day" | "month" | "year" | string;
  source_url: string;
  source_type: "vendor_press_release" | "analyst_firm_page" | "trade_press" | "other" | string;
  summary: string;
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  vendor_press_release: "Vendor press release",
  analyst_firm_page: "Analyst-firm page",
  trade_press: "Trade press",
  other: "Other public source",
};

function vendorLabel(vendorId: string): string {
  return VENDOR_OPTIONS.find((v) => v.id === vendorId)?.label ?? vendorId;
}

function formatPublished(published_date: string, precision: string): string {
  if (precision === "year") return published_date;
  if (precision === "month") {
    const [y, m] = published_date.split("-").map(Number);
    if (!y || !m) return published_date;
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const d = new Date(published_date);
  if (Number.isNaN(d.getTime())) return published_date;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PublicRankingsSection() {
  const { data, isLoading, isError } = useQuery<RankingRow[]>({ queryKey: ["/api/public-rankings"] });
  const [activeFirm, setActiveFirm] = useState<string | null>(null);

  const rows = data ?? [];

  const byFirm = useMemo(() => {
    const map = new Map<string, RankingRow[]>();
    for (const r of rows) {
      const list = map.get(r.analyst_firm) ?? [];
      list.push(r);
      map.set(r.analyst_firm, list);
    }
    return map;
  }, [rows]);

  const firms = useMemo(() => Array.from(byFirm.keys()).sort((a, b) => a.localeCompare(b)), [byFirm]);
  const activeEntries = activeFirm ? (byFirm.get(activeFirm) ?? []) : [];
  const sortedActiveEntries = [...activeEntries].sort((a, b) => {
    const vendorCmp = vendorLabel(a.vendor_id).localeCompare(vendorLabel(b.vendor_id));
    if (vendorCmp !== 0) return vendorCmp;
    return b.published_date.localeCompare(a.published_date);
  });

  return (
    <section className="mb-14" data-testid="public-rankings-section">
      <div className="mb-7 flex items-baseline justify-between">
        <div>
          <Eyebrow className="text-white/45">Public analyst rankings · last two years</Eyebrow>
          <p className="mt-1.5 text-[12.5px] text-white/40">
            Every entry is a real, cited placement — click a firm to see the full history and sources.
          </p>
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
          By analyst firm
        </div>
      </div>

      {isLoading && (
        <Pane className="p-6">
          <p className="text-[13px] text-white/40">Loading rankings…</p>
        </Pane>
      )}

      {isError && (
        <Pane className="p-6">
          <p className="text-[13px] text-[#e89797]">Could not load public rankings.</p>
        </Pane>
      )}

      {!isLoading && !isError && firms.length === 0 && (
        <Pane className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <Award className="h-6 w-6 text-white/15" />
          <p className="text-[13px] font-medium text-white/55">No public rankings on record yet</p>
          <p className="max-w-md text-[11.5px] text-white/35">
            This section only shows real, cited analyst-firm placements — nothing is estimated. It fills in as
            verified findings are added.
          </p>
        </Pane>
      )}

      {!isLoading && !isError && firms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) => {
            const entries = byFirm.get(firm)!;
            const vendorsCovered = new Set(entries.map((e) => e.vendor_id));
            const mostRecent = entries.reduce((latest, e) => (e.published_date > latest.published_date ? e : latest), entries[0]);
            return (
              <button
                key={firm}
                type="button"
                onClick={() => setActiveFirm(firm)}
                data-testid={`ranking-firm-card-${firm.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-left"
              >
                <Pane className="h-full p-5 transition hover:border-[#3d8f6d]/32" glow="gold">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#a88945]/30 bg-[#a88945]/[0.08] text-[#d5b46b]">
                        <Award className="h-3.5 w-3.5" />
                      </span>
                      <div className="text-[15px] font-semibold leading-snug text-[#e7e3d8]">{firm}</div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/25" />
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-white/50">
                    {entries.length} placement{entries.length === 1 ? "" : "s"} · {vendorsCovered.size} vendor
                    {vendorsCovered.size === 1 ? "" : "s"} covered
                  </p>
                  <HairLine className="my-3.5" />
                  <div className="text-[11px] text-white/40">
                    Most recent — <span className="text-white/60">{vendorLabel(mostRecent.vendor_id)}</span>,{" "}
                    {formatPublished(mostRecent.published_date, mostRecent.date_precision)}
                  </div>
                </Pane>
              </button>
            );
          })}
        </div>
      )}

      {/* Click-through detail — full 2-year history for the selected firm */}
      <Dialog open={!!activeFirm} onOpenChange={(o) => !o && setActiveFirm(null)}>
        <DialogContent className="max-w-2xl border-[#3d8f6d]/24 bg-[#0c1a15] text-[#e7e3d8]" data-testid="ranking-firm-modal">
          {activeFirm && (
            <>
              <DialogHeader>
                <Glyph className="mb-1">{sortedActiveEntries.length} placement{sortedActiveEntries.length === 1 ? "" : "s"} · last two years</Glyph>
                <DialogTitle className="text-[18px] font-semibold leading-snug text-[#f4eed8]">{activeFirm}</DialogTitle>
              </DialogHeader>
              <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {sortedActiveEntries.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl border border-[#3d8f6d]/[0.14] bg-[#1a5540]/[0.16] p-4"
                    data-testid={`ranking-entry-${e.id}`}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#3d8f6d]/26 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/60">
                        {vendorLabel(e.vendor_id)}
                      </span>
                      <span className="rounded-full border border-[#a88945]/30 bg-[#a88945]/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e5c989]">
                        {e.placement}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                        {formatPublished(e.published_date, e.date_precision)}
                      </span>
                    </div>
                    <div className="text-[13.5px] font-semibold leading-snug text-[#e7e3d8]">{e.report_name}</div>
                    {e.category && <div className="mt-0.5 text-[11.5px] text-white/40">{e.category}</div>}
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">{e.summary}</p>
                    <a
                      href={e.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`ranking-source-${e.id}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#d5b46b] transition hover:text-[#f0dca8]"
                    >
                      {SOURCE_TYPE_LABEL[e.source_type] ?? e.source_type} <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
