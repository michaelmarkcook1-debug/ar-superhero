// AR Superhero logomark — geometric "A" with crossbar that doubles as a
// horizon line / signal-pulse. Inline SVG, currentColor for theming.
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AR Superhero"
      className={className}
    >
      <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" stroke="currentColor" strokeOpacity="0.25" />
      <path
        d="M9 23 L16 7 L23 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.6 17.2 L20.4 17.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="17.2" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Logo size={28} className="text-primary" />
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight text-foreground">
          AR Superhero
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
          by AnalystGenius
        </div>
      </div>
    </div>
  );
}
