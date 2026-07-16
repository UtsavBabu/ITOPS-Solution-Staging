import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { WaitlistForm } from "../components/WaitlistForm";
import { fetchContentItems } from "../api/endpoints";
import { ProductHero, ProductShell, WorkflowFlow, CapabilitiesSplit } from "../components/ProductLayout";
import { Reveal, SpotlightCard } from "../components/Animated";
import { ProductIcon } from "../components/ProductIcon";
import { TechChipByName } from "../components/ProductVisuals";
import { Skeleton } from "../components/Skeleton";
import { ErrorState } from "../components/EmptyState";
const CARD_TINTS = ["emerald", "cyan", "violet", "amber", "blue"];
export default function SolutionDetail() {
  const { slug } = useParams();
  const { data: solutions, isLoading, isError, refetch } = useQuery({
    queryKey: ["content", "solutions", "solutions"],
    queryFn: () => fetchContentItems("solutions", "solutions")
  });
  const solution = solutions?.find(s => s.itemKey === slug);
  if (isLoading) {
    return <div className="min-h-screen bg-black light:bg-slate-50 px-6 pb-24 pt-40 md:px-10">
        <div className="mx-auto max-w-[1680px] space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>;
  }
  if (isError) {
    return <div className="flex min-h-screen items-center justify-center bg-black light:bg-slate-50 px-6 text-center text-white light:text-slate-900">
        <ErrorState message="Couldn't load this solution." onRetry={() => refetch()} />
      </div>;
  }
  if (!solution) {
    return <div className="flex min-h-screen items-center justify-center bg-black light:bg-slate-50 px-6 text-center text-white light:text-slate-900">
        <div>
          <p className="text-xl font-medium">Solution Not Found</p>
          <Link to="/solutions" className="mt-4 inline-block text-sm text-white/70 light:text-slate-600 hover:text-white light:hover:text-slate-900">
            ← Back to Solutions
          </Link>
        </div>
      </div>;
  }
  const capabilities = Array.isArray(solution.metadata.capabilities) ? solution.metadata.capabilities : [];
  const liveCapabilities = capabilities.filter(c => c.status === "live");
  const roadmapCapabilities = capabilities.filter(c => c.status === "roadmap");
  const waitlistProduct = solution.metadata.waitlistProduct;
  const whoFor = Array.isArray(solution.metadata.whoFor) ? solution.metadata.whoFor : [];
  const workflow = Array.isArray(solution.metadata.workflow) ? solution.metadata.workflow : [];
  const tech = Array.isArray(solution.metadata.tech) ? solution.metadata.tech : [];
  const related = (solutions ?? []).filter(s => s.itemKey !== slug).slice(0, 3);
  return <div className="min-h-screen bg-black light:bg-gradient-to-b light:from-slate-50 light:to-white text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <MarketingNav />

      <main className="pb-24 pt-40">
        <ProductShell>
          <ProductHero itemKey={solution.itemKey} title={solution.title} subtitle={solution.subtitle} body={solution.body} status={solution.status} capabilities={capabilities} primaryCta={solution.status === "live" ? <Link to="/register" className="inline-block rounded-full bg-white px-7 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200">
                    Start Monitoring
                  </Link> : waitlistProduct ? <div className="w-full max-w-sm"><WaitlistForm product={waitlistProduct} ctaLabel="Join the Waitlist" /></div> : null} secondaryCta={capabilities.length > 0 ? <a href="#capabilities" className="text-sm font-medium text-white/70 light:text-slate-500 underline decoration-white/20 light:decoration-slate-900/20 underline-offset-4 hover:text-white light:hover:text-slate-900 hover:decoration-white light:hover:decoration-slate-900">
                  See what's included ↓
                </a> : null} />
        </ProductShell>

        {whoFor.length > 0 && <section className="mt-20 py-16 light:bg-white light:border-y light:border-slate-900/5">
            <ProductShell>
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.6fr] lg:items-start">
                <Reveal>
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Who It's For</p>
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/50 light:text-slate-500">
                    The teams this module is built to serve.
                  </p>
                </Reveal>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {whoFor.map((who, i) => <SpotlightCard key={who} tint={CARD_TINTS[i % CARD_TINTS.length]} delay={i * 0.06}>
                      <div className="flex items-start gap-3 p-5">
                        <span className="mt-0.5 text-emerald-300" aria-hidden>
                          <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" />
                          </svg>
                        </span>
                        <p className="text-sm leading-relaxed text-white/70 light:text-slate-600">{who}</p>
                      </div>
                    </SpotlightCard>)}
                </div>
              </div>
            </ProductShell>
          </section>}

        {workflow.length > 0 && <section className="py-16">
            <ProductShell>
              <Reveal>
                <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">How It Works</p>
              </Reveal>
              <div className="mt-10">
                <WorkflowFlow steps={workflow} />
              </div>
            </ProductShell>
          </section>}

        {capabilities.length > 0 && <section id="capabilities" className="py-16 light:bg-white light:border-y light:border-slate-900/5 scroll-mt-28">
            <ProductShell>
              <Reveal>
                <p className="mb-10 text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Capabilities</p>
              </Reveal>
              <CapabilitiesSplit live={liveCapabilities} roadmap={roadmapCapabilities} />
            </ProductShell>
          </section>}

        {tech.length > 0 && <section className="py-16">
            <ProductShell>
              <Reveal>
                <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Works Across Your Stack</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {tech.map(name => <TechChipByName key={name} name={name} />)}
                </div>
              </Reveal>
            </ProductShell>
          </section>}

        {related.length > 0 && <section className="py-16 light:bg-white light:border-y light:border-slate-900/5">
            <ProductShell>
              <Reveal>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">More From ITOps Solution</p>
              </Reveal>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {related.map((r, i) => <Link key={r.id} to={`/solutions/${r.itemKey}`} className="group block h-full">
                    <SpotlightCard delay={i * 0.07} className="h-full">
                      <div className="flex h-full flex-col gap-3 p-5">
                        <div className="flex items-center gap-3">
                          <ProductIcon itemKey={r.itemKey} size={36} />
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === "live" ? "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700" : "bg-white/10 text-white/55 light:text-slate-500"}`}>
                            {r.status === "live" ? "Live" : "Roadmap"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white light:text-slate-900">{r.title}</p>
                        <p className="line-clamp-2 text-xs leading-relaxed text-white/50 light:text-slate-500">{r.subtitle}</p>
                        <span className="mt-auto inline-flex items-center gap-1 text-xs text-white/60 light:text-slate-500 transition-all group-hover:gap-2 group-hover:text-white light:group-hover:text-slate-900">
                          View <span aria-hidden>→</span>
                        </span>
                      </div>
                    </SpotlightCard>
                  </Link>)}
              </div>
            </ProductShell>
          </section>}
      </main>

      <MarketingFooter />
    </div>;
}
