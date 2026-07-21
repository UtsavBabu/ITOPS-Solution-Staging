import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { useTheme } from "../context/ThemeContext";
import { useSound } from "../context/SoundContext";

/* CyberSachet gets its own visual identity within the dashboard shell —
 * rose/violet in dark mode instead of the app's default cyan/emerald
 * monitoring palette, so training reads as a distinct "learning" surface,
 * not another monitoring table. Light mode is its own sky-blue-and-white
 * treatment (not a lightened version of the dark rose/violet) — a
 * deliberately airier, "classroom daylight" feel for the one surface in
 * the product meant to feel like learning rather than operations. */

const PARTICLES = [
  { x: 8, y: 22, size: 3, dur: 13, delay: 0 },
  { x: 26, y: 62, size: 2, dur: 17, delay: 2 },
  { x: 48, y: 18, size: 2.5, dur: 15, delay: 4 },
  { x: 68, y: 55, size: 2, dur: 19, delay: 1 },
  { x: 86, y: 30, size: 3, dur: 14, delay: 5 },
  { x: 92, y: 72, size: 2, dur: 21, delay: 3 }
];

// One glyph per course topic — purely decorative, but makes the catalog
// scannable at a glance instead of five identically-shaped cards.
const COURSE_ICONS = {
  "phishing-awareness": "M4 6h16v12H4zM4 6l8 7 8-7",
  "password-security-mfa": "M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3zm-2 9h4m-2-2v4",
  "social-engineering": "M8 12a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 2.5-5 5-5s5 2 5 5m3-5c2.5 0 5 2 5 5",
  "malware-ransomware": "M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1M8 12a4 4 0 108 0 4 4 0 00-8 0z",
  "data-handling-privacy": "M4 5.5h16v5H4zM4 13.5h16v5H4zM7 8h.01M7 16h.01",
  "mobile-device-security": "M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zM8 5h8M11 19h2",
  "physical-security-workplace-awareness": "M4 21v-9l8-6 8 6v9h-5v-6H9v6z"
};
export function CourseIcon({ slug, size = 34 }) {
  const path = COURSE_ICONS[slug] ?? COURSE_ICONS["data-handling-privacy"];
  return <span aria-hidden className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-violet-600 shadow-[0_8px_20px_-8px_rgba(244,63,94,0.5)]" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" style={{ width: size * 0.55, height: size * 0.55 }} fill="none">
        <path d={path} stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>;
}

