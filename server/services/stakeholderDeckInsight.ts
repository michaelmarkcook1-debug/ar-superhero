import type { ArBrief } from './agIntelligence';
import type { PersonaBriefing } from './personaBriefing';
import type { PersonaId } from './directPersonaDeck';
import { scenarioById, type PersonaScenarioId } from '@shared/briefingScenarios';

// Decision guidance is deliberately separate from sourced evidence. No model
// supplies numbers, forecasts, client facts or commitments to these decks.
export const ROLE_DECISIONS: Record<PersonaId, { mandate: string; action: string; lenses: string[]; focus: string[] }> = {
  executive: { mandate: 'Your decision: where leadership attention and investment are needed', action: 'Agree the business priority and accountable executive', lenses: ['Financial Analyst', 'Customer'], focus: ['growth', 'revenue', 'risk', 'assessment', 'competitor'] },
  strategy: { mandate: 'Your decision: which competitive position the firm can defend', action: 'Choose the positioning hypothesis and the evidence needed to test it', lenses: ['Financial Analyst', 'Media'], focus: ['gap', 'divergence', 'competitor', 'market'] },
  product: { mandate: 'Your decision: which capability needs roadmap investment or stronger proof', action: 'Identify the capability owner and request measured product or service outcomes', lenses: ['Employee · Technical'], focus: ['ai', 'readiness', 'capability', 'technical', 'platform', 'talent'] },
  marketing: { mandate: 'Your decision: which message the available evidence supports', action: 'Choose the audience and message, then clear the supporting proof before publication', lenses: ['Media', 'Social'], focus: ['narrative', 'gap', 'divergence', 'media', 'social'] },
  commercial: { mandate: 'Your decision: which competitive claims belong in the pursuit', action: 'Test the differentiator against the buyer requirement and obtain permission for any client proof', lenses: ['Customer', 'Pricing'], focus: ['competitor', 'customer', 'pricing', 'strength', 'assessment'] },
  delivery: { mandate: 'Your decision: which delivery commitment needs operational evidence', action: 'Assign the operational owner to validate capacity, service outcomes and any proposed commitment', lenses: ['Employee', 'Employee · Technical', 'Customer'], focus: ['delivery', 'employee', 'technical', 'customer', 'risk', 'talent'] },
  regional: { mandate: 'Your decision: which global signals warrant local validation', action: 'Validate the signal against the country pipeline, local customers and delivery capacity before acting', lenses: ['Customer', 'Media'], focus: ['region', 'customer', 'market', 'competitor'] },
};

const PURPOSE: Record<PersonaScenarioId, { question: string; output: string; focus: string[] }> = {
  'quarterly-update': { question: 'What warrants a change to your priorities at this review?', output: 'Record the priority, owner and measure to revisit at the next review.', focus: ['movement', 'reputation', 'growth', 'revenue'] },
  'pre-briefing-prep': { question: 'Which questions do you need evidence to answer in the briefing?', output: 'Prepare a sourced answer and an explicit acknowledgement of any evidence gap.', focus: ['divergence', 'gap', 'risk', 'question'] },
  'assessment-kickoff': { question: 'Which evidence must your team supply for this assessment?', output: 'Map the evidence to the selected study criteria and name the submission owner.', focus: ['assessment', 'readiness', 'gap', 'risk'] },
  'competitive-shift': { question: 'Which competitive differences justify a response?', output: 'Choose whether to respond, monitor or request more evidence. A score difference alone does not establish a recent shift.', focus: ['competitor', 'movement', 'assessment', 'readiness'] },
  'reputation-pulse': { question: 'Which reputation change on your desk needs investigation?', output: 'Check the underlying feedback before choosing a response and a follow-up measure.', focus: ['reputation', 'sentiment', 'media', 'customer', 'employee'] },
  'narrative-campaign': { question: 'Which message can you substantiate for this campaign?', output: 'Build a message-to-proof brief and withhold claims that exceed the evidence.', focus: ['narrative', 'gap', 'divergence', 'media', 'social'] },
  'deal-support': { question: 'Which evidence strengthens this pursuit without overclaiming?', output: 'Build the buyer-specific proof matrix. Deal requirements and commercial terms still need the pursuit team’s input.', focus: ['competitor', 'customer', 'pricing', 'strength', 'risk'] },
  'leadership-onboarding': { question: 'What should you understand and validate first in this role?', output: 'Set the initial stakeholder conversations and distinguish established evidence from open questions.', focus: ['assessment', 'readiness', 'growth', 'reputation', 'gap'] },
};

