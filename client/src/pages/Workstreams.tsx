import { useAppData } from "@/lib/state";
import { Card, Chip, Eyebrow, ReadinessBar, AnalystAvatar, RatingPill } from "@/components/atoms";

export default function Workstreams() {
  const data = useAppData();
  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 max-w-[1280px] mx-auto space-y-6">
      <div>
        <Eyebrow>Workstreams</Eyebrow>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight">Open analyst engagements</h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground max-w-2xl">
          Six flagship assessment models plus discretionary engagements. Readiness reflects approved
          evidence coverage and never predicts an outcome.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {data.workstreams.map((w) => {
          const analysts = data.analysts.filter((a) => w.analystIds.includes(a.id));
          return (
            <Card key={w.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <Chip tone="muted">{w.house} · {w.model}</Chip>
                  <h3 className="mt-2 text-[15px] font-semibold leading-snug">{w.title}</h3>
                  <div className="mt-1.5 text-[12px] text-muted-foreground">
                    Owner · {w.owner} · Due {w.due}
                  </div>
                </div>
                <Chip tone={
                  w.status === "On track" ? "primary" :
                  w.status === "At risk" ? "accent" :
                  w.status === "Blocked" ? "danger" : "muted"
                }>{w.status}</Chip>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground">Readiness</span>
                  <ReadinessBar band={w.readiness} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground">Progress</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-32 rounded-full bg-border/60 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${w.progress}%` }} />
                    </div>
                    <span className="text-[11.5px] tabular text-muted-foreground">{w.progress}%</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-card-border">
                  <div className="text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground mb-2">Assigned analysts</div>
                  <div className="space-y-1.5">
                    {analysts.map((a) => (
                      <div key={a.id} className="flex items-center gap-2.5">
                        <AnalystAvatar initials={a.initials} size={22} />
                        <span className="text-[12.5px] text-foreground flex-1 truncate">{a.name}</span>
                        <RatingPill rating={a.rating} confidence={a.confidence} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
