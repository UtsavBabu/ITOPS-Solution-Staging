import { useTheme } from "../context/ThemeContext";
const TINTS = {
  white: {
    line: "rgba(255,255,255,0.22)",
    glow: "rgba(255,255,255,0.16)",
    dot: "#ffffff",
    soft: "rgba(255,255,255,0.07)",
    bright: "rgba(255,255,255,0.9)"
  },
  emerald: {
    line: "rgba(16,185,129,0.30)",
    glow: "rgba(16,185,129,0.20)",
    dot: "#10b981",
    soft: "rgba(16,185,129,0.09)",
    bright: "rgba(110,231,183,0.95)"
  },
  cyan: {
    line: "rgba(0,240,255,0.30)",
    glow: "rgba(0,240,255,0.20)",
    dot: "#00f0ff",
    soft: "rgba(0,240,255,0.09)",
    bright: "rgba(103,232,249,0.95)"
  },
  amber: {
    line: "rgba(251,191,36,0.32)",
    glow: "rgba(251,191,36,0.22)",
    dot: "#fbbf24",
    soft: "rgba(251,191,36,0.10)",
    bright: "rgba(253,224,71,0.95)"
  },
  blue: {
    line: "rgba(96,165,250,0.30)",
    glow: "rgba(96,165,250,0.20)",
    dot: "#60a5fa",
    soft: "rgba(96,165,250,0.09)",
    bright: "rgba(147,197,253,0.95)"
  },
  red: {
    line: "rgba(255,77,77,0.32)",
    glow: "rgba(255,77,77,0.22)",
    dot: "#ff4d4d",
    soft: "rgba(255,77,77,0.10)",
    bright: "rgba(255,159,159,0.95)"
  },
  violet: {
    line: "rgba(167,139,250,0.30)",
    glow: "rgba(167,139,250,0.20)",
    dot: "#a78bfa",
    soft: "rgba(167,139,250,0.09)",
    bright: "rgba(196,181,253,0.95)"
  },
  rose: {
    line: "rgba(251,113,133,0.32)",
    glow: "rgba(251,113,133,0.22)",
    dot: "#fb7185",
    soft: "rgba(251,113,133,0.10)",
    bright: "rgba(253,164,175,0.95)"
  }
};
function gridStyle(color, size = 56) {
  return {
    backgroundImage: `repeating-linear-gradient(0deg, ${color} 0px, ${color} 1px, transparent 1px, transparent ${size}px), ` + `repeating-linear-gradient(90deg, ${color} 0px, ${color} 1px, transparent 1px, transparent ${size}px)`
  };
}

