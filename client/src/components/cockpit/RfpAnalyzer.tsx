import { useEffect, useRef, useState } from 'react';
import { FileUp, Loader2, AlertTriangle } from 'lucide-react';
import { Pane, Eyebrow } from './atoms';
import { storedCompetitorTickers, useFocalVendor } from '@/lib/agBrief';
import { parseRfpFile, reviewRfpSection, type ParsedRfp } from '@/lib/rfpUpload';
import { isFictionalRfp, type RfpResult, type RfpSource } from '@shared/rfpAnalysis';

type Session = { filename: string; parsed: ParsedRfp; vendorId: string; competitorTickers: string[]; documentKind: 'request' | 'response'; fictional: boolean; failedSection?: number; results: Record<number, RfpResult> };
const button = 'rounded-full border border-[#a88945]/50 px-4 py-2 text-[12px] text-[#f4eed8] disabled:opacity-50';

function evidenceContext(session: Session) {
  const name = Object.values(session.results)[0]?.vendorName ?? session.vendorId;
  return session.fictional
    ? `Fictional test input. ${name} is the AnalystGenius comparison context only. It is separate from the fictional buyer, bidders, and their claims.`
    : `AnalystGenius company context: ${name}.`;
}

function sourceMetadata(source: RfpSource) {
  return [
    `Publisher: ${source.publisher ?? 'not supplied'}`,
    `Dataset and field: ${source.source}`,
    ...(source.recordLocator ? [`Record locator: ${source.recordLocator}`] : []),
    ...(source.evidenceBasis ? [`Evidence basis: ${source.evidenceBasis}`] : []),
    ...(source.scope ? [`Source scope: ${source.scope}`] : []),
    `AG read: ${source.retrievedAt}`,
    `Source generated: ${source.sourceDate ?? 'not supplied'}`,
    `Reporting period: ${source.reportingPeriod ?? 'not supplied'}`,
    'External reuse rights: not supplied',
  ];
}

function sourceUrl(source: RfpSource) {
  const path = source.recordPath;
  // Link only to the existing AG proxy. Never send readers to a URL from model output.
  if (!path || !/^\/api\/ag\/(?:providers$|(?:snapshot|narrative-reality-gap|reputation-trends)\?ticker=[A-Z0-9.]+$)/.test(path)) return null;
  return new URL(path, window.location.origin).href;
}

const fictionalEvidenceLimit = 'Applicability: this separate company context informs evaluation questions only. It does not substantiate the fictional bid, service capability or savings claim.';

function EvidenceCard({ source }: { source: RfpSource }) {
  const url = sourceUrl(source);
  return <div className="mt-3 border-t border-current/15 pt-3" data-testid="rfp-source">
    <p><strong>{source.id} · {source.title}</strong></p>
    <p>{source.detail}</p>
    {sourceMetadata(source).map(line => <p key={line}>{line}</p>)}
    {url && <a className="underline" href={url} target="_blank" rel="noreferrer">Open AnalystGenius record (current read)</a>}
  </div>;
}

