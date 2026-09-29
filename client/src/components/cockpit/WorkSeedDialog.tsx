import { useEffect, useState } from "react";
import { Check, Copy, FileDown, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eyebrow, HairLine, Glyph } from "@/components/cockpit/atoms";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// Start work on this — the WorkEngine hand-off.
//
// SuperHero assembles the goal, the sources with their provenance, and the
// capabilities a playbook may name; the person takes the prompt into Claude
// with the WorkEngine skill. Nothing is sent anywhere from here: the prompt is
// copied and the request envelope downloaded, so the person's own WorkEngine
// sign-in carries the work. Every figure shown is real and traces to a source.
// ============================================================================

export type SeedRequest =
  | { kind: "analyst-briefing"; vendorId: string; analystKey: string }
  | { kind: "scenario"; vendorId: string; personaId: string; scenarioId: string; houseId?: string }
  | { kind: "evaluation"; vendorId: string; firm: string; reportName: string };

type SeedSource = {
  source_ref: string;
  role: string;
  permitted_use: string;
  currency_state: string;
  read_state: string;
  user_endorsement: string;
  note: string;
};

type WorkSeed = {
  kind: string;
  title: string;
  goal: string;
  request: { request_id: string; goal: string; mode: string; attachment_ids: string[] };
  sources: SeedSource[];
  context: string[];
  caveats: string[];
  capabilities: { kind: string; name: string; description: string; when: string }[];
  handoff_prompt: string;
  generated_at: string;
};

export default function WorkSeedDialog({ request, onClose }: { request: SeedRequest | null; onClose: () => void }) {
  const [seed, setSeed] = useState<WorkSeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSeed(null);
    setError(null);
    setCopied(false);
    if (!request) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("POST", "/api/workengine/seed", request);
        const body = (await res.json()) as WorkSeed;
        if (!cancelled) setSeed(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not build the work seed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request]);

  async function copyPrompt() {
    if (!seed) return;
    try {
      await navigator.clipboard.writeText(seed.handoff_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Copy failed — select the prompt text and copy it by hand.");
    }
  }

  function downloadRequest() {
    if (!seed) return;
    const blob = new Blob([JSON.stringify(seed.request, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "request.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl border-[#3d8f6d]/24 bg-[#0c1a15] text-[#e7e3d8]" data-testid="work-seed-dialog">
        <DialogHeader>
          <Glyph className="mb-1">Start work on this · WorkEngine hand-off</Glyph>
          <DialogTitle className="text-[18px] font-semibold leading-snug text-[#f4eed8]">
            {seed?.title ?? (error ? "Could not build this seed" : "Assembling the seed…")}
          </DialogTitle>
        </DialogHeader>

        {error && <p className="text-[13px] text-[#e89797]">{error}</p>}

        {seed && (
          <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
            <div>
              <Eyebrow className="mb-1.5 text-white/60">Goal</Eyebrow>
              <p className="text-[13.5px] leading-relaxed text-white/85">{seed.goal}</p>
            </div>

            {seed.context.length > 0 && (
              <div>
                <Eyebrow className="mb-1.5 text-white/60">Context from AR SuperHero</Eyebrow>
                <ul className="space-y-1 text-[12.5px] leading-relaxed text-white/75">
                  {seed.context.map((c, i) => (
                    <li key={i} className="border-l-2 border-[#3d8f6d]/[0.28] pl-3">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <Eyebrow className="mb-1.5 text-white/60">
                Sources · {seed.sources.length} · provenance as WorkEngine records it
              </Eyebrow>
              <ul className="space-y-2">
                {seed.sources.map((s, i) => (
                  <li key={i} className="rounded-lg border border-[#3d8f6d]/[0.14] bg-[#1a5540]/[0.12] px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.source_ref.startsWith("http") ? (
                        <a
                          href={s.source_ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1 truncate text-[11.5px] font-medium text-[#d5b46b] hover:text-[#f0dca8]"
                        >
                          <span className="truncate">{s.source_ref}</span> <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="truncate font-mono text-[11px] text-[#63d7de]">{s.source_ref}</span>
                      )}
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/55">
                        {s.role} · {s.permitted_use} · {s.currency_state} · {s.read_state}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/70">{s.note}</p>
                  </li>
                ))}
              </ul>
            </div>

            {seed.caveats.length > 0 && (
              <div className="rounded-lg border border-[#a88945]/35 bg-[#a88945]/[0.08] px-3 py-2.5">
                <Eyebrow tone="gold" className="mb-1">
                  Caveats
                </Eyebrow>
                <ul className="space-y-1 text-[12.5px] leading-relaxed text-[#f0dca8]">
                  {seed.caveats.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <Eyebrow className="mb-1.5 text-white/60">AR SuperHero capabilities a playbook may name</Eyebrow>
              <ul className="space-y-1 text-[12px] text-white/70">
                {seed.capabilities.map((c) => (
                  <li key={c.name}>
                    <span className="font-mono text-[11px] text-[#63d7de]">{c.name}</span> — {c.description}
                  </li>
                ))}
              </ul>
            </div>

            <HairLine />

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <Eyebrow className="text-white/60">Hand-off prompt · paste into Claude with the WorkEngine skill</Eyebrow>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyPrompt}
                    data-testid="work-seed-copy"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#a88945]/50 bg-[#a88945]/[0.14] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f0dca8] transition hover:bg-[#a88945]/[0.22]"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy prompt"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadRequest}
                    data-testid="work-seed-download"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-[#1a5540]/[0.18] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:border-[#d5b46b]/45 hover:text-[#f0dca8]"
                  >
                    <FileDown className="h-3.5 w-3.5" /> request.json
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={seed.handoff_prompt}
                data-testid="work-seed-prompt"
                rows={10}
                className="w-full resize-y rounded-lg border border-[#3d8f6d]/[0.2] bg-[#081410] p-3 font-mono text-[11.5px] leading-relaxed text-white/80 outline-none focus:border-[#d5b46b]/50"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">
                Nothing is sent from here. Your own WorkEngine sign-in carries the work; the goal and sources arrive exactly as
                shown, so nothing is retyped and nothing is invented.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
