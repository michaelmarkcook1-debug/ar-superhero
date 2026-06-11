import { cn } from "@/lib/utils";

// ============================================================================
// Premium cockpit atoms — refined surfaces, micro-typography, signal chips.
// All colours are explicit hex to keep the cinematic palette consistent across
// pages, independent of the Tailwind theme tokens used in lower-priority UI.
// ============================================================================

export const COCKPIT_INK = "#e7e3d8";
export const COCKPIT_MUTED = "#8e887a";
export const COCKPIT_FAINT = "#54514a";
export const COCKPIT_GOLD = "#a88945";
export const COCKPIT_GOLD_LIGHT = "#d5b46b";
export const COCKPIT_GOLD_PALE = "#f0dca8";
export const COCKPIT_TEAL = "#00a7b7";
export const COCKPIT_TEAL_LIGHT = "#63d7de";

// Layered card with subtle inner border, faint gradient, and ambient glow option
export function Pane({
  children,
  className,
  glow = "none",
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "none" | "gold" | "teal";
  as?: "div" | "section" | "article";
}) {
  const Tag = as as any;
  return (
    <Tag
      className={cn(
        "relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.008] backdrop-blur-sm",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_24px_60px_-32px_rgba(0,0,0,0.7)]",
        glow === "gold" &&
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(circle_at_15%_-30%,rgba(168,137,69,0.18),transparent_55%)]",
        glow === "teal" &&
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(circle_at_85%_-30%,rgba(0,167,183,0.16),transparent_55%)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function Eyebrow({
  children,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "gold" | "teal";
}) {
  const tones: Record<string, string> = {
    muted: "text-white/40",
    gold: "text-[#d5b46b]",
    teal: "text-[#63d7de]",
  };
  return (
    <div
      className={cn(
        "text-[10.5px] font-medium uppercase tracking-[0.22em]",
        tones[tone],
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-6">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2.5">{eyebrow}</Eyebrow>}
        <h2 className="text-[26px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#e7e3d8] md:text-[30px]">
          {title}
        </h2>
        {description && (
          <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-white/55">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusDot({
  status,
}: {
  status: "safe" | "restricted" | "unsupported" | "live";
}) {
  const tones: Record<string, string> = {
    safe: "bg-[#5fb46c] shadow-[0_0_10px_-2px_rgba(95,180,108,0.7)]",
    restricted: "bg-[#d5b46b] shadow-[0_0_10px_-2px_rgba(213,180,107,0.7)]",
    unsupported: "bg-[#d56a6a] shadow-[0_0_10px_-2px_rgba(213,106,106,0.7)]",
    live: "bg-[#00a7b7] shadow-[0_0_10px_-2px_rgba(0,167,183,0.7)]",
  };
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", tones[status])} />;
}

export function StatusChip({
  status,
  className,
}: {
  status: "safe" | "restricted" | "unsupported";
  className?: string;
}) {
  const labels = {
    safe: "Safe to use",
    restricted: "Restricted",
    unsupported: "Unsupported",
  };
  const tones = {
    safe: "border-[#5fb46c]/30 bg-[#5fb46c]/[0.06] text-[#a5d8ab]",
    restricted: "border-[#d5b46b]/30 bg-[#d5b46b]/[0.06] text-[#e5c989]",
    unsupported: "border-[#d56a6a]/30 bg-[#d56a6a]/[0.06] text-[#e89797]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.14em]",
        tones[status],
        className
      )}
    >
      <StatusDot status={status} />
      {labels[status]}
    </span>
  );
}

export function ReadinessBar({
  band,
  size = "md",
}: {
  band: "Strong" | "Adequate" | "Weak" | "Missing" | "Unsupported";
  size?: "sm" | "md";
}) {
  const fill: Record<string, number> = {
    Strong: 5,
    Adequate: 4,
    Weak: 3,
    Missing: 2,
    Unsupported: 1,
  };
  const tone: Record<string, string> = {
    Strong: "bg-[#5fb46c]",
    Adequate: "bg-[#a88945]",
    Weak: "bg-[#d5b46b]",
    Missing: "bg-[#c97a4a]",
    Unsupported: "bg-[#d56a6a]",
  };
  const labelTone: Record<string, string> = {
    Strong: "text-[#a5d8ab]",
    Adequate: "text-[#e5c989]",
    Weak: "text-[#e5c989]",
    Missing: "text-[#e0a280]",
    Unsupported: "text-[#e89797]",
  };
  const h = size === "sm" ? "h-1.5" : "h-2";
  const w = size === "sm" ? "w-[8px]" : "w-[10px]";
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-[3px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "rounded-[2px] transition",
              h,
              w,
              i <= fill[band] ? tone[band] : "bg-white/8"
            )}
          />
        ))}
      </div>
      <span className={cn("text-[11px] font-medium uppercase tracking-[0.16em]", labelTone[band])}>
        {band}
      </span>
    </div>
  );
}

export function SourceTag({
  source,
  tag,
}: {
  source: string;
  tag?: "demo" | "external signal" | "internal";
}) {
  return (
    <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] text-white/35">
      <span className="font-mono">{source}</span>
      {tag && (
        <>
          <span className="text-white/15">·</span>
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[9.5px] tracking-[0.18em]",
              tag === "demo" && "border-[#d5b46b]/30 text-[#d5b46b]",
              tag === "external signal" && "border-[#63d7de]/30 text-[#63d7de]",
              tag === "internal" && "border-white/12 text-white/40"
            )}
          >
            {tag}
          </span>
        </>
      )}
    </div>
  );
}

export function NumberMark({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-[32px] font-medium leading-none tracking-tight text-[#f0dca8] tabular-nums md:text-[36px]">
        {value}
      </div>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
      {sub && <div className="text-[11.5px] leading-snug text-white/40">{sub}</div>}
    </div>
  );
}

export function HairLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent",
        className
      )}
    />
  );
}

export function Glyph({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-mono text-[11px] tracking-[0.22em] text-[#a88945]",
        className
      )}
    >
      {children}
    </span>
  );
}
