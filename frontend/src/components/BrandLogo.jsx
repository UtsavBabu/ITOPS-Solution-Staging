// Official ITOps Solution brand system, derived from the company logo:
// a cloud with a heartbeat pulse inside an orbit ring, navy→emerald gradient.
// Colors are brightened relative to the print logo so the mark stays clearly
// visible on the platform's dark surfaces (the print navy vanishes on black).
import { useId } from "react";
export function BrandMark({
  size = 28,
  className = "",
  mono = false
}) {
  // Unique gradient id per instance — duplicated SVG ids break fills when the
  // mark appears more than once on a page.
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const stroke = mono ? "currentColor" : `url(#g${gid})`;
  return <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label="ITOps Solution" fill="none">
      {!mono && <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>}
      {/* orbit ring with satellite nodes (from the logo's outer circle) */}
      <circle cx="32" cy="32" r="29" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="150 32" opacity="0.5" transform="rotate(-40 32 32)" />
      <circle cx="50.5" cy="9.5" r="3.2" fill={mono ? "currentColor" : "#34d399"} />
      <circle cx="13.5" cy="54.5" r="3.2" fill={mono ? "currentColor" : "#3b82f6"} />
      {/* cloud */}
      <path d="M17.5 42.5a9 9 0 0 1 1.6-17.8 12.5 12.5 0 0 1 24.3-2.5 9.5 9.5 0 0 1 3.5 18.6" stroke={stroke} strokeWidth="3.4" strokeLinecap="round" />
      {/* heartbeat pulse crossing the cloud */}
      <path d="M7 36.5h13.5l3.6-8.5 5.6 16.5 4.4-11 2.6 3h20.3" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
}
/** Full horizontal lockup: mark + ITOps / SOLUTION wordmark. */
export function BrandLogo({
  size = 30,
  className = "",
  tagline = false
}) {
  const nameSize = size * 0.62;
  const subSize = Math.max(size * 0.24, 7);
  return <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-semibold tracking-tight text-white light:text-slate-900" style={{
        fontSize: nameSize
      }}>
          IT<span className="text-gradient">Ops</span>
        </span>
        <span className="mt-[3px] font-medium uppercase text-emerald-300/90 light:text-emerald-600" style={{
        fontSize: subSize,
        letterSpacing: "0.32em"
      }}>
          Solution
        </span>
        {tagline && <span className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white/45 light:text-slate-400">
            Monitor · Secure · Optimize · Simplify
          </span>}
      </span>
    </span>;
}

/** Branded full-screen loading state used by route guards — a sonar-ping ring "scanning" the brand mark. */
export function BrandLoading() {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black light:bg-slate-50">
      <div className="relative grid h-24 w-24 place-items-center">
        <span className="absolute h-16 w-16 rounded-full border border-emerald-400/25 animate-sonar" />
        <span className="absolute h-16 w-16 rounded-full border border-emerald-400/25 animate-sonar [animation-delay:0.6s]" />
        <BrandMark size={44} />
      </div>
      <p className="text-sm text-white/40 light:text-slate-400">Loading…</p>
    </div>;
}