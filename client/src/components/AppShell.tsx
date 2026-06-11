import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Logo";
import {
  LayoutGrid,
  Users,
  Activity,
  ClipboardList,
  Library,
  Plug,
  GraduationCap,
  Search,
  Bell,
  ChevronRight,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "AR Superhero",
    items: [
      { href: "/command-centre", label: "Command Centre", icon: LayoutGrid },
      { href: "/workstreams", label: "Workstreams", icon: Activity, badge: "5" },
      { href: "/analysts", label: "Analyst Landscape", icon: Users, badge: "9" },
      { href: "/evidence", label: "Evidence Library", icon: Library },
      { href: "/leader-lens", label: "Leader Lens", icon: ClipboardList },
      { href: "/learning", label: "Learning Queue", icon: GraduationCap, badge: "4" },
      { href: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    group: "AnalystGenius platform",
    items: [
      { href: "/platform/pulse", label: "The Pulse", icon: Activity },
      { href: "/platform/financial", label: "Financial Snapshot", icon: LayoutGrid },
      { href: "/platform/competitive", label: "Competitive Intel", icon: Users },
      { href: "/platform/reputation", label: "Reputation Tracker", icon: Library },
    ],
  },
];

const WORKSPACE_TABS: NavItem[] = [
  { href: "/command-centre", label: "Command", icon: LayoutGrid },
  { href: "/workstreams", label: "Workstreams", icon: Activity, badge: "5" },
  { href: "/analysts", label: "Analysts", icon: Users, badge: "9" },
  { href: "/evidence", label: "Evidence", icon: Library },
  { href: "/leader-lens", label: "Leader Lens", icon: ClipboardList },
  { href: "/learning", label: "Learning", icon: GraduationCap, badge: "4" },
  { href: "/integrations", label: "Integrations", icon: Plug },
];

const PLATFORM_TABS: NavItem[] = [
  { href: "/platform/pulse", label: "The Pulse", icon: Activity },
  { href: "/platform/financial", label: "Financials", icon: LayoutGrid },
  { href: "/platform/competitive", label: "Competitive", icon: Users },
  { href: "/platform/reputation", label: "Reputation", icon: Library },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[244px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-5 pt-5 pb-4 border-b border-sidebar-border">
          <Wordmark />
        </div>

        <div className="px-3 py-2 border-b border-sidebar-border">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground px-2 mt-2 mb-1">
            User organisation
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[13px] font-medium text-sidebar-foreground">
              Northstar Digital Services
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((group) => (
            <div key={group.group} className="mb-4 px-3">
              <div className="px-2 mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {group.group}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/command-centre"
                      ? location === "/command-centre"
                      : location === item.href || location.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] hover-elevate",
                          active
                            ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                            : "text-sidebar-foreground/85"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-medium tabular text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-md p-2 hover-elevate">
            <div className="h-7 w-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[11px] font-semibold text-accent">
              MO
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-medium text-sidebar-foreground truncate">
                Mireille Okonkwo
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                AR Director · Northstar
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 backdrop-blur bg-background/85 border-b border-border">
          <div className="flex items-center justify-between px-5 lg:px-8 h-14">
            <div className="flex items-center gap-2 min-w-0">
              <Breadcrumb location={location} />
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="relative hidden md:block">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search analysts, evidence, workstreams…"
                  data-testid="input-search"
                  className="h-8 w-[280px] lg:w-[340px] rounded-md border border-border bg-card/70 pl-8 pr-2.5 text-[12.5px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                />
              </div>
              <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Live sync
              </span>
              <button
                type="button"
                className="relative h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-card/50 hover-elevate"
                data-testid="button-notifications"
                aria-label="Notifications"
              >
                <Bell className="h-3.5 w-3.5" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-accent" />
              </button>
            </div>
          </div>
          <WorkspaceTabs location={location} />
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function WorkspaceTabs({ location }: { location: string }) {
  return (
    <div className="max-w-full overflow-hidden border-t border-border/70 bg-background/72">
      <div className="max-w-full px-4 lg:px-8">
        <div className="flex max-w-full items-center gap-3 overflow-x-auto py-2.5">
          <TabGroup label="AR Superhero" tabs={WORKSPACE_TABS} location={location} />
          <div className="h-6 w-px shrink-0 bg-border" />
          <TabGroup label="AnalystGenius" tabs={PLATFORM_TABS} location={location} compact />
        </div>
      </div>
    </div>
  );
}

function TabGroup({
  label,
  tabs,
  location,
  compact = false,
}: {
  label: string;
  tabs: NavItem[];
  location: string;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-max items-center gap-1.5">
      <span className="mr-1 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground xl:inline">
        {label}
      </span>
      {tabs.map((tab) => {
        const active =
          tab.href === "/command-centre"
            ? location === "/command-centre"
            : location === tab.href || location.startsWith(tab.href + "/");
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            data-testid={`tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition hover-elevate",
              active
                ? "border-primary/35 bg-primary/12 text-primary glow-primary"
                : "border-border/70 bg-card/35 text-muted-foreground hover:text-foreground",
              compact && "px-2.5"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular",
                  active ? "bg-primary/18 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function Breadcrumb({ location }: { location: string }) {
  const map: Record<string, string> = {
    "/command-centre": "Command Centre",
    "/workstreams": "Workstreams",
    "/analysts": "Analyst Landscape",
    "/evidence": "Evidence Library",
    "/leader-lens": "Leader Lens",
    "/learning": "Learning Queue",
    "/integrations": "Integrations",
  };
  const label = map[location] || "Command Centre";
  return (
    <div className="flex items-center gap-1.5 text-[12.5px]">
      <span className="text-muted-foreground">AR Superhero</span>
      <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
      <span className="font-medium text-foreground">{label}</span>
    </div>
  );
}
