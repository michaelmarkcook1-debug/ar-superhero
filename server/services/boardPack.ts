import pptxgen from "pptxgenjs";
import { CEO_HEADSHOT_JPEG_BASE64 } from "./ceoHeadshot";

// pptxgenjs ships a CJS module whose `module.exports` is the constructor.
// ESM↔CJS default-import interop differs by loader: native Node ESM and the
// esbuild production bundle expose the constructor as the default export,
// while tsx (esbuild-kit) nests it under `.default`. Resolve both so the
// server boots under dev (tsx) and prod (bundled) identically.
const PptxGenJSCtor = ((pptxgen as any)?.default ?? pptxgen) as typeof pptxgen;

// ============================================================================
// Board-pack PPT toolkit
//
// Shared layout primitives for AnalystGenius AR Superhero decks, modelled on
// the AnalystGenius board/C-suite "Defence Pack" house style:
//   - 16:9, dark navy cover and closing slides
//   - clean white body slides with a small "AnalystGenius · <deck>" header and
//     a slide number top-right
//   - navy table headers, muted grey / soft-green body rows
//   - evidence (E1–E3) and confidence labels
//   - decision/recommendation, risk register, controls, assumptions, provenance
//
// System PPT-safe fonts only (Arial / Georgia). No decorative icons or stock
// art — typography, tables, cards and whitespace carry the design.
// ============================================================================

export const PALETTE = {
  navy: "0B1F3A", // cover / closing background, table headers
  navyDeep: "071426", // deepest panel
  ink: "1A2433", // body text on white
  slate: "5B6877", // secondary text
  hair: "D9DEE6", // hairlines / table borders
  paper: "FFFFFF", // body slide background
  rowAlt: "F1F4F8", // muted grey zebra row
  rowGood: "EAF3EC", // soft green row (positive / safe)
  rowWarn: "FBF3E6", // soft amber (caution / open input)
  rowBad: "F7ECEC", // soft red (risk / unsupported)
  good: "2E7D5B", // green text
  warn: "9A6A12", // amber text
  bad: "9B3B2E", // red text
  gold: "A88945", // AnalystGenius accent
  white: "FFFFFF",
} as const;

export const FONT_HEAD = "Arial";
export const FONT_BODY = "Arial";
export const FONT_SERIF = "Georgia"; // used sparingly for cover title

const SHAPES = new PptxGenJSCtor().ShapeType;

export const SLIDE_W = 13.33;
export const SLIDE_H = 7.5;

export type Brand = {
  /** Vendor / customer the deck is prepared for, e.g. "Capgemini". */
  vendorName: string;
  /** Short brand mark, e.g. "C". */
  vendorMark: string;
  /** Vendor brand hex (no leading #). */
  vendorAccent: string;
  /** Deck title shown in the running header, e.g. "Executive — Analyst Influence Briefing". */
  deckLabel: string;
};