/** Fine grid with a slow vertical scanning beam. Surveillance feel — used for the admin panel and CyberSachet. */
export function GridScanBackground({
  tint = "white",
  fast = false
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = TINTS[tint];
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-90" style={gridStyle(c.soft)} />
      <div className="absolute inset-x-0 h-72" style={{
      background: `linear-gradient(to bottom, transparent, ${c.glow} 45%, ${c.glow} 55%, transparent)`,
      animation: `pbg-scan ${fast ? "4.5s" : "9s"} linear infinite`
    }} />
      <div className="absolute inset-x-0 h-px" style={{
      background: c.bright,
      boxShadow: `0 0 24px 4px ${c.glow}`,
      animation: `pbg-scan-line ${fast ? "4.5s" : "9s"} linear infinite`
    }} />
      <div className="absolute inset-0" style={{
      boxShadow: isLight ? "inset 0 0 140px 30px rgba(100,116,139,0.15)" : "inset 0 0 140px 30px rgba(0,0,0,0.5)"
    }} />
      <style>{`
        @keyframes pbg-scan { 0% { transform: translateY(-280px); } 100% { transform: translateY(110%); } }
        @keyframes pbg-scan-line { 0% { transform: translateY(-4px); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translateY(calc(110% + 140px)); opacity: 0; } }
      `}</style>
    </div>;
}

/** Rotating radar sweep with concentric rings and drifting blips. Access-scanning feel — used on the Solution detail page. */
export function RadarSweepBackground({
  tint = "white"
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = TINTS[tint];
  const rings = [120, 240, 380, 540];
  const blips = [{
    top: "28%",
    left: "62%",
    delay: 0.4
  }, {
    top: "68%",
    left: "34%",
    delay: 1.6
  }, {
    top: "42%",
    left: "22%",
    delay: 2.8
  }];
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-50" style={gridStyle(c.soft, 64)} />
      <div className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2" style={{
      animation: "pbg-spin 14s linear infinite"
    }}>
        <div className="absolute inset-0" style={{
        background: `conic-gradient(from 0deg, transparent 0deg, ${c.glow} 26deg, transparent 60deg)`
      }} />
      </div>
      {rings.map(size => <div key={size} className="absolute left-1/2 top-1/2 rounded-full -translate-x-1/2 -translate-y-1/2" style={{
      width: size,
      height: size,
      border: `1px solid ${c.line}`
    }} />)}
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{
      background: c.dot
    }} />
      {blips.map((b, i) => <div key={i} className="absolute h-1.5 w-1.5 rounded-full" style={{
      top: b.top,
      left: b.left,
      background: c.dot,
      boxShadow: `0 0 0 6px ${c.glow}`,
      animation: `pbg-blip 3.2s ease-in-out ${b.delay}s infinite`
    }} />)}
      <div className="absolute inset-0" style={{
      boxShadow: isLight ? "inset 0 0 140px 30px rgba(100,116,139,0.15)" : "inset 0 0 140px 30px rgba(0,0,0,0.5)"
    }} />
      <style>{`
        @keyframes pbg-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pbg-blip { 0%, 100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 1; transform: scale(1.6); } }
      `}</style>
    </div>;
}
const NODES = [{
  x: 12,
  y: 20
}, {
  x: 38,
  y: 12
}, {
  x: 64,
  y: 24
}, {
  x: 88,
  y: 16
}, {
  x: 22,
  y: 48
}, {
  x: 50,
  y: 54
}, {
  x: 76,
  y: 44
}, {
  x: 8,
  y: 78
}, {
  x: 34,
  y: 82
}, {
  x: 60,
  y: 76
}, {
  x: 84,
  y: 84
}];
const EDGES = [[0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 6], [3, 6], [4, 5], [5, 6], [4, 7], [5, 8], [6, 9], [3, 10], [9, 10], [7, 8], [8, 9]];

/** Sparse monitoring-node network, dimmer than the landing hero — persistent ambient wallpaper for the app shell. */
export function NetworkPulseBackground({
  tint = "emerald"
}) {
  const c = TINTS[tint];
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={gridStyle(c.soft, 64)} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-70">
        {EDGES.map(([a, b], i) => <line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke={c.line} strokeWidth={0.12} />)}
      </svg>
      {NODES.map((node, i) => <div key={i} className="absolute h-1 w-1 rounded-full" style={{
      left: `${node.x}%`,
      top: `${node.y}%`,
      transform: "translate(-50%, -50%)",
      background: c.dot,
      boxShadow: `0 0 0 5px ${c.glow}`,
      animation: `pbg-node 3.6s ease-in-out ${i * 0.35}s infinite`
    }} />)}
      <style>{`@keyframes pbg-node { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.95; } }`}</style>
    </div>;
}

/** Right-angle PCB-style traces that draw themselves in, with pulse dots. Infrastructure/architecture feel. */
export function CircuitTraceBackground({
  tint = "emerald"
}) {
  const c = TINTS[tint];
  const paths = ["M -5 15 L 30 15 L 30 35 L 60 35 L 60 10 L 105 10", "M -5 45 L 15 45 L 15 70 L 45 70 L 45 50 L 105 50", "M -5 85 L 25 85 L 25 60 L 55 60 L 55 92 L 105 92", "M 70 -5 L 70 22 L 95 22 L 95 105"];
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {paths.map((d, i) => <path key={i} d={d} fill="none" stroke={c.line} strokeWidth={0.25} strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{
        strokeDasharray: 1,
        strokeDashoffset: 1,
        animation: `pbg-draw 2.4s ease-out ${0.2 + i * 0.25}s forwards`
      }} />)}
        {paths.map((d, i) => <circle key={`dot-${i}`} r={0.7} fill={c.dot}>
            <animateMotion dur={`${6 + i}s`} repeatCount="indefinite" path={d} begin={`${1.5 + i * 0.4}s`} />
          </circle>)}
      </svg>
      <style>{`@keyframes pbg-draw { to { stroke-dashoffset: 0; } }`}</style>
    </div>;
}

