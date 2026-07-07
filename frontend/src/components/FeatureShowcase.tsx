import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Mini visuals: small, distinct, self-animating product vignettes ── */

/** Uptime ticks + latency sparkline — website/API monitoring. */
export function UptimeVisual() {
  const ticks = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">api.production · last 24h</span>
        <span className="text-emerald-300">99.98%</span>
      </div>
      <div className="mt-3 flex gap-1">
        {ticks.map((i) => (
          <motion.span
            key={i}
            initial={{ scaleY: 0, opacity: 0 }}
            whileInView={{ scaleY: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03, duration: 0.3, ease: EASE }}
            className={`h-8 flex-1 origin-bottom rounded-sm ${i === 9 ? "bg-amber-400/80" : "bg-emerald-400/70"}`}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["126ms", "avg response"],
          ["30s", "check interval"],
          ["5", "redirects traced"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-lg border border-white/10 bg-black/30 py-2">
            <p className="text-sm font-semibold text-white">{v}</p>
            <p className="text-[10px] text-white/40">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Animated security score ring + header checklist. */
export function SecurityVisual() {
  const R = 34;
  const C = 2 * Math.PI * R;
  const score = 0.86;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
            <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
            <motion.circle
              cx="42"
              cy="42"
              r={R}
              fill="none"
              stroke="#34d399"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              whileInView={{ strokeDashoffset: C * (1 - score) }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: EASE }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-xl font-semibold text-white">86</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2 text-xs">
          {[
            ["strict-transport-security", true],
            ["content-security-policy", true],
            ["x-frame-options", true],
            ["permissions-policy", false],
          ].map(([h, ok], i) => (
            <motion.li
              key={String(h)}
              initial={{ opacity: 0, x: 8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.12 }}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-1.5"
            >
              <code className="text-white/60">{String(h)}</code>
              <span className={ok ? "text-emerald-300" : "text-amber-300"}>{ok ? "✓" : "!"}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Host resource gauges — Kada Nigrani. */
export function HostsVisual() {
  const rows: Array<[string, number, string]> = [
    ["CPU", 31, "bg-cyan-400"],
    ["Memory", 58, "bg-blue-400"],
    ["Disk", 44, "bg-violet-400"],
  ];
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
          web-01 · Ubuntu 24.04
        </span>
        <span className="text-white/40">agent v1.0.0</span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map(([label, pct, tone], i) => (
          <div key={label}>
            <div className="flex justify-between text-[11px] text-white/50">
              <span>{label}</span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.15, ease: EASE }}
                className={`h-full rounded-full ${tone}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/50">
        <span>uptime 41d 6h</span>
        <span>load 0.42</span>
        <span>184 procs</span>
      </div>
    </div>
  );
}

/** Incident lifecycle timeline — detection → alert → recovery. */
export function IncidentVisual() {
  const steps: Array<[string, string, string]> = [
    ["14:02:11", "checkout-service failed 2 consecutive checks", "text-red-300"],
    ["14:02:12", "Incident opened · Slack + email alert sent", "text-amber-300"],
    ["14:07:40", "Checks passing again", "text-cyan-300"],
    ["14:07:41", "Incident auto-resolved · recovery alert sent", "text-emerald-300"],
  ];
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs text-white/60">Incident #2481 · timeline</p>
      <div className="mt-4 space-y-0">
        {steps.map(([t, msg, tone], i) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.18 }}
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            {i < steps.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-white/10" />}
            <span className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-current ${tone}`} />
            <div className="min-w-0">
              <p className="font-mono text-[10px] text-white/35">{t}</p>
              <p className="text-xs text-white/70">{msg}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Showcase row ── */

export interface ShowcaseItem {
  eyebrow: string;
  eyebrowTone: string;
  title: string;
  body: string;
  bullets: string[];
  href: string;
  cta: string;
  visual: ReactNode;
}

export function ShowcaseRow({ item, flip }: { item: ShowcaseItem; flip: boolean }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <motion.div
        initial={{ opacity: 0, x: flip ? 24 : -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className={flip ? "lg:order-2" : ""}
      >
        <p className={`text-xs font-medium uppercase tracking-[0.15em] ${item.eyebrowTone}`}>{item.eyebrow}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">{item.title}</h3>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 md:text-base">{item.body}</p>
        <ul className="mt-6 space-y-2.5">
          {item.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-white/70">
              <span className="mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center text-emerald-300">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {b}
            </li>
          ))}
        </ul>
        <Link
          to={item.href}
          className="group mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
        >
          {item.cta}
          <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: flip ? -24 : 24, scale: 0.98 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
        className={flip ? "lg:order-1" : ""}
      >
        {item.visual}
      </motion.div>
    </div>
  );
}
