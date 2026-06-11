import { Link } from "wouter";
import { ArrowRight, FileText, Gauge, Moon, ShieldCheck, Sun } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAppTheme } from "@/lib/theme";
import heroImage from "@/assets/ar-superhero-radiolarian-hero.png";

const pillars = ["Discover", "Analyse", "Influence", "Decide"];

export default function Landing() {
  const { isDark: dark, toggleTheme } = useAppTheme();

  return (
    <main className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${dark ? "bg-[#030812] text-white" : "bg-[#f4f1ea] text-[#061529]"}`}>
      <div className={`absolute inset-0 transition-colors duration-500 ${dark ? "bg-[#030812]" : "bg-[#f4f1ea]"}`} />
      <div
        className={`absolute inset-0 bg-cover bg-center transition duration-500 ${dark ? "opacity-[0.58] saturate-[1.18] contrast-[1.1]" : "opacity-[0.94]"}`}
        style={{ backgroundImage: `url(${heroImage})` }}
        aria-hidden="true"
      />
      {dark ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(7,18,34,0.10)_0%,rgba(3,8,18,0.26)_38%,rgba(3,8,18,0.74)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#030812]/90 via-[#030812]/46 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#020611] via-[#020611]/88 to-transparent" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(246,241,228,0.25)_0%,rgba(246,241,228,0.12)_34%,rgba(7,18,34,0.06)_62%,rgba(7,18,34,0.36)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f7f3e9]/88 via-[#f7f3e9]/44 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#06101e] via-[#06101e]/82 to-transparent" />
        </>
      )}

      <header className="relative z-20 flex items-center justify-between px-5 md:px-8 py-5">
        <div className="flex items-center gap-2.5" data-testid="landing-brand">
          <Logo size={26} className={dark ? "text-white" : "text-[#0b243a]"} />
          <span className={`text-[15px] font-semibold tracking-tight ${dark ? "text-white" : "text-[#061529]"}`}>
            Analyst<span className="text-[#a88945]">Genius</span>
          </span>
        </div>
        <button
          type="button"
          data-testid="button-theme-toggle"
          onClick={toggleTheme}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] shadow-sm backdrop-blur transition ${
            dark
              ? "border-white/16 bg-white/8 text-white/76 hover:bg-white/12"
              : "border-[#061529]/10 bg-white/52 text-[#061529]/70 hover:bg-white/70"
          }`}
        >
          {dark ? <Sun className="h-3.5 w-3.5 text-[#d5b46b]" /> : <Moon className="h-3.5 w-3.5 text-[#a88945]" />}
          <span>{dark ? "Dark" : "Light"}</span>
        </button>
      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-76px)] items-center justify-center px-5 pb-10">
        <div className="relative w-full max-w-6xl">
          <div className="relative mx-auto flex min-h-[610px] max-w-4xl flex-col items-center justify-center text-center max-sm:min-h-[560px]">
            <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] shadow-sm backdrop-blur-md ${
              dark
                ? "border-white/12 bg-[#071426]/62 text-[#e9d39c]"
                : "border-[#a88945]/25 bg-white/62 text-[#5e4b21]"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00a7b7]" />
              AR INTELLIGENCE LAYER
            </div>

            <h1 className={`flex max-w-3xl flex-wrap items-baseline gap-x-[0.28em] text-[54px] font-semibold leading-[0.96] tracking-normal drop-shadow-[0_2px_22px_rgba(255,255,255,0.48)] md:text-[84px] lg:text-[104px] ${
              dark ? "text-white" : "text-[#061529]"
            }`}>
              <span className="inline-block">AR</span>
              <span className="inline-block">Super</span>
              <span className="inline-block text-[#a88945]">Hero</span>
            </h1>
            <div className="mt-5 h-px w-16 bg-[#a88945]/70" />

            <div className={`mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[15px] font-medium drop-shadow-[0_1px_10px_rgba(255,255,255,0.45)] md:text-[17px] ${
              dark ? "text-white/86" : "text-[#061529]/90"
            }`}>
              {pillars.map((pillar, index) => (
                <div key={pillar} className="flex items-center gap-5">
                  <span>{pillar}</span>
                  {index < pillars.length - 1 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#a88945]" />
                  )}
                </div>
              ))}
            </div>

            <p className={`mt-8 max-w-xl rounded-2xl border px-5 py-3 text-[16px] font-medium leading-relaxed shadow-sm backdrop-blur-[2px] md:text-[18px] ${
              dark
                ? "border-white/12 bg-[#071426]/42 text-[#f0dca8]"
                : "border-white/24 bg-white/20 text-[#765f29]"
            }`}>
              Evidence-ready AR intelligence for briefings, assessments, and leadership action.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/mission"
                data-testid="link-enter-intelligence"
                className="group inline-flex h-12 min-w-[230px] items-center justify-center gap-3 rounded-full border border-[#f0dca8]/70 bg-[#06101e] px-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_20px_48px_rgba(6,18,35,0.36)] transition hover:bg-[#0c2038]"
              >
                Enter intelligence
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/direct"
                data-testid="link-view-executive-brief"
                className="inline-flex h-12 min-w-[230px] items-center justify-center gap-3 rounded-full border border-[#061529]/12 bg-white/56 px-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#071426] shadow-sm backdrop-blur-md transition hover:bg-white/76"
              >
                View leader brief
                <FileText className="h-4 w-4" />
              </Link>
            </div>

            <div className={`mt-8 flex flex-wrap items-center justify-center gap-3 rounded-full border px-4 py-2 text-[11.5px] font-medium backdrop-blur-md ${
              dark ? "border-white/10 bg-[#071426]/72 text-white/78" : "border-white/36 bg-white/62 text-[#061529]/76"
            }`}>
              <span>UK English</span>
              <span>·</span>
              <span>Source-traced AI</span>
              <span>·</span>
              <span>No outcome prediction</span>
              <span>·</span>
              <span>Reduced-motion respected</span>
            </div>
          </div>

          <div className="relative mx-auto -mt-8 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
            <LandingStat
              icon={<Gauge className="h-4 w-4" />}
              label="Readiness models"
              value="6"
              detail="MQ, Wave, MarketScape, PEAK, Horizons, NEAT"
            />
            <LandingStat
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Evidence governance"
              value="5"
              detail="Internal, NDA, no-NDA, RFI, marketing controls"
            />
            <LandingStat
              icon={<FileText className="h-4 w-4" />}
              label="Leader lenses"
              value="5"
              detail="Strategy, Executive, Product, Marketing, Commercial"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function LandingStat({
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
    <div className="rounded-2xl border border-white/12 bg-[#06101e]/72 p-4 text-left text-white shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur" data-testid={`landing-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#00a7b7]/25 bg-[#00a7b7]/10 text-[#63d7de]">
          {icon}
        </span>
        <span className="font-mono text-[24px] text-[#d5b46b]">{value}</span>
      </div>
      <div className="text-[12px] font-semibold uppercase tracking-[0.13em] text-white/72">{label}</div>
      <div className="mt-1.5 text-[12.5px] leading-relaxed text-white/56">{detail}</div>
    </div>
  );
}
