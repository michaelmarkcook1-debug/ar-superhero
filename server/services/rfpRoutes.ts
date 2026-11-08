import type { Express, Request, Response } from "express";
import { z } from "zod";
import { VENDORS } from "./vendors";
import { RFP_SECTION_CHARS, RFP_TYPES } from "@shared/rfpAnalysis";
import { analyzeRfp } from "./rfpAnalyzer";

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
    } catch {
      res.status(502).json({ error: "This section could not be analysed or its references could not be validated. Retry the unfinished sections.", retryable: true });
    }
  });

  // Keep the old raw route explicit: large files use browser extraction and
  // bounded section requests, avoiding the hosting platform's body-size cap.
  app.post("/api/enable/rfp-analyze", (_req: Request, res: Response) => {
    res.status(400).json({ error: "Use the RFP / RFI upload screen. Documents are now extracted and reviewed in retryable sections." });
  });

}
