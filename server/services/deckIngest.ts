import { inflateRawSync } from "node:zlib";

// ============================================================================
// PPTX text ingestion — dependency-free.
//
// A .pptx is a ZIP of XML parts. We read the ZIP central directory directly
// and inflate only the slide parts (ppt/slides/slideN.xml), then pull the
// visible text runs (<a:t>) per slide. We extract text VERBATIM — no
// summarisation, no rewriting — so reused content in composed decks is
// exactly what the original deck said, with provenance.
// ============================================================================

export interface IngestedSlide {
  index: number; // 1-based slide number
  texts: string[]; // visible text runs, in document order
}

export interface IngestResult {
  slideCount: number;
  slides: IngestedSlide[];
}

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

function readCentralDirectory(buf: Buffer): ZipEntry[] {
  // Find End Of Central Directory record (scan backwards; max comment 64k).
  let eocd = -1;
  const min = Math.max(0, buf.length - 65558);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid .pptx (ZIP end record not found)");

  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16); // central directory offset

  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(ptr) !== CENTRAL_SIG) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
    entries.push({ name, method, compressedSize, localOffset });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readEntryData(buf: Buffer, entry: ZipEntry): Buffer {
  const p = entry.localOffset;
  if (buf.readUInt32LE(p) !== LOCAL_SIG) throw new Error(`Bad local header for ${entry.name}`);
  const nameLen = buf.readUInt16LE(p + 26);
  const extraLen = buf.readUInt16LE(p + 28);
  const start = p + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return Buffer.from(raw);
  if (entry.method === 8) return inflateRawSync(raw);
  throw new Error(`Unsupported ZIP compression method ${entry.method} in ${entry.name}`);
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

function extractTexts(xml: string): string[] {
  const out: string[] = [];
  const re = /<a:t>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const t = decodeXmlEntities(m[1]).trim();
    if (t) out.push(t);
  }
  return out;
}

/** Parse a .pptx buffer into per-slide verbatim text. */
export function ingestPptx(buf: Buffer): IngestResult {
  const entries = readCentralDirectory(buf);
  const slideEntries = entries
    .map((e) => {
      const m = e.name.match(/^ppt\/slides\/slide(\d+)\.xml$/);
      return m ? { entry: e, index: Number(m[1]) } : null;
    })
    .filter((x): x is { entry: ZipEntry; index: number } => x !== null)
    .sort((a, b) => a.index - b.index);

  if (!slideEntries.length) throw new Error("No slides found — is this a .pptx file?");

  const slides: IngestedSlide[] = slideEntries.map(({ entry, index }) => ({
    index,
    texts: extractTexts(readEntryData(buf, entry).toString("utf8")),
  }));

  return { slideCount: slides.length, slides };
}
