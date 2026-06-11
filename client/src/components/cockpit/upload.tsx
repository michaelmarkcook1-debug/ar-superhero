import { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Pane, Eyebrow, HairLine, StatusDot } from "./atoms";
import type { DecisionStage } from "@/lib/cockpit";
import { UPLOAD_BACKEND_NOTE } from "@/lib/cockpit";

// ===========================================================================
// UploadPanel — drag-and-drop demo with type selector. No real parsing.
// Reused across Succeed / Direct / Enable. Tailored via accent + copy props.
// ===========================================================================

export type MaterialTypeOption<T extends string = string> = {
  id: T;
  label: string;
  hint: string;
};

export type UploadPanelProps<T extends string = string> = {
  accent?: "gold" | "teal";
  title: string;
  subtitle: string;
  types: MaterialTypeOption<T>[];
  // Optional: extra eyebrow note shown above the title (e.g. "Mode I · Succeed").
  eyebrow?: string;
  // Called when the user "completes" a demo upload. The receiver can prepend
  // a fake item to its in-memory state to demonstrate the workflow.
  onSimulatedUpload?: (info: {
    filename: string;
    type: T;
    size: string;
  }) => void;
  // Footer microcopy explaining permitted use of uploaded material.
  permissionNote: string;
};

// Demo filenames chosen to feel real but never collide with shipped data.
const DEMO_FILENAMES = [
  "Analyst_Update_May16.pdf",
  "Briefing_Draft_v4.docx",
  "Reference_Pack_Q2.xlsx",
  "Vendor_Commentary_excerpt.pdf",
  "Outcome_Summary_2026.pptx",
  "Correspondence_Thread.eml",
];

