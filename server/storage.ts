import {
  users,
  customers,
  connectors as connectorsTable,
  integration_configs,
  sync_sources,
  sync_runs,
  synced_items,
  workstreams,
  analysts,
  analyst_relationship_stances,
  interactions,
  tasks,
  evidence_items,
  leader_lens_briefs,
  learning_signals,
  assessment_profiles,
} from "@shared/schema";
import type {
  User,
  InsertUser,
  Customer,
  IntegrationConfig,
  InsertIntegrationConfig,
  SyncSource,
  InsertSyncSource,
  SyncRun,
  SyncedItem,
  Workstream,
  Analyst,
  StanceRecord,
  Interaction,
  InsertInteraction,
  Task,
  InsertTask,
  EvidenceItem,
  InsertEvidenceItem,
  LeaderLensBrief,
  LearningSignal,
  InsertLearningSignal,
  AssessmentProfile,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { CONNECTOR_DESCRIPTORS } from "./connectors/registry";

// ============================================================================
// SQLite + Drizzle storage. Schema is created on boot via raw SQL so npm run
// dev works without a separate migration step (drizzle-kit push remains an
// option for production).
// ============================================================================

// On a serverless host (Vercel) the project filesystem is read-only — only
// /tmp is writable. The DB holds demo data and is re-seeded by bootstrap() on
// each cold start, so an ephemeral /tmp copy is fine. Locally it stays in-repo.
const dbPath =
  process.env.DB_PATH ?? (process.env.VERCEL ? "/tmp/data.db" : "data.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

function ensureSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      meta TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      vendor TEXT,
      capabilities TEXT NOT NULL DEFAULT '{}',
      default_mode TEXT NOT NULL DEFAULT 'manual_import',
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS integration_configs (
      id TEXT PRIMARY KEY,
      connector_id TEXT NOT NULL,
      customer_id TEXT,
      display_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'off',
      status TEXT NOT NULL DEFAULT 'mock_mode',
      status_detail TEXT,
      credentials TEXT NOT NULL DEFAULT '{}',
      last_test_at INTEGER,
      last_sync_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_sources (
      id TEXT PRIMARY KEY,
      integration_config_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      external_id TEXT,
      label TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY,
      integration_config_id TEXT NOT NULL,
      sync_source_id TEXT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      status TEXT NOT NULL DEFAULT 'running',
      items_seen INTEGER NOT NULL DEFAULT 0,
      items_imported INTEGER NOT NULL DEFAULT 0,
      trigger TEXT NOT NULL DEFAULT 'manual',
      message TEXT
    );
    CREATE TABLE IF NOT EXISTS synced_items (
      id TEXT PRIMARY KEY,
      integration_config_id TEXT NOT NULL,
      sync_source_id TEXT,
      sync_run_id TEXT,
      type TEXT NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      body_excerpt TEXT,
      url TEXT,
      signals TEXT NOT NULL DEFAULT '{}',
      occurred_at INTEGER,
      ingested_at INTEGER NOT NULL,
      workstream_id TEXT,
      link_confidence INTEGER NOT NULL DEFAULT 0,
      link_reason TEXT
    );
    CREATE TABLE IF NOT EXISTS workstreams (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      name TEXT NOT NULL,
      firm TEXT NOT NULL,
      model TEXT NOT NULL,
      market TEXT,
      status TEXT NOT NULL DEFAULT 'Active',
      due_date TEXT,
      keywords TEXT NOT NULL DEFAULT '[]',
      meta TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS analysts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      firm TEXT NOT NULL,
      firm_tier TEXT NOT NULL,
      role TEXT,
      rating TEXT NOT NULL DEFAULT 'B',
      rating_overridden INTEGER NOT NULL DEFAULT 0,
      confidence INTEGER NOT NULL DEFAULT 50,
      coverage TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL DEFAULT 'Public discovery',
      last_interaction_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS analyst_relationship_stances (
      id TEXT PRIMARY KEY,
      analyst_id TEXT NOT NULL,
      stance TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 50,
      source TEXT NOT NULL DEFAULT 'ar_manual',
      note TEXT,
      suggested INTEGER NOT NULL DEFAULT 0,
      visible_in_leader_lens INTEGER NOT NULL DEFAULT 0,
      recorded_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      analyst_id TEXT,
      workstream_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      occurred_at INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      needs_confirmation INTEGER NOT NULL DEFAULT 0,
      synced_item_id TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      workstream_id TEXT,
      analyst_id TEXT,
      title TEXT NOT NULL,
      detail TEXT,
      due_date TEXT,
      state TEXT NOT NULL DEFAULT 'suggested',
      source TEXT NOT NULL DEFAULT 'system_suggestion',
      origin_synced_item_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS evidence_items (
      id TEXT PRIMARY KEY,
      workstream_id TEXT,
      title TEXT NOT NULL,
      detail TEXT,
      reuse_level TEXT NOT NULL DEFAULT 'Internal only',
      status TEXT NOT NULL DEFAULT 'suggested',
      origin_synced_item_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leader_lens_briefs (
      id TEXT PRIMARY KEY,
      lens TEXT NOT NULL,
      summary TEXT NOT NULL,
      points TEXT NOT NULL DEFAULT '[]',
      generation INTEGER NOT NULL DEFAULT 1,
      generated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learning_signals (
      id TEXT PRIMARY KEY,
      signal TEXT NOT NULL,
      scope TEXT,
      state TEXT NOT NULL DEFAULT 'Raw signal',
      anonymised INTEGER NOT NULL DEFAULT 1,
      reviewer TEXT,
      head_researcher_validated INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assessment_profiles (
      id TEXT PRIMARY KEY,
      workstream_id TEXT NOT NULL,
      criterion TEXT NOT NULL,
      band TEXT NOT NULL,
      note TEXT
    );
  `);
}

ensureSchema();

const now = () => Date.now();

// ----------------------------------------------------------------------------
// Bootstrap connector catalogue + a default customer + a default integration
// config per connector. Idempotent.
// ----------------------------------------------------------------------------
function bootstrap() {
  // Connector catalogue
  const existingConnectors = db.select().from(connectorsTable).all();
  if (existingConnectors.length === 0) {
    for (const d of CONNECTOR_DESCRIPTORS) {
      db.insert(connectorsTable).values({
        id: d.id,
        name: d.name,
        category: d.category,
        vendor: d.vendor ?? null,
        capabilities: JSON.stringify(d.capabilities),
        default_mode: d.default_mode,
        notes: d.notes ?? null,
      }).run();
    }
  }

  // Default customer
  const customer = db.select().from(customers).where(eq(customers.id, "northstar")).get();
  if (!customer) {
    db.insert(customers).values({
      id: "northstar",
      name: "Northstar Digital Services",
      meta: JSON.stringify({
        domains: ["northstar.example"],
        notes: "Demo customer for AR Superhero MVP.",
      }),
    }).run();
  }

  // Default integration config per connector for the demo customer
  const existingConfigs = db.select().from(integration_configs).all();
  if (existingConfigs.length === 0) {
    const ts = now();
    for (const d of CONNECTOR_DESCRIPTORS) {
      const enabled = d.default_mode !== "off";
      db.insert(integration_configs).values({
        id: `cfg_${d.id}`,
        connector_id: d.id,
        customer_id: "northstar",
        display_name: d.name,
        enabled,
        mode: enabled ? d.default_mode : "off",
        status: enabled ? "mock_mode" : "off",
        status_detail: enabled
          ? "Mock adapter — sample data only. No live credentials configured."
          : "Disabled by default. Toggle on to use the mock adapter.",
        credentials: "{}",
        last_test_at: null,
        last_sync_at: null,
        created_at: ts,
        updated_at: ts,
      }).run();

      // Seed a single sync source for each enabled config so continuous-sync UX has something to show
      if (enabled) {
        db.insert(sync_sources).values({
          id: `src_${d.id}_default`,
          integration_config_id: `cfg_${d.id}`,
          source_type:
            d.category === "document_storage"
              ? "folder"
              : d.category === "email_calendar"
              ? d.id.includes("calendar") ? "calendar" : "label"
              : d.category === "ar_platform"
              ? "project"
              : "feed",
          external_id: "default",
          label: "Default scope",
          config: JSON.stringify({
            attachments_included: d.category === "document_storage",
            anonymised_learning_permission: true,
            retention_days: 365,
          }),
          enabled: true,
          created_at: ts,
        }).run();
      }
    }
  }

  // Seed workstreams (mapped from current front-end demo data)
  const existingWs = db.select().from(workstreams).all();
  if (existingWs.length === 0) {
    const seed: Omit<Workstream, "keywords" | "meta">[] = [
      { id: "w1", customer_id: "northstar", name: "Gartner MQ — Application Modernisation 2026", firm: "Gartner", model: "Magic Quadrant", market: "App Modernisation", status: "Active", due_date: "12 Jun" },
      { id: "w2", customer_id: "northstar", name: "Forrester Wave — Modern Application Development Services", firm: "Forrester", model: "Wave", market: "DevOps", status: "At risk", due_date: "28 May" },
      { id: "w3", customer_id: "northstar", name: "Everest PEAK Matrix — BFSI IT Services", firm: "Everest Group", model: "PEAK Matrix", market: "BFSI", status: "Active", due_date: "19 Jun" },
      { id: "w4", customer_id: "northstar", name: "HFS Horizons — Generative Enterprise Services", firm: "HFS Research", model: "Horizons", market: "OneEcosystem", status: "Blocked", due_date: "05 Jul" },
      { id: "w5", customer_id: "northstar", name: "IDC MarketScape — AI Services Worldwide", firm: "IDC", model: "MarketScape", market: "AI Services", status: "Submitted", due_date: "30 May" },
    ];
    for (const ws of seed) {
      db.insert(workstreams).values({
        ...ws,
        keywords: JSON.stringify(keywordsForWorkstream(ws.name, ws.market ?? "", ws.model)),
        meta: "{}",
      }).run();
    }
  }

  // Seed analysts
  const existingA = db.select().from(analysts).all();
  if (existingA.length === 0) {
    const ts = now();
    const seed: (Omit<Analyst, "coverage" | "last_interaction_at"> & { coverage: string[] })[] = [
      { id: "a1", name: "Priya Subramanian", firm: "Gartner", firm_tier: "Tier 1", role: "VP Analyst, Application Services", rating: "A+", rating_overridden: false, confidence: 92, source: "External import", coverage: ["App Modernisation", "Cloud Native"] },
      { id: "a2", name: "Marcus Halberg", firm: "Gartner", firm_tier: "Tier 1", role: "Sr Director Analyst, Outsourcing", rating: "A", rating_overridden: false, confidence: 88, source: "External import", coverage: ["IT Outsourcing", "Managed Services"] },
      { id: "a3", name: "Jia Wen Chen", firm: "Forrester", firm_tier: "Tier 1", role: "Principal Analyst, Modern Application Dev", rating: "A", rating_overridden: false, confidence: 85, source: "Public discovery", coverage: ["DevOps", "Platform Engineering"] },
      { id: "a4", name: "Robert Allnatt", firm: "Forrester", firm_tier: "Tier 1", role: "VP, Principal Analyst", rating: "B+", rating_overridden: false, confidence: 74, source: "Public discovery", coverage: ["Digital Engineering"] },
      { id: "a5", name: "Aditi Rao", firm: "IDC", firm_tier: "Tier 1", role: "Research Director, Services", rating: "A", rating_overridden: false, confidence: 81, source: "External import", coverage: ["AI Services", "Digital Workplace"] },
      { id: "a6", name: "Tomás Bauer", firm: "Everest Group", firm_tier: "Tier 2", role: "Practice Director, BFSI", rating: "A", rating_overridden: false, confidence: 84, source: "External import", coverage: ["BFSI", "AI Operations"] },
      { id: "a7", name: "Saurabh Khanna", firm: "HFS Research", firm_tier: "Tier 2", role: "EVP, OneEcosystem", rating: "B+", rating_overridden: false, confidence: 70, source: "External import", coverage: ["OneEcosystem", "Sourcing"] },
      { id: "a8", name: "Karen Liu", firm: "NelsonHall", firm_tier: "Tier 2", role: "Research Director", rating: "B", rating_overridden: false, confidence: 65, source: "Public discovery", coverage: ["Sourcing", "ITS"] },
      { id: "a9", name: "Stefano Vella", firm: "ISG", firm_tier: "Tier 2", role: "Lead Analyst, Provider Lens", rating: "B", rating_overridden: false, confidence: 60, source: "Public discovery", coverage: ["Provider Lens"] },
    ];
    for (const a of seed) {
      db.insert(analysts).values({
        id: a.id, name: a.name, firm: a.firm, firm_tier: a.firm_tier, role: a.role,
        rating: a.rating, rating_overridden: a.rating_overridden, confidence: a.confidence,
        source: a.source, coverage: JSON.stringify(a.coverage), last_interaction_at: ts,
      }).run();
      // Seed initial stance
      db.insert(analyst_relationship_stances).values({
        id: `stance_${a.id}_init`,
        analyst_id: a.id,
        stance: a.firm === "Gartner" || a.firm === "IDC" ? "Friendly" : a.firm === "Forrester" ? "Inattentive" : "Neutral",
        confidence: 60,
        source: "ar_manual",
        note: "Initial stance (demo data).",
        suggested: false,
        visible_in_leader_lens: false,
        recorded_at: ts,
      }).run();
    }
  }

  // Seed leader-lens briefs (one current generation per lens)
  const existingBriefs = db.select().from(leader_lens_briefs).all();
  if (existingBriefs.length === 0) {
    const ts = now();
    const seed = [
      { lens: "strategy", summary: "Northstar's analyst-visible strategy must over-index on App Modernisation and BFSI AI Operations.", points: ["Sequence Gartner MQ as anchor narrative", "Re-state BFSI AI Operations point of view in time for Forrester Wave and IDC MarketScape", "Decide whether to pursue HFS Horizons this cycle or defer"] },
      { lens: "executive", summary: "Three of five active assessments are on or ahead of plan. Forrester Wave is at risk; HFS Horizons is blocked.", points: ["Pipeline: 5 active assessments", "Risk: 2 assessments depend on the same 2 BFSI references", "Investment ask: strategy session on HFS Horizons"] },
      { lens: "product", summary: "Capability and evidence gaps cluster around AI-assisted developer tooling and partner-led delivery.", points: ["Capability gap: AI-assisted developer co-pilot", "Evidence gap: multi-tier partner delivery", "Suggested next step: strategy session on Horizons readiness"] },
      { lens: "marketing", summary: "Internal marketing guidance only.", points: ["Sharpen internal narrative on App Modernisation", "Reposition BFSI AI co-pilot collateral for analyst briefings", "Do not externalise analyst quotes without explicit approval"] },
      { lens: "commercial", summary: "Analyst influence enablement for internal sales leaders.", points: ["Equip BFSI sales leaders with 2-pager", "Brief NA Banking pursuit team", "Restrict use of NDA-only analyst quotes"] },
    ];
    for (const b of seed) {
      db.insert(leader_lens_briefs).values({
        id: `brief_${b.lens}_1`,
        lens: b.lens,
        summary: b.summary,
        points: JSON.stringify(b.points),
        generation: 1,
        generated_at: ts,
      }).run();
    }
  }

  // Seed initial learning signals
  const existingLearning = db.select().from(learning_signals).all();
  if (existingLearning.length === 0) {
    const ts = now();
    const seed = [
      { signal: "Gartner MQ: vendors who present 2+ BFSI references see 17% higher 'Ability to Execute' lift.", scope: "Gartner MQ — App Modernisation", state: "Candidate pattern", anonymised: true, reviewer: "AnalystGenius validation pending", head_researcher_validated: false },
      { signal: "IDC MarketScape AI Services: client outcome quotes outperform capability claims 2:1.", scope: "IDC MarketScape — AI Services", state: "Validated", anonymised: true, reviewer: "Cross-checked by AnalystGenius", head_researcher_validated: true },
      { signal: "Forrester Wave: vendors who decline strategy demo lose 1–2 criteria points on average.", scope: "Forrester Wave — services categories", state: "Watchlist", anonymised: true, reviewer: "AnalystGenius monitoring", head_researcher_validated: false },
      { signal: "Everest PEAK BFSI: AI-assisted operations evidence weighs heavier in 2026 cycle.", scope: "Everest PEAK BFSI", state: "Raw signal", anonymised: true, reviewer: "Not yet reviewed", head_researcher_validated: false },
    ];
    for (const ls of seed) {
      db.insert(learning_signals).values({
        id: `ls_${randomUUID()}`,
        ...ls,
        created_at: ts,
      }).run();
    }
  }
}

function keywordsForWorkstream(name: string, market: string, model: string): string[] {
  const out = new Set<string>();
  for (const s of [name, market, model]) {
    s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean).forEach((t) => {
      if (t.length > 2) out.add(t);
    });
  }
  return Array.from(out);
}

bootstrap();

// ============================================================================
// Storage interface
// ============================================================================
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Customers
  listCustomers(): Customer[];
  // Connectors
  listConnectors(): { id: string; name: string; category: string; vendor: string | null; capabilities: Record<string, unknown>; default_mode: string; notes: string | null }[];
  // Integration configs
  listIntegrationConfigs(customerId?: string): IntegrationConfig[];
  getIntegrationConfig(id: string): IntegrationConfig | undefined;
  updateIntegrationConfig(id: string, patch: Partial<IntegrationConfig>): IntegrationConfig | undefined;
  // Sync sources
  listSyncSources(configId: string): SyncSource[];
  createSyncSource(input: InsertSyncSource): SyncSource;
  updateSyncSource(id: string, patch: Partial<SyncSource>): SyncSource | undefined;
  deleteSyncSource(id: string): void;
  // Sync runs
  createSyncRun(input: Omit<SyncRun, "id" | "finished_at"> & { id?: string }): SyncRun;
  finishSyncRun(id: string, patch: Partial<SyncRun>): SyncRun | undefined;
  listSyncRuns(limit?: number): SyncRun[];
  // Synced items
  insertSyncedItem(item: Omit<SyncedItem, "ingested_at">): SyncedItem;
  listSyncedItems(limit?: number): SyncedItem[];
  // Workstreams
  listWorkstreams(): Workstream[];
  // Analysts
  listAnalysts(): Analyst[];
  getAnalyst(id: string): Analyst | undefined;
  updateAnalyst(id: string, patch: Partial<Analyst>): Analyst | undefined;
  // Stances
  listStances(analystId?: string): StanceRecord[];
  insertStance(input: Omit<StanceRecord, "id" | "recorded_at"> & { id?: string }): StanceRecord;
  // Interactions
  listInteractions(): Interaction[];
  createInteraction(input: InsertInteraction & { source?: string; needs_confirmation?: boolean; synced_item_id?: string }): Interaction;
  updateInteraction(id: string, patch: Partial<Interaction>): Interaction | undefined;
  // Tasks
  listTasks(): Task[];
  createTask(input: InsertTask): Task;
  updateTask(id: string, patch: Partial<Task>): Task | undefined;
  // Evidence
  listEvidence(): EvidenceItem[];
  createEvidence(input: InsertEvidenceItem): EvidenceItem;
  updateEvidence(id: string, patch: Partial<EvidenceItem>): EvidenceItem | undefined;
  // Leader-lens briefs
  listLatestBriefs(): LeaderLensBrief[];
  upsertBrief(lens: string, summary: string, points: string[]): LeaderLensBrief;
  // Learning signals
  listLearningSignals(): LearningSignal[];
  createLearningSignal(input: InsertLearningSignal): LearningSignal;
  updateLearningSignal(id: string, patch: Partial<LearningSignal>): LearningSignal | undefined;
  // Assessment profiles
  listAssessmentProfiles(workstreamId?: string): AssessmentProfile[];
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number) {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  async getUserByUsername(username: string) {
    return db.select().from(users).where(eq(users.username, username)).get();
  }
  async createUser(insertUser: InsertUser) {
    return db.insert(users).values(insertUser).returning().get();
  }

  listCustomers() {
    return db.select().from(customers).all();
  }

  listConnectors() {
    return db
      .select()
      .from(connectorsTable)
      .all()
      .map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        vendor: c.vendor,
        capabilities: JSON.parse(c.capabilities || "{}"),
        default_mode: c.default_mode,
        notes: c.notes,
      }));
  }

  listIntegrationConfigs(customerId?: string) {
    if (customerId) {
      return db.select().from(integration_configs).where(eq(integration_configs.customer_id, customerId)).all();
    }
    return db.select().from(integration_configs).all();
  }

  getIntegrationConfig(id: string) {
    return db.select().from(integration_configs).where(eq(integration_configs.id, id)).get();
  }

  updateIntegrationConfig(id: string, patch: Partial<IntegrationConfig>) {
    const existing = this.getIntegrationConfig(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, updated_at: now() };
    db.update(integration_configs).set(updated).where(eq(integration_configs.id, id)).run();
    return updated;
  }

  listSyncSources(configId: string) {
    return db.select().from(sync_sources).where(eq(sync_sources.integration_config_id, configId)).all();
  }

  createSyncSource(input: InsertSyncSource) {
    const row: SyncSource = {
      id: input.id ?? `src_${randomUUID()}`,
      integration_config_id: input.integration_config_id,
      source_type: input.source_type,
      external_id: input.external_id ?? null,
      label: input.label,
      config: input.config ?? "{}",
      enabled: input.enabled ?? true,
      created_at: now(),
    };
    db.insert(sync_sources).values(row).run();
    return row;
  }

  updateSyncSource(id: string, patch: Partial<SyncSource>) {
    const existing = db.select().from(sync_sources).where(eq(sync_sources.id, id)).get();
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    db.update(sync_sources).set(updated).where(eq(sync_sources.id, id)).run();
    return updated;
  }

  deleteSyncSource(id: string) {
    db.delete(sync_sources).where(eq(sync_sources.id, id)).run();
  }

  createSyncRun(input: Omit<SyncRun, "id" | "finished_at"> & { id?: string }) {
    const row: SyncRun = {
      id: input.id ?? `run_${randomUUID()}`,
      integration_config_id: input.integration_config_id,
      sync_source_id: input.sync_source_id ?? null,
      started_at: input.started_at,
      finished_at: null,
      status: input.status,
      items_seen: input.items_seen ?? 0,
      items_imported: input.items_imported ?? 0,
      trigger: input.trigger,
      message: input.message ?? null,
    };
    db.insert(sync_runs).values(row).run();
    return row;
  }

  finishSyncRun(id: string, patch: Partial<SyncRun>) {
    const existing = db.select().from(sync_runs).where(eq(sync_runs.id, id)).get();
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, finished_at: patch.finished_at ?? now() };
    db.update(sync_runs).set(updated).where(eq(sync_runs.id, id)).run();
    return updated;
  }

  listSyncRuns(limit = 50) {
    return db.select().from(sync_runs).orderBy(desc(sync_runs.started_at)).limit(limit).all();
  }

  insertSyncedItem(item: Omit<SyncedItem, "ingested_at">) {
    const row: SyncedItem = { ...item, ingested_at: now() };
    db.insert(synced_items).values(row).run();
    return row;
  }

  listSyncedItems(limit = 100) {
    return db.select().from(synced_items).orderBy(desc(synced_items.ingested_at)).limit(limit).all();
  }

  listWorkstreams() {
    return db.select().from(workstreams).all();
  }

  listAnalysts() {
    return db.select().from(analysts).all();
  }

  getAnalyst(id: string) {
    return db.select().from(analysts).where(eq(analysts.id, id)).get();
  }

  updateAnalyst(id: string, patch: Partial<Analyst>) {
    const existing = this.getAnalyst(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    db.update(analysts).set(updated).where(eq(analysts.id, id)).run();
    return updated;
  }

  listStances(analystId?: string) {
    if (analystId) {
      return db
        .select()
        .from(analyst_relationship_stances)
        .where(eq(analyst_relationship_stances.analyst_id, analystId))
        .orderBy(desc(analyst_relationship_stances.recorded_at))
        .all();
    }
    return db.select().from(analyst_relationship_stances).orderBy(desc(analyst_relationship_stances.recorded_at)).all();
  }

  insertStance(input: Omit<StanceRecord, "id" | "recorded_at"> & { id?: string }) {
    const row: StanceRecord = {
      id: input.id ?? `stance_${randomUUID()}`,
      analyst_id: input.analyst_id,
      stance: input.stance,
      confidence: input.confidence,
      source: input.source,
      note: input.note ?? null,
      suggested: input.suggested,
      visible_in_leader_lens: input.visible_in_leader_lens,
      recorded_at: now(),
    };
    db.insert(analyst_relationship_stances).values(row).run();
    return row;
  }

  listInteractions() {
    return db.select().from(interactions).orderBy(desc(interactions.occurred_at)).all();
  }

  createInteraction(input: InsertInteraction & { source?: string; needs_confirmation?: boolean; synced_item_id?: string }) {
    const row: Interaction = {
      id: input.id ?? `intx_${randomUUID()}`,
      analyst_id: input.analyst_id ?? null,
      workstream_id: input.workstream_id ?? null,
      type: input.type,
      title: input.title,
      notes: input.notes ?? null,
      occurred_at: input.occurred_at,
      source: input.source ?? "manual",
      needs_confirmation: input.needs_confirmation ?? false,
      synced_item_id: input.synced_item_id ?? null,
    };
    db.insert(interactions).values(row).run();
    return row;
  }

  updateInteraction(id: string, patch: Partial<Interaction>) {
    const existing = db.select().from(interactions).where(eq(interactions.id, id)).get();
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    db.update(interactions).set(updated).where(eq(interactions.id, id)).run();
    return updated;
  }

  listTasks() {
    return db.select().from(tasks).orderBy(desc(tasks.created_at)).all();
  }
  createTask(input: InsertTask) {
    const row: Task = {
      id: input.id ?? `task_${randomUUID()}`,
      workstream_id: input.workstream_id ?? null,
      analyst_id: input.analyst_id ?? null,
      title: input.title,
      detail: input.detail ?? null,
      due_date: input.due_date ?? null,
      state: input.state ?? "suggested",
      source: input.source ?? "system_suggestion",
      origin_synced_item_id: input.origin_synced_item_id ?? null,
      created_at: now(),
    };
    db.insert(tasks).values(row).run();
    return row;
  }
  updateTask(id: string, patch: Partial<Task>) {
    const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    db.update(tasks).set(updated).where(eq(tasks.id, id)).run();
    return updated;
  }

  listEvidence() {
    return db.select().from(evidence_items).orderBy(desc(evidence_items.created_at)).all();
  }
  createEvidence(input: InsertEvidenceItem) {
    const row: EvidenceItem = {
      id: input.id ?? `ev_${randomUUID()}`,
      workstream_id: input.workstream_id ?? null,
      title: input.title,
      detail: input.detail ?? null,
      reuse_level: input.reuse_level ?? "Internal only",
      status: input.status ?? "suggested",
      origin_synced_item_id: input.origin_synced_item_id ?? null,
      created_at: now(),
    };
    db.insert(evidence_items).values(row).run();
    return row;
  }
  updateEvidence(id: string, patch: Partial<EvidenceItem>) {
    const existing = db.select().from(evidence_items).where(eq(evidence_items.id, id)).get();
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    db.update(evidence_items).set(updated).where(eq(evidence_items.id, id)).run();
    return updated;
  }

  listLatestBriefs() {
    // Return the latest brief per lens
    const all = db.select().from(leader_lens_briefs).orderBy(desc(leader_lens_briefs.generated_at)).all();
    const seen = new Set<string>();
    const out: LeaderLensBrief[] = [];
    for (const b of all) {
      if (!seen.has(b.lens)) {
        seen.add(b.lens);
        out.push(b);
      }
    }
    return out;
  }
  upsertBrief(lens: string, summary: string, points: string[]) {
    const existing = db
      .select()
      .from(leader_lens_briefs)
      .where(eq(leader_lens_briefs.lens, lens))
      .orderBy(desc(leader_lens_briefs.generation))
      .get();
    const generation = (existing?.generation ?? 0) + 1;
    const row: LeaderLensBrief = {
      id: `brief_${lens}_${generation}`,
      lens,
      summary,
      points: JSON.stringify(points),
      generation,
      generated_at: now(),
    };
    db.insert(leader_lens_briefs).values(row).run();
    return row;
  }

  listLearningSignals() {
    return db.select().from(learning_signals).orderBy(desc(learning_signals.created_at)).all();
  }
  createLearningSignal(input: InsertLearningSignal) {
    const row: LearningSignal = {
      id: input.id ?? `ls_${randomUUID()}`,
      signal: input.signal,
      scope: input.scope ?? null,
      state: input.state ?? "Raw signal",
      anonymised: input.anonymised ?? true,
      reviewer: input.reviewer ?? null,
      head_researcher_validated: input.head_researcher_validated ?? false,
      created_at: now(),
    };
    db.insert(learning_signals).values(row).run();
    return row;
  }
  updateLearningSignal(id: string, patch: Partial<LearningSignal>) {
    const existing = db.select().from(learning_signals).where(eq(learning_signals.id, id)).get();
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    db.update(learning_signals).set(updated).where(eq(learning_signals.id, id)).run();
    return updated;
  }

  listAssessmentProfiles(workstreamId?: string) {
    if (workstreamId) {
      return db.select().from(assessment_profiles).where(eq(assessment_profiles.workstream_id, workstreamId)).all();
    }
    return db.select().from(assessment_profiles).all();
  }
}

export const storage = new DatabaseStorage();
