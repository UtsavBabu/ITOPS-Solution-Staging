type Tint = "white" | "emerald" | "cyan" | "amber" | "blue" | "red";

const TINTS: Record<Tint, { line: string; glow: string; dot: string; soft: string; bright: string }> = {
  white: { line: "rgba(255,255,255,0.22)", glow: "rgba(255,255,255,0.16)", dot: "#ffffff", soft: "rgba(255,255,255,0.07)", bright: "rgba(255,255,255,0.9)" },
  emerald: { line: "rgba(52,211,153,0.30)", glow: "rgba(52,211,153,0.20)", dot: "#34d399", soft: "rgba(52,211,153,0.09)", bright: "rgba(110,231,183,0.95)" },
  cyan: { line: "rgba(34,211,238,0.30)", glow: "rgba(34,211,238,0.20)", dot: "#22d3ee", soft: "rgba(34,211,238,0.09)", bright: "rgba(103,232,249,0.95)" },
  amber: { line: "rgba(251,191,36,0.32)", glow: "rgba(251,191,36,0.22)", dot: "#fbbf24", soft: "rgba(251,191,36,0.10)", bright: "rgba(253,224,71,0.95)" },
  blue: { line: "rgba(96,165,250,0.30)", glow: "rgba(96,165,250,0.20)", dot: "#60a5fa", soft: "rgba(96,165,250,0.09)", bright: "rgba(147,197,253,0.95)" },
  red: { line: "rgba(248,113,113,0.32)", glow: "rgba(248,113,113,0.22)", dot: "#f87171", soft: "rgba(248,113,113,0.10)", bright: "rgba(252,165,165,0.95)" },
};

function gridStyle(color: string, size = 56) {
  return {
    backgroundImage:
      `repeating-linear-gradient(0deg, ${color} 0px, ${color} 1px, transparent 1px, transparent ${size}px), ` +
      `repeating-linear-gradient(90deg, ${color} 0px, ${color} 1px, transparent 1px, transparent ${size}px)`,
  };
}

/** Fine grid with a slow vertical scanning beam. Surveillance feel — used for the admin panel and CyberSachet. */
export function GridScanBackground({ tint = "white", fast = false }: { tint?: Tint; fast?: boolean }) {
  const c = TINTS[tint];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-90" style={gridStyle(c.soft)} />
      <div
        className="absolute inset-x-0 h-72"
        style={{
          background: `linear-gradient(to bottom, transparent, ${c.glow} 45%, ${c.glow} 55%, transparent)`,
          animation: `pbg-scan ${fast ? "4.5s" : "9s"} linear infinite`,
        }}
      />
      <div
        className="absolute inset-x-0 h-px"
        style={{ background: c.bright, boxShadow: `0 0 24px 4px ${c.glow}`, animation: `pbg-scan-line ${fast ? "4.5s" : "9s"} linear infinite` }}
      />
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 140px 30px rgba(0,0,0,0.5)" }} />
      <style>{`
        @keyframes pbg-scan { 0% { transform: translateY(-280px); } 100% { transform: translateY(110%); } }
        @keyframes pbg-scan-line { 0% { transform: translateY(-4px); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translateY(calc(110% + 140px)); opacity: 0; } }
      `}</style>
    </div>
  );
}

