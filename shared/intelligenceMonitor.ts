// ============================================================================
// Intelligence Monitor — shared types
//
// Powers the two Mission Control briefing-opportunity feeds:
//   - Current Briefing Opportunities (recent severity-scored signals)
//   - Future Briefing Opportunities (upcoming events within the AR horizon)
//
// Adapted from the AR Mission Control feeds spec into the AR Superhero stack.
// These are framework-agnostic shapes shared by the Express API and the React
// client. All shipped data is demo/seeded — see server/services/intelligenceMonitor.ts.
// ============================================================================

export type BriefingSeverity = "HIGH" | "MEDIUM" | "LOW";

export type BriefingCategory =
  | "Financial Announcement"
  | "M&A / Divestiture"
  | "Major Contract"
  | "Partnership / Alliance"
  | "Board / Governance Change"
  | "Product / Service Launch"
  | "Legal / Regulatory"
  | "Analyst Coverage"
  | "Negative Media Coverage"
  | "Positive Media Coverage"
  | "Organisational Change"
  | "Strategic Consortium"
  | "Workforce Restructuring";

// A recent signal the AR team can act on now.
export interface BriefingFinding {
  id: string;
  date: string; // ISO yyyy-mm-dd
  category: BriefingCategory;
  headline: string;
  summary: string;
  severity: BriefingSeverity;
  briefingLikelihood: BriefingSeverity;
  /** What AR should do about this signal — the superhero move. */
  recommendedAction: string;
  source: string;
  sourceLabel: string;
  /** Source provenance tag, surfaced in the UI so nothing reads as unsupported fact. */
  tag: "demo" | "external signal" | "internal";
}

// An upcoming calendar event AR should prepare a briefing around.
export interface CalendarEvent {
  id: string;
  event: string;
  date: string; // ISO yyyy-mm-dd
  endDate?: string;
  /** What AR should prepare ahead of this event. */
  recommendedAction: string;
  tag: "demo" | "external signal" | "internal";
}

// Raw seeded/baseline document (matches a future baseline.json shape).
export interface IntelligenceMonitorData {
  organisation: string;
  ticker: string;
  exchange: string;
  lastUpdated: string; // ISO timestamp
  isDemo: boolean;
  calendar: CalendarEvent[];
  findings: BriefingFinding[];
}

// ---------------------------------------------------------------------------
// Derived shapes returned by the API (computed server-side at request time)
// ---------------------------------------------------------------------------

export interface UpcomingCalendarEvent extends CalendarEvent {
  daysUntil: number;
  isUrgent: boolean; // <= 7 days
  isBlackout: boolean; // quiet / blackout period
}

export interface ScoredFinding extends BriefingFinding {
  ageDays: number;
  /** Findings older than the discount window are de-emphasised in the UI. */
  discounted: boolean;
}

export interface IntelligenceMonitorMeta {
  organisation: string;
  ticker: string;
  exchange: string;
  lastUpdated: string;
  isDemo: boolean;
}

// Full payload of GET /api/intelligence-monitor
export interface IntelligenceMonitorResponse {
  meta: IntelligenceMonitorMeta;
  upcoming: UpcomingCalendarEvent[];
  findings: ScoredFinding[];
  windows: {
    preemptDays: number;
    discountDays: number;
  };
}
