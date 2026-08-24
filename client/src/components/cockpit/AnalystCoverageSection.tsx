import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserRound, ExternalLink, Quote } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "@/components/cockpit/atoms";
import { VENDOR_OPTIONS } from "@/lib/cockpit";

// ============================================================================
// Individual analyst coverage — who, by firm, has actually written about the
// selected vendor, and what they said.
//
// These are REAL NAMED PEOPLE, so the display rules are strict:
//  - A stance is only shown when it carries a source link; the link is always
//    rendered next to it so the claim can be checked.
//  - A quote is verbatim or absent. Nothing is paraphrased into quote marks.
//  - An analyst with no found commentary is shown as exactly that — covering
//    the space, nothing published about this vendor — never as a neutral or
//    inferred opinion.
// ============================================================================

type CoverageRow = {
  id: string;
  analyst_name: string;
  firm: string;
  role: string | null;
  coverage: string | string[];
  profile_url: string | null;
  vendor_id: string | null;
  stance_summary: string | null;
  quote: string | null;
  source_url: string | null;
  source_type: string | null;
  published_date: string | null;
  date_precision: string | null;
};

function coverageList(c: string | string[]): string[] {
  if (Array.isArray(c)) return c;
  try {
    const p = JSON.parse(c);
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

function formatDate(d: string | null, precision: string | null): string | null {
  if (!d) return null;
  if (precision === "year") return d;
  if (precision === "month") {
    const [y, m] = d.split("-").map(Number);
    if (!y || !m) return d;
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AnalystCoverageSection({ vendorId }: { vendorId: string }) {
  const effectiveVendor = vendorId || VENDOR_OPTIONS[0].id;
  const vendorLabel = VENDOR_OPTIONS.find((v) => v.id === effectiveVendor)?.label ?? effectiveVendor;

  const { data, isLoading, isError } = useQuery<CoverageRow[]>({
    queryKey: [`/api/analyst-coverage?vendorId=${encodeURIComponent(effectiveVendor)}`],
  });

  const byFirm = useMemo(() => {
    const map = new Map<string, CoverageRow[]>();
    for (const r of data ?? []) {
      const list = map.get(r.firm) ?? [];
      list.push(r);
      map.set(r.firm, list);
    }
    // Firms with actual commentary on this vendor first — that is the signal.
    return Array.from(map.entries()).sort((a, b) => {
      const aHas = a[1].some((r: CoverageRow) => Boolean(r.stance_summary));
      const bHas = b[1].some((r: CoverageRow) => Boolean(r.stance_summary));
      if (aHas !== bHas) return aHas ? -1 : 1;
      return a[0].localeCompare(b[0]);
    });
  }, [data]);

  const withStance = (data ?? []).filter((r) => r.stance_summary).length;

  return (
    <section className="mb-14" data-testid="analyst-coverage-section">
      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Eyebrow className="text-white/50">Individual analyst coverage · {vendorLabel}</Eyebrow>
          <p className="mt-1.5 text-[12.5px] text-white/50">
            Named analysts by firm, and what they have actually published about {vendorLabel}. Every
            position links to its source.
          </p>
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
          {withStance > 0 ? `${withStance} sourced position${withStance === 1 ? "" : "s"}` : "By analyst firm"}
        </div>
      </div>

      {isLoading && (
        <Pane className="p-6">
          <p className="text-[13px] text-white/50">Loading analyst coverage…</p>
        </Pane>
      )}
      {isError && (
        <Pane className="p-6">
          <p className="text-[13px] text-[#e89797]">Could not load analyst coverage.</p>
        </Pane>
      )}

      {!isLoading && !isError && byFirm.length === 0 && (
        <Pane className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <UserRound className="h-6 w-6 text-white/50" />
          <p className="text-[13px] font-medium text-white/60">No individual analyst coverage on record yet</p>
          <p className="max-w-md text-[11.5px] text-white/50">
            This section only shows named analysts whose published commentary could be verified and linked.
            It fills in as verified coverage is added.
          </p>
        </Pane>
      )}

      {!isLoading && !isError && byFirm.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {byFirm.map(([firm, rows]: [string, CoverageRow[]]) => (
            <Pane key={firm} className="p-5" glow={rows.some((r: CoverageRow) => Boolean(r.stance_summary)) ? "gold" : "none"}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[14.5px] font-semibold text-[#e7e3d8]">{firm}</div>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
                  {rows.length} analyst{rows.length === 1 ? "" : "s"}
                </span>
              </div>
              <HairLine className="mb-3" />
              <ul className="space-y-3.5">
                {rows.map((r: CoverageRow) => {
                  const cov = coverageList(r.coverage);
                  const when = formatDate(r.published_date, r.date_precision);
                  return (
                    <li key={r.id} data-testid={`coverage-${r.id}`}>
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[13.5px] font-medium text-[#e7e3d8]">{r.analyst_name}</span>
                        {r.role && <span className="text-[11.5px] text-white/50">{r.role}</span>}
                        {r.profile_url && (
                          <a
                            href={r.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#d5b46b] transition hover:text-[#f0dca8]"
                          >
                            profile
                          </a>
                        )}
                      </div>
                      {cov.length > 0 && (
                        <div className="mt-1 text-[11px] text-white/50">Covers: {cov.slice(0, 4).join(" · ")}</div>
                      )}

                      {r.stance_summary ? (
                        <div className="mt-2 rounded-lg border border-[#3d8f6d]/[0.16] bg-[#1a5540]/[0.18] p-3">
                          <p className="text-[12.5px] leading-relaxed text-white/75">{r.stance_summary}</p>
                          {r.quote && (
                            <p className="mt-2 flex gap-1.5 text-[12px] italic leading-relaxed text-white/65">
                              <Quote className="mt-0.5 h-3 w-3 shrink-0 text-[#d5b46b]" />
                              <span>“{r.quote}”</span>
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {when && (
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">{when}</span>
                            )}
                            {r.source_url && (
                              <a
                                href={r.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`coverage-source-${r.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#d5b46b] transition hover:text-[#f0dca8]"
                              >
                                source <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 text-[11.5px] text-white/50">
                          Covers this market; no published commentary on {vendorLabel} found.
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Pane>
          ))}
        </div>
      )}
    </section>
  );
}
