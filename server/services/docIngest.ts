import { readCentralDirectory, readEntryData, decodeXmlEntities } from "./zipXml";

// ============================================================================
// RFP/RFI document ingestion — dependency-free.
//
// Same approach as deckIngest.ts: a .docx is a ZIP of XML parts. We read
// word/document.xml directly and pull the visible text runs (<w:t>) in
// document order, paragraph breaks preserved. Verbatim extraction only — no
// summarisation, no rewriting — so downstream analysis reasons over exactly
// what the uploaded document says.
// ============================================================================

const MAX_CHARS = 60_000; // keep the analysis prompt bounded

export interface IngestedDocument {
  text: string;
  truncated: boolean;
}

function extractDocxText(buf: Buffer): string {
  const entries = readCentralDirectory(buf);
  const mainDoc = entries.find((e) => e.name === "word/document.xml");
  if (!mainDoc) throw new Error("No word/document.xml found — is this a .docx file?");

  const xml = readEntryData(buf, mainDoc).toString("utf8");
  const paragraphs: string[] = [];
  const runText = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;

  // Split on paragraph boundaries so structure survives, then pull runs
  // within each paragraph.
  for (const para of xml.split(/<w:p(?:\s[^>]*)?>/).slice(1)) {
    const body = para.split("</w:p>")[0];
    let m: RegExpExecArray | null;
    let line = "";
    runText.lastIndex = 0;
    while ((m = runText.exec(body))) {
      line += decodeXmlEntities(m[1]);
    }
    if (line.trim()) paragraphs.push(line.trim());
  }
  return paragraphs.join("\n");
}

/** Parse an uploaded RFP/RFI document. Supports .docx and plain .txt. */
export function ingestDocument(buf: Buffer, filename: string): IngestedDocument {
  const lower = filename.toLowerCase();
  let text: string;
  if (lower.endsWith(".docx")) {
    text = extractDocxText(buf);
  } else if (lower.endsWith(".txt")) {
    text = buf.toString("utf8");
  } else {
    throw new Error(
      "Unsupported file type — upload a .docx or .txt document. (.pdf support isn't built yet.)"
    );
  }
  text = text.trim();
  if (!text) throw new Error("No readable text found in this document.");
  const truncated = text.length > MAX_CHARS;
  return { text: truncated ? text.slice(0, MAX_CHARS) : text, truncated };
}
