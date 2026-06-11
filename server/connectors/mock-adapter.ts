import type {
  ConnectorAdapter,
  ConnectorDescriptor,
  ListSourcesResult,
  NormalisedItem,
  SyncContext,
  SyncResult,
  TestConnectionResult,
} from "./types";

// ============================================================================
// MockAdapter
// Realistic-looking sample data per connector category so the AR Command Centre,
// auto-link/suggestion services, and Integrations admin can demonstrate flow.
// Mock data is sample-only; never claims a live connection.
// ============================================================================

type SampleItem = Omit<NormalisedItem, "external_id" | "occurred_at"> & {
  daysAgo?: number;
};

const SAMPLES: Record<string, SampleItem[]> = {
  // Public intelligence
  gartner_public: [
    {
      type: "analyst_research",
      title: "Note: Application Modernisation 2026 priorities",
      body_excerpt:
        "Gartner observes accelerated demand for AI-assisted modernisation, with named vendors increasingly evaluated on co-pilot capability and partner-led delivery.",
      url: "https://example.invalid/gartner/note/app-mod-2026",
      signals: {
        analyst_names: ["Priya Subramanian"],
        firms: ["Gartner"],
        markets: ["App Modernisation"],
        keywords: ["AI-assisted", "Magic Quadrant", "modernisation"],
        assessment_type: "Magic Quadrant",
      },
    },
  ],
  forrester_public: [
    {
      type: "analyst_research",
      title: "Forrester Wave preview: AI-assisted developer tooling",
      body_excerpt:
        "Inclusion criteria require referenceable production deployments across two regions. Vendors without BFSI references will struggle on the 'AI-assisted dev tooling' criterion.",
      url: "https://example.invalid/forrester/wave-preview",
      signals: {
        analyst_names: ["Jia Wen Chen"],
        firms: ["Forrester"],
        markets: ["DevOps", "Platform Engineering"],
        keywords: ["Wave", "BFSI", "references"],
        assessment_type: "Forrester Wave",
      },
    },
  ],
  hfs_public: [
    {
      type: "analyst_research",
      title: "HFS Horizons: OneEcosystem narrative deep dive",
      body_excerpt:
        "HFS reiterates that Horizons leaders demonstrate multi-tier ecosystem outcomes. Vendors with weak partner storytelling are unlikely to clear Horizon 2.",
      url: "https://example.invalid/hfs/horizons-oneecosystem",
      signals: {
        analyst_names: ["Saurabh Khanna"],
        firms: ["HFS Research"],
        markets: ["OneEcosystem"],
        keywords: ["Horizons", "ecosystem", "partner"],
        assessment_type: "HFS Horizons",
      },
    },
  ],
  linkedin_public: [
    {
      type: "post",
      title: "LinkedIn post — Tomás Bauer (Everest)",
      body_excerpt:
        "Tomás Bauer shared a post on BFSI AI Operations momentum — references AnalystGenius point of view on AI-assisted operations.",
      url: "https://example.invalid/linkedin/post/123",
      signals: {
        analyst_names: ["Tomás Bauer"],
        firms: ["Everest Group"],
        markets: ["BFSI AI Operations"],
        keywords: ["BFSI", "AI operations", "PEAK"],
        assessment_type: "Everest PEAK",
      },
    },
  ],
  // AR platform
  architect_arinsights: [
    {
      type: "briefing_request",
      title: "ARchitect — Briefing request: Northstar BFSI AI co-pilot",
      body_excerpt:
        "Inquiry from Tomás Bauer requesting a 30-minute deep-dive on BFSI AI co-pilot deployments.",
      signals: {
        analyst_names: ["Tomás Bauer"],
        firms: ["Everest Group"],
        markets: ["BFSI"],
        keywords: ["briefing", "BFSI", "AI co-pilot"],
        assessment_type: "Everest PEAK",
      },
    },
  ],
  ar_connect: [
    {
      type: "briefing_request",
      title: "AR Connect — Inquiry from Aditi Rao",
      body_excerpt: "IDC MarketScape inquiry — requesting AI Services point of view.",
      signals: {
        analyst_names: ["Aditi Rao"],
        firms: ["IDC"],
        markets: ["AI Services"],
        keywords: ["MarketScape", "AI Services"],
        assessment_type: "IDC MarketScape",
      },
    },
  ],
  spotlight_oz: [
    {
      type: "briefing_request",
      title: "Spotlight Oz — ANZ analyst inquiry",
      body_excerpt: "ANZ analyst requesting follow-up; mock connector, no live API.",
      signals: { firms: ["Other"], keywords: ["ANZ"] },
    },
  ],
  spotlight_analyst_portals: [
    {
      type: "document",
      title: "Spotlight portal — Vendor questionnaire status",
      body_excerpt: "Two open questionnaires across Gartner MQ and IDC MarketScape.",
      signals: {
        firms: ["Gartner", "IDC"],
        keywords: ["questionnaire", "submission"],
      },
    },
  ],
  // Document storage
  sharepoint: [
    {
      type: "document",
      title: "AR Submissions / Gartner_MQ_AppMod_Submission_v3.docx",
      body_excerpt:
        "Latest Magic Quadrant submission draft including AI-assisted modernisation criteria and BFSI references.",
      signals: {
        firms: ["Gartner"],
        markets: ["App Modernisation"],
        file_path: "/AR Submissions/Gartner_MQ_AppMod_Submission_v3.docx",
        keywords: ["MQ", "submission"],
        assessment_type: "Magic Quadrant",
      },
    },
  ],
  onedrive: [
    {
      type: "document",
      title: "AR team folder / BFSI_AI_CoPilot_CaseStudies.xlsx",
      body_excerpt: "Case-study tracker across BFSI AI co-pilot pursuits.",
      signals: {
        markets: ["BFSI"],
        file_path: "/AR Team/BFSI_AI_CoPilot_CaseStudies.xlsx",
        keywords: ["BFSI", "case study", "AI co-pilot"],
      },
    },
  ],
  google_drive: [
    {
      type: "document",
      title: "Forrester_Wave_Capability_Map.pptx",
      body_excerpt: "Capability map keyed to Forrester Wave criteria.",
      signals: {
        firms: ["Forrester"],
        file_path: "/AR Shared/Forrester_Wave_Capability_Map.pptx",
        keywords: ["Wave", "capability"],
        assessment_type: "Forrester Wave",
      },
    },
  ],
  box: [
    {
      type: "document",
      title: "Box archive — HFS Horizons reference letters",
      signals: {
        firms: ["HFS Research"],
        keywords: ["Horizons", "references"],
        assessment_type: "HFS Horizons",
      },
    },
  ],
  dropbox: [
    {
      type: "document",
      title: "Dropbox / NelsonHall_NEAT_response_draft.docx",
      signals: {
        firms: ["NelsonHall"],
        keywords: ["NEAT", "response"],
        assessment_type: "NelsonHall NEAT",
      },
    },
  ],
  // Email & calendar
  outlook_mail: [
    {
      type: "email",
      title: "Re: Gartner MQ — EMEA Banking references",
      body_excerpt:
        "Priya Subramanian: 'Please add two more EMEA Banking references; the current list is heavy on North America.'",
      signals: {
        analyst_names: ["Priya Subramanian"],
        firms: ["Gartner"],
        markets: ["App Modernisation"],
        sender_domain: "gartner.com",
        keywords: ["references", "EMEA", "Banking"],
        assessment_type: "Magic Quadrant",
      },
    },
  ],
  outlook_calendar: [
    {
      type: "calendar_event",
      title: "Everest BFSI briefing — Tomás Bauer",
      body_excerpt: "Briefing with Tomás Bauer (Everest) — BFSI AI operations point of view.",
      signals: {
        analyst_names: ["Tomás Bauer"],
        firms: ["Everest Group"],
        markets: ["BFSI"],
        keywords: ["briefing", "BFSI"],
        assessment_type: "Everest PEAK",
      },
    },
  ],
  gmail: [
    {
      type: "email",
      title: "HFS Horizons questionnaire follow-up",
      body_excerpt: "Saurabh Khanna requested additional ecosystem narrative within 5 business days.",
      signals: {
        analyst_names: ["Saurabh Khanna"],
        firms: ["HFS Research"],
        markets: ["OneEcosystem"],
        sender_domain: "hfsresearch.com",
        keywords: ["ecosystem", "follow-up"],
        assessment_type: "HFS Horizons",
      },
    },
  ],
  google_calendar: [
    {
      type: "calendar_event",
      title: "IDC MarketScape — Aditi Rao briefing",
      body_excerpt: "30-minute briefing slot for IDC MarketScape AI Services.",
      signals: {
        analyst_names: ["Aditi Rao"],
        firms: ["IDC"],
        markets: ["AI Services"],
        keywords: ["MarketScape", "briefing"],
        assessment_type: "IDC MarketScape",
      },
    },
  ],
};

