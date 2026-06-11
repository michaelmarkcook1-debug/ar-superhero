import { useState } from "react";
import {
  FileText,
  Presentation,
  FileSpreadsheet,
  FileType2,
  Download,
  ShieldCheck,
  Sparkles,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Pane, Eyebrow, HairLine, SectionTitle } from "./atoms";
import type { DeliverableTemplate, DeliverableFormat } from "@/lib/cockpit";

// ===========================================================================
// DeliverablesPanel — AnalystGenius-controlled output templates
// ===========================================================================

const FORMAT_META: Record<
  DeliverableFormat,
  { label: string; tone: string; ring: string; icon: typeof FileText }
> = {
  DOCX: {
    label: "DOCX",
    tone: "text-[#9bb8e6]",
    ring: "border-[#9bb8e6]/30 bg-[#9bb8e6]/[0.06]",
    icon: FileText,
  },
  PPTX: {
    label: "PPTX",
    tone: "text-[#e0a280]",
    ring: "border-[#e0a280]/30 bg-[#e0a280]/[0.06]",
    icon: Presentation,
  },
  XLSX: {
    label: "XLSX",
    tone: "text-[#a5d8ab]",
    ring: "border-[#a5d8ab]/30 bg-[#a5d8ab]/[0.06]",
    icon: FileSpreadsheet,
  },
  PDF: {
    label: "PDF",
    tone: "text-[#e89797]",
    ring: "border-[#e89797]/30 bg-[#e89797]/[0.06]",
    icon: FileType2,
  },
};

function ApprovalBadge({ approval }: { approval: DeliverableTemplate["approval"] }) {
  const tones: Record<string, string> = {
    "Source-traced": "border-[#a5d8ab]/30 text-[#a5d8ab] bg-[#a5d8ab]/[0.05]",
    "NDA controls": "border-[#e5c989]/30 text-[#e5c989] bg-[#e5c989]/[0.05]",
    "Internal-only": "border-white/[0.12] text-white/55 bg-white/[0.02]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em]",
        tones[approval]
      )}
    >
      <ShieldCheck className="h-2.5 w-2.5" />
      {approval}
    </span>
  );
}

function TemplateStateBadge({ state }: { state: DeliverableTemplate["templateState"] }) {
  const isBeta = state === "Beta template";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em]",
        isBeta
          ? "border-[#63d7de]/30 text-[#63d7de] bg-[#63d7de]/[0.05]"
          : "border-[#d5b46b]/30 text-[#d5b46b] bg-[#d5b46b]/[0.05]"
      )}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {state}
    </span>
  );
}

// One deliverable card — primary format prominent; secondary formats as small chips.
function DeliverableCard({
  template,
  onExport,
  exportedKey,
  accent,
}: {
  template: DeliverableTemplate;
  onExport: (templateId: string, format: DeliverableFormat) => void;
  exportedKey: string | null;
  accent: "gold" | "teal";
}) {
  const Primary = FORMAT_META[template.primaryFormat];
  const secondary = template.formats.filter((f) => f !== template.primaryFormat);
  const accentLight = accent === "gold" ? "#d5b46b" : "#63d7de";

  return (
    <Pane className="flex h-full flex-col p-6" data-testid={`deliverable-${template.id}`}>
      <div className="flex items-start gap-4">
        {/* Primary format tile */}
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border",
            Primary.ring
          )}
        >
          <Primary.icon className={cn("h-6 w-6", Primary.tone)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TemplateStateBadge state={template.templateState} />
            <ApprovalBadge approval={template.approval} />
          </div>
          <h3 className="mt-2.5 text-[16px] font-semibold leading-snug tracking-tight text-[#f4eed8]">
            {template.name}
          </h3>
        </div>
      </div>

      <p className="mt-3.5 text-[12.5px] leading-relaxed text-white/55">
        {template.summary}
      </p>

      <HairLine className="my-5" />

      <div>
        <Eyebrow className="mb-2">Composed from</Eyebrow>
        <div className="flex flex-wrap gap-1">
          {template.composedFrom.map((c) => (
            <span
              key={c}
              className="rounded-full border border-white/[0.08] bg-white/[0.015] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/55"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-5">
        <Eyebrow className="mb-2.5">Export</Eyebrow>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton
            template={template}
            format={template.primaryFormat}
            primary
            onExport={onExport}
            exported={exportedKey === `${template.id}:${template.primaryFormat}`}
            accentLight={accentLight}
          />
          {secondary.map((f) => (
            <ExportButton
              key={f}
              template={template}
              format={f}
              onExport={onExport}
              exported={exportedKey === `${template.id}:${f}`}
              accentLight={accentLight}
            />
          ))}
        </div>
      </div>
    </Pane>
  );
}

function ExportButton({
  template,
  format,
  primary,
  onExport,
  exported,
  accentLight,
}: {
  template: DeliverableTemplate;
  format: DeliverableFormat;
  primary?: boolean;
  onExport: (templateId: string, format: DeliverableFormat) => void;
  exported: boolean;
  accentLight: string;
}) {
  const meta = FORMAT_META[format];
  const Icon = meta.icon;

  if (exported) {
    return (
      <span
        data-testid={`export-${template.id}-${format}-done`}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#a5d8ab]/35 bg-[#a5d8ab]/[0.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#a5d8ab]"
      >
        <Check className="h-3 w-3" />
        Queued · {format}
      </span>
    );
  }

  if (primary) {
    return (
      <button
        type="button"
        onClick={() => onExport(template.id, format)}
        data-testid={`export-${template.id}-${format}`}
        className="group inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0a0d14] transition"
        style={{ background: accentLight }}
      >
        <Download className="h-3 w-3" />
        Export {format}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onExport(template.id, format)}
      data-testid={`export-${template.id}-${format}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition hover:bg-white/[0.04]",
        meta.ring,
        meta.tone
      )}
    >
      <Icon className="h-3 w-3" />
      {format}
    </button>
  );
}

// ===========================================================================
// DeliverablesPanel — used directly in Direct / Enable
// ===========================================================================

export type DeliverablesPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  templates: DeliverableTemplate[];
  accent?: "gold" | "teal";
  guardrailNote: string;
};

export function DeliverablesPanel({
  eyebrow,
  title,
  description,
  templates,
  accent = "gold",
  guardrailNote,
}: DeliverablesPanelProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [exportedKey, setExportedKey] = useState<string | null>(null);

  function handleExport(templateId: string, format: DeliverableFormat) {
    const t = templates.find((x) => x.id === templateId);
    setExportedKey(`${templateId}:${format}`);
    setToast(`Template queued · ${t?.name} (${format})`);
    setTimeout(() => setToast(null), 3000);
    // Reset "exported" mark a bit later so the user can export again.
    setTimeout(() => {
      setExportedKey((current) =>
        current === `${templateId}:${format}` ? null : current
      );
    }, 4500);
  }

  return (
    <div className="relative">
      <SectionTitle
        eyebrow={eyebrow}
        title={title}
        description={description}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <DeliverableCard
            key={t.id}
            template={t}
            onExport={handleExport}
            exportedKey={exportedKey}
            accent={accent}
          />
        ))}
      </div>

      <div className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-white/45">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
        <span>{guardrailNote}</span>
      </div>

      {/* Toast */}
      {toast && (
        <div
          data-testid="deliverable-toast"
          className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/[0.12] bg-[#0a0d14]/95 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#d5b46b] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] backdrop-blur"
        >
          <span className="inline-flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-[#a5d8ab]" />
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
