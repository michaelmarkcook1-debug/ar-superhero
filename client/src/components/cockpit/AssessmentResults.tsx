import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Plus, Trash2, TrendingDown, TrendingUp, Minus, Sparkle } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "./atoms";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HOUSE_PLAYBOOKS, type AnalystHouseId } from "@shared/assessmentPlaybooks";

// ============================================================================
// Assessment results — Succeed tab.
// Log verified published outcomes (quadrant/ranking results) with the
// analyst-stated strengths & cautions quoted verbatim, link the submission
// decks used in that cycle, and get back the evidence-vs-result nuances.
// All feedback is observational (term overlap on your own artefacts, n= shown)
// — no prediction, no invented causality.
// ============================================================================

type LibraryDeck = { id: string; filename: string; house: string; slideCount: number };

type ResultInsight = { kind: string; line: string; source: string };

type StoredResult = {
  id: string;
  house: AnalystHouseId;
  segment: string;
  cycleLabel: string;
  publishedAt: string;
  position: string;
  priorPosition: string | null;
  strengths: string[];
  cautions: string[];
  linkedDeckIds: string[];
  notes: string | null;
  direction: "improved" | "held" | "declined" | "first-result" | "unknown";
  insights: ResultInsight[];
};

const KIND_LABEL: Record<string, string> = {
  "coverage-gap": "Coverage gap",
  "depth-nuance": "Depth nuance",
  "validated-strength": "Validated emphasis",
  "under-told-strength": "Under-told asset",
};

