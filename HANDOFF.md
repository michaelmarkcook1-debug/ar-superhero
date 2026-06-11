# AR Superhero — Post-Home UX Rebuild Handoff

## What changed (one-liner)
Replaced the legacy operational nav (Command / Workstreams / Analysts / Evidence / Leader Lens / Learning / Integrations) with a cinematic three-mode intelligence cockpit organised around **Succeed · Direct · Enable**, anchored by a new **Mission Control** brief. The homepage is preserved exactly in spirit; legacy operational pages still exist behind `/admin/*`.

---

## New top-level information architecture

| Route | Purpose |
|---|---|
| `/` | Landing (unchanged visuals; entry buttons retargeted) |
| `/mission` | **Mission Control** — AR Superhero Brief, tri-mode entry, snapshots, Impact ledger |
| `/succeed` | **Succeed** in analyst moments — readiness across six assessment models, evidence gaps, RFI/briefing prep, HFS guidance demo |
| `/direct` | **Direct** internal action — seven stakeholder lenses with what they know / need / risk |
| `/enable` | **Enable** the business — Sell (approved proof, claims to avoid, buyer guidance) and Build Market Presence (narratives, gaps, thought leadership) sub-tabs |
| `/admin` | Low-priority index linking to retained legacy operational pages |
| `/admin/command-centre`, `/admin/workstreams`, `/admin/analysts`, `/admin/evidence`, `/admin/leader-lens`, `/admin/learning`, `/admin/integrations`, `/admin/platform/*` | Legacy pages, wrapped in original AppShell |

Landing → "Enter intelligence" now routes to `/mission`. "View leader brief" routes to `/direct`.

---

## Visual design language

A deliberately cinematic, high-status palette is applied across all post-home pages:

- **Background**: near-black `#06090f`
- **Primary accent (gold)**: `#a88945` (matches homepage brand), light `#d5b46b`, pale `#f0dca8`
- **Secondary accent (teal)**: `#00a7b7`, light `#63d7de`
- **Ink**: `#e7e3d8` / muted `#8e887a`
- **Typography**: General Sans display + JetBrains Mono for numerics and eyebrows. Hero ~44–64px with `-0.035em` tracking; eyebrows 10.5px uppercase with `0.22em` tracking.
- **Atoms**: a `Pane` primitive with optional gold/teal ambient glow, `StatusChip` (safe / restricted / unsupported), `ReadinessBar` (Strong / Adequate / Weak / Missing / Unsupported), `NumberMark`, `HairLine`, `Glyph`.
- Explicit hex values inside cockpit atoms keep the cinematic palette consistent independent of theme tokens.

---

## Files added

```
client/src/lib/cockpit.ts                — Demo data model (~807 lines)
client/src/components/MissionShell.tsx   — Premium dark chrome + mode rail
client/src/components/cockpit/atoms.tsx  — Pane, StatusChip, ReadinessBar, etc.
client/src/pages/MissionControl.tsx      — /mission
client/src/pages/Succeed.tsx             — /succeed
client/src/pages/Direct.tsx              — /direct
client/src/pages/Enable.tsx              — /enable
client/src/pages/Admin.tsx               — /admin
HANDOFF.md                               — this file
qa/*.png                                 — Playwright screenshots
```

## Files modified

- `client/src/App.tsx` — full router rewrite (new routes wrapped in MissionShell; legacy routes wrapped in AppShell under `/admin/*`)
- `client/src/pages/Landing.tsx` — only two link `href` edits:
  - `/command-centre` → `/mission`
  - `/leader-lens` → `/direct`
  - Hero image, AR SuperHero title, AR INTELLIGENCE LAYER badge, light/dark toggle, copy, and entry buttons preserved exactly.

## Files intentionally untouched

- `server/*`, `shared/schema.ts`, `data.db`
- All legacy operational pages (`CommandCentre`, `Workstreams`, `Analysts`, `Evidence`, `LeaderLens`, `Learning`, `Integrations`, `Placeholder`) — still functional under `/admin/*`
- `AppShell.tsx`, original `atoms.tsx`, `Logo.tsx`
- `lib/state.tsx`, `lib/seed.ts`, `lib/queryClient.ts`, `lib/utils.ts`
- `index.css`, `tailwind.config.ts`, `main.tsx`

---

## Demo data (fictional)

- AR programme: **Northstar Digital Services** (AR Director: Mireille Okonkwo)
- Six assessment models surfaced: Gartner MQ, IDC MarketScape, Forrester Wave, Everest PEAK, HFS Horizons, NelsonHall NEAT
- Seven stakeholder lenses: Executive, Strategy, Product, Marketing, Commercial, Delivery, Regional
- HFS OneEcosystem guidance is the showcase external-signal interaction — labelled **GUIDANCE DEMO · EXTERNAL SIGNAL**, with "Find out more" revealing an AnalystGenius deep-dive prompt.

## Editorial guardrails honoured

- No language predicting leadership likelihood or exact analyst outcomes — only **readiness bands** (Strong / Adequate / Weak / Missing / Unsupported).
- No broad competitor analyst landscape. Analyst firms appear only as the **name of an assessment the customer is engaged in**.
- No promotion of other analyst houses; AnalystGenius is positioned as the intelligence layer.
- No integrations / sync status surfaced in the main UX (they live in `/admin/integrations`).
- All external/demo data carries a source-trace eyebrow.
- Enable contains internal guidance only — no public campaign generation.
- No `localStorage` / `sessionStorage` / cookies used.

---

## QA performed

- **Build**: `npm run build` — clean. Output 435KB JS / 100KB CSS.
- **Server**: production server running on `:5000` (started via pplx-tool `start_server`, log at `/tmp/ar-superhero.log`).
- **Playwright sanity** (`qa/` folder):
  - Desktop 1440×900: `home-desktop`, `mission-desktop`, `succeed-desktop`, `direct-desktop`, `enable-desktop`, `admin-desktop` — 0 console errors
  - Mobile 390×844: `home-mobile`, `mission-mobile`, `succeed-mobile`, `direct-mobile`, `enable-mobile` — 0 console errors
  - Interactions: `direct-commercial.png` (lens switch), `succeed-hfs-expanded.png` (HFS reveal), `enable-presence.png` (sub-tab switch)

---

## Known limitations

1. Legacy operational pages under `/admin/*` are **functional but not visually refreshed**. They retain the original AppShell look. If the brief later expands to retire them, they can be deleted; for now they preserve continuity for the AR admin.
2. Backend (`server/`, `data.db`, schema) is untouched — the new cockpit reads from in-file demo data in `lib/cockpit.ts`, not from the DB. Wiring the cockpit to live data is a follow-up.
3. The HFS OneEcosystem deep-dive is a **demo interaction** only — clicking "Find out more" reveals an AnalystGenius prompt placeholder rather than fetching a live brief.
4. Deployment was intentionally **not** performed in this subagent run, per instructions. Main agent will deploy.
