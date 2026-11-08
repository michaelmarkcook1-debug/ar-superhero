import { RFP_REQUEST_TIMEOUT_MS, RFP_MAX_BYTES, RFP_MAX_CHARS, RFP_MAX_PAGES, RFP_SECTION_CHARS, RfpResultSchema, type RfpResult } from '@shared/rfpAnalysis';

export type ParsedRfp = { text: string; sections: string[]; pages: number | null; warnings: string[] };
export function splitRfpText(text: string): string[] {
  const sections: string[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + RFP_SECTION_CHARS, text.length);
    if (end < text.length) {
      const paragraph = text.lastIndexOf('\n', end - 1);
      if (paragraph > start + RFP_SECTION_CHARS / 2) end = paragraph + 1;
      if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    sections.push(text.slice(start, end)); start = end;
  }
  return sections;
}
export async function parseRfpFile(file: File, progress: (message: string) => void): Promise<ParsedRfp> {
  if (!file.size || file.size > RFP_MAX_BYTES) throw new Error('Choose a non-empty PDF, DOCX or TXT file up to 20 MB.');
  const ext = file.name.toLowerCase().split('.').pop();
  const data = new Uint8Array(await file.arrayBuffer());
  let text = ''; let pages: number | null = null;
  const warnings: string[] = [];
  if (ext === 'txt') {
    text = new TextDecoder('utf-8', { fatal: true }).decode(data);
    if (text.includes('\0')) throw new Error('The TXT file contains binary data. Use UTF-8 text.');
  } else if (ext === 'docx') {
    const { unzipSync, strFromU8 } = await import('fflate');
    const parts = unzipSync(data, { filter: entry => {
      if (entry.name !== 'word/document.xml') return false;
      if (entry.originalSize > 16 * 1024 * 1024) throw new Error('DOCX content is too large to extract safely. Split the document.');
      return true;
    } });
    if (!parts['word/document.xml']) throw new Error('No readable Word document body was found.');
    const xml = new DOMParser().parseFromString(strFromU8(parts['word/document.xml']), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('The DOCX contains invalid XML. Save a fresh copy and retry.');
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    text = Array.from(xml.getElementsByTagNameNS(ns, 'p')).map(p => Array.from(p.getElementsByTagNameNS(ns, 't')).map(t => t.textContent ?? '').join('')).join('\n');
    warnings.push('DOCX body text and table-cell text only. Images, headers, footers, comments and tracked-change meaning are not reviewed.');
  } else if (ext === 'pdf') {
    const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = workerUrl;
    const task = getDocument({ data });
    try {
      const pdf = await task.promise; pages = pdf.numPages;
      if (pages > RFP_MAX_PAGES) throw new Error('PDF exceeds 500 pages. Split it into smaller documents.');
      const parts: string[] = []; const unreadable: number[] = []; let length = 0;
      for (let n = 1; n <= pages; n++) {
        progress(`Extracting PDF page ${n} of ${pages}`);
        const page = await pdf.getPage(n); const content = await page.getTextContent();
        const body = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
        if (!body) unreadable.push(n);
        const part = `[Page ${n}]\n${body}`; parts.push(part); length += part.length + 2;
        if (length > RFP_MAX_CHARS) throw new Error('Document exceeds 600,000 extracted characters. Split it into smaller documents.');
        page.cleanup();
      }
      if (unreadable.length === pages) throw new Error('This PDF needs OCR. Upload a text-readable PDF, DOCX or TXT version.');
      if (unreadable.length) warnings.push(`No text on page(s) ${unreadable.join(', ')}. Those pages may be blank or scanned and are not reviewed.`);
      text = parts.join('\n\n');
      warnings.push('PDF text only. Images, diagrams and visual layout are not reviewed.');
    } finally { await task.destroy(); }
  } else throw new Error('Unsupported format. Choose PDF, DOCX or TXT.');
  text = text.trim();
  if (!text) throw new Error('No readable text was found.');
  if (text.length > RFP_MAX_CHARS) throw new Error('Document exceeds 600,000 extracted characters. Split it into smaller documents.');
  return { text, sections: splitRfpText(text), pages, warnings };
}

export async function reviewRfpSection(input: { filename: string; documentText: string; documentKind: 'request' | 'response'; vendorId: string; competitorTickers: string[] }, signal: AbortSignal): Promise<RfpResult> {
  let error: Error = new Error('Analysis failed.');
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    let retryable = true;
    try {
      const response = await fetch('/api/enable/rfp-analyze-section', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input), signal: AbortSignal.any([signal, AbortSignal.timeout(RFP_REQUEST_TIMEOUT_MS)]),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        retryable = body.retryable !== false && (response.status === 429 || response.status >= 500);
        throw new Error(body.error ?? `Analysis request failed (${response.status}).`);
      }
      const parsed = RfpResultSchema.safeParse(body);
      if (!parsed.success) throw new Error('Analysis returned an incomplete result. Retry the unfinished sections.');
      const result = parsed.data;
      if (result.filename !== input.filename || result.documentKind !== input.documentKind || result.analysedCharacters !== input.documentText.length) throw new Error('The returned result does not match this document section.');
      return result;
    } catch (e) {
      signal.throwIfAborted();
      error = e instanceof Error ? e : error;
      if (!retryable || attempt === 2) throw error;
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(signal.reason); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 1000 * 2 ** attempt);
        signal.addEventListener('abort', abort, { once: true });
      });
    }
  }
  throw error;
}
