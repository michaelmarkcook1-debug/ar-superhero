import { readCentralDirectory, readEntryData, decodeXmlEntities, type ZipEntry } from "./zipXml";

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