export function TrainingHero({ title, subtitle, stats, academy = false }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return <div className={`relative isolate overflow-hidden rounded-3xl border p-6 shadow-none md:p-8 ${academy ? "border-amber-400/15 light:border-amber-200 bg-gradient-to-br from-amber-950 via-neutral-950 to-indigo-950 light:from-white light:via-amber-50 light:to-indigo-50 light:shadow-[0_20px_60px_-30px_rgba(99,102,241,0.3)]" : "border-rose-400/15 light:border-sky-200 bg-gradient-to-br from-rose-950 via-neutral-950 to-violet-950 light:from-white light:via-sky-50 light:to-sky-100 light:shadow-[0_20px_60px_-30px_rgba(14,165,233,0.35)]"}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-16 -top-16 h-64 w-64 rounded-full blur-3xl [animation:cs-drift-a_16s_ease-in-out_infinite] ${academy ? (isLight ? "bg-amber-300/40" : "bg-amber-500/20") : isLight ? "bg-sky-300/40" : "bg-rose-500/20"}`} />
        <div className={`absolute -right-10 bottom-0 h-56 w-56 rounded-full blur-3xl [animation:cs-drift-b_20s_ease-in-out_infinite] ${academy ? (isLight ? "bg-indigo-200/50" : "bg-indigo-500/20") : isLight ? "bg-cyan-200/50" : "bg-violet-500/20"}`} />
        {PARTICLES.map((p, i) => <span key={i} className={`absolute rounded-full ${academy ? (isLight ? "bg-amber-400/45" : "bg-amber-200/40") : isLight ? "bg-sky-400/45" : "bg-rose-200/40"}`} style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animation: `cs-float ${p.dur}s ease-in-out ${p.delay}s infinite` }} />)}
        <style>{`
          @keyframes cs-drift-a { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(24px,14px) scale(1.08); } }
          @keyframes cs-drift-b { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,10px) scale(1.06); } }
          @keyframes cs-float { 0%, 100% { transform: translate(0,0); opacity: 0.3; } 50% { transform: translate(5px,-12px); opacity: 0.7; } }
        `}</style>
      </div>
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${academy ? "bg-gradient-to-br from-amber-500 to-indigo-600 shadow-[0_12px_30px_-8px_rgba(99,102,241,0.5)]" : "bg-gradient-to-br from-rose-500 to-violet-600 light:from-sky-500 light:to-cyan-500 shadow-[0_12px_30px_-8px_rgba(244,63,94,0.5)] light:shadow-[0_12px_30px_-8px_rgba(14,165,233,0.55)]"}`}>
            {academy ? <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M7 10.5v4c0 1.7 2.2 3 5 3s5-1.3 5-3v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M21 7.5v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg> : <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.7" />
              <path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>}
          </motion.div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">{title}</h1>
            <p className="mt-1 max-w-md text-sm text-white/60 light:text-slate-500">{subtitle}</p>
          </div>
        </div>
        {stats && <div className="flex items-center gap-5">
            {stats.map(s => <div key={s.label} className="text-center">
                <p className="text-xl font-semibold tabular-nums text-white light:text-slate-900">{s.value}</p>
                <p className="text-[11px] text-white/45 light:text-slate-400">{s.label}</p>
              </div>)}
          </div>}
      </div>
    </div>;
}

export function ProgressRing({ pct, size = 44, tone = "rose" }) {
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { once: true });
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const hex = tone === "emerald" ? "#34d399" : "#fb7185";
  return <div ref={rootRef} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={hex} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: inView ? circumference - (pct / 100) * circumference : circumference }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-white light:text-slate-900">{pct}%</span>
    </div>;
}

export function CompletionCelebration({ score }) {
  const passed = score >= 70;
  const confetti = passed ? Array.from({ length: 20 }, (_, i) => i) : [];
  const { play } = useSound();
  // Plays once per real result (score changing means a new quiz attempt),
  // not on every re-render this component happens to go through.
  useEffect(() => { play(passed ? "success" : "error"); }, [score]); // eslint-disable-line react-hooks/exhaustive-deps
  return <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="relative overflow-hidden">
      {passed && <motion.div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.35), transparent 70%)" }} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 0.9, 0], scale: 1.4 }} transition={{ duration: 0.9, ease: "easeOut" }} aria-hidden />}
      {confetti.map(i => <motion.span key={i} className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full" style={{ background: ["#fb7185", "#a78bfa", "#10b981", "#fbbf24", "#00f0ff"][i % 5] }} initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: (Math.cos((i / 20) * Math.PI * 2) * 100), y: (Math.sin((i / 20) * Math.PI * 2) * 100) - 24, opacity: 0 }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }} />)}
      <div className="relative z-10 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }} className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${passed ? "bg-emerald-400/15 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_0_30px_-4px_rgba(16,185,129,0.6)]" : "bg-amber-400/15 text-amber-300"}`}>
          {passed ? <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg> : <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none"><path d="M12 8v5m0 3h.01M10.3 3.3l-8 14A1 1 0 003 19h18a1 1 0 00.9-1.5l-8-14a1 1 0 00-1.6 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </motion.div>
        <p className={`mt-3 text-3xl font-semibold ${passed ? "text-emerald-300" : "text-amber-300"}`}>{score}%</p>
        <p className="mt-1 text-sm text-white/60 light:text-slate-600">
          {passed ? "Passed — nice work." : "Below the 70% passing mark — review the lessons and try again."}
        </p>
      </div>
    </motion.div>;
}

// Only categories with at least one real published course get an icon here
// — the library filter (in CyberSachetTraining.jsx) only ever renders a
// chip for a category it found real courses in, so there's no dead entry
// pointing at an empty shelf.
const CATEGORY_ICONS = {
  "email-security": "M3 6h18v12H3zM3 6l9 7 9-7",
  "identity": "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0",
  "cybersecurity": "M12 2l8 3.5v5.4c0 5.2-3.4 9.8-8 11.1-4.6-1.3-8-5.9-8-11.1V5.5L12 2z",
  "endpoint-security": "M4 4h16v10H4zM9 20h6M12 14v6",
  "data-protection": "M12 3c4 0 7 1.3 7 3v10c0 1.7-3 3-7 3s-7-1.3-7-3V6c0-1.7 3-3 7-3z",
  "physical-security": "M4 21v-9l8-6 8 6v9h-5v-6H9v6z",
  "soc": "M4 5h16v11H4zM9 20h6M12 16v4M8 9l2.5 2.5L8 14M13 14h3",
  "infrastructure": "M4 4h16v5H4zM4 10.5h16v5H4zM4 17h16v3H4M7.5 6.5h.01M7.5 13h.01M7.5 18.5h.01",
  "cloud": "M7.5 18a4.2 4.2 0 01-1-8.27A5.3 5.3 0 0117 8.2 4 4 0 0116.5 18h-9z",
  "devops": "M5 12a7 7 0 0112.5-4.3M19 4v4.5h-4.5M19 12a7 7 0 01-12.5 4.3M5 20v-4.5h4.5"
};
export function CategoryIcon({ category, size = 16 }) {
  const path = CATEGORY_ICONS[category] ?? CATEGORY_ICONS["cybersecurity"];
  return <svg viewBox="0 0 24 24" style={{ width: size, height: size }} fill="none" aria-hidden>
      <path d={path} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
}

