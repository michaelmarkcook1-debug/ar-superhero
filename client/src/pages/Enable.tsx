import { useMemo, useState } from "react";
import { Shield, TrendingUp, AlertOctagon } from "lucide-react";
import {
  SELL_PROOF,
  CLAIMS_TO_AVOID,
  BUYER_GUIDANCE,
  NARRATIVES,
  PRESENCE_GAPS,
  ENABLE_UPLOADS,
  ENABLE_MATERIAL_TYPES,
  ENABLE_DECISION_STAGES,
  ENABLE_MODEL_IMPACTS,
  ENABLE_SELL_DELIVERABLES,
  ENABLE_PRESENCE_DELIVERABLES,
  ENABLE_DELIVERABLES_NOTE,
  type EnableUpload,
  type EnableMaterialType,
} from "@/lib/cockpit";
import {
  Pane,
  Eyebrow,
  SectionTitle,
  StatusChip,
  StatusDot,
  HairLine,
  Glyph,
  NumberMark,
} from "@/components/cockpit/atoms";
import {
  UploadPanel,
  UploadedItemsList,
  DecisionModel,
  type GenericUploadedItem,
} from "@/components/cockpit/upload";
import { DeliverablesPanel } from "@/components/cockpit/deliverables";

type Tab = "sell" | "presence";

export default function Enable() {
  const [tab, setTab] = useState<Tab>("sell");
  const [extraUploads, setExtraUploads] = useState<EnableUpload[]>([]);

  const allUploads = [...extraUploads, ...ENABLE_UPLOADS];
  const newIds = extraUploads.map((u) => u.id);

  const uploadedItems: GenericUploadedItem[] = useMemo(
    () =>
      allUploads.map((u) => {
        const typeLabel =
          ENABLE_MATERIAL_TYPES.find((t) => t.id === u.type)?.label || u.type;
        return {
          id: u.id,
          filename: u.filename,
          typeLabel,
          size: u.size,
          uploadedBy: u.uploadedBy,
          uploadedAt: u.uploadedAt,
          state: u.state,
          badge: `Routed → ${u.routedTo}`,
          summary: u.summary,
          signals: u.signals,
        };
      }),
    [allUploads]
  );

  function handleSimulatedUpload(info: {
    filename: string;
    type: EnableMaterialType;
    size: string;
  }) {
    const newItem: EnableUpload = {
      id: `eu-new-${Date.now()}`,
      filename: info.filename,
      type: info.type,
      size: info.size,
      uploadedBy: "You",
      uploadedAt: "Just now",
      state: "Analysed",
      summary:
        "Captured. Claims audited, proof clearance checked, presence-gap mapping run.",
      signals: [
        "Routed to proof clearance",
        "Claim audit completed",
        "Presence-gap mapping refreshed",
      ],
      routedTo: tab === "sell" ? "Sell" : "Build market presence",
    };
    setExtraUploads((prev) => [newItem, ...prev]);
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10 lg:py-14">
      {/* Hero */}
      <section className="mb-12">
        <Eyebrow tone="gold" className="mb-3">
          <span className="inline-flex items-center gap-2">
            <Glyph>Mode III</Glyph>
            <span className="text-white/50">·</span>
            <span>Enable</span>
          </span>
        </Eyebrow>
        <h1 className="text-[44px] font-semibold leading-[0.98] tracking-[-0.035em] text-[#f4eed8] md:text-[56px] lg:text-[64px]">
          Enable the business to <span className="text-[#a88945]">sell and build market presence.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-white/55 md:text-[16.5px]">
          Analyst-informed proof and guidance for internal teams. No public
          campaigns — every artefact here is for sellers, pursuit teams, and
          internal marketing.
        </p>
      </section>

      {/* Upload commercial / presence material */}
      <section className="mb-12" id="upload-material">
        <UploadPanel<EnableMaterialType>
          accent="gold"
          eyebrow="Mode III · Enable"
          title="Upload material to enable selling and presence."
          subtitle="Sales decks, approved proof points, case studies, references, messaging drafts, campaign plans, thought-leadership drafts, website copy, enablement notes, claim lists, recognition snippets, internal comms drafts. Each upload is audited for proof clearance, claim risk, and presence-gap fit."
          types={ENABLE_MATERIAL_TYPES}
          onSimulatedUpload={handleSimulatedUpload}
          permissionNote="Outputs are internal-only. Sales-safe proof is cleared for buyer-facing reuse; restricted proof shows its permitted audience. No public campaign generation in this release."
        />
      </section>

      {/* Sub-tabs */}
      <section className="mb-10">
        <div
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] p-1"
          data-testid="enable-tabs"
        >
          <SubTab id="sell" current={tab} onClick={setTab} label="Sell" />
          <SubTab id="presence" current={tab} onClick={setTab} label="Build market presence" />
        </div>
      </section>

      {tab === "sell" ? <SellContent /> : <PresenceContent />}

      {/* Uploaded items library */}
      <section className="mb-14 mt-14">
        <SectionTitle
          eyebrow="Enablement material library"
          title="Everything uploaded, audited for reuse."
          description={`${uploadedItems.length} items analysed across Sell and Build market presence. Each item shows its captured signals and where the model routed it.`}
        />
        <UploadedItemsList items={uploadedItems} newIds={newIds} />
      </section>

      <section className="mb-4">
        <DecisionModel<EnableMaterialType>
          accent="gold"
          eyebrow="Enable decision model"
          title="From upload to sales-safe guidance."
          description="Six stages turn raw enablement material into cleared proof, restricted claims, audience-permitted reuse, presence-gap mapping, and internal thought-leadership prompts. No public campaign generation in this release."
          stages={ENABLE_DECISION_STAGES}
          impacts={ENABLE_MODEL_IMPACTS}
          finalNote="All outputs are internal-only. Sellers see sales-safe proof; marketing sees restricted claims to avoid. Public campaign generation is out of scope for the MVP."
        />
      </section>
    </div>
  );
}

