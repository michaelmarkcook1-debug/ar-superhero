import { Link } from "wouter";
import { Settings, Database, Plug, Users, Library, ClipboardList, GraduationCap, Activity } from "lucide-react";
import { Pane, Eyebrow, SectionTitle, Glyph } from "@/components/cockpit/atoms";

const ADMIN_LINKS = [
  {
    href: "/admin/command-centre",
    label: "Command Centre (legacy)",
    icon: Activity,
    detail: "Original operational command view. Retained for AR teams during transition.",
  },
  {
    href: "/admin/workstreams",
    label: "Workstreams",
    icon: ClipboardList,
    detail: "Per-workstream task and status tracking — moved behind Succeed in the main UX.",
  },
  {
    href: "/admin/analysts",
    label: "Analyst landscape",
    icon: Users,
    detail: "Internal analyst register. Visible inside Succeed only where tied to active moments.",
  },
  {
    href: "/admin/evidence",
    label: "Evidence library",
    icon: Library,
    detail: "Underlying evidence store powering proof items shown in Succeed and Enable.",
  },
  {
    href: "/admin/leader-lens",
    label: "Leader Lens (legacy)",
    icon: ClipboardList,
    detail: "Original leadership briefing view — superseded by Direct.",
  },
  {
    href: "/admin/learning",
    label: "Learning queue",
    icon: GraduationCap,
    detail: "Pattern review backlog. Feeds the Outcome learning section in Succeed.",
  },
  {
    href: "/admin/integrations",
    label: "Integrations",
    icon: Plug,
    detail: "Connector configurations and sync state. Hidden from the main UX by design.",
  },
];

export default function Admin() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-10 lg:px-10 lg:py-14">
      <section className="mb-12">
        <Eyebrow className="mb-3">
          <span className="inline-flex items-center gap-2">
            <Glyph>Admin</Glyph>
            <span className="text-white/50">·</span>
            <span>Settings</span>
          </span>
        </Eyebrow>
        <h1 className="text-[40px] font-semibold leading-[0.98] tracking-[-0.03em] text-[#f4eed8] md:text-[48px]">
          Behind the cockpit.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/55">
          The operational machinery — workstreams, evidence store, integrations,
          and the legacy operational views — lives here. The main experience
          stays focused on Succeed, Direct, and Enable; this page is for AR
          admins, not daily use.
        </p>
      </section>

      <section className="mb-12">
        <SectionTitle eyebrow="Operational views" title="Legacy &amp; admin destinations" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ADMIN_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`admin-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 transition hover:border-white/[0.14] hover:bg-white/[0.03]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-white/55 transition group-hover:text-[#d5b46b]">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold tracking-tight text-[#e7e3d8]">
                    {item.label}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">
                    {item.detail}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Configuration" title="System &amp; data" />
        <Pane className="p-7">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ConfigBlock
              icon={<Database className="h-4 w-4" />}
              label="Data sources"
              value="11 connected"
              detail="AnalystGenius intelligence layer + internal sources. External signals labelled where shown."
            />
            <ConfigBlock
              icon={<Settings className="h-4 w-4" />}
              label="Environment"
              value="Production"
              detail="Demo mode active. Demo customer: Northstar Digital Services."
            />
            <ConfigBlock
              icon={<Users className="h-4 w-4" />}
              label="Seat owners"
              value="6 AR seats"
              detail="Mireille Okonkwo (AR Director) + 5 analysts."
            />
          </div>
        </Pane>
      </section>
    </div>
  );
}

function ConfigBlock({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5 text-white/55">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-[#d5b46b]">
          {icon}
        </span>
        <Eyebrow>{label}</Eyebrow>
      </div>
      <div className="font-mono text-[20px] font-medium leading-none text-[#f0dca8] tabular-nums">
        {value}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-white/45">{detail}</p>
    </div>
  );
}
