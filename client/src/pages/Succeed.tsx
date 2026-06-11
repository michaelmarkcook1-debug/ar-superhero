import { useMemo, useState } from "react";
import { ChevronRight, FileDown, FileText, Calendar, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  MOMENTS,
  EVIDENCE_GAPS,
  ASSESSMENT_MODELS,
  HFS_GUIDANCE,
  SUCCEED_UPLOADS,
  SUCCEED_MATERIAL_TYPES,
  SUCCEED_DECISION_STAGES,
  SUCCEED_MODEL_IMPACTS,
  type AnalystMoment,
  type SucceedUpload,
  type SucceedMaterialType,
} from "@/lib/cockpit";
import {
  UploadPanel,
  UploadedItemsList,
  DecisionModel,
  type GenericUploadedItem,
} from "@/components/cockpit/upload";
import {
  Pane,
  Eyebrow,
  SectionTitle,
  ReadinessBar,
  StatusChip,
  StatusDot,
  HairLine,
  Glyph,
  NumberMark,
} from "@/components/cockpit/atoms";

const VENDOR_OPTIONS = [
  { id: "capgemini", label: "Capgemini" },
  { id: "cognizant", label: "Cognizant" },
  { id: "accenture", label: "Accenture" },
  { id: "ibm", label: "IBM" },
];

const LIVE_DEMO_MOMENT_IDS = ["m1", "m2"];

