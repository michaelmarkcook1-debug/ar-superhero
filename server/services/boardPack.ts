import pptxgen from "pptxgenjs";
import { CEO_HEADSHOT_JPEG_BASE64 } from "./ceoHeadshot";
import {
  AG_LOGO_ON_DARK_ASPECT,
  AG_LOGO_ON_DARK_PNG_BASE64,
  AG_LOGO_ON_LIGHT_ASPECT,
  AG_LOGO_ON_LIGHT_PNG_BASE64,
} from "./agLogos";

// pptxgenjs ships a CJS module whose `module.exports` is the constructor.
// ESM↔CJS default-import interop differs by loader: native Node ESM and the
// esbuild production bundle expose the constructor as the default export,
// while tsx (esbuild-kit) nests it under `.default`. Resolve both so the
// server boots under dev (tsx) and prod (bundled) identically.
const PptxGenJSCtor = ((pptxgen as any)?.default ?? pptxgen) as typeof pptxgen;

// ============================================================================
// AnalystGenius deck kit
//
// Shared layout primitives for every deck AR SuperHero generates, measured
// from the AnalystGenius house deck (Virtusa brief, 16 September 2026):
//
//   - 16:9 at 13.33 × 7.5 in, Inter throughout
//   - violet 5135FF as the single accent; ink 201264 for headings; body text
//     555361; hairlines DDD7FF; panels F8F7FF; dark section slides 160D51
//   - every body slide: short accent bar + "NN · SECTION" kicker, title at
//     the top left, subtitle beneath, hairline footer with the AnalystGenius
//     wordmark, "· Prepared for <client>" and "n / N"
//   - one quiet caveat line per slide, directly above the footer
//   - a white cover with a violet right-hand panel carrying "Prepared for"
//     and the agenda; a closing slide that is half violet, names the next
//     steps and carries the CEO
//   - numbered cards, stat strips, row lists and a violet call-out band as
//     the content vocabulary; tables and charts take the same palette
//
// Inter is specified by name, as the house deck does. It is not embedded;
// a machine without Inter substitutes, as it does for the house deck.
// ============================================================================

export const AG = {
  violet: "5135FF",
  violetSoft: "6A50FF",
  ink: "201264",
  dark: "160D51",
  body: "555361",
  muted: "77738B",
  mutedAlt: "6E6A80",
  hair: "DDD7FF",
  panel: "F8F7FF",
  panelAlt: "F0EBFF",
  panelTint: "F1EDFF",
  cardOnDark: "332674",
  calloutOnDark: "382B7C",
  lavender: "BEB2FF",
  lavenderDeep: "8374FF",
  textOnDark: "C6BDED",
  subOnDark: "C8BEED",
  hairOnDark: "4A3D87",
  footOnDark: "A69DD0",
  footnoteOnDark: "B9B1DD",
  onViolet: "EFEAFF",
  onVioletSoft: "E2D9FF",
  bullet: "B4A3F8",
  gold: "927022",
  goldChip: "CAA145",
  white: "FFFFFF",
} as const;

/**
 * Compatibility palette for generators written against the earlier navy kit.
 * Semantic roles are preserved; every value now comes from the house deck.
 */
export const PALETTE = {
  navy: AG.ink, // table headers, emphasis
  navyDeep: AG.dark,
  ink: AG.ink, // headings and emphasised text
  slate: AG.body, // body and secondary text
  hair: AG.hair,
  paper: AG.white,
  rowAlt: AG.panel,
  rowGood: "EAF3EC",
  rowWarn: "FBF3E6",
  rowBad: "F7ECEC",
  good: "2E7D5B",
  warn: AG.gold,
  bad: "9B3B2E",
  gold: AG.violet, // the single accent
  white: AG.white,
} as const;

export const FONT_HEAD = "Inter";
export const FONT_BODY = "Inter";
export const FONT_SERIF = "Inter";

/** Chart series colours, in order of use. Semantic good/bad never ride on these. */
export const CHART_COLORS = [AG.violet, AG.ink, AG.lavenderDeep, AG.goldChip, AG.mutedAlt, AG.lavender, AG.body];

const SHAPES = new PptxGenJSCtor().ShapeType;

export const SLIDE_W = 13.33;
export const SLIDE_H = 7.5;
/** Content may not run past this; the caveat line and footer live below it. */
export const CONTENT_BOTTOM = 6.45;
const MARGIN_X = 0.75;
const CONTENT_W = SLIDE_W - MARGIN_X * 2; // 11.83

/** Clamp a requested height so a block never runs into the footer. */
export function fitH(y: number, wanted: number): number {
  return Math.max(0.35, Math.min(wanted, CONTENT_BOTTOM - y));
}

