import { useAppData } from "@/lib/state";
import { Card, Chip, Eyebrow, ReadinessBar } from "@/components/atoms";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const REUSE_LEVELS = [
  "Internal only",
  "Analyst briefing approved under NDA",
  "Analyst briefing approved no NDA required",
  "RFI approved",
  "Marketing approved",
  "Restricted",
  "Expired",
];

export default function Evidence() {
  const data = useAppData();
  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 max-w-[1280px] mx-auto space-y-6">
      <div>
        <Eyebrow>Evidence Library</Eyebrow>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight">
          Candidates, approvals, and reuse rights
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground max-w-2xl">
          Approved evidence is reusable across workstreams by default. Approve, restrict, or reject
          candidates here. Reuse rights determine where each item can appear.
        </p>
      </div>

      <Card>
        <Eyebrow className="mb-2">Reuse rights model</Eyebrow>
        <div className="flex flex-wrap gap-1.5">
          {REUSE_LEVELS.map((r) => <Chip key={r} tone="muted">{r}</Chip>)}
        </div>
      </Card>

      <Card noPadding>
        <div className="divide-y divide-card-border">
          {data.evidence.map((e) => {
            const status = data.evidenceStates[e.id];
            return (
              <div key={e.id} className="px-5 py-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                <div className="lg:col-span-6 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Chip tone="muted">{e.type}</Chip>
                    <Chip tone={
                      status === "Approved" ? "primary" :
                      status === "Approved with restrictions" ? "accent" :
                      status === "Rejected" ? "danger" : "muted"
                    }>{status}</Chip>
                  </div>
                  <div className="text-[13.5px] font-medium text-foreground">{e.title}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-1">Source · {e.provenance}</div>
                </div>
                <div className="lg:col-span-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-1">Reuse</div>
                  <div className="text-[12.5px] text-foreground/90">{e.reuse}</div>
                </div>
                <div className="lg:col-span-2"><ReadinessBar band={e.readiness} /></div>
                <div className="lg:col-span-1 flex items-center gap-1.5 justify-end">
                  <button
                    onClick={() => data.setEvidenceState(e.id, "Approved")}
                    disabled={status === "Approved"}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 h-7 text-[11.5px] hover-elevate disabled:opacity-50",
                      "border-primary/35 bg-primary/10 text-primary"
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => data.setEvidenceState(e.id, "Rejected")}
                    disabled={status === "Rejected"}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 h-7 text-[11.5px] hover-elevate disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
