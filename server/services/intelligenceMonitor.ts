import fs from "node:fs";
import type {
  BriefingFinding,
  CalendarEvent,
  IntelligenceMonitorData,
  IntelligenceMonitorResponse,
  ScoredFinding,
  UpcomingCalendarEvent,
} from "@shared/intelligenceMonitor";

// ============================================================================
// Intelligence Monitor service
//
// Returns the data behind the two Mission Control briefing feeds. Ships with
// demo/seeded data for the demo customer (Capgemini) so the panels render
// without external dependencies. The signal wording is illustrative demo
// content for AR rehearsal — not verified fact — and is tagged accordingly.
//
// A future production deploy can point INTELLIGENCE_MONITOR_PATH at a JSON file
// (e.g. a daily cron baseline) — when present and readable it overrides the
// seed. We never assume the file exists; if it is missing or malformed we fall
// back to the seed so the UI never blanks.
// ============================================================================

const PREEMPT_WINDOW_DAYS = 21;
const DISCOUNT_WINDOW_DAYS = 18;
const CACHE_TTL_MS = 5 * 60 * 1000;

let _cache: { data: IntelligenceMonitorData; at: number } | null = null;

// ---------------------------------------------------------------------------
// Seed data — demo-safe. Capgemini is the demo customer for this prototype.
// Signal headlines/summaries are illustrative demo scenarios for AR rehearsal,
// not verified facts; every item carries a demo / external-signal provenance
// tag. No real analyst firm is named as live intelligence.
// ---------------------------------------------------------------------------

