import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, AlertTriangle, Sparkles, FileDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { storedCompetitorTickers } from "@/lib/agBrief";
import { scenariosForPersona, type PersonaScenarioId } from "@shared/briefingScenarios";
import { HOUSE_PLAYBOOKS, type AnalystHouseId } from "@shared/assessmentPlaybooks";
import {
  LENSES,
  DIRECT_UPLOADS,
  DIRECT_MATERIAL_TYPES,
  DIRECT_DECISION_STAGES,
  DIRECT_MODEL_IMPACTS,
  DIRECT_DELIVERABLES,
  DIRECT_DELIVERABLES_NOTE,
  VENDOR_OPTIONS,
  type LensId,
  type DirectUpload,
  type DirectMaterialType,
} from "@/lib/cockpit";
import {
  Pane,
  Eyebrow,
  SectionTitle,
  HairLine,
  Glyph,
  SubNav,
} from "@/components/cockpit/atoms";
import { Users, FolderOpen, GitBranch } from "lucide-react";
import {
  UploadPanel,
  UploadedItemsList,
  DecisionModel,
  type GenericUploadedItem,
} from "@/components/cockpit/upload";
import { DeliverablesPanel } from "@/components/cockpit/deliverables";

export default function Direct() {
  const [tab, setTab] = useState<"briefings" | "documents" | "pipeline">("briefings");
  const [selectedId, setSelectedId] = useState<LensId>("executive");
  const [extraUploads, setExtraUploads] = useState<DirectUpload[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [scenarioId, setScenarioId] = useState<PersonaScenarioId | "standard">("standard");
  const [scenarioHouse, setScenarioHouse] = useState<AnalystHouseId>("gartner");
  const [vendorId, setVendorId] = useState(VENDOR_OPTIONS[0].id);
  const selected = LENSES.find((l) => l.id === selectedId) || LENSES[0];

  async function downloadScenarioDeck(personaId: LensId, scenario: PersonaScenarioId, houseId: AnalystHouseId) {
    setDownloading("__scenario__");
    try {
      const response = await apiRequest("POST", "/api/persona-decks/scenario", {
        personaId,
        scenarioId: scenario,
        houseId,
        vendorId,
        competitorTickers: storedCompetitorTickers(),
      });
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] ?? `${personaId}-${scenario}-briefing.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  async function downloadPersonaDeck(personaIds: LensId[], key: string) {
    setDownloading(key);
    try {
      const response = await apiRequest("POST", "/api/persona-decks/generate", {
        personaIds,
        vendorId,
        competitorTickers: storedCompetitorTickers(),
      });
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename =
        match?.[1] ??
        `${vendorId}-${personaIds.join("-")}-analyst-influence-briefing.pptx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  const allUploads = [...extraUploads, ...DIRECT_UPLOADS];
  const newIds = extraUploads.map((u) => u.id);

  const uploadedItems: GenericUploadedItem[] = useMemo(
    () =>
      allUploads.map((u) => {
        const lens = LENSES.find((l) => l.id === u.lensId);
        const typeLabel =
          DIRECT_MATERIAL_TYPES.find((t) => t.id === u.type)?.label || u.type;
        return {
          id: u.id,
          filename: u.filename,
          typeLabel,
          size: u.size,
          uploadedBy: u.uploadedBy,
          uploadedAt: u.uploadedAt,
          state: u.state,
          badge: lens ? `Lens · ${lens.label}` : undefined,
          summary: u.summary,
          signals: u.signals,
        };
      }),
    [allUploads]
  );

  function handleSimulatedUpload(info: {
    filename: string;
    type: DirectMaterialType;
    size: string;
  }) {
    const newItem: DirectUpload = {
      id: `du-new-${Date.now()}`,
      filename: info.filename,
      type: info.type,
      size: info.size,
      uploadedBy: "You",
      uploadedAt: "Just now",
      lensId: selectedId,
      state: "Routed to lens",
      summary:
        "Captured. Routed to the selected lens. Brief inputs and action asks updated.",
      signals: [
        `Routed to ${selectedId} lens`,
        "Brief inputs extracted",
        "Action ask candidates surfaced",
      ],
    };
    setExtraUploads((prev) => [newItem, ...prev]);
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10 lg:py-14">
      <SubNav
        items={[
          { id: "briefings", label: "Briefings", icon: <Users className="h-3.5 w-3.5" /> },
          { id: "documents", label: "Documents", hint: "Upload · Library", icon: <FolderOpen className="h-3.5 w-3.5" /> },
          { id: "pipeline", label: "Pipeline", hint: "Decision model", icon: <GitBranch className="h-3.5 w-3.5" /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "briefings" && (
        <>
      {/* Hero */}
      <section className="mb-12">
        <Eyebrow tone="gold" className="mb-3">
          <span className="inline-flex items-center gap-2">
            <Glyph>Mode II</Glyph>
            <span className="text-white/50">·</span>
            <span>Direct</span>
          </span>
        </Eyebrow>
        <h1 className="text-[44px] font-semibold leading-[0.98] tracking-[-0.035em] text-[#f4eed8] md:text-[56px] lg:text-[64px]">
          Turn analyst intelligence into <span className="text-[#a88945]">internal action.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-white/55 md:text-[16.5px]">
          Seven stakeholder lenses. Each one answers: what does this leader need
          to know, what does AR need from them, and what briefing should AR run
          this week.
        </p>
        <div className="mt-7 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-[#a88945]/25 bg-[#a88945]/[0.06] px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d5b46b]">
              Vendor
            </div>
            <div className="mt-0.5 text-[13px] text-white/55">
              Generated persona and scenario decks brief for this company.
            </div>
          </div>
          <select
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            data-testid="select-persona-deck-vendor"
            className="min-w-[220px] rounded-full border border-white/[0.12] bg-[#090d14] px-4 py-2 text-[13px] font-medium text-[#f4eed8] outline-none transition hover:border-[#d5b46b]/45 focus:border-[#d5b46b]"
          >
            {VENDOR_OPTIONS.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Lens selector — premium horizontal rail */}
      <section className="mb-10">
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          data-testid="lens-selector"
        >
          {LENSES.map((lens, i) => {
            const active = lens.id === selectedId;
            return (
              <button
                key={lens.id}
                type="button"
                onClick={() => setSelectedId(lens.id)}
                data-testid={`lens-${lens.id}`}
                className={`group relative flex shrink-0 flex-col items-start gap-1 rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${
                  active
                    ? "border-[#a88945]/40 bg-gradient-to-b from-[#a88945]/[0.10] to-[#a88945]/[0.02] shadow-[0_0_40px_-16px_rgba(168,137,69,0.5)]"
                    : "border-[#3d8f6d]/[0.16] bg-[#1a5540]/[0.16] hover:border-[#3d8f6d]/30 hover:bg-[#1a5540]/[0.22]"
                }`}
              >
                <div
                  className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                    active ? "text-[#d5b46b]" : "text-white/55"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className={`text-[14px] font-semibold tracking-tight ${
                    active ? "text-[#f4eed8]" : "text-white/85"
                  }`}
                >
                  {lens.label}
                </div>
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-white/60">
                  {lens.stakeholder.split("·")[0].trim()}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Lens detail */}
      <section className="mb-14 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Pane glow="gold" className="p-8 lg:p-10">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#d5b46b]">
            Lens · {selected.label}
          </div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white/65">
            {selected.stakeholder}
          </div>
          <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-tight text-[#f4eed8] md:text-[34px]">
            {selected.oneLine}
          </h2>

          <HairLine className="my-7" />

          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            <Block
              eyebrow="What they need to know"
              items={selected.knows}
            />
            <Block
              eyebrow="What AR needs from them"
              items={selected.needsFromAR}
              tone="teal"
            />
          </div>

          <HairLine className="my-7" />

          <div className="mb-3 flex items-center justify-between">
            <Eyebrow>Risks &amp; opportunities</Eyebrow>
          </div>
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {selected.risks.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-[#3d8f6d]/[0.14] bg-[#1a5540]/[0.16] px-3.5 py-3"
              >
                {r.tone === "risk" ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e89797]" />
                ) : (
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a5d8ab]" />
                )}
                <span className="text-[13px] leading-snug text-white/80">{r.title}</span>
              </li>
            ))}
          </ul>
        </Pane>

        {/* Briefing card */}
        <Pane className="p-7">
          <Eyebrow tone="gold" className="mb-3">
            Briefing action
          </Eyebrow>
          <div className="text-[20px] font-semibold leading-snug tracking-tight text-[#e7e3d8]">
            {selected.briefing.headline}
          </div>

          <HairLine className="my-5" />

          <ol className="space-y-3">
            {selected.briefing.bullets.map((b, i) => (
              <li key={i} className="flex gap-4">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#a88945]/30 bg-[#a88945]/[0.08] font-mono text-[10.5px] text-[#d5b46b]">
                  {i + 1}
                </span>
                <span className="text-[13.5px] leading-relaxed text-white/75">{b}</span>
              </li>
            ))}
          </ol>

          <HairLine className="my-5" />

          <button
            type="button"
            onClick={() => setContextOpen((v) => !v)}
            disabled={downloading !== null}
            data-testid="button-generate-brief"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#a88945] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0c1a15] transition hover:bg-[#d5b46b] disabled:cursor-wait disabled:opacity-60"
          >
            {downloading !== null ? "Generating deck…" : selected.briefing.cta}
            {downloading !== null ? (
              <FileDown className="h-4 w-4" />
            ) : (
              <ArrowRight className={`h-4 w-4 transition ${contextOpen ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
            )}
          </button>

          {contextOpen && (
            <div className="mt-3 rounded-xl border border-[#3d8f6d]/[0.20] bg-[#0c1a15] p-4" data-testid="further-context">
              <div className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#d5b46b]">
                Further context — what should this briefing serve?
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  data-testid="scenario-standard"
                  onClick={() => setScenarioId("standard")}
                  className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition ${
                    scenarioId === "standard"
                      ? "border-[#a88945]/45 bg-[#a88945]/[0.10]"
                      : "border-[#3d8f6d]/[0.16] bg-[#1a5540]/[0.12] hover:border-[#3d8f6d]/30"
                  }`}
                >
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${scenarioId === "standard" ? "bg-[#d5b46b]" : "bg-white/25"}`} />
                  <span>
                    <span className="block text-[12.5px] font-medium text-white/85">Standard persona pack</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-white/60">
                      The full analyst-influence briefing for this lens.
                    </span>
                  </span>
                </button>
                {scenariosForPersona(selected.id).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    data-testid={`scenario-${s.id}`}
                    onClick={() => setScenarioId(s.id)}
                    className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition ${
                      scenarioId === s.id
                        ? "border-[#a88945]/45 bg-[#a88945]/[0.10]"
                        : "border-[#3d8f6d]/[0.16] bg-[#1a5540]/[0.12] hover:border-[#3d8f6d]/30"
                    }`}
                  >
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${scenarioId === s.id ? "bg-[#d5b46b]" : "bg-white/25"}`} />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-medium text-white/85">{s.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-white/60">{s.when}</span>
                      {scenarioId === s.id && (
                        <span className="mt-1 block text-[10px] leading-snug text-[#63d7de]/80">
                          Draws on: {s.intel.join(" · ")}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {scenarioId !== "standard" && scenariosForPersona(selected.id).find((s) => s.id === scenarioId)?.houseScoped && (
                <div className="mt-3">
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">
                    Analyst house context
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {HOUSE_PLAYBOOKS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`scenario-house-${p.id}`}
                        onClick={() => setScenarioHouse(p.id)}
                        className={
                          p.id === scenarioHouse
                            ? "rounded-full border border-[#00a7b7]/45 bg-[#00a7b7]/[0.1] px-2.5 py-1 text-[11px] text-[#9fe3e8]"
                            : "rounded-full border border-[#3d8f6d]/24 px-2.5 py-1 text-[11px] text-white/50 transition hover:text-white/80"
                        }
                      >
                        {p.house}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                data-testid="button-generate-scenario"
                disabled={downloading !== null}
                onClick={() =>
                  scenarioId === "standard"
                    ? downloadPersonaDeck([selected.id], selected.id)
                    : void downloadScenarioDeck(selected.id, scenarioId, scenarioHouse)
                }
                className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#a88945]/50 bg-[#a88945]/[0.14] px-5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#f0dca8] transition hover:bg-[#a88945]/[0.22] disabled:cursor-wait disabled:opacity-60"
              >
                {downloading !== null ? "Generating…" : "Generate this briefing"}
                <FileDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => downloadPersonaDeck(LENSES.map((l) => l.id), "__all__")}
            disabled={downloading !== null}
            data-testid="button-generate-all-personas"
            className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-[#1a5540]/[0.18] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:border-[#d5b46b]/45 hover:text-[#f0dca8] disabled:cursor-wait disabled:opacity-60"
          >
            {downloading === "__all__" ? "Generating combined pack…" : "Download combined persona pack"}
            <FileDown className="h-3.5 w-3.5" />
          </button>
          <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
            AnalystGenius persona pack · PPT · Source-traced · NDA controls applied
          </div>
        </Pane>
      </section>
        </>
      )}

      {tab === "documents" && (
        <>
      {/* Upload internal material */}
      <section className="mb-14" id="upload-material">
        <UploadPanel<DirectMaterialType>
          accent="gold"
          eyebrow="Mode II · Direct"
          title="Upload material to feed leader briefings."
          subtitle="Internal leadership notes, briefing requests, board drafts, service-line or delivery updates, regional updates, internal plans, and analyst-derived summaries already approved for internal use. Each upload is routed to the right stakeholder lens."
          types={DIRECT_MATERIAL_TYPES}
          onSimulatedUpload={handleSimulatedUpload}
          permissionNote="Internal-only material. Used to build stakeholder briefings and action asks. Relationship stance stays hidden unless you choose to surface it."
        />
      </section>

      <section className="mb-14">
        <SectionTitle
          eyebrow="Lens material library"
          title="Everything uploaded, routed by lens."
          description={`${uploadedItems.length} items analysed across seven stakeholder lenses. Each item shows where it has been routed and what AR captured.`}
        />
        <UploadedItemsList items={uploadedItems} newIds={newIds} />
      </section>
        </>
      )}

      {tab === "pipeline" && (
      <section className="mb-16">
        <DecisionModel<DirectMaterialType>
          accent="gold"
          eyebrow="Direct decision model"
          title="From upload to leader briefing."
          description="Five stages turn raw internal material into lens-routed brief inputs, action asks, and risks or opportunities by lens — a briefing-ready summary with NDA controls applied."
          stages={DIRECT_DECISION_STAGES}
          impacts={DIRECT_MODEL_IMPACTS}
          finalNote="Brief summaries surface what AR observes. Leader relationship stance is held back unless AR chooses to include it."
        />
      </section>
      )}

      {tab === "briefings" && (
        <>
      {/* Deliverables — per stakeholder lens */}
      <section className="mb-16">
        <DeliverablesPanel
          eyebrow={`Deliverables · ${selected.label}`}
          title="Stakeholder-specific outputs."
          description={`Templates for the ${selected.label} lens. Click a format to queue the export.`}
          templates={DIRECT_DELIVERABLES[selectedId]}
          accent="gold"
          guardrailNote={DIRECT_DELIVERABLES_NOTE}
        />
      </section>

      {/* All lenses index */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Eyebrow className="mb-2">All lenses</Eyebrow>
            <div className="text-[20px] font-semibold tracking-tight text-[#e7e3d8]">
              Every leader, one click away.
            </div>
          </div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
            {LENSES.length} lenses
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {LENSES.map((l) => {
            const active = l.id === selectedId;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedId(l.id)}
                data-testid={`lens-card-${l.id}`}
                className={`group flex items-start gap-4 rounded-xl border p-5 text-left transition ${
                  active
                    ? "border-[#a88945]/30 bg-[#a88945]/[0.05]"
                    : "border-[#3d8f6d]/[0.16] bg-[#1a5540]/[0.16] hover:border-[#3d8f6d]/30 hover:bg-[#1a5540]/[0.22]"
                }`}
              >
                <div className="flex-1">
                  <div className="text-[10.5px] uppercase tracking-[0.18em] text-white/60">
                    {l.stakeholder}
                  </div>
                  <div className="mt-1 text-[16px] font-semibold tracking-tight text-[#e7e3d8]">
                    {l.label}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-white/55">
                    {l.briefing.headline}
                  </p>
                </div>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-[#d5b46b]" : "text-white/50 group-hover:text-white/70"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>
        </>
      )}
    </div>
  );
}

function Block({
  eyebrow,
  items,
  tone = "gold",
}: {
  eyebrow: string;
  items: string[];
  tone?: "gold" | "teal";
}) {
  return (
    <div>
      <Eyebrow tone={tone === "gold" ? "gold" : "teal"} className="mb-3">
        {eyebrow}
      </Eyebrow>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={`mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full ${
                tone === "gold" ? "bg-[#a88945]" : "bg-[#00a7b7]"
              }`}
            />
            <span className="text-[13.5px] leading-relaxed text-white/75">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
