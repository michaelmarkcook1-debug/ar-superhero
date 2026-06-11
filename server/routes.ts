import type { Express, Request, Response } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { z } from "zod";
import { storage } from "./storage";
import { CONNECTOR_DESCRIPTORS, getAdapter, getDescriptor } from "./connectors/registry";
import { runSync } from "./services/sync";
import { createBriefingDeck, getBriefingDeckFilename } from "./services/briefingDeck";
import {
  createDirectPersonaDeck,
  getDirectPersonaDeckFilename,
  listDirectPersonaIds,
  type PersonaId,
} from "./services/directPersonaDeck";
import { getIntelligenceMonitor } from "./services/intelligenceMonitor";

// ============================================================================
// API routes for the AR Superhero backend.
// All routes are read-only or import-first as required by the MVP brief.
// ============================================================================

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --------------------------------------------------------------------------
  // Integration registry + configs
  // --------------------------------------------------------------------------

  // Connector catalogue with declared capabilities.
  app.get("/api/integrations/registry", (_req, res) => {
    res.json({
      categories: ["public_intelligence", "ar_platform", "document_storage", "email_calendar"],
      connectors: CONNECTOR_DESCRIPTORS,
    });
  });

  // List integration configs (per-customer instances of connectors).
  app.get("/api/integrations/configs", (req, res) => {
    const customerId = req.query.customerId as string | undefined;
    const configs = storage.listIntegrationConfigs(customerId);
    res.json(configs.map(decorateConfig));
  });

  // Update a config (enabled/mode/credentials).
  const patchConfigSchema = z.object({
    enabled: z.boolean().optional(),
    mode: z.enum(["off", "read_only", "manual_import", "scheduled_sync", "continuous_sync"]).optional(),
    credentials: z.record(z.unknown()).optional(),
    display_name: z.string().optional(),
  });

  app.patch("/api/integrations/configs/:id", (req, res) => {
    const id = req.params.id;
    const parse = patchConfigSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    const patch = parse.data;

    const existing = storage.getIntegrationConfig(id);
    if (!existing) return res.status(404).json({ error: "Integration config not found" });

    const update: Record<string, unknown> = {};
    if (typeof patch.enabled === "boolean") update.enabled = patch.enabled;
    if (patch.mode) update.mode = patch.mode;
    if (patch.display_name) update.display_name = patch.display_name;
    if (patch.credentials) update.credentials = JSON.stringify(patch.credentials);

    // Auto-coerce status when toggling enabled state.
    if (typeof patch.enabled === "boolean") {
      if (patch.enabled) {
        const credPresent = patch.credentials && Object.keys(patch.credentials).length > 0;
        const descriptor = getDescriptor(existing.connector_id);
        if (descriptor?.capabilities.oauth_required && !credPresent) {
          update.status = "needs_auth";
          update.status_detail = "OAuth not configured. Adapter will run in mock mode for demo flows.";
        } else if (credPresent) {
          update.status = "connected";
          update.status_detail = "Credentials present — adapter still mock-backed pending live implementation.";
        } else {
          update.status = "mock_mode";
          update.status_detail = "Mock adapter — sample data only. No live credentials configured.";
        }
        if (!patch.mode || patch.mode === "off") {
          update.mode = descriptor?.default_mode === "off" ? "manual_import" : (descriptor?.default_mode ?? "read_only");
        }
      } else {
        update.mode = "off";
        update.status = "off";
        update.status_detail = "Disabled.";
      }
    }

    const updated = storage.updateIntegrationConfig(id, update);
    res.json(updated ? decorateConfig(updated) : null);
  });

  // Test connection for a connector instance.
  app.post("/api/integrations/:configId/test", async (req, res) => {
    const config = storage.getIntegrationConfig(req.params.configId);
    if (!config) return res.status(404).json({ error: "Not found" });
    const adapter = getAdapter(config.connector_id);
    if (!adapter) return res.status(404).json({ error: "No adapter" });

    try {
      const result = await adapter.testConnection(safeJson(config.credentials, {}));
      storage.updateIntegrationConfig(config.id, {
        status: result.status,
        status_detail: result.message,
        last_test_at: Date.now(),
        updated_at: Date.now(),
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ status: "error", message: (err as Error).message });
    }
  });

  // --------------------------------------------------------------------------
  // Sync sources
  // --------------------------------------------------------------------------

  app.get("/api/integrations/:configId/sources", (req, res) => {
    res.json(storage.listSyncSources(req.params.configId));
  });

  // Discover sources from the adapter (e.g. folder list).
  app.get("/api/integrations/:configId/discover-sources", async (req, res) => {
    const config = storage.getIntegrationConfig(req.params.configId);
    if (!config) return res.status(404).json({ error: "Not found" });
    const adapter = getAdapter(config.connector_id);
    if (!adapter) return res.status(404).json({ error: "No adapter" });
    const items = await adapter.listSources(safeJson(config.credentials, {}));
    res.json(items);
  });

  const sourceSchema = z.object({
    integration_config_id: z.string(),
    source_type: z.string(),
    external_id: z.string().optional(),
    label: z.string(),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  });

  app.post("/api/sync-sources", (req, res) => {
    const parse = sourceSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    const row = storage.createSyncSource({
      integration_config_id: parse.data.integration_config_id,
      source_type: parse.data.source_type,
      external_id: parse.data.external_id,
      label: parse.data.label,
      config: JSON.stringify(parse.data.config ?? {}),
      enabled: parse.data.enabled ?? true,
    });
    res.json(row);
  });

  app.patch("/api/sync-sources/:id", (req, res) => {
    const patch = req.body;
    if (patch.config && typeof patch.config !== "string") patch.config = JSON.stringify(patch.config);
    const updated = storage.updateSyncSource(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/sync-sources/:id", (req, res) => {
    storage.deleteSyncSource(req.params.id);
    res.json({ ok: true });
  });

  // --------------------------------------------------------------------------
  // Sync runs
  // --------------------------------------------------------------------------

  const runSchema = z.object({
    configId: z.string(),
    syncSourceId: z.string().optional(),
    trigger: z.enum(["manual", "scheduled", "continuous"]).optional(),
  });

  app.post("/api/sync/run", async (req, res) => {
    const parse = runSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    try {
      const result = await runSync(parse.data);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get("/api/sync/runs", (_req, res) => {
    res.json(storage.listSyncRuns(100));
  });

  app.get("/api/synced-items", (_req, res) => {
    res.json(storage.listSyncedItems(200).map(decorateSyncedItem));
  });

  // --------------------------------------------------------------------------
  // Workstreams
  // --------------------------------------------------------------------------

  app.get("/api/workstreams", (_req, res) => {
    res.json(storage.listWorkstreams().map(decorateWorkstream));
  });

  // --------------------------------------------------------------------------
  // Analyst briefing deck generation
  // --------------------------------------------------------------------------

  const briefingDeckSchema = z.object({
    momentId: z.string().min(1),
    vendorId: z.string().optional(),
  });

  app.post("/api/briefing-decks/generate", async (req: Request, res: Response) => {
    const parse = briefingDeckSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });

    try {
      const buffer = await createBriefingDeck(parse.data.momentId, parse.data.vendorId);
      const filename = getBriefingDeckFilename(parse.data.momentId, parse.data.vendorId);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Direct tab persona analyst-influence briefing packs. Accepts one or more
  // persona ids; a single persona yields a focused pack, multiple yields a
  // combined multi-persona pack.
  const directPersonaSchema = z.object({
    personaIds: z.array(z.string().min(1)).min(1),
    vendorId: z.string().optional(),
  });

  app.post("/api/persona-decks/generate", async (req: Request, res: Response) => {
    const parse = directPersonaSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });

    const valid = new Set(listDirectPersonaIds() as string[]);
    const personaIds = parse.data.personaIds.filter((id) => valid.has(id)) as PersonaId[];
    if (!personaIds.length) return res.status(400).json({ error: "No valid personaIds supplied." });

    try {
      const buffer = await createDirectPersonaDeck(personaIds, parse.data.vendorId);
      const filename = getDirectPersonaDeckFilename(personaIds, parse.data.vendorId);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --------------------------------------------------------------------------
  // Analysts + stances
  // --------------------------------------------------------------------------

  app.get("/api/analysts", (_req, res) => {
    const allStances = storage.listStances();
    res.json(
      storage.listAnalysts().map((a) => {
        const latest = allStances.find((s) => s.analyst_id === a.id && !s.suggested);
        return decorateAnalyst(a, latest);
      })
    );
  });

  app.patch("/api/analysts/:id", (req, res) => {
    const patch = req.body;
    if (patch.coverage && Array.isArray(patch.coverage)) patch.coverage = JSON.stringify(patch.coverage);
    if (patch.rating) patch.rating_overridden = true;
    const updated = storage.updateAnalyst(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.get("/api/analysts/:id/stances", (req, res) => {
    res.json(storage.listStances(req.params.id));
  });

  const stanceSchema = z.object({
    analyst_id: z.string(),
    stance: z.string(),
    confidence: z.number().min(0).max(100).optional(),
    note: z.string().optional(),
    visible_in_leader_lens: z.boolean().optional(),
  });

  // Accept a stance update (manual, not auto).
  app.post("/api/stances", (req, res) => {
    const parse = stanceSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    const row = storage.insertStance({
      analyst_id: parse.data.analyst_id,
      stance: parse.data.stance,
      confidence: parse.data.confidence ?? 70,
      source: "ar_manual",
      note: parse.data.note ?? null,
      suggested: false,
      visible_in_leader_lens: parse.data.visible_in_leader_lens ?? false,
    });
    res.json(row);
  });

  // Confirm / dismiss a suggested stance update.
  app.patch("/api/stances/:id", (req, res) => {
    const patch = req.body;
    // Update directly via storage (no helper because we never edit historical stances much)
    const existing = storage.listStances().find((s) => s.id === req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = { ...existing, ...patch };
    storage.insertStance({
      analyst_id: existing.analyst_id,
      stance: patch.stance ?? existing.stance,
      confidence: patch.confidence ?? existing.confidence,
      source: patch.source ?? "ar_confirmed",
      note: patch.note ?? existing.note,
      suggested: false,
      visible_in_leader_lens: patch.visible_in_leader_lens ?? false,
    });
    res.json(updated);
  });

  // --------------------------------------------------------------------------
  // Interactions
  // --------------------------------------------------------------------------

  app.get("/api/interactions", (_req, res) => {
    res.json(storage.listInteractions());
  });

  app.post("/api/interactions", (req, res) => {
    const row = storage.createInteraction(req.body);
    res.json(row);
  });

  app.patch("/api/interactions/:id", (req, res) => {
    const updated = storage.updateInteraction(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // --------------------------------------------------------------------------
  // Tasks
  // --------------------------------------------------------------------------

  app.get("/api/tasks", (_req, res) => {
    res.json(storage.listTasks());
  });
  app.post("/api/tasks", (req, res) => {
    const row = storage.createTask(req.body);
    res.json(row);
  });
  app.patch("/api/tasks/:id", (req, res) => {
    const updated = storage.updateTask(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // --------------------------------------------------------------------------
  // Evidence
  // --------------------------------------------------------------------------

  app.get("/api/evidence", (_req, res) => {
    res.json(storage.listEvidence());
  });
  app.post("/api/evidence", (req, res) => {
    const row = storage.createEvidence(req.body);
    res.json(row);
  });
  app.patch("/api/evidence/:id", (req, res) => {
    const updated = storage.updateEvidence(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // --------------------------------------------------------------------------
  // Learning signals
  // --------------------------------------------------------------------------

  app.get("/api/learning-signals", (_req, res) => {
    res.json(storage.listLearningSignals());
  });
  app.post("/api/learning-signals", (req, res) => {
    const row = storage.createLearningSignal(req.body);
    res.json(row);
  });
  app.patch("/api/learning-signals/:id", (req, res) => {
    const updated = storage.updateLearningSignal(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // --------------------------------------------------------------------------
  // Leader lens
  // --------------------------------------------------------------------------

  app.get("/api/leader-lens", (_req, res) => {
    res.json(
      storage.listLatestBriefs().map((b) => ({
        ...b,
        points: safeJson<string[]>(b.points, []),
      }))
    );
  });

  // --------------------------------------------------------------------------
  // Dashboard summary
  // --------------------------------------------------------------------------

  app.get("/api/dashboard/summary", (_req, res) => {
    const configs = storage.listIntegrationConfigs();
    const runs = storage.listSyncRuns(20);
    const synced = storage.listSyncedItems(50);
    const tasks = storage.listTasks();
    const evidence = storage.listEvidence();
    const interactions = storage.listInteractions();
    const stances = storage.listStances();
    const workstreams = storage.listWorkstreams();

    const integrationsEnabled = configs.filter((c) => c.enabled).length;
    const continuousActive = configs.filter((c) => c.enabled && c.mode === "continuous_sync").length;
    const lastSyncAt = configs
      .map((c) => c.last_sync_at ?? 0)
      .reduce((a, b) => Math.max(a, b), 0);

    res.json({
      counts: {
        integrationsTotal: configs.length,
        integrationsEnabled,
        continuousActive,
        syncRuns: runs.length,
        syncedItems: synced.length,
        tasksSuggested: tasks.filter((t) => t.state === "suggested").length,
        evidenceSuggested: evidence.filter((e) => e.status === "suggested").length,
        evidenceApproved: evidence.filter((e) => e.status === "approved").length,
        interactionsNeedConfirmation: interactions.filter((i) => i.needs_confirmation).length,
        stanceSuggestions: stances.filter((s) => s.suggested).length,
        workstreams: workstreams.length,
      },
      lastSyncAt,
      recentRuns: runs.slice(0, 5),
      recentSyncedItems: synced.slice(0, 5),
    });
  });

  // --------------------------------------------------------------------------
  // Intelligence Monitor — Mission Control briefing-opportunity feeds.
  // Demo/seeded data; honours INTELLIGENCE_MONITOR_PATH override when present.
  // --------------------------------------------------------------------------

  app.get("/api/intelligence-monitor", (_req, res) => {
    res.json(getIntelligenceMonitor());
  });

  // --------------------------------------------------------------------------
  // Customers
  // --------------------------------------------------------------------------

  app.get("/api/customers", (_req, res) => {
    res.json(storage.listCustomers());
  });

  return httpServer;
}

// ============================================================================
// Decorators (parse JSON columns into structured payloads)
// ============================================================================

function decorateConfig(c: ReturnType<typeof storage.getIntegrationConfig>) {
  if (!c) return null;
  const descriptor = getDescriptor(c.connector_id);
  return {
    ...c,
    credentials: undefined, // never leak credentials
    has_credentials: c.credentials && c.credentials !== "{}",
    descriptor: descriptor ?? null,
    category: descriptor?.category ?? "public_intelligence",
  };
}

function decorateWorkstream(w: ReturnType<typeof storage.listWorkstreams>[number]) {
  return {
    ...w,
    keywords: safeJson<string[]>(w.keywords, []),
    meta: safeJson<Record<string, unknown>>(w.meta, {}),
  };
}

function decorateAnalyst(
  a: ReturnType<typeof storage.listAnalysts>[number],
  stance?: { stance: string; confidence: number; note: string | null } | undefined
) {
  return {
    ...a,
    coverage: safeJson<string[]>(a.coverage, []),
    current_stance: stance
      ? { stance: stance.stance, confidence: stance.confidence, note: stance.note }
      : null,
  };
}

function decorateSyncedItem(s: ReturnType<typeof storage.listSyncedItems>[number]) {
  return {
    ...s,
    signals: safeJson<Record<string, unknown>>(s.signals, {}),
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

// Suppress unused warning
export { createServer };
