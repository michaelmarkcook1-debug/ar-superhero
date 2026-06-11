import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, Chip, Eyebrow, SectionHeader } from "@/components/atoms";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ============================================================================
// Integrations admin — wired to the real backend.
// Toggles, mode switches, test, run-sync all call /api/integrations/...
// Connector statuses (Mock mode / Needs auth / Connected / Off / Error) come
// from the backend so the UI never claims a live connection that isn't real.
// ============================================================================

type Capabilities = {
  read_only: boolean;
  manual_import: boolean;
  scheduled_sync: boolean;
  continuous_sync: boolean;
  oauth_required: boolean;
  api_available: boolean | null;
};

type Descriptor = {
  id: string;
  name: string;
  category: string;
  vendor?: string;
  capabilities: Capabilities;
  default_mode: string;
  notes?: string;
};

type IntegrationConfig = {
  id: string;
  connector_id: string;
  display_name: string;
  enabled: boolean;
  mode: string;
  status: string;
  status_detail: string | null;
  last_test_at: number | null;
  last_sync_at: number | null;
  descriptor: Descriptor | null;
  category: string;
  has_credentials: boolean;
};

type SyncRun = {
  id: string;
  integration_config_id: string;
  status: string;
  started_at: number;
  items_imported: number;
};

const CATEGORY_LABEL: Record<string, string> = {
  public_intelligence: "Public intelligence",
  ar_platform: "AR platform",
  document_storage: "Document storage",
  email_calendar: "Email & calendar",
};

const CATEGORY_ORDER = ["public_intelligence", "ar_platform", "document_storage", "email_calendar"];

const MODE_OPTIONS = [
  { value: "read_only", label: "Read-only" },
  { value: "manual_import", label: "Manual import" },
  { value: "scheduled_sync", label: "Scheduled" },
  { value: "continuous_sync", label: "Continuous" },
];

const STATUS_TONE: Record<string, "primary" | "neutral" | "muted" | "warn" | "danger"> = {
  connected: "primary",
  mock_mode: "neutral",
  needs_auth: "warn",
  off: "muted",
  error: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  connected: "Connected",
  mock_mode: "Mock mode",
  needs_auth: "Needs auth",
  off: "Off",
  error: "Error",
};

