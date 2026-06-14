import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/lib/theme";
import { Logo } from "./Logo";
import { ArrowLeft, Moon, Sun } from "lucide-react";

const MODES = [
  { href: "/mission", label: "Mission Control", glyph: "0" },
  { href: "/succeed", label: "Succeed", glyph: "I" },
  { href: "/direct", label: "Direct", glyph: "II" },
  { href: "/enable", label: "Enable", glyph: "III" },
];

export function MissionShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isDark, toggleTheme } = useAppTheme();
  const lightMode = !isDark;

  return (
    <div
      className={cn(
        "relative min-h-screen text-[#e7e3d8] transition-colors duration-500",
        lightMode ? "bg-[#f4f1ea] mission-light" : "bg-[#06090f]"
      )}
    >
      {/* Cinematic backdrop — slow gradient + grain */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {lightMode ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(168,137,69,0.15)_0%,transparent_42%),radial-gradient(circle_at_82%_-5%,rgba(0,167,183,0.10)_0%,transparent_46%),linear-gradient(180deg,#f7f3e9_0%,#ebe5d8_100%)]" />
            <div className="absolute inset-0 opacity-[0.42] [background-image:linear-gradient(rgba(6,21,41,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,21,41,0.05)_1px,transparent_1px)] [background-size:88px_88px]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(168,137,69,0.10)_0%,transparent_42%),radial-gradient(circle_at_82%_-5%,rgba(0,167,183,0.08)_0%,transparent_46%),radial-gradient(circle_at_50%_120%,rgba(168,137,69,0.05)_0%,transparent_50%)]" />
            <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(168,137,69,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(168,137,69,0.06)_1px,transparent_1px)] [background-size:88px_88px]" />
          </>
        )}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a88945]/30 to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top brand bar */}
        <header
          className={cn(
            "border-b backdrop-blur-xl transition-colors duration-500",
            lightMode ? "border-[#061529]/10 bg-[#f7f3e9]/74" : "border-white/[0.06] bg-[#06090f]/72"
          )}
        >
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
            <Link
              href="/"
              data-testid="link-home"
              className="group flex items-center gap-2.5"
            >
              <Logo
                size={22}
                className={cn(
                  "transition group-hover:text-[#a88945]",
                  lightMode ? "text-[#061529]" : "text-[#e7e3d8]"
                )}
              />
              <span
                className={cn(
                  "text-[14px] font-semibold tracking-tight",
                  lightMode ? "text-[#061529]" : "text-[#e7e3d8]"
                )}
              >
                Analyst<span className="text-[#a88945]">Genius</span>
              </span>
              <span
                className={cn(
                  "ml-2 hidden text-[10px] font-medium uppercase tracking-[0.22em] md:inline",
                  lightMode ? "text-[#061529]/45" : "text-white/40"
                )}
              >
                AR Superhero
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                data-testid="link-admin"
                className={cn(
                  "hidden text-[11px] uppercase tracking-[0.16em] transition md:inline",
                  lightMode ? "text-[#061529]/45 hover:text-[#061529]/75" : "text-white/40 hover:text-white/70"
                )}
              >
                Admin
              </Link>
              <button
                type="button"
                data-testid="button-app-theme-toggle"
                onClick={toggleTheme}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition",
                  lightMode
                    ? "border-[#061529]/12 bg-white/45 text-[#061529]/70 hover:bg-white/70"
                    : "border-white/12 bg-white/[0.03] text-white/65 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                {lightMode ? <Sun className="h-3 w-3 text-[#a88945]" /> : <Moon className="h-3 w-3 text-[#d5b46b]" />}
                {lightMode ? "Light" : "Dark"}
              </button>
              <Link
                href="/"
                data-testid="link-exit"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition",
                  lightMode
                    ? "border-[#061529]/12 bg-white/45 text-[#061529]/70 hover:bg-white/70"
                    : "border-white/12 bg-white/[0.03] text-white/65 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <ArrowLeft className="h-3 w-3" />
                Exit
              </Link>
            </div>
          </div>

          {/* Mode rail */}
          <div className="mx-auto w-full max-w-[1440px] px-4 lg:px-10">
            <nav className="flex items-center gap-1 overflow-x-auto pb-3 pt-1">
              {MODES.map((mode) => {
                const active =
                  mode.href === "/mission"
                    ? location === "/mission"
                    : location === mode.href || location.startsWith(mode.href + "/");
                return (
                  <Link
                    key={mode.href}
                    href={mode.href}
                    data-testid={`mode-${mode.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={cn(
                      "group relative inline-flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2 text-[12.5px] font-medium tracking-wide transition",
                      active && !lightMode
                        ? "border-[#a88945]/40 bg-[#a88945]/[0.08] text-[#f0dca8] shadow-[0_0_28px_-12px_rgba(168,137,69,0.6)]"
                        : active && lightMode
                        ? "border-[#a88945]/45 bg-[#a88945]/[0.12] text-[#6f5821] shadow-[0_0_28px_-18px_rgba(168,137,69,0.7)]"
                        : lightMode
                        ? "border-[#061529]/18 bg-white/50 text-[#061529]/75 hover:border-[#061529]/28 hover:bg-white/70 hover:text-[#061529]/95"
                        : "border-white/12 bg-white/[0.04] text-white/65 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/90"
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[10px] tracking-[0.2em]",
                        active ? "text-[#a88945]" : lightMode ? "text-[#061529]/32" : "text-white/35"
                      )}
                    >
                      {mode.glyph}
                    </span>
                    <span>{mode.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <main className={cn("flex-1", lightMode && "mission-light-content")}>{children}</main>

        <footer
          className={cn(
            "border-t backdrop-blur transition-colors duration-500",
            lightMode ? "border-[#061529]/10 bg-[#f7f3e9]/78" : "border-white/[0.05] bg-[#06090f]/80"
          )}
        >
          <div
            className={cn(
              "mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[10.5px] uppercase tracking-[0.18em] lg:px-10",
              lightMode ? "text-[#061529]/42" : "text-white/35"
            )}
          >
            <span>AnalystGenius · Intelligence layer</span>
            <span className="flex items-center gap-3">
              <span>Demo customer: Northstar Digital Services</span>
              <span className={cn("h-1 w-1 rounded-full", lightMode ? "bg-[#061529]/18" : "bg-white/20")} />
              <span>Source-traced · UK English</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
