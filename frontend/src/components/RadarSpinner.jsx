const TINT_HEX = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  white: "#ffffff"
};

/**
 * A small rotating radar-sweep loader — the "scanning" equivalent of a
 * spinner, used for full-panel/page loading moments instead of a generic
 * circular spinner, to match the platform's surveillance/monitoring visual
 * language (see PageBackgrounds.tsx's RadarSweepBackground).
 */
export function RadarSpinner({
  size = 28,
  tint = "cyan"
}) {
  const c = TINT_HEX[tint];
  return <div className="relative shrink-0 animate-spin" style={{
    width: size,
    height: size,
    animationDuration: "1.1s"
  }} role="status" aria-label="Loading">
      <div className="absolute inset-0 rounded-full border border-white/10" />
      <div className="absolute inset-0 rounded-full" style={{
      background: `conic-gradient(from 0deg, transparent 0deg, ${c}66 55deg, transparent 90deg)`
    }} />
      <div className="absolute inset-[15%] rounded-full bg-[var(--bg-base)]" />
    </div>;
}