import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// Users (kept for compatibility with template)
// ============================================================================
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================================================
// Customers / Accounts
// ============================================================================
export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // JSON: { domains: string[], notes?: string }
  meta: text("meta").notNull().default("{}"),
});

export const insertCustomerSchema = createInsertSchema(customers);
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// ============================================================================
// Connector registry entries (catalogue of supported integrations).
// Stored as data so admins can later add custom adapters.
// ============================================================================
export const connectors = sqliteTable("connectors", {
  id: text("id").primaryKey(), // e.g. "sharepoint", "gartner_public"
  name: text("name").notNull(),
  category: text("category").notNull(), // public_intelligence | ar_platform | document_storage | email_calendar
  vendor: text("vendor"),
  // JSON capabilities: { read_only, manual_import, scheduled_sync, continuous_sync, oauth_required, api_available }
  capabilities: text("capabilities").notNull().default("{}"),
  // Default mode the connector can run in
  default_mode: text("default_mode").notNull().default("manual_import"),
  // Notes / public documentation references
  notes: text("notes"),
});

export type Connector = typeof connectors.$inferSelect;
export const insertConnectorSchema = createInsertSchema(connectors);
export type InsertConnector = z.infer<typeof insertConnectorSchema>;

// ============================================================================
// Integration configs: per-customer instance of a connector
// ============================================================================
export const integration_configs = sqliteTable("integration_configs", {
  id: text("id").primaryKey(),
  connector_id: text("connector_id").notNull(),
  customer_id: text("customer_id"), // null = global
  display_name: text("display_name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  mode: text("mode").notNull().default("off"), // off | read_only | manual_import | scheduled_sync | continuous_sync
  // backend status reported by adapter: needs_auth | mock_mode | connected | error | off
  status: text("status").notNull().default("mock_mode"),
  status_detail: text("status_detail"),
  // JSON: arbitrary auth params (api keys, oauth tokens). In mock mode this is empty.
  credentials: text("credentials").notNull().default("{}"),
  last_test_at: integer("last_test_at"),
  last_sync_at: integer("last_sync_at"),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export type IntegrationConfig = typeof integration_configs.$inferSelect;
export const insertIntegrationConfigSchema = createInsertSchema(integration_configs).omit({
  created_at: true,
  updated_at: true,
});
export type InsertIntegrationConfig = z.infer<typeof insertIntegrationConfigSchema>;

// ============================================================================
// Sync sources: scoped subsets of an integration config (folders, calendars,
// mailbox labels, domains, projects ...)
// ============================================================================
export const sync_sources = sqliteTable("sync_sources", {
  id: text("id").primaryKey(),
  integration_config_id: text("integration_config_id").notNull(),
  source_type: text("source_type").notNull(), // folder | calendar | label | project | domain | feed
  external_id: text("external_id"), // upstream identifier (path, mailbox, etc.)
  label: text("label").notNull(),
  // JSON: continuous sync config including: { attachments_included: bool, anonymised_learning_permission: bool, retention_days: number, keywords?: string[] }
  config: text("config").notNull().default("{}"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  created_at: integer("created_at").notNull(),
});

export type SyncSource = typeof sync_sources.$inferSelect;
export const insertSyncSourceSchema = createInsertSchema(sync_sources).omit({ created_at: true }).partial({ id: true });
export type InsertSyncSource = z.infer<typeof insertSyncSourceSchema>;

// ============================================================================
// Sync runs: each invocation of an adapter's sync()
// ============================================================================
export const sync_runs = sqliteTable("sync_runs", {
  id: text("id").primaryKey(),
  integration_config_id: text("integration_config_id").notNull(),
  sync_source_id: text("sync_source_id"),
  started_at: integer("started_at").notNull(),
  finished_at: integer("finished_at"),
  status: text("status").notNull().default("running"), // running | success | partial | error
  items_seen: integer("items_seen").notNull().default(0),
  items_imported: integer("items_imported").notNull().default(0),
  trigger: text("trigger").notNull().default("manual"), // manual | scheduled | continuous
  message: text("message"),
});

export type SyncRun = typeof sync_runs.$inferSelect;

// ============================================================================
// Synced items: normalised records pulled from any adapter
// ============================================================================
export const synced_items = sqliteTable("synced_items", {
  id: text("id").primaryKey(),
  integration_config_id: text("integration_config_id").notNull(),
  sync_source_id: text("sync_source_id"),
  sync_run_id: text("sync_run_id"),
  // canonical type: email | calendar_event | document | analyst_research | post | briefing_request | manual_import
  type: text("type").notNull(),
  external_id: text("external_id"),
  title: text("title").notNull(),
  body_excerpt: text("body_excerpt"),
  url: text("url"),
  // JSON tags & signal extraction: { analyst_names?: string[], firms?: string[], markets?: string[], file_path?, sender_domain?, keywords?: string[], dates?: string[] }
  signals: text("signals").notNull().default("{}"),
  occurred_at: integer("occurred_at"),
  ingested_at: integer("ingested_at").notNull(),
  workstream_id: text("workstream_id"), // auto-linked workstream
  link_confidence: integer("link_confidence").notNull().default(0), // 0-100
  link_reason: text("link_reason"),
});

export type SyncedItem = typeof synced_items.$inferSelect;

// ============================================================================
// Workstreams (analyst assessments / engagements)
// ============================================================================
export const workstreams = sqliteTable("workstreams", {
  id: text("id").primaryKey(),
  customer_id: text("customer_id"),
  name: text("name").notNull(),
  firm: text("firm").notNull(),
  model: text("model").notNull(),
  market: text("market"),
  status: text("status").notNull().default("Active"), // Active | At risk | Blocked | Submitted | Closed
  due_date: text("due_date"),
  // JSON: keywords used by auto-link
  keywords: text("keywords").notNull().default("[]"),
  // JSON: capability bands etc. {bands: {label, band}[]}
  meta: text("meta").notNull().default("{}"),
});

export type Workstream = typeof workstreams.$inferSelect;
export const insertWorkstreamSchema = createInsertSchema(workstreams);
export type InsertWorkstream = z.infer<typeof insertWorkstreamSchema>;

// ============================================================================
// Analysts
// ============================================================================
export const analysts = sqliteTable("analysts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  firm: text("firm").notNull(),
  firm_tier: text("firm_tier").notNull(),
  role: text("role"),
  // System-assigned rating (A+, A, B+, B)
  rating: text("rating").notNull().default("B"),
  rating_overridden: integer("rating_overridden", { mode: "boolean" }).notNull().default(false),
  confidence: integer("confidence").notNull().default(50), // 0-100
  coverage: text("coverage").notNull().default("[]"), // JSON string[]
  source: text("source").notNull().default("Public discovery"),
  last_interaction_at: integer("last_interaction_at"),
});

export type Analyst = typeof analysts.$inferSelect;
export const insertAnalystSchema = createInsertSchema(analysts);
export type InsertAnalyst = z.infer<typeof insertAnalystSchema>;

// ============================================================================
// Analyst relationship stances (history; current = latest row)
// ============================================================================
export const analyst_relationship_stances = sqliteTable("analyst_relationship_stances", {
  id: text("id").primaryKey(),
  analyst_id: text("analyst_id").notNull(),
  stance: text("stance").notNull(), // Friendly | Neutral | Inattentive | Irrelevant | Combative | Unknown
  confidence: integer("confidence").notNull().default(50),
  // source of stance signal: "system_suggestion" | "ar_confirmed" | "ar_manual"
  source: text("source").notNull().default("ar_manual"),
  note: text("note"),
  // If true, this is a suggested update that has not yet been accepted by AR
  suggested: integer("suggested", { mode: "boolean" }).notNull().default(false),
  visible_in_leader_lens: integer("visible_in_leader_lens", { mode: "boolean" }).notNull().default(false),
  recorded_at: integer("recorded_at").notNull(),
});

export type StanceRecord = typeof analyst_relationship_stances.$inferSelect;

// ============================================================================
// Interactions (briefings, inquiries, emails, calls)
// ============================================================================
export const interactions = sqliteTable("interactions", {
  id: text("id").primaryKey(),
  analyst_id: text("analyst_id"),
  workstream_id: text("workstream_id"),
  type: text("type").notNull(), // briefing | inquiry | email | call | event
  title: text("title").notNull(),
  notes: text("notes"),
  occurred_at: integer("occurred_at").notNull(),
  source: text("source").notNull().default("manual"), // manual | auto_synced | imported
  needs_confirmation: integer("needs_confirmation", { mode: "boolean" }).notNull().default(false),
  synced_item_id: text("synced_item_id"),
});

export type Interaction = typeof interactions.$inferSelect;
export const insertInteractionSchema = createInsertSchema(interactions).partial({ id: true });
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;

// ============================================================================
// Tasks (suggested only in MVP)
// ============================================================================
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  workstream_id: text("workstream_id"),
  analyst_id: text("analyst_id"),
  title: text("title").notNull(),
  detail: text("detail"),
  due_date: text("due_date"),
  state: text("state").notNull().default("suggested"), // suggested | accepted | rejected | done
  source: text("source").notNull().default("system_suggestion"), // system_suggestion | manual
  origin_synced_item_id: text("origin_synced_item_id"),
  created_at: integer("created_at").notNull(),
});

export type Task = typeof tasks.$inferSelect;
export const insertTaskSchema = createInsertSchema(tasks).omit({ created_at: true }).partial({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;

// ============================================================================
// Evidence candidates / items
// ============================================================================
export const evidence_items = sqliteTable("evidence_items", {
  id: text("id").primaryKey(),
  workstream_id: text("workstream_id"),
  title: text("title").notNull(),
  detail: text("detail"),
  // Internal only | Analyst briefing approved under NDA | Analyst briefing approved no NDA required |
  // RFI approved | Marketing approved | Restricted | Expired
  reuse_level: text("reuse_level").notNull().default("Internal only"),
  // suggested | approved | rejected | restricted | expired
  status: text("status").notNull().default("suggested"),
  origin_synced_item_id: text("origin_synced_item_id"),
  created_at: integer("created_at").notNull(),
});

export type EvidenceItem = typeof evidence_items.$inferSelect;
export const insertEvidenceItemSchema = createInsertSchema(evidence_items).omit({ created_at: true }).partial({ id: true });
export type InsertEvidenceItem = z.infer<typeof insertEvidenceItemSchema>;

// ============================================================================
// Leader-lens briefs (Strategy / Executive / Product / Marketing / Commercial)
// ============================================================================
export const leader_lens_briefs = sqliteTable("leader_lens_briefs", {
  id: text("id").primaryKey(),
  lens: text("lens").notNull(), // strategy | executive | product | marketing | commercial
  summary: text("summary").notNull(),
  points: text("points").notNull().default("[]"), // JSON string[]
  generation: integer("generation").notNull().default(1),
  generated_at: integer("generated_at").notNull(),
});

export type LeaderLensBrief = typeof leader_lens_briefs.$inferSelect;

// ============================================================================
// Learning signals: Raw signal | Candidate pattern | Watchlist | Validated | Deprecated | Rejected
// ============================================================================
export const learning_signals = sqliteTable("learning_signals", {
  id: text("id").primaryKey(),
  signal: text("signal").notNull(),
  scope: text("scope"),
  state: text("state").notNull().default("Raw signal"),
  anonymised: integer("anonymised", { mode: "boolean" }).notNull().default(true),
  reviewer: text("reviewer"),
  // Whether AnalystGenius head researcher has validated for shared model update
  head_researcher_validated: integer("head_researcher_validated", { mode: "boolean" }).notNull().default(false),
  created_at: integer("created_at").notNull(),
});

export type LearningSignal = typeof learning_signals.$inferSelect;
export const insertLearningSignalSchema = createInsertSchema(learning_signals).omit({ created_at: true }).partial({ id: true });
export type InsertLearningSignal = z.infer<typeof insertLearningSignalSchema>;

// ============================================================================
// Assessment profiles (capability and evidence readiness per workstream)
// ============================================================================
export const assessment_profiles = sqliteTable("assessment_profiles", {
  id: text("id").primaryKey(),
  workstream_id: text("workstream_id").notNull(),
  criterion: text("criterion").notNull(),
  band: text("band").notNull(), // Strong | Adequate | Weak | Missing | Unsupported
  note: text("note"),
});

export type AssessmentProfile = typeof assessment_profiles.$inferSelect;