export function UploadPanel<T extends string>({
  accent = "gold",
  title,
  subtitle,
  types,
  eyebrow,
  onSimulatedUpload,
  permissionNote,
}: UploadPanelProps<T>) {
  const [selectedType, setSelectedType] = useState<T>(types[0].id);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "analysing" | "done">("idle");
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const accentHex = accent === "gold" ? "#a88945" : "#00a7b7";
  const accentLight = accent === "gold" ? "#d5b46b" : "#63d7de";
  const accentSoft =
    accent === "gold"
      ? "rgba(168,137,69,0.10)"
      : "rgba(0,167,183,0.10)";

  function runSimulatedUpload(filename: string) {
    setCurrentFilename(filename);
    setPhase("uploading");
    setProgress(0);

    const sizeKB = 80 + Math.floor(Math.random() * 4000);
    const size = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    let p = 0;
    const tick = () => {
      p = Math.min(100, p + 12 + Math.random() * 14);
      setProgress(p);
      if (p < 100) {
        setTimeout(tick, 110);
      } else {
        setPhase("analysing");
        setTimeout(() => {
          setPhase("done");
          onSimulatedUpload?.({ filename, type: selectedType, size });
        }, 900);
      }
    };
    setTimeout(tick, 120);
  }

  function reset() {
    setPhase("idle");
    setProgress(0);
    setCurrentFilename(null);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    runSimulatedUpload(files[0].name);
  }

  function handleSimulateClick() {
    const filename = DEMO_FILENAMES[Math.floor(Math.random() * DEMO_FILENAMES.length)];
    runSimulatedUpload(filename);
  }

  return (
    <Pane glow={accent} className="p-7 lg:p-8" data-testid="upload-panel">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <Eyebrow tone={accent} className="mb-2.5">
              {eyebrow}
            </Eyebrow>
          )}
          <h2 className="text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#f4eed8] md:text-[28px]">
            {title}
          </h2>
          <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-white/55">
            {subtitle}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 md:inline-flex">
          <ShieldCheck className="h-3 w-3" />
          Source-traced
        </div>
      </div>

      <HairLine className="my-6" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Type selector */}
        <div>
          <Eyebrow className="mb-3">Material type</Eyebrow>
          <ul className="grid grid-cols-1 gap-1.5" data-testid="material-type-list">
            {types.map((t) => {
              const active = t.id === selectedType;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedType(t.id)}
                    data-testid={`material-type-${t.id}`}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition",
                      active
                        ? "border-white/[0.12] bg-white/[0.04]"
                        : "border-white/[0.04] bg-white/[0.01] hover:border-white/[0.10] hover:bg-white/[0.025]"
                    )}
                    style={
                      active
                        ? {
                            borderColor: `${accentHex}55`,
                            background: accentSoft,
                          }
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                        active ? "" : "bg-white/15"
                      )}
                      style={active ? { background: accentLight } : undefined}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[13px] font-medium",
                          active ? "text-[#f4eed8]" : "text-white/80"
                        )}
                      >
                        {t.label}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-white/45">
                        {t.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Drop zone / progress */}
        <div className="flex flex-col">
          <Eyebrow className="mb-3">Drop or simulate</Eyebrow>
          <div
            data-testid="upload-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex min-h-[200px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition",
              dragOver
                ? "border-white/30 bg-white/[0.04]"
                : "border-white/[0.10] bg-white/[0.012] hover:border-white/[0.18] hover:bg-white/[0.025]"
            )}
            style={
              dragOver
                ? { borderColor: accentHex, background: accentSoft }
                : undefined
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              data-testid="input-file"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {phase === "idle" && (
              <div className="flex flex-col items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full border"
                  style={{
                    borderColor: `${accentHex}55`,
                    background: accentSoft,
                  }}
                >
                  <UploadCloud className="h-5 w-5" style={{ color: accentLight }} />
                </span>
                <div>
                  <div className="text-[14px] font-medium text-[#f4eed8]">
                    Drop a file, or click to browse.
                  </div>
                  <div className="mt-1 text-[11.5px] text-white/45">
                    PDF · DOCX · PPTX · XLSX · EML · PNG · JPG — up to 50 MB.
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="button-simulate-upload"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSimulateClick();
                  }}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition"
                  style={{
                    borderColor: `${accentHex}55`,
                    color: accentLight,
                    background: "transparent",
                  }}
                >
                  Simulate upload
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {(phase === "uploading" || phase === "analysing") && (
              <div className="flex w-full flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: accentLight }} />
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
                    <span className="truncate pr-3 text-white/75">
                      {currentFilename}
                    </span>
                    <span>
                      {phase === "uploading" ? `${Math.round(progress)}%` : "Analysing"}
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${phase === "uploading" ? progress : 100}%`,
                        background: accentHex,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {phase === "done" && (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="h-7 w-7 text-[#a5d8ab]" />
                <div>
                  <div className="text-[14px] font-medium text-[#f4eed8]">
                    Analysed — feeding the decision model.
                  </div>
                  <div className="mt-1 text-[11.5px] text-white/50">
                    {currentFilename} captured. Signals routed.
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="button-upload-another"
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.02] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/65 hover:border-white/20 hover:text-white/85"
                >
                  Upload another
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2 text-[11.5px] leading-snug text-white/45">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
            <span>{permissionNote}</span>
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
            {UPLOAD_BACKEND_NOTE}
          </div>
        </div>
      </div>
    </Pane>
  );
}

// ===========================================================================
// UploadedItemsList — shared list view for analysed uploads
// ===========================================================================

export type GenericUploadedItem = {
  id: string;
  filename: string;
  typeLabel: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  state: string;
  badge?: string; // small contextual badge (e.g. moment, lens, routedTo)
  summary: string;
  signals: string[];
};

const STATE_TONES: Record<string, string> = {
  Analysed: "border-[#a5d8ab]/25 bg-[#a5d8ab]/[0.05] text-[#a5d8ab]",
  "Needs review": "border-[#e89797]/25 bg-[#e89797]/[0.05] text-[#e89797]",
  "Feeding readiness": "border-[#63d7de]/25 bg-[#63d7de]/[0.05] text-[#63d7de]",
  "Outcome captured": "border-[#d5b46b]/25 bg-[#d5b46b]/[0.05] text-[#d5b46b]",
  "Pending AG validation": "border-[#d5b46b]/30 bg-[#d5b46b]/[0.06] text-[#e5c989]",
  "Routed to lens": "border-[#63d7de]/25 bg-[#63d7de]/[0.05] text-[#63d7de]",
  "Briefing-ready": "border-[#a5d8ab]/25 bg-[#a5d8ab]/[0.05] text-[#a5d8ab]",
  "Cleared for sell": "border-[#a5d8ab]/25 bg-[#a5d8ab]/[0.05] text-[#a5d8ab]",
  Restricted: "border-[#e5c989]/25 bg-[#e5c989]/[0.05] text-[#e5c989]",
  "Claims flagged": "border-[#e89797]/25 bg-[#e89797]/[0.05] text-[#e89797]",
  "Presence gap mapped": "border-[#63d7de]/25 bg-[#63d7de]/[0.05] text-[#63d7de]",
};

export function UploadedItemsList({
  items,
  newIds = [],
}: {
  items: GenericUploadedItem[];
  newIds?: string[];
}) {
  return (
    <Pane className="overflow-hidden p-0" data-testid="uploaded-items-list">
      <div className="grid grid-cols-12 gap-4 border-b border-white/[0.06] px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40">
        <div className="col-span-5">File · type</div>
        <div className="col-span-3">Captured signals</div>
        <div className="col-span-2">Uploaded</div>
        <div className="col-span-2 text-right">State</div>
      </div>
      <ul>
        {items.map((it) => {
          const isNew = newIds.includes(it.id);
          return (
            <li
              key={it.id}
              data-testid={`uploaded-item-${it.id}`}
              className={cn(
                "grid grid-cols-12 items-start gap-4 border-b border-white/[0.04] px-6 py-5 last:border-0 transition",
                isNew && "bg-[#a88945]/[0.04]"
              )}
            >
              <div className="col-span-5 flex items-start gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] text-white/55">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-medium text-[#e7e3d8]">
                      {it.filename}
                    </span>
                    {isNew && (
                      <span className="rounded-full border border-[#d5b46b]/40 bg-[#d5b46b]/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#d5b46b]">
                        New
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                    <span>{it.typeLabel}</span>
                    <span className="text-white/15">·</span>
                    <span>{it.size}</span>
                    {it.badge && (
                      <>
                        <span className="text-white/15">·</span>
                        <span className="text-[#d5b46b]">{it.badge}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">
                    {it.summary}
                  </p>
                </div>
              </div>
              <div className="col-span-3">
                <ul className="space-y-1">
                  {it.signals.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11.5px] text-white/65">
                      <StatusDot status="live" />
                      <span className="leading-snug">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2 text-[12px] text-white/55">
                <div>{it.uploadedBy}</div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/35">
                  {it.uploadedAt}
                </div>
              </div>
              <div className="col-span-2 flex justify-end">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.14em]",
                    STATE_TONES[it.state] || "border-white/[0.12] bg-white/[0.02] text-white/55"
                  )}
                >
                  {it.state}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Pane>
  );
}

// ===========================================================================
// DecisionModel — visualises stages + observed model impacts
// ===========================================================================

export function DecisionModel<F extends string>({
  stages,
  impacts,
  accent = "gold",
  title,
  eyebrow,
  description,
  finalNote,
}: {
  stages: DecisionStage<F>[];
  impacts: { id: string; trigger: string; observed: string; scope: string }[];
  accent?: "gold" | "teal";
  title: string;
  eyebrow: string;
  description: string;
  finalNote: string;
}) {
  const accentLight = accent === "gold" ? "#d5b46b" : "#63d7de";

  return (
    <div>
      <div className="mb-7">
        <Eyebrow tone={accent} className="mb-2.5">
          {eyebrow}
        </Eyebrow>
        <h2 className="text-[26px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#e7e3d8] md:text-[30px]">
          {title}
        </h2>
        <p className="mt-2.5 max-w-3xl text-[14px] leading-relaxed text-white/55">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stages.map((s, i) => {
          const toneText =
            s.tone === "gold"
              ? "text-[#d5b46b]"
              : s.tone === "teal"
              ? "text-[#63d7de]"
              : "text-white/45";
          const toneRing =
            s.tone === "gold"
              ? "border-[#a88945]/30"
              : s.tone === "teal"
              ? "border-[#00a7b7]/30"
              : "border-white/[0.10]";
          return (
            <Pane
              key={s.id}
              className="relative p-5"
              data-testid={`decision-stage-${s.id}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] tracking-[0.14em]",
                    toneRing,
                    toneText
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cn("font-mono text-[10px] uppercase tracking-[0.18em]", toneText)}>
                  Stage
                </span>
              </div>
              <div className="mt-3 text-[14px] font-semibold leading-snug tracking-tight text-[#f4eed8]">
                {s.label}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-white/55">{s.short}</p>

              <HairLine className="my-4" />

              <div className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/35">
                Fed by
              </div>
              <div className="flex flex-wrap gap-1">
                {s.feeds.slice(0, 4).map((f) => (
                  <span
                    key={String(f)}
                    className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/55"
                  >
                    {String(f)}
                  </span>
                ))}
              </div>

              <div className="mt-3 text-[11.5px] leading-snug text-white/65">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/35">
                  Output
                </span>
                <div className="mt-1">{s.output}</div>
              </div>
            </Pane>
          );
        })}
      </div>

      {/* Observed impacts */}
      <div className="mt-10">
        <Eyebrow tone={accent} className="mb-3">
          Observed model impacts
        </Eyebrow>
        <h3 className="text-[20px] font-semibold tracking-tight text-[#e7e3d8]">
          What recent uploads have changed.
        </h3>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-white/55">
          Captured, not predicted. Each line is an observed state change after a specific
          upload was analysed.
        </p>

        <Pane className="mt-5 overflow-hidden p-0">
          {impacts.map((m, i) => (
            <div
              key={m.id}
              className={cn(
                "grid grid-cols-12 items-start gap-4 px-6 py-5",
                i !== impacts.length - 1 && "border-b border-white/[0.04]"
              )}
              data-testid={`model-impact-${m.id}`}
            >
              <div className="col-span-1">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px]"
                  style={{ borderColor: `${accentLight}55`, color: accentLight }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="col-span-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Trigger
                </div>
                <div className="mt-1 text-[13px] text-white/80">{m.trigger}</div>
              </div>
              <div className="col-span-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Observed
                </div>
                <div className="mt-1 text-[13px] leading-relaxed text-[#e7e3d8]">
                  {m.observed}
                </div>
              </div>
              <div className="col-span-2 flex justify-end">
                <span
                  className="rounded-full border px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em]"
                  style={{
                    borderColor: `${accentLight}33`,
                    color: accentLight,
                    background: `${accentLight}0d`,
                  }}
                >
                  {m.scope}
                </span>
              </div>
            </div>
          ))}
        </Pane>

        <div className="mt-4 max-w-3xl text-[12px] leading-relaxed text-white/45">
          {finalNote}
        </div>
      </div>
    </div>
  );
}