const SAMPLE_SOURCES: Record<string, ListSourcesResult[]> = {
  gartner_public: [{ external_id: "feed:watched-analysts", label: "Watched analysts feed", source_type: "feed" }],
  forrester_public: [{ external_id: "feed:wave-categories", label: "Wave categories feed", source_type: "feed" }],
  hfs_public: [{ external_id: "feed:horizons", label: "Horizons feed", source_type: "feed" }],
  linkedin_public: [{ external_id: "feed:analyst-posts", label: "Analyst public posts", source_type: "feed" }],
  architect_arinsights: [{ external_id: "project:active-workstreams", label: "Active workstreams", source_type: "project" }],
  ar_connect: [{ external_id: "project:briefings", label: "Briefing requests", source_type: "project" }],
  spotlight_oz: [{ external_id: "project:anz", label: "ANZ analysts", source_type: "project" }],
  spotlight_analyst_portals: [{ external_id: "project:active-assessments", label: "Active assessments", source_type: "project" }],
  sharepoint: [
    { external_id: "folder:/AR Submissions", label: "/AR Submissions", source_type: "folder", attachments_supported: true },
    { external_id: "folder:/Case Studies", label: "/Case Studies", source_type: "folder", attachments_supported: true },
  ],
  onedrive: [{ external_id: "folder:/AR Team", label: "AR Team folder", source_type: "folder", attachments_supported: true }],
  google_drive: [{ external_id: "folder:/AR Shared", label: "AR Shared", source_type: "folder", attachments_supported: true }],
  box: [{ external_id: "folder:/AR Archive", label: "AR Archive", source_type: "folder", attachments_supported: true }],
  dropbox: [{ external_id: "folder:/AR Dropbox", label: "AR Dropbox folder", source_type: "folder", attachments_supported: true }],
  outlook_mail: [{ external_id: "label:ar@northstar.example", label: "ar@northstar.example", source_type: "label" }],
  outlook_calendar: [{ external_id: "calendar:ar-team", label: "AR team calendars", source_type: "calendar" }],
  gmail: [{ external_id: "label:analyst-relations", label: "Label: analyst-relations", source_type: "label" }],
  google_calendar: [{ external_id: "calendar:ar-ops", label: "AR Ops calendar", source_type: "calendar" }],
};

