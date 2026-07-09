import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ContentItem } from "../api/types";

const EASE = [0.16, 1, 0.3, 1] as const;

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Row({ faq, open, onToggle }: { faq: ContentItem; open: boolean; onToggle: () => void }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
        open ? "border-cyan-400/30 bg-white/[0.04]" : "border-white/10 bg-neutral-900/50 hover:border-white/20"
      }`}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
      >
        <span className={`text-sm font-medium transition-colors ${open ? "text-white" : "text-white/80"}`}>{faq.title}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-base leading-none ${
            open ? "border-cyan-400/40 text-cyan-300" : "border-white/15 text-white/50"
          }`}
          aria-hidden
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <p className="px-6 pb-5 text-sm leading-relaxed text-white/55">{faq.body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqAccordion({
  faqs,
  openId: controlledOpenId,
  onOpenChange,
}: {
  faqs: ContentItem[];
  openId?: string | null;
  onOpenChange?: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [internalOpenId, setInternalOpenId] = useState<string | null>(null);
  const openId = controlledOpenId !== undefined ? controlledOpenId : internalOpenId;
  const setOpenId = onOpenChange ?? setInternalOpenId;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => f.title.toLowerCase().includes(q) || (f.body ?? "").toLowerCase().includes(q));
  }, [faqs, query]);

  return (
    <div>
      <div className="group relative mx-auto max-w-md">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-cyan-300">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          aria-label="Search frequently asked questions"
          className="h-11 w-full rounded-full border border-white/12 bg-black/40 pl-11 pr-4 text-sm text-white placeholder:text-white/35 transition-all focus:border-cyan-400/50 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)] focus:outline-none"
        />
      </div>

      <div className="mt-8 space-y-3">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6 text-center text-sm text-white/45">
            No answers match “{query}” — ask us directly through the form below.
          </p>
        ) : (
          filtered.map((faq) => (
            <Row key={faq.id} faq={faq} open={openId === faq.id} onToggle={() => setOpenId(openId === faq.id ? null : faq.id)} />
          ))
        )}
      </div>
    </div>
  );
}
