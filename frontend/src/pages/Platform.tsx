import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { fetchContentItems } from "../api/endpoints";
import type { ContentItem } from "../api/types";
import { CircuitTraceBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";
import { FeatureIcon } from "../components/ProductVisuals";

const CARD_TINTS = ["emerald", "cyan", "violet", "amber", "blue", "white"] as const;

function ModuleCard({ module, index }: { module: ContentItem; index: number }) {
  const content = (
    <SpotlightCard tint={CARD_TINTS[index % CARD_TINTS.length]} delay={index * 0.05} className="h-full">
      <div className="flex h-full flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <FeatureIcon title={module.title} size={36} />
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              module.status === "live" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/60"
            }`}
          >
            {module.status === "live" ? "Live" : "Roadmap"}
          </span>
        </div>
        <h3 className="mt-4 text-base font-medium tracking-tight text-white">{module.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{module.body}</p>
        {module.href && (
          <p className="mt-4 inline-flex items-center gap-1 text-sm text-white/70 transition-all group-hover:gap-2 group-hover:text-white">
            {module.status === "live" ? "View solution" : "See the plan"} <span aria-hidden>→</span>
          </p>
        )}
      </div>
    </SpotlightCard>
  );

  return module.href ? (
    <Link to={module.href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function Platform() {
  const { data: modules } = useQuery({ queryKey: ["content", "platform", "modules"], queryFn: () => fetchContentItems("platform", "modules") });

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-5xl overflow-hidden rounded-3xl pb-16 pt-16 text-center">
          <CircuitTraceBackground tint="emerald" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">The Platform</p>
            <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">
              One Dashboard for Your Entire IT Ecosystem
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60">
              ITOps Monitor is built as a single platform with independent modules — infrastructure, DevOps, websites,
              security, and awareness — that all report into one enterprise dashboard. Some modules are live today;
              others are on the roadmap and shown here honestly, not as finished features.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:max-w-7xl">
          {modules?.map((module, i) => (
            <ModuleCard key={module.id} module={module} index={i} />
          ))}
        </div>

        <Reveal className="mx-auto mt-20 max-w-4xl rounded-2xl border border-white/10 bg-neutral-900/40 p-8 text-center md:p-12">
          <p className="text-2xl font-medium tracking-tight">Start With What's Live Today</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/55">
            Website &amp; API monitoring, security scoring, incident management, alerting, and asset inventory are
            fully working right now — no waitlist required.
          </p>
          <Link
            to="/pricing"
            className="mt-6 inline-block rounded-full bg-white px-7 py-3 text-sm font-normal text-black transition-transform hover:scale-105 hover:bg-neutral-200"
          >
            Get Started
          </Link>
        </Reveal>
      </main>

      <MarketingFooter />
    </div>
  );
}
