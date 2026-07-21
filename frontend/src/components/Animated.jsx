import { useRef } from "react";
import { motion } from "motion/react";
import { useTheme } from "../context/ThemeContext";
const EASE = [0.16, 1, 0.3, 1];

/** Fades + lifts its children into view the first time they scroll into frame. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div"
}) {
  const MotionTag = motion[as];
  return <MotionTag className={className} initial={{
    opacity: 0,
    y
  }} whileInView={{
    opacity: 1,
    y: 0
  }} viewport={{
    once: true,
    margin: "-70px"
  }} transition={{
    duration: 0.7,
    delay,
    ease: EASE
  }}>
      {children}
    </MotionTag>;
}
const TINT_RGB = {
  white: "255,255,255",
  emerald: "16,185,129",
  cyan: "0,240,255",
  amber: "251,191,36",
  blue: "96,165,250",
  violet: "167,139,250",
  rose: "251,113,133",
  red: "255,77,77"
};

/**
 * Interactive card: a cursor-following radial spotlight, an animated top accent
 * line that grows on hover, a gentle lift, and a scroll-reveal entrance.
 * Drop-in replacement for the plain `rounded-2xl border bg-neutral-900/60` cards.
 */
export function SpotlightCard({
  children,
  className = "",
  tint = "white",
  delay = 0,
  style,
  scan = false,
  overflowVisible = false
}) {
  const ref = useRef(null);
  const { theme } = useTheme();
  // The default "white" tint's glow/accent/scan effects rely on rgba(255,255,255,…)
  // reading as a bright highlight against a dark card — on a light-mode white card
  // that's a white glow on white, i.e. invisible. Swap to a dark slate glow instead;
  // every other tint is a saturated color and reads fine on either surface.
  const rgb = tint === "white" && theme === "light" ? "15,23,42" : TINT_RGB[tint];
  function handleMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  return <motion.div ref={ref} onMouseMove={handleMove} initial={{
    opacity: 0,
    y: 24
  }} whileInView={{
    opacity: 1,
    y: 0
  }} viewport={{
    once: true,
    margin: "-70px"
  }} transition={{
    duration: 0.6,
    delay,
    ease: EASE
  }} style={style} className={`group relative ${overflowVisible ? "" : "overflow-hidden"} rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white light:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_4px_16px_-8px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-white/25 light:hover:border-slate-900/20 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] light:hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.2)] ${className}`}>
      {/* cursor spotlight */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{
      background: `radial-gradient(340px circle at var(--mx, 50%) var(--my, 0px), rgba(${rgb},0.12), transparent 42%)`
    }} />
      {/* top accent line grows from center on hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px w-0 transition-all duration-500 group-hover:w-full" style={{
      background: `linear-gradient(90deg, transparent, rgba(${rgb},0.7), transparent)`
    }} />
      {/* one-time scan beam sweeping down the card as it enters view */}
      {scan && <motion.div className="pointer-events-none absolute inset-x-0 h-16" style={{
      background: `linear-gradient(to bottom, transparent, rgba(${rgb},0.16), transparent)`
    }} initial={{
      top: "-20%"
    }} whileInView={{
      top: "115%"
    }} viewport={{
      once: true,
      margin: "-70px"
    }} transition={{
      duration: 1,
      delay: delay + 0.2,
      ease: "easeInOut"
    }} />}
      <div className="relative h-full">{children}</div>
    </motion.div>;
}