export type Brand = {
  /** The client the deck is prepared for, e.g. "Virtusa". */
  vendorName: string;
  /** Short brand mark, e.g. "V". Kept for callers; the house style does not paint it. */
  vendorMark: string;
  /** Vendor brand hex. Kept for callers; the house style uses one accent. */
  vendorAccent: string;
  /** Deck label used in the running kicker when a slide gives no section name. */
  deckLabel: string;
};

// ---------------------------------------------------------------------------
// Deck state: footers are stamped once the total is known.
// ---------------------------------------------------------------------------

type Registered = { slide: pptxgen.Slide; dark: boolean; footer: boolean };
const state = new WeakMap<pptxgen, { client: string; slides: Registered[]; finalized: boolean }>();

function register(pptx: pptxgen, client: string, entry: Registered) {
  const s = state.get(pptx) ?? { client, slides: [], finalized: false };
  s.client = client || s.client;
  s.slides.push(entry);
  state.set(pptx, s);
}

export function newDeck(meta: { title: string; subject: string }): pptxgen {
  const pptx = new PptxGenJSCtor();
  pptx.defineLayout({ name: "AG_WIDE", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "AG_WIDE";
  pptx.author = "AnalystGenius";
  pptx.company = "AnalystGenius";
  pptx.title = meta.title;
  pptx.subject = meta.subject;
  return pptx;
}

/** Stamp every registered footer with "n / N", then serialise. */
export async function deckToBuffer(pptx: pptxgen): Promise<Buffer> {
  finalizeDeck(pptx);
  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

export function finalizeDeck(pptx: pptxgen): void {
  const s = state.get(pptx);
  if (!s || s.finalized) return;
  const total = s.slides.length;
  s.slides.forEach((entry, i) => {
    if (!entry.footer) return;
    const dark = entry.dark;
    const logoH = 0.11;
    const logoW = logoH * (dark ? AG_LOGO_ON_DARK_ASPECT : AG_LOGO_ON_LIGHT_ASPECT);
    entry.slide.addShape(SHAPES.line, {
      x: MARGIN_X,
      y: 6.94,
      w: CONTENT_W,
      h: 0,
      line: { color: dark ? AG.hairOnDark : AG.hair, width: 0.75 },
    });
    entry.slide.addImage({
      data: `image/png;base64,${dark ? AG_LOGO_ON_DARK_PNG_BASE64 : AG_LOGO_ON_LIGHT_PNG_BASE64}`,
      x: MARGIN_X,
      y: 7.13,
      w: logoW,
      h: logoH,
    });
    entry.slide.addText(`· Prepared for ${s.client}`, {
      x: MARGIN_X + logoW + 0.12,
      y: 7.07,
      w: 8,
      h: 0.23,
      fontFace: FONT_BODY,
      fontSize: 9,
      color: dark ? AG.footOnDark : AG.mutedAlt,
      margin: 0,
      valign: "middle",
    });
    entry.slide.addText(`${i + 1} / ${total}`, {
      x: SLIDE_W - MARGIN_X - 0.9,
      y: 7.07,
      w: 0.9,
      h: 0.23,
      fontFace: FONT_BODY,
      fontSize: 9,
      color: dark ? AG.footOnDark : AG.mutedAlt,
      align: "right",
      margin: 0,
      valign: "middle",
    });
  });
  s.finalized = true;
}

// ---------------------------------------------------------------------------
// Cover — white, violet right-hand panel with "Prepared for" and the agenda.
// ---------------------------------------------------------------------------

export type CoverOpts = {
  /** Kicker, e.g. "PREPARED FOR VIRTUSA · 16 OCTOBER 2026". */
  kicker: string;
  /** Title, first line in ink. */
  titleA: string;
  /** Title, second line in violet. */
  titleB: string;
  /** One-sentence subtitle. */
  subTitle: string;
  /** Up to two short context lines in muted text. */
  contextLines?: string[];
  /** Up to three stats across the bottom-left. */
  stats?: { value: string; label: string }[];
  /** The "Prepared for" card on the violet panel. */
  preparedFor: { name: string; role: string };
  /** Agenda, up to six items; numbered automatically. */
  agenda: string[];
  /** Speaker notes (provenance for the deck as a whole). */
  notes?: string;
};

export function addCover(pptx: pptxgen, brand: Brand, opts: CoverOpts): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: AG.white };
  register(pptx, brand.vendorName, { slide, dark: false, footer: false });

  // Violet panel, right.
  slide.addShape(SHAPES.rect, { x: 8.04, y: 0, w: SLIDE_W - 8.04, h: SLIDE_H, fill: { color: AG.violet }, line: { type: "none" } });
  // A faint circle on the panel, as the house deck carries.
  slide.addShape(SHAPES.ellipse, {
    x: 9.9,
    y: -0.9,
    w: 3.6,
    h: 3.6,
    fill: { type: "none" },
    line: { color: AG.lavenderDeep, width: 0.75, transparency: 35 },
  });

  // Wordmark, top-left.
  slide.addImage({ data: `image/png;base64,${AG_LOGO_ON_LIGHT_PNG_BASE64}`, x: MARGIN_X, y: 0.56, w: 0.43 * AG_LOGO_ON_LIGHT_ASPECT, h: 0.43 });

  // Kicker with accent bar.
  slide.addShape(SHAPES.rect, { x: MARGIN_X, y: 1.53, w: 0.28, h: 0.04, fill: { color: AG.violet }, line: { type: "none" } });
  slide.addText(opts.kicker.toUpperCase(), {
    x: 1.18,
    y: 1.44,
    w: 6.51,
    h: 0.29,
    fontFace: FONT_HEAD,
    fontSize: 10.5,
    bold: true,
    color: AG.violet,
    charSpacing: 1.5,
    margin: 0,
    fit: "shrink",
  });

  // Two-line title.
  slide.addText(opts.titleA, { x: MARGIN_X, y: 1.85, w: 6.9, h: 0.73, fontFace: FONT_HEAD, fontSize: 36, bold: true, color: AG.ink, margin: 0, fit: "shrink", valign: "top" });
  slide.addText(opts.titleB, { x: MARGIN_X, y: 2.5, w: 6.9, h: 0.73, fontFace: FONT_HEAD, fontSize: 36, bold: true, color: AG.violet, margin: 0, fit: "shrink", valign: "top" });

  // Subtitle.
  slide.addText(opts.subTitle, { x: MARGIN_X, y: 3.39, w: 6.69, h: 1.0, fontFace: FONT_BODY, fontSize: 18, color: AG.body, margin: 0, fit: "shrink", valign: "top", lineSpacingMultiple: 1.1 });

  // Hairline + context lines.
  slide.addShape(SHAPES.rect, { x: MARGIN_X, y: 4.41, w: 6.83, h: 0.01, fill: { color: AG.hair }, line: { type: "none" } });
  const context = (opts.contextLines ?? []).slice(0, 2);
  if (context.length) {
    slide.addText(context.join("\n"), { x: MARGIN_X, y: 4.66, w: 6.8, h: 0.67, fontFace: FONT_BODY, fontSize: 12.75, color: AG.muted, margin: 0, fit: "shrink", valign: "top" });
  }

  // Stat strip.
  const stats = (opts.stats ?? []).slice(0, 3);
  stats.forEach((st, i) => {
    const x = MARGIN_X + i * 2.3;
    slide.addText(st.value, { x, y: 5.56, w: 2.2, h: 0.54, fontFace: FONT_HEAD, fontSize: 28, bold: true, color: AG.ink, margin: 0, fit: "shrink", valign: "bottom" });
    slide.addText(st.label.toUpperCase(), { x, y: 6.16, w: 2.2, h: 0.4, fontFace: FONT_HEAD, fontSize: 9, bold: true, color: AG.mutedAlt, charSpacing: 1, margin: 0, fit: "shrink", valign: "top" });
  });

  // "Prepared for" card.
  slide.addShape(SHAPES.rect, { x: 8.51, y: 1.1, w: 4.35, h: 1.12, fill: { color: AG.violetSoft }, line: { color: AG.lavenderDeep, width: 0.5 } });
  slide.addText("PREPARED FOR", { x: 8.72, y: 1.3, w: 3.94, h: 0.21, fontFace: FONT_HEAD, fontSize: 9, bold: true, color: AG.onViolet, charSpacing: 1.5, margin: 0 });
  slide.addText(opts.preparedFor.name, { x: 8.72, y: 1.56, w: 3.94, h: 0.31, fontFace: FONT_HEAD, fontSize: 15.75, bold: true, color: AG.white, margin: 0, fit: "shrink" });
  slide.addText(opts.preparedFor.role, { x: 8.72, y: 1.91, w: 3.94, h: 0.26, fontFace: FONT_BODY, fontSize: 11.25, color: AG.onViolet, margin: 0, fit: "shrink" });

  // Agenda.
  slide.addText("IN THIS BRIEF", { x: 8.51, y: 2.57, w: 4.17, h: 0.31, fontFace: FONT_HEAD, fontSize: 11.25, bold: true, color: AG.onViolet, charSpacing: 1.5, margin: 0 });
  opts.agenda.slice(0, 6).forEach((item, i) => {
    const y = 3.09 + i * 0.595;
    slide.addText(String(i + 1).padStart(2, "0"), { x: 8.51, y, w: 0.43, h: 0.32, fontFace: FONT_HEAD, fontSize: 14.25, bold: true, color: AG.onViolet, margin: 0 });
    slide.addText(item, { x: 8.97, y, w: 3.79, h: 0.33, fontFace: FONT_HEAD, fontSize: 14.25, bold: true, color: AG.white, margin: 0, fit: "shrink" });
    slide.addShape(SHAPES.rect, { x: 8.51, y: y + 0.44, w: 4.35, h: 0.01, fill: { color: AG.lavenderDeep }, line: { type: "none" } });
  });

  if (opts.notes) slide.addNotes(opts.notes);
  return slide;
}

// ---------------------------------------------------------------------------
// Body slide — kicker, title, subtitle, caveat line, registered footer.
// ---------------------------------------------------------------------------

export type BodyOpts = {
  /** Section number shown in the kicker, e.g. "03". */
  index: string;
  title: string;
  /** Subtitle beneath the title (the earlier kit called this `note`). */
  note?: string;
  /** Kicker text after the number; defaults to the brand's deck label. */
  section?: string;
  /** Dark (160D51) variant for section openers. */
  dark?: boolean;
  /** One quiet caveat, directly above the footer. */
  caveat?: string;
  /** Speaker notes: the sources behind this slide. */
  notes?: string;
};

export function addBodySlide(pptx: pptxgen, brand: Brand, opts: BodyOpts): { slide: pptxgen.Slide; contentTop: number } {
  const slide = pptx.addSlide();
  const dark = Boolean(opts.dark);
  slide.background = { color: dark ? AG.dark : AG.white };
  register(pptx, brand.vendorName, { slide, dark, footer: true });

  // Kicker with accent bar.
  slide.addShape(SHAPES.rect, { x: MARGIN_X, y: 0.69, w: 0.28, h: 0.04, fill: { color: dark ? AG.lavender : AG.violet }, line: { type: "none" } });
  slide.addText(`${opts.index} · ${(opts.section ?? brand.deckLabel).toUpperCase()}`, {
    x: 1.18,
    y: 0.59,
    w: 11.15,
    h: 0.26,
    fontFace: FONT_HEAD,
    fontSize: 10.5,
    bold: true,
    color: dark ? AG.lavender : AG.violet,
    charSpacing: 1.5,
    margin: 0,
    fit: "shrink",
  });

  // Title.
  slide.addText(opts.title, {
    x: MARGIN_X,
    y: 0.98,
    w: CONTENT_W,
    h: 0.78,
    fontFace: FONT_HEAD,
    fontSize: 25,
    bold: true,
    color: dark ? AG.white : AG.ink,
    margin: 0,
    fit: "shrink",
    valign: "top",
  });

  let contentTop = 1.95;
  if (opts.note) {
    slide.addText(opts.note, {
      x: MARGIN_X,
      y: 1.7,
      w: CONTENT_W,
      h: 0.55,
      fontFace: FONT_BODY,
      fontSize: 13,
      color: dark ? AG.textOnDark : AG.body,
      margin: 0,
      fit: "shrink",
      valign: "top",
      lineSpacingMultiple: 1.08,
    });
    contentTop = 2.4;
  }

  if (opts.caveat) {
    slide.addText(opts.caveat, {
      x: MARGIN_X,
      y: 6.57,
      w: CONTENT_W,
      h: 0.3,
      fontFace: FONT_BODY,
      fontSize: 8.75,
      color: dark ? AG.footnoteOnDark : AG.mutedAlt,
      margin: 0,
      fit: "shrink",
      valign: "middle",
    });
  }
  if (opts.notes) slide.addNotes(opts.notes);
  return { slide, contentTop };
}

/** Dark section opener: a headline, a central question in a call-out, and up to four cards. */
export function addSectionDivider(
  pptx: pptxgen,
  brand: Brand,
  opts: {
    index: string;
    section: string;
    title: string;
    note?: string;
    question?: { label: string; text: string };
    cards?: { title: string; body: string }[];
    caveat?: string;
    notes?: string;
  }
): pptxgen.Slide {
  const { slide, contentTop } = addBodySlide(pptx, brand, { ...opts, dark: true });
  let y = contentTop + 0.2;
  if (opts.question) {
    slide.addShape(SHAPES.rect, { x: MARGIN_X, y, w: CONTENT_W, h: 0.89, fill: { color: AG.calloutOnDark }, line: { type: "none" } });
    slide.addShape(SHAPES.rect, { x: MARGIN_X, y, w: 0.03, h: 0.89, fill: { color: AG.lavender }, line: { type: "none" } });
    slide.addText(opts.question.label, { x: MARGIN_X + 0.24, y: y + 0.16, w: 10.94, h: 0.26, fontFace: FONT_HEAD, fontSize: 12, bold: true, color: AG.lavender, margin: 0 });
    slide.addText(opts.question.text, { x: MARGIN_X + 0.24, y: y + 0.46, w: 10.94, h: 0.33, fontFace: FONT_HEAD, fontSize: 17, bold: true, color: AG.white, margin: 0, fit: "shrink" });
    y += 1.16;
  }
  const cards = (opts.cards ?? []).slice(0, 4);
  if (cards.length) {
    const cols = cards.length === 1 ? 1 : 2;
    const gap = 0.21;
    const w = (CONTENT_W - gap * (cols - 1)) / cols;
    const h = 1.16;
    cards.forEach((c, i) => {
      const cx = MARGIN_X + (i % cols) * (w + gap);
      const cy = y + Math.floor(i / cols) * (h + 0.17);
      if (cy + h > CONTENT_BOTTOM) return;
      slide.addShape(SHAPES.rect, { x: cx, y: cy, w, h, fill: { color: AG.cardOnDark }, line: { type: "none" } });
      slide.addText(c.title, { x: cx + 0.22, y: cy + 0.2, w: w - 0.44, h: 0.4, fontFace: FONT_HEAD, fontSize: 15, bold: true, color: AG.white, margin: 0, fit: "shrink" });
      slide.addText(c.body, { x: cx + 0.22, y: cy + 0.6, w: w - 0.44, h: 0.5, fontFace: FONT_BODY, fontSize: 12, color: AG.subOnDark, margin: 0, fit: "shrink", valign: "top" });
    });
  }
  return slide;
}

// ---------------------------------------------------------------------------
// Closing — violet left half, next steps on the right, the CEO.
// ---------------------------------------------------------------------------

const CEO_NAME = "Michael Cook";
const CEO_TITLE = "CEO & CO-FOUNDER · ANALYSTGENIUS";

export type ClosingOpts = {
  /** Title, two lines, e.g. ["The next step", "with Virtusa."]. */
  titleA: string;
  titleB: string;
  body: string;
  /** Up to three next-step cards. `owner` is the small violet line under each. */
  nextSteps: { title: string; body: string; owner: string }[];
  /** Replaces the house default disclaimer on the right-hand footer line. */
  disclaimer?: string;
  notes?: string;
};

export function addClosing(pptx: pptxgen, brand: Brand, opts: ClosingOpts): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: AG.panel };
  register(pptx, brand.vendorName, { slide, dark: false, footer: false });

  // Violet left half.
  slide.addShape(SHAPES.rect, { x: 0, y: 0, w: 6.67, h: SLIDE_H, fill: { color: AG.violet }, line: { type: "none" } });
  slide.addImage({ data: `image/png;base64,${AG_LOGO_ON_DARK_PNG_BASE64}`, x: MARGIN_X, y: 0.55, w: 0.38 * AG_LOGO_ON_DARK_ASPECT, h: 0.38 });
  slide.addText(`${opts.titleA}\n${opts.titleB}`, { x: MARGIN_X, y: 2.04, w: 5.18, h: 1.35, fontFace: FONT_HEAD, fontSize: 34, bold: true, color: AG.white, margin: 0, fit: "shrink", valign: "top", lineSpacingMultiple: 0.98 });
  slide.addText(opts.body, { x: MARGIN_X, y: 3.66, w: 5.06, h: 1.27, fontFace: FONT_BODY, fontSize: 17, color: AG.white, margin: 0, fit: "shrink", valign: "top", lineSpacingMultiple: 1.1 });
  slide.addShape(SHAPES.rect, { x: MARGIN_X, y: 5.05, w: 5.18, h: 0.01, fill: { color: "8B75FF" }, line: { type: "none" } });

  // CEO.
  slide.addImage({ data: CEO_HEADSHOT_JPEG_BASE64, x: 0.66, y: 5.11, w: 1.64, h: 1.64, rounding: true });
  slide.addText(CEO_NAME, { x: 2.5, y: 5.55, w: 4.0, h: 0.33, fontFace: FONT_HEAD, fontSize: 20, bold: true, color: AG.white, margin: 0 });
  slide.addText(CEO_TITLE, { x: 2.52, y: 5.95, w: 4.1, h: 0.27, fontFace: FONT_HEAD, fontSize: 11, bold: true, color: AG.onViolet, charSpacing: 1, margin: 0, fit: "shrink" });

  // Next-step cards.
  opts.nextSteps.slice(0, 3).forEach((card, i) => {
    const y = 1.36 + i * 1.68;
    slide.addShape(SHAPES.rect, { x: 7.29, y, w: 5.3, h: 1.49, fill: { color: AG.white }, line: { type: "none" } });
    slide.addText(card.title, { x: 7.54, y: y + 0.22, w: 4.8, h: 0.34, fontFace: FONT_HEAD, fontSize: 17, bold: true, color: AG.ink, margin: 0, fit: "shrink" });
    slide.addText(card.body, { x: 7.54, y: y + 0.64, w: 4.8, h: 0.56, fontFace: FONT_BODY, fontSize: 12.5, color: AG.body, margin: 0, fit: "shrink", valign: "top" });
    slide.addText(card.owner, { x: 7.54, y: y + 1.22, w: 4.8, h: 0.23, fontFace: FONT_HEAD, fontSize: 10.5, bold: true, color: AG.violet, margin: 0, fit: "shrink" });
  });

  // Footers: left on violet, right on panel.
  slide.addShape(SHAPES.rect, { x: MARGIN_X, y: 6.94, w: 5.18, h: 0.01, fill: { color: "8B75FF" }, line: { type: "none" } });
  slide.addImage({ data: `image/png;base64,${AG_LOGO_ON_DARK_PNG_BASE64}`, x: 0.86, y: 7.12, w: 0.11 * AG_LOGO_ON_DARK_ASPECT, h: 0.11 });
  slide.addText(`· Prepared for ${brand.vendorName}`, { x: 1.77, y: 7.07, w: 4.17, h: 0.23, fontFace: FONT_BODY, fontSize: 9, color: AG.onViolet, margin: 0, valign: "middle" });
  slide.addShape(SHAPES.rect, { x: 6.67, y: 7.07, w: 6.67, h: 0.01, fill: { color: AG.hair }, line: { type: "none" } });
  if (opts.disclaimer) {
    slide.addText(opts.disclaimer, { x: 7.29, y: 6.52, w: 5.3, h: 0.4, fontFace: FONT_BODY, fontSize: 8.25, color: AG.mutedAlt, margin: 0, fit: "shrink", valign: "bottom" });
  }
  // The closing is always the last slide every generator adds, so its own
  // index is the deck total. It is registered without a footer so finalizeDeck
  // leaves the violet half clean; the number sits on the panel side.
  const s = state.get(pptx);
  const pageNo = s ? s.slides.length : 0;
  slide.addText(`${pageNo} / ${pageNo}`, { x: 12.08, y: 7.2, w: 0.65, h: 0.21, fontFace: FONT_BODY, fontSize: 9, color: AG.mutedAlt, align: "right", margin: 0 });
  if (opts.notes) slide.addNotes(opts.notes);
  return slide;
}

