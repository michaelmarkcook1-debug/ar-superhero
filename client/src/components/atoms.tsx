// Small shared atoms: badges, chips, rating pills, confidence bars
import { cn } from "@/lib/utils";
import type { ReadinessBand, Stance, Rating, Tier } from "@/lib/seed";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "accent" | "danger" | "muted" | "warn";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-secondary text-secondary-foreground border-border",
    primary: "bg-primary/10 text-primary border-primary/25",
    accent: "bg-accent/15 text-accent border-accent/30",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
    muted: "bg-muted text-muted-foreground border-border",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function TierChip({ tier }: { tier: Tier }) {
  const tone =
    tier === "Tier 1" ? "primary" : tier === "Tier 2" ? "neutral" : "muted";
  return <Chip tone={tone as any}>{tier}</Chip>;
}

export function RatingPill({
  rating,
  confidence,
}: {
  rating: Rating;
  confidence: number;
}) {
  // Single muted pill — rating left, confidence dot right.
  // Color reserved for primary/accent moments per design system.
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-2 py-0.5 text-[11px] font-semibold tabular">
      <span className="text-foreground">{rating}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground font-normal">
        {(confidence * 100).toFixed(0)}%
      </span>
    </span>
  );
}

export function StanceChip({
  stance,
  confidence,
  onClick,
}: {
  stance: Stance;
  confidence?: number;
  onClick?: () => void;
}) {
  const tones: Record<Stance, string> = {
    Friendly: "text-primary border-primary/30 bg-primary/8",
    Neutral: "text-foreground border-border bg-secondary",
    Inattentive: "text-muted-foreground border-border bg-muted",
    Irrelevant: "text-muted-foreground border-border bg-muted",
    Combative: "text-destructive border-destructive/30 bg-destructive/8",
    Unknown: "text-muted-foreground border-dashed border-border bg-transparent",
  };
  const base = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        tones[stance]
      )}
    >
      {stance}
      {confidence !== undefined && (
        <span className="text-[10px] font-normal opacity-70 tabular">
          · {(confidence * 100).toFixed(0)}%
        </span>
      )}
    </span>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="hover-elevate rounded-md"
        data-testid={`button-stance-${stance.toLowerCase()}`}
      >
        {base}
      </button>
    );
  }
  return base;
}

export function ReadinessBar({ band }: { band: ReadinessBand }) {
  const fill: Record<ReadinessBand, number> = {
    Strong: 5,
    Adequate: 4,
    Weak: 3,
    Missing: 2,
    Unsupported: 1,
  };
  const tone: Record<ReadinessBand, string> = {
    Strong: "bg-primary",
    Adequate: "bg-primary/60",
    Weak: "bg-accent",
    Missing: "bg-destructive/70",
    Unsupported: "bg-destructive",
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-[3px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-[6px] rounded-[2px]",
              i <= fill[band] ? tone[band] : "bg-border/60"
            )}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">{band}</span>
    </div>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1 w-20 overflow-hidden rounded-full bg-border/60">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-[10.5px] text-muted-foreground tabular">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export function AnalystAvatar({ initials, size = 28 }: { initials: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function SectionHeader({
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
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>}
        <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-[13px] text-muted-foreground mt-1 max-w-xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
  noPadding,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-card-border bg-card",
        noPadding ? "" : "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function KeyValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={cn("text-sm text-foreground", mono && "font-mono tabular")}>
        {value}
      </div>
    </div>
  );
}
