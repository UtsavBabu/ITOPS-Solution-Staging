import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import { RadarSweepBackground, ThunderstormBackground } from "./PageBackgrounds";
import { ProductIcon } from "./ProductIcon";
import { Reveal, SpotlightCard } from "./Animated";

const EASE = [0.16, 1, 0.3, 1];

/* ─────────────────────────────────────────────────────────────────────────
 * Per-product visual identity. Every product page shares the same layout
 * shell; this is the one place that gives each product its own color,
 * background feel, and category label — real, factual metadata (nothing
 * here claims a capability, it just decides how the page looks).
 * ────────────────────────────────────────────────────────────────────── */
export const PRODUCT_IDENTITY = {
  "website-api-monitoring": { category: "Monitoring", tint: "cyan", bg: "radar" },
  "security-monitoring": { category: "Security", tint: "emerald", bg: "radar" },
  "kada-nigrani": { category: "Monitoring", tint: "blue", bg: "radar", extra: "Linux agent · one-line install" },
  "infrastructure-monitor": { category: "Monitoring", tint: "violet", bg: "radar" },
  "devops-monitor": { category: "Monitoring", tint: "amber", bg: "radar" },
  "alerting-incident-response": { category: "Operations", tint: "rose", bg: "radar" },
  "moonsav-edr": { category: "Endpoint Security", tint: "red", bg: "storm" },
  cybersachet: { category: "Training", tint: "rose", bg: "storm" },
  academy: { category: "Training", tint: "amber", bg: "radar" }
};
const DEFAULT_IDENTITY = { category: "Platform", tint: "white", bg: "radar" };
export function getProductIdentity(itemKey) {
  return PRODUCT_IDENTITY[itemKey] ?? DEFAULT_IDENTITY;
}

export function ProductBackground({ itemKey }) {
  const identity = getProductIdentity(itemKey);
  return identity.bg === "storm" ? <ThunderstormBackground tint={identity.tint} /> : <RadarSweepBackground tint={identity.tint} />;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Dashboard-preview mockup: an honest, illustrative UI panel (same "sample
 * data, like any SaaS product screenshot" convention as the homepage's
 * DashboardMockup) built from the product's own real capability list — a
 * live/roadmap ratio ring plus the actual capability titles, never invented
 * operational numbers for a product that isn't shipped yet.
 * ────────────────────────────────────────────────────────────────────── */
function useCountUp(to, active, duration = 1100) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf = 0;
    const tick = now => {
      const p = Math.min((now - start) / duration, 1);
      setN((1 - Math.pow(1 - p, 3)) * to);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, duration]);
  return n;
}
const TINT_HEX = { cyan: "#00f0ff", emerald: "#10b981", blue: "#60a5fa", violet: "#a78bfa", amber: "#fbbf24", rose: "#fb7185", red: "#ff4d4d", white: "#e2e8f0" };
export function ProductMockup({ itemKey, title, capabilities = [] }) {
  const identity = getProductIdentity(itemKey);
  const hex = TINT_HEX[identity.tint] ?? TINT_HEX.white;
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { once: true, margin: "-80px" });
  const live = capabilities.filter(c => c.status === "live");
  const total = capabilities.length || 1;
  const pct = useCountUp(Math.round((live.length / total) * 100), inView);
  const shown = capabilities.slice(0, 5);
  const r = 42;
  const circumference = 2 * Math.PI * r;
  return <div ref={rootRef} className="glass overflow-hidden rounded-2xl shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
      <div className="flex items-center gap-2 border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 truncate text-xs text-white/40 light:text-slate-400">{title} — Capability Status</span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
          {live.length > 0 ? "Live" : "Roadmap"}
        </span>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-5">
        <div className="flex flex-col items-center justify-center sm:col-span-2">
          <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={hex} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - (pct / 100) * circumference} style={{ transition: "stroke-dashoffset 0.3s ease-out" }} />
          </svg>
          <p className="-mt-[4.6rem] text-2xl font-semibold tabular-nums text-white light:text-slate-900">{Math.round(pct)}%</p>
          <p className="mt-14 text-center text-xs text-white/50 light:text-slate-500">
            {live.length} of {capabilities.length || 0} capabilities live
          </p>
        </div>
        <div className="sm:col-span-3">
          <p className="mb-2 text-xs font-medium text-white/70 light:text-slate-600">Capabilities</p>
          <div className="space-y-2">
            {shown.map((c, i) => <motion.div key={c.title} initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }} className="flex items-center gap-2 rounded-lg border border-white/10 light:border-slate-900/10 bg-white/[0.03] light:bg-slate-900/[0.02] px-3 py-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.status === "live" ? "bg-emerald-400 [animation:pulse-glow_1.8s_ease-in-out_infinite]" : "bg-white/25 light:bg-slate-300"}`} />
                <span className="truncate text-[11px] text-white/70 light:text-slate-600">{c.title}</span>
                <span className={`ml-auto shrink-0 text-[10px] ${c.status === "live" ? "text-emerald-300" : "text-white/30 light:text-slate-400"}`}>{c.status === "live" ? "Live" : "Soon"}</span>
              </motion.div>)}
            {shown.length === 0 && <p className="text-xs text-white/40 light:text-slate-400">No capabilities listed yet.</p>}
          </div>
        </div>
      </div>
    </div>;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Premium wide hero: category/status chips, product icon + name, real
 * capability-count stats, primary/secondary CTA, and the mockup above.
 * ────────────────────────────────────────────────────────────────────── */
