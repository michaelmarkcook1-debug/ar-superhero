import { createContext, useContext, useMemo, useState } from "react";
import {
  EVIDENCE,
  SUGGESTED_TASKS,
  WORKSTREAMS,
  SIGNALS,
  LEARNING,
  INTEGRATIONS,
  type EvidenceItem,
  type Integration,
  type IntelSignal,
  type LearningItem,
  type SuggestedTask,
  type Workstream,
} from "./seed";

type TaskState = "suggested" | "accepted" | "rejected";
type EvidenceState = "Suggested" | "Approved" | "Approved with restrictions" | "Rejected";

type Brief = {
  generatedAt: Date;
  generation: number;
  highlights: string[];
  unconfirmed: string[];
};

const INITIAL_BRIEF: Brief = {
  generatedAt: new Date(new Date().getTime() - 17 * 60 * 1000),
  generation: 1,
  highlights: [
    "Gartner published a research note on App Modernisation 2026 that does not reference Northstar — schedule a 2-pager response with Priya Subramanian.",
    "Forrester Wave: AI-assisted dev tooling criterion is currently Unsupported. Two active BFSI pursuits could close this gap with named references.",
    "HFS Horizons: OneEcosystem narrative remains Weak. Consider a strategy session with AnalystGenius before next sprint.",
  ],
  unconfirmed: [
    "Interaction record auto-created from Everest BFSI briefing (yesterday) — Needs confirmation.",
    "Stance change suggested for Priya Subramanian: Friendly with rising confidence — Needs confirmation.",
  ],
};

const REFRESH_BRIEFS: Brief[] = [
  {
    generatedAt: new Date(),
    generation: 2,
    highlights: [
      "Saurabh Khanna (HFS) reinforced the OneEcosystem multi-tier narrative this morning — refresh the partner section before submitting.",
      "Priya Subramanian replied: 2 additional EMEA Banking references required for Gartner MQ. Suggested task created and linked to W1.",
      "Tomás Bauer (Everest) confirmed BFSI deep-dive follow-ups; 3 candidate evidence items extracted from the briefing notes.",
    ],
    unconfirmed: [
      "AI-assisted developer co-pilot — candidate capability proof requires Product confirmation before reuse outside Internal.",
    ],
  },
];

type Ctx = {
  workstreams: Workstream[];
  signals: IntelSignal[];
  learning: LearningItem[];
  integrations: Integration[];
  tasks: SuggestedTask[];
  taskStates: Record<string, TaskState>;
  setTaskState: (id: string, s: TaskState) => void;
  evidence: EvidenceItem[];
  evidenceStates: Record<string, EvidenceState>;
  setEvidenceState: (id: string, s: EvidenceState) => void;
  brief: Brief;
  refreshBrief: () => void;
  briefRefreshing: boolean;
  toggleIntegration: (id: string) => void;
  exportLog: { lens: string; format: string; at: Date }[];
  logExport: (lens: string, format: string) => void;
};

const AppDataCtx = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({});
  const [evidenceStates, setEvidenceStates] = useState<Record<string, EvidenceState>>(
    Object.fromEntries(EVIDENCE.map((e) => [e.id, e.status as EvidenceState]))
  );
  const [brief, setBrief] = useState<Brief>(INITIAL_BRIEF);
  const [briefRefreshing, setBriefRefreshing] = useState(false);
  const [exportLog, setExportLog] = useState<{ lens: string; format: string; at: Date }[]>([]);

  const value = useMemo<Ctx>(
    () => ({
      workstreams: WORKSTREAMS,
      signals: SIGNALS,
      learning: LEARNING,
      integrations,
      tasks: SUGGESTED_TASKS,
      taskStates,
      setTaskState: (id, s) => setTaskStates((prev) => ({ ...prev, [id]: s })),
      evidence: EVIDENCE,
      evidenceStates,
      setEvidenceState: (id, s) => setEvidenceStates((prev) => ({ ...prev, [id]: s })),
      brief,
      briefRefreshing,
      refreshBrief: () => {
        setBriefRefreshing(true);
        setTimeout(() => {
          setBrief({
            ...REFRESH_BRIEFS[0],
            generatedAt: new Date(),
            generation: brief.generation + 1,
          });
          setBriefRefreshing(false);
        }, 900);
      },
      toggleIntegration: (id) =>
        setIntegrations((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  enabled: !i.enabled,
                  mode: !i.enabled ? (i.mode === "Off" ? "Read-only" : i.mode) : "Off",
                }
              : i
          )
        ),
      exportLog,
      logExport: (lens, format) =>
        setExportLog((prev) => [...prev, { lens, format, at: new Date() }]),
    }),
    [integrations, taskStates, evidenceStates, brief, briefRefreshing, exportLog]
  );

  return <AppDataCtx.Provider value={value}>{children}</AppDataCtx.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataCtx);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}

export function formatRelativeAgo(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const hours = Math.round(diffMin / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}