function daysFromNow(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildSeed(): IntelligenceMonitorData {
  const findings: BriefingFinding[] = [
    {
      id: "f-ai-platform-launch",
      date: daysFromNow(-2),
      category: "Product / Service Launch",
      headline: "Capgemini launches agentic delivery platform for managed services",
      summary:
        "Demo scenario for AR rehearsal: Capgemini announces a new agentic automation layer across its managed-services portfolio, positioning it against hyperscaler-led delivery models. Illustrative content, not a verified announcement.",
      severity: "HIGH",
      briefingLikelihood: "HIGH",
      recommendedAction:
        "Brief lead analysts within 48h with the platform proof points and a customer reference; pre-empt the inevitable scaling-evidence question.",
      source: "https://example.com/demo/agentic-platform",
      sourceLabel: "Company newsroom (demo)",
      tag: "demo",
    },
    {
      id: "f-mega-contract",
      date: daysFromNow(-4),
      category: "Major Contract",
      headline: "Multi-year cloud modernisation deal with a global bank",
      summary:
        "Demo scenario: a flagship modernisation win that strengthens Capgemini's financial-services narrative. Use as evidence of scaled delivery in regulated industries. Illustrative content, not a verified deal.",
      severity: "HIGH",
      briefingLikelihood: "MEDIUM",
      recommendedAction:
        "Package as a proof point for the next evaluation cycle; offer the analyst a reference call before competitors claim the same vertical.",
      source: "https://example.com/demo/bank-modernisation",
      sourceLabel: "Press release (demo)",
      tag: "demo",
    },
    {
      id: "f-analyst-coverage",
      date: daysFromNow(-6),
      category: "Analyst Coverage",
      headline: "Capgemini moves up in a major capability assessment",
      summary:
        "Demo scenario: an independent assessment moves Capgemini into a stronger position on execution. Treat as an external signal — verify the published wording before reuse. Illustrative content, not a verified rating.",
      severity: "MEDIUM",
      briefingLikelihood: "HIGH",
      recommendedAction:
        "Confirm the exact published language with the analyst, then equip sellers with an approved one-liner. Avoid paraphrasing the rating.",
      source: "https://example.com/demo/assessment-execution",
      sourceLabel: "Assessment summary (external signal)",
      tag: "external signal",
    },
    {
      id: "f-partnership",
      date: daysFromNow(-9),
      category: "Partnership / Alliance",
      headline: "Strategic alliance expands sovereign-cloud reach in EMEA",
      summary:
        "Demo scenario: a new alliance extends Capgemini's sovereign-cloud footprint, strengthening the regulated-industry and data-residency story. Illustrative content, not a verified alliance.",
      severity: "MEDIUM",
      briefingLikelihood: "MEDIUM",
      recommendedAction:
        "Add to the EMEA briefing pack and flag to analysts covering data sovereignty; tie back to the bank modernisation win.",
      source: "https://example.com/demo/sovereign-alliance",
      sourceLabel: "Company newsroom (demo)",
      tag: "demo",
    },
    {
      id: "f-org-change",
      date: daysFromNow(-12),
      category: "Organisational Change",
      headline: "New Chief Delivery Officer appointed",
      summary:
        "Demo scenario: a leadership change relevant to Capgemini's delivery-capability narratives. Prepare a short bio and POV for analysts who track org structure. Illustrative content, not a verified appointment.",
      severity: "LOW",
      briefingLikelihood: "MEDIUM",
      recommendedAction:
        "Draft a 100-word leadership note for the AR briefing library; offer the CDO for an introductory analyst call.",
      source: "https://example.com/demo/cdo-appointment",
      sourceLabel: "Company newsroom (demo)",
      tag: "demo",
    },
    {
      id: "f-media",
      date: daysFromNow(-21),
      category: "Positive Media Coverage",
      headline: "Trade press highlights Capgemini's automation outcomes",
      summary:
        "Demo scenario: background coverage that supports the efficiency narrative. Older context — retained for completeness. Illustrative content, not verified coverage.",
      severity: "MEDIUM",
      briefingLikelihood: "LOW",
      recommendedAction:
        "Keep on file as supporting colour; not worth a proactive briefing on its own.",
      source: "https://example.com/demo/press-automation",
      sourceLabel: "Trade press (external signal)",
      tag: "external signal",
    },
    {
      id: "f-old-low",
      date: daysFromNow(-30),
      category: "Workforce Restructuring",
      headline: "Routine delivery-centre footprint optimisation",
      summary:
        "Demo scenario: low-severity background item, older than the active window. Illustrative content.",
      severity: "LOW",
      briefingLikelihood: "LOW",
      recommendedAction: "No AR action required.",
      source: "https://example.com/demo/footprint",
      sourceLabel: "Company filing (demo)",
      tag: "demo",
    },
  ];

  const calendar: CalendarEvent[] = [
    {
      id: "c-quarterly",
      event: "Q2 results announcement",
      date: daysFromNow(4),
      recommendedAction:
        "Prepare the AR results-day briefing pack and pre-brief tier-1 analysts on the delivery-scaling storyline.",
      tag: "demo",
    },
    {
      id: "c-quiet",
      event: "Pre-results quiet period",
      date: daysFromNow(1),
      endDate: daysFromNow(4),
      recommendedAction:
        "Hold proactive financial outreach; route any analyst questions through IR-approved messaging only.",
      tag: "demo",
    },
    {
      id: "c-summit",
      event: "Capgemini customer & analyst summit",
      date: daysFromNow(12),
      endDate: daysFromNow(13),
      recommendedAction:
        "Lock analyst invitations and 1:1 slots; align demo stations with the agentic-platform narrative.",
      tag: "demo",
    },
    {
      id: "c-assessment-window",
      event: "Capability assessment briefing window opens",
      date: daysFromNow(18),
      recommendedAction:
        "Finalise evidence dossier and submission narrative before the window; close high-impact evidence gaps first.",
      tag: "external signal",
    },
    {
      id: "c-far-future",
      event: "Industry analyst event (out of horizon)",
      date: daysFromNow(45),
      recommendedAction:
        "Tracked for planning only — outside the active pre-alert horizon.",
      tag: "external signal",
    },
  ];

  return {
    organisation: "Capgemini",
    ticker: "CAP",
    exchange: "Euronext Paris",
    lastUpdated: new Date().toISOString(),
    isDemo: true,
    calendar,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Loader: optional file override, else seed. Cached for CACHE_TTL_MS.
// ---------------------------------------------------------------------------

function loadBaseline(): IntelligenceMonitorData {
  const now = Date.now();
  if (_cache && now - _cache.at < CACHE_TTL_MS) return _cache.data;

  const overridePath = process.env.INTELLIGENCE_MONITOR_PATH;
  if (overridePath) {
    try {
      const raw = fs.readFileSync(overridePath, "utf8");
      const data = JSON.parse(raw) as IntelligenceMonitorData;
      _cache = { data, at: now };
      return data;
    } catch {
      // Fall through to seed — never blank the UI on a missing/bad file.
    }
  }

  const seed = buildSeed();
  _cache = { data: seed, at: now };
  return seed;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function diffDays(fromMs: number, isoDate: string): number {
  const d = new Date(isoDate);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - fromMs) / (1000 * 60 * 60 * 24));
}

export function getIntelligenceMonitor(): IntelligenceMonitorResponse {
  const data = loadBaseline();
  const today = startOfToday();

  const upcoming: UpcomingCalendarEvent[] = data.calendar
    .map((ev) => {
      const daysUntil = diffDays(today, ev.date);
      const text = ev.event.toLowerCase();
      return {
        ...ev,
        daysUntil,
        isUrgent: daysUntil >= 0 && daysUntil <= 7,
        isBlackout: text.includes("quiet") || text.includes("blackout"),
      };
    })
    .filter((ev) => ev.daysUntil >= 0 && ev.daysUntil <= PREEMPT_WINDOW_DAYS)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const findings: ScoredFinding[] = data.findings
    .map((f) => {
      const ageDays = -diffDays(today, f.date);
      return { ...f, ageDays, discounted: ageDays > DISCOUNT_WINDOW_DAYS };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    meta: {
      organisation: data.organisation,
      ticker: data.ticker,
      exchange: data.exchange,
      lastUpdated: data.lastUpdated,
      isDemo: data.isDemo,
    },
    upcoming,
    findings,
    windows: {
      preemptDays: PREEMPT_WINDOW_DAYS,
      discountDays: DISCOUNT_WINDOW_DAYS,
    },
  };
}
