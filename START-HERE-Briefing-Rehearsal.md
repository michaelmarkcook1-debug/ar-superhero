# AR SuperHero | Briefing rehearsal handover

18 November 2026 · 09:47 GMT · Presenter and engineering guide

The archive contains the full AR SuperHero source at the tested application revision, plus this guide. Open **Succeed → Briefing rehearsal**. The feature prepares a single executive, Accenture’s Julie Sweet, for two different analyst conversations. The rehearsal runs from curated records in the browser. It has no live CRM, model or document ingestion dependency.

## Run the five-minute demo

| Time | In the app | What to say or look for |
|---|---|---|
| 0:00 | Open Succeed, then Briefing rehearsal. | “Same executive, same AI-services story. What changes when we change the analyst?” The company in this sample is fixed to Accenture. |
| 0:30 | Select Holger Mueller and expand the published evidence. | Start with one production deployment. Ask which parts Accenture would still operate if the buyer changed cloud or model. Bring the architect. Mueller’s own Accenture commentary and his published product criteria have different scopes. |
| 1:30 | Switch to Phil Fersht. Expand the claim check. | HFS has already reported 96% accuracy and a 50% handling-time reduction in one invoice-validation case. The executive needs to explain the cost per accepted invoice after review, exceptions and fees. Bring finance operations. |
| 2:30 | Select **Add open commitment**. | In this simulated interaction, AR promised a buyer-side cost baseline. The account commercial lead now owns the follow-up. |
| 3:00 | Select **Review incoming exhibit**. | Only the handling-time field is supplied. The claim remains on hold. Read the three missing fields aloud. Point out that the client finance controller is the suggested owner. |
| 3:45 | Select the three missing fields. Switch to Mueller and back. | The exhibit is now ready for factual verification. Checking fields models their presence. Verification and sharing clearance are still required. Each analyst’s state survives a switch within this page. Reloading the page resets the rehearsal. |
| 4:30 | Close with a pilot question. | “Could we replay two historical briefings using only the material available beforehand, then compare our briefs with what each analyst actually asked?” |

## Evidence and attribution