export function ProductHero({ itemKey, title, subtitle, body, status, capabilities = [], backTo = "/solutions", backLabel = "Solutions", primaryCta, secondaryCta }) {
  const identity = getProductIdentity(itemKey);
  const liveCount = capabilities.filter(c => c.status === "live").length;
  const roadmapCount = capabilities.length - liveCount;
  return <section className="relative isolate overflow-hidden rounded-3xl bg-[#0b1020] light:bg-white light:border light:border-slate-900/10 light:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_20px_60px_-30px_rgba(15,23,42,0.15)]">
      <ProductBackground itemKey={itemKey} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black light:to-white" />
      <div className="relative z-10 grid gap-10 p-6 pb-12 pt-10 md:p-12 md:pb-16 md:pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14">
        <div className="text-white light:text-slate-900">
          <Link to={backTo} className="text-sm text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
            ← {backLabel}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 light:bg-slate-900/8 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/60 light:text-slate-500">
              {identity.category}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${status === "live" ? "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700" : "bg-white/10 light:bg-slate-900/8 text-white/60 light:text-slate-500"}`}>
              {status === "live" ? "Live Today" : "On the Roadmap"}
            </span>
            {identity.extra && <span className="rounded-full bg-white/10 light:bg-slate-900/8 px-3 py-1 text-xs font-medium text-white/60 light:text-slate-500">{identity.extra}</span>}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <ProductIcon itemKey={itemKey} size={52} />
            <h1 className="text-3xl font-medium tracking-tight md:text-5xl">{title}</h1>
          </div>
          <p className="mt-3 text-lg text-white/60 light:text-slate-500">{subtitle}</p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 light:text-slate-600">{body}</p>

          {capabilities.length > 0 && <div className="mt-6 flex items-center gap-6">
              <div>
                <p className="text-2xl font-semibold tabular-nums text-white light:text-slate-900">{liveCount}</p>
                <p className="text-xs text-white/45 light:text-slate-400">Live now</p>
              </div>
              <div className="h-8 w-px bg-white/10 light:bg-slate-900/10" />
              <div>
                <p className="text-2xl font-semibold tabular-nums text-white light:text-slate-900">{roadmapCount}</p>
                <p className="text-xs text-white/45 light:text-slate-400">On roadmap</p>
              </div>
            </div>}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {primaryCta}
            {secondaryCta}
          </div>
        </div>

        <Reveal delay={0.15}>
          <ProductMockup itemKey={itemKey} title={title} capabilities={capabilities} />
        </Reveal>
      </div>
    </section>;
}

/* ─────────────────────────────────────────────────────────────────────────
 * "How It Works" as an animated horizontal flow (draws a connecting line
 * across real workflow steps) instead of a plain static card grid.
 * ────────────────────────────────────────────────────────────────────── */
export function WorkflowFlow({ steps }) {
  if (!steps || steps.length === 0) return null;
  return <div className="relative">
      <div className="absolute left-0 right-0 top-5 hidden h-px bg-white/10 light:bg-slate-900/10 md:block" aria-hidden />
      <motion.div className="absolute left-0 top-5 hidden h-px bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400 md:block" initial={{ width: "0%" }} whileInView={{ width: "100%" }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1.2, ease: EASE }} aria-hidden />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {steps.map((step, i) => <Reveal key={step.title} delay={i * 0.12}>
            <div className="relative">
              <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-black [background:var(--grad-brand)]">
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-medium text-white light:text-slate-900">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/55 light:text-slate-500">{step.detail}</p>
            </div>
          </Reveal>)}
      </div>
    </div>;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Live vs. roadmap capabilities, side by side — an honest "available now
 * vs. coming soon" comparison instead of two stacked, easy-to-conflate lists.
 * ────────────────────────────────────────────────────────────────────── */
export function CapabilitiesSplit({ live = [], roadmap = [] }) {
  if (live.length === 0 && roadmap.length === 0) return null;
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {live.length > 0 && <div>
          <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-emerald-300 light:text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Available Now
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {live.map((cap, i) => <SpotlightCard key={cap.title} tint="emerald" delay={i * 0.05}>
                <div className="p-5">
                  <h3 className="text-sm font-medium text-white light:text-slate-900">{cap.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55 light:text-slate-500">{cap.detail}</p>
                </div>
              </SpotlightCard>)}
          </div>
        </div>}
      {roadmap.length > 0 && <div>
          <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-white/25 light:bg-slate-300" /> On the Roadmap
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {roadmap.map((cap, i) => <SpotlightCard key={cap.title} tint="white" delay={i * 0.04} className="border-dashed bg-transparent">
                <div className="p-5">
                  <h3 className="text-sm font-medium text-white/80 light:text-slate-700">{cap.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/45 light:text-slate-400">{cap.detail}</p>
                </div>
              </SpotlightCard>)}
          </div>
        </div>}
    </div>;
}

/** Wide shell every product page shares — the fix for the "tiny centered card on a huge monitor" bug. */
export function ProductShell({ children }) {
  return <div className="mx-auto max-w-[1680px] px-6 md:px-10 3xl:px-16">{children}</div>;
}
