import { useRef, useState } from "react";
import { FileUp, Loader2, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "./atoms";
import { storedCompetitorTickers } from "@/lib/agBrief";
import { cn } from "@/lib/utils";
import { SELL_PROOF, CLAIMS_TO_AVOID } from "@/lib/cockpit";

// ============================================================================
// RFP/RFI analyzer — Enable tab.
//
// Uploads a draft response document and reviews it against live AG market
// intelligence plus the approved proof-point / claims-to-avoid library.
// Every suggestion the model returns is either tied to a named source
// (shown as provenance) or explicitly marked as a general note — the
// backend enforces this, this view just surfaces it honestly.
// ============================================================================

type Category = "evidence-gap" | "proof-point" | "risk" | "clarity" | "competitive-positioning";

const CATEGORY_LABEL: Record<Category, string> = {
  "evidence-gap": "Evidence gap",
  "proof-point": "Proof point",
  risk: "Risk",
  clarity: "Clarity",
  "competitive-positioning": "Competitive positioning",
};

const CATEGORY_TONE: Record<Category, string> = {
  "evidence-gap": "border-[#d5b46b]/30 bg-[#d5b46b]/[0.07] text-[#e5c989]",
  "proof-point": "border-[#00a7b7]/30 bg-[#00a7b7]/[0.07] text-[#63d7de]",
  risk: "border-[#d56a6a]/30 bg-[#d56a6a]/[0.07] text-[#e89797]",
  clarity: "border-[#3d8f6d]/26 bg-[#1a5540]/[0.22] text-white/60",
  "competitive-positioning": "border-[#a88945]/40 bg-[#a88945]/[0.1] px-2.5 text-[#f0dca8]",
};

type Suggestion = {
  category: Category;
  title: string;
  detail: string;
  suggestedAction: string;
  groundedIn: string | null;
};

type AnalysisResult = {
  documentSummary: string;
  suggestions: Suggestion[];
  strengthsFound: string[];
  usedLiveData: boolean;
  liveDataReason: string | null;
  truncated: boolean;
};

export default function RfpAnalyzer() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAnalyze(file: File) {
    setUploading(true);
    setError(null);
    setResult(null);
    setFilename(file.name);
    try {
      const safeProof = SELL_PROOF.map((p) => ({ title: p.title, status: p.status, reuse: p.reuse }));
      const claims = CLAIMS_TO_AVOID.map((c) => ({ claim: c.claim, reason: c.reason }));
      const qs = new URLSearchParams({
        filename: file.name,
        proofPoints: JSON.stringify(safeProof),
        claimsToAvoid: JSON.stringify(claims),
        competitorTickers: JSON.stringify(storedCompetitorTickers()),
      });
      const res = await fetch(`/api/enable/rfp-analyze?${qs}`, { method: "POST", body: file });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Analysis failed (${res.status})`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="mb-14" data-testid="rfp-analyzer">
      <div className="mb-7 flex items-baseline justify-between">
        <Eyebrow className="text-white/65">RFP / RFI analysis</Eyebrow>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
          Live AG data + approved proof library
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Upload */}
        <Pane className="p-7">
          <Eyebrow tone="teal" className="mb-4">
            Upload draft response
          </Eyebrow>
          <p className="mb-5 text-[13px] leading-relaxed text-white/50">
            Upload a draft RFP/RFI response (.docx or .txt). It's reviewed against live market
            intelligence and your approved, externally-safe proof points only — restricted
            evidence is never suggested for external use, and nothing is invented that isn't in
            the document or in real data.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            data-testid="button-upload-rfp"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#a88945] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0c1a15] transition hover:bg-[#d5b46b] disabled:cursor-wait disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {uploading ? "Analyzing…" : "Upload & analyze"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".docx,.txt"
            className="hidden"
            data-testid="input-rfp-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleAnalyze(f);
            }}
          />

          {error && (
            <div className="mt-4 rounded-lg border border-[#e89797]/40 bg-[#e89797]/[0.08] px-3.5 py-2.5 text-[12.5px] text-[#e89797]" data-testid="rfp-error">
              {error}
            </div>
          )}

          <HairLine className="my-5" />
          <div className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/60">
            What it draws on
          </div>
          <ul className="mt-2.5 space-y-1.5 text-[12px] leading-relaxed text-white/50">
            <li>· Live AnalystGenius market intelligence, when available</li>
            <li>· {SELL_PROOF.filter((p) => p.status === "safe").length} approved, externally-safe proof points</li>
            <li>· {CLAIMS_TO_AVOID.length} claims flagged to avoid</li>
          </ul>
        </Pane>

        {/* Results */}
        <Pane glow="gold" className="p-7">
          {!result && !uploading && (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center">
              <Sparkles className="h-6 w-6 text-white/15" />
              <p className="text-[13px] font-medium text-white/50">No document analyzed yet</p>
              <p className="text-[11.5px] text-white/50">Upload a draft to see suggestions here.</p>
            </div>
          )}

          {uploading && (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#d5b46b]" />
              <p className="text-[13px] font-medium text-white/55">Reading {filename} and reviewing…</p>
            </div>
          )}

          {result && (
            <div data-testid="rfp-results">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Eyebrow tone="gold">Analysis · {filename}</Eyebrow>
                {result.usedLiveData ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#a5d8ab]/30 bg-[#a5d8ab]/[0.08] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#a5d8ab]">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Live market data used
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#d5b46b]/30 bg-[#d5b46b]/[0.08] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#e5c989]">
                    <AlertTriangle className="h-2.5 w-2.5" /> No live data ({result.liveDataReason})
                  </span>
                )}
                {result.truncated && (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.14em] text-white/60">
                    document truncated for length
                  </span>
                )}
              </div>

              <p className="text-[13px] leading-relaxed text-white/70">{result.documentSummary}</p>

              {result.strengthsFound.length > 0 && (
                <>
                  <div className="mt-5 mb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#a5d8ab]">
                    Already working
                  </div>
                  <ul className="space-y-1.5">
                    {result.strengthsFound.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-white/60">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#a5d8ab]" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <HairLine className="my-5" />

              <div className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/60">
                Suggested improvements ({result.suggestions.length})
              </div>
              <ul className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-[#3d8f6d]/[0.14] bg-[#1a5540]/[0.16] p-4"
                    data-testid={`rfp-suggestion-${i}`}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em]", CATEGORY_TONE[s.category])}>
                        {CATEGORY_LABEL[s.category]}
                      </span>
                      <span className="text-[13.5px] font-semibold leading-snug text-[#e7e3d8]">{s.title}</span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-white/60">{s.detail}</p>
                    <div className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-white/70">
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#d5b46b]" />
                      <span><span className="text-white/60">Suggested — </span>{s.suggestedAction}</span>
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
                      {s.groundedIn ? `Grounded in: ${s.groundedIn}` : "General note — not tied to a specific data point"}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Pane>
      </div>
    </section>
  );
}
