import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow, Glyph, HairLine } from "@/components/cockpit/atoms";
import { DecisionModel } from "@/components/cockpit/upload";
import {
  SUCCEED_DECISION_STAGES,
  SUCCEED_MODEL_IMPACTS,
  DIRECT_DECISION_STAGES,
  DIRECT_MODEL_IMPACTS,
  ENABLE_DECISION_STAGES,
  ENABLE_MODEL_IMPACTS,
  type SucceedMaterialType,
  type DirectMaterialType,
  type EnableMaterialType,
} from "@/lib/cockpit";

// ============================================================================
// How it works — the three decision models on one page.
//
// These diagrams describe how uploaded material is meant to flow through each
// mode. They used to sit as a "Pipeline" sub-tab on every mode, three times
// over, beside panels that simulate the flow. One page says it once, and says
// what it is: the intended design, with each stage lighting up as its real
// implementation lands. Nothing here is a claim that a stage is running today.
// ============================================================================

export default function HowItWorks() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10 lg:py-14">
      <section className="mb-12">
        <Eyebrow tone="gold" className="mb-3">
          <span className="inline-flex items-center gap-2">
            <Glyph>Reference</Glyph>
            <span className="text-white/50">·</span>
            <span>How it works</span>
          </span>
        </Eyebrow>
        <h1 className="text-[44px] font-semibold leading-[0.98] tracking-[-0.035em] text-[#f4eed8] md:text-[56px]">
          Three decision models. <span className="text-[#a88945]">One cockpit.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-white/55 md:text-[16.5px]">
          How material is meant to move through Succeed, Direct and Enable, from upload to output. This is the intended
          design. Today the Direct and Enable upload panels simulate the flow; Succeed already reads real records. Each
          stage below becomes live as its real implementation lands, and this page will say which.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-[11px] font-medium uppercase tracking-[0.16em]">
          {[
            ["/succeed", "Succeed"],
            ["/direct", "Direct"],
            ["/enable", "Enable"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex items-center gap-1 text-[#d5b46b] transition hover:text-[#f0dca8]">
              {label} <ArrowUpRight className="h-3 w-3" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-16" data-testid="how-succeed">
        <DecisionModel<SucceedMaterialType>
          accent="gold"
          eyebrow="Mode I · Succeed decision model"
          title="From upload to readiness."
          description="Eight stages turn raw material into criteria, gaps, prompts, and learning signals. Outputs feed this customer’s readiness directly. Cross-client learning runs only through validated AnalystGenius researcher review."
          stages={SUCCEED_DECISION_STAGES}
          impacts={SUCCEED_MODEL_IMPACTS}
          finalNote="AnalystGenius learning uses validated patterns only. Third-party analyst text, scoring rationale, or methodology IP is never republished across clients."
        />
      </section>

      <HairLine className="mb-16" />

      <section className="mb-16" data-testid="how-direct">
        <DecisionModel<DirectMaterialType>
          accent="gold"
          eyebrow="Mode II · Direct decision model"
          title="From upload to leader briefing."
          description="Five stages turn raw internal material into lens-routed brief inputs, action asks, and risks or opportunities by lens — a briefing-ready summary with NDA controls applied."
          stages={DIRECT_DECISION_STAGES}
          impacts={DIRECT_MODEL_IMPACTS}
          finalNote="Brief summaries surface what AR observes. Leader relationship stance is held back unless AR chooses to include it."
        />
      </section>

      <HairLine className="mb-16" />

      <section className="mb-8" data-testid="how-enable">
        <DecisionModel<EnableMaterialType>
          accent="teal"
          eyebrow="Mode III · Enable decision model"
          title="From upload to sales-safe guidance."
          description="Six stages turn raw enablement material into cleared proof, restricted claims, audience-permitted reuse, presence-gap mapping, and internal thought-leadership prompts."
          stages={ENABLE_DECISION_STAGES}
          impacts={ENABLE_MODEL_IMPACTS}
          finalNote="All outputs are internal-only. Sellers see sales-safe proof; marketing sees restricted claims to avoid."
        />
      </section>
    </div>
  );
}
