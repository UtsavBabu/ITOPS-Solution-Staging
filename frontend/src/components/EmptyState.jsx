import { Link } from "react-router-dom";
import { motion } from "motion/react";
const EASE = [0.16, 1, 0.3, 1];

/**
 * Standardized "nothing here yet" panel — replaces the mix of ad hoc
 * one-line `<p>` messages spread across the app with a consistent,
 * gently-animated empty state that can optionally carry a CTA.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = ""
}) {
  return <motion.div initial={{
    opacity: 0,
    y: 8
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4,
    ease: EASE
  }} className={`flex flex-col items-center gap-2 px-6 py-10 text-center ${className}`}>
      {icon && <span className="mb-1 grid h-11 w-11 place-items-center rounded-full bg-white/[0.04] light:bg-slate-900/[0.04] text-white/40 light:text-slate-400">
          {icon}
        </span>}
      <p className="text-sm font-medium text-white/70 light:text-slate-600">{title}</p>
      {description && <p className="max-w-sm text-xs text-white/40 light:text-slate-400">{description}</p>}
      {action && ("to" in action ? <Link to={action.to} className="mt-2 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200">
            {action.label}
          </Link> : <button onClick={action.onClick} className="mt-2 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200">
            {action.label}
          </button>)}
    </motion.div>;
}

/** Distinct "failed to load" panel — never silently render an empty state on fetch error. */
export function ErrorState({
  message = "Something went wrong loading this data.",
  onRetry
}) {
  return <motion.div initial={{
    opacity: 0,
    y: 8
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4,
    ease: EASE
  }} className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="mb-1 grid h-11 w-11 place-items-center rounded-full bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4m0 4h.01M10.3 4.3l-8 14A1 1 0 003 20h18a1 1 0 00.9-1.5l-8-14a1 1 0 00-1.6 0z" />
        </svg>
      </span>
      <p className="text-sm font-medium text-red-300 light:text-red-600">{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-2 rounded-full border border-white/15 light:border-slate-900/15 px-4 py-1.5 text-xs font-medium text-white/80 light:text-slate-700 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5">
          Try again
        </button>}
    </motion.div>;
}