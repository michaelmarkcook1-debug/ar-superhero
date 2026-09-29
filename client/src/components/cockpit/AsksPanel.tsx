import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleSlash, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Pane, Eyebrow, HairLine } from "@/components/cockpit/atoms";
import { VENDOR_OPTIONS } from "@/lib/cockpit";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// Asks — what AR needs from a leader, with an owner, a due date and a status.
// Every ask is written by the AR person. Nothing is seeded or suggested, so
// this panel is honestly empty until the first one is entered, and "overdue"
// only ever refers to a date the person set.
// ============================================================================

export type AskStatus = "open" | "done" | "skipped" | "not_needed";

export type Ask = {
  id: string;
  vendor_id: string;
  persona_id: string;
  title: string;
  owner: string | null;
  due_date: string | null;
  status: AskStatus;
  note: string | null;
  created_at: number;
  updated_at: number;
};

const STATUS_LABEL: Record<AskStatus, string> = { open: "open", done: "done", skipped: "skipped", not_needed: "not needed" };

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysUntil(due: string | null): number | null {
  if (!due) return null;
  const [y, m, d] = due.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDue(due: string | null): string {
  if (!due) return "no date";
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function useAsks(vendorId: string, personaId?: string) {
  const qs = personaId ? `?vendorId=${encodeURIComponent(vendorId)}&personaId=${encodeURIComponent(personaId)}` : `?vendorId=${encodeURIComponent(vendorId)}`;
  return useQuery<Ask[]>({ queryKey: [`/api/asks${qs}`] });
}

export function DueBadge({ due, status }: { due: string | null; status: AskStatus }) {
  const days = daysUntil(due);
  if (status !== "open" || days === null) {
    return <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">{formatDue(due)}</span>;
  }
  if (days < 0) {
    return (
      <span className="rounded-full border border-[#a88945]/50 bg-[#a88945]/[0.12] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#e5c989]">
        overdue · {formatDue(due)}
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="rounded-full border border-[#a88945]/35 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#d5b46b]">
        {days === 0 ? "due today" : `due in ${days}d`}
      </span>
    );
  }
  return <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">due {formatDue(due)}</span>;
}

export default function AsksPanel({
  vendorId,
  personaId,
  personaLabel,
  stakeholder,
}: {
  vendorId: string;
  personaId: string;
  personaLabel: string;
  stakeholder: string;
}) {
  const queryClient = useQueryClient();
  const vendorLabel = VENDOR_OPTIONS.find((v) => v.id === vendorId)?.label ?? vendorId;
  const { data, isLoading, isError } = useAsks(vendorId, personaId);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/asks") });

  const create = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/asks", {
        vendor_id: vendorId,
        persona_id: personaId,
        title: title.trim(),
        owner: owner.trim() || null,
        due_date: due || null,
        note: note.trim() || null,
      }),
    onSuccess: () => {
      setTitle("");
      setOwner("");
      setDue("");
      setNote("");
      invalidate();
    },
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AskStatus }) => apiRequest("PATCH", `/api/asks/${id}`, { status }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/asks/${id}`),
    onSuccess: invalidate,
  });

  const asks = data ?? [];
  const open = asks.filter((a) => a.status === "open");
  const closed = asks.filter((a) => a.status !== "open");
  const overdue = open.filter((a) => (daysUntil(a.due_date) ?? 1) < 0).length;

  return (
    <section className="mb-14" data-testid="asks-panel">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Eyebrow className="text-white/65">Asks · {personaLabel}</Eyebrow>
          <p className="mt-1.5 text-[12.5px] text-white/55">
            What AR needs from {stakeholder} on {vendorLabel}, with an owner and a date. Written by you; nothing here is suggested.
          </p>
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
          {open.length} open{overdue > 0 ? ` · ${overdue} overdue` : ""}
          {closed.length > 0 ? ` · ${closed.length} closed` : ""}
        </div>
      </div>

      <Pane glow={overdue > 0 ? "gold" : "none"} className="p-6">
        {isLoading && <p className="text-[13px] text-white/55">Loading asks…</p>}
        {isError && <p className="text-[13px] text-[#e89797]">Could not load asks.</p>}

        {!isLoading && !isError && open.length === 0 && (
          <p className="text-[13px] text-white/60" data-testid="asks-empty">
            No open asks for {personaLabel} on {vendorLabel}. What AR needs from this leader becomes trackable the moment you write it down.
          </p>
        )}

        {open.length > 0 && (
          <ul className="space-y-2.5">
            {open.map((a) => (
              <li
                key={a.id}
                data-testid={`ask-${a.id}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#3d8f6d]/[0.14] bg-[#1a5540]/[0.14] px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium leading-snug text-[#e7e3d8]">{a.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                    <span>{a.owner ? `Owner: ${a.owner}` : "No owner named"}</span>
                    <DueBadge due={a.due_date} status={a.status} />
                  </div>
                  {a.note && <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">{a.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <AskAction label="Done" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setStatus.mutate({ id: a.id, status: "done" })} />
                  <AskAction label="Skipped" icon={<CircleSlash className="h-3.5 w-3.5" />} onClick={() => setStatus.mutate({ id: a.id, status: "skipped" })} />
                  <AskAction label="Not needed" icon={<Minus className="h-3.5 w-3.5" />} onClick={() => setStatus.mutate({ id: a.id, status: "not_needed" })} />
                  <AskAction label="Remove" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => remove.mutate(a.id)} muted />
                </div>
              </li>
            ))}
          </ul>
        )}

        <HairLine className="my-5" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) create.mutate();
          }}
          className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_150px_auto]"
          data-testid="ask-form"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`What do you need from ${stakeholder.split("·")[0].trim()}?`}
            data-testid="ask-title"
            className="rounded-full border border-white/[0.12] bg-[#090d14] px-4 py-2 text-[13px] text-[#f4eed8] outline-none placeholder:text-white/40 focus:border-[#d5b46b]"
          />
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Owner (name)"
            data-testid="ask-owner"
            className="rounded-full border border-white/[0.12] bg-[#090d14] px-4 py-2 text-[13px] text-[#f4eed8] outline-none placeholder:text-white/40 focus:border-[#d5b46b]"
          />
          <input
            type="date"
            value={due}
            min={todayIso()}
            onChange={(e) => setDue(e.target.value)}
            data-testid="ask-due"
            className="rounded-full border border-white/[0.12] bg-[#090d14] px-4 py-2 text-[13px] text-[#f4eed8] outline-none focus:border-[#d5b46b]"
          />
          <button
            type="submit"
            disabled={!title.trim() || create.isPending}
            data-testid="ask-add"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#a88945]/50 bg-[#a88945]/[0.14] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f0dca8] transition hover:bg-[#a88945]/[0.22] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add ask
          </button>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            data-testid="ask-note"
            className="rounded-full border border-white/[0.12] bg-[#090d14] px-4 py-2 text-[13px] text-[#f4eed8] outline-none placeholder:text-white/40 focus:border-[#d5b46b] md:col-span-4"
          />
        </form>
        {create.isError && <p className="mt-2 text-[12px] text-[#e89797]">{(create.error as Error).message}</p>}

        {closed.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowClosed((v) => !v)}
              className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/55 transition hover:text-[#f0dca8]"
            >
              {showClosed ? "Hide" : "Show"} {closed.length} closed
            </button>
            {showClosed && (
              <ul className="mt-2 space-y-1.5">
                {closed.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/55">
                    <span>
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/45">{STATUS_LABEL[a.status]}</span> · {a.title}
                      {a.owner ? ` · ${a.owner}` : ""}
                    </span>
                    <AskAction label="Reopen" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setStatus.mutate({ id: a.id, status: "open" })} muted />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Pane>
    </section>
  );
}

function AskAction({ label, icon, onClick, muted }: { label: string; icon: React.ReactNode; onClick: () => void; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
        muted
          ? "border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/70"
          : "border-[#3d8f6d]/30 text-white/60 hover:border-[#d5b46b]/50 hover:text-[#f0dca8]"
      }`}
    >
      {icon}
    </button>
  );
}
