import { useEffect, useRef, useState } from 'react';
import { FileUp, Loader2, AlertTriangle } from 'lucide-react';
import { Pane, Eyebrow } from './atoms';
import { storedCompetitorTickers, useFocalVendor } from '@/lib/agBrief';
import { parseRfpFile, reviewRfpSection, type ParsedRfp } from '@/lib/rfpUpload';
import { type RfpResult } from '@shared/rfpAnalysis';

type Session = { filename: string; parsed: ParsedRfp; vendorId: string; competitorTickers: string[]; documentKind: 'request' | 'response'; results: Record<number, RfpResult> };
const button = 'rounded-full border border-[#a88945]/50 px-4 py-2 text-[12px] text-[#f4eed8] disabled:opacity-50';

export default function RfpAnalyzer() {
  const { focalVendorId } = useFocalVendor();
  const [documentKind, setDocumentKind] = useState<'request' | 'response'>('request');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function run(current: Session, signal: AbortSignal) {
    const pending = current.parsed.sections.map((text, index) => ({ text, index })).filter(s => !current.results[s.index]);
    let cursor = 0; let failure: string | null = null;
    const worker = async () => {
      while (cursor < pending.length && !signal.aborted && !failure) {
        const section = pending[cursor++];
        try {
          const result = await reviewRfpSection({ filename: current.filename, documentText: section.text, documentKind: current.documentKind, vendorId: current.vendorId, competitorTickers: current.competitorTickers }, signal);
          current.results[section.index] = result;
          setSession({ ...current, results: { ...current.results } });
          setProgress(`Reviewed ${Object.keys(current.results).length} of ${current.parsed.sections.length} sections`);
        } catch (e) {
          if (!signal.aborted) failure = e instanceof Error ? e.message : 'A section failed. Retry unfinished sections.';
        }
      }
    };
    await Promise.all([worker(), worker()]);
    if (failure && !signal.aborted) setError(failure);
  }

  async function upload(file: File) {
    if (controller.current) return;
    const control = new AbortController(); controller.current = control;
    setBusy(true); setError(null); setSession(null); setProgress('Extracting document text…');
    try {
      const parsed = await parseRfpFile(file, setProgress);
      control.signal.throwIfAborted();
      const next: Session = { filename: file.name, parsed, vendorId: focalVendorId || 'capgemini', competitorTickers: storedCompetitorTickers(), documentKind, results: {} };
      setSession(next); setProgress(`Reviewing ${parsed.sections.length} sections…`);
      await run(next, control.signal);
    } catch (e) {
      if (!control.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to read the document.');
    } finally {
      if (controller.current === control) { controller.current = null; setBusy(false); }
      if (inputRef.current) inputRef.current.value = '';
    }
  }
  async function retry() {
    if (!session || controller.current) return;
    const control = new AbortController(); controller.current = control;
    setBusy(true); setError(null); setProgress('Retrying unfinished sections…');
    try { await run({ ...session, results: { ...session.results } }, control.signal); }
    finally { if (controller.current === control) { controller.current = null; setBusy(false); } }
  }
  const count = session ? Object.keys(session.results).length : 0;
  const complete = Boolean(session && count === session.parsed.sections.length);
  function download() {
    if (!session) return;
    const report = [
      `# RFI/RFP review: ${session.filename}`,
      `${complete ? 'All extracted text reviewed' : 'PARTIAL REVIEW'}: ${count}/${session.parsed.sections.length} sections.`,
      `Document type: ${session.documentKind === 'request' ? 'RFI / RFP request' : 'Draft response'}. Company context: ${Object.values(session.results)[0]?.vendorName ?? session.vendorId}.`,
      'AI recommendations require human review. Separate section reviews do not certify whole-document compliance. AG evidence does not establish external reuse permission.',
      ...session.parsed.warnings,
      ...Object.entries(session.results).sort(([a], [b]) => +a - +b).flatMap(([i, r]) => [
        `\n## Section ${+i + 1} (${r.vendorName})`, r.documentSummary, `${r.dataStatus}: ${r.dataNote}. Reviewed: ${r.completedAt}`,
        ...r.requirements.map(x => `\nRequirement (${x.priority}) at ${x.location}: ${x.requirement}\nDocument: ${x.documentQuote}\nResponse guidance: ${x.responseGuidance}`),
        ...r.strengthsFound.map(x => `\nStrength at ${x.location}: ${x.observation}\nDocument: ${x.documentQuote}`),
        ...r.suggestions.map(x => `\n${x.title} (${x.category}) at ${x.location}\n${x.detail}\nDocument: ${x.documentQuote}\nRecommended action: ${x.suggestedAction}`),
        ...r.analystInsights.flatMap(x => [`\nSuggested analyst inclusion at ${x.location}\nDocument: ${x.documentQuote}\nWhy: ${x.rationale}\nDraft wording: ${x.suggestedText}`, ...x.sourceIds.map(id => { const s = r.sources.find(s => s.id === id)!; return `Source ${s.id}: ${s.title}. ${s.detail} (${s.source}; ${s.retrievedAt})`; })]),
      ]),
    ].join('\n\n');
    const url = URL.createObjectURL(new Blob([report], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'rfp-analysis.md'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="mb-14" data-testid="rfp-analyzer">
    <Eyebrow tone="teal" className="mb-4">Real RFI / RFP document analysis</Eyebrow>
    <Pane className="p-6">
      <h2 className="text-xl font-semibold text-[#f4eed8]">Upload a request or review your draft response.</h2>
      <p className="my-3 text-sm text-white/65">PDF, DOCX or TXT, up to 20 MB, 500 PDF pages and 600,000 extracted characters. Large documents are reviewed in sections. No text is silently cut off.</p>
      <p className="mb-4 text-sm text-white/65">Document text is extracted in your browser and sent for AI review with available AG evidence. Demo library entries are never used as proof. Keep this view open until you download your report.</p>
      <label className="block text-sm text-white/70">Document type
        <select aria-label="Document type" disabled={busy} value={documentKind} onChange={e => setDocumentKind(e.target.value as 'request' | 'response')} className="ml-3 rounded border border-white/20 bg-[#0c1a15] p-2">
          <option value="request">RFI / RFP request</option><option value="response">Draft response</option>
        </select>
      </label>
      <div className="my-4 rounded-xl border border-dashed border-white/25 p-5" data-testid="rfp-dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && !busy) void upload(file); }}>
        <button className={button} data-testid="button-upload-rfp" disabled={busy} onClick={() => inputRef.current?.click()}><FileUp className="mr-2 inline h-4 w-4" />Choose document and analyse</button>
        <span className="ml-3 text-sm text-white/55">or drop a file here</span>
        <input ref={inputRef} aria-label="Upload an RFP or RFI document" data-testid="input-rfp-file" type="file" accept=".pdf,.docx,.txt" disabled={busy} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      </div>
      {busy && <p role="status" className="text-sm text-white/75"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{progress}</p>}
      {error && <p role="alert" data-testid="rfp-error" className="my-4 text-sm text-[#e89797]">{error}</p>}
      {session && <div className="mt-4 text-sm text-white/70">
        <p data-testid="rfp-coverage">{complete ? 'All extracted text reviewed' : 'Review incomplete'}: {count}/{session.parsed.sections.length} sections of {session.filename}. {session.parsed.text.length.toLocaleString()} extracted characters.</p>
        {session.parsed.warnings.map(w => <p key={w} className="mt-2 text-[#e5c989]"><AlertTriangle className="mr-2 inline h-4 w-4" />{w}</p>)}
        <p className="mt-2">AI recommendations require human review. Separate section reviews do not certify whole-document compliance. Suggested wording is not cleared for external reuse.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {!busy && !complete && <button className={button} onClick={() => void retry()}>Retry unfinished sections</button>}
          {count > 0 && <button className={button} onClick={download}>Download {complete ? 'review' : 'partial review'}</button>}
        </div>
      </div>}
    </Pane>
    {session && count > 0 && <div data-testid="rfp-results" className="mt-6 space-y-4">
      {Object.entries(session.results).sort(([a], [b]) => +a - +b).map(([index, result]) => <details key={index} open={+index === 0} className="rounded-xl border border-white/15 p-5 text-sm text-white/75">
        <summary className="cursor-pointer font-semibold text-[#f4eed8]">Section {+index + 1} · {result.vendorName} · {result.requirements.length} requirements · {result.analystInsights.length} suggested analyst inclusions</summary>
        <p className="my-3">{result.documentSummary}</p><p className="text-[#e5c989]">{result.dataStatus === 'stale' ? 'Stale AG data. ' : ''}{result.dataNote}</p>
        <h3 className="mt-5 font-semibold text-[#f4eed8]">Requirements and response guidance</h3>
        {!result.requirements.length && <p>No explicit requirements identified in this section.</p>}
        {result.requirements.map((r, i) => <div key={i} className="my-3 border-l-2 border-[#63d7de] pl-3"><strong>{r.requirement}</strong><p>Priority: {r.priority} · {r.location}</p><blockquote className="my-1 text-white/50">“{r.documentQuote}”</blockquote><p>{r.responseGuidance}</p></div>)}
        <h3 className="mt-5 font-semibold text-[#f4eed8]">Strengths</h3>
        {result.strengthsFound.map((s,i) => <p key={i} className="my-2">{s.observation}<span className="block text-white/50">Document: “{s.documentQuote}”</span></p>)}
        <h3 className="mt-5 font-semibold text-[#f4eed8]">Gaps, risks and improvements</h3>
        {result.suggestions.map((s,i) => <div key={i} className="my-3 rounded-lg bg-white/5 p-3"><strong>{s.title}</strong><p>{s.detail}</p><blockquote className="my-1 text-white/50">“{s.documentQuote}”</blockquote><p>Suggested action: {s.suggestedAction}</p></div>)}
        <h3 className="mt-5 font-semibold text-[#f4eed8]">Suggested analyst insight inclusions</h3>
        {!result.analystInsights.length && <p>No relevant, source-linked AG inclusion was identified for this section.</p>}
        {result.analystInsights.map((s,i) => <div key={i} className="my-3 rounded-lg border border-[#a88945]/40 p-4"><p><strong>Suggested placement:</strong> {s.location}</p><blockquote className="my-2 text-white/50">“{s.documentQuote}”</blockquote><p>{s.rationale}</p><p className="mt-3 font-semibold">Draft wording for review</p><p className="my-2">{s.suggestedText}</p>{s.sourceIds.map(id => { const source = result.sources.find(x => x.id === id); return source ? <p key={id} className="mt-2 text-xs text-white/55">{source.title}: {source.detail}<br />Source: {source.source} · AG read: {source.retrievedAt}</p> : null; })}</div>)}
      </details>)}
    </div>}
  </section>;
}
