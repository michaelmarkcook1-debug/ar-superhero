import { randomUUID } from "node:crypto";
import { assessmentResultsLocal, type AssessmentResultRow } from "../storage";
import { getPgSql } from "./deckStore";
import { deckStore } from "./deckStore";
import { HOUSE_PLAYBOOKS, playbookById, type AnalystHouseId } from "@shared/assessmentPlaybooks";

// ============================================================================
// Assessment results + learning loop.
//
// Users log VERIFIED published results (quadrant/ranking outcomes) with the
// analyst-stated strengths and cautions quoted verbatim from the report, and
// link the submission decks they used in that cycle. The learning layer then
// does a deterministic comparison — analyst-stated themes vs the verbatim
// text of the linked submissions — and surfaces the nuances:
//
//   · cautions the submissions never covered        (coverage gap)
//   · cautions raised DESPITE submission coverage   (depth-vs-presence nuance)
//   · strengths that echo the submissions           (validated emphasis)
//   · strengths the analysts saw that you under-told (under-claimed asset)
//
// HONESTY MODEL: everything here is an OBSERVATION from term overlap on the
// user's own artefacts, labelled with its cycle count (n=). No causal claims,
// no prediction, no invented content. These observations AUGMENT the owner
// playbook document in the UI and decks — clearly labelled — they never
// rewrite it.
// ============================================================================

export interface ResultInsight {
  kind: "coverage-gap" | "depth-nuance" | "validated-strength" | "under-told-strength";
  line: string;
  source: string;
}

export interface StoredResult extends AssessmentResultRow {
  direction: "improved" | "held" | "declined" | "first-result" | "unknown";
  insights: ResultInsight[];
}

export interface HouseLearning {
  house: AnalystHouseId;
  cycles: number;
  lines: { line: string; source: string }[];
}

// ---------------------------------------------------------------------------
// Storage — Postgres when DECK_DB_URL is set (shared client), SQLite fallback.
// ---------------------------------------------------------------------------

interface ResultsStore {
  list(): Promise<AssessmentResultRow[]>;
  insert(row: AssessmentResultRow): Promise<void>;
  remove(id: string): Promise<boolean>;
}

function makePgResultsStore(sql: NonNullable<ReturnType<typeof getPgSql>>): ResultsStore {
  let ensured: Promise<void> | null = null;
  function ensureTable(): Promise<void> {
    if (!ensured) {
      ensured = sql`
        CREATE TABLE IF NOT EXISTS ar_superhero_assessment_results (
          id uuid PRIMARY KEY,
          house text NOT NULL,
          segment text NOT NULL,
          cycle_label text NOT NULL,
          published_at text NOT NULL,
          position text NOT NULL,
          prior_position text,
          strengths_json jsonb NOT NULL,
          cautions_json jsonb NOT NULL,
          linked_deck_ids_json jsonb NOT NULL,
          notes text,
          created_at bigint NOT NULL
        )
      `.then(async () => {
        await sql`ALTER TABLE ar_superhero_assessment_results ENABLE ROW LEVEL SECURITY`.catch(() => {});
      });
    }
    return ensured;
  }

  return {
    async list() {
      await ensureTable();
      const rows = await sql<any[]>`
        SELECT * FROM ar_superhero_assessment_results ORDER BY published_at DESC, created_at DESC
      `;
      return rows.map((r) => ({
        id: r.id,
        house: r.house,
        segment: r.segment,
        cycleLabel: r.cycle_label,
        publishedAt: r.published_at,
        position: r.position,
        priorPosition: r.prior_position ?? null,
        strengths: r.strengths_json as string[],
        cautions: r.cautions_json as string[],
        linkedDeckIds: r.linked_deck_ids_json as string[],
        notes: r.notes ?? null,
        createdAt: Number(r.created_at),
      }));
    },
    async insert(row) {
      await ensureTable();
      await sql`
        INSERT INTO ar_superhero_assessment_results
          (id, house, segment, cycle_label, published_at, position, prior_position,
           strengths_json, cautions_json, linked_deck_ids_json, notes, created_at)
        VALUES
          (${row.id}, ${row.house}, ${row.segment}, ${row.cycleLabel}, ${row.publishedAt},
           ${row.position}, ${row.priorPosition}, ${sql.json(row.strengths)},
           ${sql.json(row.cautions)}, ${sql.json(row.linkedDeckIds)}, ${row.notes}, ${row.createdAt})
      `;
    },
    async remove(id) {
      await ensureTable();
      const res = await sql`DELETE FROM ar_superhero_assessment_results WHERE id = ${id}`;
      return res.count > 0;
    },
  };
}

