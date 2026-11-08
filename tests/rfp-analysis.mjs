// Offline fixtures: no live AG or model requests.
import assert from 'node:assert/strict';
import express from 'express';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir, rm, readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
await mkdir('node_modules/.cache', {recursive:true});
const output = `${process.cwd()}/node_modules/.cache/rfp-tests.cjs`;
await build({ stdin:{contents:`export * from './server/services/rfpAnalyzer'; export * from './shared/rfpAnalysis'; export {registerRfpRoutes} from './server/services/rfpRoutes';`,resolveDir:process.cwd()}, outfile:output,bundle:true,platform:'node',format:'cjs',packages:'external',plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/^(ai|@ai-sdk\/anthropic)$|\.\/agIntelligence$/},a=>({path:a.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='ai'?`export const Output={object:x=>x}; export async function generateText(opts){globalThis.__rfpPrompt=opts.prompt; if(globalThis.__rfpError)throw globalThis.__rfpError; return globalThis.__rfpResponse;}`:a.path==='@ai-sdk/anthropic'?`export const anthropic=x=>x;`:`export async function getArBrief(opts){globalThis.__rfpOptions=opts;return globalThis.__rfpBrief;}`,loader:'js'}));
}}]});
try {
  const {validateRfpReview,rfpSources,analyzeRfp,RFP_MAX_BYTES,RFP_MAX_CHARS,RFP_SECTION_CHARS,RFP_SERVER_TIMEOUT_MS,RFP_REQUEST_TIMEOUT_MS,registerRfpRoutes}=require(output);
  assert.equal(RFP_MAX_BYTES,20*1024*1024);assert.equal(RFP_MAX_CHARS,600000);assert.equal(RFP_SECTION_CHARS,12000);
  const config=JSON.parse(await readFile('vercel.json','utf8'));
  assert.equal(config.functions['api/index.ts'].maxDuration,300);
  assert.ok(RFP_SERVER_TIMEOUT_MS<RFP_REQUEST_TIMEOUT_MS && RFP_REQUEST_TIMEOUT_MS<300000);
  const doc='Supplier must provide three client references. Explain your AI readiness.';
  const brief={live:true,generatedAt:'2026-11-07T12:00:00Z',focal:{ticker:'CTSH',name:'TEST vendor',assessmentScore:50,aiReadinessScore:45,revenueGrowthYoy:null,gapDirection:null,gapScore:null},competitors:[],emergencies:[],highlights:[],actions:[],competitorTickers:[],suggestedQuestions:[],sourceNote:'TEST'};
  const sources=rfpSources(brief);
  const review={documentSummary:'TEST summary.',requirements:[{documentQuote:'Supplier must provide three client references.',location:'Within this section',requirement:'Provide references',responseGuidance:'Confirm permission and relevance.',priority:'high'}],suggestions:[],strengthsFound:[],analystInsights:[{documentQuote:'Explain your AI readiness.',location:'AI readiness answer',sourceIds:[sources.find(s=>s.title.includes('AI readiness'.toLowerCase())).id],rationale:'Provides a sourced baseline.',suggestedText:'AI readiness 45.'}]};
  assert.equal(validateRfpReview(review,doc,sources).requirements.length,1);
  assert.equal(validateRfpReview({...review,analystInsights:[{...review.analystInsights[0],suggestedText:'AG read in 2026: AI readiness 45.'}]},doc,sources).analystInsights.length,1);
  assert.throws(()=>validateRfpReview({...review,requirements:[{...review.requirements[0],documentQuote:'Invented deadline'}]},doc,sources),/unsupported document/);
  assert.throws(()=>validateRfpReview({...review,analystInsights:[{...review.analystInsights[0],sourceIds:['made-up']}]},doc,sources),/unknown AG source/);
  assert.throws(()=>validateRfpReview({...review,analystInsights:[{...review.analystInsights[0],suggestedText:'AI readiness 99.'}]},doc,sources),/number absent/);
  assert.throws(()=>validateRfpReview({...review,requirements:[{...review.requirements[0],documentQuote:'   '}]},doc,sources),/unsupported document/);
  assert.throws(()=>validateRfpReview({...review,analystInsights:[{...review.analystInsights[0],suggestedText:'AI readiness 5.'}]},doc,sources),/number absent/);
  assert.equal(rfpSources({...brief,live:false}).length,0);assert.equal(rfpSources({...brief,degraded:true}).length,0);
  globalThis.__rfpBrief=brief;globalThis.__rfpResponse={output:review,finishReason:'stop'};
  const input={documentText:doc,filename:'TEST.txt',vendorId:'cognizant',documentKind:'request'};
  const before=process.env.ANTHROPIC_API_KEY;delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(()=>analyzeRfp(input),/not configured/);
  process.env.ANTHROPIC_API_KEY='TEST_ONLY_NOT_A_CREDENTIAL';
  let result=await analyzeRfp(input);
  assert.equal(globalThis.__rfpOptions.focalTicker,'CTSH');assert.equal(result.analysedCharacters,doc.length);
  assert.equal(result.dataStatus,'live');assert.doesNotMatch(globalThis.__rfpPrompt,/SELL_PROOF|Northstar|APPROVED.*PROOF/);
  globalThis.__rfpBrief={...brief,stale:true};result=await analyzeRfp(input);assert.equal(result.dataStatus,'stale');
  globalThis.__rfpBrief={...brief,live:false};globalThis.__rfpResponse.output={...review,analystInsights:[]};result=await analyzeRfp(input);assert.equal(result.dataStatus,'unavailable');assert.equal(result.sources.length,0);
  globalThis.__rfpResponse.finishReason='length';await assert.rejects(()=>analyzeRfp(input),/output limit/);
  globalThis.__rfpBrief=brief;globalThis.__rfpResponse={output:review,finishReason:'stop'};
  const app=express();app.use(express.json());registerRfpRoutes(app);
  const http=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
  try {
    const url=`http://127.0.0.1:${http.address().port}/api/enable/rfp-analyze-section`;
    const post=body=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const response=await post(input);assert.equal(response.status,200);assert.equal((await response.json()).analysedCharacters,doc.length);
    assert.equal((await post({...input,vendorId:'unknown'})).status,400);
    assert.equal((await post({...input,documentText:'X'.repeat(12001)})).status,400);
    const originalLog=console.error;const logs=[];console.error=(...args)=>logs.push(args);
    try{
      globalThis.__rfpError=Object.assign(new Error('PRIVATE DOCUMENT MUST NOT BE LOGGED'),{statusCode:401});
      const denied=await post(input);const deniedBody=await denied.json();assert.equal(denied.status,502);assert.equal(deniedBody.errorCode,'provider_401');assert.equal(deniedBody.retryable,false);
      globalThis.__rfpError=Object.assign(new Error('PRIVATE DOCUMENT MUST NOT BE LOGGED'),{statusCode:429});
      const limited=await post(input);assert.equal(limited.status,429);assert.equal((await limited.json()).retryable,true);
      globalThis.__rfpError=Object.assign(new Error('Your credit balance is too low. PRIVATE DOCUMENT MUST NOT BE LOGGED'),{statusCode:400});
      const billing=await post(input);const billingBody=await billing.json();assert.equal(billingBody.errorCode,'provider_billing');assert.equal(billingBody.retryable,false);assert.doesNotMatch(JSON.stringify(billingBody),/PRIVATE DOCUMENT/);
      assert.doesNotMatch(JSON.stringify(logs),/PRIVATE DOCUMENT/);
    }finally{globalThis.__rfpError=null;console.error=originalLog;}
    delete process.env.ANTHROPIC_API_KEY;const unavailable=await post(input);assert.equal(unavailable.status,503);assert.equal((await unavailable.json()).retryable,false);
    console.log('PASS actual HTTP handler: successful structured result, vendor/section validation and honest unconfigured response');
  } finally {await new Promise(resolve=>http.close(resolve));}
  if(before===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=before;
  console.log('PASS limits, actual vendor context, exact document quotations, source IDs, numeric insertions, stale/unavailable data, configuration and model output-limit handling');
} finally {await rm(output,{force:true});}
