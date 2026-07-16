import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
const ConfirmContext = createContext(null);
const EASE = [0.16, 1, 0.3, 1];
/**
 * Global animated confirmation dialog — mounted once at the app root.
 * Replaces every native `confirm()` call site with a styled, on-brand modal:
 * `const ok = await confirm({ title: "Delete monitor?", danger: true }); if (ok) mutate();`
 */
export function ConfirmProvider({
  children
}) {
  const [pending, setPending] = useState(null);
  const confirm = useCallback(options => {
    return new Promise(resolve => {
      setPending({
        ...options,
        resolve
      });
    });
  }, []);
  function settle(result) {
    pending?.resolve(result);
    setPending(null);
  }
  return <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {pending && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} transition={{
        duration: 0.15
      }} className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && settle(false)}>
            <motion.div initial={{
          opacity: 0,
          scale: 0.96,
          y: -8
        }} animate={{
          opacity: 1,
          scale: 1,
          y: 0
        }} exit={{
          opacity: 0,
          scale: 0.96,
          y: -8
        }} transition={{
          duration: 0.2,
          ease: EASE
        }} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="w-full max-w-sm rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-950 light:bg-white p-5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] light:shadow-[0_40px_120px_-30px_rgba(15,23,42,0.25)]">
              <h2 id="confirm-dialog-title" className="text-base font-medium text-white light:text-slate-900">
                {pending.title}
              </h2>
              {pending.description && <p className="mt-2 text-sm leading-relaxed text-white/50 light:text-slate-500">{pending.description}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => settle(false)} className="rounded-full border border-white/15 light:border-slate-900/15 px-4 py-2 text-sm text-white/70 light:text-slate-600 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5">
                  {pending.cancelLabel ?? "Cancel"}
                </button>
                <button onClick={() => settle(true)} autoFocus className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${pending.danger ? "bg-red-500 text-white hover:bg-red-400" : "bg-white text-black hover:bg-neutral-200"}`}>
                  {pending.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>
    </ConfirmContext.Provider>;
}
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}