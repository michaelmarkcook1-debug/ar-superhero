# Real RFI/RFP uploads and higher limits

Prepared 7 November 2026, Mauritius time (UTC+4).

Local branch: `fix/demo-upload-and-stakeholder-decks`. Base main: `0cbd1568cc7797830944eac85a4b549e9b92ccfe`. Remote main was checked again at 23:50 Mauritius time and remained unchanged. This change follows the two local demo-safety and stakeholder-deck commits. Nothing has been pushed, merged or deployed.

## Exact change

The existing Enable → RFP / RFI screen now extracts genuine PDF, DOCX and UTF-8 TXT content in the browser and submits bounded text sections for server-side AI analysis. The same real uploader is available in Enable → Documents above the clearly labelled sample library. No top-level category is added. A document-type selector distinguishes an incoming request from a draft response.

Each completed section shows requirements and response guidance, strengths, gaps and risks, and suggested AG insight inclusions. Inclusions identify the proposed placement, an exact document quotation, rationale, draft wording, the supporting AG evidence and its retrieval date. The selected company is passed to the AG brief reader; fictional library proof points are excluded.

Results can be downloaded as one Markdown report, including partial results, source details and coverage status. The server rejects quotations absent from the submitted section, unknown source IDs and numeric insertions absent from the cited evidence. These checks do not prove that every AI interpretation or paraphrase is correct. Recommendations remain explicitly subject to human review.

## Increased limits and failure handling

| Control | Previous behaviour | Proposed behaviour |
| --- | --- | --- |
| Accepted formats | DOCX, TXT | Text-readable PDF, DOCX, UTF-8 TXT |
| File size | 10 MB raw server route; constrained by host request limits | 20 MiB file parsed locally; raw file never sent to the API |
| Extracted text | Truncated at 60,000 characters | Up to 600,000 characters; larger input rejected explicitly |
| PDF pages | Unsupported | Up to 500 pages |
| API request | Whole raw file | At most 12,000 text characters per section, below the existing 100 KB JSON parser limit |
| Model output budget | 4,096 tokens | 12,000 tokens per section |
| Hosting duration setting | 60 seconds | 300 seconds in `vercel.json` |
| Analysis/request timeouts | No explicit end-to-end budget | 270-second analysis budget; 290-second client timeout |
| Recovery | Restart whole analysis | Up to three attempts per failed section; manual retry skips completed sections |
| Concurrency | One whole-document call | At most two active section requests |

Completed results remain in memory while the screen stays open. Reloading or navigating away loses that session; there is no durable background job or persisted document library in this change. Longer reviews can increase model usage and take several minutes. Higher limits reduce specific failure risks; they cannot eliminate network, provider or extraction failures.

Vercel documents a 4.5 MB function payload limit and a 300-second duration allowance with Fluid compute. Browser extraction avoids the payload cap. The deployed project's plan, Fluid compute setting, Node runtime and credentials have not been inspected. Confirm compatibility before any approved deployment. This repository has one API function, so its proposed 300-second setting applies to that shared function.

References: [function limits](https://vercel.com/docs/functions/limitations), [duration configuration](https://vercel.com/docs/functions/configuring-functions/duration).

## Files affected

- `client/src/lib/rfpUpload.ts`: real extraction, text splitting, response validation and retry logic.
- `client/src/components/cockpit/RfpAnalyzer.tsx`: real request/response flow, progress, incomplete status, evidence-linked results and report download.
- `client/src/pages/Enable.tsx`: exposes the real uploader in the existing Documents view.
- `shared/rfpAnalysis.ts`: limits, result schema and shared types.
- `server/services/rfpAnalyzer.ts`: selected-company AG evidence, structured review and reference validation.
- `server/services/rfpRoutes.ts`, `server/routes.ts`: bounded-section endpoint and explicit old-route error.
- `server/index.ts`: excludes RFP response contents from development request logging.
- `package.json`, `package-lock.json`: pinned `pdfjs-dist` 6.5.438 and `fflate` 0.8.3. PDF parsing uses the compatibility build, loaded only for PDF files.
- `vercel.json`: proposed five-minute function duration.
- `.env.example`: documents the existing required Anthropic key and optional model override; contains no credentials.
- `tests/rfp-analysis.mjs`, `tests/rfp-upload-browser.mjs`: service/HTTP and real browser parser regression tests.

## Acceptance evidence

Passed locally using explicit synthetic AG/model fixtures:

- Real PDF worker text extraction and page attribution; actual DOCX body and table extraction from a file larger than 5 MB; TXT extraction.
- A 600,000-character document submitted in bounded sections without losing text; 600,001-character and over-20-MiB files rejected without analysis.
- Unicode splitting preserves text. Unsupported files clear old results and produce an error.
- Selected company and document type reach every section request. Request bodies stay below 100 KB.
- Three automatic attempts on a transient failure; partial results remain labelled incomplete; manual retry does not resend completed sections.
- Malformed successful HTTP responses cannot create a completed result.
- Real HTTP route checks: valid input, invalid company, oversized section and missing model configuration.
- Document quotation, source-ID and numeric-insertion guards; stale/unavailable AG labels; model output-limit failure.
- Source-backed insertion UI and Markdown export, including actual source text, verified with fixture content. Mobile layout checked at 390 px with no horizontal overflow.
- TypeScript check; client, server and serverless builds; `git diff --check`.
- Existing demo-upload regressions at desktop/mobile widths and stakeholder-deck regression suite remain passing.

The UI screenshot was visually inspected. Model and AG calls in these tests are mocked. No live AI quality, current AG payload or deployed behaviour has been verified because service credentials are absent in this checkout. PDF page count is an enforced limit, not a completed 500-page performance benchmark. Existing Browserslist, PostCSS and bundle-size warnings remain.

## Constraints, limitations and rollback

Preserved: Q.U.A.D flow, existing navigation and personas, stakeholder deck changes, AG API client/allow-list and existing integration contracts, demo labels, database schema and deployment state. No changes to generic document/deck ingestion helpers.

AG insight inclusions use the supported evidence exposed by the existing AG brief reader, not a claim to have retrieved every AnalystGenius dataset. Stale reads are dated; unavailable AG data produces a document-only review with no invented analyst inclusions. Scanned PDFs need OCR outside this flow. Images, layout and excluded DOCX elements are disclosed in the results. Section-by-section review covers the extracted text but does not certify whole-document compliance or cross-section consistency.

The old raw `/api/enable/rfp-analyze` route now returns an explicit migration error. The app uses `/api/enable/rfp-analyze-section`; external consumers of the old raw route would need updating. No such consumers were independently verified. `pdfjs-dist` declares Node >=22.13 or >=24 for its package; this checkout was built and tested on Node 24.22.1. Deployment runtime compatibility remains a pre-deployment check.

Reverting this third change restores the former uploader and limits without a data migration; it also restores its truncation and demo-proof grounding risks. The first two local commits can remain. The third change depends on the stakeholder evidence builder added by the second commit.

Review only. Any merge or deployment requires presentation of the exact action and explicit approval.
