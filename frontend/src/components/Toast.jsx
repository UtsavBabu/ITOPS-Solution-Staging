import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSound } from "../context/SoundContext";
const ToastContext = createContext(null);
const EASE = [0.16, 1, 0.3, 1];
const DURATION_MS = 4500;
const VARIANT_STYLE = {
  success: "border-emerald-400/25 bg-emerald-950/95 text-emerald-100",
  error: "border-red-400/25 bg-red-950/95 text-red-100",
  info: "border-white/15 light:border-slate-900/15 bg-neutral-900/95 light:bg-white text-white light:text-slate-900"
};
const VARIANT_ICON = {
  success: <path d="M5 13l4 4L19 7" />,
  error: <path d="M12 9v4m0 4h.01M10.3 4.3l-8 14A1 1 0 003 20h18a1 1 0 00.9-1.5l-8-14a1 1 0 00-1.6 0z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 11h1v5h1" /></>
};

/** Global toast stack — mounted once at the app root. Replaces every `alert()` call site. */
export function ToastProvider({
  children
}) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const { play } = useSound();
  const dismiss = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  const show = useCallback((message, variant = "info") => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, {
      id,
      variant,
      message
    }]);
    play(variant);
    window.setTimeout(() => dismiss(id), DURATION_MS);
  }, [dismiss, play]);
  const value = {
    show,
    success: m => show(m, "success"),
    error: m => show(m, "error"),
    info: m => show(m, "info")
  };
  return <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end">
        <AnimatePresence>
          {toasts.map(t => <motion.div key={t.id} layout initial={{
          opacity: 0,
          y: 16,
          scale: 0.96
        }} animate={{
          opacity: 1,
          y: 0,
          scale: 1
        }} exit={{
          opacity: 0,
          y: 8,
          scale: 0.96
        }} transition={{
          duration: 0.25,
          ease: EASE
        }} role="status" className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur-sm ${VARIANT_STYLE[t.variant]}`}>
              <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {VARIANT_ICON[t.variant]}
              </svg>
              <p className="flex-1 text-sm leading-snug">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="shrink-0 text-white/40 light:text-slate-400 transition-colors hover:text-white light:hover:text-slate-900">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </motion.div>)}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>;
}
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}