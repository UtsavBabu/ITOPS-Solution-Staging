// Moonsav ITOps Academy brand mark — deliberately distinct from both the
// main ITOps Solution mark (blue→emerald cloud+pulse) and CyberSachet's
// rose/sky palette: a graduation cap over a hexagonal badge, amber→indigo,
// reading as "certified technical training" rather than security or
// monitoring. Same component shape as BrandLogo.jsx (mark, full lockup,
// loading state) for consistency with the rest of the brand system.
import { useId } from "react";

export function AcademyMark({ size = 28, className = "", mono = false }) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fill = mono ? "currentColor" : `url(#ag${gid})`;
  return <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label="Moonsav ITOps Academy" fill="none">
      {!mono && <defs>
          <linearGradient id={`ag${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>}
      {/* hexagonal badge */}
      <path d="M32 4 L56 17.5 V44.5 L32 58 L8 44.5 V17.5 Z" stroke={fill} strokeWidth="3" strokeLinejoin="round" />
      {/* graduation cap */}
      <path d="M32 22 L50 29.5 L32 37 L14 29.5 Z" fill={fill} />
      <path d="M22 32.5 V41 C22 44 26.5 46.5 32 46.5 C37.5 46.5 42 44 42 41 V32.5" stroke={fill} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M46 30.5 V39.5" stroke={fill} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="46" cy="42" r="2" fill={mono ? "currentColor" : "#f59e0b"} />
    </svg>;
}

/** Full horizontal lockup: mark + "Moonsav ITOps Academy" wordmark. */
export function AcademyLogo({ size = 30, className = "", tagline = false }) {
  const nameSize = size * 0.5;
  const subSize = Math.max(size * 0.24, 7);
  return <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <AcademyMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-semibold tracking-tight text-white light:text-slate-900" style={{ fontSize: nameSize }}>
          Moonsav <span className="bg-gradient-to-r from-amber-400 to-indigo-400 bg-clip-text text-transparent">ITOps Academy</span>
        </span>
        {tagline && <span className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white/45 light:text-slate-400" style={{ fontSize: subSize }}>
            Cloud · DevOps · Infrastructure · Cybersecurity
          </span>}
      </span>
    </span>;
}
