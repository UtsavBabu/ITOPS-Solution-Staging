import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { WaitlistForm } from "../components/WaitlistForm";
import { fetchContentItems } from "../api/endpoints";
import type { SolutionCapability, WaitlistProduct } from "../api/types";
import { RadarSweepBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";
import { ProductIcon } from "../components/ProductIcon";
import { TechChipByName } from "../components/ProductVisuals";

const CARD_TINTS = ["emerald", "cyan", "violet", "amber", "blue"] as const;

interface WorkflowStep {
  title: string;
  detail: string;
}

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
  const whoFor = Array.isArray(solution.metadata.whoFor) ? (solution.metadata.whoFor as string[]) : [];
  const workflow = Array.isArray(solution.metadata.workflow) ? (solution.metadata.workflow as WorkflowStep[]) : [];
  const tech = Array.isArray(solution.metadata.tech) ? (solution.metadata.tech as string[]) : [];
  const related = (solutions ?? []).filter((s) => s.itemKey !== slug).slice(0, 3);

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

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <ProductIcon itemKey={solution.itemKey} size={52} />
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

        {whoFor.length > 0 && (
          <div className="mx-auto mt-16 max-w-4xl">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Who It's For</p>
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {whoFor.map((who, i) => (
                <Reveal key={who} delay={i * 0.06}>
                  <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
                    <span className="mt-0.5 text-emerald-300" aria-hidden>
                      <svg className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </span>
                    <p className="text-sm leading-relaxed text-white/70">{who}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {workflow.length > 0 && (
          <div className="mx-auto mt-16 max-w-4xl">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">How It Works</p>
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {workflow.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.1}>
                  <div className="relative h-full rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
                    <span className="grid h-8 w-8 place-items-center rounded-full text-sm font-semibold text-black [background:var(--grad-brand)]">
                      {i + 1}
                    </span>
                    <h3 className="mt-3 text-sm font-medium text-white">{step.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/55">{step.detail}</p>
                    {i < workflow.length - 1 && (
                      <span aria-hidden className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-white/25 lg:block">
                        →
                      </span>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {tech.length > 0 && (
          <div className="mx-auto mt-16 max-w-4xl">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Works Across Your Stack</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {tech.map((name) => (
                  <TechChipByName key={name} name={name} />
                ))}
              </div>
            </Reveal>
          </div>
        )}

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
        {related.length > 0 && (
          <div className="mx-auto mt-20 max-w-4xl border-t border-white/10 pt-12">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">More From ITOps Solution</p>
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r.id} delay={i * 0.07}>
                  <Link
                    to={`/solutions/${r.itemKey}`}
                    className="group flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-neutral-900/50 p-5 transition-colors hover:border-white/25"
                  >
                    <div className="flex items-center gap-3">
                      <ProductIcon itemKey={r.itemKey} size={36} />
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          r.status === "live" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/55"
                        }`}
                      >
                        {r.status === "live" ? "Live" : "Roadmap"}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">{r.title}</p>
                    <p className="line-clamp-2 text-xs leading-relaxed text-white/50">{r.subtitle}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs text-white/60 transition-all group-hover:gap-2 group-hover:text-white">
                      View <span aria-hidden>→</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}
