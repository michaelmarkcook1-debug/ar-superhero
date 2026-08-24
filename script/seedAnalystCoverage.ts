import { readFile } from "node:fs/promises";

// ============================================================================
// Loader for verified individual-analyst coverage.
//
// Input is the research output: one object per analyst, each with a
// vendor_commentary array. This flattens to one row per (analyst, vendor
// commentary), plus a single profile-only row (vendor_id null) for any analyst
// with no commentary — a verified analyst who covers the space is a legitimate
// record and must not be dropped or given an invented opinion.
//
// The API rejects a stance without a source_url, so anything uncited fails
// loudly here rather than being stored.
//
// Usage:
//   npx tsx script/seedAnalystCoverage.ts <path-to-json> [baseUrl]
// ============================================================================

type Commentary = {
  vendor: string;
  stance_summary?: string | null;
  quote?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  published_date?: string | null;
};

type AnalystInput = {
  name: string;
  firm: string;
  role?: string | null;
  coverage?: string[];
  profile_url?: string | null;
  vendor_commentary?: Commentary[];
};

function precisionOf(d?: string | null): "day" | "month" | "year" | undefined {
  if (!d) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return "day";
  if (/^\d{4}-\d{2}$/.test(d)) return "month";
  if (/^\d{4}$/.test(d)) return "year";
  return undefined;
}

async function main() {
  const jsonPath = process.argv[2];
  const baseUrl = process.argv[3] ?? "https://ar-superhero.vercel.app";
  if (!jsonPath) {
    console.error("Usage: npx tsx script/seedAnalystCoverage.ts <path-to-json> [baseUrl]");
    process.exit(1);
  }

  const analysts: AnalystInput[] = JSON.parse(await readFile(jsonPath, "utf-8"));
  const rows: Record<string, unknown>[] = [];

  for (const a of analysts) {
    const base = {
      analyst_name: a.name,
      firm: a.firm,
      role: a.role ?? null,
      coverage: a.coverage ?? [],
      profile_url: a.profile_url ?? null,
    };
    const commentary = (a.vendor_commentary ?? []).filter((c) => c && c.vendor);
    if (!commentary.length) {
      rows.push({ ...base, vendor_id: null });
      continue;
    }
    for (const c of commentary) {
      // A stance without a citation is dropped rather than stored uncited.
      if (c.stance_summary && !c.source_url) {
        console.warn(`SKIP (uncited stance): ${a.name} / ${c.vendor}`);
        continue;
      }
      rows.push({
        ...base,
        vendor_id: String(c.vendor).toLowerCase(),
        stance_summary: c.stance_summary ?? null,
        quote: c.quote ?? null,
        source_url: c.source_url ?? null,
        source_type: c.source_type ?? null,
        published_date: c.published_date ?? null,
        date_precision: precisionOf(c.published_date),
      });
    }
  }

  console.log(`Loaded ${analysts.length} analysts -> ${rows.length} rows. Posting to ${baseUrl} ...`);

  let ok = 0;
  const failures: { row: Record<string, unknown>; error: string }[] = [];
  for (const row of rows) {
    try {
      const res = await fetch(`${baseUrl}/api/analyst-coverage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      ok++;
    } catch (err) {
      failures.push({ row, error: (err as Error).message });
    }
  }

  console.log(`\nDone. ${ok} inserted, ${failures.length} failed.`);
  for (const f of failures) {
    console.log(`  [${f.row.analyst_name} / ${f.row.vendor_id ?? "profile-only"}] ${f.error}`);
  }
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
