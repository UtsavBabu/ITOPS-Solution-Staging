import { useState } from "react";
import { motion } from "motion/react";
const EASE = [0.16, 1, 0.3, 1];

function Field({ label, tone, children }) {
  if (!children) return null;
  return <div>
      <p className={`text-[10px] font-medium uppercase tracking-wide ${tone}`}>{label}</p>
      <div className="mt-1 text-[13px] leading-relaxed text-white/70 light:text-slate-600">{children}</div>
    </div>;
}

// A structured hands-on lab brief — objective, environment, steps, and a
// challenge task — for a learner to actually run against their own real
// Docker/Linux/kubectl installation. This is guidance for real, self-run
// work, never a claim that ITOps Solution is provisioning or executing
// anything on the learner's behalf.
export function LabCard({ lab }) {
  const [challengeOpen, setChallengeOpen] = useState(false);
  if (!lab) return null;
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="glass mt-4 overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-violet-400/20 light:border-violet-500/20 bg-violet-400/[0.04] light:bg-violet-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px]" aria-hidden>🧪</span>
          <p className="text-[11px] font-medium uppercase tracking-wide text-violet-300 light:text-violet-700">Hands-on lab</p>
        </div>
        <span className="text-[10px] text-white/30 light:text-slate-400">Run this on your own installation</span>
      </div>
      <div className="space-y-3 p-4">
        <Field label="Objective" tone="text-cyan-300 light:text-cyan-700">{lab.objective}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Environment" tone="text-emerald-300 light:text-emerald-700">{lab.environment}</Field>
          {lab.tools?.length > 0 && <Field label="Tools" tone="text-amber-300 light:text-amber-700">{lab.tools.join(", ")}</Field>}
        </div>
        {lab.steps?.length > 0 && <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-300 light:text-violet-700">Steps</p>
            <ol className="mt-1.5 space-y-1.5">
              {lab.steps.map((s, i) => <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/70 light:text-slate-600">
                  <span className="mt-0.5 shrink-0 font-mono text-[11px] text-violet-300/70 light:text-violet-500">{i + 1}.</span>
                  <span className="font-mono">{s}</span>
                </li>)}
            </ol>
          </div>}
        <Field label="Troubleshooting" tone="text-amber-300 light:text-amber-700">{lab.troubleshooting}</Field>
        {lab.challenge && <div className="rounded-lg border border-cyan-400/25 light:border-cyan-500/25 bg-cyan-400/[0.05] light:bg-cyan-50 p-3">
            <button onClick={() => setChallengeOpen(o => !o)} className="flex w-full items-center justify-between gap-2 text-left">
              <span className="text-[11px] font-medium uppercase tracking-wide text-cyan-300 light:text-cyan-700">🏆 Challenge task</span>
              <svg className={`h-3.5 w-3.5 shrink-0 text-cyan-300 transition-transform ${challengeOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {challengeOpen && <p className="mt-1.5 text-[13px] leading-relaxed text-white/70 light:text-slate-600">{lab.challenge}</p>}
          </div>}
      </div>
    </motion.div>;
}