/** Rotating radar sweep with concentric rings and drifting blips. Access-scanning feel — used for auth pages. */
export function RadarSweepBackground({ tint = "white" }: { tint?: Tint }) {
  const c = TINTS[tint];
  const rings = [120, 240, 380, 540];
  const blips = [
    { top: "28%", left: "62%", delay: 0.4 },
    { top: "68%", left: "34%", delay: 1.6 },
    { top: "42%", left: "22%", delay: 2.8 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-50" style={gridStyle(c.soft, 64)} />
      <div
        className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2"
        style={{ animation: "pbg-spin 14s linear infinite" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${c.glow} 26deg, transparent 60deg)` }}
        />
      </div>
      {rings.map((size) => (
        <div
          key={size}
          className="absolute left-1/2 top-1/2 rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{ width: size, height: size, border: `1px solid ${c.line}` }}
        />
      ))}
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: c.dot }} />
      {blips.map((b, i) => (
        <div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            top: b.top,
            left: b.left,
            background: c.dot,
            boxShadow: `0 0 0 6px ${c.glow}`,
            animation: `pbg-blip 3.2s ease-in-out ${b.delay}s infinite`,
          }}
        />
      ))}
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 140px 30px rgba(0,0,0,0.5)" }} />
      <style>{`
        @keyframes pbg-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pbg-blip { 0%, 100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 1; transform: scale(1.6); } }
      `}</style>
    </div>
  );
}

const NODES = [
  { x: 12, y: 20 }, { x: 38, y: 12 }, { x: 64, y: 24 }, { x: 88, y: 16 },
  { x: 22, y: 48 }, { x: 50, y: 54 }, { x: 76, y: 44 }, { x: 8, y: 78 },
  { x: 34, y: 82 }, { x: 60, y: 76 }, { x: 84, y: 84 },
];
const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 6], [3, 6],
  [4, 5], [5, 6], [4, 7], [5, 8], [6, 9], [3, 10], [9, 10], [7, 8], [8, 9],
];

/** Sparse monitoring-node network, dimmer than the landing hero — persistent ambient wallpaper for the app shell. */
export function NetworkPulseBackground({ tint = "emerald" }: { tint?: Tint }) {
  const c = TINTS[tint];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={gridStyle(c.soft, 64)} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-70">
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            stroke={c.line}
            strokeWidth={0.12}
          />
        ))}
      </svg>
      {NODES.map((node, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: "translate(-50%, -50%)",
            background: c.dot,
            boxShadow: `0 0 0 5px ${c.glow}`,
            animation: `pbg-node 3.6s ease-in-out ${i * 0.35}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes pbg-node { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.95; } }`}</style>
    </div>
  );
}

/** Right-angle PCB-style traces that draw themselves in, with pulse dots. Infrastructure/architecture feel. */
export function CircuitTraceBackground({ tint = "emerald" }: { tint?: Tint }) {
  const c = TINTS[tint];
  const paths = [
    "M -5 15 L 30 15 L 30 35 L 60 35 L 60 10 L 105 10",
    "M -5 45 L 15 45 L 15 70 L 45 70 L 45 50 L 105 50",
    "M -5 85 L 25 85 L 25 60 L 55 60 L 55 92 L 105 92",
    "M 70 -5 L 70 22 L 95 22 L 95 105",
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={c.line}
            strokeWidth={0.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1,
              animation: `pbg-draw 2.4s ease-out ${0.2 + i * 0.25}s forwards`,
            }}
          />
        ))}
        {paths.map((d, i) => (
          <circle key={`dot-${i}`} r={0.7} fill={c.dot}>
            <animateMotion dur={`${6 + i}s`} repeatCount="indefinite" path={d} begin={`${1.5 + i * 0.4}s`} />
          </circle>
        ))}
      </svg>
      <style>{`@keyframes pbg-draw { to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}

/** Soft drifting blurred color blobs — calmest option, used for human-facing pages (Company, Support). */
export function AuroraBackground({ tint = "emerald" }: { tint?: Tint }) {
  const c = TINTS[tint];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full"
        style={{ background: c.glow, filter: "blur(90px)", animation: "pbg-drift-a 16s ease-in-out infinite" }}
      />
      <div
        className="absolute -right-32 top-10 h-[460px] w-[460px] rounded-full"
        style={{ background: c.soft, filter: "blur(100px)", animation: "pbg-drift-b 20s ease-in-out infinite" }}
      />
      <div className="absolute inset-0 opacity-30" style={gridStyle(c.soft, 72)} />
      <style>{`
        @keyframes pbg-drift-a { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(60px, 40px) scale(1.12); } }
        @keyframes pbg-drift-b { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-50px, 30px) scale(1.08); } }
      `}</style>
    </div>
  );
}

/** EKG-style traveling pulse line — "always watching" feel, used for Support and Pricing. */
export function HeartbeatLineBackground({ tint = "emerald" }: { tint?: Tint }) {
  const c = TINTS[tint];
  const path = "M0,50 L140,50 L155,20 L170,80 L185,50 L400,50 L415,20 L430,80 L445,50 L700,50 L715,15 L735,88 L750,50 L1000,50";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={gridStyle(c.soft, 64)} />
      {[30, 55, 78].map((yPercent, i) => (
        <svg key={i} viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-x-0 h-24 w-full" style={{ top: `${yPercent}%` }}>
          <path d={path} fill="none" stroke={c.line} strokeWidth={1} opacity={0.5} />
          <path
            d={path}
            fill="none"
            stroke={c.bright}
            strokeWidth={1.4}
            strokeDasharray="90 900"
            style={{ animation: `pbg-heartbeat ${7 + i * 1.5}s linear ${i * 1.2}s infinite` }}
          />
        </svg>
      ))}
      <style>{`@keyframes pbg-heartbeat { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -990; } }`}</style>
    </div>
  );
}

/** Live-metrics equalizer bars rising along the bottom edge — "scales with you" feel, used for Pricing. */
export function MetricBarsBackground({ tint = "emerald" }: { tint?: Tint }) {
  const c = TINTS[tint];
  const bars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={gridStyle(c.soft, 64)} />
      <div className="absolute bottom-0 left-0 right-0 flex h-64 items-end justify-between px-2">
        {bars.map((i) => (
          <div
            key={i}
            className="w-[2.6%] rounded-t-sm"
            style={{
              background: `linear-gradient(to top, ${c.glow}, transparent)`,
              height: `${20 + ((i * 37) % 60)}%`,
              animation: `pbg-bar ${3 + (i % 5) * 0.4}s ease-in-out ${(i % 7) * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes pbg-bar { 0%, 100% { transform: scaleY(0.7); opacity: 0.6; } 50% { transform: scaleY(1); opacity: 1; } }`}</style>
    </div>
  );
}
