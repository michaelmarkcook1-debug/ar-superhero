import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "./atoms";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { storedCompetitorTickers } from "@/lib/agBrief";
import { HOUSE_PLAYBOOKS, type AnalystHouseId } from "@shared/assessmentPlaybooks";

// ============================================================================
// Briefing composer — Succeed tab.
// Ingest prior briefing decks (.pptx), set the briefing variables, and compose
// an analyst-house-targeted deck: house playbook structure + reused verbatim
// content + live AG signals + explicit OPEN INPUT sections.
// ============================================================================

type LibraryDeck = {
  id: string;
  filename: string;
  house: string;
  uploadedAt: number;
  slideCount: number;
};

type Executive = { name: string; title: string };

const LENGTH_OPTIONS = [30, 45, 60] as const;

export default function BriefingComposer() {
  const [houseId, setHouseId] = useState<AnalystHouseId>("gartner");
  const [selectedDecks, setSelectedDecks] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [region, setRegion] = useState("");
  const [lengthMins, setLengthMins] = useState<number>(45);
  const [executives, setExecutives] = useState<Executive[]>([{ name: "", title: "" }]);
  const [uploading, setUploading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: library } = useQuery<{ decks: LibraryDeck[] }>({ queryKey: ["/api/deck-library"] });
  const decks = library?.decks ?? [];
  const playbook = HOUSE_PLAYBOOKS.find((p) => p.id === houseId)!;

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ filename: file.name, house: houseId });
      const res = await fetch(`/api/deck-library/upload?${qs}`, { method: "POST", body: file });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/deck-library"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/deck-library/${id}`, { method: "DELETE" });
    setSelectedDecks((s) => s.filter((d) => d !== id));
    await queryClient.invalidateQueries({ queryKey: ["/api/deck-library"] });
  }

  async function handleCompose() {
    setComposing(true);
    setError(null);
    try {
      const response = await apiRequest("POST", "/api/briefing-composer/generate", {
        houseId,
        deckIds: selectedDecks,
        variables: {
          topic: topic.trim(),
          region: region.trim() || undefined,
          briefingLengthMins: lengthMins,
          executives: executives.filter((e) => e.name.trim() && e.title.trim()),
        },
        competitorTickers: storedCompetitorTickers(),
      });
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] ?? `${houseId}-briefing.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compose failed");
    } finally {
      setComposing(false);
    }
  }

  const canCompose = topic.trim().length >= 2 && !composing;

  return (
    <section className="mb-14" data-testid="briefing-composer">
      <div className="mb-7 flex items-baseline justify-between">
        <Eyebrow className="text-white/45">Briefing composer</Eyebrow>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/30">
          Prior decks + AG signals + your variables
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Left — deck library */}
        <Pane className="p-7">
          <div className="mb-5 flex items-center justify-between">
            <Eyebrow tone="teal">Deck library · Ingested prior briefings</Eyebrow>
            <button
              type="button"
              data-testid="button-upload-deck"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#00a7b7]/35 bg-[#00a7b7]/[0.08] px-3.5 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#63d7de] transition hover:bg-[#00a7b7]/[0.14] disabled:opacity-40"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
              Upload .pptx
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pptx"
              className="hidden"
              data-testid="input-deck-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
          </div>

          <p className="mb-4 text-[13px] leading-relaxed text-white/50">
            Tick decks to reuse their slides in the composed briefing.
          </p>

          {decks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.12] bg-[#1a5540]/[0.12] px-4 py-8 text-center">
              <div className="text-[12.5px] font-medium text-white/55">No decks ingested yet.</div>
              <div className="mt-1 text-[11.5px] text-white/35">
                Upload previous analyst briefing decks (.pptx) to build the reuse library.
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {decks.map((d) => {
                const checked = selectedDecks.includes(d.id);
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 rounded-lg border border-[#3d8f6d]/[0.14] bg-[#1a5540]/[0.16] px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      data-testid={`check-deck-${d.id}`}
                      onChange={(e) =>
                        setSelectedDecks((s) => (e.target.checked ? [...s, d.id] : s.filter((x) => x !== d.id)))
                      }
                      className="h-3.5 w-3.5 accent-[#a88945]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-white/85">{d.filename}</div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
                        {HOUSE_PLAYBOOKS.find((p) => p.id === d.house)?.house ?? d.house} · {d.slideCount} slides ·{" "}
                        {new Date(d.uploadedAt).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${d.filename}`}
                      data-testid={`button-delete-deck-${d.id}`}
                      onClick={() => void handleDelete(d.id)}
                      className="text-white/30 transition hover:text-white/70"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Pane>

        {/* Right — variables + compose */}
        <Pane glow="gold" className="p-7">
          <Eyebrow tone="gold" className="mb-5">
            Compose · {playbook.house} {playbook.assessment.name}
          </Eyebrow>

          {/* House select */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {HOUSE_PLAYBOOKS.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`composer-house-${p.id}`}
                onClick={() => setHouseId(p.id)}
                className={
                  p.id === houseId
                    ? "rounded-full border border-[#a88945]/40 bg-[#a88945]/[0.1] px-3 py-1.5 text-[11.5px] font-medium text-[#f0dca8]"
                    : "rounded-full border border-[#3d8f6d]/[0.20] bg-[#1a5540]/[0.18] px-3 py-1.5 text-[11.5px] text-white/55 transition hover:text-white/85"
                }
              >
                {p.house}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Assessment topic *">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Application modernisation services"
                data-testid="input-topic"
                className={inputCls}
              />
            </Field>
            <Field label="Region">
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Europe / North America / Global"
                data-testid="input-region"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Briefing length">
              <div className="flex gap-1.5">
                {LENGTH_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-testid={`length-${m}`}
                    onClick={() => setLengthMins(m)}
                    className={
                      m === lengthMins
                        ? "rounded-full border border-[#00a7b7]/40 bg-[#00a7b7]/[0.08] px-3.5 py-1.5 text-[11.5px] font-medium text-[#63d7de]"
                        : "rounded-full border border-[#3d8f6d]/[0.20] px-3.5 py-1.5 text-[11.5px] text-white/55 transition hover:text-white/85"
                    }
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Executives */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/40">
                Presenting executives
              </span>
              <button
                type="button"
                data-testid="button-add-exec"
                onClick={() => setExecutives((ex) => [...ex, { name: "", title: "" }])}
                disabled={executives.length >= 8}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#63d7de] transition hover:text-white/85 disabled:opacity-40"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {executives.map((ex, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={ex.name}
                    onChange={(e) =>
                      setExecutives((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder="Name"
                    data-testid={`input-exec-name-${i}`}
                    className={inputCls}
                  />
                  <input
                    value={ex.title}
                    onChange={(e) =>
                      setExecutives((list) => list.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                    }
                    placeholder="Title"
                    data-testid={`input-exec-title-${i}`}
                    className={inputCls}
                  />
                  {executives.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove executive"
                      onClick={() => setExecutives((list) => list.filter((_, j) => j !== i))}
                      className="shrink-0 text-white/30 transition hover:text-white/70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <HairLine className="my-5" />

          {/* What the composed deck contains */}
          <ul className="mb-5 space-y-1.5 text-[12.5px] leading-relaxed text-white/55">
            <li>· {playbook.house} targeting structure</li>
            <li>· Live signal, competitive and gap-analysis slides</li>
            <li>
              · {selectedDecks.length} prior deck{selectedDecks.length === 1 ? "" : "s"} reused
            </li>
            <li>· Open-input slides for client evidence &amp; roadmap</li>
          </ul>

          {error && (
            <div className="mb-4 rounded-lg border border-[#a88945]/40 bg-[#a88945]/[0.08] px-3.5 py-2.5 text-[12.5px] text-[#f0dca8]">
              {error}
            </div>
          )}

          <button
            type="button"
            data-testid="button-compose"
            onClick={() => void handleCompose()}
            disabled={!canCompose}
            className="inline-flex items-center gap-2 rounded-full bg-[#a88945] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0c1a15] transition hover:bg-[#d5b46b] disabled:opacity-40"
          >
            {composing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Compose {playbook.house} briefing deck
          </button>
        </Pane>
      </div>
    </section>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-[#3d8f6d]/24 bg-[#1a5540]/[0.22] px-3 text-[13px] text-white/85 placeholder:text-white/30 focus:border-[#a88945]/40 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>
      {children}
    </label>
  );
}