// ---------------------------------------------------------------------------
// Content vocabulary
// ---------------------------------------------------------------------------

/** Kicker-style section label on a body slide. */
export function addSectionLabel(slide: pptxgen.Slide, text: string, opts: { x: number; y: number; w: number; color?: string }) {
  slide.addText(text.toUpperCase(), {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: 0.24,
    fontFace: FONT_HEAD,
    fontSize: 9.75,
    bold: true,
    color: opts.color ?? AG.violet,
    charSpacing: 1.5,
    margin: 0,
    fit: "shrink",
  });
}

/** Numbered cards on a panel tint: "01" · title · body. */
export function addCards(
  slide: pptxgen.Slide,
  cards: { title: string; body: string; tag?: string }[],
  opts: { x: number; y: number; w: number; h?: number; cols?: number; numbered?: boolean; dark?: boolean }
) {
  const cols = Math.max(1, Math.min(opts.cols ?? Math.min(3, cards.length), cards.length));
  const gap = 0.17;
  const w = (opts.w - gap * (cols - 1)) / cols;
  const h = opts.h ?? 1.39;
  cards.forEach((c, i) => {
    const x = opts.x + (i % cols) * (w + gap);
    const y = opts.y + Math.floor(i / cols) * (h + 0.15);
    if (y + h > CONTENT_BOTTOM + 0.05) return;
    slide.addShape(SHAPES.rect, { x, y, w, h, fill: { color: opts.dark ? AG.cardOnDark : AG.panel }, line: { type: "none" } });
    let ty = y + 0.2;
    if (opts.numbered !== false) {
      slide.addText(String(i + 1).padStart(2, "0"), { x: x + 0.22, y: ty, w: w - 0.44, h: 0.22, fontFace: FONT_HEAD, fontSize: 9.75, bold: true, color: opts.dark ? AG.lavender : AG.violet, margin: 0 });
      ty += 0.28;
    }
    if (c.tag) {
      slide.addText(c.tag.toUpperCase(), { x: x + 0.22, y: ty, w: w - 0.44, h: 0.2, fontFace: FONT_HEAD, fontSize: 8.5, bold: true, color: opts.dark ? AG.lavender : AG.violet, charSpacing: 1, margin: 0, fit: "shrink" });
      ty += 0.24;
    }
    slide.addText(c.title, { x: x + 0.22, y: ty, w: w - 0.44, h: 0.4, fontFace: FONT_HEAD, fontSize: 14, bold: true, color: opts.dark ? AG.white : AG.ink, margin: 0, fit: "shrink", valign: "top" });
    slide.addText(c.body, { x: x + 0.22, y: ty + 0.42, w: w - 0.44, h: Math.max(0.3, y + h - (ty + 0.42) - 0.16), fontFace: FONT_BODY, fontSize: 11.5, color: opts.dark ? AG.subOnDark : AG.body, margin: 0, fit: "shrink", valign: "top", lineSpacingMultiple: 1.08 });
  });
}