export default function RfpAnalyzer() {
  const { focalVendorId } = useFocalVendor();
  const [documentKind, setDocumentKind] = useState<'request' | 'response'>('request');
  const [fictional, setFictional] = useState(false);
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
          const result = await reviewRfpSection({ filename: current.filename, documentText: section.text, documentKind: current.documentKind, vendorId: current.vendorId, competitorTickers: current.competitorTickers, fictional: current.fictional }, signal);
          current.results[section.index] = result;
          setSession({ ...current, results: { ...current.results } });
          setProgress(`Reviewed ${Object.keys(current.results).length} of ${current.parsed.sections.length} sections`);
        } catch (e) {
          if (!signal.aborted && !failure) {
            failure = e instanceof Error ? e.message : 'A section failed. Retry unfinished sections.';
            current.failedSection = section.index + 1;
          }
        }
      }
    };
    await Promise.all([worker(), worker()]);
    if (failure && !signal.aborted) {
      setError(failure);
      setSession({ ...current });
    }
  }

  async function upload(file: File) {
    if (controller.current) return;
    const control = new AbortController(); controller.current = control;
    setBusy(true); setError(null); setSession(null); setProgress('Extracting document text…');
    try {
      const parsed = await parseRfpFile(file, setProgress);
      control.signal.throwIfAborted();
      const next: Session = { filename: file.name, parsed, vendorId: focalVendorId || 'capgemini', competitorTickers: storedCompetitorTickers(), documentKind, fictional: fictional || isFictionalRfp(parsed.text), results: {} };
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
    setSession({ ...session, failedSection: undefined });
    try { await run({ ...session, failedSection: undefined, results: { ...session.results } }, control.signal); }
    finally { if (controller.current === control) { controller.current = null; setBusy(false); } }
  }
  const count = session ? Object.keys(session.results).length : 0;
  const complete = Boolean(session && count === session.parsed.sections.length);
  const missingSections = session?.parsed.sections.flatMap((_, i) => i in session.results ? [] : [i + 1]) ?? [];
  const coverageDetail = `Failed: ${session?.failedSection ?? 'none'}. Unreviewed: ${missingSections.join(', ') || 'none'}.`;
  function download() {
    if (!session) return;
    const report = [
      `# RFI/RFP review: ${session.filename}`,
      `${complete ? 'All extracted text reviewed' : 'PARTIAL REVIEW'}: ${count}/${session.parsed.sections.length} sections.`,
      coverageDetail,
      `Mode: real document upload. Document type: ${session.documentKind === 'request' ? 'RFI / RFP request' : 'Draft response'}. Exported: ${new Date().toISOString()}.`,
      evidenceContext(session),
      'AI recommendations require human review. Separate section reviews do not certify whole-document compliance. AG evidence does not establish external reuse permission.',
      ...session.parsed.warnings,
      ...Object.entries(session.results).sort(([a], [b]) => +a - +b).flatMap(([i, r]) => [
        `\n## Section ${+i + 1} (AG comparison context: ${r.vendorName})`, r.documentSummary, `${r.dataStatus}: ${r.dataNote} Reviewed: ${r.completedAt}`,
        ...(r.insightNote ? [`No analyst insertion: ${r.insightNote}`] : []),
        ...(r.executiveDecision ? [`Decision recommendation for ${r.executiveDecision.owner}\n${r.executiveDecision.action}\nEvidence needed: ${r.executiveDecision.evidenceNeeded.join(' · ')}`] : []),
        ...r.requirements.map(x => `\nRequirement (${x.priority}) at ${x.location}: ${x.requirement}\nDocument: ${x.documentQuote}\nResponse guidance: ${x.responseGuidance}`),
        ...r.strengthsFound.map(x => `\nStrength at ${x.location}: ${x.observation}\nDocument: ${x.documentQuote}`),
        ...r.suggestions.map(x => `\n${x.title} (${x.category}) at ${x.location}\n${x.detail}\nDocument: ${x.documentQuote}\nRecommended action: ${x.suggestedAction}`),
        ...r.analystInsights.flatMap(x => [
          `\nSuggested analyst insight insertion — draft for human review\nPlacement: after the quoted text at ${x.location}\nDocument: ${x.documentQuote}\nWhy: ${x.rationale}\nDraft wording: ${x.suggestedText}`,
          ...(session.fictional ? [fictionalEvidenceLimit] : []),
          ...x.sourceIds.flatMap(id => {
            const source = r.sources.find(item => item.id === id);
            if (!source) return [];
            const url = sourceUrl(source);
            return [[`Source ${source.id}: ${source.title}`, source.detail, ...sourceMetadata(source),
              ...(url ? [`[Open AnalystGenius record (current read)](${url})`] : []),
            ].join('\n\n')];
          }),
        ]),
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
      <label className="mt-3 flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={fictional} disabled={busy} onChange={event => setFictional(event.target.checked)} />
        This document is fictional
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
        <p>{coverageDetail}</p>
        <p data-testid="rfp-evidence-context">{evidenceContext(session)}</p>
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
        <summary className="cursor-pointer font-semibold text-[#f4eed8]">Section {+index + 1} · {result.requirements.length} requirements · {result.analystInsights.length} suggested analyst inclusions</summary>
        <p className="my-3">{result.documentSummary}</p>
        <p className="text-[#e5c989]">AG evidence: {result.dataStatus}. {result.dataNote}</p>
        <p>Reviewed: {result.completedAt}</p>
        {result.executiveDecision && <div className="my-4">
          <h3 className="font-semibold text-[#f4eed8]">Decision recommendation for {result.executiveDecision.owner}</h3>
          <p>{result.executiveDecision.action}</p>
          <p>Evidence needed: {result.executiveDecision.evidenceNeeded.join(' · ')}</p>
        </div>}
        <h3 className="mt-5 font-semibold text-[#f4eed8]">Requirements and response guidance</h3>
        {!result.requirements.length && <p>No explicit requirements identified in this section.</p>}
        {result.requirements.map((r, i) => <div key={i} className="my-3 border-l-2 border-[#63d7de] pl-3"><strong>{r.requirement}</strong><p>Priority: {r.priority} · {r.location}</p><blockquote className="my-1 text-white/50">“{r.documentQuote}”</blockquote><p>{r.responseGuidance}</p></div>)}
        <h3 className="mt-5 font-semibold text-[#f4eed8]">Strengths</h3>
        {result.strengthsFound.map((s,i) => <p key={i} className="my-2">{s.observation}<span className="block text-white/50">Document: “{s.documentQuote}”</span></p>)}
        <h3 className="mt-5 font-semibold text-[#f4eed8]">Gaps, risks and improvements</h3>
        {result.suggestions.map((s,i) => <div key={i} className="my-3 rounded-lg bg-white/5 p-3"><strong>{s.title}</strong><p>{s.location}</p><p>{s.detail}</p><blockquote className="my-1 text-white/50">“{s.documentQuote}”</blockquote><p>Suggested action: {s.suggestedAction}</p></div>)}
        <h3 className="mt-5 font-semibold text-[#f4eed8]">Suggested analyst insight inclusions</h3>
        {!result.analystInsights.length && <p>{result.insightNote ?? 'No relevant, source-linked AG inclusion was identified for this section.'}</p>}
        {result.analystInsights.map((s,i) => <div key={i} className="my-3 rounded-lg border border-[#a88945]/40 p-4"><h4 className="font-semibold">Suggested analyst insight insertion — draft for human review</h4><p><strong>Suggested placement:</strong> after the quoted text at {s.location}</p><blockquote className="my-2 text-white/50">“{s.documentQuote}”</blockquote><p>{s.rationale}</p><p className="mt-3 font-semibold">Draft wording for review</p><p className="my-2">{s.suggestedText}</p>{session.fictional && <p>{fictionalEvidenceLimit}</p>}{s.sourceIds.map(id => { const source = result.sources.find(x => x.id === id); return source ? <EvidenceCard key={id} source={source} /> : null; })}</div>)}
      </details>)}
    </div>}
  </section>;
}
