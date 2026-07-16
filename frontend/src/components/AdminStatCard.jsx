import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { AnimatedCounter } from "./AnimatedCounter";
const EASE = [0.16, 1, 0.3, 1];
const ICONS = {
  organizations: <path d="M4 5.5h16v5H4zM4 13.5h16v5H4zM7 8h.01M7 16h.01M11 8h4M11 16h2" />,
  users: <path d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9 10a4 4 0 100-8 4 4 0 000 8zm10 10v-2a4 4 0 00-3-3.87M15 3.13a4 4 0 010 7.75" />,
  monitors: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9m0-18C9.5 5.4 8.2 8.6 8.2 12s1.3 6.6 3.8 9M3.5 9h17M3.5 15h17" />,
  incidents: <path d="M12 9v4m0 4h.01M10.3 4.3l-8 14A1 1 0 003 20h18a1 1 0 00.9-1.5l-8-14a1 1 0 00-1.6 0z" />,
  waitlist: <path d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />,
  messages: <path d="M4 5h16v11H7l-3 3z" />,
  hosts: <path d="M4 5h16v5H4zM4 14h16v5H4zM7 7.5h.01M7 16.5h.01" />,
  security: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
};
export function AdminStatCard({
  label,
  value,
  tone = "default",
  icon,
  delay = 0,
  to
}) {
  const ref = useRef(null);
  const glowRgb = tone === "warning" ? "251,191,36" : "251,191,36";
  function handleMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  const card = <motion.div ref={ref} onMouseMove={handleMove} initial={{
    opacity: 0,
    y: 16
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.5,
    delay,
    ease: EASE
  }} className={`group relative overflow-hidden rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white light:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_4px_16px_-8px_rgba(15,23,42,0.12)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 light:hover:border-slate-900/20 hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.7)] ${to ? "cursor-pointer" : ""}`}>
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{
      background: `radial-gradient(220px circle at var(--mx, 50%) var(--my, 0px), rgba(${glowRgb},0.07), transparent 60%)`
    }} />
      <div className="relative flex items-center justify-between">
        <p className="text-sm text-white/50 light:text-slate-500">{label}</p>
        {icon && ICONS[icon] && <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone === "warning" ? "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700" : "bg-white/[0.04] light:bg-slate-900/[0.04] text-white/40 light:text-slate-500"}`}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[icon]}
            </svg>
          </span>}
      </div>
      <p className={`relative mt-2 text-2xl font-medium tracking-tight tabular-nums ${tone === "warning" ? "text-amber-300" : "text-white light:text-slate-900"}`}>
        <AnimatedCounter value={value} />
      </p>
    </motion.div>;
  return to ? <Link to={to} className="block">{card}</Link> : card;
}