/** Stat strip: large value over a small uppercase label. */
export function addStats(
  slide: pptxgen.Slide,
  stats: { value: string; label: string; caption?: string; valueColor?: string }[],
  opts: { x: number; y: number; w: number }
) {
  const n = Math.max(1, Math.min(stats.length, 4));
  const colW = opts.w / n;
  stats.slice(0, 4).forEach((st, i) => {
    const x = opts.x + i * colW;
    slide.addText(st.value, { x, y: opts.y, w: colW - 0.2, h: 0.54, fontFace: FONT_HEAD, fontSize: 26, bold: true, color: st.valueColor ?? AG.ink, margin: 0, fit: "shrink", valign: "bottom" });
    slide.addText(st.label.toUpperCase(), { x, y: opts.y + 0.58, w: colW - 0.2, h: 0.24, fontFace: FONT_HEAD, fontSize: 9, bold: true, color: AG.mutedAlt, charSpacing: 1, margin: 0, fit: "shrink" });
    if (st.caption) {
      slide.addText(st.caption, { x, y: opts.y + 0.84, w: colW - 0.2, h: 0.3, fontFace: FONT_BODY, fontSize: 9.5, color: AG.muted, margin: 0, fit: "shrink", valign: "top" });
    }
  });
}

/** White row list: bold title, body line, hairline between rows. */
export function addRowList(
  slide: pptxgen.Slide,
  rows: { title: string; body: string; numbered?: boolean }[],
  opts: { x: number; y: number; w: number; rowH?: number; numbered?: boolean; label?: string }
) {
  const rowH = opts.rowH ?? 0.81;
  let y = opts.y;
  if (opts.label) {
    addSectionLabel(slide, opts.label, { x: opts.x + 0.25, y, w: opts.w - 0.5 });
    y += 0.4;
  }
  rows.forEach((r, i) => {
    if (y + rowH > CONTENT_BOTTOM + 0.05) return;
    slide.addShape(SHAPES.rect, { x: opts.x, y, w: opts.w, h: rowH, fill: { color: AG.white }, line: { type: "none" } });
    const numbered = r.numbered ?? opts.numbered ?? true;
    const tx = numbered ? opts.x + 0.78 : opts.x + 0.26;
    if (numbered) {
      slide.addText(String(i + 1).padStart(2, "0"), { x: opts.x + 0.26, y: y + 0.26, w: 0.48, h: 0.32, fontFace: FONT_HEAD, fontSize: 15, bold: true, color: AG.violet, margin: 0 });
    }
    slide.addText(r.title, { x: tx, y: y + 0.14, w: opts.x + opts.w - tx - 0.26, h: 0.35, fontFace: FONT_HEAD, fontSize: 14.5, bold: true, color: AG.ink, margin: 0, fit: "shrink" });
    slide.addText(r.body, { x: tx, y: y + 0.47, w: opts.x + opts.w - tx - 0.26, h: rowH - 0.52, fontFace: FONT_BODY, fontSize: 11.5, color: AG.body, margin: 0, fit: "shrink", valign: "top" });
    if (i < rows.length - 1) {
      slide.addShape(SHAPES.rect, { x: opts.x + 0.26, y: y + rowH - 0.01, w: opts.w - 0.52, h: 0.01, fill: { color: AG.hair }, line: { type: "none" } });
    }
    y += rowH;
  });
}

