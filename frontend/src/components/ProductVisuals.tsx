import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";

/* ───────────────────────── Animated dashboard mockup ─────────────────────────
 * An illustrative preview of the product UI (sample data, like any SaaS product
 * screenshot). Self-animating SVG — no per-frame React renders. */

const AREA_PATH = "M0,70 C40,55 70,80 110,60 150,40 190,66 230,48 270,30 310,58 350,38 390,24 430,50 470,34 L470,120 L0,120 Z";
const LINE_PATH = "M0,70 C40,55 70,80 110,60 150,40 190,66 230,48 270,30 310,58 350,38 390,24 430,50 470,34";

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export function DashboardMockup() {
  const services = [
    { name: "api.production", status: "up", ms: "126ms" },
    { name: "checkout-service", status: "up", ms: "89ms" },
    { name: "web-01 · host", status: "up", ms: "cpu 31%" },
    { name: "eu-west gateway", status: "degraded", ms: "512ms" },
  ];
  return (
    <div className="glass overflow-hidden rounded-2xl shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 text-xs text-white/40">ITOps Monitor — Operations</span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
          Live
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-5">
        {/* chart */}
        <div className="sm:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-white/70">Response time · last hour</p>
            <p className="text-xs text-white/40">avg 142ms</p>
          </div>
          <div className="relative h-32 w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <svg viewBox="0 0 470 120" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
                  <stop offset="100%" stopColor="rgba(34,211,238,0)" />
                </linearGradient>
              </defs>
              <path d={AREA_PATH} fill="url(#areaFill)" />
              <path
                d={LINE_PATH}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinecap="round"
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "dashdraw 2.4s ease-out forwards" }}
              />
            </svg>
            <div className="pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent [animation:sheen_4s_linear_infinite]" />
            <style>{`@keyframes dashdraw { to { stroke-dashoffset: 0; } }`}</style>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat label="Uptime" value="99.98%" tone="text-emerald-300" />
            <MiniStat label="Incidents" value="0" tone="text-white" />
            <MiniStat label="Checks/min" value="1.2k" tone="text-cyan-300" />
          </div>
        </div>

        {/* service list */}
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-medium text-white/70">Services</p>
          <div className="space-y-2">
            {services.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, x: 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.12 }}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${s.status === "up" ? "bg-emerald-400" : "bg-amber-400"} [animation:pulse-glow_1.8s_ease-in-out_infinite]`} />
                  <span className="text-[11px] text-white/70">{s.name}</span>
                </div>
                <span className={`text-[10px] ${s.status === "up" ? "text-white/40" : "text-amber-300"}`}>{s.ms}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Live activity feed ───────────────────────── */

const EVENTS = [
  { icon: "✓", text: "web-01 responded in 126ms", tone: "text-emerald-300" },
  { icon: "🔒", text: "api.example.com SSL valid — 47 days left", tone: "text-cyan-300" },
  { icon: "✓", text: "checkout-service keyword check passed", tone: "text-emerald-300" },
  { icon: "▲", text: "eu-west latency 512ms — degraded", tone: "text-amber-300" },
  { icon: "✓", text: "db-primary CPU 31% · memory 58%", tone: "text-emerald-300" },
  { icon: "◆", text: "DNS A record for acme.io resolved", tone: "text-violet-300" },
  { icon: "✓", text: "Incident #2481 auto-resolved on recovery", tone: "text-emerald-300" },
];

export function LiveActivityFeed() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % EVENTS.length), 2600);
    return () => clearInterval(t);
  }, []);
  const shown = [0, 1, 2].map((o) => EVENTS[(idx + o) % EVENTS.length]);
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
        <p className="text-xs font-medium text-white/60">Live activity</p>
      </div>
      <div className="space-y-2.5">
        {shown.map((e, i) => (
          <div
            key={`${idx}-${i}`}
            className="flex items-center gap-2.5 text-xs"
            style={{ animation: "ticker-up 2.6s ease-in-out", opacity: i === 0 ? 1 : 0.55 }}
          >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/5 text-[10px] ${e.tone}`}>{e.icon}</span>
            <span className="truncate text-white/70">{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Technology marquee ───────────────────────── */

const TECH = [
  "Linux", "Windows", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "PostgreSQL",
  "MySQL", "Redis", "Nginx", "Apache", "Prometheus", "Grafana", "Terraform", "GitHub Actions",
];

export function TechMarquee() {
  const row = [...TECH, ...TECH];
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="flex w-max animate-marquee gap-3">
        {row.map((t, i) => (
          <span
            key={i}
            className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/60"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Animated stat counter ───────────────────────── */

export function StatCounter({ to, suffix = "", label, prefix = "" }: { to: number; suffix?: string; label: string; prefix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
        {prefix}
        {n}
        {suffix}
      </p>
      <p className="mt-1 text-xs text-white/45 md:text-sm">{label}</p>
    </div>
  );
}