const _sql = getPgSql();
const resultsStore: ResultsStore = _sql
  ? makePgResultsStore(_sql)
  : {
      async list() {
        return assessmentResultsLocal.list();
      },
      async insert(row) {
        assessmentResultsLocal.insert(row);
      },
      async remove(id) {
        return assessmentResultsLocal.remove(id);
      },
    };

// ---------------------------------------------------------------------------
// Position ladders — published bands per house, best first. Used only to
// derive improved/held/declined between the user's own prior and new position.
// ---------------------------------------------------------------------------

const POSITION_LADDERS: Record<AnalystHouseId, string[]> = {
  gartner: ["leader", "challenger", "visionary", "niche player"],
  forrester: ["leader", "strong performer", "contender"],
  idc: ["leader", "major player", "contender", "participant"],
  hfs: ["horizon 3", "horizon 2", "horizon 1"],
  nelsonhall: ["leader", "high achiever", "innovator", "major player"],
  isg: ["leader", "product challenger", "market challenger", "contender"],
  everest: ["leader", "major contender", "aspirant"],
};

function deriveDirection(row: AssessmentResultRow): StoredResult["direction"] {
  if (!row.priorPosition) return "first-result";
  const ladder = POSITION_LADDERS[row.house as AnalystHouseId] ?? [];
  const now = ladder.indexOf(row.position.trim().toLowerCase());
  const prior = ladder.indexOf(row.priorPosition.trim().toLowerCase());
  if (now < 0 || prior < 0) return "unknown";
  if (now < prior) return "improved";
  if (now > prior) return "declined";
  return "held";
}

// ---------------------------------------------------------------------------
// Deterministic nuance detection — term overlap between analyst statements
// and the verbatim text of the linked submission decks.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the", "and", "for", "with", "our", "your", "from", "into", "that", "this", "are",
  "was", "will", "has", "have", "been", "its", "of", "in", "on", "to", "a", "an", "as",
  "is", "it", "by", "or", "at", "we", "their", "they", "but", "not", "more", "than",
  "capgemini", "company", "vendor", "provider", "clients", "customers",
]);

