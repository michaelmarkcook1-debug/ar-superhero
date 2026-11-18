import { createHash } from 'node:crypto';
import { agFetch, type AgFetchResult } from './agApi';
import type { RfpSource } from '@shared/rfpAnalysis';

// Retrieve the source records, not the cockpit's five-item presentation list.
// Topic matching admits candidates; the review model must still establish the
// relationship to a quoted requirement. No numeric scores or third-party quotes
// are promoted into evidence for a fictional supplier.
const topics = [
  /\b(costs?|prices?|pricing|savings?|benefits?|value|investment|roi|profitability|margin)\b/i,
  /\b(ai|automation|automated|artificial intelligence|digital transformation)\b/i,
  /\b(service|delivery|support|availability|sla|quality|operations?)\b/i,
  /\b(evidence|baseline|validation|measurement|corroborat\w*|assurance)\b/i,
  /\b(security|privacy|compliance|personal data)\b/i,
  /\b(transition|staffing|workforce|skills?|reskilling|adoption)\b/i,
];
const limitation = /limited|little basis|insufficient|no direct|does(?: not|n['’]t) (?:show|establish|demonstrate|provide enough)|not enough/i;
type Candidate = RfpSource & { rank: number };
type FetchRecord = (path: string, query: Record<string, string>) => Promise<AgFetchResult>;
const object = (value: unknown): Record<string, any> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : undefined;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())) : [];

export async function getFictionalRfpEvidence(documentText: string, ticker: string, fetchRecord: FetchRecord = agFetch) {
  const paths = ['providers/snapshot', 'reputation-tracker/trends', 'narrative-reality-gap'] as const;
  const records = await Promise.all(paths.map(async path => {
    try {
      const result = await fetchRecord(path, { ticker });
      return { path, result, retrievedAt: new Date().toISOString() };
    } catch {
      return { path, result: { status: 502, body: null }, retrievedAt: new Date().toISOString() };
    }
  }));
  const candidates: Candidate[] = [];
  let available = 0;
  for (const { path, result, retrievedAt } of records) {
    const body = object(result.body);
    if (result.status < 200 || result.status >= 300 || !body || body.success === false) continue;
    const record = path === 'providers/snapshot' ? object(body.snapshot)
      : path === 'narrative-reality-gap' ? object(body.gap) : body;
    // Never admit evidence from a prior/different vendor or an unidentifiable response.
    if (!record || record.ticker !== ticker) continue;
    available++;
    const company = record.displayName ?? record.providerName ?? record.companyName ?? record.name ?? ticker;
    const endpoint = path === 'providers/snapshot' ? 'snapshot' : path === 'reputation-tracker/trends' ? 'reputation-trends' : 'narrative-reality-gap';
    const add = (detail: string, locator: string, kind: 'risk' | 'question' | 'limitation', title: string) => {
      const matches = topics.filter(topic => topic.test(documentText) && topic.test(detail)).length;
      if (matches < 2 && !(kind === 'limitation' && matches >= 1 && limitation.test(detail))) return;
      const sourceDate = typeof record.generatedAt === 'string' ? record.generatedAt : undefined;
      candidates.push({
        id: `AG-${createHash('sha256').update(JSON.stringify([ticker, path, locator, detail, sourceDate])).digest('hex').slice(0, 16)}`,
        title: `${company}: ${title}`, detail,
        source: `AG ${path}: ${locator}`, publisher: 'AnalystGenius', retrievedAt, sourceDate,
        recordPath: `/api/ag/${endpoint}?ticker=${encodeURIComponent(ticker)}`, recordLocator: locator,
        evidenceBasis: kind === 'question' ? 'AG suggested research question; not an observed customer outcome'
          : 'AG qualitative synthesis; not independently corroborated customer evidence',
        scope: `${company} company context, used only to motivate evaluation questions. Not evidence of the fictional bidder, service capability or savings.`,
        rank: matches * 10 + (kind === 'risk' ? 3 : kind === 'question' ? 2 : 1),
      });
    };
    if (path === 'providers/snapshot') {
      // Preserve original array indexes so the locator resolves exactly.
      if (Array.isArray(record.topRisks)) record.topRisks.forEach((risk: unknown, i: number) => {
        if (typeof risk === 'string' && risk.trim()) add(risk, `snapshot.topRisks[${i}]`, 'risk', 'qualitative risk');
      });
    } else if (path === 'reputation-tracker/trends') {
      if (Array.isArray(record.suggestedQuestions)) record.suggestedQuestions.forEach((question: unknown, i: number) => {
        if (typeof question === 'string' && question.trim()) add(question, `suggestedQuestions[${i}]`, 'question', 'suggested research question');
      });
    } else if (Array.isArray(record.topDivergences)) {
      record.topDivergences.forEach((value: unknown, i: number) => {
        const d = object(value);
        if (typeof d?.interpretation === 'string' && limitation.test(d.interpretation)) {
          add(d.interpretation, `gap.topDivergences[${i}].interpretation`, 'limitation', strings([d.theme])[0] ?? 'evidence limitation');
        }
      });
    }
  }
  const sources: RfpSource[] = candidates.sort((a, b) => b.rank - a.rank).slice(0, 6).map(({ rank, ...source }) => source);
  return { sources, available, attempted: paths.length, retrievedAt: new Date().toISOString() };
}
