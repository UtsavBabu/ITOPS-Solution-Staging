import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
const EASE = [0.16, 1, 0.3, 1];

// A real flashcard deck derived entirely from a course's own already-authored
// content (lesson title as the prompt, its key takeaway as the answer) — no
// separate content to author or fabricate, just a different, quizzable view
// of what's already real.
export function Flashcards({ cards, onClose }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!cards || cards.length === 0) return null;
  const card = cards[index];

  function go(delta) {
    setFlipped(false);
    setIndex(i => (i + delta + cards.length) % cards.length);
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between text-white light:text-slate-900">
          <p className="text-sm font-medium">Flashcards · {index + 1}/{cards.length}</p>
          <button onClick={onClose} aria-label="Close flashcards" className="text-white/50 light:text-slate-400 hover:text-white light:hover:text-slate-900">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <button onClick={() => setFlipped(f => !f)} className="relative h-64 w-full [perspective:1000px]" aria-label="Flip card">
          <AnimatePresence mode="wait">
            <motion.div key={index + (flipped ? "-back" : "-front")} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2, ease: EASE }} className={`absolute inset-0 flex items-center justify-center rounded-2xl border p-6 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] ${flipped ? "border-emerald-400/30 bg-emerald-950/90 light:border-emerald-500/30 light:bg-emerald-50" : "border-cyan-400/30 bg-neutral-900 light:border-cyan-500/30 light:bg-white"}`}>
              <div>
                <p className={`mb-2 text-[10px] font-medium uppercase tracking-wide ${flipped ? "text-emerald-300 light:text-emerald-700" : "text-cyan-300 light:text-cyan-700"}`}>{flipped ? "Key takeaway" : "Concept"}</p>
                <p className="text-lg font-medium leading-snug text-white light:text-slate-900">{flipped ? card.back : card.front}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </button>
        <p className="mt-2 text-center text-[11px] text-white/40 light:text-slate-400">Click the card to flip it</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => go(-1)} className="rounded-full border border-white/15 light:border-slate-900/15 px-4 py-2 text-xs text-white/70 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-900/5">← Previous</button>
          <button onClick={() => go(1)} className="rounded-full border border-white/15 light:border-slate-900/15 px-4 py-2 text-xs text-white/70 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-900/5">Next →</button>
        </div>
      </div>
    </div>;
}