export default function Succeed() {
  const liveMoments = useMemo(
    () => MOMENTS.filter((moment) => LIVE_DEMO_MOMENT_IDS.includes(moment.id)),
    []
  );
  const liveMomentIds = useMemo(() => new Set(liveMoments.map((moment) => moment.id)), [liveMoments]);
  const liveGaps = useMemo(
    () => EVIDENCE_GAPS.filter((gap) => liveMomentIds.has(gap.momentId)),
    [liveMomentIds]
  );
  const [selectedId, setSelectedId] = useState<string>(liveMoments[0].id);
  const [showHfsDetail, setShowHfsDetail] = useState(false);
  const [extraUploads, setExtraUploads] = useState<SucceedUpload[]>([]);
  const [generatingDeckId, setGeneratingDeckId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("capgemini");
  const selected = liveMoments.find((m) => m.id === selectedId) || liveMoments[0];
  const selectedVendor =
    VENDOR_OPTIONS.find((vendor) => vendor.id === selectedVendorId) ?? VENDOR_OPTIONS[0];

  const allUploads = [...extraUploads, ...SUCCEED_UPLOADS].filter(
    (upload) => !upload.momentId || liveMomentIds.has(upload.momentId)
  );
  const newIds = extraUploads.map((u) => u.id);

  const uploadedItems: GenericUploadedItem[] = useMemo(
    () =>
      allUploads.map((u) => {
        const moment = liveMoments.find((m) => m.id === u.momentId);
        const typeLabel =
          SUCCEED_MATERIAL_TYPES.find((t) => t.id === u.type)?.label || u.type;
        return {
          id: u.id,
          filename: u.filename,
          typeLabel,
          size: u.size,
          uploadedBy: u.uploadedBy,
          uploadedAt: u.uploadedAt,
          state: u.state,
          badge: moment?.model,
          summary: u.summary,
          signals: u.signals,
        };
      }),
    [allUploads, liveMoments]
  );

  function handleSimulatedUpload(info: {
    filename: string;
    type: SucceedMaterialType;
    size: string;
  }) {
    const newItem: SucceedUpload = {
      id: `su-new-${Date.now()}`,
      filename: info.filename,
      type: info.type,
      size: info.size,
      uploadedBy: "You",
      uploadedAt: "Just now",
      momentId: liveMoments[0].id,
      state: "Analysed",
      summary:
        "Captured. Signals routed to the Succeed decision model. Cross-client learning gated on AnalystGenius validation.",
      signals: [
        "Criteria extracted",
        "Routed to readiness band",
        "Open learning signal queued",
      ],
      permission: "Customer readiness only",
    };
    setExtraUploads((prev) => [newItem, ...prev]);
  }

  const exposureCounts = {
    Strong: liveMoments.filter((m) => m.readiness === "Strong").length,
    Adequate: liveMoments.filter((m) => m.readiness === "Adequate").length,
    Weak: liveMoments.filter((m) => m.readiness === "Weak").length,
    Missing: liveMoments.filter((m) => m.readiness === "Missing").length,
    Unsupported: liveMoments.filter((m) => m.readiness === "Unsupported").length,
  };

  const momentGaps = liveGaps.filter((g) => g.momentId === selected.id);

  async function handleGenerateBriefingDeck(moment: AnalystMoment) {
    setGeneratingDeckId(moment.id);
    try {
      const response = await apiRequest("POST", "/api/briefing-decks/generate", {
        momentId: moment.id,
        vendorId: selectedVendorId,
      });
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") ?? "";
      const match = contentDisposition.match(/filename=\"?([^\";]+)\"?/);
      const filename =
        match?.[1] ??
        `${selectedVendorId}-${moment.model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-briefing-deck.pptx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingDeckId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10 lg:py-14">
      {/* Hero */}
      <section className="mb-14">
        <Eyebrow tone="gold" className="mb-3">
          <span className="inline-flex items-center gap-2">
            <Glyph>Mode I</Glyph>
            <span className="text-white/50">·</span>
            <span>Succeed</span>
          </span>
        </Eyebrow>
        <h1 className="text-[44px] font-semibold leading-[0.98] tracking-[-0.035em] text-[#f4eed8] md:text-[56px] lg:text-[64px]">
          Succeed in <span className="text-[#a88945]">analyst moments.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-white/55 md:text-[16.5px]">
          Prepare, prove, and perform. Every active assessment is shown with its
          readiness exposure, evidence gaps, and the briefings AR can run
          today — across two live demo assessment views.
        </p>
        <div className="mt-7 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-[#a88945]/25 bg-[#a88945]/[0.06] px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d5b46b]">
              Demo vendor
            </div>
            <div className="mt-0.5 text-[13px] text-white/55">
              Generated briefing decks use this vendor context.
            </div>
          </div>
          <select
            value={selectedVendorId}
            onChange={(event) => setSelectedVendorId(event.target.value)}
            data-testid="select-briefing-deck-vendor"
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

      {/* Headline numbers */}
      <section className="mb-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] md:grid-cols-5">
        {(["Strong", "Adequate", "Weak", "Missing", "Unsupported"] as const).map((band) => (
          <div key={band} className="bg-[#0a0d14] p-6">
            <NumberMark
              value={String(exposureCounts[band])}
              label={band}
              sub={
                band === "Strong"
                  ? "Submission-ready"
                  : band === "Adequate"
                  ? "Holding"
                  : band === "Weak"
                  ? "Needs proof"
                  : band === "Missing"
                  ? "Gap to close"
                  : "Cannot defend"
              }
            />
            <div className="mt-4">
              <ReadinessBar band={band} size="sm" />
            </div>
          </div>
        ))}
      </section>

      {/* Active analyst moments — split: list + detail */}
      <section className="mb-14">
        <SectionTitle
          eyebrow="Active analyst moments"
          title="Two live assessment views."
          description="Select a moment to see readiness, RFI state, briefing prep, and the evidence gaps that matter."
        />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* List */}
          <Pane className="overflow-hidden p-0">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <Eyebrow>Assessment models</Eyebrow>
            </div>
            <ul>
              {liveMoments.map((m) => {
                const active = m.id === selectedId;
                return (
                  <li
                    key={m.id}
                    className={`group flex items-stretch border-b border-white/[0.04] last:border-0 ${
                      active ? "bg-[#a88945]/[0.05]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      data-testid={`moment-${m.id}`}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4 text-left transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                              active ? "text-[#d5b46b]" : "text-white/40"
                            }`}
                          >
                            {m.model}
                          </span>
                          <span className="text-white/15">·</span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                            Due {m.due}
                          </span>
                        </div>
                        <div
                          className={`mt-1 truncate text-[14px] font-medium ${
                            active ? "text-[#f4eed8]" : "text-white/85"
                          }`}
                        >
                          {m.topic}
                        </div>
                        <div className="mt-2">
                          <ReadinessBar band={m.readiness} size="sm" />
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${
                          active ? "text-[#d5b46b]" : "text-white/25"
                        }`}
                      />
                    </button>
                    <div className="flex items-center pr-4">
                      <button
                        type="button"
                        onClick={() => handleGenerateBriefingDeck(m)}
                        disabled={generatingDeckId === m.id}
                        data-testid={`button-generate-briefing-deck-${m.id}`}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#a88945]/35 bg-[#a88945]/[0.07] px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f0dca8] transition hover:border-[#d5b46b]/55 hover:bg-[#a88945]/[0.14] disabled:cursor-wait disabled:opacity-60"
                        aria-label={`Generate ${selectedVendor.label} briefing deck for ${m.model}`}
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        {generatingDeckId === m.id ? "Generating" : "PPT"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Pane>

          {/* Detail */}
          <Pane glow="gold" className="p-7">
            <MomentDetail moment={selected} gaps={momentGaps} />
          </Pane>
        </div>
      </section>

      {/* Upload analyst moment material */}
      <section className="mb-14" id="upload-material">
        <UploadPanel<SucceedMaterialType>
          accent="gold"
          eyebrow="Mode I · Succeed"
          title="Upload analyst moment material."
          subtitle="RFIs, invitations, correspondence, briefing decks, outcomes, and vendor-specific write-ups. Every upload is analysed and fed into the Succeed decision model — used for this customer's readiness, and for AnalystGenius model learning only where permitted and validated."
          types={SUCCEED_MATERIAL_TYPES}
          onSimulatedUpload={handleSimulatedUpload}
          permissionNote="Uploaded third-party analyst material is used for your readiness. Cross-client learning is gated on AnalystGenius researcher validation — we never republish other firms' IP."
        />
      </section>

      {/* Uploaded items + decision model */}
      <section className="mb-14">
        <SectionTitle
          eyebrow="Analyst material library"
          title="Everything uploaded, with the signals captured."
          description={`${uploadedItems.length} items analysed across two live assessment views. Each item shows what the model captured and where it is in the workflow.`}
        />
        <UploadedItemsList items={uploadedItems} newIds={newIds} />
      </section>

      <section className="mb-16">
        <DecisionModel<SucceedMaterialType>
          accent="gold"
          eyebrow="Succeed decision model"
          title="From upload to readiness."
          description="Eight stages turn raw material into criteria, gaps, prompts, and learning signals. Outputs feed this customer's readiness directly. Cross-client learning runs only through validated AnalystGenius researcher review."
          stages={SUCCEED_DECISION_STAGES}
          impacts={SUCCEED_MODEL_IMPACTS}
          finalNote="AnalystGenius learning uses validated patterns only. Third-party analyst text, scoring rationale, or methodology IP is never republished across clients."
        />
      </section>

      {/* Evidence gaps */}
      <section className="mb-14">
        <SectionTitle
          eyebrow="Evidence gaps"
          title="Where the proof needs to land."
          description="Every gap has a status: safe to reuse, restricted to certain audiences, or unsupported and must not be claimed."
        />
        <Pane className="overflow-hidden p-0">
          <div className="grid grid-cols-12 gap-4 border-b border-white/[0.06] px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40">
            <div className="col-span-5">Gap</div>
            <div className="col-span-2">Severity</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Rationale</div>
          </div>
          {liveGaps.map((g) => (
            <div
              key={g.id}
              className="grid grid-cols-12 items-center gap-4 border-b border-white/[0.04] px-6 py-4 last:border-0"
              data-testid={`gap-${g.id}`}
            >
              <div className="col-span-5">
                <div className="text-[13.5px] font-medium text-white/90">{g.title}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  {liveMoments.find((m) => m.id === g.momentId)?.model}
                </div>
              </div>
              <div className="col-span-2">
                <span
                  className={`inline-block font-mono text-[11px] uppercase tracking-[0.14em] ${
                    g.severity === "High"
                      ? "text-[#e89797]"
                      : g.severity === "Medium"
                      ? "text-[#e5c989]"
                      : "text-white/55"
                  }`}
                >
                  {g.severity}
                </span>
              </div>
              <div className="col-span-2">
                <StatusChip status={g.status} />
              </div>
              <div className="col-span-3 text-[12.5px] text-white/55">{g.rationale}</div>
            </div>
          ))}
        </Pane>
      </section>

      {/* HFS OneEcosystem guidance demo + RFI/briefing prep */}
      <section className="mb-14 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* HFS demo */}
        <Pane glow="teal" className="p-7">
          <div className="mb-5 flex items-center justify-between">
            <Eyebrow tone="teal">Guidance demo · External signal</Eyebrow>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#63d7de]">
              {HFS_GUIDANCE.framework}
            </span>
          </div>
          <h3 className="text-[22px] font-semibold leading-tight tracking-tight text-[#e7e3d8]">
            Your submission doesn't align with the multi-tier expectation.
          </h3>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/55">
            {HFS_GUIDANCE.trigger}
          </p>

          <HairLine className="my-5" />

          <div className="mb-2">
            <Eyebrow>Baseline guidance</Eyebrow>
          </div>
          <ul className="space-y-2">
            {HFS_GUIDANCE.baseline.map((line, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3.5 py-2.5"
              >
                <span className="font-mono text-[10px] tracking-[0.22em] text-[#63d7de]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] text-white/80">{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowHfsDetail((v) => !v)}
              data-testid="button-hfs-find-more"
              className="inline-flex items-center gap-2 rounded-full border border-[#00a7b7]/30 bg-[#00a7b7]/[0.06] px-4 py-2 text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#63d7de] transition hover:bg-[#00a7b7]/[0.12]"
            >
              {showHfsDetail ? "Hide details" : "Find out more"}
              <ChevronRight
                className={`h-3.5 w-3.5 transition ${showHfsDetail ? "rotate-90" : ""}`}
              />
            </button>

            {showHfsDetail && (
              <div
                className="mt-4 rounded-xl border border-[#a88945]/25 bg-gradient-to-br from-[#a88945]/[0.06] to-transparent p-5"
                data-testid="hfs-detail"
              >
                <Eyebrow tone="gold" className="mb-2">
                  AnalystGenius deep dive
                </Eyebrow>
                <p className="text-[13.5px] leading-relaxed text-[#f0dca8]">
                  {HFS_GUIDANCE.prompt}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    data-testid="button-open-session"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#a88945] px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#0a0d14] transition hover:bg-[#d5b46b]"
                  >
                    Open readiness session
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/35">
                    Co-author · 45 min
                  </span>
                </div>
              </div>
            )}
          </div>
        </Pane>

        {/* RFI + Briefing prep */}
        <Pane className="p-7">
          <Eyebrow className="mb-4">RFI · Briefing prep</Eyebrow>
          <div className="space-y-5">
            <PrepBlock
              icon={<FileText className="h-4 w-4" />}
              title="RFI workspace"
              count="2 in flight"
              detail="Draft · In review across the two live demo views."
              rows={liveMoments.filter((m) => m.rfiState !== "Not started").map((m) => ({
                label: m.model,
                value: m.rfiState,
              }))}
            />
            <HairLine />
            <PrepBlock
              icon={<Calendar className="h-4 w-4" />}
              title="Briefing prep"
              count="2 active"
              detail="Briefings pending evidence approval are flagged."
              rows={liveMoments.filter((m) => m.briefingState !== "Not required").map((m) => ({
                label: m.model,
                value: m.briefingState,
              }))}
            />
          </div>
        </Pane>
      </section>

      {/* Outcome learning */}
      <section>
        <SectionTitle
          eyebrow="Outcome learning"
          title="What this cycle is teaching us."
          description="Patterns AR has captured across recent submissions. Used to sharpen the next moment — never to predict outcomes."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {LEARNING_NOTES.map((n) => (
            <Pane key={n.id} className="p-6">
              <Eyebrow tone={n.tone}>{n.scope}</Eyebrow>
              <div className="mt-3 text-[14px] leading-snug text-[#e7e3d8]">{n.title}</div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-white/50">{n.detail}</p>
              <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
                <Target className="h-3 w-3" />
                {n.state}
              </div>
            </Pane>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Moment detail
// ---------------------------------------------------------------------------

function MomentDetail({
  moment,
  gaps,
}: {
  moment: AnalystMoment;
  gaps: typeof EVIDENCE_GAPS;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#d5b46b]">
          {moment.model}
        </span>
        <span className="text-white/20">·</span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
          {moment.cycle}
        </span>
      </div>
      <h3 className="text-[26px] font-semibold leading-tight tracking-tight text-[#f4eed8]">
        {moment.topic}
      </h3>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <DetailField label="Status" value={moment.status} />
        <DetailField label="Owner" value={moment.owner} />
        <DetailField label="Due" value={moment.due} mono />
      </div>

      <HairLine className="my-6" />

      <div className="mb-3">
        <Eyebrow>Readiness</Eyebrow>
      </div>
      <ReadinessBar band={moment.readiness} />

      <div className="mt-5">
        <Eyebrow className="mb-2">Exposure</Eyebrow>
        <p className="text-[13.5px] leading-relaxed text-white/65">{moment.exposure}</p>
      </div>

      {moment.topGaps.length > 0 && (
        <div className="mt-6">
          <Eyebrow className="mb-2">Top gaps</Eyebrow>
          <ul className="space-y-2">
            {moment.topGaps.map((g, i) => (
              <li key={i} className="flex gap-3 text-[13px] text-white/70">
                <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-[#a88945]" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      <HairLine className="my-6" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Eyebrow className="mb-2">RFI</Eyebrow>
          <div className="text-[14px] font-medium text-[#e7e3d8]">{moment.rfiState}</div>
        </div>
        <div>
          <Eyebrow className="mb-2">Briefing</Eyebrow>
          <div className="text-[14px] font-medium text-[#e7e3d8]">{moment.briefingState}</div>
        </div>
        <div>
          <Eyebrow className="mb-2">Evidence coverage</Eyebrow>
          <div className="font-mono text-[16px] font-medium tabular-nums text-[#f0dca8]">
            {Math.round(moment.evidenceCoverage * 100)}%
          </div>
        </div>
        <div>
          <Eyebrow className="mb-2">Open gaps</Eyebrow>
          <div className="font-mono text-[16px] font-medium tabular-nums text-[#f0dca8]">
            {gaps.length}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className={`text-[13.5px] text-[#e7e3d8] ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function PrepBlock({
  icon,
  title,
  count,
  detail,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  count: string;
  detail: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-[#d5b46b]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[#e7e3d8]">{title}</div>
          <div className="text-[12px] text-white/45">{detail}</div>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#d5b46b]">
          {count}
        </span>
      </div>
      <ul className="ml-10 space-y-1.5">
        {rows.map((r, i) => (
          <li
            key={i}
            className="flex items-center justify-between border-b border-white/[0.04] pb-1.5 last:border-0"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/45">
              {r.label}
            </span>
            <span className="text-[12.5px] text-white/75">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline learning notes — local to Succeed only, scoped to outcome learning
// ---------------------------------------------------------------------------

const LEARNING_NOTES = [
  {
    id: "ln1",
    scope: "Overall IT Services",
    tone: "gold" as const,
    title: "Repeatable operating model proof is the clearest gap.",
    detail:
      "AG-shaped demo data has delivery scale and client outcome signals, but needs clearer quantified proof that the model repeats across regions and service lines.",
    state: "Validated pattern",
  },
  {
    id: "ln2",
    scope: "Overall AI Readiness",
    tone: "muted" as const,
    title: "AI proof is ahead of governance evidence.",
    detail:
      "The demo view shows credible pilots and momentum, but production adoption, controls evidence, and client value metrics need stronger permissioned examples.",
    state: "Watchlist",
  },
  {
    id: "ln3",
    scope: "Cross-workstream",
    tone: "teal" as const,
    title: "Briefing decks should make missing inputs visible.",
    detail:
      "For demo purposes, unsupported claims stay open as evidence requests instead of being converted into confident but unprovable positioning.",
    state: "Candidate pattern",
  },
];
