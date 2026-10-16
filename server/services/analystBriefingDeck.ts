import type pptxgen from "pptxgenjs";
import {
  newDeck,
  deckToBuffer,
  addCover,
  addClosing,
  addBodySlide,
  addBulletList,
  addCards,
  addRowList,
  addSectionLabel,
  addStats,
  addTable,
  AG,
  CONTENT_BOTTOM,
  FONT_BODY,
  fitH,
  todayLabel,
  type Brand,
} from "./boardPack";
import { addAgIntelligenceSlides, readProvenance } from "./agIntelligenceSlide";
import { vendorById, vendorByTicker } from "./vendors";
import { vendorAnalystView, type VendorAnalyst } from "./rosterSync";
import { analystCoverageStore } from "./analystCoverageStore";
import { publicRankingsStore } from "./publicRankingsStore";
import { askStore } from "./askStore";
import { CROSS_HOUSE_FRAMEWORK, CONFIDENCE_FACTOR, playbookById, type AnalystHouseId, type HousePlaybook } from "@shared/assessmentPlaybooks";
import type { AnalystCoverage, PublicAnalystRanking } from "@shared/schema";

// ============================================================================
// Analyst briefing pack — one named analyst, one vendor.
//
// The work the WorkEngine hand-off used to ask a person to do, done here from
// the same seed: who the analyst is and what they have published about the
// vendor (cited coverage), what their house probes in an executive briefing
// (house playbook, or the cross-house framework), the vendor's record and the
// peer record at that house (cited placements), the AnalystGenius read, and a
// debrief template whose answers feed the perception engine. Relationship
// state comes from the roster and is stated as unknown when nothing is logged.
// ============================================================================

export interface AnalystBriefingDeckInput {
  vendorId: string;
  analystKey: string;
  competitorTickers?: string[];
}

const HOUSE_BY_FIRM: Record<string, AnalystHouseId> = {
  gartner: "gartner",
  forrester: "forrester",
  idc: "idc",
  "hfs research": "hfs",
  hfs: "hfs",
  nelsonhall: "nelsonhall",
  isg: "isg",
  "everest group": "everest",
  everest: "everest",
};

function personKey(name: string, firm: string): string {
  return `${name.trim().toLowerCase()}|${firm.trim().toLowerCase()}`;
}