/** Soft drifting blurred color blobs — calmest option, used for human-facing pages (Company, Support). */
export function AuroraBackground({
  tint = "emerald"
}) {
  const c = TINTS[tint];
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full" style={{
      background: c.glow,
      filter: "blur(90px)",
      animation: "pbg-drift-a 16s ease-in-out infinite"
    }} />
      <div className="absolute -right-32 top-10 h-[460px] w-[460px] rounded-full" style={{
      background: c.soft,
      filter: "blur(100px)",
      animation: "pbg-drift-b 20s ease-in-out infinite"
    }} />
      <div className="absolute inset-0 opacity-30" style={gridStyle(c.soft, 72)} />
      <style>{`
        @keyframes pbg-drift-a { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(60px, 40px) scale(1.12); } }
        @keyframes pbg-drift-b { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-50px, 30px) scale(1.08); } }
      `}</style>
    </div>;
}

/** EKG-style traveling pulse line — "always watching" feel, used for Support and Pricing. */
export function HeartbeatLineBackground({
  tint = "emerald"
}) {
  const c = TINTS[tint];
  const path = "M0,50 L140,50 L155,20 L170,80 L185,50 L400,50 L415,20 L430,80 L445,50 L700,50 L715,15 L735,88 L750,50 L1000,50";
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={gridStyle(c.soft, 64)} />
      {[30, 55, 78].map((yPercent, i) => <svg key={i} viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-x-0 h-24 w-full" style={{
      top: `${yPercent}%`
    }}>
          <path d={path} fill="none" stroke={c.line} strokeWidth={1} opacity={0.5} />
          <path d={path} fill="none" stroke={c.bright} strokeWidth={1.4} strokeDasharray="90 900" style={{
        animation: `pbg-heartbeat ${7 + i * 1.5}s linear ${i * 1.2}s infinite`
      }} />
        </svg>)}
      <style>{`@keyframes pbg-heartbeat { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -990; } }`}</style>
    </div>;
}

/** Live-metrics equalizer bars rising along the bottom edge — "scales with you" feel, used for Pricing. */
export function MetricBarsBackground({
  tint = "emerald"
}) {
  const c = TINTS[tint];
  const bars = Array.from({
    length: 28
  }, (_, i) => i);
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={gridStyle(c.soft, 64)} />
      <div className="absolute bottom-0 left-0 right-0 flex h-64 items-end justify-between px-2">
        {bars.map(i => <div key={i} className="w-[2.6%] rounded-t-sm" style={{
        background: `linear-gradient(to top, ${c.glow}, transparent)`,
        height: `${20 + i * 37 % 60}%`,
        animation: `pbg-bar ${3 + i % 5 * 0.4}s ease-in-out ${i % 7 * 0.2}s infinite`
      }} />)}
      </div>
      <style>{`@keyframes pbg-bar { 0%, 100% { transform: scaleY(0.7); opacity: 0.6; } 50% { transform: scaleY(1); opacity: 1; } }`}</style>
    </div>;
}

const BOLTS = [
  { left: "16%", delay: 0.4, dur: 5.6 },
  { left: "48%", delay: 2.6, dur: 6.4 },
  { left: "78%", delay: 4.4, dur: 5.9 },
];

/**
 * Storm clouds + lightning strikes, each one "acquired" by a targeting
 * reticle right as it flashes — reads as the platform actively tracking and
 * containing a threat rather than a plain weather effect. Used for the
 * CyberSachet security product hero.
 */
