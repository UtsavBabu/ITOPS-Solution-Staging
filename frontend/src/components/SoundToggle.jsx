import { useSound } from "../context/SoundContext";

export function SoundToggle({ className = "" }) {
  const { enabled, toggle } = useSound();
  return <button
    type="button"
    onClick={toggle}
    aria-label={enabled ? "Turn off interface sounds" : "Turn on interface sounds"}
    aria-pressed={enabled}
    title={enabled ? "Interface sounds on" : "Interface sounds off"}
    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 light:border-slate-900/12 text-white/70 light:text-slate-600 transition-colors hover:border-white/30 light:hover:border-slate-900/25 hover:text-white light:hover:text-slate-900 ${className}`}
  >
    {enabled ? (
      // Speaker with sound waves — sounds on, click to mute
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M17 8.5a5 5 0 010 7M19.5 6a8.5 8.5 0 010 12" />
      </svg>
    ) : (
      // Muted speaker — sounds off, click to enable
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M17.5 10l4 4M21.5 10l-4 4" />
      </svg>
    )}
  </button>;
}