function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function fmtDate(d: string | null | undefined, precision?: string | null): string {
  if (!d) return "—";
  if (precision === "year" || /^\d{4}$/.test(d)) return d.slice(0, 4);
  if (precision === "month" || /^\d{4}-\d{2}$/.test(d)) {
    const [y, m] = d.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function sourceSplit(rows: PublicAnalystRanking[]): string {
  const confirmed = rows.filter((r) => r.source_type === "analyst_firm_page").length;
  return `${confirmed} of ${rows.length} confirmed on the analyst firm's own page; the rest are vendor-reported.`;
}

export async function resolveAnalyst(vendorId: string, analystKey: string): Promise<VendorAnalyst> {
  const view = await vendorAnalystView(vendorId);
  const person = view.analysts.find((a) => a.key === analystKey);
  if (!person) throw new Error("That analyst is not in the coverage held for this vendor.");
  return person;
}

export function getAnalystBriefingDeckFilename(vendorId: string, person: Pick<VendorAnalyst, "name" | "firm">): string {
  return `${slugify(vendorById(vendorId).name)}--${slugify(person.name)}--${slugify(person.firm)}--briefing-pack.pptx`;
}

export async function createAnalystBriefingDeck(input: AnalystBriefingDeckInput): Promise<{ buffer: Buffer; filename: string }> {
  const vendor = vendorById(input.vendorId);
  const vendorName = vendor.name;
  const person = await resolveAnalyst(vendor.id, input.analystKey);
  const firm = person.firm;
  const houseId = HOUSE_BY_FIRM[firm.toLowerCase()];
  const playbook: HousePlaybook | null = houseId ? playbookById(houseId) : null;

  const peerIds = new Set((input.competitorTickers ?? []).map((t) => vendorByTicker(t)?.id).filter((v): v is string => Boolean(v) && v !== vendor.id));
  const [coverage, rankings, asks] = await Promise.all([
    analystCoverageStore.list(vendor.id).catch(() => null),
    publicRankingsStore.listRankings().catch(() => null),
    askStore.list(vendor.id).catch(() => null),
  ]);
  const theirRows = (coverage ?? []).filter((r: AnalystCoverage) => personKey(r.analyst_name, r.firm) === input.analystKey);
  const theirPositions = theirRows
    .filter((r) => r.vendor_id === vendor.id && r.stance_summary && r.source_url)
    .sort((a, b) => String(b.published_date ?? "").localeCompare(String(a.published_date ?? "")));
  const colleagues = (coverage ?? [])
    .filter((r: AnalystCoverage) => r.firm.toLowerCase() === firm.toLowerCase() && personKey(r.analyst_name, r.firm) !== input.analystKey && r.vendor_id === vendor.id && r.stance_summary && r.source_url)
    .sort((a, b) => String(b.published_date ?? "").localeCompare(String(a.published_date ?? "")));
  const atFirm = (rankings ?? []).filter((r) => r.analyst_firm.toLowerCase() === firm.toLowerCase());
  const ourRecord = atFirm.filter((r) => r.vendor_id === vendor.id).sort((a, b) => b.published_date.localeCompare(a.published_date));
  const peerRecord = atFirm.filter((r) => peerIds.has(r.vendor_id)).sort((a, b) => b.published_date.localeCompare(a.published_date));
  const openAsks = (asks ?? []).filter((a) => a.status === "open");

  const relationship =
    person.last_interaction_at === null
      ? "No interaction with this analyst is logged in AR SuperHero and no relationship stance is confirmed. Treat the relationship as unknown, not neutral."
      : `Last logged interaction ${new Date(person.last_interaction_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}${person.current_stance ? `; recorded stance ${person.current_stance.stance} (confidence ${person.current_stance.confidence})` : "; no stance recorded"}.`;

  const brand: Brand = { vendorName, vendorMark: vendor.mark, vendorAccent: vendor.accent, deckLabel: `${firm} briefing pack` };
  const pptx = newDeck({ title: `${vendorName} — briefing with ${person.name}, ${firm}`, subject: `AnalystGenius analyst briefing pack` });
  let n = 0;
  const idx = () => String(++n).padStart(2, "0");
  const agenda = ["The AnalystGenius read", "Who you are meeting", `What ${firm} will probe`, `Your record at ${firm}`, "The debrief", "Next steps"];

  addCover(pptx, brand, {
    kicker: `Prepared for ${vendorName} · ${todayLabel()}`,
    titleA: "Briefing:",
    titleB: `${person.name}, ${firm}.`,
    subTitle: `Prepare and hold a briefing with ${person.name}${person.role ? ` (${person.role})` : ""} about ${vendorName}: what they have published, what they are likely to probe, and a debrief that records what was learned about the relationship.`,
    contextLines: [relationship, "For the AR team and the executives who will present."],
    stats: [
      { value: String(theirPositions.length), label: theirPositions.length === 1 ? "Published position on you" : "Published positions on you" },
      { value: person.latest_published ? fmtDate(person.latest_published, person.latest_precision) : "—", label: "Latest" },
      { value: String(ourRecord.length), label: `Your placements at ${firm}` },
    ],
    preparedFor: { name: "Analyst relations", role: vendorName },
    agenda,
    notes: `Generated by AnalystGenius AR SuperHero on ${todayLabel()} from the same seed as the WorkEngine hand-off: cited coverage for ${person.name}, cited ${firm} placements, the ${houseId ? `${firm} playbook` : "cross-house framework"}, the AnalystGenius read, and the roster. Peer set: ${(input.competitorTickers ?? []).join(", ") || "none named"}.`,
  });

  const brief = await addAgIntelligenceSlides(pptx, brand, idx, input.competitorTickers, vendor.agTicker, agenda[0]);

  // Who you are meeting.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: agenda[1],
      title: `${person.name}, ${person.role ? `${person.role}, ` : ""}${firm}`,
      note: theirPositions.length ? `${theirPositions.length} published, sourced position${theirPositions.length === 1 ? "" : "s"} on ${vendorName}. Each one is quoted below with its date.` : `No published position on ${vendorName} is on record for this analyst. The sources are their profile and the firm's market coverage.`,
      caveat: relationship,
      notes: `Sources: ${person.profile_url ?? "no profile URL held"}; ${theirPositions.map((r) => r.source_url).join("; ")}. Relationship state from the AR SuperHero roster.`,
    });
    let y = contentTop;
    if (theirPositions.length) {
      addTable(slide, {
        x: 0.75,
        y,
        w: 11.83,
        colW: [1.5, 6.6, 3.73],
        headers: ["Published", "Position on " + vendorName, "Where"],
        rows: theirPositions.slice(0, 5).map((r) => ({
          cells: [fmtDate(r.published_date, r.date_precision), `${r.stance_summary}${r.quote ? `\n“${r.quote}”` : ""}`, (r.source_url ?? "").replace(/^https?:\/\//, "").slice(0, 60)],
        })),
        fontSize: 9.5,
      });
      y += 0.38 + Math.min(theirPositions.length, 5) * 0.6 + 0.3;
    }
    if (person.profile_url && y < CONTENT_BOTTOM - 0.5) {
      addSectionLabel(slide, "Profile", { x: 0.75, y, w: 11.83 });
      slide.addText(person.profile_url, { x: 0.75, y: y + 0.28, w: 11.83, h: 0.3, fontFace: FONT_BODY, fontSize: 10, color: AG.body, margin: 0, hyperlink: { url: person.profile_url } });
    }
  }

  // What the house will probe.
  {
    const stage = playbook?.stages.find((s) => s.stage === "exec-briefing");
    const divergences = (brief.gapAnalysis?.topDivergences ?? []).map((d) => `${d.theme}: narrative ${d.narrativeScore ?? "—"} vs reality ${d.realityScore ?? "—"} — ${d.interpretation ?? ""}`);
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: agenda[2],
      title: `What ${firm} will probe, and how to answer`,
      note: stage?.note ?? playbook?.assessment.leadership ?? "No house playbook is held for this firm; the cross-house framework applies.",
      caveat: playbook ? "House rules are a synthesis of published methodology and the owner playbook, not published weights. The study's own criteria override them." : `${CONFIDENCE_FACTOR.headline} ${CONFIDENCE_FACTOR.detail.slice(0, 140)}…`,
      notes: `Sources: AnalystGenius narrative-reality-gap (divergences; ${readProvenance(brief)}); ${playbook ? `${firm} playbook exec-briefing stage` : "cross-house framework"}.`,
    });
    addSectionLabel(slide, "Probe areas — where the story and measured reality diverge", { x: 0.75, y: contentTop, w: 11.83 });
    addBulletList(slide, divergences.length ? divergences : ["No divergence data available at generation time."], { x: 0.75, y: contentTop + 0.3, w: 11.83, h: 1.4, fontSize: 10.5 });
    const rulesTop = contentTop + 1.85;
    if (stage) {
      addSectionLabel(slide, `${firm} briefing rules`, { x: 0.75, y: rulesTop, w: 11.83 });
      addBulletList(slide, [...stage.dos.slice(0, 3).map((d) => `Do — ${d}`), ...stage.donts.slice(0, 3).map((d) => `Don't — ${d}`)], { x: 0.75, y: rulesTop + 0.3, w: 11.83, h: CONTENT_BOTTOM - rulesTop - 0.35, fontSize: 10 });
    } else {
      const redTeam = CROSS_HOUSE_FRAMEWORK.find((f) => /red-team/i.test(f.title));
      addSectionLabel(slide, redTeam?.title ?? "Red-team the briefing", { x: 0.75, y: rulesTop, w: 11.83 });
      addBulletList(slide, redTeam?.points ?? [], { x: 0.75, y: rulesTop + 0.3, w: 11.83, h: CONTENT_BOTTOM - rulesTop - 0.35, fontSize: 10 });
    }
  }

  // Your record at the firm, and the peers'.
  {
    const unavailable = rankings === null;
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: agenda[3],
      title: `Your record at ${firm}`,
      note: unavailable ? "The placement record could not be read when this deck was generated." : ourRecord.length ? `${ourRecord.length} cited ${firm} placement${ourRecord.length === 1 ? "" : "s"} for ${vendorName}. What the analyst can see of you in public.` : `No cited ${firm} placement is logged for ${vendorName}. Logged means found and cited; verify with the house.`,
      caveat: unavailable ? "Absent, not empty: regenerate the deck." : ourRecord.length || peerRecord.length ? sourceSplit([...ourRecord, ...peerRecord]) : undefined,
      notes: `Source: cited public placements held by AR SuperHero. ${ourRecord.slice(0, 8).map((r) => `${r.report_name} — ${r.source_url}`).join("; ")}`,
    });
    let y = contentTop;
    if (ourRecord.length) {
      addTable(slide, { x: 0.75, y, w: 11.83, colW: [6.3, 2.8, 2.73], headers: ["Report", "Placement", "Published"], rows: ourRecord.slice(0, 6).map((r) => ({ cells: [r.report_name, r.placement, fmtDate(r.published_date, r.date_precision)] })), fontSize: 9.5 });
      y += 0.38 + Math.min(ourRecord.length, 6) * 0.32 + 0.3;
    }
    if (peerRecord.length && y < CONTENT_BOTTOM - 1.0) {
      const room = Math.max(1, Math.floor((CONTENT_BOTTOM - y - 0.7) / 0.3));
      addSectionLabel(slide, `Peers at ${firm} — the comparison the analyst already holds`, { x: 0.75, y, w: 11.83 });
      addTable(slide, { x: 0.75, y: y + 0.3, w: 11.83, colW: [1.8, 5.0, 2.5, 2.53], headers: ["Firm", "Report", "Placement", "Published"], rows: peerRecord.slice(0, room).map((r) => ({ cells: [vendorById(r.vendor_id).name, r.report_name, r.placement, fmtDate(r.published_date, r.date_precision)] })), fontSize: 9 });
    }
  }

  // Colleagues at the firm with a position on us.
  if (colleagues.length) {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: agenda[3],
      title: `Who else at ${firm} has published on ${vendorName}`,
      note: `${colleagues.length} colleague${colleagues.length === 1 ? "" : "s"} with a sourced position. The analyst will have read them.`,
      caveat: "Positions are shown as published, with the date.",
      notes: `Sources: ${colleagues.slice(0, 8).map((r) => `${r.analyst_name} — ${r.source_url}`).join("; ")}`,
    });
    addTable(slide, { x: 0.75, y: contentTop, w: 11.83, colW: [2.6, 7.0, 2.23], headers: ["Analyst", "Position", "Published"], rows: colleagues.slice(0, 6).map((r) => ({ cells: [r.analyst_name + (r.role ? `\n${r.role}` : ""), r.stance_summary ?? "", fmtDate(r.published_date, r.date_precision)] })), fontSize: 9.5 });
  }

  // The debrief — open inputs that feed the perception engine.
  {
    const { slide, contentTop } = addBodySlide(pptx, brand, {
      index: idx(),
      section: agenda[4],
      title: "The debrief — record what was learned",
      note: "Fill this in within a day of the briefing. These notes are what the perception engine reads to propose a relationship-stance change; the AR team confirms it.",
      caveat: "Open inputs by design. Nothing here is pre-filled or inferred.",
      notes: "Capability: ar-superhero-perception-engine proposes a stance from debrief notes and interaction logs; it suggests only.",
    });
    addCards(
      slide,
      [
        { title: "What they probed", body: "The questions asked, in their words where possible, and which probe area each one belongs to." },
        { title: "What they said about you", body: "Positions stated or implied, and anything that contradicts their published view." },
        { title: "Evidence they asked for", body: "Each request becomes an ask with an owner and a date on Direct." },
        { title: "Relationship signal", body: "Warm, neutral, sceptical, or unknown — and the sentence that supports it." },
        { title: "What we committed to", body: "Follow-ups promised in the room, with owner and date." },
        { title: "Log the interaction", body: "Record it on the roster so the next briefing starts from a known relationship, not an unknown one." },
      ],
      { x: 0.75, y: contentTop, w: 11.83, cols: 3, h: 1.75, numbered: true }
    );
  }

  const steps = [
    { title: "Confirm the briefing slot", body: `With ${person.name}'s scheduler at ${firm}. AR SuperHero holds no house calendar.`, owner: "AR team" },
    { title: "Build the evidence for each probe area", body: "One row per divergence: the claim, the proof, its date, its owner.", owner: `${vendorName} evidence owners` },
    { title: "Debrief within a day", body: "Fill the debrief slide and log the interaction; the perception engine then proposes a stance for you to confirm.", owner: "AR team" },
  ];
  if (openAsks.length) steps[1] = { title: `${openAsks.length} open ask${openAsks.length === 1 ? "" : "s"} already recorded`, body: openAsks.slice(0, 2).map((a) => a.title).join(" · "), owner: "Leaders named on Direct" };

  addClosing(pptx, brand, {
    titleA: "The next step",
    titleB: `with ${person.name}.`,
    body: `A briefing prepared from what is actually on record: their published positions, your cited placements at ${firm}, and the AnalystGenius read. Where the relationship is unknown, it says so.`,
    nextSteps: steps,
    disclaimer: "Generated by AnalystGenius AR SuperHero. Coverage and placements carry sources; house guidance is a synthesis, not published weights; no outcome is predicted. © 2026 AnalystGenius.",
  });

  return { buffer: await deckToBuffer(pptx), filename: getAnalystBriefingDeckFilename(vendor.id, person) };
}
