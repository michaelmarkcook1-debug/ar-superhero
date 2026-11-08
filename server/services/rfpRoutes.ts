import type { Express, Request, Response } from "express";
import { z } from "zod";
import { VENDORS } from "./vendors";
import { RFP_SECTION_CHARS, RFP_TYPES } from "@shared/rfpAnalysis";
import { analyzeRfp, RfpReviewError } from "./rfpAnalyzer";

export function registerRfpRoutes(app: Express) {
  const rfpInputSchema = z.object({
    filename: z.string().min(1).max(240),
    vendorId: z.string().refine(id => VENDORS.some(v => v.id === id), "Unknown vendor"),
    documentKind: z.enum(RFP_TYPES),
    documentText: z.string().min(1).max(RFP_SECTION_CHARS).refine(text => Boolean(text.trim())),
    competitorTickers: z.array(z.string().max(12)).max(8).optional(),
  });

  app.post("/api/enable/rfp-analyze-section", async (req: Request, res: Response) => {
    const parsed = rfpInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid document section, company or document type." });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "Document analysis is not configured on this server. No analysis was performed.", retryable: false });
    try {
      res.json(await analyzeRfp(parsed.data));
    } catch (error) {
      const candidate = error as { statusCode?: unknown; name?: unknown } | null;
      const upstreamStatus = typeof candidate?.statusCode === 'number' ? candidate.statusCode : undefined;
      const code = error instanceof RfpReviewError ? error.code
        : upstreamStatus ? `provider_${upstreamStatus}`
        : candidate?.name === 'AI_NoObjectGeneratedError' || candidate?.name === 'AI_NoOutputGeneratedError' ? 'invalid_model_output'
        : candidate?.name === 'TimeoutError' || candidate?.name === 'AbortError' ? 'analysis_timeout' : 'analysis_failed';
      const retryable = !upstreamStatus || upstreamStatus === 408 || upstreamStatus === 409 || upstreamStatus === 429 || upstreamStatus >= 500;
      // Only classifications are logged. SDK error objects can contain document
      // text, complete prompts and credential-bearing request metadata.
      console.error('RFP section analysis failed', { code, upstreamStatus });
      res.status(upstreamStatus === 429 ? 429 : 502).json({
        error: retryable ? 'This section could not be analysed or its references could not be validated. Retry the unfinished sections.' : 'The AI service rejected the request. Its account or model configuration needs attention.',
        errorCode: code, retryable,
      });
    }
  });

  // Keep the old raw route explicit: large files use browser extraction and
  // bounded section requests, avoiding the hosting platform's body-size cap.
  app.post("/api/enable/rfp-analyze", (_req: Request, res: Response) => {
    res.status(400).json({ error: "Use the RFP / RFI upload screen. Documents are now extracted and reviewed in retryable sections." });
  });

}
