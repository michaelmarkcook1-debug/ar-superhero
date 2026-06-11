import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, AlertTriangle, Sparkles, FileDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  LENSES,
  DIRECT_UPLOADS,
  DIRECT_MATERIAL_TYPES,
  DIRECT_DECISION_STAGES,
  DIRECT_MODEL_IMPACTS,
  DIRECT_DELIVERABLES,
  DIRECT_DELIVERABLES_NOTE,
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
} from "@/components/cockpit/atoms";
import {
  UploadPanel,
  UploadedItemsList,
  DecisionModel,
  type GenericUploadedItem,
} from "@/components/cockpit/upload";
import { DeliverablesPanel } from "@/components/cockpit/deliverables";

const PERSONA_DECK_VENDOR = "capgemini";

export default function Direct() {
  const [selectedId, setSelectedId] = useState<LensId>("executive");
  const [extraUploads, setExtraUploads] = useState<DirectUpload[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const selected = LENSES.find((l) => l.id === selectedId) || LENSES[0];

  async function downloadPersonaDeck(personaIds: LensId[], key: string) {
    setDownloading(key);
    try {
      const response = await apiRequest("POST", "/api/persona-decks/generate", {
        personaIds,
        vendorId: PERSONA_DECK_VENDOR,
      });
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename =
        match?.[1] ??
        `${PERSONA_DECK_VENDOR}-${personaIds.join("-")}-analyst-influence-briefing.pptx`;
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
                    : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.14] hover:bg-white/[0.03]"
                }`}
              >
                <div
                  className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                    active ? "text-[#d5b46b]" : "text-white/35"
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
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-white/40">
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
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
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
                className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3.5 py-3"
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
            onClick={() => downloadPersonaDeck([selected.id], selected.id)}
            disabled={downloading !== null}
            data-testid="button-generate-brief"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#a88945] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0a0d14] transition hover:bg-[#d5b46b] disabled:cursor-wait disabled:opacity-60"
          >
            {downloading === selected.id ? "Generating deck…" : selected.briefing.cta}
            {downloading === selected.id ? (
              <FileDown className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => downloadPersonaDeck(LENSES.map((l) => l.id), "__all__")}
            disabled={downloading !== null}
            data-testid="button-generate-all-personas"
            className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.02] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:border-[#d5b46b]/45 hover:text-[#f0dca8] disabled:cursor-wait disabled:opacity-60"
          >
            {downloading === "__all__" ? "Generating combined pack…" : "Download combined persona pack"}
            <FileDown className="h-3.5 w-3.5" />
          </button>
          <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
            AnalystGenius persona pack · PPT · Source-traced · NDA controls applied
          </div>
        </Pane>
      </section>

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

      <section className="mb-16">
        <DecisionModel<DirectMaterialType>
          accent="gold"
          eyebrow="Direct decision model"
          title="From upload to leader briefing."
          description="Five stages turn raw internal material into lens-routed brief inputs, action asks, and risks or opportunities by lens. Output is a briefing-ready summary, source-traced, with NDA controls applied."
          stages={DIRECT_DECISION_STAGES}
          impacts={DIRECT_MODEL_IMPACTS}
          finalNote="Brief summaries surface what AR observes. Leader relationship stance is held back unless AR chooses to include it."
        />
      </section>

      {/* Deliverables — per stakeholder lens */}
      <section className="mb-16">
        <DeliverablesPanel
          eyebrow={`Deliverables · ${selected.label}`}
          title="Stakeholder-specific outputs, source-traced."
          description={`AnalystGenius templates for the ${selected.label} lens. Each output composes from analyst signals, uploaded material, and briefing context. Click a format to queue the export.`}
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
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/35">
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
                    : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.14] hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex-1">
                  <div className="text-[10.5px] uppercase tracking-[0.18em] text-white/40">
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
                    active ? "text-[#d5b46b]" : "text-white/30 group-hover:text-white/70"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>
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
