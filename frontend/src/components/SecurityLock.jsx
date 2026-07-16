import { motion } from "motion/react";

/**
 * Animated "bhoṭe tālchā" — the traditional round Nepali/Tibetan iron
 * padlock — used as a security/trust mark on auth pages. Idles with a
 * slow breathing sway; snaps shut with a spring + emerald flash when
 * `locked` becomes true (e.g. on successful sign-in).
 */
export function SecurityLock({ locked = false, size = 56 }) {
  const shackleColor = locked ? "#34d399" : "#9ca3af";
  const dialColor = locked ? "#34d399" : "#9ca3af";

  return (
    <div className="relative mx-auto" style={{ width: size, height: size * 1.15 }}>
      <svg viewBox="0 0 64 74" width={size} height={size * 1.15} fill="none">
        {/* hooked shackle */}
        <motion.path
          d="M20 30 V20 a12 12 0 0 1 24 0 V30"
          stroke={shackleColor}
          strokeWidth="5"
          strokeLinecap="round"
          initial={false}
          animate={locked ? { rotate: 0, opacity: 1 } : { rotate: [-6, 2, -6], opacity: 0.8 }}
          transition={
            locked
              ? { type: "spring", stiffness: 260, damping: 12 }
              : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
          }
          style={{ transformOrigin: "32px 30px" }}
        />
        {/* round barrel body — the tālchā's signature shape */}
        <circle cx="32" cy="50" r="20" fill="#0a0c13" stroke={locked ? "#34d399" : "#6b7280"} strokeWidth="2.5" />
        <circle cx="32" cy="50" r="20" fill="none" stroke="#ffffff12" strokeWidth="1" />
        {/* rotating cover disc that conceals/reveals the keyhole */}
        <motion.g
          initial={false}
          animate={{ rotate: locked ? 0 : 38 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "32px 50px" }}
        >
          <circle cx="32" cy="50" r="12" fill="none" stroke="#374151" strokeWidth="1.5" strokeDasharray="3 4" />
          <circle cx="32" cy="46.5" r="3" fill={dialColor} />
          <rect x="30.6" y="46.5" width="2.8" height="7.5" rx="1.2" fill={dialColor} />
        </motion.g>
      </svg>
      {locked && (
        <motion.span
          className="absolute inset-0 rounded-full border border-emerald-400/50"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}
    </div>
  );
}
