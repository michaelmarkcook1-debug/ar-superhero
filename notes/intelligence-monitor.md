# Intelligence Monitor — Mission Control briefing feeds

Native React/Vite/Express implementation of the AR Mission Control feeds pack
(the pack itself was Astro/DaisyUI/Datastar and was used as a spec only).

## Files

| File | Role |
|---|---|
| `shared/intelligenceMonitor.ts` | Shared TS types (client + server). Adapted from the pack's `intelligence-monitor.ts`, plus an AR-specific `recommendedAction` field and a provenance `tag`. |
| `server/services/intelligenceMonitor.ts` | Demo-seeded data + request-time scoring (21-day pre-empt window, 18-day discount). Optional `INTELLIGENCE_MONITOR_PATH` JSON override; 5-min cache. |
| `server/routes.ts` | `GET /api/intelligence-monitor` (added near `/api/dashboard/summary`). |
| `client/src/components/cockpit/CurrentBriefingOpportunities.tsx` | Severity-scored recent signals; each shows a recommended AR action; Radix dialog for detail; collapsible "Older signals". |
| `client/src/components/cockpit/FutureBriefingOpportunities.tsx` | Upcoming events within the horizon; urgent/blackout flags; AR prep line. |
| `client/src/pages/MissionControl.tsx` | Imports + a new `<section data-testid="intelligence-monitor">` inserted between the Live Brief section and the Succeed/Direct/Enable mode cards. |

## Data flow

`buildSeed()` (or a future baseline.json via `INTELLIGENCE_MONITOR_PATH`)
→ `getIntelligenceMonitor()` computes `daysUntil` / `isUrgent` / `isBlackout`
for calendar events (filtered to ≤21 days) and `ageDays` / `discounted` for
findings (>18 days = discounted), newest-first
→ `GET /api/intelligence-monitor` returns `{ meta, upcoming, findings, windows }`
→ both panels read it via TanStack Query `useQuery({ queryKey: ["/api/intelligence-monitor"] })`,
which routes through the project's `getQueryFn` (so deploy-time `__PORT_5000__`
rewriting still applies). The two panels share one query (one network call).

## Demo-safety

- All data is seeded for the demo customer **Capgemini** (CAP · Euronext Paris). Signal headlines/summaries are illustrative demo scenarios for AR rehearsal, not verified facts.
- Every item carries a `tag` (`demo` / `external signal` / `internal`), surfaced in the UI.
- A "demo data" chip shows in each panel footer when `meta.isDemo` is true.
- No real analyst firm is named as live intelligence; assessment items are
  phrased as external signals to verify, not facts.

## Build / tests run

- `npm run build` — **passes** (Vite client bundle + esbuild server bundle).
- Runtime smoke test: started `dist/index.cjs`, `GET /api/intelligence-monitor`
  → 200. Verified: far-future (45d) event excluded; quiet period flagged
  urgent+blackout; findings >18d flagged `discounted`; findings sorted newest-first.
- Note: `npm run check` (tsc) reports **pre-existing** errors in
  `server/services/briefingDeck.ts` (pptxgenjs typings) unrelated to this work.
  The build does not type-check (esbuild transpile), so deploy is unaffected.

## Plugging in real data later

Set `INTELLIGENCE_MONITOR_PATH` to a JSON file matching `IntelligenceMonitorData`
(`shared/intelligenceMonitor.ts`). On read failure the service falls back to the
seed, so the UI never blanks. To swap the tracked org, change the file's
`organisation` / `ticker` / `exchange` and the `calendar` / `findings` arrays.

## Frontend test hooks (data-testid)

`intelligence-monitor`, `panel-current-briefing`, `panel-future-briefing`,
`current-briefing-counts`, `current-briefing-list`, `current-finding-<id>`,
`current-briefing-older-toggle`, `current-finding-modal`, `current-finding-action`,
`current-finding-source`, `future-briefing-count`, `future-briefing-list`,
`future-event-<id>`, plus loading/error/empty states for each panel.
