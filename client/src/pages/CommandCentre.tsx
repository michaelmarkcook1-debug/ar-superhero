import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppData, formatRelativeAgo } from "@/lib/state";
import {
  Card,
  Chip,
  Eyebrow,
  SectionHeader,
  ReadinessBar,
  StanceChip,
  RatingPill,
  ConfidenceMeter,
  AnalystAvatar,
  KeyValue,
  TierChip,
} from "@/components/atoms";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { LENSES, STANCE_OPTIONS, type Stance } from "@/lib/seed";
import {
  RefreshCw,
  Check,
  X,
  Plus,
  Sparkles,
  FileDown,
  ChevronRight,
  AlertTriangle,
  Info,
} from "lucide-react";

export default function CommandCentre() {
  const data = useAppData();
  const [activeLens, setActiveLens] = useState("strategy");
  const [stanceModal, setStanceModal] = useState<{ analystId: string; current: Stance } | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportContacted, setSupportContacted] = useState(false);

  const briefAge = formatRelativeAgo(data.brief.generatedAt);

  // Backend-summary read (drives the small "systems" indicator). Real backend data —
  // never claims live integrations are connected: mock adapters report mock_mode.
  const dashboard = useQuery<{
    counts: {
      integrationsEnabled: number;
      integrationsTotal: number;
      continuousActive: number;
      syncedItems: number;
      tasksSuggested: number;
      interactionsNeedConfirmation: number;
    };
    lastSyncAt: number;
  }>({
    queryKey: ["/api/dashboard/summary"],
    refetchInterval: 30000,
  });

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 max-w-[1480px] mx-auto space-y-8">
      {/* HEADER */}
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div className="min-w-0">
          <Eyebrow>AR Command Centre</Eyebrow>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight text-foreground leading-tight">
            Good morning, Mireille.
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground max-w-2xl">
            Five active analyst engagements. Two need decisions this week.
            <span className="text-foreground/85"> Forrester Wave</span> is at risk;
            <span className="text-foreground/85"> HFS Horizons</span> is blocked on OneEcosystem narrative.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap" data-testid="backend-status-strip">
          {dashboard.data ? (
            <>
              <Chip tone="muted">
                <span className="dot bg-primary mr-0.5" />
                {dashboard.data.counts.integrationsEnabled}/{dashboard.data.counts.integrationsTotal} integrations · mock adapters
              </Chip>
              <Chip tone="muted">
                {dashboard.data.counts.continuousActive} continuous · {dashboard.data.counts.syncedItems} items synced
              </Chip>
              {dashboard.data.counts.interactionsNeedConfirmation > 0 && (
                <Chip tone="warn">
                  {dashboard.data.counts.interactionsNeedConfirmation} interaction{dashboard.data.counts.interactionsNeedConfirmation === 1 ? "" : "s"} need confirmation
                </Chip>
              )}
            </>
          ) : (
            <Chip tone="muted">
              <span className="dot bg-primary mr-0.5" />
              Loading backend status…
            </Chip>
          )}
          <span className="text-[12px] text-muted-foreground">
            Brief generated {briefAge}
          </span>
        </div>
      </section>

      {/* PRIORITY BRIEF — hero card */}
      <section>
        <Card className="relative overflow-hidden p-0">
          <div className="absolute inset-0 bg-grid opacity-[0.35] pointer-events-none" />
          <div className="relative p-6 lg:p-7">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 mt-0.5">
                  <Logo size={20} className="text-primary" />
                </div>
                <div>
                  <Eyebrow className="text-primary/80 mb-1">AR Priority Brief</Eyebrow>
                  <h2 className="text-[18px] font-semibold tracking-tight">
                    What needs your attention today
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[11.5px] text-muted-foreground">
                    <span>Generation #{data.brief.generation}</span>
                    <span>·</span>
                    <span>Generated {briefAge}</span>
                    <span>·</span>
                    <span>On-demand — refresh to regenerate</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={data.briefRefreshing}
                onClick={data.refreshBrief}
                data-testid="button-refresh-brief"
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 h-9 text-[12.5px] font-medium hover-elevate active-elevate-2",
                  "border-primary/35 bg-primary/10 text-primary"
                )}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", data.briefRefreshing && "animate-spin")}
                />
                {data.briefRefreshing ? "Regenerating…" : "Refresh brief"}
              </button>
            </div>

            <ol className="space-y-3.5">
              {data.brief.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <p className="text-[14px] leading-relaxed text-foreground/95">{h}</p>
                </li>
              ))}
            </ol>

            {data.brief.unconfirmed.length > 0 && (
              <div className="mt-5 rounded-lg border border-accent/25 bg-accent/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">
                    Includes unconfirmed items
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">
                    · Review inside the relevant section below
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {data.brief.unconfirmed.map((u, i) => (
                    <li key={i} className="text-[13px] text-foreground/90 flex gap-2.5">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-accent/80 shrink-0" />
                      <span>{u}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* SUMMARY METRICS STRIP */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Active workstreams" value="5" hint="2 Tier 1 · 2 Tier 2 · 1 submitted" />
        <MetricCard label="Tracked analysts" value="9" hint="across 7 houses · 3 Friendly stance" />
        <MetricCard label="Evidence items" value="34" hint="12 approved · 9 candidates · 4 expiring" />
        <MetricCard label="Open suggestions" value={String(data.tasks.filter(t => data.taskStates[t.id] !== "accepted" && data.taskStates[t.id] !== "rejected").length)} hint="all are suggestions, not auto-assigned" />
      </section>

      {/* TWO-COLUMN MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT — wide column */}
        <div className="xl:col-span-8 space-y-8">
          {/* Active Workstreams */}
          <Section
            id="workstreams"
            eyebrow="Active Workstreams"
            title="Open analyst engagements"
            description="Workstreams with their owner, due date, and current readiness band. Readiness reflects approved evidence coverage — never an outcome prediction."
          >
            <Card noPadding>
              <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[760px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-card-border">
                    <th className="font-medium px-5 py-3 text-[11px] uppercase tracking-[0.12em]">Workstream</th>
                    <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Owner</th>
                    <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Readiness</th>
                    <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Status</th>
                    <th className="font-medium px-3 py-3 text-[11px] uppercase tracking-[0.12em]">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workstreams.map((w, idx) => (
                    <tr
                      key={w.id}
                      className={cn(
                        "border-b last:border-b-0 border-card-border hover:bg-muted/30",
                        idx % 2 === 1 && "bg-card/50"
                      )}
                      data-testid={`row-workstream-${w.id}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-foreground">{w.title}</div>
                        <div className="text-[11.5px] text-muted-foreground mt-0.5">
                          {w.house} · {w.model}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-foreground/90 whitespace-nowrap">{w.owner}</td>
                      <td className="px-3 py-3.5"><ReadinessBar band={w.readiness} /></td>
                      <td className="px-3 py-3.5">
                        <Chip
                          tone={
                            w.status === "On track" ? "primary" :
                            w.status === "At risk" ? "accent" :
                            w.status === "Blocked" ? "danger" : "muted"
                          }
                        >{w.status}</Chip>
                      </td>
                      <td className="px-3 py-3.5 text-foreground/80 whitespace-nowrap tabular">{w.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Card>
          </Section>

          {/* Deadlines & Suggested Tasks */}
          <Section
            id="tasks"
            eyebrow="Deadlines & Suggested Tasks"
            title="Suggestions you can accept, defer, or reject"
            description="Every task shows the basis and source. Tasks are suggestions only — none are auto-assigned. Use Accept to move into your queue."
          >
            <div className="space-y-2.5">
              {data.tasks.map((t) => {
                const state = data.taskStates[t.id] || "suggested";
                return (
                  <Card key={t.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Chip tone="muted">{data.workstreams.find(w => w.id === t.workstreamId)?.house}</Chip>
                          <span className="text-[11.5px] text-muted-foreground tabular">Due {t.due}</span>
                          {state === "accepted" && (
                            <Chip tone="primary"><Check className="h-3 w-3" />Accepted</Chip>
                          )}
                          {state === "rejected" && (
                            <Chip tone="muted">Dismissed</Chip>
                          )}
                        </div>
                        <h3 className={cn(
                          "text-[14px] font-medium leading-snug",
                          state === "rejected" && "text-muted-foreground line-through"
                        )}>{t.title}</h3>
                        <div className="mt-2.5 flex items-start gap-2 text-[12px] text-muted-foreground">
                          <Info className="h-3 w-3 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-foreground/80">Basis:</span> {t.basis}
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
                          <ConfidenceMeter value={t.confidence} />
                          <span>Source · {t.source}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ActionBtn
                          tone="primary"
                          disabled={state === "accepted"}
                          onClick={() => data.setTaskState(t.id, "accepted")}
                          data-testid={`button-accept-task-${t.id}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </ActionBtn>
                        <ActionBtn
                          tone="neutral"
                          disabled={state === "rejected"}
                          onClick={() => data.setTaskState(t.id, "rejected")}
                          data-testid={`button-reject-task-${t.id}`}
                        >
                          <X className="h-3.5 w-3.5" />
                          Dismiss
                        </ActionBtn>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Section>

          {/* Evidence Readiness */}
          <Section
            id="evidence"
            eyebrow="Evidence Readiness"
            title="Candidate and approved evidence by readiness band"
            description="Candidates are AR Superhero suggestions. Approve, approve with restrictions, or reject. Approved evidence is reusable across workstreams."
          >
            <Card noPadding>
              <div className="divide-y divide-card-border">
                {data.evidence.map((e) => {
                  const status = data.evidenceStates[e.id];
                  return (
                    <div key={e.id} className="p-4 lg:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Chip tone="muted">{e.type}</Chip>
                          <Chip tone={status === "Approved" ? "primary" : status === "Approved with restrictions" ? "accent" : status === "Rejected" ? "danger" : "muted"}>
                            {status}
                          </Chip>
                          <span className="text-[11.5px] text-muted-foreground">Reuse · {e.reuse}</span>
                        </div>
                        <h3 className="text-[13.5px] font-medium text-foreground">{e.title}</h3>
                        <div className="mt-1.5 text-[12px] text-muted-foreground flex items-start gap-2">
                          <Info className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{e.provenance}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <ReadinessBar band={e.readiness} />
                        <div className="flex items-center gap-1.5">
                          <ActionBtn
                            tone="primary"
                            disabled={status === "Approved"}
                            onClick={() => data.setEvidenceState(e.id, "Approved")}
                            data-testid={`button-approve-evidence-${e.id}`}
                          >
                            <Check className="h-3.5 w-3.5" />Approve
                          </ActionBtn>
                          <ActionBtn
                            tone="neutral"
                            disabled={status === "Approved with restrictions"}
                            onClick={() => data.setEvidenceState(e.id, "Approved with restrictions")}
                          >Restrict</ActionBtn>
                          <ActionBtn
                            tone="neutral"
                            disabled={status === "Rejected"}
                            onClick={() => data.setEvidenceState(e.id, "Rejected")}
                            data-testid={`button-reject-evidence-${e.id}`}
                          >
                            <X className="h-3.5 w-3.5" />Reject
                          </ActionBtn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Section>

          {/* Analyst Landscape */}
          <Section
            id="analysts"
            eyebrow="Analyst Landscape"
            title="Tracked analysts with firm tier, rating, and relationship stance"
            description="Stance updates are system-suggested only. Click any stance to provide evidence and override."
            action={
              <button className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
                View all 9 <ChevronRight className="h-3 w-3" />
              </button>
            }
          >
            <Card noPadding>
              <div className="divide-y divide-card-border">
                {data.analysts.map((a) => (
                  <div key={a.id} className="px-5 py-3.5 flex items-center gap-4">
                    <AnalystAvatar initials={a.initials} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{a.name}</span>
                        <TierChip tier={a.houseTier} />
                        <RatingPill rating={a.rating} confidence={a.confidence} />
                      </div>
                      <div className="text-[12px] text-muted-foreground truncate">
                        {a.house} · {a.role}
                      </div>
                    </div>
                    <div className="hidden md:block text-[11.5px] text-muted-foreground min-w-[150px]">
                      <div>Last interaction</div>
                      <div className="text-foreground/80">{a.lastInteraction}</div>
                    </div>
                    <StanceChip
                      stance={a.stance}
                      confidence={a.stanceConfidence}
                      onClick={() => setStanceModal({ analystId: a.id, current: a.stance })}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="xl:col-span-4 space-y-8">
          {/* Leader Lens — preview */}
          <Section
            id="leader-lens"
            eyebrow="Leader Lens"
            title="Internal briefing for AR leadership"
            description="P0 lenses: Strategy, Executive, Product, Marketing, Commercial. Country & Industry lenses are P1."
          >
            <Card>
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {LENSES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setActiveLens(l.id)}
                    data-testid={`button-lens-${l.id}`}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[11.5px] hover-elevate",
                      activeLens === l.id
                        ? "border-primary/40 bg-primary/12 text-primary"
                        : "border-border bg-secondary text-muted-foreground"
                    )}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
              {(() => {
                const l = LENSES.find((x) => x.id === activeLens)!;
                return (
                  <div>
                    <h3 className="text-[14.5px] font-semibold text-foreground mb-1.5">
                      {l.name} lens
                    </h3>
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                      {l.summary}
                    </p>
                    <ul className="mt-3.5 space-y-2">
                      {l.points.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px]">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-foreground/60 shrink-0" />
                          <span className="text-foreground/90">{p}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 pt-4 border-t border-card-border">
                      <Eyebrow className="mb-2">Export internal briefing</Eyebrow>
                      <div className="grid grid-cols-2 gap-1.5">
                        {["PDF", "PPTX", "DOCX", "Markdown"].map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => data.logExport(l.name, fmt)}
                            data-testid={`button-export-${l.id}-${fmt.toLowerCase()}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1.5 text-[12px] hover-elevate"
                          >
                            <FileDown className="h-3 w-3" />
                            {fmt}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Includes all analysts in workstream, grouped by rating.</span>
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                        <input type="checkbox" className="accent-primary" />
                        Include relationship stance labels in export
                      </label>
                      {data.exportLog.filter((x) => x.lens === l.name).length > 0 && (
                        <div className="mt-3 text-[11.5px] text-primary">
                          Exported {data.exportLog.filter((x) => x.lens === l.name).length}× this session
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </Card>
          </Section>

          {/* Recent Intelligence Signals */}
          <Section
            eyebrow="Recent Intelligence Signals"
            title="Live feed across public + AR platforms"
            description="Items marked Needs confirmation are candidate auto-imports."
          >
            <Card noPadding>
              <ul className="divide-y divide-card-border">
                {data.signals.map((s) => (
                  <li key={s.id} className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-muted-foreground">{s.when}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{s.source}</span>
                      {s.needsConfirmation && (
                        <Chip tone="accent">Needs confirmation</Chip>
                      )}
                    </div>
                    <div className="text-[13px] font-medium text-foreground leading-snug">{s.title}</div>
                    <div className="text-[12px] text-muted-foreground mt-1">{s.summary}</div>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>

          {/* AnalystGenius Support Prompt — HFS example */}
          <Section
            eyebrow="AnalystGenius support"
            title="HFS Horizons readiness · guidance available"
            description=""
          >
            <Card className="border-primary/20 bg-primary/[0.04]">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 border border-primary/25 p-1.5 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-foreground/95 leading-relaxed">
                    Your draft RFI submission does not yet align with HFS's OneEcosystem framework.
                    Consider broadening scope across your partner network and internal business units —
                    multi-tier ecosystem narratives tend to improve service-delivery effectiveness and
                    speed to market in this assessment.
                  </p>

                  {!supportOpen ? (
                    <button
                      onClick={() => setSupportOpen(true)}
                      data-testid="button-support-find-out-more"
                      className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:text-primary/85"
                    >
                      Find out more
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <div className="mt-3 rounded-md border border-primary/25 bg-card/60 p-3">
                      <p className="text-[12.5px] text-foreground/95 leading-relaxed">
                        Contact AnalystGenius for a deep dive on succeeding in HFS Horizons assessments.
                        Our head researcher can review your OneEcosystem narrative and surface 2-3
                        candidate evidence items from comparable engagements.
                      </p>
                      {!supportContacted ? (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => setSupportContacted(true)}
                            data-testid="button-support-request-review"
                            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1.5 text-[12px] font-medium text-primary hover-elevate"
                          >
                            Request review
                          </button>
                          <button
                            onClick={() => setSupportOpen(false)}
                            className="text-[12px] text-muted-foreground hover:text-foreground"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-primary">
                          <Check className="h-3.5 w-3.5" />
                          Review requested — AnalystGenius will respond within 2 business days
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Section>

          {/* Learning Queue snapshot */}
          <Section
            eyebrow="Learning & Validation Queue"
            title="Ecosystem learning candidates"
            description="Conservative updates only. Anonymised. Cross-checked by AnalystGenius before inclusion."
          >
            <Card noPadding>
              <ul className="divide-y divide-card-border">
                {data.learning.map((l) => (
                  <li key={l.id} className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Chip tone={
                        l.state === "Validated pattern" ? "primary" :
                        l.state === "Candidate pattern" ? "accent" :
                        l.state === "Watchlist" ? "muted" : "neutral"
                      }>{l.state}</Chip>
                      <span className="text-[11px] text-muted-foreground">{l.scope}</span>
                    </div>
                    <div className="text-[12.5px] text-foreground/95 leading-snug">{l.signal}</div>
                    <div className="text-[11px] text-muted-foreground mt-1.5">{l.reviewer}</div>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>
        </div>
      </div>

      {/* STANCE MODAL */}
      {stanceModal && (
        <StanceModal
          analystId={stanceModal.analystId}
          current={stanceModal.current}
          onClose={() => setStanceModal(null)}
          onSubmit={(s, note) => {
            data.updateStance(stanceModal.analystId, s, note);
            setStanceModal(null);
          }}
        />
      )}
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  action,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} actions={action} />
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-[28px] font-semibold tracking-tight tabular text-foreground leading-none">
        {value}
      </div>
      <div className="mt-2 text-[11.5px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function ActionBtn({
  children,
  tone = "neutral",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "neutral" }) {
  const tones = {
    primary: "border-primary/35 bg-primary/10 text-primary hover-elevate disabled:opacity-50",
    neutral: "border-border bg-secondary text-foreground hover-elevate disabled:opacity-50",
  } as const;
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 h-8 text-[12px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </button>
  );
}

function StanceModal({
  analystId,
  current,
  onClose,
  onSubmit,
}: {
  analystId: string;
  current: Stance;
  onClose: () => void;
  onSubmit: (s: Stance, note?: string) => void;
}) {
  const data = useAppData();
  const analyst = data.analysts.find((a) => a.id === analystId);
  const [stance, setStance] = useState<Stance>(current);
  const [note, setNote] = useState("");

  if (!analyst) return null;
  const prior = data.stanceNotes[analystId] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <Eyebrow className="mb-1">Update relationship stance</Eyebrow>
            <h3 className="text-[15px] font-semibold tracking-tight">{analyst.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover-elevate" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground mb-2">Select stance</div>
            <div className="flex flex-wrap gap-1.5">
              {STANCE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStance(s)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[12px] hover-elevate",
                    stance === s
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-border bg-secondary text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground block mb-1.5">
              Evidence note (recommended)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="textarea-stance-note"
              rows={3}
              placeholder="Briefly describe what evidence supports this stance change. Examples: quote from a recent inquiry, observed behaviour during a briefing, public commentary."
              className="w-full rounded-md border border-input bg-card/60 px-3 py-2 text-[13px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          {prior.length > 0 && (
            <div className="rounded-md border border-border bg-secondary/50 p-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-2">Recent stance log</div>
              <ul className="space-y-1.5">
                {prior.slice(-3).reverse().map((p, i) => (
                  <li key={i} className="text-[12px] text-foreground/90">
                    <span className="text-foreground">{p.stance}</span>
                    {p.note && <span className="text-muted-foreground"> — {p.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-border flex items-center justify-between">
          <span className="text-[11.5px] text-muted-foreground">
            Marks this analyst as <strong>user-overridden</strong> with full confidence.
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-md border border-border bg-secondary px-3 h-9 text-[12.5px] hover-elevate">
              Cancel
            </button>
            <button
              onClick={() => onSubmit(stance, note || undefined)}
              data-testid="button-submit-stance"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/40 bg-primary text-primary-foreground px-3 h-9 text-[12.5px] font-semibold hover-elevate"
            >
              <Plus className="h-3.5 w-3.5" /> Save evidence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