function terms(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

/** Count how many of `statementTerms` appear in the submission corpus. */
function overlap(statement: string, corpusTerms: Set<string>): { hits: number; total: number } {
  const st = terms(statement);
  const hits = st.filter((t) => corpusTerms.has(t)).length;
  return { hits, total: st.length };
}

async function deriveInsights(row: AssessmentResultRow): Promise<ResultInsight[]> {
  const insights: ResultInsight[] = [];
  const linked = (
    await Promise.all(row.linkedDeckIds.map((id) => deckStore.get(id).catch(() => null)))
  ).filter((d): d is NonNullable<typeof d> => d != null);

  const deckCount = linked.length;
  const corpusTerms = new Set<string>();
  for (const d of linked) for (const s of d.slides) for (const t of terms(s.texts.join(" "))) corpusTerms.add(t);

  const src = (what: string) =>
    `Observational — ${what} vs ${deckCount} linked submission deck${deckCount === 1 ? "" : "s"}, ${row.house} ${row.cycleLabel} (n=1 cycle)`;

  if (!deckCount) {
    if (row.cautions.length || row.strengths.length) {
      insights.push({
        kind: "coverage-gap",
        line: "No submission decks are linked to this result — link the decks used in this cycle to unlock the evidence-vs-result comparison.",
        source: "No linked submissions",
      });
    }
    return insights;
  }

  for (const caution of row.cautions) {
    const { hits, total } = overlap(caution, corpusTerms);
    if (total === 0) continue;
    const ratio = hits / total;
    if (ratio < 0.25) {
      insights.push({
        kind: "coverage-gap",
        line: `Caution "${caution}" — your linked submissions barely touch this theme (${hits}/${total} key terms present). The evidence base may have left it uncontested.`,
        source: src("analyst caution"),
      });
    } else {
      insights.push({
        kind: "depth-nuance",
        line: `Caution "${caution}" was raised even though your submissions cover the theme (${hits}/${total} key terms present) — presence wasn't enough; the depth or proof quality likely fell short.`,
        source: src("analyst caution"),
      });
    }
  }

  for (const strength of row.strengths) {
    const { hits, total } = overlap(strength, corpusTerms);
    if (total === 0) continue;
    const ratio = hits / total;
    if (ratio >= 0.25) {
      insights.push({
        kind: "validated-strength",
        line: `Strength "${strength}" echoes your submission themes (${hits}/${total} key terms present) — the emphasis landed; keep leading with it.`,
        source: src("analyst strength"),
      });
    } else {
      insights.push({
        kind: "under-told-strength",
        line: `Analysts credited "${strength}" although your submissions barely told that story (${hits}/${total} key terms present) — an asset you can afford to claim more loudly.`,
        source: src("analyst strength"),
      });
    }
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NewResultInput {
  house: AnalystHouseId;
  segment: string;
  cycleLabel: string;
  publishedAt: string;
  position: string;
  priorPosition?: string;
  strengths: string[];
  cautions: string[];
  linkedDeckIds: string[];
  notes?: string;
}

export async function addResult(input: NewResultInput): Promise<StoredResult> {
  const row: AssessmentResultRow = {
    id: randomUUID(),
    house: input.house,
    segment: input.segment,
    cycleLabel: input.cycleLabel,
    publishedAt: input.publishedAt,
    position: input.position,
    priorPosition: input.priorPosition ?? null,
    strengths: input.strengths,
    cautions: input.cautions,
    linkedDeckIds: input.linkedDeckIds,
    notes: input.notes ?? null,
    createdAt: Date.now(),
  };
  await resultsStore.insert(row);
  return { ...row, direction: deriveDirection(row), insights: await deriveInsights(row) };
}

export async function listResults(): Promise<StoredResult[]> {
  const rows = await resultsStore.list();
  return Promise.all(
    rows.map(async (r) => ({ ...r, direction: deriveDirection(r), insights: await deriveInsights(r) }))
  );
}

export async function removeResult(id: string): Promise<boolean> {
  return resultsStore.remove(id);
}

/**
 * Per-house learned observations for the playbooks and composer. Aggregates
 * the per-result insights; every block reports its cycle count and stays
 * clearly separated from the owner-document guidance.
 */
export async function houseLearnings(houseId?: AnalystHouseId): Promise<HouseLearning[]> {
  const all = await listResults();
  const houses = houseId ? [houseId] : (HOUSE_PLAYBOOKS.map((p) => p.id) as AnalystHouseId[]);
  const out: HouseLearning[] = [];

  for (const h of houses) {
    const results = all.filter((r) => r.house === h);
    if (!results.length) continue;
    const playbook = playbookById(h);
    const lines: HouseLearning["lines"] = [];

    for (const r of results) {
      const dirNote =
        r.direction === "improved"
          ? `moved ${r.priorPosition} → ${r.position}`
          : r.direction === "declined"
            ? `slipped ${r.priorPosition} → ${r.position}`
            : r.direction === "held"
              ? `held ${r.position}`
              : `entered at ${r.position}`;
      for (const i of r.insights.filter((i) => i.kind !== "validated-strength").slice(0, 2)) {
        lines.push({
          line: `${r.cycleLabel} (${r.segment}, ${dirNote}): ${i.line}`,
          source: i.source,
        });
      }
      const validated = r.insights.filter((i) => i.kind === "validated-strength");
      if (validated.length) {
        lines.push({
          line: `${r.cycleLabel} (${r.segment}, ${dirNote}): ${validated.length} analyst-stated strength${validated.length === 1 ? "" : "s"} echoed your submission themes — the emphasis carried through to the published ${playbook.assessment.name}.`,
          source: validated[0].source,
        });
      }
    }

    out.push({ house: h, cycles: results.length, lines: lines.slice(0, 6) });
  }
  return out;
}
