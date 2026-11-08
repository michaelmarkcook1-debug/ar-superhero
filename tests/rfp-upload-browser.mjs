// Actual browser parsing with offline AI/API fixtures only.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { zipSync, strToU8 } from 'fflate';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server=await createServer({optimizeDeps:{include:['pdfjs-dist/legacy/build/pdf.mjs','fflate']},server:{host:'127.0.0.1',port:5176,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ag-focal-vendor-id','cognizant'));
 let requests=[];let fail=false;let failMarker='';let malformed=false;let withInsights=false;
 await page.route('**/api/**',async route=>{
  if(!route.request().url().endsWith('/rfp-analyze-section'))return route.fulfill({status:503,json:{error:'API excluded from UI test'}});
  const input=route.request().postDataJSON();requests.push(input);
  assert.ok(Buffer.byteLength(route.request().postData())<100*1024);assert.equal(input.vendorId,'cognizant');assert.ok(!('proofPoints' in input));
  if(fail && input.documentText.includes(failMarker))return route.fulfill({status:502,json:{error:'TEST temporary failure',retryable:true}});
  const quote=input.documentText.slice(0,50);
  const result={filename:input.filename,documentKind:input.documentKind,vendorName:'Cognizant',documentSummary:'TEST section summary',requirements:[{documentQuote:quote,location:'Within this section',requirement:'TEST requirement',responseGuidance:'TEST recommendation',priority:'high'}],suggestions:[],strengthsFound:[],analystInsights:[],sources:[],dataStatus:'unavailable',dataNote:'TEST AG unavailable: document-only review',analysedCharacters:input.documentText.length,completedAt:'2026-11-07T12:00:00Z'};
  if(withInsights){result.sources=[{id:'TEST-AG-1',title:'TEST source title',detail:'TEST evidence detail',source:'TEST AG fixture',retrievedAt:'2026-11-07T12:00:00Z'}];result.analystInsights=[{documentQuote:quote,location:'TEST requirement',sourceIds:['TEST-AG-1'],rationale:'TEST relevance',suggestedText:'TEST draft wording'}];result.dataStatus='live';result.dataNote='TEST AG fixture only';}
  return route.fulfill({json:malformed?{}:result});
 });
 await page.goto('http://127.0.0.1:5176/#/enable',{waitUntil:'domcontentloaded'});
 await page.getByTestId('subnav-rfp').click();
 const input=page.getByTestId('input-rfp-file');
 const upload=async(name,buffer)=>{await input.setInputFiles({name,mimeType:'application/octet-stream',buffer});};
 const done=async()=>{await page.getByTestId('rfp-coverage').filter({hasText:'All extracted text reviewed'}).waitFor({timeout:15000}).catch(async e=>{console.error('UI ERROR:',await page.getByTestId('rfp-analyzer').innerText());throw e;});await page.getByTestId('button-upload-rfp').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('[data-testid="button-upload-rfp"]').disabled);};
 await upload('TEST.txt',Buffer.from('Provide a client reference and explain AI readiness.'));await done();assert.equal(requests.length,1);
 await page.getByLabel('Document type').selectOption('response');
 requests=[];
 const long='Provide evidence for this requirement.\n'.repeat(7000);
 await upload('TEST-large.txt',Buffer.from(long));await done();assert.ok(requests.length>10);assert.equal(requests.map(r=>r.documentText).join(''),long.trim());assert.equal(requests[0].documentKind,'response');
 requests=[];const maximum='A'.repeat(600000);await upload('TEST-maximum.txt',Buffer.from(maximum));await done();assert.equal(requests.map(r=>r.documentText).join(''),maximum);
 const maximumCalls=requests.length;await upload('TEST-over-limit.txt',Buffer.from(maximum+'A'));await page.getByTestId('rfp-error').filter({hasText:'600,000'}).waitFor();assert.equal(requests.length,maximumCalls);
 console.log('PASS full text above the old 60,000-character limit; bounded requests and selected vendor/type');
 requests=[];
 const xml='<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>TEST real Word content: provide client references.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>TEST table requirement.</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
 const docx=zipSync({'word/document.xml':strToU8(xml),'padding.bin':new Uint8Array(5*1024*1024)},{level:0});
 await upload('TEST.docx',Buffer.from(docx));await done();assert.ok(requests[0].documentText.includes('TEST table requirement.'));assert.ok(docx.length>4.5*1024*1024);console.log('PASS actual DOCX over platform body cap; body/table text extracted locally');
 // Minimal text-readable PDF with valid xref offsets.
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 const stream='BT /F1 12 Tf 40 700 Td (TEST PDF requirement: provide evidence.) Tj ET';objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
 let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 requests=[];await upload('TEST.pdf',Buffer.from(pdf));await done();assert.match(requests[0].documentText,/\[Page 1\]/);assert.match(requests[0].documentText,/provide evidence/);console.log('PASS actual PDF worker parsing and page attribution');
 requests=[];fail=true;failMarker='SECOND-SECTION';
 await upload('TEST-retry.txt',Buffer.from('A'.repeat(12000)+'SECOND-SECTION requirement.'));
 await page.getByRole('button',{name:'Retry unfinished sections'}).waitFor({timeout:20000});
 assert.match(await page.getByTestId('rfp-coverage').innerText(),/Review incomplete: 1\/2/);
 assert.equal(requests.filter(r=>r.documentText.includes(failMarker)).length,3);
 const successfulCalls=requests.filter(r=>!r.documentText.includes(failMarker)).length;
 fail=false;await page.getByRole('button',{name:'Retry unfinished sections'}).click();await done();
 assert.equal(requests.filter(r=>!r.documentText.includes(failMarker)).length,successfulCalls);console.log('PASS partial status, automatic retries and retry-only-unfinished behaviour');
 const before=requests.length;await upload('too-big.txt',Buffer.alloc(20*1024*1024+1,65));await page.getByTestId('rfp-error').waitFor();assert.equal(requests.length,before);assert.equal(await page.getByTestId('rfp-results').count(),0);
 await upload('bad.exe',Buffer.from('unsupported'));await page.getByTestId('rfp-error').filter({hasText:'Unsupported format'}).waitFor();assert.equal(requests.length,before);
 const exact=await page.evaluate(async()=>{const {splitRfpText}=await import('/src/lib/rfpUpload.ts');const t='😀 Word\n'.repeat(70000);const a=splitRfpText(t);return a.join('')===t&&a.every(x=>x.length<=12000);});assert.equal(exact,true);
 withInsights=true;await page.setViewportSize({width:390,height:844});await upload('TEST-mobile.txt',Buffer.from('TEST mobile requirement.'));await done();assert.ok(await page.getByRole('button',{name:'Download review',exact:true}).isVisible());assert.ok(await page.getByText('TEST draft wording',{exact:true}).isVisible());assert.ok(await page.getByText(/TEST evidence detail/).isVisible());
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 await page.screenshot({path:'node_modules/.cache/rfp-mobile.png',fullPage:true});
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download review',exact:true}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'rfp-analysis.md');let report='';for await(const chunk of await download.createReadStream())report+=chunk;assert.match(report,/TEST draft wording/);assert.match(report,/TEST source title/);assert.match(report,/TEST evidence detail/);
 malformed=true;requests=[];await upload('TEST-invalid-result.txt',Buffer.from('TEST requirement.'));await page.getByRole('button',{name:'Retry unfinished sections'}).waitFor({timeout:15000});assert.equal(requests.length,3);assert.equal(await page.getByTestId('rfp-results').count(),0);malformed=false;
 assert.deepEqual(errors,[]);
 console.log('PASS size/type rejection without false success, Unicode splitting, mobile results, report download and malformed-response rejection');
} finally {await browser.close();await server.close();}
