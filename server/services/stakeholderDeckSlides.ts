import type pptxgen from 'pptxgenjs';
import { addBodySlide, addCards, addBulletList, type Brand } from './boardPack';
import { readProvenance } from './agIntelligenceSlide';
import type { ArBrief } from './agIntelligence';
import type { StakeholderInsight } from './stakeholderDeckInsight';

export function addStakeholderDecisionSlides(pptx: pptxgen, brand: Brand, insight: StakeholderInsight, brief: ArBrief, idx: () => string) {
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(), section: 'Your decision brief', title: insight.question,
    note: insight.mandate,
    caveat: readProvenance(brief),
    notes: [...insight.limitations, ...insight.priorities.map(p => `${p.title}: ${p.source}`)].join('\n'),
  });
  if (!insight.priorities.length) {
    addBulletList(slide, ['No usable AG evidence is available for this decision brief.', insight.output], { x: 0.75, y: contentTop, w: 11.83, h: 2, fontSize: 16 });
    return;
  }
  addCards(slide, insight.priorities.map(p => ({ title: p.title, body: p.detail, tag: 'AG evidence' })), { x: 0.75, y: contentTop, w: 11.83, cols: 3, h: 2.8 });
  for (const priority of insight.priorities) {
    const s = addBodySlide(pptx, brand, {
      index: idx(), section: 'Evidence and recommended response', title: priority.title,
      note: insight.mandate, caveat: priority.source,
      notes: `${priority.source}\n${readProvenance(brief)}\n${insight.limitations.join('\n')}`,
    });
    addCards(s.slide, [
      { title: 'What AG reports', body: priority.detail, tag: 'Sourced evidence' },
      { title: 'What you should decide', body: priority.recommendation, tag: 'Recommended response' },
    ], { x: 0.75, y: s.contentTop, w: 11.83, cols: 2, h: 3.1, numbered: false });
  }
}

export function addStakeholderEvidenceAppendix(pptx: pptxgen, brand: Brand, insight: StakeholderInsight, brief: ArBrief, idx: () => string) {
  // Preserve the complete supported evidence set, including signals that did
  // not make the three decision priorities. Four cards per page avoid truncation.
  for (let start = 0; start < insight.evidence.length; start += 4) {
    const entries = insight.evidence.slice(start, start + 4);
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(), section: 'AG evidence appendix', title: `Supporting evidence ${start + 1}–${start + entries.length}`,
      caveat: readProvenance(brief), notes: entries.map(e => `${e.title}\n${e.detail}\nSource: ${e.source}`).join('\n\n'),
    });
    addCards(slide, entries.map(e => ({ title: e.title, body: `${e.detail}\nSource: ${e.source}` })), { x: 0.75, y: contentTop, w: 11.83, cols: 2, h: 2.05, numbered: false });
  }
  const { slide, contentTop } = addBodySlide(pptx, brand, {
    index: idx(), section: 'Evidence limits', title: 'What this briefing can support',
    note: 'AG evidence and recommended actions remain distinguishable throughout the deck.',
  });
  addBulletList(slide, insight.limitations, { x: 0.75, y: contentTop, w: 11.83, h: 3.5, fontSize: 14 });
}