export function ThunderstormBackground({ tint = "red" }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = TINTS[tint];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`absolute -top-24 left-1/4 h-72 w-96 rounded-full ${isLight ? "bg-slate-400/40" : "bg-black/70"}`}
        style={{ filter: "blur(60px)", animation: "pbg-cloud 22s ease-in-out infinite" }}
      />
      <div
        className={`absolute -top-16 right-1/4 h-64 w-80 rounded-full ${isLight ? "bg-slate-400/30" : "bg-black/60"}`}
        style={{ filter: "blur(70px)", animation: "pbg-cloud 26s ease-in-out infinite reverse" }}
      />
      <div className="absolute inset-0 opacity-40" style={gridStyle(c.soft, 56)} />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(100deg, ${c.line} 0px, ${c.line} 1px, transparent 1px, transparent 14px)`,
          animation: "pbg-rain 0.35s linear infinite",
        }}
      />
      {BOLTS.map((b, i) => (
        <div key={i} className="absolute top-0" style={{ left: b.left }}>
          <svg
            width="60"
            height="240"
            viewBox="0 0 60 240"
            className="absolute left-0 top-0"
            style={{ animation: `pbg-bolt ${b.dur}s ease-in-out ${b.delay}s infinite` }}
          >
            <path
              d="M28 0 L10 100 L26 100 L14 240 L50 88 L32 88 L44 0 Z"
              fill={c.bright}
              style={{ filter: `drop-shadow(0 0 14px ${c.glow})` }}
            />
          </svg>
          <span
            className="absolute h-10 w-10 rounded-full border-2"
            style={{
              left: 0,
              top: 82,
              borderColor: c.bright,
              boxShadow: `0 0 16px 2px ${c.glow}`,
              animation: `pbg-reticle ${b.dur}s ease-in-out ${b.delay}s infinite`,
            }}
          />
        </div>
      ))}
      <div className="absolute inset-0" style={{ boxShadow: isLight ? "inset 0 0 150px 30px rgba(100,116,139,0.18)" : "inset 0 0 150px 30px rgba(0,0,0,0.65)" }} />
      <style>{`
        @keyframes pbg-cloud { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,10px) scale(1.08); } }
        @keyframes pbg-rain { from { background-position: 0 0; } to { background-position: -14px 30px; } }
        @keyframes pbg-bolt { 0%, 91%, 100% { opacity: 0; } 92% { opacity: 1; } 93.5% { opacity: 0.2; } 95% { opacity: 1; } 97% { opacity: 0; } }
        @keyframes pbg-reticle { 0%, 90%, 100% { opacity: 0; transform: scale(1.7); } 93% { opacity: 1; transform: scale(1); } 99% { opacity: 0; transform: scale(0.85); } }
      `}</style>
    </div>
  );
}

const AURORA_NODES = [
  { x: 15, y: 22 }, { x: 42, y: 14 }, { x: 68, y: 26 }, { x: 88, y: 18 },
  { x: 26, y: 52 }, { x: 55, y: 58 }, { x: 80, y: 48 }, { x: 10, y: 80 },
  { x: 38, y: 84 }, { x: 64, y: 78 },
];
const AURORA_EDGES = [[0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 6], [4, 5], [5, 6], [4, 7], [5, 8], [6, 9], [8, 9]];
const AURORA_PARTICLES = [
  { x: 12, y: 30, size: 3, dur: 14, delay: 0 },
  { x: 30, y: 70, size: 2, dur: 18, delay: 2 },
  { x: 55, y: 20, size: 3, dur: 16, delay: 4 },
  { x: 72, y: 60, size: 2, dur: 20, delay: 1 },
  { x: 88, y: 35, size: 2.5, dur: 15, delay: 5 },
  { x: 20, y: 85, size: 2, dur: 22, delay: 3 },
];
const NOISE_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>";
const AURORA_TINTS = { blue: "#3b82f6", emerald: "#34d399", amber: "#fbbf24", cyan: "#22d3ee" };

/**
 * Enterprise-grade aurora background — deep navy base, slow blue/cyan aurora
 * waves with one small (deliberately minority-share) purple highlight,
 * subtle static noise, a low-opacity infrastructure grid, animated network
 * links, glowing nodes, and a few floating particles. Every animated
 * property is transform/opacity (GPU-compositable, cheap even layered).
 *
 * `intensity` trims which layers render:
 *   "ambient"    — one or two soft glows + a faint grid only. Used behind
 *                  the customer/admin dashboard shells: enough depth to not
 *                  look flat, not enough motion to distract from real work.
 *   "simplified" — adds aurora waves + nodes + a few particles. Used on
 *                  auth pages: a premium first impression behind one
 *                  centered card.
 *   "full"       — everything, including the network link lines. Not used
 *                  by default anywhere today — reserved for a future
 *                  standalone marketing moment.
 */
export function EnterpriseAuroraBackground({ intensity = "simplified", tint = "blue", forceDark = false }) {
  const { theme } = useTheme();
  const isLight = !forceDark && theme === "light";
  const accent = AURORA_TINTS[tint] ?? AURORA_TINTS.blue;
  const showWaves = intensity !== "ambient";
  const showNetwork = intensity === "full";
  const showNodes = intensity !== "ambient";
  const showParticles = intensity !== "ambient";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: isLight ? "#f8fafc" : "#0b1020" }}>
      {/* soft radial glows — present at every intensity, the base "depth" layer */}
      <div
        className="absolute -left-1/4 -top-1/4 h-[70%] w-[70%] rounded-full"
        style={{ background: `radial-gradient(circle, ${accent}26 0%, transparent 70%)`, filter: "blur(10px)", animation: "aurora-glow-a 26s ease-in-out infinite" }}
      />
      <div
        className="absolute -right-1/4 bottom-0 h-[65%] w-[65%] rounded-full"
        style={{ background: "radial-gradient(circle, #22d3ee1f 0%, transparent 70%)", filter: "blur(10px)", animation: "aurora-glow-b 32s ease-in-out infinite" }}
      />

      {showWaves && (
        <>
          <div
            className="absolute left-[-10%] top-[10%] h-[220px] w-[130%] opacity-60"
            style={{ background: "linear-gradient(100deg, transparent 0%, #3b82f633 20%, #22d3ee2e 45%, transparent 70%)", filter: "blur(40px)", animation: "aurora-wave-a 22s ease-in-out infinite" }}
          />
          <div
            className="absolute left-[-15%] top-[45%] h-[260px] w-[130%] opacity-50"
            style={{ background: "linear-gradient(100deg, transparent 5%, #22d3ee2e 30%, #3b82f628 55%, transparent 80%)", filter: "blur(46px)", animation: "aurora-wave-b 28s ease-in-out infinite" }}
          />
          {/* one small purple highlight — an accent, deliberately not a second dominant hue */}
          <div
            className="absolute right-[8%] top-[18%] h-40 w-40 rounded-full"
            style={{ background: "radial-gradient(circle, #a78bfa2e 0%, transparent 72%)", filter: "blur(30px)", animation: "aurora-glow-a 24s ease-in-out infinite reverse" }}
          />
        </>
      )}

      {/* low-opacity infrastructure grid */}
      <div className="absolute inset-0 opacity-[0.12]" style={gridStyle("rgba(148,163,184,0.5)", 56)} />

      {/* subtle noise texture — static image, zero animation cost */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: `url("data:image/svg+xml,${NOISE_SVG}")`, backgroundSize: "120px 120px" }}
      />

      {showNetwork && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-40">
          {AURORA_EDGES.map(([a, b], i) => (
            <line key={i} x1={AURORA_NODES[a].x} y1={AURORA_NODES[a].y} x2={AURORA_NODES[b].x} y2={AURORA_NODES[b].y} stroke={`${accent}55`} strokeWidth={0.12} />
          ))}
        </svg>
      )}

      {showNodes && AURORA_NODES.slice(0, 6).map((n, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{ left: `${n.x}%`, top: `${n.y}%`, background: accent, boxShadow: `0 0 0 4px ${accent}22`, animation: `aurora-node 3.6s ease-in-out ${i * 0.4}s infinite` }}
        />
      ))}

      {showParticles && AURORA_PARTICLES.map((p, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${isLight ? "bg-slate-500" : "bg-white"}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: isLight ? 0.35 : 0.25, animation: `aurora-float ${p.dur}s ease-in-out ${p.delay}s infinite` }}
        />
      ))}

      <div className="absolute inset-0" style={{ boxShadow: isLight ? "inset 0 0 200px 60px rgba(148,163,184,0.25)" : "inset 0 0 200px 60px rgba(2,4,12,0.65)" }} />

      <style>{`
        @keyframes aurora-glow-a { 0%, 100% { transform: translate(0,0) scale(1); opacity: 0.8; } 50% { transform: translate(3%, 2%) scale(1.08); opacity: 1; } }
        @keyframes aurora-glow-b { 0%, 100% { transform: translate(0,0) scale(1); opacity: 0.7; } 50% { transform: translate(-3%, -2%) scale(1.1); opacity: 1; } }
        @keyframes aurora-wave-a { 0%, 100% { transform: translateX(0) translateY(0); } 50% { transform: translateX(3%) translateY(-1.5%); } }
        @keyframes aurora-wave-b { 0%, 100% { transform: translateX(0) translateY(0); } 50% { transform: translateX(-3%) translateY(1.5%); } }
        @keyframes aurora-node { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
        @keyframes aurora-float { 0%, 100% { transform: translate(0, 0); opacity: 0.15; } 50% { transform: translate(6px, -14px); opacity: 0.4; } }
      `}</style>
    </div>
  );
}