// Offline regression tests. All numbers and company names below are TEST FIXTURES.
// No live AG data, credentials or external services are used.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import JSZip from 'jszip';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const output = new URL('../node_modules/.cache/stakeholder-tests.cjs', import.meta.url).pathname;
await mkdir(new URL('../node_modules/.cache/', import.meta.url), { recursive: true });
const fixture = {
  live: true, generatedAt: '2026-11-07T12:00:00Z', competitorTickers: ['PEER', 'MISSING'],
  focal: { ticker: 'TEST', name: 'TEST FIXTURE COMPANY', assessmentScore: 60, aiReadinessScore: 45, revenueUsd: 1000000, revenueGrowthYoy: 2, gapScore: 12, gapDirection: 'over-hyped', gapHeadline: null, reputationInsightTitle: null, reputationInsightBody: null },
  competitors: [
    { ticker: 'PEER', name: 'TEST PEER', assessmentScore: 70, aiReadinessScore: 55, revenueGrowthYoy: 4, gapDirection: 'aligned', gapScore: 0 },
    { ticker: 'MISSING', name: 'MISSING SCORE FIXTURE', assessmentScore: null, aiReadinessScore: 80, revenueGrowthYoy: null, gapDirection: null, gapScore: null },
  ],
  emergencies: [{ id: 'risk-test', title: 'TEST delivery risk', detail: 'Synthetic fixture evidence for regression only.', source: 'TEST providers/snapshot' }],
  highlights: [{ id: 'strength-test', title: 'TEST capability strength', detail: 'Synthetic fixture strength for regression only.', source: 'TEST providers/snapshot' }],
  actions: [], suggestedQuestions: [], sourceNote: 'TEST FIXTURE ONLY',
  reputationLenses: [
    { name: 'Employee', prev: 60, last: 50, delta: -10, span: 'TEST Q2 to TEST Q3' },
    { name: 'Media', prev: 40, last: 55, delta: 15, span: 'TEST Q2 to TEST Q3' },
    { name: 'Customer', prev: 70, last: 65, delta: -5, span: 'TEST Q2 to TEST Q3' },
  ],
  gapAnalysis: { headline: null, direction: 'over-hyped', gapScore: 12, agInsight: null, narrativeSignals: [{ source: 'media', sentiment: 0, volume: 10, themes: ['TEST campaign'] }], realitySignals: [{ metric: 'ai', label: 'TEST AI metric', value: 0 }], topDivergences: [{ theme: 'TEST AI capability', narrativeScore: 70, realityScore: 40, delta: 30, interpretation: 'TEST fixture interpretation' }], generatedAt: '2026-11-07T12:00:00Z' },
};
globalThis.__deckFixture = fixture;
globalThis.__deckCalls = [];
const mocks = {
  agIntelligence: 'export const getArBrief = async () => globalThis.__deckFixture;',
  agApi: `export async function agFetch(path, query) {
    globalThis.__deckCalls.push([path, query]);
    if (path === 'providers/snapshot') return {status:200, body:{snapshot:{quarterlyRevenue:[{quarter:'2026-03-31',revenueUsdM:1},{quarter:'2026-06-30',revenueUsdM:2}],topStrengths:['TEST fixture strength'],topRisks:[]}}};
    if (path === 'talent/intelligence') return {status:200, body:{kpis:{headcount:100,headcountYoY:0,attritionPct:10,attritionWindow:'TEST annual'},flowSignals:{netFlow:0,aiSkillDensityPct:20}}};
    return {status:200, body:{sentimentTrend:{quarters:['TEST Q2','TEST Q3'],series:[{name:'Employee',data:[60,50]}]}}};
  }`,
  publicRankingsStore: 'export const publicRankingsStore = {listRankings: async () => []};',
  analystCoverageStore: 'export const analystCoverageStore = {list: async () => [], listCoverage: async () => []};',
  rosterSync: 'export const vendorAnalystView = async () => ({analysts:[],summary:{named:0,withPosition:0,withInteraction:0,stale:0}});',
  askStore: 'export const askStore = {list: async () => []};',
  resultsLearning: 'export const houseLearnings = async () => [];',
};
await build({
  stdin: { contents: `export {buildStakeholderInsight} from './server/services/stakeholderDeckInsight'; export {composeScenarioDeck} from './server/services/scenarioDeck'; export {createDirectPersonaDeck} from './server/services/directPersonaDeck'; export {BRIEFING_SCENARIOS} from './shared/briefingScenarios';`, resolveDir: process.cwd() },
  outfile: output, bundle: true, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'offline-fixtures', setup(b) {
    b.onResolve({ filter: /\.\/(agIntelligence|agApi|publicRankingsStore|analystCoverageStore|rosterSync|askStore|resultsLearning)$/ }, args => ({ path: args.path.split('/').pop(), namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'js' }));
  }}],
});
try {
  const { buildStakeholderInsight, composeScenarioDeck, createDirectPersonaDeck, BRIEFING_SCENARIOS } = require(output);
  let combinations = 0;
  for (const scenario of BRIEFING_SCENARIOS) for (const persona of scenario.personas) {
    const insight = buildStakeholderInsight(fixture, persona, scenario.id);
    assert.ok(insight.question && insight.mandate && insight.output);
    assert.ok(insight.priorities.length > 0 && insight.priorities.length <= 3);
    assert.ok(insight.evidence.every(e => e.source));
    assert.ok(insight.priorities.every(e => e.recommendation.includes(insight.output)));
    assert.ok(insight.limitations.some(l => l.includes('Missing values')));
    combinations++;
  }
  const marketing = buildStakeholderInsight(fixture, 'marketing', 'reputation-pulse');
  const delivery = buildStakeholderInsight(fixture, 'delivery', 'reputation-pulse');
  assert.notEqual(marketing.priorities[0].id, delivery.priorities[0].id);
  assert.match(marketing.priorities[0].title, /Media/);
  assert.match(delivery.priorities[0].title, /Employee/);
  assert.notEqual(buildStakeholderInsight(fixture, 'commercial', 'quarterly-update').question, buildStakeholderInsight(fixture, 'commercial', 'deal-support').question);
  assert.throws(() => buildStakeholderInsight(fixture, 'executive', 'narrative-campaign'));
  for (const flags of [{live:false},{degraded:true}]) {
    const unavailable = buildStakeholderInsight({...fixture,...flags}, 'executive', 'quarterly-update');
    assert.equal(unavailable.evidence.length, 0);
    assert.equal(unavailable.priorities.length, 0);
  }
  assert.ok(buildStakeholderInsight({...fixture, stale:true}, 'regional', 'quarterly-update').limitations.some(l => l.includes('previous complete read')));
  const zero = structuredClone(fixture); zero.focal.assessmentScore = 0;
  assert.ok(buildStakeholderInsight(zero, 'executive', 'quarterly-update').evidence.some(e => e.title.endsWith('assessment 0')));
  const missingSource = structuredClone(fixture); missingSource.emergencies[0].source = '';
  assert.ok(!buildStakeholderInsight(missingSource, 'delivery', 'quarterly-update').evidence.some(e => e.id === 'risk-test'));
  console.log(`PASS ${combinations} supported persona/deck combinations; source, stale, missing, zero and role-routing checks`);

  async function inspect(buffer) {
    const zip = await JSZip.loadAsync(buffer);
    const slidePaths = Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p));
    const xml = (await Promise.all(slidePaths.map(p => zip.file(p).async('string')))).join('\n');
    assert.match(xml, /Your decision brief|YOUR DECISION BRIEF/);
    assert.match(xml, /What you should decide/);
    assert.match(xml, /5135FF/); // existing AG house palette
    assert.match(xml, /Inter/);
    assert.match(xml, /AnalystGenius/);
    assert.doesNotMatch(xml, />NaN<|>undefined<|>null</);
    for (const chartPath of Object.keys(zip.files).filter(p => /^ppt\/charts\/chart\d+\.xml$/.test(p))) {
      const chart = await zip.file(chartPath).async('string');
      assert.doesNotMatch(chart, /MISSING SCORE FIXTURE/, 'Incomplete peer scores must not become chart zeros');
    }
    return {xml, count:slidePaths.length};
  }
  await mkdir('node_modules/.cache/deck-fixtures', {recursive:true});
  for (const [personaId, scenarioId] of [['commercial','deal-support'],['marketing','reputation-pulse'],['product','narrative-campaign'],['executive','quarterly-update'],['strategy','competitive-shift'],['delivery','pre-briefing-prep'],['product','assessment-kickoff'],['regional','leadership-onboarding']]) {
    const buffer = await composeScenarioDeck({ personaId, scenarioId, vendorId:'capgemini' });
    const {xml,count} = await inspect(buffer);
    assert.match(xml, /AG EVIDENCE APPENDIX/);
    assert.match(xml, /TEST annual/);
    await writeFile(`node_modules/.cache/deck-fixtures/TEST-${personaId}-${scenarioId}.pptx`, buffer);
    console.log(`PASS generated ${personaId}/${scenarioId}: ${count} slides, evidence appendix and AG branding`);
  }
  const standard = await createDirectPersonaDeck(['delivery']);
  await inspect(standard);
  console.log('PASS standard stakeholder deck includes the decision brief');
  globalThis.__deckFixture = {...fixture, live:false, degraded:true};
  const empty = await composeScenarioDeck({personaId:'executive',scenarioId:'quarterly-update'});
  const z = await JSZip.loadAsync(empty);
  const all = (await Promise.all(Object.keys(z.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p)).map(p => z.file(p).async('string')))).join('');
  assert.doesNotMatch(all, /TEST FIXTURE COMPANY|TEST PEER/);
  assert.match(all, /No usable AG evidence/);
  console.log('PASS unavailable data cannot leak stale fixture figures onto cover or decision slides');
} finally {
  await rm(output, {force:true});
}