function SubTab({
  id,
  current,
  onClick,
  label,
}: {
  id: Tab;
  current: Tab;
  onClick: (t: Tab) => void;
  label: string;
}) {
  const active = id === current;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      data-testid={`tab-${id}`}
      className={`rounded-full px-5 py-2 text-[12.5px] font-medium uppercase tracking-[0.14em] transition ${
        active
          ? "bg-[#a88945] text-[#0a0d14]"
          : "text-white/55 hover:text-white/85"
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================================
// SELL TAB
// ============================================================================

function SellContent() {
  const safeCount = SELL_PROOF.filter((p) => p.status === "safe").length;
  const restrictedCount = SELL_PROOF.filter((p) => p.status === "restricted").length;
  const unsupportedCount = SELL_PROOF.filter((p) => p.status === "unsupported").length;

  return (
    <div>
      {/* Top numbers */}
      <section className="mb-12 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04]">
        <div className="bg-[#0a0d14] p-6">
          <NumberMark value={String(safeCount)} label="Sales-safe proof" sub="Cleared for buyers" />
        </div>
        <div className="bg-[#0a0d14] p-6">
          <NumberMark value={String(restrictedCount)} label="Restricted reuse" sub="Audience controls apply" />
        </div>
        <div className="bg-[#0a0d14] p-6">
          <NumberMark
            value={String(unsupportedCount + CLAIMS_TO_AVOID.length)}
            label="Claims to avoid"
            sub="Would be challenged"
          />
        </div>
      </section>

      {/* Approved proof */}
      <section className="mb-12">
        <SectionTitle
          eyebrow="Approved proof"
          title="Snippets that are safe to send into a deal."
          description="Every item here is source-traced. Restricted items show their permitted audience."
        />
        <Pane className="overflow-hidden p-0">
          {SELL_PROOF.map((p, i) => (
            <div
              key={p.id}
              className={`grid grid-cols-12 gap-4 px-6 py-5 ${
                i !== SELL_PROOF.length - 1 ? "border-b border-white/[0.04]" : ""
              }`}
              data-testid={`proof-${p.id}`}
            >
              <div className="col-span-7 flex items-start gap-3">
                <div className="mt-1.5">
                  <StatusDot status={p.status} />
                </div>
                <div>
                  <div className="text-[14px] font-medium leading-snug text-[#e7e3d8]">
                    {p.title}
                  </div>
                  <div className="mt-1 text-[12.5px] leading-relaxed text-white/50">
                    {p.rationale}
                  </div>
                </div>
              </div>
              <div className="col-span-3 flex items-center">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/45">
                  {p.reuse}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <StatusChip status={p.status} />
              </div>
            </div>
          ))}
        </Pane>
      </section>

      {/* Claims to avoid */}
      <section className="mb-12">
        <SectionTitle
          eyebrow="Claims to avoid"
          title="What not to say in a deal room."
          description="Each claim is here because the evidence behind it is missing, restricted, or would be challenged. Internal-use guidance only."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {CLAIMS_TO_AVOID.map((c) => (
            <Pane key={c.id} className="p-5" data-testid={`avoid-${c.id}`}>
              <div className="flex items-start gap-3">
                <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-[#e89797]" />
                <div>
                  <div className="text-[13.5px] font-medium leading-snug text-[#f4eed8]">
                    "{c.claim}"
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-white/50">
                    {c.reason}
                  </p>
                </div>
              </div>
            </Pane>
          ))}
        </div>
      </section>

      {/* Sell deliverables */}
      <section className="mb-12">
        <DeliverablesPanel
          eyebrow="Sell deliverables"
          title="Sales-safe outputs, ready for pursuit teams."
          description="AnalystGenius templates for the Sell workstream. Each output composes cleared proof, restricted-claim guidance, and analyst credibility into a sales-leader-ready artefact."
          templates={ENABLE_SELL_DELIVERABLES}
          accent="gold"
          guardrailNote={ENABLE_DELIVERABLES_NOTE}
        />
      </section>

      {/* Buyer influence guidance */}
      <section>
        <SectionTitle
          eyebrow="Buyer influence guidance"
          title="What lands with each buyer."
          description="Sales-leader-ready: which proof points open which conversations, and where to hold the line."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {BUYER_GUIDANCE.map((b) => (
            <Pane key={b.id} className="p-6">
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-[#d5b46b]" />
                <Eyebrow tone="gold">{b.buyer}</Eyebrow>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
                {b.guidance}
              </p>
              <HairLine className="my-5" />
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                Approved snippets
              </div>
              <ul className="space-y-1.5">
                {b.approved.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12px] text-white/65">
                    <StatusDot status="safe" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Pane>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// BUILD MARKET PRESENCE TAB
// ============================================================================

function PresenceContent() {
  return (
    <div>
      {/* Narratives */}
      <section className="mb-12">
        <SectionTitle
          eyebrow="Analyst-resonant narratives"
          title="The stories analysts are weighing this cycle."
          description="Internal narrative guidance. These shape AR briefings and internal sales-enablement, not external campaigns."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {NARRATIVES.map((n) => (
            <Pane key={n.id} className="p-7" data-testid={`narrative-${n.id}`}>
              <div className="mb-3 flex items-center justify-between">
                <Eyebrow tone="gold">{n.title}</Eyebrow>
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                    n.resonance === "Rising"
                      ? "text-[#a5d8ab]"
                      : n.resonance === "Steady"
                      ? "text-[#e5c989]"
                      : "text-white/45"
                  }`}
                >
                  <TrendingUp
                    className={`h-3 w-3 ${n.resonance === "Declining" ? "rotate-180" : ""}`}
                  />
                  {n.resonance}
                </span>
              </div>
              <p className="text-[13.5px] leading-relaxed text-white/65">{n.detail}</p>
              {n.internalOnly && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/45">
                  <Shield className="h-2.5 w-2.5" />
                  Internal guidance only
                </div>
              )}
            </Pane>
          ))}
        </div>
      </section>

      {/* Presence gaps */}
      <section className="mb-12">
        <SectionTitle
          eyebrow="Market presence gaps"
          title="Where the story isn't landing yet."
          description="AR's view of the gaps that hold Northstar back from being heard in this category."
        />
        <Pane className="overflow-hidden p-0">
          {PRESENCE_GAPS.map((g, i) => (
            <div
              key={g.id}
              className={`grid grid-cols-12 gap-6 px-7 py-5 ${
                i !== PRESENCE_GAPS.length - 1 ? "border-b border-white/[0.04]" : ""
              }`}
              data-testid={`presence-gap-${g.id}`}
            >
              <div className="col-span-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#d5b46b]">
                {g.area}
              </div>
              <div className="col-span-4 text-[13.5px] text-white/85">{g.gap}</div>
              <div className="col-span-5 text-[12.5px] leading-relaxed text-white/55">
                {g.guidance}
              </div>
            </div>
          ))}
        </Pane>
      </section>

      {/* Presence deliverables */}
      <section className="mb-12">
        <DeliverablesPanel
          eyebrow="Build market presence deliverables"
          title="Internal guidance for marketing and AR."
          description="AnalystGenius templates for the Build market presence workstream. Outputs guide internal marketing, narrative shaping, and recognition usage. No public campaign generation in MVP."
          templates={ENABLE_PRESENCE_DELIVERABLES}
          accent="teal"
          guardrailNote={ENABLE_DELIVERABLES_NOTE}
        />
      </section>

      {/* Thought leadership opportunities */}
      <section>
        <SectionTitle
          eyebrow="Thought leadership opportunities"
          title="Where AR could spark the next conversation."
          description="Internal prompts only — none of these run as public campaigns in this release."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {OPPORTUNITIES.map((o) => (
            <Pane key={o.id} className="p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
                {o.format}
              </div>
              <div className="mt-2 text-[15px] font-semibold leading-snug tracking-tight text-[#e7e3d8]">
                {o.headline}
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-white/55">
                {o.body}
              </p>
              <HairLine className="my-5" />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                  {o.owner}
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/45">
                  Internal · Briefing-grade
                </span>
              </div>
            </Pane>
          ))}
        </div>
      </section>
    </div>
  );
}

const OPPORTUNITIES = [
  {
    id: "o1",
    format: "AR briefing series",
    headline: "Composable architecture in BFSI",
    body: "Pair Northstar's two refactor outcomes with a playbook narrative. Tightens the App Modernisation moment.",
    owner: "Strategy + AR",
  },
  {
    id: "o2",
    format: "Internal sales-enablement",
    headline: "Outcome-led delivery model",
    body: "Delivery-led narrative is well-supported by current outcomes. Package as a stand-alone capability story.",
    owner: "Delivery + Marketing",
  },
  {
    id: "o3",
    format: "Analyst-only POV",
    headline: "Cross-business-unit collaboration",
    body: "Required for HFS Horizons. One-pager co-authored with Strategy unlocks reuse across PEAK and Wave.",
    owner: "Strategy",
  },
];
