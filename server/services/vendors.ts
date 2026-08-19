// ============================================================================
// Canonical vendor registry — shared by every deck generator (defence pack,
// persona decks, scenario decks, briefing composer) so branding and the
// AnalystGenius focal ticker always agree. `agTicker` is confirmed against
// AG's own provider catalog (GET /api/ag/providers) — each entry is a real,
// independently analysable subject in AG, not just a comparison competitor.
// ============================================================================

export interface VendorContext {
  id: string;
  name: string;
  mark: string;
  accent: string;
  thesis: string;
  agTicker: string;
}

export const VENDORS: VendorContext[] = [
  {
    id: "capgemini",
    name: "Capgemini",
    mark: "C",
    accent: "0070AD",
    thesis:
      "Lead with technology and engineering breadth, client co-innovation, industry execution, trust, and sustainable transformation.",
    agTicker: "CGEMY",
  },
  {
    id: "cognizant",
    name: "Cognizant",
    mark: "C",
    accent: "1F70C1",
    thesis:
      "Lead with industry operating model depth, AI-enabled delivery modernisation, engineering execution, and measurable client transformation outcomes.",
    agTicker: "CTSH",
  },
  {
    id: "accenture",
    name: "Accenture",
    mark: "A",
    accent: "A100FF",
    thesis:
      "Lead with transformation scale, industry depth, platform partnerships, and measurable reinvention outcomes.",
    agTicker: "ACN",
  },
  {
    id: "ibm",
    name: "IBM",
    mark: "IBM",
    accent: "0F62FE",
    thesis:
      "Lead with hybrid cloud, AI, consulting execution, ecosystem leverage, and enterprise-grade delivery proof.",
    agTicker: "IBM",
  },
  {
    // VRTU confirmed present in AG's provider catalog (GET /api/ag/providers)
    // and independently analysable — providers/snapshot?ticker=VRTU returns a
    // real per-firm assessment. AG retains the pre-2021 NASDAQ ticker as its
    // identifier even though Virtusa is now privately held (isPublic: false).
    id: "virtusa",
    name: "Virtusa",
    mark: "V",
    // Dominant brand colour sampled from virtusa.com's own rendered styles;
    // used as a fill behind white text, so the deep navy is the readable pick
    // over their bright-green secondary accent.
    accent: "1E2345",
    thesis:
      "Lead with digital engineering depth, industry domain expertise, and delivery agility — differentiating on focused client co-innovation rather than the scale of larger integrators.",
    agTicker: "VRTU",
  },
];

const DEFAULT_VENDOR = VENDORS[0]; // Capgemini — preserves prior hardcoded behaviour when no vendor is specified.

export function vendorById(vendorId: string | undefined | null): VendorContext {
  if (!vendorId) return DEFAULT_VENDOR;
  return VENDORS.find((v) => v.id === vendorId.toLowerCase()) ?? DEFAULT_VENDOR;
}

/** Case-insensitive match on display name, for callers that only have free-text (e.g. a typed vendor name). */
export function vendorByName(name: string | undefined | null): VendorContext {
  if (!name) return DEFAULT_VENDOR;
  const norm = name.trim().toLowerCase();
  return VENDORS.find((v) => v.name.toLowerCase() === norm) ?? DEFAULT_VENDOR;
}
