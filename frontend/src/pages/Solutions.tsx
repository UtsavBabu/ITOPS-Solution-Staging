import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { fetchContentItems } from "../api/endpoints";
import { NetworkPulseBackground } from "../components/PageBackgrounds";
import { SpotlightCard } from "../components/Animated";

const CARD_TINTS = ["emerald", "cyan", "violet", "amber"] as const;

export default function Solutions() {
  const { data: solutions } = useQuery({
    queryKey: ["content", "solutions", "solutions"],
    queryFn: () => fetchContentItems("solutions", "solutions"),
  });

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-5xl overflow-hidden rounded-3xl pb-16 pt-16 text-center">
          <NetworkPulseBackground tint="blue" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Solutions</p>
            <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">
              A Solution for Every Layer of Your Stack
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60">
              Two solutions are live and monitoring real infrastructure today. Two more are on our public roadmap — we're showing you exactly what's planned, not pretending it already exists.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          {solutions?.map((solution, i) => (
            <Link key={solution.id} to={`/solutions/${solution.itemKey}`} className="block h-full">
              <SpotlightCard tint={CARD_TINTS[i % CARD_TINTS.length]} delay={i * 0.07} className="h-full">
                <div className="p-8">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-medium tracking-tight">{solution.title}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        solution.status === "live" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/60"
                      }`}
                    >
                      {solution.status === "live" ? "Live" : "Roadmap"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/50">{solution.subtitle}</p>
                  <p className="mt-4 text-sm leading-relaxed text-white/55">{solution.body}</p>
                  <p className="mt-6 inline-flex items-center gap-1 text-sm text-white/70 transition-all group-hover:gap-2 group-hover:text-white">
                    Learn more <span aria-hidden>→</span>
                  </p>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