export function createMockAdapter(descriptor: ConnectorDescriptor): ConnectorAdapter {
  return {
    descriptor,
    async testConnection(): Promise<TestConnectionResult> {
      // Mock adapters never claim a live connection.
      return {
        status: "mock_mode",
        message:
          "Mock adapter responding with sample data. Real credentials / OAuth not configured.",
      };
    },
    async listSources(): Promise<ListSourcesResult[]> {
      return SAMPLE_SOURCES[descriptor.id] ?? [
        { external_id: "default", label: "Default scope", source_type: "feed" },
      ];
    },
    async sync(ctx: SyncContext): Promise<SyncResult> {
      const samples = SAMPLES[descriptor.id] ?? [];
      const items: NormalisedItem[] = samples.map((s, idx) => {
        const occurred = new Date();
        occurred.setDate(occurred.getDate() - (s.daysAgo ?? idx));
        return {
          external_id: `${descriptor.id}:${ctx.configId}:${Date.now()}:${idx}`,
          type: s.type,
          title: s.title,
          body_excerpt: s.body_excerpt,
          url: s.url,
          occurred_at: occurred,
          signals: s.signals,
        };
      });
      return {
        items,
        message: `Mock sync produced ${items.length} sample item(s).`,
      };
    },
    normaliseItem(raw: unknown): NormalisedItem {
      return raw as NormalisedItem;
    },
  };
}
