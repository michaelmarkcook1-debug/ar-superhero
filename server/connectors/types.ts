// ============================================================================
// Connector adapter interface and shared types.
//
// MVP scope: real live integrations require credentials/OAuth/vendor API access
// that AnalystGenius does not yet have plumbed in. Each adapter therefore declares
// its capabilities honestly and exposes a mock path that returns sample data so the
// UI can demonstrate the end-to-end sync/auto-link/suggestion flow. Real adapter
// implementations would replace the mock `sync()` body with API/OAuth calls without
// changing the surrounding contracts.
// ============================================================================

export type ConnectorCategory =
  | "public_intelligence"
  | "ar_platform"
  | "document_storage"
  | "email_calendar";

export type ConnectorMode =
  | "off"
  | "read_only"
  | "manual_import"
  | "scheduled_sync"
  | "continuous_sync";

export type ConnectorStatus =
  | "off"
  | "needs_auth"
  | "mock_mode"
  | "connected"
  | "error";

export interface ConnectorCapabilities {
  read_only: boolean;
  manual_import: boolean;
  scheduled_sync: boolean;
  continuous_sync: boolean;
  oauth_required: boolean;
  // null = unknown / private; true = public docs exist; false = no API offered
  api_available: boolean | null;
}

export interface ConnectorDescriptor {
  id: string;
  name: string;
  category: ConnectorCategory;
  vendor?: string;
  capabilities: ConnectorCapabilities;
  default_mode: ConnectorMode;
  notes?: string;
}

export interface ListSourcesResult {
  external_id: string;
  label: string;
  source_type: string; // folder | calendar | label | project | domain | feed
  attachments_supported?: boolean;
}

export interface NormalisedItem {
  external_id: string;
  type:
    | "email"
    | "calendar_event"
    | "document"
    | "analyst_research"
    | "post"
    | "briefing_request"
    | "manual_import";
  title: string;
  body_excerpt?: string;
  url?: string;
  occurred_at?: Date;
  signals: {
    analyst_names?: string[];
    firms?: string[];
    markets?: string[];
    file_path?: string;
    sender_domain?: string;
    keywords?: string[];
    dates?: string[];
    assessment_type?: string;
  };
}

export interface TestConnectionResult {
  status: ConnectorStatus;
  message: string;
}

export interface SyncContext {
  configId: string;
  syncSourceId?: string;
  trigger: "manual" | "scheduled" | "continuous";
  credentials: Record<string, unknown>;
  sourceConfig: Record<string, unknown>;
}

export interface SyncResult {
  items: NormalisedItem[];
  message?: string;
}

export interface ConnectorAdapter {
  descriptor: ConnectorDescriptor;
  testConnection(credentials: Record<string, unknown>): Promise<TestConnectionResult>;
  listSources(credentials: Record<string, unknown>): Promise<ListSourcesResult[]>;
  sync(ctx: SyncContext): Promise<SyncResult>;
  normaliseItem(raw: unknown): NormalisedItem;
}
