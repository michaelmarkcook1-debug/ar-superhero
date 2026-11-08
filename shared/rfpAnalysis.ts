import { z } from 'zod';

export const RFP_MAX_BYTES = 20 * 1024 * 1024;
export const RFP_MAX_CHARS = 600_000;
export const RFP_SECTION_CHARS = 12_000;
export const RFP_MAX_PAGES = 500;
// Leave time for a structured error before the 300-second hosting deadline.
export const RFP_SERVER_TIMEOUT_MS = 270_000;
export const RFP_REQUEST_TIMEOUT_MS = 290_000;
export const RFP_TYPES = ['request', 'response'] as const;
const reference = z.object({ documentQuote: z.string().min(1), location: z.string().min(1) });
export const RfpReviewSchema = z.object({
  documentSummary: z.string().min(1),
  requirements: z.array(reference.extend({ requirement: z.string(), responseGuidance: z.string(), priority: z.enum(['high', 'medium', 'low']) })),
  suggestions: z.array(reference.extend({ category: z.enum(['evidence-gap', 'risk', 'clarity', 'competitive-positioning']), title: z.string(), detail: z.string(), suggestedAction: z.string() })),
  analystInsights: z.array(reference.extend({ sourceIds: z.array(z.string()).min(1), rationale: z.string(), suggestedText: z.string() })),
  strengthsFound: z.array(reference.extend({ observation: z.string() })),
});
export type RfpReview = z.infer<typeof RfpReviewSchema>;
export const RfpSourceSchema = z.object({ id: z.string(), title: z.string(), detail: z.string(), source: z.string(), retrievedAt: z.string() });
export type RfpSource = z.infer<typeof RfpSourceSchema>;
export const RfpResultSchema = RfpReviewSchema.extend({
  filename: z.string(), vendorName: z.string(), documentKind: z.enum(RFP_TYPES),
  sources: z.array(RfpSourceSchema), dataStatus: z.enum(['live', 'stale', 'unavailable']), dataNote: z.string(),
  analysedCharacters: z.number().int().positive(),
  completedAt: z.string(),
});
export type RfpResult = z.infer<typeof RfpResultSchema>;