export function newDeck(meta: { title: string; subject: string }): pptxgen {
  const pptx = new PptxGenJSCtor();
  pptx.defineLayout({ name: "AR_WIDE", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "AR_WIDE";
  pptx.author = "AnalystGenius AR Superhero";
  pptx.company = "AnalystGenius";
  pptx.title = meta.title;
  pptx.subject = meta.subject;
  return pptx;
}

export async function deckToBuffer(pptx: pptxgen): Promise<Buffer> {
  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

// ---------------------------------------------------------------------------
// Cover slide — dark navy, vendor mark, deck title, context line.
// ---------------------------------------------------------------------------

export function addCover(
  pptx: pptxgen,
  brand: Brand,
  opts: {
    kicker: string; // e.g. "BOARD / C-SUITE ONLY"
    bigTitle: string; // e.g. "Capgemini — Executive Analyst Influence Briefing"
    subTitle: string; // assessment / persona context line
    generatedLabel: string; // e.g. "Generated 11 June 2026"
    contextRight?: string; // e.g. "Demo customer: Capgemini · CAP · Euronext Paris"
    footNote: string;
  }
) {
  const slide = pptx.addSlide();
  slide.background = { color: PALETTE.navy };

  // AnalystGenius wordmark.
  slide.addText(
    [
      { text: "Analyst", options: { color: PALETTE.white, bold: true } },
      { text: "Genius", options: { color: PALETTE.gold, bold: true } },
    ],
    { x: 0.7, y: 0.55, w: 6, h: 0.4, fontFace: FONT_HEAD, fontSize: 17, margin: 0 }
  );
  slide.addText("AR SUPERHERO", {
    x: 0.72,
    y: 0.98,
    w: 6,
    h: 0.24,
    fontFace: FONT_HEAD,
    fontSize: 9,
    bold: true,
    color: "9FB0C4",
    charSpacing: 3,
    margin: 0,
  });

  // Vendor brand chip, top-right.
  slide.addShape(SHAPES.roundRect, {
    x: 11.15,
    y: 0.5,
    w: 1.45,
    h: 0.62,
    rectRadius: 0.06,
    fill: { color: brand.vendorAccent },
    line: { type: "none" },
  });
  slide.addText(brand.vendorName, {
    x: 11.15,
    y: 0.5,
    w: 1.45,
    h: 0.62,
    fontFace: FONT_HEAD,
    fontSize: brand.vendorName.length > 9 ? 10 : 12.5,
    bold: true,
    color: PALETTE.white,
    align: "center",
    valign: "middle",
    margin: 0,
    fit: "shrink",
  });

  // Kicker.
  slide.addText(opts.kicker, {
    x: 0.72,
    y: 2.75,
    w: 11,
    h: 0.3,
    fontFace: FONT_HEAD,
    fontSize: 11,
    bold: true,
    color: PALETTE.gold,
    charSpacing: 3,
    margin: 0,
  });
  // Big title.
  slide.addText(opts.bigTitle, {
    x: 0.7,
    y: 3.15,
    w: 11.6,
    h: 1.6,
    fontFace: FONT_SERIF,
    fontSize: 38,
    bold: true,
    color: PALETTE.white,
    margin: 0,
    fit: "shrink",
    valign: "top",
  });
  // Subtitle.
  slide.addText(opts.subTitle, {
    x: 0.72,
    y: 4.85,
    w: 11,
    h: 0.5,
    fontFace: FONT_BODY,
    fontSize: 15,
    color: "C7D2DF",
    margin: 0,
    fit: "shrink",
  });

  // Bottom hairline + meta.
  slide.addShape(SHAPES.line, { x: 0.72, y: 6.35, w: 11.9, h: 0, line: { color: "33455E", width: 1 } });
  slide.addText(opts.generatedLabel + (opts.contextRight ? "      " + opts.contextRight : ""), {
    x: 0.72,
    y: 6.5,
    w: 11.9,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 11,
    color: "C7D2DF",
    margin: 0,
  });
  slide.addText(opts.footNote, {
    x: 0.72,
    y: 6.92,
    w: 11.9,
    h: 0.4,
    fontFace: FONT_BODY,
    fontSize: 9.5,
    italic: true,
    color: "8597AC",
    margin: 0,
    fit: "shrink",
  });
}

// ---------------------------------------------------------------------------
// Closing slide — dark navy, governance / disclaimer.
// ---------------------------------------------------------------------------

export function addClosing(
  pptx: pptxgen,
  brand: Brand,
  opts: { heading: string; body: string; disclaimer: string }
) {
  const slide = pptx.addSlide();
  slide.background = { color: PALETTE.navy };
  slide.addText(
    [
      { text: "Analyst", options: { color: PALETTE.white, bold: true } },
      { text: "Genius", options: { color: PALETTE.gold, bold: true } },
    ],
    { x: 0.7, y: 2.1, w: 11, h: 0.5, fontFace: FONT_HEAD, fontSize: 20, margin: 0 }
  );
  slide.addText("AR SUPERHERO", {
    x: 0.72,
    y: 2.56,
    w: 11,
    h: 0.24,
    fontFace: FONT_HEAD,
    fontSize: 9,
    bold: true,
    color: "9FB0C4",
    charSpacing: 3,
    margin: 0,
  });
  slide.addText(opts.heading, {
    x: 0.7,
    y: 3.0,
    w: 11.9,
    h: 0.7,
    fontFace: FONT_SERIF,
    fontSize: 26,
    bold: true,
    color: PALETTE.white,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(opts.body, {
    x: 0.72,
    y: 3.9,
    w: 11.4,
    h: 1.4,
    fontFace: FONT_BODY,
    fontSize: 14,
    color: "C7D2DF",
    margin: 0,
    lineSpacingMultiple: 1.15,
    fit: "shrink",
    valign: "top",
  });
  slide.addShape(SHAPES.line, { x: 0.72, y: 6.4, w: 11.9, h: 0, line: { color: "33455E", width: 1 } });
  slide.addText(opts.disclaimer, {
    x: 0.72,
    y: 6.55,
    w: 11.9,
    h: 0.7,
    fontFace: FONT_BODY,
    fontSize: 9.5,
    italic: true,
    color: "8597AC",
    margin: 0,
    fit: "shrink",
    valign: "top",
  });
}

// ---------------------------------------------------------------------------
// Body slide — white, running header (AG · deck), slide number, title block.
// Returns the slide plus the y-coordinate where content may begin.
// ---------------------------------------------------------------------------

export function addBodySlide(
  pptx: pptxgen,
  brand: Brand,
  opts: { index: string; title: string; note?: string }
): { slide: pptxgen.Slide; contentTop: number } {
  const slide = pptx.addSlide();
  slide.background = { color: PALETTE.paper };

  // Running header.
  slide.addText(
    [
      { text: "Analyst", options: { color: PALETTE.ink, bold: true } },
      { text: "Genius", options: { color: PALETTE.gold, bold: true } },
      { text: `   ·   ${brand.vendorName} — ${brand.deckLabel}`, options: { color: PALETTE.slate, bold: false } },
    ],
    { x: 0.6, y: 0.28, w: 10.5, h: 0.3, fontFace: FONT_HEAD, fontSize: 9.5, margin: 0, fit: "shrink" }
  );
  // Slide number, top-right.
  slide.addText(opts.index, {
    x: 12.0,
    y: 0.26,
    w: 0.7,
    h: 0.3,
    fontFace: FONT_HEAD,
    fontSize: 9.5,
    bold: true,
    color: PALETTE.slate,
    align: "right",
    margin: 0,
  });
  slide.addShape(SHAPES.line, { x: 0.6, y: 0.62, w: 12.13, h: 0, line: { color: PALETTE.hair, width: 1 } });

  // Title.
  slide.addText(opts.title, {
    x: 0.6,
    y: 0.74,
    w: 12.1,
    h: 0.5,
    fontFace: FONT_HEAD,
    fontSize: 22,
    bold: true,
    color: PALETTE.ink,
    margin: 0,
    fit: "shrink",
  });
  let contentTop = 1.32;
  if (opts.note) {
    slide.addText(opts.note, {
      x: 0.6,
      y: 1.24,
      w: 12.1,
      h: 0.34,
      fontFace: FONT_BODY,
      fontSize: 10.5,
      italic: true,
      color: PALETTE.slate,
      margin: 0,
      fit: "shrink",
    });
    contentTop = 1.66;
  }
  return { slide, contentTop };
}

// ---------------------------------------------------------------------------
// Table — navy header, zebra rows. Rows may carry a tone for soft tints.
// ---------------------------------------------------------------------------

export type RowTone = "default" | "good" | "warn" | "bad";

export function addTable(
  slide: pptxgen.Slide,
  opts: {
    x: number;
    y: number;
    w: number;
    colW: number[];
    headers: string[];
    rows: { cells: string[]; tone?: RowTone }[];
    fontSize?: number;
    headerFontSize?: number;
  }
) {
  const fs = opts.fontSize ?? 10.5;
  const hfs = opts.headerFontSize ?? 10;
  const toneFill: Record<RowTone, string> = {
    default: PALETTE.paper,
    good: PALETTE.rowGood,
    warn: PALETTE.rowWarn,
    bad: PALETTE.rowBad,
  };

  const headerRow: pptxgen.TableRow = opts.headers.map((h) => ({
    text: h,
    options: {
      fill: { color: PALETTE.navy },
      color: PALETTE.white,
      bold: true,
      fontSize: hfs,
      fontFace: FONT_HEAD,
      align: "left" as const,
      valign: "middle" as const,
      margin: [3, 5, 3, 5] as [number, number, number, number],
    },
  }));

  const bodyRows: pptxgen.TableRow[] = opts.rows.map((r, i) => {
    const base = r.tone && r.tone !== "default" ? toneFill[r.tone] : i % 2 === 0 ? PALETTE.paper : PALETTE.rowAlt;
    return r.cells.map((c) => ({
      text: c,
      options: {
        fill: { color: base },
        color: PALETTE.ink,
        fontSize: fs,
        fontFace: FONT_BODY,
        align: "left" as const,
        valign: "top" as const,
        margin: [4, 5, 4, 5] as [number, number, number, number],
      },
    }));
  });

  slide.addTable([headerRow, ...bodyRows], {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    colW: opts.colW,
    border: { type: "solid", color: PALETTE.hair, pt: 1 },
    autoPage: false,
    valign: "top",
  });
}

// ---------------------------------------------------------------------------
// Metric card — label + value + optional caption, on white.
// ---------------------------------------------------------------------------

export function addMetricCard(
  slide: pptxgen.Slide,
  opts: { x: number; y: number; w: number; h?: number; label: string; value: string; caption?: string; valueColor?: string }
) {
  const h = opts.h ?? 1.2;
  slide.addShape(SHAPES.roundRect, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h,
    rectRadius: 0.06,
    fill: { color: PALETTE.paper },
    line: { color: PALETTE.hair, width: 1 },
  });
  slide.addText(opts.label.toUpperCase(), {
    x: opts.x + 0.18,
    y: opts.y + 0.14,
    w: opts.w - 0.36,
    h: 0.26,
    fontFace: FONT_HEAD,
    fontSize: 8.5,
    bold: true,
    color: PALETTE.slate,
    charSpacing: 1.5,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(opts.value, {
    x: opts.x + 0.18,
    y: opts.y + 0.42,
    w: opts.w - 0.36,
    h: h - 0.6,
    fontFace: FONT_HEAD,
    fontSize: 20,
    bold: true,
    color: opts.valueColor ?? PALETTE.navy,
    margin: 0,
    fit: "shrink",
    valign: "top",
  });
  if (opts.caption) {
    slide.addText(opts.caption, {
      x: opts.x + 0.18,
      y: opts.y + h - 0.32,
      w: opts.w - 0.36,
      h: 0.26,
      fontFace: FONT_BODY,
      fontSize: 8.5,
      color: PALETTE.slate,
      margin: 0,
      fit: "shrink",
    });
  }
}

// ---------------------------------------------------------------------------
// Bullet list — tight, small square bullets (no giant glyphs).
// ---------------------------------------------------------------------------

export function addBulletList(
  slide: pptxgen.Slide,
  items: string[],
  opts: { x: number; y: number; w: number; h: number; fontSize?: number; color?: string }
) {
  slide.addText(
    items.map((t) => ({
      text: t,
      options: { bullet: { code: "2022", indent: 14 }, breakLine: true },
    })),
    {
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: opts.h,
      fontFace: FONT_BODY,
      fontSize: opts.fontSize ?? 11.5,
      color: opts.color ?? PALETTE.ink,
      lineSpacingMultiple: 1.12,
      paraSpaceAfter: 6,
      valign: "top",
      margin: 0,
      fit: "shrink",
    }
  );
}

// ---------------------------------------------------------------------------
// Section label (small heading on white body slides).
// ---------------------------------------------------------------------------

export function addSectionLabel(
  slide: pptxgen.Slide,
  text: string,
  opts: { x: number; y: number; w: number; color?: string }
) {
  slide.addText(text.toUpperCase(), {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: 0.26,
    fontFace: FONT_HEAD,
    fontSize: 9.5,
    bold: true,
    color: opts.color ?? PALETTE.gold,
    charSpacing: 2,
    margin: 0,
    fit: "shrink",
  });
}

// ---------------------------------------------------------------------------
// Evidence / confidence chip helpers (text — no icons).
// ---------------------------------------------------------------------------

export function evidenceLabel(grade: "E1" | "E2" | "E3", confidence: string): string {
  return `Evidence ${grade} · Confidence ${confidence}`;
}

// ---------------------------------------------------------------------------
// CEO profile slide — final slide on every deck.
//
// Bio text and headshot are taken verbatim from the AnalystGenius board-pack
// source deck (PROOF-Board-Pack, slide 17). No invented biographical detail.
// Dark navy to bookend the deck alongside the cover/closing.
// ---------------------------------------------------------------------------

const CEO_NAME = "Michael Cook";
const CEO_TITLE = "CEO — AnalystGenius";
const CEO_BIO =
  "Michael Cook is CEO of AnalystGenius. With over a decade of experience spanning analyst research, advisory, and go-to-market strategy across the IT and BPO services landscape, Michael has held senior positions at NelsonHall, HfS Research, Cognizant's Center for the Future of Work, IDC, and Capgemini. He has advised the world's leading service providers on vendor positioning, enterprise AI adoption, and workforce transformation — and brings deep cross-market expertise to every AnalystGenius engagement.";

export function addCeoBioSlide(pptx: pptxgen): void {
  const slide = pptx.addSlide();
  slide.background = { color: PALETTE.navy };

  // Eyebrow.
  slide.addText("ANALYSTGENIUS LEADERSHIP", {
    x: 0.72,
    y: 0.7,
    w: 11,
    h: 0.3,
    fontFace: FONT_HEAD,
    fontSize: 11,
    bold: true,
    color: PALETTE.gold,
    charSpacing: 3,
    margin: 0,
  });

  // Headshot — square, framed with a hairline.
  const photoX = 0.72;
  const photoY = 1.55;
  const photoSize = 3.0;
  slide.addShape(SHAPES.roundRect, {
    x: photoX - 0.06,
    y: photoY - 0.06,
    w: photoSize + 0.12,
    h: photoSize + 0.12,
    rectRadius: 0.08,
    fill: { color: "13294B" },
    line: { color: "33455E", width: 1 },
  });
  slide.addImage({
    data: CEO_HEADSHOT_JPEG_BASE64,
    x: photoX,
    y: photoY,
    w: photoSize,
    h: photoSize,
    rounding: true,
  });

  // Name + title.
  const textX = photoX + photoSize + 0.7;
  const textW = SLIDE_W - textX - 0.72;
  slide.addText(CEO_NAME, {
    x: textX,
    y: 1.55,
    w: textW,
    h: 0.7,
    fontFace: FONT_SERIF,
    fontSize: 30,
    bold: true,
    color: PALETTE.white,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(CEO_TITLE, {
    x: textX,
    y: 2.22,
    w: textW,
    h: 0.4,
    fontFace: FONT_HEAD,
    fontSize: 14,
    bold: true,
    color: "9FB0C4",
    charSpacing: 1,
    margin: 0,
    fit: "shrink",
  });
  // Bio paragraph (verbatim from source).
  slide.addText(CEO_BIO, {
    x: textX,
    y: 2.85,
    w: textW,
    h: 2.6,
    fontFace: FONT_BODY,
    fontSize: 13.5,
    color: "C7D2DF",
    lineSpacingMultiple: 1.18,
    margin: 0,
    valign: "top",
    fit: "shrink",
  });

  // Bottom hairline + provenance note.
  slide.addShape(SHAPES.line, { x: 0.72, y: 6.55, w: 11.9, h: 0, line: { color: "33455E", width: 1 } });
  slide.addText(
    "Leadership profile and photograph sourced from AnalystGenius corporate materials. © 2026 AnalystGenius.",
    {
      x: 0.72,
      y: 6.7,
      w: 11.9,
      h: 0.4,
      fontFace: FONT_BODY,
      fontSize: 9.5,
      italic: true,
      color: "8597AC",
      margin: 0,
      fit: "shrink",
    }
  );
}
