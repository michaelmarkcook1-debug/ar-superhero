import { publicRankingsStore } from "./publicRankingsStore";
import { baseReportName } from "./workSeed";
import type { PublicAnalystRanking } from "@shared/schema";

// ============================================================================
// Evaluation anniversaries — the honest form of an evaluation calendar.
//
// SuperHero holds no analyst-house research agenda, and the placement history
// carries one edition for almost every evaluation series, so a cadence-derived
// "next edition" would be an estimate for three series and an invention for
// the rest. What the history DOES support is the age of the last logged
// placement per evaluation. Most recurring evaluations run annually, so an
// approaching anniversary is a real prompt to check the house's agenda — and a
// last edition well past a year is a prompt to verify whether a newer edition
// exists that the record has missed. Neither is presented as a date.
// ============================================================================

export type AnniversaryBand = "recent" | "approaching" | "anniversary" | "verify";

export interface EvaluationEdition {
  date: string;
  precision: string;
  placement: string;
  source_url: string;
  source_type: string;
}

export interface EvaluationSeries {
  key: string;
  firm: string;
  report: string;
  editions: EvaluationEdition[];
  last: EvaluationEdition;
  monthsSinceLast: number;
  band: AnniversaryBand;
  /** Only when two or more editions are on record: months between the last two. */
  observedCadenceMonths: number | null;
  note: string;
}

export interface EvaluationCalendar {
  vendorId: string;
  generatedAt: string;
  counts: Record<AnniversaryBand, number> & { series: number };
  caveat: string;
  series: EvaluationSeries[];
}

export const CALENDAR_CAVEAT =
  "Ages of the last logged placement per evaluation. Most recurring evaluations run annually, but AR SuperHero holds no house research calendar, so an anniversary is a prompt to check the house's agenda, not a date.";

/** Mid-point of a coarse date so precision is honoured rather than faked. */
function pointInTime(date: string, precision: string): Date | null {
  const iso =
    precision === "year" || /^\d{4}$/.test(date)
      ? `${date.slice(0, 4)}-07-01`
      : precision === "month" || /^\d{4}-\d{2}$/.test(date)
        ? `${date.slice(0, 7)}-15`
        : date;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthsBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function ago(months: number): string {
  const m = Math.round(months);
  if (m < 1) return "this month";
  if (m < 24) return `${m} month${m === 1 ? "" : "s"} ago`;
  const y = Math.floor(m / 12);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

function bandOf(months: number): AnniversaryBand {
  if (months < 10) return "recent";
  if (months < 11) return "approaching";
  if (months <= 13) return "anniversary";
  return "verify";
}

function noteFor(band: AnniversaryBand, months: number, precision: string): string {
  const coarse = precision === "year" ? " Date known to the year only." : precision === "month" ? " Date known to the month." : "";
  switch (band) {
    case "recent":
      return `Placed ${ago(months)}.${coarse}`;
    case "approaching":
      return `Last edition ${ago(months)}. If this evaluation runs annually, the next cycle is near; check the house's research agenda.${coarse}`;
    case "anniversary":
      return `About a year since the last edition. Check the house's agenda for the current cycle.${coarse}`;
    case "verify":
      return `${ago(months).replace(/^\w/, (c) => c.toUpperCase())} since the last logged edition. Verify whether a newer edition has been published and is missing from the record.${coarse}`;
  }
}

const BAND_ORDER: Record<AnniversaryBand, number> = { anniversary: 0, approaching: 1, verify: 2, recent: 3 };

export async function vendorEvaluationCalendar(vendorId: string): Promise<EvaluationCalendar> {
  const rows = await publicRankingsStore.listRankings(vendorId);
  const now = new Date();

  const groups = new Map<string, { firm: string; report: string; rows: PublicAnalystRanking[] }>();
  for (const r of rows) {
    const report = baseReportName(r.report_name);
    const key = `${r.analyst_firm.trim().toLowerCase()}|${report.toLowerCase()}`;
    const g = groups.get(key) ?? { firm: r.analyst_firm.trim(), report, rows: [] };
    g.rows.push(r);
    groups.set(key, g);
  }

  const series: EvaluationSeries[] = [];
  for (const [key, g] of Array.from(groups.entries())) {
    const editions: EvaluationEdition[] = g.rows
      .map((r) => ({
        date: r.published_date,
        precision: r.date_precision,
        placement: r.placement,
        source_url: r.source_url,
        source_type: r.source_type,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const last = editions[0];
    const lastAt = pointInTime(last.date, last.precision);
    if (!lastAt) continue;
    const months = monthsBetween(lastAt, now);
    const band = bandOf(months);

    let observedCadenceMonths: number | null = null;
    if (editions.length >= 2) {
      const prevAt = pointInTime(editions[1].date, editions[1].precision);
      if (prevAt) observedCadenceMonths = Math.round(monthsBetween(prevAt, lastAt));
    }

    series.push({
      key,
      firm: g.firm,
      report: g.report,
      editions,
      last,
      monthsSinceLast: Math.round(months * 10) / 10,
      band,
      observedCadenceMonths,
      note:
        noteFor(band, months, last.precision) +
        (observedCadenceMonths !== null ? ` ${editions.length} editions on record, the last two ${observedCadenceMonths} months apart.` : ""),
    });
  }

  series.sort((a, b) => {
    if (BAND_ORDER[a.band] !== BAND_ORDER[b.band]) return BAND_ORDER[a.band] - BAND_ORDER[b.band];
    return b.monthsSinceLast - a.monthsSinceLast;
  });

  const counts = { series: series.length, recent: 0, approaching: 0, anniversary: 0, verify: 0 };
  for (const s of series) counts[s.band]++;

  return { vendorId, generatedAt: now.toISOString(), counts, caveat: CALENDAR_CAVEAT, series };
}
