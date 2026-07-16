import { useTheme } from "../context/ThemeContext";

export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  return <button
    type="button"
    onClick={toggleTheme}
    aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
    aria-pressed={isLight}
    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 light:border-slate-900/12 text-white/70 light:text-slate-600 transition-colors hover:border-white/30 light:hover:border-slate-900/25 hover:text-white light:hover:text-slate-900 light:hover:text-slate-900 ${className}`}
  >
    {isLight ? (
      // Sun — currently light, click to go dark
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ) : (
      // Moon — currently dark, click to go light
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12.5A8.5 8.5 0 1111.5 3a7 7 0 009.5 9.5z" />
      </svg>
    )}
  </button>;
}
