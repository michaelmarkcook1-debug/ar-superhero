import { useAppData } from "@/lib/state";
import { Card, Chip, Eyebrow } from "@/components/atoms";

const STATES = [
  "Raw signal",
  "Candidate pattern",
  "Watchlist",
  "Validated pattern",
  "Deprecated pattern",
  "Rejected signal",
] as const;

const STATE_DESC: Record<string, string> = {
  "Raw signal": "Anonymised observation. No action taken.",
  "Candidate pattern": "Observed in multiple sources. AnalystGenius head researcher reviewing.",
  "Watchlist": "Cross-checked across vendors. Monitoring before validation.",
  "Validated pattern": "Approved for inclusion in shared model guidance.",
  "Deprecated pattern": "Previously validated, no longer holds.",
  "Rejected signal": "Reviewed and dismissed — kept for audit.",
};

export default function Learning() {
  const data = useAppData();
  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 max-w-[1280px] mx-auto space-y-7">
      <div>
        <Eyebrow>Learning & Validation Queue</Eyebrow>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight">
          Ecosystem learning — conservative by design
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground max-w-2xl leading-relaxed">
          Candidate signals are anonymised automatically and only when your permissions allow.
          No automatic shared model updates. Conservative changes are cross-checked by an
          AnalystGenius head researcher before inclusion.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {STATES.map((s) => {
          const count = data.learning.filter((l) => l.state === s).length;
          return (
            <Card key={s} className="p-3">
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">{s}</div>
              <div className="mt-1.5 text-[22px] font-semibold tabular text-foreground leading-none">
                {count}
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                {STATE_DESC[s]}
              </div>
            </Card>
          );
        })}
      </div>

      <section className="space-y-2.5">
        <Eyebrow>Queue</Eyebrow>
        {data.learning.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Chip tone={
                    l.state === "Validated pattern" ? "primary" :
                    l.state === "Candidate pattern" ? "accent" :
                    "muted"
                  }>{l.state}</Chip>
                  <span className="text-[11.5px] text-muted-foreground">{l.scope}</span>
                  {l.anonymised && <Chip tone="muted">Anonymised</Chip>}
                </div>
                <p className="text-[13.5px] text-foreground/95 leading-relaxed">{l.signal}</p>
                <div className="mt-2 text-[11.5px] text-muted-foreground">{l.reviewer}</div>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