export const BADGE_META = {
  first_course: { label: "First Course", icon: "🎯", hint: "Completed your first course" },
  perfect_score: { label: "Perfect Score", icon: "💯", hint: "Scored 100% on a quiz" },
  completionist: { label: "Completionist", icon: "🏆", hint: "Completed every published course" },
  certified: { label: "Certified", icon: "🎓", hint: "Holds a current CSSA certificate" },
  streak_3: { label: "3-Day Streak", icon: "🔥", hint: "Trained 3 days in a row" },
  streak_7: { label: "7-Day Streak", icon: "⚡", hint: "Trained 7 days in a row" }
};
export function BadgeChip({ code }) {
  const meta = BADGE_META[code];
  if (!meta) return null;
  return <span title={meta.hint} className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 light:border-amber-500/30 bg-amber-400/10 light:bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-200 light:text-amber-800">
      <span aria-hidden>{meta.icon}</span>{meta.label}
    </span>;
}

export function StreakFlame({ days }) {
  const active = days > 0;
  return <span className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${active ? "text-amber-300 light:text-amber-600" : "text-white/30 light:text-slate-300"}`}>
      <span aria-hidden>{active ? "🔥" : "○"}</span>{days}
    </span>;
}

export function ModuleProgressBar({ pct, tone = "rose" }) {
  const bar = tone === "emerald" ? "bg-emerald-400" : "bg-rose-400 light:bg-sky-500";
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 light:bg-slate-900/8">
      <motion.div className={`h-full rounded-full ${bar}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
    </div>;
}

const MEDALS = ["🥇", "🥈", "🥉"];
export function Leaderboard({ rows, currentUserId }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-white/40 light:text-slate-400">No completed courses yet — the leaderboard fills in as your team finishes training.</p>;
  }
  return <div className="space-y-1.5">
      {rows.map((r, i) => <div key={r.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${r.userId === currentUserId ? "bg-rose-400/[0.08] light:bg-sky-100" : ""}`}>
          <span className="w-6 shrink-0 text-center text-xs text-white/40 light:text-slate-400">{MEDALS[i] ?? r.rank}</span>
          <span className="flex-1 truncate text-white/80 light:text-slate-700">{r.userEmail}{r.userId === currentUserId ? " (you)" : ""}</span>
          <span className="shrink-0 text-xs text-white/45 light:text-slate-400">{r.completedCount} done</span>
          <span className="w-10 shrink-0 text-right text-xs font-medium text-white/70 light:text-slate-600">{r.avgScore != null ? `${r.avgScore}%` : "—"}</span>
        </div>)}
    </div>;
}

export function LocalPreviewBanner() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(sessionStorage.getItem("cs-local-banner-dismissed") === "1");
  }, []);
  if (dismissed) return null;
  return <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-2xl border border-amber-400/25 light:border-amber-500/30 bg-amber-400/[0.06] light:bg-amber-50 px-4 py-3">
      <span className="mt-0.5 shrink-0 text-amber-300 light:text-amber-600" aria-hidden>◐</span>
      <div className="flex-1 text-sm">
        <p className="font-medium text-amber-200 light:text-amber-800">Local preview curriculum</p>
        <p className="mt-0.5 text-amber-200/70 light:text-amber-700/80">
          This is real course content, running entirely in your browser (progress saved to this device only) until CyberSachet is
          licensed and connected to your organization's database. Nothing here is sent anywhere.
        </p>
      </div>
      <button onClick={() => { sessionStorage.setItem("cs-local-banner-dismissed", "1"); setDismissed(true); }} className="shrink-0 text-amber-200/60 light:text-amber-700/60 hover:text-amber-100 light:hover:text-amber-900" aria-label="Dismiss">
        ✕
      </button>
    </motion.div>;
}
