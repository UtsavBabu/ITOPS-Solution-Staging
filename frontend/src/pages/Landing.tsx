import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { Reveal, SpotlightCard } from "../components/Animated";
import { CTALink } from "../components/Button";
import { DashboardMockup, LiveActivityFeed, TechMarquee, StatCounter } from "../components/ProductVisuals";
import { HostsVisual, IncidentVisual, SecurityVisual, ShowcaseRow, UptimeVisual, type ShowcaseItem } from "../components/FeatureShowcase";
import { fetchContentItems } from "../api/endpoints";

const CARD_TINTS = ["emerald", "cyan", "violet", "amber", "blue", "white"] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

// Persona-driven showcase rows — every capability listed here is live today.
const SHOWCASES: ShowcaseItem[] = [
  {
    eyebrow: "Website & API Monitoring",
    eyebrowTone: "text-cyan-300",
    title: "Know before your customers do",
    body:
      "Every endpoint you care about, checked as often as every 30 seconds. Not just \"is it up\" — assert exact status codes for APIs, require specific text on the page, and watch DNS records for silent changes. When something breaks, you know in seconds, with the failing check and full redirect chain attached.",
    bullets: [
      "Uptime, keyword, status-code, and DNS check types",
      "Response-time history on every single check",
      "Redirect-chain tracing up to 5 hops",
    ],
    href: "/solutions/website-api-monitoring",
    cta: "Explore website monitoring",
    visual: <UptimeVisual />,
  },
  {
    eyebrow: "Security Monitoring",
    eyebrowTone: "text-emerald-300",
    title: "A security score you can act on",
    body:
      "Alongside every uptime check, we grade each endpoint out of 100 against the headers that actually stop attacks — HSTS, CSP, frame and content-type protections — plus cookie flags and server-version leaks. SSL expiry is tracked per certificate so a lapsed cert never takes you down.",
    bullets: [
      "Security-header scoring on every HTTPS endpoint",
      "SSL certificate expiry tracking with early alerts",
      "Cookie flag and version-leak detection",
    ],
    href: "/solutions/security-monitoring",
    cta: "Explore security monitoring",
    visual: <SecurityVisual />,
  },
  {
    eyebrow: "Kada Nigrani — Server Monitoring",
    eyebrowTone: "text-blue-300",
    title: "See inside every server you run",
    body:
      "A one-line install puts a lightweight agent on any Linux host — no dependencies beyond bash and curl. CPU, memory, disk, load, and process counts stream into the same dashboard as your websites, with online/offline state and a rotatable per-host key your security team will approve of.",
    bullets: [
      "One-line agent install on any Linux server",
      "CPU, memory, disk, load, and uptime in real time",
      "Per-host ingest keys — revoke or rotate anytime",
    ],
    href: "/solutions/kada-nigrani",
    cta: "Explore Kada Nigrani",
    visual: <HostsVisual />,
  },
  {
    eyebrow: "Incidents & Alerting",
    eyebrowTone: "text-violet-300",
    title: "From failure to fix, automatically",
    body:
      "Consecutive failures open an incident with the real cause attached — \"Expected text not found\", not just \"error\". Slack, webhook, and email alerts fire immediately, recovery closes the incident on its own, and your public status page tells customers the truth without you touching anything.",
    bullets: [
      "Automatic incident open + auto-resolve on recovery",
      "Slack, webhook, and email alert channels",
      "Shareable public status page per organization",
    ],
    href: "/solutions/website-api-monitoring",
    cta: "See how incidents work",
    visual: <IncidentVisual />,
  },
];

const NODES = [
  { x: 15, y: 22 },
  { x: 42, y: 14 },
  { x: 70, y: 26 },
  { x: 24, y: 52 },
  { x: 55, y: 58 },
  { x: 82, y: 46 },
  { x: 46, y: 78 },
  { x: 78, y: 76 },
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 4],
  [2, 5],
  [3, 4],
  [4, 5],
  [4, 6],
  [5, 7],
  [6, 7],
];