| Evidence | What it supports | Interpretation limit |
|---|---|---|
| [Accenture growth model, 20 June 2025](https://newsroom.accenture.com/news/2025/accenture-changes-growth-model-to-reinvent-itself-for-the-age-of-ai) and [leadership announcement, 13 March 2026](https://newsroom.accenture.com/news/2026/accenture-announces-reinvention-services-leadership) | Sweet’s stated rationale and the later organisational action. | The announcements alone cannot demonstrate deployment adoption, client savings or margins. |
| [Mueller on Accenture, 19 December 2024](https://www.constellationr.com/insights/news/accenture-raises-fiscal-2025-outlook-genai-bookings-continue-grow) | He discussed both demand for AI implementation help and the possibility that AI reduces consulting effort. | His public commentary supplies context for a suggested question. It cannot establish what he privately thinks. |
| [Agentic platforms](https://www.constellationr.com/research/constellation-shortlist-agentic-platforms-of-the-enterprise) and [AI frameworks](https://www.constellationr.com/research/constellation-shortlist-ai-frameworks), 25 February 2026 | The published active/trained-user thresholds differ by technology category, above 10,000 and above 100,000 respectively. | Both lists share an author and publication date. Neither assesses Accenture’s services or establishes that an Accenture offering qualifies. |
| [Fersht’s HFS summit remarks, 03:00](https://www.hfsresearch.com/ny-spring-summit-2026/day-1/services-as-software-is-here/) | Fersht discusses moving existing engagements towards AI-enabled contracts and defining outcomes. | The question in the rehearsal is an AR SuperHero suggestion. |
| [HFS Horizons, Agentic Services 2026](https://www.hfsresearch.com/research/hfs-horizons-agentic-services-2026/) | The co-authored report gives the accuracy and handling-time results for the Accenture case. | The public summary gives no fully loaded cost per invoice. A 50% time reduction cannot substantiate a 50% cost reduction. |

## Product fit and boundaries

The persona-tracking idea links an attributed observation to its source, date and scope. The contextual-analysis idea combines an open commitment, its owner and incoming evidence to determine the next action. In this build the two briefs are curated, the relationship records are simulated, and a deterministic check evaluates four fields for each example. No private analyst meeting or executive endorsement is implied.

A CRM partnership could use permitted analyst records, research and commitments as inputs. AR SuperHero would add a prepared opening, questions to rehearse, an evidence check and a suggested owner. ARInsights already describes [Briefing Books](https://www.arinsights.com/briefing-books) and a [read-only ARchitect MCP connector](https://www.arinsights.com/architect-mcp-server). Integration and superiority both remain untested. For a two-case pilot, give both workflows the same pre-meeting inputs, withhold the meeting outcomes and record any differences in factual accuracy, relevance to actual questions, missing evidence and preparation time.

## Technical ownership

| File | Responsibility |
|---|---|
| `client/src/App.tsx` | Registers the hash route within the existing MissionShell. |
| `client/src/pages/Succeed.tsx` | Adds the in-app entry to the briefing rehearsal. |
| `client/src/pages/BriefingRehearsal.tsx` | Selects the analyst, shows citations and manages separate in-memory relationship and exhibit state. |
| `client/src/lib/briefingCases.ts` | Contains the dated public evidence, attribution limits, simulated requests, stage-specific owners, field definitions and `assessExhibit`. |
| `client/src/pages/briefing-rehearsal.css` | Contains layout, responsive styling and cockpit theme integration. |

## Local setup and validation

Unzip the archive, open a terminal in the extracted folder containing `package.json`, and run the following with Node.js 24 and npm. The existing repository scripts are authoritative.

```sh
npm ci
npm run check
npm run build
npm run dev
```

Open **http://localhost:5000/#/succeed/briefing-rehearsal**. If the app’s existing backend dependencies are unavailable locally, run the frontend for this client-only sample with `npx --no-install vite --host 127.0.0.1 --port 5173` and open **http://127.0.0.1:5173/#/succeed/briefing-rehearsal**. Other cockpit screens can require the backend.

Run this exact check from the same folder using Node.js 24:

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { cases, checks, assessExhibit } from './client/src/lib/briefingCases.ts';
let count = 0;
for (const id of Object.keys(cases)) {
  const fields = checks[id];
  for (let mask = 0; mask < 2 ** fields.length; mask++) {
    const supplied = fields.filter((_, index) => mask & (1 << index));
    const missing = fields.filter(item => !supplied.includes(item));
    const result = assessExhibit(id, supplied);
    assert.deepEqual(result.missing, missing);
    assert.equal(result.covered, supplied.length);
    assert.equal(result.readyForReview, missing.length === 0);
    count++;
  }
}
assert.equal(count, 32);
console.log(count + ' field combinations passed');
JS
```

**Acceptance checks.** Enter through Succeed and via the direct route. Switch analysts and confirm the opening, sources and rehearsal question all change. Open and close the source detail. Review an incomplete exhibit, add the missing fields and confirm the recommendation changes to factual verification. Switch away and back and confirm the correct analyst’s state is restored. Check the navigation back to Succeed.

**Recorded checks.** The TypeScript check, application build, 32 field combinations, and DOM interaction checks passed at application commit `d330c3f9d85c8b90c7fcd3854b012ed1a36abaf6`. The preview’s served application bundle matched the tested bundle. Physical-device and live CRM integration testing were outside the rehearsal verification.

## Release and rollback

[PR #8](https://github.com/michaelmarkcook1-debug/ar-superhero/pull/8) was open at the handover check. The verified preview used the application commit above. This archive is a handover snapshot. Work on the existing PR branch for any subsequent review or release. The archive branch adds the handover document only.

For production, review the PR against current main, run the checks above, then use the project's existing approved release process. The change touches five frontend files and has no database migration. If a release must be reversed, revert the feature PR using the repository’s normal workflow, rebuild, and verify that Succeed and the other cockpit routes still open. A saved rehearsal deep link will cease to resolve to this page after rollback.
