import type { ConnectorAdapter, ConnectorDescriptor } from "./types";
import { createMockAdapter } from "./mock-adapter";

// ============================================================================
// Connector descriptors. `api_available: null` means private/unknown — we won't
// pretend an external API exists for AR-platform vendors without published docs.
// All adapters are mock-backed today; real implementations would swap the
// adapter factory while the descriptor stays the same.
// ============================================================================

export const CONNECTOR_DESCRIPTORS: ConnectorDescriptor[] = [
  // ---------- Public intelligence ----------
  {
    id: "gartner_public",
    name: "Gartner.com public",
    category: "public_intelligence",
    vendor: "Gartner",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: false,
      api_available: false,
    },
    default_mode: "scheduled_sync",
    notes:
      "Public web pages and analyst profile feeds. No public Gartner API; production deployment would use a search/intel adapter (e.g. allowlisted web search) rather than a vendor API.",
  },
  {
    id: "forrester_public",
    name: "Forrester.com public",
    category: "public_intelligence",
    vendor: "Forrester",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: false,
      api_available: false,
    },
    default_mode: "scheduled_sync",
    notes: "Public-only. Wave previews, analyst posts, blog feeds.",
  },
  {
    id: "hfs_public",
    name: "HFS Research public",
    category: "public_intelligence",
    vendor: "HFS Research",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: false,
      api_available: false,
    },
    default_mode: "scheduled_sync",
    notes: "Public Horizons content and analyst posts.",
  },
  {
    id: "linkedin_public",
    name: "LinkedIn public posts",
    category: "public_intelligence",
    vendor: "LinkedIn",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "scheduled_sync",
    notes:
      "Watched-analyst public posts only. Live integration requires LinkedIn API approval; production would use search adapter as fallback.",
  },
  // ---------- AR platform ----------
  {
    id: "architect_arinsights",
    name: "ARchitect / ARInsights",
    category: "ar_platform",
    vendor: "ARInsights",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: false,
      continuous_sync: false,
      oauth_required: false,
      api_available: null,
    },
    default_mode: "manual_import",
    notes:
      "API availability private/unknown; ARchitect typically supports file/CSV exports. Adapter supports file-import + manual-import modes pending vendor confirmation.",
  },
  {
    id: "ar_connect",
    name: "AR Connect",
    category: "ar_platform",
    vendor: "AR Connect",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: false,
      continuous_sync: false,
      oauth_required: false,
      api_available: null,
    },
    default_mode: "manual_import",
    notes: "Briefing-request inbox. Vendor API access not yet confirmed.",
  },
  {
    id: "spotlight_oz",
    name: "Spotlight Oz",
    category: "ar_platform",
    vendor: "Spotlight Oz",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: false,
      continuous_sync: false,
      oauth_required: false,
      api_available: null,
    },
    default_mode: "manual_import",
    notes: "ANZ analyst portal. No published API.",
  },
  {
    id: "spotlight_analyst_portals",
    name: "Spotlight Analyst Portals",
    category: "ar_platform",
    vendor: "Spotlight",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: false,
      oauth_required: false,
      api_available: null,
    },
    default_mode: "manual_import",
    notes: "Per-house analyst portals. Treat as scheduled file-import for now.",
  },
  // ---------- Document storage ----------
  {
    id: "sharepoint",
    name: "SharePoint",
    category: "document_storage",
    vendor: "Microsoft",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "read_only",
    notes: "Microsoft Graph API. Per-customer scoped to AR Workspace site/folder.",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    category: "document_storage",
    vendor: "Microsoft",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "read_only",
    notes: "Microsoft Graph API.",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    category: "document_storage",
    vendor: "Google",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "off",
    notes: "Google Drive API.",
  },
  {
    id: "box",
    name: "Box",
    category: "document_storage",
    vendor: "Box",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "off",
    notes: "Box Content API.",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    category: "document_storage",
    vendor: "Dropbox",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "off",
    notes: "Dropbox API v2.",
  },
  // ---------- Email & calendar ----------
  {
    id: "outlook_mail",
    name: "Outlook Mail",
    category: "email_calendar",
    vendor: "Microsoft",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "continuous_sync",
    notes: "Microsoft Graph mail API. Scoped to AR shared mailbox(es).",
  },
  {
    id: "outlook_calendar",
    name: "Microsoft Calendar",
    category: "email_calendar",
    vendor: "Microsoft",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "continuous_sync",
    notes: "Microsoft Graph calendar API.",
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "email_calendar",
    vendor: "Google",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "off",
    notes: "Gmail API. Scoped via labels.",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "email_calendar",
    vendor: "Google",
    capabilities: {
      read_only: true,
      manual_import: true,
      scheduled_sync: true,
      continuous_sync: true,
      oauth_required: true,
      api_available: true,
    },
    default_mode: "off",
    notes: "Google Calendar API.",
  },
];

// Adapter registry: today every connector resolves to a mock adapter.
// Replacing a single entry with a real adapter (e.g. SharePointAdapter) leaves
// every route and storage path unchanged.
const ADAPTERS = new Map<string, ConnectorAdapter>();
for (const d of CONNECTOR_DESCRIPTORS) {
  ADAPTERS.set(d.id, createMockAdapter(d));
}

export function getAdapter(connectorId: string): ConnectorAdapter | undefined {
  return ADAPTERS.get(connectorId);
}

export function getDescriptor(connectorId: string): ConnectorDescriptor | undefined {
  return CONNECTOR_DESCRIPTORS.find((d) => d.id === connectorId);
}
