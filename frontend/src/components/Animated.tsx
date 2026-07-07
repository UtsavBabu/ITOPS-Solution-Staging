import { useRef } from "react";
import type { ReactNode, CSSProperties } from "react";
import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fades + lifts its children into view the first time they scroll into frame. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

type Tint = "white" | "emerald" | "cyan" | "amber" | "blue" | "violet";

const TINT_RGB: Record<Tint, string> = {
  white: "255,255,255",
  emerald: "52,211,153",
  cyan: "34,211,238",
  amber: "251,191,36",
  blue: "96,165,250",
  violet: "167,139,250",
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
}: {
  children: ReactNode;
  className?: string;
  tint?: Tint;
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rgb = TINT_RGB[tint];

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      style={style}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] ${className}`}
    >
      {/* cursor spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(340px circle at var(--mx, 50%) var(--my, 0px), rgba(${rgb},0.12), transparent 42%)` }}
      />
      {/* top accent line grows from center on hover */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px w-0 transition-all duration-500 group-hover:w-full"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.7), transparent)` }}
      />
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
}
