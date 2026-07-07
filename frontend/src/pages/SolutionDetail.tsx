import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { WaitlistForm } from "../components/WaitlistForm";
import { fetchContentItems } from "../api/endpoints";
import type { SolutionCapability, WaitlistProduct } from "../api/types";
import { RadarSweepBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";

const CARD_TINTS = ["emerald", "cyan", "violet", "amber", "blue"] as const;

export default function SolutionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: solutions, isLoading } = useQuery({
    queryKey: ["content", "solutions", "solutions"],
    queryFn: () => fetchContentItems("solutions", "solutions"),
  });
  const solution = solutions?.find((s) => s.itemKey === slug);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-white/50">Loading…</div>;
  }

  if (!solution) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <p className="text-xl font-medium">Solution Not Found</p>
          <Link to="/solutions" className="mt-4 inline-block text-sm text-white/70 hover:text-white">
            ← Back to Solutions
          </Link>
        </div>
      </div>
    );
  }

  const capabilities = Array.isArray(solution.metadata.capabilities) ? (solution.metadata.capabilities as SolutionCapability[]) : [];
  const liveCapabilities = capabilities.filter((c) => c.status === "live");
  const roadmapCapabilities = capabilities.filter((c) => c.status === "roadmap");
  const waitlistProduct = solution.metadata.waitlistProduct as WaitlistProduct | undefined;

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-4xl overflow-hidden rounded-3xl pb-16 pt-16">
          <RadarSweepBackground tint={solution.status === "live" ? "emerald" : "white"} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
          <div className="relative z-10">
            <Link to="/solutions" className="text-sm text-white/50 hover:text-white">
              ← Solutions
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-medium tracking-tight md:text-5xl">{solution.title}</h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  solution.status === "live" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/60"
                }`}
              >
                {solution.status === "live" ? "Live Today" : "On the Roadmap"}
              </span>
            </div>
            <p className="mt-3 text-lg text-white/60">{solution.subtitle}</p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70">{solution.body}</p>

            {solution.status === "roadmap" && waitlistProduct && (
              <div className="mt-8">
                <WaitlistForm product={waitlistProduct} />
              </div>
            )}
            {solution.status === "live" && (
              <Link
                to="/register"
                className="mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200"
              >
                Start Monitoring
              </Link>
            )}
          </div>
        </div>

        {liveCapabilities.length > 0 && (
          <div className="mx-auto mt-16 max-w-4xl">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Available Now</p>
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {liveCapabilities.map((cap, i) => (
                <SpotlightCard key={cap.title} tint={CARD_TINTS[i % CARD_TINTS.length]} delay={i * 0.05}>
                  <div className="p-6">
                    <h3 className="text-sm font-medium text-white">{cap.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">{cap.detail}</p>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        )}

        {roadmapCapabilities.length > 0 && (
          <div className="mx-auto mt-16 max-w-4xl">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">On the Roadmap</p>
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {roadmapCapabilities.map((cap, i) => (
                <SpotlightCard key={cap.title} tint="white" delay={i * 0.04} className="border-dashed bg-transparent">
                  <div className="p-6">
                    <h3 className="text-sm font-medium text-white/80">{cap.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/45">{cap.detail}</p>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}