export default function AssessmentResults() {
  const { data: resultsData } = useQuery<{ results: StoredResult[] }>({
    queryKey: ["/api/assessment-results"],
  });
  const { data: library } = useQuery<{ decks: LibraryDeck[] }>({ queryKey: ["/api/deck-library"] });
  const results = resultsData?.results ?? [];

  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="mb-14" data-testid="assessment-results">
      <div className="mb-6 flex items-baseline justify-between">
        <Eyebrow className="text-white/65">Verified results · Learning loop</Eyebrow>
        <button
          type="button"
          data-testid="button-log-result"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#a88945]/40 bg-[#a88945]/[0.08] px-3.5 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#d5b46b] transition hover:bg-[#a88945]/[0.14]"
        >
          <Plus className="h-3 w-3" /> Log a published result
        </button>
      </div>

      {showForm && (
        <ResultForm
          decks={library?.decks ?? []}
          onDone={() => {
            setShowForm(false);
            void queryClient.invalidateQueries({ queryKey: ["/api/assessment-results"] });
            void queryClient.invalidateQueries({ queryKey: ["/api/assessment-results/learnings"] });
          }}
        />
      )}

      {results.length === 0 && !showForm ? (
        <Pane className="p-7">
          <div className="text-[13.5px] font-medium text-white/60">No published results logged yet.</div>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-white/60">
            When an assessment publishes, log the outcome with the analyst-stated strengths and cautions and
            link the submission decks you used. The loop compares what you submitted against what the analysts
            concluded — and feeds the nuances back into the house playbooks.
          </p>
        </Pane>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <ResultCard key={r.id} r={r} expanded={expanded === r.id} onToggle={() => setExpanded(expanded === r.id ? null : r.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function DirectionChip({ direction, prior, position }: { direction: StoredResult["direction"]; prior: string | null; position: string }) {
  if (direction === "improved")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a88945]/40 bg-[#a88945]/[0.1] px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f0dca8]">
        <TrendingUp className="h-3 w-3" /> {prior} → {position}
      </span>
    );
  if (direction === "declined")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/60">
        <TrendingDown className="h-3 w-3" /> {prior} → {position}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3d8f6d]/26 bg-[#1a5540]/20 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/70">
      <Minus className="h-3 w-3" /> {position}
    </span>
  );
}

function ResultCard({ r, expanded, onToggle }: { r: StoredResult; expanded: boolean; onToggle: () => void }) {
  const house = HOUSE_PLAYBOOKS.find((p) => p.id === r.house);
  async function handleDelete() {
    await fetch(`/api/assessment-results/${r.id}`, { method: "DELETE" });
    void queryClient.invalidateQueries({ queryKey: ["/api/assessment-results"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/assessment-results/learnings"] });
  }
  return (
    <Pane className="p-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left" data-testid={`result-${r.id}`}>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-white/55 transition ${expanded ? "rotate-90" : ""}`} />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold text-white/90">
              {house?.house ?? r.house} · {house?.assessment.name} — {r.segment}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
              {r.cycleLabel} · published {r.publishedAt} · {r.linkedDeckIds.length} linked submission
              {r.linkedDeckIds.length === 1 ? "" : "s"}
            </div>
          </div>
        </button>
        <DirectionChip direction={r.direction} prior={r.priorPosition} position={r.position} />
        <button type="button" aria-label="Delete result" onClick={() => void handleDelete()} className="text-white/50 transition hover:text-white/65">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-[#3d8f6d]/[0.16] pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {r.strengths.length > 0 && (
              <div>
                <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#d5b46b]">
                  Analyst-stated strengths (verbatim)
                </div>
                <ul className="space-y-1.5">
                  {r.strengths.map((s, i) => (
                    <li key={i} className="text-[12.5px] leading-relaxed text-white/70">· {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.cautions.length > 0 && (
              <div>
                <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/50">
                  Analyst-stated cautions (verbatim)
                </div>
                <ul className="space-y-1.5">
                  {r.cautions.map((c, i) => (
                    <li key={i} className="text-[12.5px] leading-relaxed text-white/70">· {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {r.insights.length > 0 && (
            <>
              <HairLine className="my-4" />
              <div className="mb-2 flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#63d7de]">
                <Sparkle className="h-3 w-3" /> What the loop noticed — evidence vs result
              </div>
              <ul className="space-y-2.5">
                {r.insights.map((i, k) => (
                  <li key={k} className="rounded-lg border border-[#3d8f6d]/[0.16] bg-[#1a5540]/[0.14] px-3.5 py-2.5">
                    <span className="mr-2 rounded-sm border border-[#63d7de]/30 px-1.5 py-px font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#63d7de]">
                      {KIND_LABEL[i.kind] ?? i.kind}
                    </span>
                    <span className="text-[12.5px] leading-relaxed text-white/80">{i.line}</span>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">{i.source}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Pane>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-[#3d8f6d]/24 bg-[#1a5540]/[0.16] px-3 text-[13px] text-white/85 placeholder:text-white/50 focus:border-[#a88945]/40 focus:outline-none";
const areaCls =
  "min-h-[84px] w-full rounded-md border border-[#3d8f6d]/24 bg-[#1a5540]/[0.16] px-3 py-2 text-[13px] leading-relaxed text-white/85 placeholder:text-white/50 focus:border-[#a88945]/40 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/60">{label}</span>
      {children}
    </label>
  );
}

function ResultForm({ decks, onDone }: { decks: LibraryDeck[]; onDone: () => void }) {
  const [houseId, setHouseId] = useState<AnalystHouseId>("gartner");
  const [segment, setSegment] = useState("");
  const [cycleLabel, setCycleLabel] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [position, setPosition] = useState("");
  const [priorPosition, setPriorPosition] = useState("");
  const [strengths, setStrengths] = useState("");
  const [cautions, setCautions] = useState("");
  const [linked, setLinked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const houseDecks = decks.filter((d) => d.house === houseId);
  const playbook = HOUSE_PLAYBOOKS.find((p) => p.id === houseId)!;
  const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter((s) => s.length >= 3);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiRequest("POST", "/api/assessment-results", {
        house: houseId,
        segment: segment.trim(),
        cycleLabel: cycleLabel.trim(),
        publishedAt: publishedAt.trim(),
        position: position.trim(),
        priorPosition: priorPosition.trim() || undefined,
        strengths: lines(strengths),
        cautions: lines(cautions),
        linkedDeckIds: linked,
      });
      await res.json();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const canSave = segment.trim().length >= 2 && cycleLabel.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(publishedAt.trim()) && position.trim().length >= 2 && !saving;

  return (
    <Pane glow="gold" className="mb-5 p-7">
      <Eyebrow tone="gold" className="mb-4">Log a published result</Eyebrow>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {HOUSE_PLAYBOOKS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-testid={`result-house-${p.id}`}
            onClick={() => { setHouseId(p.id); setLinked([]); }}
            className={
              p.id === houseId
                ? "rounded-full border border-[#a88945]/40 bg-[#a88945]/[0.1] px-3 py-1.5 text-[11.5px] font-medium text-[#f0dca8]"
                : "rounded-full border border-[#3d8f6d]/[0.20] px-3 py-1.5 text-[11.5px] text-white/55 transition hover:text-white/85"
            }
          >
            {p.house}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label={`Segment / study * (${playbook.assessment.name})`}>
          <input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="e.g. Public Cloud IT Transformation Services" data-testid="input-result-segment" className={inputCls} />
        </Field>
        <Field label="Cycle label *">
          <input value={cycleLabel} onChange={(e) => setCycleLabel(e.target.value)} placeholder="e.g. 2026 edition / H1 2026" data-testid="input-result-cycle" className={inputCls} />
        </Field>
        <Field label="Published date * (YYYY-MM-DD)">
          <input value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} placeholder="2026-06-30" data-testid="input-result-date" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Position *">
            <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Leader" data-testid="input-result-position" className={inputCls} />
          </Field>
          <Field label="Prior position">
            <input value={priorPosition} onChange={(e) => setPriorPosition(e.target.value)} placeholder="e.g. Major Contender" data-testid="input-result-prior" className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Analyst-stated strengths — one per line, verbatim from the report">
          <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} data-testid="input-result-strengths" className={areaCls} placeholder={"Paste the strengths exactly as published…"} />
        </Field>
        <Field label="Analyst-stated cautions — one per line, verbatim from the report">
          <textarea value={cautions} onChange={(e) => setCautions(e.target.value)} data-testid="input-result-cautions" className={areaCls} placeholder={"Paste the cautions exactly as published…"} />
        </Field>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/60">
          Link the submission decks used in this cycle ({playbook.house}-tagged uploads)
        </div>
        {houseDecks.length === 0 ? (
          <p className="text-[12px] text-white/55">
            No {playbook.house}-tagged decks in the library yet — upload them in the Briefing composer below, then link them here to unlock the evidence-vs-result comparison.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {houseDecks.map((d) => {
              const on = linked.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  data-testid={`result-link-${d.id}`}
                  onClick={() => setLinked((s) => (on ? s.filter((x) => x !== d.id) : [...s, d.id]))}
                  className={
                    on
                      ? "rounded-full border border-[#00a7b7]/45 bg-[#00a7b7]/[0.1] px-3 py-1.5 text-[11.5px] text-[#9fe3e8]"
                      : "rounded-full border border-[#3d8f6d]/24 px-3 py-1.5 text-[11.5px] text-white/55 transition hover:text-white/85"
                  }
                >
                  {d.filename}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-[#a88945]/40 bg-[#a88945]/[0.08] px-3.5 py-2.5 text-[12.5px] text-[#f0dca8]">{error}</div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          data-testid="button-save-result"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="inline-flex items-center gap-2 rounded-full bg-[#a88945] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0c1a15] transition hover:bg-[#d5b46b] disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save result & run the comparison
        </button>
        <span className="text-[11.5px] text-white/55">Feedback is observational (n= shown) — never predictive.</span>
      </div>
    </Pane>
  );
}
