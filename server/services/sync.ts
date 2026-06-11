import { storage } from "../storage";
import { getAdapter } from "../connectors/registry";
import {
  classify,
  findAnalystByName,
  shouldAutoAddInteraction,
  suggestEvidence,
  suggestTasks,
  suggestStanceUpdate,
} from "./classify";
import { randomUUID } from "node:crypto";
import type { NormalisedItem } from "../connectors/types";
import type { SyncedItem } from "@shared/schema";

// ============================================================================
// Sync orchestration:
// - Pulls items from an adapter (mock or real)
// - Classifies + auto-links to workstream
// - Persists synced_item
// - Generates suggested tasks, suggested evidence, suggested stance updates
// - Auto-creates "Needs confirmation" interactions at sufficient confidence
//
// Suggestion-only semantics are preserved: nothing is auto-accepted.
// ============================================================================

export interface RunSyncOptions {
  configId: string;
  syncSourceId?: string;
  trigger?: "manual" | "scheduled" | "continuous";
}

export interface RunSyncResult {
  runId: string;
  items: SyncedItem[];
  tasksSuggested: number;
  evidenceSuggested: number;
  interactionsAutoAdded: number;
  stanceSuggestions: number;
  message: string;
}

export async function runSync(opts: RunSyncOptions): Promise<RunSyncResult> {
  const config = storage.getIntegrationConfig(opts.configId);
  if (!config) throw new Error(`Integration config ${opts.configId} not found`);
  if (!config.enabled) throw new Error(`Integration ${config.display_name} is disabled`);

  const adapter = getAdapter(config.connector_id);
  if (!adapter) throw new Error(`No adapter for connector ${config.connector_id}`);

  const trigger = opts.trigger ?? "manual";
  const startedAt = Date.now();
  const run = storage.createSyncRun({
    integration_config_id: opts.configId,
    sync_source_id: opts.syncSourceId ?? null,
    started_at: startedAt,
    status: "running",
    items_seen: 0,
    items_imported: 0,
    trigger,
    message: null,
  });

  const sources = storage.listSyncSources(opts.configId);
  const source = opts.syncSourceId
    ? sources.find((s) => s.id === opts.syncSourceId)
    : sources[0];

  let normalised: NormalisedItem[] = [];
  let syncMsg = "";
  try {
    const result = await adapter.sync({
      configId: config.id,
      syncSourceId: source?.id,
      trigger,
      credentials: safeJson<Record<string, unknown>>(config.credentials, {}),
      sourceConfig: source ? safeJson<Record<string, unknown>>(source.config, {}) : {},
    });
    normalised = result.items;
    syncMsg = result.message ?? "";
  } catch (err) {
    storage.finishSyncRun(run.id, {
      status: "error",
      finished_at: Date.now(),
      message: (err as Error).message,
    });
    storage.updateIntegrationConfig(config.id, {
      status: "error",
      status_detail: (err as Error).message,
      updated_at: Date.now(),
    });
    throw err;
  }

  // Persist + post-process
  const workstreams = storage.listWorkstreams();
  const analysts = storage.listAnalysts();
  const items: SyncedItem[] = [];
  let tasksSuggested = 0;
  let evidenceSuggested = 0;
  let interactionsAutoAdded = 0;
  let stanceSuggestions = 0;

  for (const n of normalised) {
    const c = classify(n, workstreams);
    const stored = storage.insertSyncedItem({
      id: `si_${randomUUID()}`,
      integration_config_id: config.id,
      sync_source_id: source?.id ?? null,
      sync_run_id: run.id,
      type: n.type,
      external_id: n.external_id,
      title: n.title,
      body_excerpt: n.body_excerpt ?? null,
      url: n.url ?? null,
      signals: JSON.stringify(n.signals),
      occurred_at: n.occurred_at ? n.occurred_at.getTime() : null,
      workstream_id: c.confidence >= 40 ? c.workstreamId : null,
      link_confidence: c.confidence,
      link_reason: c.reason,
    });
    items.push(stored);

    // Suggested tasks
    for (const t of suggestTasks(stored, n.signals)) {
      storage.createTask({
        workstream_id: stored.workstream_id ?? undefined,
        title: t.title,
        detail: t.detail,
        state: "suggested",
        source: "system_suggestion",
        origin_synced_item_id: stored.id,
      });
      tasksSuggested++;
    }

    // Suggested evidence
    const ev = suggestEvidence(stored, n.signals);
    if (ev) {
      storage.createEvidence({
        workstream_id: stored.workstream_id ?? undefined,
        title: ev.title,
        detail: ev.detail,
        reuse_level: "Internal only",
        status: "suggested",
        origin_synced_item_id: stored.id,
      });
      evidenceSuggested++;
    }

    // Auto-add interaction (Needs confirmation)
    if (shouldAutoAddInteraction(n, c)) {
      const analystName = (n.signals.analyst_names ?? [])[0];
      const analyst = analystName ? findAnalystByName(analystName, analysts) : undefined;
      storage.createInteraction({
        analyst_id: analyst?.id,
        workstream_id: stored.workstream_id ?? undefined,
        type:
          n.type === "calendar_event"
            ? "briefing"
            : n.type === "briefing_request"
            ? "inquiry"
            : "email",
        title: n.title,
        notes: n.body_excerpt ?? undefined,
        occurred_at: n.occurred_at ? n.occurred_at.getTime() : Date.now(),
        source: "auto_synced",
        needs_confirmation: true,
        synced_item_id: stored.id,
      });
      interactionsAutoAdded++;

      // Stance suggestion (suggestion only)
      if (analyst) {
        const suggestion = suggestStanceUpdate(analyst, n.signals);
        if (suggestion) {
          storage.insertStance({
            analyst_id: analyst.id,
            stance: suggestion.stance,
            confidence: suggestion.confidence,
            source: "system_suggestion",
            note: suggestion.note,
            suggested: true,
            visible_in_leader_lens: false,
          });
          stanceSuggestions++;
        }
      }
    }
  }

  // Mark sync run complete
  storage.finishSyncRun(run.id, {
    status: "success",
    finished_at: Date.now(),
    items_seen: normalised.length,
    items_imported: items.length,
    message: syncMsg,
  });

  // Update last_sync_at and status on the config
  storage.updateIntegrationConfig(config.id, {
    last_sync_at: Date.now(),
    status: config.status === "off" ? "off" : config.status === "connected" ? "connected" : "mock_mode",
    status_detail:
      config.status === "connected"
        ? "Live adapter sync complete."
        : "Mock adapter sync complete — sample data only.",
    updated_at: Date.now(),
  });

  return {
    runId: run.id,
    items,
    tasksSuggested,
    evidenceSuggested,
    interactionsAutoAdded,
    stanceSuggestions,
    message: syncMsg,
  };
}

function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
