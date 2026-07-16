import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { Reveal, SpotlightCard } from "../components/Animated";
import { CTALink } from "../components/Button";
import { DashboardMockup, FeatureIcon, LiveActivityFeed, TechMarquee } from "../components/ProductVisuals";
import { InfrastructureTopology } from "../components/InfrastructureTopology";
import { HostsVisual, IncidentVisual, SecurityVisual, ShowcaseRow, UptimeVisual } from "../components/FeatureShowcase";
import { fetchContentItems } from "../api/endpoints";
import { Skeleton } from "../components/Skeleton";
import { ErrorState } from "../components/EmptyState";
import { useTheme } from "../context/ThemeContext";
const CARD_TINTS = ["emerald", "cyan", "violet", "amber", "blue", "white"];
const EASE = [0.16, 1, 0.3, 1];

// Persona-driven showcase rows — every capability listed here is live today.
const SHOWCASES = [{
  eyebrow: "Website & API Monitoring",
  eyebrowTone: "text-cyan-300",
  title: "Know before your customers do",
  body: "Every endpoint you care about, checked as often as every 30 seconds. Not just \"is it up\" — assert exact status codes for APIs, require specific text on the page, and watch DNS records for silent changes. When something breaks, you know in seconds, with the failing check and full redirect chain attached.",
  bullets: ["Uptime, keyword, status-code, and DNS check types", "Response-time history on every single check", "Redirect-chain tracing up to 5 hops"],
  href: "/solutions/website-api-monitoring",
  cta: "Explore website monitoring",
  visual: <UptimeVisual />
}, {
  eyebrow: "Security Monitoring",
  eyebrowTone: "text-emerald-300",
  title: "A security score you can act on",
  body: "Alongside every uptime check, we grade each endpoint out of 100 against the headers that actually stop attacks — HSTS, CSP, frame and content-type protections — plus cookie flags and server-version leaks. SSL expiry is tracked per certificate so a lapsed cert never takes you down.",
  bullets: ["Security-header scoring on every HTTPS endpoint", "SSL certificate expiry tracking with early alerts", "Cookie flag and version-leak detection"],
  href: "/solutions/security-monitoring",
  cta: "Explore security monitoring",
  visual: <SecurityVisual />
}, {
  eyebrow: "Kada Nigrani — Server Monitoring",
  eyebrowTone: "text-blue-300",
  title: "See inside every server you run",
  body: "A one-line install puts a lightweight agent on any Linux host — no dependencies beyond bash and curl. CPU, memory, disk, load, and process counts stream into the same dashboard as your websites, with online/offline state and a rotatable per-host key your security team will approve of.",
  bullets: ["One-line agent install on any Linux server", "CPU, memory, disk, load, and uptime in real time", "Per-host ingest keys — revoke or rotate anytime"],
  href: "/solutions/kada-nigrani",
  cta: "Explore Kada Nigrani",
  visual: <HostsVisual />
}, {
  eyebrow: "Incidents & Alerting",
  eyebrowTone: "text-violet-300",
  title: "From failure to fix, automatically",
  body: "Consecutive failures open an incident with the real cause attached — \"Expected text not found\", not just \"error\". Slack, webhook, and email alerts fire immediately, recovery closes the incident on its own, and your public status page tells customers the truth without you touching anything.",
  bullets: ["Automatic incident open + auto-resolve on recovery", "Slack, webhook, and email alert channels", "Shareable public status page per organization"],
  href: "/solutions/website-api-monitoring",
  cta: "See how incidents work",
  visual: <IncidentVisual />
}];
const NODES = [{
  x: 15,
  y: 22
}, {
  x: 42,
  y: 14
}, {
  x: 70,
  y: 26
}, {
  x: 24,
  y: 52
}, {
  x: 55,
  y: 58
}, {
  x: 82,
  y: 46
}, {
  x: 46,
  y: 78
}, {
  x: 78,
  y: 76
}];
const EDGES = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 5], [3, 4], [4, 5], [4, 6], [5, 7], [6, 7]];
function NetworkBackground() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const gridRgba = isLight ? "rgba(15,23,42,0.07)" : "rgba(255,255,255,0.06)";
  const lineStroke = isLight ? "rgba(15,23,42,0.16)" : "rgba(255,255,255,0.14)";
  return <div className="absolute inset-0 h-full w-full">
      <div className="absolute inset-0 opacity-40" style={{
      backgroundImage: `repeating-linear-gradient(0deg, ${gridRgba} 0px, ${gridRgba} 1px, transparent 1px, transparent 56px), repeating-linear-gradient(90deg, ${gridRgba} 0px, ${gridRgba} 1px, transparent 1px, transparent 56px)`
    }} />
      <div className="absolute inset-x-0 h-40 animate-[scan_7s_linear_infinite] bg-gradient-to-b from-transparent via-white/[0.06] light:via-slate-900/[0.05] to-transparent" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {EDGES.map(([a, b], i) => <motion.line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke={lineStroke} strokeWidth={0.15} initial={{
        pathLength: 0,
        opacity: 0
      }} animate={{
        pathLength: 1,
        opacity: 1
      }} transition={{
        duration: 1.6,
        delay: 1 + i * 0.1,
        ease: EASE
      }} />)}
      </svg>
      {NODES.map((node, i) => <motion.div key={i} className="absolute h-1.5 w-1.5 rounded-full bg-white light:bg-slate-900 shadow-[0_0_0_6px_rgba(255,255,255,0.06)] light:shadow-[0_0_0_6px_rgba(15,23,42,0.06)]" style={{
      left: `${node.x}%`,
      top: `${node.y}%`,
      x: "-50%",
      y: "-50%"
    }} initial={{
      opacity: 0,
      scale: 0
    }} animate={{
      opacity: [0.4, 1, 0.4],
      scale: [1, 1.7, 1]
    }} transition={{
      opacity: {
        duration: 2.8,
        repeat: Infinity,
        delay: 1.4 + i * 0.2,
        ease: "easeInOut"
      },
      scale: {
        duration: 2.8,
        repeat: Infinity,
        delay: 1.4 + i * 0.2,
        ease: "easeInOut"
      }
    }} />)}
    </div>;
}
export default function Landing() {
  const {
    data: features,
    isLoading: featuresLoading,
    isError: featuresError,
    refetch: refetchFeatures
  } = useQuery({
    queryKey: ["content", "landing", "features"],
    queryFn: () => fetchContentItems("landing", "features")
  });
  const {
    data: platformPreview,
    isLoading: platformPreviewLoading,
    isError: platformPreviewError
  } = useQuery({
    queryKey: ["content", "landing", "platform_preview"],
    queryFn: () => fetchContentItems("landing", "platform_preview")
  });
  const {
    data: steps,
    isLoading: stepsLoading,
    isError: stepsError
  } = useQuery({
    queryKey: ["content", "landing", "steps"],
    queryFn: () => fetchContentItems("landing", "steps")
  });
  return <div className="bg-black light:bg-slate-50 text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <MarketingNav />

      {/* ── Signature hero: the staggered wordmark, restored and elevated ──
          Absolute/percentage-positioned layered typography only holds up
          reliably at wider aspect ratios (tablet/desktop) — on short phone
          viewports (e.g. iPhone SE at 375×667) the percentage math leaves
          the "Systems." headline and the stat row nearly touching. Below
          md we render a normal-flow stacked layout instead, so spacing is
          governed by real element heights rather than viewport-relative
          guesses. */}
      <section className="relative hidden h-[100svh] min-h-[640px] w-full overflow-hidden bg-black light:bg-slate-50 md:block" aria-label="Secure Your Systems — ITOps Solution">
        <NetworkBackground />
        <div className="enterprise-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute -right-32 bottom-10 h-[440px] w-[440px] rounded-full bg-cyan-400/10 blur-[120px]" />

        <div className="relative z-10 h-full w-full">
          <motion.h1 className="absolute left-4 top-[15%] text-[14vw] font-semibold leading-[0.95] tracking-[-0.04em] md:left-10 md:text-[12.5vw]" initial={{
          y: 48,
          opacity: 0
        }} animate={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.9,
          delay: 0.25,
          ease: EASE
        }}>
            Secure
          </motion.h1>
          <motion.h1 className="absolute right-4 top-[35%] text-[14vw] font-semibold leading-[0.95] tracking-[-0.04em] md:right-10 md:text-[12.5vw]" initial={{
          y: 48,
          opacity: 0
        }} animate={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.9,
          delay: 0.42,
          ease: EASE
        }}>
            Your
          </motion.h1>
          <motion.h1 className="absolute left-[10%] top-[55%] text-[14vw] font-semibold leading-[0.95] tracking-[-0.04em] md:left-[22%] md:text-[12.5vw]" initial={{
          y: 48,
          opacity: 0
        }} animate={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.9,
          delay: 0.58,
          ease: EASE
        }}>
            Systems<span className="text-gradient">.</span>
          </motion.h1>

          {/* side blurb, linked to the wordmark */}
          <motion.div className="absolute left-6 top-[45%] max-w-[250px] md:left-10" initial={{
          y: 16,
          opacity: 0
        }} animate={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.8,
          delay: 0.85,
          ease: EASE
        }}>
            <div className="mb-2 hidden items-center gap-2 md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
              <span className="h-px w-20 bg-gradient-to-r from-white/50 to-transparent" />
            </div>
            <p className="text-[15px] leading-snug text-white/85 light:text-slate-700">
              One enterprise dashboard for infrastructure, security, and everything in between.
            </p>
          </motion.div>

          {/* corner stats with connector lines — every number is real */}
          <motion.div className="absolute right-6 top-[13%] md:right-16" initial={{
          y: 16,
          opacity: 0
        }} animate={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.8,
          delay: 1.0,
          ease: EASE
        }}>
            <div className="flex items-center justify-end gap-3">
              <div className="hidden h-px w-24 rotate-[20deg] bg-gradient-to-r from-transparent to-white/50 md:block" />
              <span className="text-4xl font-semibold tracking-tight md:text-5xl">30s</span>
            </div>
            <p className="mt-1 text-right text-xs text-white/60 light:text-slate-500 md:text-sm">Fastest check interval</p>
          </motion.div>

          <motion.div className="absolute bottom-[30%] left-6 md:bottom-[16%] md:left-16" initial={{
          y: 16,
          opacity: 0
        }} animate={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.8,
          delay: 1.12,
          ease: EASE
        }}>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-semibold tracking-tight md:text-5xl">24/7</span>
              <div className="hidden h-px w-24 rotate-[-20deg] bg-gradient-to-l from-transparent to-white/50 md:block" />
            </div>
            <p className="mt-1 text-xs text-white/60 light:text-slate-500 md:text-sm">Continuous checks</p>
          </motion.div>

          <motion.div className="absolute bottom-[30%] right-6 md:bottom-[16%] md:right-16" initial={{
          y: 16,
          opacity: 0
        }} animate={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.8,
          delay: 1.24,
          ease: EASE
        }}>
            <div className="flex items-center gap-3">
              <div className="hidden h-px w-24 rotate-[-20deg] bg-gradient-to-r from-transparent to-white/50 md:block" />
              <span className="text-4xl font-semibold tracking-tight md:text-5xl">4</span>
            </div>
            <p className="mt-1 text-right text-xs text-white/60 light:text-slate-500 md:text-sm">Check types live</p>
          </motion.div>

          {/* action row — what a visitor actually needs next */}
          <motion.div className="absolute bottom-[5%] left-1/2 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-3 px-6" initial={{
          y: 20,
          opacity: 0
        }} animate={{
          y: 0,
          opacity: 1
        }} transition={{
          duration: 0.8,
          delay: 1.35,
          ease: EASE
        }}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <CTALink to="/pricing" size="lg" magnetic>
                Start free <span aria-hidden>→</span>
              </CTALink>
              <CTALink to="/platform" variant="secondary" size="lg">
                Explore the platform
              </CTALink>
            </div>
            <p className="text-xs text-white/40 light:text-slate-500">Free Starter plan · No credit card required</p>
          </motion.div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-b from-transparent to-black light:to-white" />
      </section>

      {/* ── Mobile hero: same content, real document flow so nothing overlaps on short screens ── */}
      <section className="relative overflow-hidden bg-black light:bg-slate-50 px-6 pb-14 pt-24 md:hidden" aria-label="Secure Your Systems — ITOps Solution">
        <NetworkBackground />
        <div className="enterprise-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]" />

        <div className="relative z-10">
          <motion.h1
            className="text-[15vw] font-semibold leading-[0.95] tracking-[-0.04em]"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          >
            Secure Your Systems<span className="text-gradient">.</span>
          </motion.h1>

          <motion.p
            className="mt-4 max-w-sm text-[15px] leading-snug text-white/80 light:text-slate-600"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
          >
            One enterprise dashboard for infrastructure, security, and everything in between.
          </motion.p>

          <motion.div
            className="mt-8 grid grid-cols-3 gap-3"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
          >
            {[
              ["30s", "Fastest check interval"],
              ["24/7", "Continuous checks"],
              ["4", "Check types live"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.03] light:bg-slate-900/[0.03] px-2 py-3 text-center">
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-1 text-[11px] leading-tight text-white/55 light:text-slate-500">{label}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            className="mt-8 flex flex-col items-center gap-3"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.65, ease: EASE }}
          >
            <CTALink to="/pricing" size="lg" magnetic className="w-full justify-center">
              Start free <span aria-hidden>→</span>
            </CTALink>
            <CTALink to="/platform" variant="secondary" size="lg" className="w-full justify-center">
              Explore the platform
            </CTALink>
            <p className="text-xs text-white/40 light:text-slate-500">Free Starter plan · No credit card required</p>
          </motion.div>
        </div>
      </section>

      {/* ── Product proof: the live dashboard, right below the promise ── */}
      <section className="relative overflow-hidden border-t border-white/10 light:border-slate-900/8 bg-neutral-950/40 light:bg-white px-6 pb-32 pt-20 md:px-10">
        <div className="pointer-events-none absolute -right-40 top-0 h-[420px] w-[420px] rounded-full bg-blue-500/[0.07] blur-[110px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 light:border-slate-900/10 bg-white/[0.04] light:bg-slate-900/[0.04] px-3 py-1.5 text-xs text-white/70 light:text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
              This is the actual product
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
              The dashboard your on-call team will actually watch
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60 light:text-slate-500">
              Response times, service health, incidents, and server metrics stream into one real-time view. Checks run
              from every 30 seconds; failures open incidents with the exact cause attached and alert your channels —
              then auto-resolve on recovery.
            </p>
            <CTALink to="/solutions" variant="secondary" size="md" className="mt-7">
              See every product <span aria-hidden>→</span>
            </CTALink>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="relative">
              <div className="animate-float">
                <DashboardMockup />
              </div>
              <div className="absolute left-4 top-full -mt-8 hidden w-64 sm:block">
                <LiveActivityFeed />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* technology marquee */}
      <section className="border-y border-white/10 light:border-slate-900/8 bg-neutral-950/60 light:bg-white py-8">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/35 light:text-slate-400">
          One agent, one dashboard — your entire stack
        </p>
        <TechMarquee />
      </section>

      <section className="relative overflow-hidden border-b border-white/10 light:border-slate-900/8 bg-neutral-950 light:bg-white px-6 py-16 md:px-10">
        <div className="enterprise-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[80%] max-w-4xl -translate-x-1/2 rounded-full bg-blue-500/[0.06] blur-[130px]" />
        {/* On ultra-wide viewports the centered max-w-5xl column leaves bare
            gutters either side — fill them with module icons drawn from the
            same real, live modules the section itself lists (not filler). */}
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[calc(50%-30rem)] 2xl:block">
          <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden>
            <motion.line x1="20%" y1="26%" x2="48%" y2="60%" stroke="#22d3ee" strokeWidth="1" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
          </svg>
          <motion.div className="absolute left-[18%] top-[22%]" animate={{ y: [0, -14, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
            <FeatureIcon title="Website & API Monitoring" size={44} />
          </motion.div>
          <motion.div className="absolute left-[46%] top-[58%]" animate={{ y: [0, 12, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}>
            <FeatureIcon title="Network & Device Monitoring" size={36} />
          </motion.div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[calc(50%-30rem)] 2xl:block">
          <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden>
            <motion.line x1="78%" y1="32%" x2="54%" y2="66%" stroke="#a78bfa" strokeWidth="1" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.15, ease: EASE }} />
          </svg>
          <motion.div className="absolute right-[20%] top-[28%]" animate={{ y: [0, 14, 0] }} transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}>
            <FeatureIcon title="Security Monitoring" size={44} />
          </motion.div>
          <motion.div className="absolute right-[44%] top-[62%]" animate={{ y: [0, -12, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}>
            <FeatureIcon title="Kada Nigrani (Server Monitoring)" size={36} />
          </motion.div>
        </div>
        <Reveal className="relative mx-auto max-w-5xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">The Complete Platform</p>
          <p className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">One Platform, Growing Module by Module</p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55 light:text-slate-500">
            ITOps Monitor is built to become a complete IT operations platform. Some modules are live and monitoring
            real infrastructure today; others are publicly on the roadmap.
          </p>
          {platformPreview && platformPreview.length > 0 && <p className="mt-3 text-xs font-medium uppercase tracking-wide text-white/35 light:text-slate-400">
              {platformPreview.filter(i => i.status === "live").length} modules live today ·{" "}
              {platformPreview.filter(i => i.status !== "live").length} on the public roadmap
            </p>}
        </Reveal>
        <div className="relative mx-auto mt-10">
          <InfrastructureTopology items={platformPreview} />
        </div>
        <div className="relative mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-3">
          {platformPreviewLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-32 rounded-full" />)
          ) : platformPreviewError ? (
            <p className="text-sm text-red-300/80">Couldn't load platform modules.</p>
          ) : (
          platformPreview?.map((item, i) => {
          const isLive = item.status === "live";
          const pill = <motion.span initial={{
            opacity: 0,
            y: 10,
            scale: 0.9
          }} whileInView={{
            opacity: 1,
            y: 0,
            scale: 1
          }} viewport={{
            once: true,
            margin: "-40px"
          }} transition={{
            duration: 0.4,
            delay: i * 0.05,
            ease: EASE
          }} whileHover={{
            scale: 1.06,
            y: -2
          }} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${isLive ? "border-emerald-400/30 bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700 hover:bg-emerald-400/20 light:hover:bg-emerald-200" : "border-white/10 light:border-slate-900/10 text-white/50 light:text-slate-500 hover:border-white/25 light:hover:border-slate-900/25 hover:text-white/70 light:hover:text-slate-600 light:hover:text-slate-700"}`}>
              {isLive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />}
              {item.title} · {isLive ? "Live" : "Roadmap"}
            </motion.span>;
          return item.href ? <Link key={item.id} to={item.href} className="cursor-pointer">
                {pill}
              </Link> : <span key={item.id} className="cursor-default">
                {pill}
              </span>;
        })
          )}
        </div>
        <div className="mt-8 text-center">
          <Link to="/platform" className="text-sm text-white/70 light:text-slate-600 underline-offset-4 hover:text-white light:hover:text-slate-900 hover:underline">
            See the full platform →
          </Link>
        </div>
      </section>

      <section id="features" className="relative overflow-hidden px-6 py-20 md:px-10">
        {/* Connecting-node decoration in the gutters at ultra-wide widths —
            the same six services as the cards below, linked like a small
            network graph rather than left as bare space. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[calc(50%-36rem)] 2xl:block">
          <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden>
            <motion.line x1="22%" y1="30%" x2="55%" y2="55%" stroke="#22d3ee" strokeWidth="1" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
            <motion.line x1="55%" y1="55%" x2="30%" y2="78%" stroke="#34d399" strokeWidth="1" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.2, ease: EASE }} />
          </svg>
          <motion.div className="absolute left-[18%] top-[26%]" animate={{ y: [0, -10, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}>
            <FeatureIcon title="Uptime & Response Time" size={40} />
          </motion.div>
          <motion.div className="absolute left-[50%] top-[52%]" animate={{ y: [0, 10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
            <FeatureIcon title="SSL Certificate Monitoring" size={44} />
          </motion.div>
          <motion.div className="absolute left-[26%] top-[74%]" animate={{ y: [0, -8, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}>
            <FeatureIcon title="Security Posture Scoring" size={36} />
          </motion.div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[calc(50%-36rem)] 2xl:block">
          <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden>
            <motion.line x1="78%" y1="28%" x2="45%" y2="53%" stroke="#fb7185" strokeWidth="1" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.1, ease: EASE }} />
            <motion.line x1="45%" y1="53%" x2="70%" y2="76%" stroke="#fbbf24" strokeWidth="1" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.3, ease: EASE }} />
          </svg>
          <motion.div className="absolute right-[18%] top-[24%]" animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}>
            <FeatureIcon title="Incident Tracking" size={40} />
          </motion.div>
          <motion.div className="absolute right-[48%] top-[50%]" animate={{ y: [0, -12, 0] }} transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}>
            <FeatureIcon title="Multi-Channel Alerting" size={44} />
          </motion.div>
          <motion.div className="absolute right-[24%] top-[72%]" animate={{ y: [0, 9, 0] }} transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}>
            <FeatureIcon title="Asset Inventory" size={36} />
          </motion.div>
        </div>

        <div className="relative mx-auto max-w-5xl 2xl:max-w-7xl">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Everything Included</p>
          <p className="mt-3 text-center text-2xl font-medium tracking-tight md:text-3xl">Six Services, One Dashboard</p>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-white/50 light:text-slate-500">
            Every module below is live in the product today and feeds the same dashboard, incidents, and alerts.
          </p>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuresLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)
          ) : featuresError ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <ErrorState message="Couldn't load the feature list." onRetry={() => refetchFeatures()} />
            </div>
          ) : (
          features?.map((feature, i) => {
          const inner = <div className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between">
                  <FeatureIcon title={feature.title} />
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.8s_ease-in-out_infinite]" />
                    Live
                  </span>
                </div>
                <h3 className="mt-4 text-base font-medium tracking-tight text-white light:text-slate-900">{feature.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55 light:text-slate-500">{feature.body}</p>
                {feature.href && <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-300 light:text-cyan-600 transition-all group-hover:gap-2">
                    Learn more <span aria-hidden>→</span>
                  </p>}
              </div>;
          const card = <SpotlightCard tint={CARD_TINTS[i % CARD_TINTS.length]} delay={i * 0.06} className="h-full">
                {inner}
              </SpotlightCard>;
          return feature.href ? <Link key={feature.id} to={feature.href} className="block h-full">
                {card}
              </Link> : <div key={feature.id}>{card}</div>;
        })
          )}
        </div>
        </div>
      </section>

      {/* Per-service deep dives — alternating rows, each with a live-style vignette */}
      <section className="relative overflow-hidden border-t border-white/10 light:border-slate-900/8 bg-neutral-950/50 light:bg-white px-6 py-20 md:px-10">
        <div className="enterprise-grid pointer-events-none absolute inset-0 opacity-50" />
        {/* Soft ambient glows in the gutters at ultra-wide widths — this
            section is a vertical narrative (alternating rows), so it gets
            depth rather than more foreground icons competing with it. */}
        <motion.div className="pointer-events-none absolute -left-40 top-1/4 hidden h-[420px] w-[420px] rounded-full bg-cyan-500/[0.05] blur-[120px] 2xl:block" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="pointer-events-none absolute -right-40 bottom-1/4 hidden h-[420px] w-[420px] rounded-full bg-emerald-500/[0.05] blur-[120px] 2xl:block" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
        <div className="relative mx-auto max-w-6xl 2xl:max-w-7xl">
          <Reveal className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">What You Get</p>
            <p className="mt-3 text-2xl font-medium tracking-tight md:text-4xl">
              Built for the People Who Get Paged
            </p>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55 light:text-slate-500">
              Every capability below is live in the product today — no mock screenshots, no “coming soon” asterisks.
            </p>
          </Reveal>
          <div className="mt-20 space-y-24 md:space-y-32">
            {SHOWCASES.map((item, i) => <ShowcaseRow key={item.eyebrow} item={item} flip={i % 2 === 1} />)}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 light:border-slate-900/8 bg-neutral-950 light:bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20 md:px-10 2xl:max-w-5xl">
          <Reveal>
            <p className="text-center text-2xl font-medium tracking-tight md:text-3xl">How It Works</p>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-10 text-center sm:grid-cols-3">
            {stepsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="mx-auto h-24 w-full max-w-[220px] rounded-xl" />)
            ) : stepsError ? (
              <div className="sm:col-span-3">
                <ErrorState message="Couldn't load these steps." />
              </div>
            ) : (
            steps?.map((step, index) => <Reveal key={step.id} delay={index * 0.12}>
                <motion.div whileHover={{
              scale: 1.12,
              rotate: 3
            }} transition={{
              type: "spring",
              stiffness: 300,
              damping: 15
            }} className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-medium text-black shadow-[0_0_0_6px_rgba(255,255,255,0.06)]">
                  {index + 1}
                </motion.div>
                <p className="mt-4 text-[15px] font-medium tracking-tight text-white light:text-slate-900">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55 light:text-slate-500">{step.body}</p>
              </Reveal>)
            )}
          </div>
        </div>
      </section>

      <section id="cta" className="px-6 py-20 text-center md:px-10">
        <Reveal>
          <p className="text-2xl font-medium tracking-tight md:text-3xl">Ready to Stop Finding Out From Your Customers?</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/pricing" className="inline-block rounded-full bg-white px-7 py-3 text-sm font-normal text-black transition-transform hover:scale-105 hover:bg-neutral-200">
              Get Started
            </Link>
            <Link to="/platform" className="inline-block rounded-full border border-white/20 px-7 py-3 text-sm font-normal text-white light:text-slate-900 transition-colors hover:bg-white/10">
              Explore the Platform
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-160px); }
          100% { transform: translateY(110vh); }
        }
      `}</style>
    </div>;
}