export interface DeckEvidence { id: string; title: string; detail: string; source: string; tags: string[] }
export interface StakeholderInsight {
  mandate: string;
  question: string;
  output: string;
  priorities: (DeckEvidence & { recommendation: string })[];
  evidence: DeckEvidence[];
  limitations: string[];
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function buildStakeholderInsight(brief: ArBrief, persona: PersonaId, scenarioId: PersonaScenarioId, context?: Pick<PersonaBriefing, 'talent' | 'quarterlyRevenue'> | null): StakeholderInsight {
  const scenario = scenarioById(scenarioId);
  if (!scenario?.personas.includes(persona)) throw new Error('Unsupported persona and deck type combination');
  const role = ROLE_DECISIONS[persona];
  const purpose = PURPOSE[scenarioId];
  const limitations = [
    'Recommendations are discussion guidance derived from the cited evidence, not observed decisions or forecasts.',
    ...(persona === 'regional' ? ['AG measures here are global. No country-specific conclusion follows without local evidence.'] : []),
    ...(brief.stale ? [`AG is serving a previous complete read from ${brief.generatedAt}. Refresh before relying on current conditions.`] : []),
  ];
  const evidence: DeckEvidence[] = [];
  const add = (item: DeckEvidence) => {
    if (item.source.trim() && !evidence.some(e => e.id === item.id)) evidence.push(item);
  };
  const f = brief.live && !brief.degraded ? brief.focal : undefined;
  if (!f) return { mandate: role.mandate, question: purpose.question, output: purpose.output, priorities: [], evidence, limitations: [...limitations, 'AG evidence unavailable for this read. No factual priorities have been inferred.'] };

  for (const key of ['assessmentScore', 'aiReadinessScore', 'revenueGrowthYoy'] as const) {
    const value = f[key];
    if (!finite(value)) continue;
    const label = { assessmentScore: 'Assessment', aiReadinessScore: 'AI readiness', revenueGrowthYoy: 'Revenue growth YoY' }[key];
    const unit = key === 'revenueGrowthYoy' ? '%' : '';
    const peers = brief.competitors.filter(c => finite(c[key]));
    const comparisons = peers.map(c => `${c.name}: ${c[key]}${unit}`).join('; ');
    add({ id: key, title: `${f.name}: ${label.toLowerCase()} ${value}${unit}`, detail: comparisons ? `Selected peer comparison: ${comparisons}. Only providers with a reported value are compared.` : 'No comparable peer value is available in this read.', source: key === 'assessmentScore' ? 'AG providers catalogue / providers/snapshot: assessmentScore (existing reconciliation)' : `AG providers/snapshot: ${key}`, tags: [label.toLowerCase(), 'competitor'] });
  }
  if (f.gapDirection && finite(f.gapScore)) add({ id: 'gap', title: `${f.name}: ${f.gapDirection}, gap ${f.gapScore}`, detail: 'AG compares the market narrative with measured performance. This is a positioning signal, not a prediction of an analyst outcome.', source: 'AG narrative-reality-gap: direction, gapScore', tags: ['narrative', 'gap'] });
  for (const l of brief.reputationLenses ?? []) {
    if (![l.prev, l.last].every(finite)) continue;
    const delta = Number((l.last - l.prev).toFixed(2));
    add({ id: `lens-${l.name}`, title: `${l.name} sentiment: ${delta > 0 ? '+' : ''}${delta} points`, detail: `${l.prev} to ${l.last}, ${l.span}. The series does not by itself establish the cause of the change.`, source: 'AG reputation-tracker/trends: sentimentTrend', tags: ['reputation', l.name.toLowerCase(), ...(role.lenses.includes(l.name) ? ['owned-lens'] : [])] });
  }
  for (const d of brief.gapAnalysis?.topDivergences ?? []) add({ id: `divergence-${d.theme}`, title: d.theme, detail: `Narrative ${finite(d.narrativeScore) ? d.narrativeScore : 'unavailable'}; measured reality ${finite(d.realityScore) ? d.realityScore : 'unavailable'}. ${d.interpretation ?? ''}`, source: 'AG narrative-reality-gap: topDivergences', tags: ['divergence', 'narrative', d.theme.toLowerCase()] });
  for (const s of brief.gapAnalysis?.narrativeSignals ?? []) add({ id: `channel-${s.source}`, title: `${s.source}: narrative channel`, detail: `Sentiment ${finite(s.sentiment) ? s.sentiment : 'unavailable'}; volume ${finite(s.volume) ? s.volume : 'unavailable'}. Themes: ${s.themes.join(', ') || 'none supplied'}.`, source: 'AG narrative-reality-gap: narrativeSignals', tags: ['narrative', s.source.toLowerCase()] });
  for (const s of brief.gapAnalysis?.realitySignals ?? []) {
    if (finite(s.value)) add({ id: `reality-${s.metric}`, title: s.label, detail: `AG reported value: ${s.value}. Metric: ${s.metric}.`, source: 'AG narrative-reality-gap: realitySignals', tags: [s.metric.toLowerCase(), s.label.toLowerCase()] });
  }
  for (const [tag, items] of [['risk', brief.emergencies], ['strength', brief.highlights], ['movement', brief.movement?.items ?? []]] as const) {
    for (const item of items) add({ id: item.id, title: item.title, detail: item.detail, source: item.source, tags: [tag, item.id.toLowerCase()] });
  }
  for (const t of context?.talent ?? []) {
    add({ id: `talent-${t.name}`, title: `${t.name}: workforce evidence`, detail: `Headcount ${t.headcount}; headcount YoY ${t.headcountYoY}; attrition ${t.attrition} (${t.attritionWindow}); net flow ${t.netFlow}; AI skill density ${t.aiSkillDensity}. Different reporting windows are not directly comparable.`, source: 'AG talent/intelligence: headcount, headcountYoY, attritionPct, attritionWindow, netFlow, aiSkillDensityPct', tags: ['talent', 'employee', 'technical', ...(t.isFocal && role.focus.includes('talent') ? ['owned-lens'] : [])] });
  }
  const revenue = (context?.quarterlyRevenue ?? []).filter(q => finite(q.revenueUsdM));
  if (revenue.length) add({ id: 'quarterly-revenue', title: `${f.name}: reported quarterly revenue`, detail: revenue.map(q => `${q.quarter}: USD ${q.revenueUsdM.toLocaleString('en-GB')}m`).join('; '), source: 'AG providers/snapshot: quarterlyRevenue; periods as supplied', tags: ['revenue', 'growth', 'movement'] });
  const relevance = (item: DeckEvidence) => {
    const text = `${item.tags.join(' ')} ${item.title}`.toLowerCase();
    return role.focus.filter(word => text.includes(word)).length * 2 + purpose.focus.filter(word => text.includes(word)).length * 3 + (item.tags.includes('owned-lens') ? 6 : 0);
  };
  const ranked = [...evidence].sort((a, b) => relevance(b) - relevance(a));
  const responseFor = (item: DeckEvidence) => {
    if (item.tags.includes('owned-lens')) return `Request the feedback behind ${item.title.toLowerCase()} and separate the observed movement from its possible causes.`;
    if (item.id === 'gap') return f.gapDirection === 'over-hyped'
      ? 'Identify which claims exceed the measured evidence and agree what must be qualified.'
      : f.gapDirection === 'under-recognized'
        ? 'Select a measured outcome that addresses the recognition gap and validate its reuse permissions.'
        : 'Check that the proposed message remains consistent with the measured position.';
    if (item.tags.includes('competitor')) return 'Check which named peer differences matter to this decision. AG composite scores alone do not establish deal-level or capability-level superiority.';
    if (item.tags.includes('divergence')) return `Test the evidence behind “${item.title}” before turning the interpretation into a claim.`;
    if (item.tags.includes('movement')) return 'Confirm the observation window and whether the movement changes your agreed priorities.';
    return `Validate the supporting evidence for “${item.title}” with the responsible team.`;
  };
  const priorities = ranked.filter(item => relevance(item) > 0).slice(0, 3).map(item => ({
    ...item,
    recommendation: `${responseFor(item)} ${role.action}. ${purpose.output}`,
  }));
  if (brief.competitors.some(c => !finite(c.assessmentScore) || !finite(c.aiReadinessScore))) limitations.push('Some peer scores are unavailable. Missing values are excluded from comparisons, never treated as zero.');
  return { mandate: role.mandate, question: purpose.question, output: purpose.output, priorities, evidence: ranked, limitations };
}