function NetworkBackground() {
  return (
    <div className="absolute inset-0 h-full w-full">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 56px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 56px)",
        }}
      />
      <div className="absolute inset-x-0 h-40 animate-[scan_7s_linear_infinite] bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {EDGES.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={0.15}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.6, delay: 1 + i * 0.1, ease: EASE }}
          />
        ))}
      </svg>
      {NODES.map((node, i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.06)]"
          style={{ left: `${node.x}%`, top: `${node.y}%`, x: "-50%", y: "-50%" }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.7, 1] }}
          transition={{
            opacity: { duration: 2.8, repeat: Infinity, delay: 1.4 + i * 0.2, ease: "easeInOut" },
            scale: { duration: 2.8, repeat: Infinity, delay: 1.4 + i * 0.2, ease: "easeInOut" },
          }}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  const { data: features } = useQuery({ queryKey: ["content", "landing", "features"], queryFn: () => fetchContentItems("landing", "features") });
  const { data: platformPreview } = useQuery({
    queryKey: ["content", "landing", "platform_preview"],
    queryFn: () => fetchContentItems("landing", "platform_preview"),
  });
  const { data: steps } = useQuery({ queryKey: ["content", "landing", "steps"], queryFn: () => fetchContentItems("landing", "steps") });

  return (
    <div className="bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <section className="relative overflow-hidden bg-black px-6 pb-16 pt-32 md:px-10 md:pt-40">
        <NetworkBackground />
        <div className="enterprise-grid pointer-events-none absolute inset-0" />
        {/* ambient glow blobs */}
        <div className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute -right-32 top-40 h-[440px] w-[440px] rounded-full bg-cyan-400/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            {/* left column */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 backdrop-blur"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
                Enterprise Infrastructure &amp; Security Monitoring
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
                className="mt-6 text-[13vw] font-semibold leading-[0.98] tracking-[-0.03em] sm:text-6xl md:text-7xl"
              >
                Monitor <span className="text-gradient">everything</span>.
                <br />
                Prevent downtime.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
                className="mt-6 max-w-xl text-base leading-relaxed text-white/60 md:text-lg"
              >
                One real-time platform for infrastructure, servers, websites, and security. Catch issues in seconds —
                not from your customers — with continuous checks, automatic incident detection, and multi-channel alerts.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <CTALink to="/pricing" size="lg" magnetic>
                  Start free <span aria-hidden>→</span>
                </CTALink>
                <CTALink to="/platform" variant="secondary" size="lg">
                  Explore the platform
                </CTALink>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mt-4 text-xs text-white/40"
              >
                Free Starter plan · No credit card · Real-time checks from every 30 seconds
              </motion.p>
            </div>

            {/* right column — floating dashboard + live feed */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
              className="relative"
            >
              <div className="animate-float">
                <DashboardMockup />
              </div>
              <div className="absolute -bottom-8 -left-4 hidden w-64 sm:block">
                <LiveActivityFeed />
              </div>
            </motion.div>
          </div>

          {/* honest capability metrics */}
          <div className="mt-24 grid grid-cols-2 gap-6 border-t border-white/10 pt-10 md:grid-cols-4">
            <StatCounter to={30} suffix="s" label="Fastest check interval" />
            <StatCounter to={6} label="Monitoring services" />
            <StatCounter to={4} label="Check types live" />
            <StatCounter to={24} suffix="/7" label="Continuous checks" />
          </div>
        </div>
      </section>

      {/* technology marquee */}
      <section className="border-y border-white/10 bg-neutral-950/60 py-8">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/35">
          One agent, one dashboard — your entire stack
        </p>
        <TechMarquee />
      </section>

      <section className="border-b border-white/10 bg-neutral-950 px-6 py-20 md:px-10">
        <Reveal className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">The Complete Platform</p>
          <p className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">One Platform, Growing Module by Module</p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55">
            ITOps Monitor is built to become a complete IT operations platform. Some modules are live and monitoring
            real infrastructure today; others are publicly on the roadmap.
          </p>
        </Reveal>
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3">
          {platformPreview?.map((item, i) => (
            <motion.span
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
              whileHover={{ scale: 1.06 }}
              className={`cursor-default rounded-full border px-4 py-2 text-sm transition-colors ${
                item.status === "live"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                  : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/70"
              }`}
            >
              {item.title} · {item.status === "live" ? "Live" : "Roadmap"}
            </motion.span>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/platform" className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">
            See the full platform →
          </Link>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-5xl px-6 py-24 md:px-10">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45">Everything Included</p>
          <p className="mt-3 text-center text-2xl font-medium tracking-tight md:text-3xl">Six Services, One Dashboard</p>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features?.map((feature, i) => {
            const inner = (
              <div className="flex h-full flex-col p-6">
                <h3 className="text-base font-medium tracking-tight text-white">{feature.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{feature.body}</p>
                {feature.href && (
                  <p className="mt-4 inline-flex items-center gap-1 text-sm text-white/60 transition-all group-hover:gap-2 group-hover:text-white">
                    Learn more <span aria-hidden>→</span>
                  </p>
                )}
              </div>
            );
            const card = (
              <SpotlightCard tint={CARD_TINTS[i % CARD_TINTS.length]} delay={i * 0.06} className="h-full">
                {inner}
              </SpotlightCard>
            );
            return feature.href ? (
              <Link key={feature.id} to={feature.href} className="block h-full">
                {card}
              </Link>
            ) : (
              <div key={feature.id}>{card}</div>
            );
          })}
        </div>
      </section>

      {/* Per-service deep dives — alternating rows, each with a live-style vignette */}
      <section className="relative border-t border-white/10 bg-neutral-950/50 px-6 py-24 md:px-10">
        <div className="enterprise-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-6xl">
          <Reveal className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">What You Get</p>
            <p className="mt-3 text-2xl font-medium tracking-tight md:text-4xl">
              Built for the People Who Get Paged
            </p>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55">
              Every capability below is live in the product today — no mock screenshots, no “coming soon” asterisks.
            </p>
          </Reveal>
          <div className="mt-20 space-y-24 md:space-y-32">
            {SHOWCASES.map((item, i) => (
              <ShowcaseRow key={item.eyebrow} item={item} flip={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-neutral-950">
        <div className="mx-auto max-w-4xl px-6 py-24 md:px-10">
          <Reveal>
            <p className="text-center text-2xl font-medium tracking-tight md:text-3xl">How It Works</p>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-10 text-center sm:grid-cols-3">
            {steps?.map((step, index) => (
              <Reveal key={step.id} delay={index * 0.12}>
                <motion.div
                  whileHover={{ scale: 1.12, rotate: 3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-medium text-black shadow-[0_0_0_6px_rgba(255,255,255,0.06)]"
                >
                  {index + 1}
                </motion.div>
                <p className="mt-4 text-[15px] font-medium tracking-tight text-white">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="px-6 py-24 text-center md:px-10">
        <Reveal>
          <p className="text-2xl font-medium tracking-tight md:text-3xl">Ready to Stop Finding Out From Your Customers?</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/pricing"
              className="inline-block rounded-full bg-white px-7 py-3 text-sm font-normal text-black transition-transform hover:scale-105 hover:bg-neutral-200"
            >
              Get Started
            </Link>
            <Link
              to="/platform"
              className="inline-block rounded-full border border-white/20 px-7 py-3 text-sm font-normal text-white transition-colors hover:bg-white/10"
            >
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
    </div>
  );
}
