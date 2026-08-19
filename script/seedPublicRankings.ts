import { readFile } from "node:fs/promises";

// ============================================================================
// One-time loader for real, cited public analyst rankings (Magic Quadrant /
// Wave / PEAK Matrix / Horizons / NEAT / Provider Lens / etc.) found via web
// research. Reads a JSON array matching the public_analyst_rankings schema
// and POSTs each row to /api/public-rankings. Idempotency is NOT handled
// server-side (no unique constraint) — re-running this against the same
// target will duplicate rows, so only run it once per target/dataset.
//
// Usage:
//   npx tsx script/seedPublicRankings.ts <path-to-json> [baseUrl]
//   npx tsx script/seedPublicRankings.ts script/publicRankingsData.json https://ar-superhero.vercel.app
// ============================================================================

type RankingInput = {
  vendor_id: string;
  analyst_firm: string;
  report_name: string;
  category?: string;
  placement: string;
  published_date: string;
  date_precision?: "day" | "month" | "year";
  source_url: string;
  source_type: "vendor_press_release" | "analyst_firm_page" | "trade_press" | "other";
  summary: string;
};

async function main() {
  const jsonPath = process.argv[2];
  const baseUrl = process.argv[3] ?? "https://ar-superhero.vercel.app";
  if (!jsonPath) {
    console.error("Usage: npx tsx script/seedPublicRankings.ts <path-to-json> [baseUrl]");
    process.exit(1);
  }

  const raw = await readFile(jsonPath, "utf-8");
  const rows: RankingInput[] = JSON.parse(raw);
  console.log(`Loaded ${rows.length} rows from ${jsonPath}. Posting to ${baseUrl}/api/public-rankings ...`);

  let ok = 0;
  let failed = 0;
  const failures: { row: RankingInput; error: string }[] = [];

  for (const row of rows) {
    try {
      const res = await fetch(`${baseUrl}/api/public-rankings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      ok++;
    } catch (err) {
      failed++;
      failures.push({ row, error: (err as Error).message });
    }
  }

  console.log(`\nDone. ${ok} inserted, ${failed} failed.`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  [${f.row.vendor_id} / ${f.row.analyst_firm}] ${f.row.report_name} — ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
