import { useRef } from "react";
import { motion } from "motion/react";
import { AnimatedCounter } from "./AnimatedCounter";
import { useTheme } from "../context/ThemeContext";
const EASE = [0.16, 1, 0.3, 1];
const ICONS = {
  monitors: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9m0-18C9.5 5.4 8.2 8.6 8.2 12s1.3 6.6 3.8 9M3.5 9h17M3.5 15h17" />,
  up: <path d="M5 13l4 4L19 7" />,
  down: <path d="M12 9v4m0 4h.01M10.3 4.3l-8 14A1 1 0 003 20h18a1 1 0 00.9-1.5l-8-14a1 1 0 00-1.6 0z" />,
  incidents: <path d="M12 3v2m0 14v2M5 12H3m18 0h-2M12 8a4 4 0 014 4c0 2.5 1 3.5 2 4H6c1-.5 2-1.5 2-4a4 4 0 014-4zm-1.5 10a1.5 1.5 0 003 0" />,
  assets: <path d="M4 5.5h16v5H4zM4 13.5h16v5H4zM7 8h.01M7 16h.01M11 8h4M11 16h2" />,
  ssl: <path d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3zm-2.8 9.2l2 2 3.8-4" />
};
export function StatCard({
  label,
  value,
  tone = "default",
  icon,
  delay = 0
}) {
  const ref = useRef(null);
  const { theme } = useTheme();
  const toneClass = tone === "danger" ? "text-red-400" : tone === "warning" ? "text-amber-300" : "text-white light:text-slate-900";
  const iconTone = tone === "danger" ? "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700" : tone === "warning" ? "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700" : "bg-white/[0.04] light:bg-slate-900/[0.04] text-white/40 light:text-slate-500";
  // "default" tone's glow is a white highlight against a dark card — invisible
  // on a light-mode white card, so it needs a dark glow instead (see SpotlightCard).
  const glowRgb = tone === "danger" ? "248,113,113" : tone === "warning" ? "251,191,36" : theme === "light" ? "15,23,42" : "255,255,255";
  function handleMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  return <motion.div ref={ref} onMouseMove={handleMove} initial={{
    opacity: 0,
    y: 16
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.5,
    delay,
    ease: EASE
  }} className="group relative overflow-hidden rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white light:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_4px_16px_-8px_rgba(15,23,42,0.12)] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 light:hover:border-slate-900/20 hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.7)]">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{
      background: `radial-gradient(220px circle at var(--mx, 50%) var(--my, 0px), rgba(${glowRgb},0.08), transparent 60%)`
    }} />
      <div className="relative flex items-center justify-between">
        <p className="text-sm text-white/50 light:text-slate-500">{label}</p>
        {icon && ICONS[icon] && <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${iconTone}`}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[icon]}
            </svg>
          </span>}
      </div>
      <p className={`relative mt-1 text-2xl font-medium tracking-tight tabular-nums ${toneClass}`}>
        <AnimatedCounter value={value} />
      </p>
    </motion.div>;
}