function formatRelative(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function Integrations() {
  const { toast } = useToast();

  const configsQuery = useQuery<IntegrationConfig[]>({
    queryKey: ["/api/integrations/configs"],
  });

  const runsQuery = useQuery<SyncRun[]>({
    queryKey: ["/api/sync/runs"],
  });

  const dashboardQuery = useQuery<{
    counts: Record<string, number>;
    lastSyncAt: number;
  }>({ queryKey: ["/api/dashboard/summary"] });

  const patchMutation = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<IntegrationConfig> }) => {
      const res = await apiRequest("PATCH", `/api/integrations/configs/${vars.id}`, vars.patch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/integrations/${id}/test`);
      return res.json();
    },
    onSuccess: (data: { status: string; message: string }) => {
      toast({ title: `Test: ${STATUS_LABEL[data.status] ?? data.status}`, description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs"] });
    },
  });

  const runSyncMutation = useMutation({
    mutationFn: async (configId: string) => {
      const res = await apiRequest("POST", `/api/sync/run`, { configId });
      return res.json();
    },
    onSuccess: (data: {
      items: unknown[];
      tasksSuggested: number;
      evidenceSuggested: number;
      interactionsAutoAdded: number;
      message: string;
    }) => {
      toast({
        title: `Sync complete · ${data.items.length} item${data.items.length === 1 ? "" : "s"}`,
        description: `${data.tasksSuggested} task suggestions · ${data.evidenceSuggested} evidence candidates · ${data.interactionsAutoAdded} interaction(s) to confirm.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/synced-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const grouped = useMemo(() => {
    const data = configsQuery.data ?? [];
    const out: Record<string, IntegrationConfig[]> = {};
    for (const c of data) {
      (out[c.category] ||= []).push(c);
    }
    return out;
  }, [configsQuery.data]);

  const runsByConfig = useMemo(() => {
    const map: Record<string, SyncRun> = {};
    for (const r of runsQuery.data ?? []) {
      if (!map[r.integration_config_id] || map[r.integration_config_id].started_at < r.started_at) {
        map[r.integration_config_id] = r;
      }
    }
    return map;
  }, [runsQuery.data]);

  const counts = dashboardQuery.data?.counts;

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 max-w-[1280px] mx-auto space-y-7">
      <div>
        <Eyebrow>Admin · Integrations</Eyebrow>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight text-foreground">
          Continuous sync controls
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground max-w-2xl leading-relaxed">
          All integrations are read-only or import-first and controlled by your AnalystGenius admin.
          Continuous sync is permitted for scoped, approved sources only. Newly synced items
          auto-link to workstreams by default and produce{" "}
          <strong className="text-foreground/90">suggested tasks</strong> and{" "}
          <strong className="text-foreground/90">evidence candidates only</strong> — never auto-changes.
          Live integrations require credentials/OAuth that have not been configured yet, so all
          adapters currently run in <strong className="text-foreground/90">mock mode</strong> for
          demonstration.
        </p>
      </div>

      {/* Backend status panel */}
      <Card>
        <Eyebrow className="mb-2">Backend status</Eyebrow>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatusStat label="Connectors enabled" value={`${counts?.integrationsEnabled ?? "—"} / ${counts?.integrationsTotal ?? "—"}`} />
          <StatusStat label="Continuous sync" value={counts?.continuousActive ?? "—"} />
          <StatusStat label="Synced items" value={counts?.syncedItems ?? "—"} />
          <StatusStat label="Suggested tasks" value={counts?.tasksSuggested ?? "—"} />
          <StatusStat label="Last sync" value={dashboardQuery.data?.lastSyncAt ? formatRelative(dashboardQuery.data.lastSyncAt) : "Never"} />
        </div>
      </Card>

      {configsQuery.isLoading && (
        <Card>
          <div className="text-sm text-muted-foreground">Loading integrations…</div>
        </Card>
      )}

      {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => {
        const items = grouped[cat];
        const enabledCount = items.filter((i) => i.enabled).length;
        return (
          <section key={cat}>
            <SectionHeader
              eyebrow={CATEGORY_LABEL[cat]}
              title={`${enabledCount} of ${items.length} active`}
            />
            <Card noPadding>
              <ul className="divide-y divide-card-border">
                {items.map((i) => {
                  const lastRun = runsByConfig[i.id];
                  return (
                    <li key={i.id} className="px-5 py-4 flex flex-col gap-2.5">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{i.display_name}</span>
                            <Chip tone={STATUS_TONE[i.status] ?? "muted"}>
                              {STATUS_LABEL[i.status] ?? i.status}
                            </Chip>
                            {i.descriptor?.capabilities.oauth_required && (
                              <Chip tone="muted">OAuth required</Chip>
                            )}
                            {i.descriptor?.capabilities.api_available === null && (
                              <Chip tone="muted">API unknown</Chip>
                            )}
                            {i.descriptor?.capabilities.api_available === false && (
                              <Chip tone="muted">Public web only</Chip>
                            )}
                          </div>
                          <div className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                            {i.status_detail ?? i.descriptor?.notes}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground/80 mt-1.5 tabular flex flex-wrap gap-x-4 gap-y-1">
                            <span>Last sync · {formatRelative(i.last_sync_at)}</span>
                            <span>Last test · {formatRelative(i.last_test_at)}</span>
                            {lastRun && (
                              <span>Items last run · {lastRun.items_imported}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={!i.enabled || runSyncMutation.isPending}
                            onClick={() => runSyncMutation.mutate(i.id)}
                            data-testid={`button-sync-${i.id}`}
                            className="text-[11.5px] px-2 py-1 rounded border border-card-border hover:bg-secondary disabled:opacity-40"
                          >
                            Sync now
                          </button>
                          <button
                            type="button"
                            disabled={testMutation.isPending}
                            onClick={() => testMutation.mutate(i.id)}
                            data-testid={`button-test-${i.id}`}
                            className="text-[11.5px] px-2 py-1 rounded border border-card-border hover:bg-secondary disabled:opacity-40"
                          >
                            Test
                          </button>
                          <button
                            role="switch"
                            aria-checked={i.enabled}
                            onClick={() => patchMutation.mutate({ id: i.id, patch: { enabled: !i.enabled } })}
                            data-testid={`switch-integration-${i.id}`}
                            className={cn(
                              "relative h-5 w-9 rounded-full border transition-colors",
                              i.enabled ? "bg-primary/90 border-primary" : "bg-secondary border-border"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-transform",
                                i.enabled ? "translate-x-[18px]" : "translate-x-0.5"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                      {i.enabled && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {MODE_OPTIONS.filter((m) => {
                            const cap = i.descriptor?.capabilities;
                            if (!cap) return true;
                            if (m.value === "scheduled_sync") return cap.scheduled_sync;
                            if (m.value === "continuous_sync") return cap.continuous_sync;
                            if (m.value === "manual_import") return cap.manual_import;
                            if (m.value === "read_only") return cap.read_only;
                            return true;
                          }).map((m) => (
                            <button
                              key={m.value}
                              onClick={() => patchMutation.mutate({ id: i.id, patch: { mode: m.value } })}
                              data-testid={`mode-${i.id}-${m.value}`}
                              className={cn(
                                "text-[11px] px-2 py-0.5 rounded border transition-colors",
                                i.mode === m.value
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-card-border text-muted-foreground hover:bg-secondary"
                              )}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        );
      })}

      <Card>
        <Eyebrow className="mb-2">P0 input formats</Eyebrow>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Pasted analyst email text",
            "PDF",
            "DOCX",
            "PPTX",
            "XLSX",
            "Screenshots / images",
            "Manual notes",
            "Outcome forms",
            "Stance evidence notes",
          ].map((x) => (
            <Chip key={x} tone="muted">
              {x}
            </Chip>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatusStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-[18px] font-semibold tabular">{value}</div>
    </div>
  );
}
