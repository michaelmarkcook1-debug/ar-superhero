import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowUpRight, ExternalLink, UserRound } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "@/components/cockpit/atoms";
import { VENDOR_OPTIONS } from "@/lib/cockpit";

// ============================================================================
// Your analysts — the AR morning question, answered from real data.
//
// "Who is writing about us" comes from coverage: named analysts, what they
// published about the focal vendor, when, and the source. "Who do I owe a
// call" comes from the roster: the last logged interaction, which is honestly
// empty until the AR team logs one. The two are merged server-side per person.
//
// These are REAL NAMED PEOPLE: nothing here is inferred. A person with no
// published position on this vendor is shown as exactly that, and an absent
// interaction is shown as absent, never as a neutral default.
// ============================================================================

type VendorAnalyst = {
  key: string;
  roster_id: string | null;
  name: string;
  firm: string;
  role: string | null;
  profile_url: string | null;
  positions: number;
  latest_published: string | null;
  latest_precision: string | null;
  latest_source_url: string | null;
  months_old: number | null;
  stale: boolean;
  last_interaction_at: number | null;
  current_stance: { stance: string; confidence: number } | null;
  rating: string | null;
};

type VendorAnalystView = {
  vendorId: string;
  summary: {
    named: number;
    withPosition: number;
    stale: number;
    inRoster: number;
    withInteraction: number;
    withStance: number;
  };
  analysts: VendorAnalyst[];
};

/** Rows shown on the front page; the full list lives in the coverage section. */
const SHOW = 8;

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

export default function YourAnalystsPanel({ vendorId }: { vendorId: string }) {
  const effectiveVendor = vendorId || VENDOR_OPTIONS[0].id;
  const vendorLabel = VENDOR_OPTIONS.find((v) => v.id === effectiveVendor)?.label ?? effectiveVendor;

  const { data, isLoading, isError } = useQuery<VendorAnalystView>({
    queryKey: [`/api/analysts/vendor-view?vendorId=${encodeURIComponent(effectiveVendor)}`],
  });

  const summary = data?.summary;
  const shown = (data?.analysts ?? []).slice(0, SHOW);
  const more = Math.max(0, (data?.analysts.length ?? 0) - SHOW);

  return (
    <section className="mb-14" data-testid="your-analysts">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow className="text-white/65">Your analysts · {vendorLabel}</Eyebrow>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
          {summary
            ? `${summary.named} named · ${summary.withPosition} with a sourced position${
                summary.stale > 0 ? ` · ${summary.stale} dated` : ""
              }`
            : "Who is writing about you"}
        </div>
      </div>

      <Pane glow="gold" className="p-6">
        {isLoading && <p className="text-[13px] text-white/55">Loading your analysts…</p>}
        {isError && <p className="text-[13px] text-[#e89797]">Could not load the analyst view.</p>}

        {!isLoading && !isError && shown.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <UserRound className="h-6 w-6 text-white/50" />
            <p className="text-[13px] font-medium text-white/65">No named analyst coverage on record for {vendorLabel} yet</p>
            <p className="max-w-md text-[11.5px] text-white/55">
              Only analysts whose published commentary could be verified and linked appear here.
            </p>
          </div>
        )}

        {shown.length > 0 && (
          <ul className="grid grid-cols-1 gap-x-10 gap-y-3.5 lg:grid-cols-2">
            {shown.map((a) => {
              const when = formatDate(a.latest_published, a.latest_precision);
              return (
                <li
                  key={a.key}
                  data-testid={`your-analyst-${a.key.replace(/[^a-z0-9]+/g, "-")}`}
                  className="flex items-start justify-between gap-4 border-b border-white/[0.05] pb-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[13.5px] font-semibold text-[#e7e3d8]">{a.name}</span>
                      <span className="text-[11.5px] text-white/55">
                        {a.firm}
                        {a.role ? ` · ${a.role}` : ""}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                      {a.positions > 0 ? (
                        <>
                          <span>
                            {a.positions} sourced position{a.positions === 1 ? "" : "s"}
                          </span>
                          {when && <span className="font-mono uppercase tracking-[0.14em]">{when}</span>}
                          {a.stale && a.months_old !== null && (
                            <span
                              className="rounded-full border border-[#d5b46b]/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#e5c989]"
                              title="Older than two years — historic coverage, not a current read"
                            >
                              dated · {Math.round(a.months_old / 12)}y
                            </span>
                          )}
                          {a.latest_source_url && (
                            <a
                              href={a.latest_source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-[#d5b46b] transition hover:text-[#f0dca8]"
                            >
                              source <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </>
                      ) : (
                        <span>Covers this market; nothing published on {vendorLabel} found.</span>
                      )}
                    </div>
                  </div>
                  {a.last_interaction_at !== null && (
                    <div className="shrink-0 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
                      last contact{" "}
                      {new Date(a.last_interaction_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {more > 0 && (
          <div className="mt-3 text-[11.5px] text-white/50">
            {more} more in the full coverage section below.
          </div>
        )}

        {summary && summary.named > 0 && (
          <>
            <HairLine className="my-4" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-2xl text-[12px] leading-relaxed text-white/55">
                {summary.withInteraction === 0
                  ? "Seeded from public coverage. No relationship rating or interaction is recorded for any of them yet, so “who do I owe a call” has no answer until the first briefing is logged."
                  : `${summary.withInteraction} of ${summary.named} have a logged interaction; ${summary.withStance} carry a confirmed stance.`}
              </p>
              <Link
                href="/admin/analysts"
                data-testid="your-analysts-open-roster"
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#d5b46b] transition hover:text-[#f0dca8]"
              >
                Open roster <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </>
        )}
      </Pane>
    </section>
  );
}
