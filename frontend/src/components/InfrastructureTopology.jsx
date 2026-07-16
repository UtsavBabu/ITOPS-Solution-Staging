import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "../context/ThemeContext";
import { BrandMark } from "./BrandLogo";
import { FeatureIcon } from "./ProductVisuals";

const EASE = [0.16, 1, 0.3, 1];
const R = 150;
const CENTER = 200;
const TINTS = ["#22d3ee", "#34d399", "#60a5fa", "#a78bfa", "#fb7185", "#fbbf24", "#2dd4bf", "#f472b6"];

function layout(items) {
  return items.map((item, i) => {
    const angle = (-90 + i * (360 / items.length)) * (Math.PI / 180);
    const x = CENTER + R * Math.cos(angle);
    const y = CENTER + R * Math.sin(angle);
    const dx = x - CENTER;
    const dy = y - CENTER;
    // Anchor the hover card on whichever axis points furthest away from the
    // hub, so it opens outward into empty space instead of toward the
    // crowded center where the other nodes live.
    const side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "bottom" : "top");
    return { ...item, tint: TINTS[i % TINTS.length], x, y, side };
  });
}

const SIDE_CLASSES = {
  top: "bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2",
  bottom: "top-[calc(100%+14px)] left-1/2 -translate-x-1/2",
  left: "right-[calc(100%+14px)] top-1/2 -translate-y-1/2",
  right: "left-[calc(100%+14px)] top-1/2 -translate-y-1/2"
};
const SIDE_MOTION = {
  top: { y: 6 },
  bottom: { y: -6 },
  left: { x: 6 },
  right: { x: -6 }
};

function NodeCard({ n }) {
  const offset = SIDE_MOTION[n.side];
  return <motion.div initial={{ opacity: 0, scale: 0.96, ...offset }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} exit={{ opacity: 0, scale: 0.96, ...offset }} transition={{ duration: 0.15, ease: EASE }} className={`pointer-events-none absolute z-10 w-52 rounded-xl border border-white/10 light:border-slate-900/10 bg-neutral-950 light:bg-white p-3.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] light:shadow-[0_20px_50px_-15px_rgba(15,23,42,0.25)] ${SIDE_CLASSES[n.side]}`}>
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-white light:text-slate-900">{n.title}</h4>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${n.status === "live" ? "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700" : "bg-white/10 light:bg-slate-900/8 text-white/60 light:text-slate-500"}`}>
          {n.status === "live" ? "Live" : "Roadmap"}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-white/60 light:text-slate-500">
        {n.body || n.subtitle || "Part of the ITOps Monitor platform — feeds the same dashboard, incidents, and alerts as every other module."}
      </p>
      {n.href && <Link to={n.href} className="pointer-events-auto mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200">
          View details <span aria-hidden>→</span>
        </Link>}
    </motion.div>;
}

/**
 * Hub-and-spoke visualization of the real product architecture — every
 * live module feeding one central dashboard, with small pulses of "data"
 * traveling inward along each connection. `items` is the same admin-edited
 * content the pill list below it renders (Content Manager → Landing →
 * Platform Preview), so editing a title/description there updates both.
 * Hovering a node shows a small detail card anchored on whichever side of
 * the node points away from the hub (so it opens into clear space instead
 * of overlapping a neighboring node), and the hovered node is always
 * stacked above its siblings so its card is never covered by them.
 */
export function InfrastructureTopology({ items }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const lineStroke = isLight ? "rgba(15,23,42,0.14)" : "rgba(255,255,255,0.14)";
  const [activeId, setActiveId] = useState(null);

  if (!items || items.length === 0) return null;
  const nodes = layout(items);

  return <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {nodes.map((n, i) => <motion.line key={`line-${i}`} x1={n.x} y1={n.y} x2={CENTER} y2={CENTER} stroke={lineStroke} strokeWidth={1.5} initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.15 + i * 0.08, ease: EASE }} />)}
        {nodes.map((n, i) => <motion.circle key={`pulse-${i}`} r={3} fill={n.tint} initial={{ opacity: 0 }} animate={{ cx: [n.x, CENTER], cy: [n.y, CENTER], opacity: [0, 1, 1, 0] }} transition={{ duration: 2.6, repeat: Infinity, delay: 1.4 + i * 0.4, ease: "easeIn" }} style={{ filter: `drop-shadow(0 0 4px ${n.tint})` }} />)}
      </svg>

      {/* Central hub */}
      <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}>
        <div className="relative grid h-20 w-20 place-items-center rounded-2xl border border-white/15 light:border-slate-900/10 bg-neutral-900 light:bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] light:shadow-[0_20px_50px_-15px_rgba(15,23,42,0.25)]">
          <span className="absolute inset-0 rounded-2xl border border-cyan-400/30 [animation:pulse-glow_2.4s_ease-in-out_infinite]" />
          <BrandMark size={36} />
        </div>
        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-wide text-white/50 light:text-slate-500">Dashboard</p>
      </motion.div>

      {/* Module nodes — hover (or tap, on touch devices) shows an anchored detail card */}
      {nodes.map((n, i) => <motion.div key={n.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x / 4}%`, top: `${n.y / 4}%`, zIndex: activeId === n.id ? 30 : 1 }} initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 + i * 0.08, ease: EASE }}>
          <div className="relative" onMouseEnter={() => setActiveId(n.id)} onMouseLeave={() => setActiveId(a => a === n.id ? null : a)}>
            <button type="button" onFocus={() => setActiveId(n.id)} onBlur={() => setActiveId(a => a === n.id ? null : a)} onClick={() => setActiveId(a => a === n.id ? null : n.id)} className="group/node flex flex-col items-center gap-1.5" aria-label={`${n.title} details`} aria-expanded={activeId === n.id}>
              <span className="rounded-2xl ring-0 ring-offset-4 ring-offset-transparent transition-all duration-200 group-hover/node:ring-2 group-hover/node:ring-offset-0" style={{ "--tw-ring-color": `${n.tint}55` }}>
                <FeatureIcon title={n.title} size={40} />
              </span>
              <p className="max-w-[74px] text-center text-[10px] font-medium leading-tight text-white/55 light:text-slate-500 transition-colors group-hover/node:text-white light:group-hover/node:text-slate-900">
                {n.title}
              </p>
            </button>
            <AnimatePresence>
              {activeId === n.id && <NodeCard n={n} />}
            </AnimatePresence>
          </div>
        </motion.div>)}
    </div>;
}
