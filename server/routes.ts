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
import {
  AG_ENDPOINTS,
  AG_ENDPOINT_KEYS,
  agConfigured,
  agFetch,
  getEndpoint,
} from "./services/agApi";
import { getArBrief } from "./services/agIntelligence";
import express from "express";
import { randomUUID } from "node:crypto";
import { ingestPptx } from "./services/deckIngest";
import { deckStore } from "./services/deckStore";
import { composeBriefingDeck, composerFilename } from "./services/briefingComposer";
import { addResult, houseLearnings, listResults, removeResult } from "./services/resultsLearning";
import { composeScenarioDeck, scenarioDeckFilename } from "./services/scenarioDeck";
import { scenarioById } from "@shared/briefingScenarios";
import { HOUSE_PLAYBOOKS, type AnalystHouseId } from "@shared/assessmentPlaybooks";
import { ingestDocument } from "./services/docIngest";
import { analyzeRfp } from "./services/rfpAnalyzer";
import { analystStore } from "./services/analystStore";
import { suggestStanceFromSignals, confirmStance } from "./services/perceptionEngine";
import { publicRankingsStore } from "./services/publicRankingsStore";

// ============================================================================
// API routes for the AR SuperHero backend.
// All routes are read-only or import-first as required by the MVP brief.
// ============================================================================

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --------------------------------------------------------------------------
  // AnalystGenius intelligence API proxy (key stays server-side)
  // --------------------------------------------------------------------------

  app.get("/api/ag/status", async (_req, res) => {
    const endpoints = AG_ENDPOINTS.map((e) => ({ key: e.key, label: e.label, requiresTicker: e.requiresTicker }));
    if (!agConfigured()) {
      return res.json({ configured: false, connected: false, endpoints });
    }
    // Probe the catalog endpoint (no ticker needed) to confirm the key works.
    const probe = await agFetch("providers");
    res.json({
      configured: true,
      connected: probe.status >= 200 && probe.status < 300,
      upstreamStatus: probe.status,
      endpoints,
    });
  });

  // Derived AR brief: emergencies, highlights, stakeholder actions, gap
  // analysis. ?competitors=ACN,IBM selects the competitive set (validated,
  // capped at 5; unknown tickers simply return no data and are skipped).
  // Registered before the generic :key proxy so "ar-brief" is not shadowed.
  app.get("/api/ag/ar-brief", async (req, res) => {
    const raw = typeof req.query.competitors === "string" ? req.query.competitors.split(",") : undefined;
    // focalTicker makes the cockpit brief multi-company, matching the deck
    // generators. Without it the brief silently stayed on the default focal
    // firm no matter which vendor the user had selected.
    const focalTicker =
      typeof req.query.focalTicker === "string" && req.query.focalTicker.trim()
        ? req.query.focalTicker.trim().toUpperCase()
        : undefined;
    const brief = await getArBrief({ competitors: raw, focalTicker });
    res.json(brief);
  });

  app.get("/api/ag/:key", async (req, res) => {
    const endpoint = getEndpoint(req.params.key);
    if (!endpoint) {
      return res
        .status(404)
        .json({ success: false, error: `Unknown AG endpoint: ${req.params.key}`, allowed: AG_ENDPOINT_KEYS });
    }
    const query: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === "string") query[k] = v;
    }
    if (endpoint.requiresTicker && !query.ticker) {
      return res
        .status(400)
        .json({ success: false, error: `Endpoint '${endpoint.key}' requires a ?ticker= query param` });
    }
    const result = await agFetch(endpoint.path, query);
    res.status(result.status).json(result.body);
  });

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
    competitorTickers: z.array(z.string()).max(8).optional(),
  });

  app.post("/api/briefing-decks/generate", async (req: Request, res: Response) => {
    const parse = briefingDeckSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });

    try {
      const buffer = await createBriefingDeck(
        parse.data.momentId,
        parse.data.vendorId,
        parse.data.competitorTickers
      );
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
    competitorTickers: z.array(z.string()).max(8).optional(),
  });

  app.post("/api/persona-decks/generate", async (req: Request, res: Response) => {
    const parse = directPersonaSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });

    const valid = new Set(listDirectPersonaIds() as string[]);
    const personaIds = parse.data.personaIds.filter((id) => valid.has(id)) as PersonaId[];
    if (!personaIds.length) return res.status(400).json({ error: "No valid personaIds supplied." });

    try {
      const buffer = await createDirectPersonaDeck(
        personaIds,
        parse.data.vendorId,
        parse.data.competitorTickers
      );
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
  // Deck library — ingest prior briefing decks (verbatim per-slide text)
  // --------------------------------------------------------------------------

  const HOUSE_IDS = new Set(HOUSE_PLAYBOOKS.map((p) => p.id as string));

  app.post(
    "/api/deck-library/upload",
    express.raw({ type: () => true, limit: "25mb" }),
    async (req: Request, res: Response) => {
      const filename = String(req.query.filename ?? "").trim() || "untitled.pptx";
      const house = String(req.query.house ?? "").trim().toLowerCase();
      if (!HOUSE_IDS.has(house)) {
        return res.status(400).json({ error: `house must be one of: ${[...HOUSE_IDS].join(", ")}` });
      }
      const isDemo = req.query.demo === "1" || req.query.demo === "true";
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length < 100) {
        return res.status(400).json({ error: "Upload the .pptx file as the raw request body." });
      }
      try {
        const parsed = ingestPptx(body);
        const row = {
          id: randomUUID(),
          filename,
          house,
          uploadedAt: Date.now(),
          slideCount: parsed.slideCount,
          slides: parsed.slides,
          fileBlob: body,
          isDemo,
        };
        await deckStore.insert(row);
        res.json({
          id: row.id,
          filename: row.filename,
          house: row.house,
          slideCount: row.slideCount,
          isDemo: row.isDemo,
          extractedTextSlides: parsed.slides.filter((s) => s.texts.length > 0).length,
        });
      } catch (err) {
        res.status(422).json({ error: (err as Error).message });
      }
    }
  );

  app.get("/api/deck-library", async (_req, res) => {
    try {
      res.json({ decks: await deckStore.list(), backend: deckStore.kind });
    } catch (err) {
      res.status(503).json({ error: (err as Error).message, backend: deckStore.kind });
    }
  });

  app.get("/api/deck-library/:id/download", async (req, res) => {
    try {
      const row = await deckStore.get(req.params.id);
      if (!row) return res.status(404).json({ error: "Deck not found." });
      if (!row.fileBlob) {
        return res
          .status(404)
          .json({ error: "No stored file for this deck — it was uploaded before file storage was added." });
      }
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${row.filename}"`);
      res.send(row.fileBlob);
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/deck-library/:id", async (req, res) => {
    try {
      const removed = await deckStore.remove(req.params.id);
      res.status(removed ? 200 : 404).json({ removed });
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  // --------------------------------------------------------------------------
  // Scenario persona decks — persona x scenario market-update briefings
  // --------------------------------------------------------------------------

  const scenarioDeckSchema = z.object({
    personaId: z.string().min(1),
    scenarioId: z.string().refine((s) => Boolean(scenarioById(s)), "unknown scenario"),
    houseId: z.string().refine((h) => HOUSE_IDS.has(h), "unknown analyst house").optional(),
    vendorId: z.string().max(40).optional(),
    competitorTickers: z.array(z.string()).max(8).optional(),
  });

  app.post("/api/persona-decks/scenario", async (req: Request, res: Response) => {
    const parse = scenarioDeckSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    const valid = new Set(listDirectPersonaIds() as string[]);
    if (!valid.has(parse.data.personaId)) return res.status(400).json({ error: "unknown personaId" });
    const scenario = scenarioById(parse.data.scenarioId)!;
    if (!scenario.personas.includes(parse.data.personaId as (typeof scenario.personas)[number])) {
      return res.status(400).json({ error: `Scenario '${scenario.id}' does not apply to persona '${parse.data.personaId}'` });
    }
    try {
      const request = {
        personaId: parse.data.personaId as PersonaId,
        scenarioId: parse.data.scenarioId,
        houseId: parse.data.houseId as AnalystHouseId | undefined,
        vendorId: parse.data.vendorId,
        competitorTickers: parse.data.competitorTickers,
      };
      const buffer = await composeScenarioDeck(request);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      res.setHeader("Content-Disposition", `attachment; filename="${scenarioDeckFilename(request)}"`);
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --------------------------------------------------------------------------
  // Enable — RFP/RFI analysis. Uploads a draft response document, extracts
  // its text, and reviews it against live AG market intelligence + the
  // caller's own proof-point/claims-to-avoid library. See rfpAnalyzer.ts for
  // the grounding rules the model is bound to.
  // --------------------------------------------------------------------------

  const proofPointSchema = z.object({
    title: z.string().max(300),
    status: z.enum(["safe", "restricted", "unsupported"]),
    reuse: z.string().max(200),
  });
  const claimToAvoidSchema = z.object({
    claim: z.string().max(300),
    reason: z.string().max(300),
  });

  app.post(
    "/api/enable/rfp-analyze",
    express.raw({ type: () => true, limit: "10mb" }),
    async (req: Request, res: Response) => {
      const filename = String(req.query.filename ?? "").trim() || "untitled.docx";
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length < 10) {
        return res.status(400).json({ error: "Upload the document as the raw request body." });
      }

      let proofPoints: z.infer<typeof proofPointSchema>[] = [];
      let claimsToAvoid: z.infer<typeof claimToAvoidSchema>[] = [];
      let competitorTickers: string[] | undefined;
      try {
        if (req.query.proofPoints) {
          proofPoints = z.array(proofPointSchema).max(30).parse(JSON.parse(String(req.query.proofPoints)));
        }
        if (req.query.claimsToAvoid) {
          claimsToAvoid = z.array(claimToAvoidSchema).max(30).parse(JSON.parse(String(req.query.claimsToAvoid)));
        }
        if (req.query.competitorTickers) {
          competitorTickers = z.array(z.string()).max(8).parse(JSON.parse(String(req.query.competitorTickers)));
        }
      } catch {
        return res.status(400).json({ error: "proofPoints/claimsToAvoid/competitorTickers must be valid JSON arrays." });
      }

      try {
        const doc = ingestDocument(body, filename);
        const analysis = await analyzeRfp({
          documentText: doc.text,
          filename,
          competitorTickers,
          proofPoints,
          claimsToAvoid,
        });
        res.json({ ...analysis, truncated: doc.truncated });
      } catch (err) {
        res.status(422).json({ error: (err as Error).message });
      }
    }
  );

  // --------------------------------------------------------------------------
  // Assessment results — verified outcomes + the evidence-vs-result learning
  // --------------------------------------------------------------------------

  const resultSchema = z.object({
    house: z.string().refine((h) => HOUSE_IDS.has(h), "unknown analyst house"),
    segment: z.string().min(2).max(160),
    cycleLabel: z.string().min(2).max(60),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "publishedAt must be YYYY-MM-DD"),
    position: z.string().min(2).max(60),
    priorPosition: z.string().max(60).optional(),
    strengths: z.array(z.string().min(3).max(400)).max(12).default([]),
    cautions: z.array(z.string().min(3).max(400)).max(12).default([]),
    linkedDeckIds: z.array(z.string()).max(20).default([]),
    notes: z.string().max(1000).optional(),
  });

  app.post("/api/assessment-results", async (req: Request, res: Response) => {
    const parse = resultSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    try {
      const stored = await addResult({ ...parse.data, house: parse.data.house as AnalystHouseId });
      res.json(stored);
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.get("/api/assessment-results", async (_req, res) => {
    try {
      res.json({ results: await listResults() });
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.get("/api/assessment-results/learnings", async (req, res) => {
    try {
      const house = typeof req.query.house === "string" && HOUSE_IDS.has(req.query.house)
        ? (req.query.house as AnalystHouseId)
        : undefined;
      res.json({ learnings: await houseLearnings(house) });
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/assessment-results/:id", async (req, res) => {
    try {
      const removed = await removeResult(req.params.id);
      res.status(removed ? 200 : 404).json({ removed });
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  // --------------------------------------------------------------------------
  // Briefing composer — house-targeted deck from playbook + reuse + AG + vars
  // --------------------------------------------------------------------------

  const composeSchema = z.object({
    houseId: z.string().refine((h) => HOUSE_IDS.has(h), "unknown analyst house"),
    deckIds: z.array(z.string()).max(20).default([]),
    variables: z.object({
      topic: z.string().min(2).max(160),
      region: z.string().max(80).optional(),
      briefingLengthMins: z.number().int().min(15).max(120),
      executives: z.array(z.object({ name: z.string().min(1).max(80), title: z.string().min(1).max(120) })).max(8).default([]),
      objectives: z.array(z.string().max(200)).max(6).optional(),
    }),
    vendorId: z.string().max(40).optional(),
    competitorTickers: z.array(z.string()).max(8).optional(),
  });

  app.post("/api/briefing-composer/generate", async (req: Request, res: Response) => {
    const parse = composeSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    try {
      const request = { ...parse.data, houseId: parse.data.houseId as AnalystHouseId };
      const buffer = await composeBriefingDeck(request);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${composerFilename(request)}"`);
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --------------------------------------------------------------------------
  // Analysts + stances
  // --------------------------------------------------------------------------

  app.get("/api/analysts", async (_req, res) => {
    try {
      const [analystsList, allStances] = await Promise.all([analystStore.listAnalysts(), analystStore.listStances()]);
      res.json(
        analystsList.map((a) => {
          const latest = allStances.find((s) => s.analyst_id === a.id && !s.suggested);
          return decorateAnalyst(a, latest);
        })
      );
    } catch (err) {
      res.status(503).json({ error: (err as Error).message, backend: analystStore.kind });
    }
  });

  const createAnalystSchema = z.object({
    name: z.string().min(1).max(200),
    firm: z.string().min(1).max(200),
    firm_tier: z.string().min(1).max(40),
    role: z.string().max(200).optional(),
    rating: z.string().max(10).optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    coverage: z.array(z.string().max(80)).max(20).optional(),
    source: z.string().max(120).optional(),
  });

  app.post("/api/analysts", async (req, res) => {
    const parse = createAnalystSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    try {
      const { coverage, ...rest } = parse.data;
      const created = await analystStore.createAnalyst({
        ...rest,
        coverage: coverage ? JSON.stringify(coverage) : undefined,
      });
      res.json(created);
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/analysts/:id", async (req, res) => {
    try {
      const patch = req.body;
      if (patch.coverage && Array.isArray(patch.coverage)) patch.coverage = JSON.stringify(patch.coverage);
      if (patch.rating) patch.rating_overridden = true;
      const updated = await analystStore.updateAnalyst(req.params.id, patch);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.get("/api/analysts/:id/stances", async (req, res) => {
    try {
      res.json(await analystStore.listStances(req.params.id));
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  const stanceSchema = z.object({
    analyst_id: z.string(),
    stance: z.string(),
    confidence: z.number().min(0).max(100).optional(),
    note: z.string().optional(),
    visible_in_leader_lens: z.boolean().optional(),
  });

  // Accept a stance update (manual, not auto).
  app.post("/api/stances", async (req, res) => {
    const parse = stanceSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    try {
      const row = await analystStore.insertStance({
        analyst_id: parse.data.analyst_id,
        stance: parse.data.stance,
        confidence: parse.data.confidence ?? 70,
        source: "ar_manual",
        note: parse.data.note ?? null,
        suggested: false,
        visible_in_leader_lens: parse.data.visible_in_leader_lens ?? false,
      });
      res.json(row);
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  // Confirm / dismiss a suggested stance update.
  app.patch("/api/stances/:id", async (req, res) => {
    try {
      const patch = req.body;
      const existing = (await analystStore.listStances()).find((s) => s.id === req.params.id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      const updated = { ...existing, ...patch };
      await analystStore.insertStance({
        analyst_id: existing.analyst_id,
        stance: patch.stance ?? existing.stance,
        confidence: patch.confidence ?? existing.confidence,
        source: patch.source ?? "ar_confirmed",
        note: patch.note ?? existing.note,
        suggested: false,
        visible_in_leader_lens: patch.visible_in_leader_lens ?? false,
      });
      res.json(updated);
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  // --------------------------------------------------------------------------
  // Analyst signals — uploaded notes/write-ups/interaction logs that feed the
  // perception engine. Uploading a signal immediately triggers a suggested
  // stance update (source: system_suggestion) so "feed and update" happens
  // in one step; AR staff separately confirm or ignore the suggestion.
  // --------------------------------------------------------------------------

  const signalSchema = z.object({
    kind: z.enum(["note", "write_up", "interaction_log", "upload"]),
    title: z.string().min(1).max(200),
    content_text: z.string().min(1).max(20000),
    filename: z.string().max(200).optional(),
    uploaded_by: z.string().max(120).optional(),
  });

  app.get("/api/analysts/:id/signals", async (req, res) => {
    try {
      res.json(await analystStore.listSignals(req.params.id));
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.post("/api/analysts/:id/signals", async (req, res) => {
    const parse = signalSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    try {
      const analyst = await analystStore.getAnalyst(req.params.id);
      if (!analyst) return res.status(404).json({ error: "Analyst not found." });
      const signal = await analystStore.insertSignal({ analyst_id: req.params.id, ...parse.data });
      const perception = await suggestStanceFromSignals(req.params.id);
      res.json({ signal, perception });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  const SIGNAL_KINDS = new Set(["note", "write_up", "interaction_log", "upload"]);

  // Same as above, but for an actual uploaded document (.docx/.txt) rather
  // than typed text — reuses the same doc-ingestion path as the RFP analyzer.
  app.post(
    "/api/analysts/:id/signals/upload",
    express.raw({ type: () => true, limit: "10mb" }),
    async (req: Request, res: Response) => {
      const filename = String(req.query.filename ?? "").trim() || "untitled.txt";
      const title = String(req.query.title ?? "").trim();
      const kindRaw = String(req.query.kind ?? "upload");
      const kind = SIGNAL_KINDS.has(kindRaw) ? kindRaw : "upload";
      const uploadedBy = req.query.uploadedBy ? String(req.query.uploadedBy).trim() : undefined;
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length < 1) {
        return res.status(400).json({ error: "Upload the document as the raw request body." });
      }
      if (!title) return res.status(400).json({ error: "title is required." });
      const analystId = String(req.params.id);
      try {
        const analyst = await analystStore.getAnalyst(analystId);
        if (!analyst) return res.status(404).json({ error: "Analyst not found." });
        const doc = ingestDocument(body, filename);
        const signal = await analystStore.insertSignal({
          analyst_id: analystId,
          kind,
          title,
          content_text: doc.text,
          filename,
          uploaded_by: uploadedBy,
        });
        const perception = await suggestStanceFromSignals(analystId);
        res.json({ signal, perception, truncated: doc.truncated });
      } catch (err) {
        res.status(422).json({ error: (err as Error).message });
      }
    }
  );

  // Re-run the perception engine on demand (e.g. after several signals were
  // added without triggering a fresh suggestion each time).
  app.post("/api/analysts/:id/suggest-stance", async (req, res) => {
    try {
      const perception = await suggestStanceFromSignals(req.params.id);
      res.json(perception);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // AR staff accepting a system-suggested stance.
  app.post("/api/analysts/:id/stances/:stanceId/confirm", async (req, res) => {
    try {
      const confirmed = await confirmStance(req.params.id, req.params.stanceId);
      if (!confirmed) return res.status(404).json({ error: "Suggested stance not found." });
      res.json(confirmed);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --------------------------------------------------------------------------
  // Public analyst rankings — real, cited Magic Quadrant / Wave / PEAK Matrix
  // / Horizons / NEAT / Provider Lens placements for tracked vendors, found
  // via web research. Every insert requires a real source_url — this is a
  // curated-evidence table, not a computed one.
  // --------------------------------------------------------------------------

  const createRankingSchema = z.object({
    vendor_id: z.string().min(1).max(40),
    analyst_firm: z.string().min(1).max(120),
    report_name: z.string().min(1).max(300),
    category: z.string().max(160).optional(),
    placement: z.string().min(1).max(120),
    published_date: z.string().min(4).max(10),
    date_precision: z.enum(["day", "month", "year"]).optional(),
    source_url: z.string().url().max(600),
    source_type: z.enum(["vendor_press_release", "analyst_firm_page", "trade_press", "other"]),
    summary: z.string().min(1).max(600),
  });

  app.get("/api/public-rankings", async (req, res) => {
    try {
      const vendorId = typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
      res.json(await publicRankingsStore.listRankings(vendorId));
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.post("/api/public-rankings", async (req, res) => {
    const parse = createRankingSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues });
    try {
      const created = await publicRankingsStore.insertRanking(parse.data);
      res.json(created);
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  // --------------------------------------------------------------------------
  // Interactions
  // --------------------------------------------------------------------------

  app.get("/api/interactions", async (_req, res) => {
    try {
      res.json(await analystStore.listInteractions());
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.post("/api/interactions", async (req, res) => {
    try {
      res.json(await analystStore.insertInteraction(req.body));
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/interactions/:id", async (req, res) => {
    try {
      const updated = await analystStore.updateInteraction(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err) {
      res.status(503).json({ error: (err as Error).message });
    }
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
