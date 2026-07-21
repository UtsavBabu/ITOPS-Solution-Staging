import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
const EASE = [0.16, 1, 0.3, 1];

function QuestionRow({ q }) {
  const [open, setOpen] = useState(false);
  return <div className="border-b border-white/8 light:border-slate-900/8 last:border-0">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left">
        <span className="text-sm text-white/85 light:text-slate-800">{q.question}</span>
        <svg className={`h-3.5 w-3.5 shrink-0 text-white/35 light:text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: EASE }} className="overflow-hidden">
            <p className="pb-3 text-[13px] leading-relaxed text-white/55 light:text-slate-500">{q.answer}</p>
          </motion.div>}
      </AnimatePresence>
    </div>;
}

// Real, module-scoped interview questions with real answers — meant to be
// used for actual interview prep, not decorative filler. Collapsed by
// default so it reads as a self-test (try to answer before revealing).
export function InterviewQuestions({ questions }) {
  if (!questions || questions.length === 0) return null;
  return <div className="mt-4 rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-white p-4">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">
        <span aria-hidden>💼</span> Interview questions for this module
      </p>
      <div>{questions.map((q, i) => <QuestionRow key={i} q={q} />)}</div>
    </div>;
}