/** Violet call-out band: optional bold label on the left, text to the right. */
export function addBand(slide: pptxgen.Slide, opts: { x: number; y: number; w: number; h?: number; label?: string; text: string }) {
  const h = opts.h ?? 0.8;
  slide.addShape(SHAPES.rect, { x: opts.x, y: opts.y, w: opts.w, h, fill: { color: AG.violet }, line: { type: "none" } });
  if (opts.label) {
    slide.addText(opts.label, { x: opts.x + 0.25, y: opts.y + 0.12, w: 3.4, h: h - 0.24, fontFace: FONT_HEAD, fontSize: 17, bold: true, color: AG.white, margin: 0, fit: "shrink", valign: "middle" });
    slide.addText(opts.text, { x: opts.x + 3.83, y: opts.y + 0.12, w: opts.w - 4.1, h: h - 0.24, fontFace: FONT_BODY, fontSize: 13, color: AG.white, margin: 0, fit: "shrink", valign: "middle" });
  } else {
    slide.addText(opts.text, { x: opts.x + 0.25, y: opts.y + 0.1, w: opts.w - 0.5, h: h - 0.2, fontFace: FONT_BODY, fontSize: 12, color: AG.white, margin: 0, fit: "shrink", valign: "middle" });
  }
}

// ---------------------------------------------------------------------------
// Table — ink header, panel zebra, hairline borders. Rows may carry a tone.
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
  const hfs = opts.headerFontSize ?? 9.5;
  const toneFill: Record<RowTone, string> = { default: AG.white, good: PALETTE.rowGood, warn: PALETTE.rowWarn, bad: PALETTE.rowBad };

  const headerRow: pptxgen.TableRow = opts.headers.map((h) => ({
    text: h.toUpperCase(),
    options: {
      fill: { color: AG.ink },
      color: AG.white,
      bold: true,
      fontSize: hfs,
      fontFace: FONT_HEAD,
      align: "left" as const,
      valign: "middle" as const,
      margin: [3, 5, 3, 5] as [number, number, number, number],
    },
  }));
  const bodyRows: pptxgen.TableRow[] = opts.rows.map((r, i) => {
    const base = r.tone && r.tone !== "default" ? toneFill[r.tone] : i % 2 === 0 ? AG.white : AG.panel;
    return r.cells.map((c) => ({
      text: c,
      options: {
        fill: { color: base },
        color: AG.body,
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
    border: { type: "solid", color: AG.hair, pt: 0.75 },
    autoPage: false,
    valign: "top",
  });
}

/** Metric card, now a panel card with a stat inside. */
export function addMetricCard(
  slide: pptxgen.Slide,
  opts: { x: number; y: number; w: number; h?: number; label: string; value: string; caption?: string; valueColor?: string }
) {
  const h = opts.h ?? 1.2;
  slide.addShape(SHAPES.rect, { x: opts.x, y: opts.y, w: opts.w, h, fill: { color: AG.panel }, line: { type: "none" } });
  slide.addText(opts.label.toUpperCase(), { x: opts.x + 0.2, y: opts.y + 0.16, w: opts.w - 0.4, h: 0.22, fontFace: FONT_HEAD, fontSize: 8.5, bold: true, color: AG.violet, charSpacing: 1, margin: 0, fit: "shrink" });
  slide.addText(opts.value, { x: opts.x + 0.2, y: opts.y + 0.4, w: opts.w - 0.4, h: h - 0.72, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: opts.valueColor ?? AG.ink, margin: 0, fit: "shrink", valign: "top" });
  if (opts.caption) {
    slide.addText(opts.caption, { x: opts.x + 0.2, y: opts.y + h - 0.34, w: opts.w - 0.4, h: 0.26, fontFace: FONT_BODY, fontSize: 9, color: AG.muted, margin: 0, fit: "shrink" });
  }
}

/** Bullet list in body text with small square bullets. */
export function addBulletList(
  slide: pptxgen.Slide,
  items: string[],
  opts: { x: number; y: number; w: number; h: number; fontSize?: number; color?: string }
) {
  slide.addText(
    items.map((t) => ({ text: t, options: { bullet: { code: "25A0", indent: 14 }, breakLine: true } })),
    {
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: fitH(opts.y, opts.h),
      fontFace: FONT_BODY,
      fontSize: opts.fontSize ?? 11.5,
      color: opts.color ?? AG.body,
      lineSpacingMultiple: 1.12,
      paraSpaceAfter: 6,
      valign: "top",
      margin: 0,
      fit: "shrink",
    }
  );
}

/** Evidence / confidence chip text. */
export function evidenceLabel(grade: "E1" | "E2" | "E3", confidence: string): string {
  return `Evidence ${grade} · Confidence ${confidence}`;
}

/** Today's date in the house format, e.g. "16 October 2026". */
export function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
