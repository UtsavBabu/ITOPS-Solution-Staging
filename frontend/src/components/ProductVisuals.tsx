import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";

/* ───────────────────────── Animated dashboard mockup ─────────────────────────
 * An illustrative preview of the product UI (sample data, like any SaaS product
 * screenshot). Self-animating SVG — no per-frame React renders. */

const AREA_PATH = "M0,70 C40,55 70,80 110,60 150,40 190,66 230,48 270,30 310,58 350,38 390,24 430,50 470,34 L470,120 L0,120 Z";
const LINE_PATH = "M0,70 C40,55 70,80 110,60 150,40 190,66 230,48 270,30 310,58 350,38 390,24 430,50 470,34";

// Decimal-capable count-up used by the dashboard mockup's mini stats — plain
// numbers read as static on a page that's supposed to feel "live".
function useCountUp(to: number, active: boolean, duration = 1200): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(eased * to);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, duration]);
  return n;
}

function MiniStat({
  label,
  to,
  decimals = 0,
  suffix = "",
  tone,
  active,
}: {
  label: string;
  to: number;
  decimals?: number;
  suffix?: string;
  tone: string;
  active: boolean;
}) {
  const n = useCountUp(to, active);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${tone}`}>
        {n.toFixed(decimals)}
        {suffix}
      </p>
    </div>
  );
}

export function DashboardMockup() {
  const services = [
    { name: "api.production", status: "up", ms: "126ms", load: 42 },
    { name: "checkout-service", status: "up", ms: "89ms", load: 28 },
    { name: "web-01 · host", status: "up", ms: "cpu 31%", load: 31 },
    { name: "eu-west gateway", status: "degraded", ms: "512ms", load: 87 },
  ];
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "-80px" });
  return (
    <div ref={rootRef} className="glass overflow-hidden rounded-2xl shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
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
            <MiniStat label="Uptime" to={99.98} decimals={2} suffix="%" tone="text-emerald-300" active={inView} />
            <MiniStat label="Incidents" to={0} tone="text-white" active={inView} />
            <MiniStat label="Checks/min" to={1.2} decimals={1} suffix="k" tone="text-cyan-300" active={inView} />
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
                className="group rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                title={`${s.name} · load ${s.load}%`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.status === "up" ? "bg-emerald-400" : "bg-amber-400"} [animation:pulse-glow_1.8s_ease-in-out_infinite]`} />
                    <span className="text-[11px] text-white/70">{s.name}</span>
                  </div>
                  <span className={`text-[10px] ${s.status === "up" ? "text-white/40" : "text-amber-300"}`}>{s.ms}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className={`h-full rounded-full ${s.status === "up" ? "bg-emerald-400/60" : "bg-amber-400/70"}`}
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${s.load}%` } : { width: 0 }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.12, ease: "easeOut" }}
                  />
                </div>
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

/* ───────────────────────── Feature icons (Six Services cards) ───────────────────────── */

const FEATURE_ICONS: Record<string, { gradient: string; path: string }> = {
  "Uptime & Response Time": {
    gradient: "linear-gradient(135deg, #0e7490, #22d3ee)",
    path: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3.5 3.5",
  },
  "SSL Certificate Monitoring": {
    gradient: "linear-gradient(135deg, #047857, #34d399)",
    path: "M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3zm-2.8 9.2l2 2 3.8-4",
  },
  "Security Posture Scoring": {
    gradient: "linear-gradient(135deg, #6d28d9, #a78bfa)",
    path: "M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3zm0 5v6m-3-3h6",
  },
  "Incident Tracking": {
    gradient: "linear-gradient(135deg, #be123c, #fb7185)",
    path: "M12 9v4m0 4h.01M10.3 4.3l-8 14A1 1 0 003 20h18a1 1 0 00.9-1.5l-8-14a1 1 0 00-1.6 0z",
  },
  "Multi-Channel Alerting": {
    gradient: "linear-gradient(135deg, #b45309, #fbbf24)",
    path: "M12 3v2m0 14v2M5 12H3m18 0h-2M12 8a4 4 0 014 4c0 2.5 1 3.5 2 4H6c1-.5 2-1.5 2-4a4 4 0 014-4zm-1.5 10a1.5 1.5 0 003 0",
  },
  "Asset Inventory": {
    gradient: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
    path: "M4 5.5h16v5H4zM4 13.5h16v5H4zM7 8h.01M7 16h.01M11 8h4M11 16h2",
  },
};

const FEATURE_ICON_FALLBACK = { gradient: "linear-gradient(135deg, #334155, #94a3b8)", path: "M4 7l8-4 8 4-8 4-8-4zm0 5l8 4 8-4M4 17l8 4 8-4" };

export function FeatureIcon({ title, size = 40 }: { title: string; size?: number }) {
  const meta = FEATURE_ICONS[title] ?? FEATURE_ICON_FALLBACK;
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-xl shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-110"
      style={{ width: size, height: size, background: meta.gradient }}
    >
      <svg viewBox="0 0 24 24" style={{ width: size * 0.55, height: size * 0.55 }} fill="none">
        <path d={meta.path} stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* ───────────────────────── Technology marquee (real brand logos) ───────────────────────── */

import {
  siLinux,
  siDocker,
  siKubernetes,
  siGooglecloud,
  siPostgresql,
  siMysql,
  siRedis,
  siNginx,
  siApache,
  siPrometheus,
  siGrafana,
  siTerraform,
  siGithubactions,
} from "simple-icons";

interface TechEntry {
  name: string;
  hex: string;
  path: string;
  viewBox?: string;
}

// Windows' four-pane mark, drawn as simple rects (simple-icons no longer ships
// Microsoft/AWS marks for trademark reasons; these stand-ins are unmistakable).
const WINDOWS_PATH = "M0 0h11v11H0zM13 0h11v11H13zM0 13h11v11H0zM13 13h11v11H13z";
// Generic cloud glyph, tinted with each provider's brand color.
const CLOUD_PATH =
  "M19.4 10.1a7 7 0 0 0-13.7-1A5.5 5.5 0 0 0 6.5 20h12a4.5 4.5 0 0 0 .9-8.9zM18.5 18h-12a3.5 3.5 0 0 1-.4-7l1.5-.1.3-1.5a5 5 0 0 1 9.8.7l.2 1.6h1.6a2.5 2.5 0 0 1 0 5z";

const TECH: TechEntry[] = [
  { name: "Linux", hex: siLinux.hex, path: siLinux.path },
  { name: "Windows", hex: "0078D4", path: WINDOWS_PATH },
  { name: "Docker", hex: siDocker.hex, path: siDocker.path },
  { name: "Kubernetes", hex: siKubernetes.hex, path: siKubernetes.path },
  { name: "AWS", hex: "FF9900", path: CLOUD_PATH },
  { name: "Azure", hex: "0078D4", path: CLOUD_PATH },
  { name: "Google Cloud", hex: siGooglecloud.hex, path: siGooglecloud.path },
  { name: "PostgreSQL", hex: siPostgresql.hex, path: siPostgresql.path },
  { name: "MySQL", hex: siMysql.hex, path: siMysql.path },
  { name: "Redis", hex: siRedis.hex, path: siRedis.path },
  { name: "Nginx", hex: siNginx.hex, path: siNginx.path },
  { name: "Apache", hex: siApache.hex, path: siApache.path },
  { name: "Prometheus", hex: siPrometheus.hex, path: siPrometheus.path },
  { name: "Grafana", hex: siGrafana.hex, path: siGrafana.path },
  { name: "Terraform", hex: siTerraform.hex, path: siTerraform.path },
  { name: "GitHub Actions", hex: siGithubactions.hex, path: siGithubactions.path },
];

export function TechChip({ tech }: { tech: TechEntry }) {
  return (
    <span className="group/chip inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/25 hover:text-white">
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} aria-hidden>
        <path d={tech.path} fill={`#${tech.hex}`} className="opacity-80 transition-opacity group-hover/chip:opacity-100" />
      </svg>
      {tech.name}
    </span>
  );
}

/** Chip looked up by display name — for CMS-driven tech lists on product pages. */
export function TechChipByName({ name }: { name: string }) {
  const tech = TECH.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (!tech) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/60">
        {name}
      </span>
    );
  }
  return <TechChip tech={tech} />;
}

export function TechMarquee() {
  const row = [...TECH, ...TECH];
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="flex w-max animate-marquee gap-3">
        {row.map((t, i) => (
          <TechChip key={i} tech={t} />
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
