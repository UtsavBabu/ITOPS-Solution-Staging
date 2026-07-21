import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
const COMMANDS = [{
  label: "Home",
  hint: "Page",
  to: "/"
}, {
  label: "Platform Overview",
  hint: "Page",
  to: "/platform"
}, {
  label: "Products",
  hint: "Page",
  to: "/solutions",
  keywords: "marketplace catalog solutions"
}, {
  label: "Packages & Pricing",
  hint: "Page",
  to: "/pricing",
  keywords: "plans cost buy compare"
}, {
  label: "Company & Contact",
  hint: "Page",
  to: "/company",
  keywords: "about team leadership"
}, {
  label: "Support & FAQ",
  hint: "Page",
  to: "/support",
  keywords: "help questions contact"
}, {
  label: "Website & API Monitoring",
  hint: "Product",
  to: "/solutions/website-api-monitoring",
  keywords: "uptime checks dns keyword"
}, {
  label: "Security Monitoring",
  hint: "Product",
  to: "/solutions/security-monitoring",
  keywords: "ssl headers score"
}, {
  label: "Kada Nigrani — Server Monitoring",
  hint: "Product",
  to: "/solutions/kada-nigrani",
  keywords: "hosts agent linux cpu"
}, {
  label: "Network & Device Monitoring",
  hint: "Product",
  to: "/solutions/infrastructure-monitor",
  keywords: "router switch firewall tcp dns snmp"
}, {
  label: "Alerting & Incident Response",
  hint: "Product",
  to: "/solutions/alerting-incident-response",
  keywords: "mttr rca root cause incidents"
}, {
  label: "DevOps Monitor",
  hint: "Product",
  to: "/solutions/devops-monitor",
  keywords: "kubernetes docker cicd roadmap"
}, {
  label: "MoonSAV-EDR",
  hint: "Product",
  to: "/solutions/moonsav-edr",
  keywords: "endpoint detection response edr security malware roadmap"
}, {
  label: "CyberSachet",
  hint: "Product",
  to: "/cybersachet",
  keywords: "awareness training phishing"
}, {
  label: "Moonsav ITOps Academy",
  hint: "Product",
  to: "/academy",
  keywords: "training courses cloud devops infrastructure certificate learning academy"
}, {
  label: "Log in",
  hint: "Account",
  to: "/login",
  keywords: "sign in dashboard"
}, {
  label: "Get started free",
  hint: "Account",
  to: "/pricing",
  keywords: "register signup create account"
}, {
  label: "Customer dashboard",
  hint: "App",
  to: "/dashboard",
  keywords: "monitors incidents"
}, {
  label: "Admin portal",
  hint: "App",
  to: "/admin/login",
  keywords: "platform admin cms customers"
}];
export function CommandPalette({ disabled = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(c => `${c.label} ${c.hint} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [query]);
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  // Global shortcut: Ctrl/Cmd+K toggles, Escape closes. Suppressed inside the
  // authenticated app/admin shell — those mount their own AppSearch, which
  // already owns Cmd+K there, and this palette's targets are marketing pages
  // that don't make sense mid-session anyway.
  useEffect(() => {
    if (disabled) return;
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(v => !v);
      } else if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, disabled]);

  // Lets a visible "Search" button elsewhere (e.g. the nav) open the same
  // palette without lifting its open state into a context.
  useEffect(() => {
    if (disabled) return;
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("open-command-palette", onOpenRequest);
    return () => window.removeEventListener("open-command-palette", onOpenRequest);
  }, [disabled]);

  // Belt-and-suspenders: if navigation ever lands us in the app shell while
  // the palette happens to be open, close it rather than leave it stuck open.
  useEffect(() => {
    if (disabled && open) close();
  }, [disabled, open, close]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);
  useEffect(() => {
    setActive(0);
  }, [query]);
  function run(cmd) {
    close();
    navigate(cmd.to);
  }
  function onInputKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      run(results[active]);
    }
  }

  // Keep the active row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({
      block: "nearest"
    });
  }, [active]);
  return <AnimatePresence>
      {open && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} transition={{
      duration: 0.15
    }} className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[18vh] backdrop-blur-sm" onMouseDown={e => {
      if (e.target === e.currentTarget) close();
    }} role="dialog" aria-modal="true" aria-label="Command palette">
          <motion.div initial={{
        opacity: 0,
        scale: 0.97,
        y: -8
      }} animate={{
        opacity: 1,
        scale: 1,
        y: 0
      }} exit={{
        opacity: 0,
        scale: 0.97,
        y: -8
      }} transition={{
        duration: 0.18
      }} className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-950 light:bg-white shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] light:shadow-[0_40px_120px_-30px_rgba(15,23,42,0.25)]">
            <div className="flex items-center gap-3 border-b border-white/10 light:border-slate-900/10 px-4">
              <svg className="h-4 w-4 shrink-0 text-white/40 light:text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onInputKey} placeholder="Search pages, products, actions…" aria-label="Search commands" className="h-14 w-full bg-transparent text-sm text-white light:text-slate-900 placeholder:text-white/35 light:placeholder:text-slate-400 focus:outline-none" />
              <kbd className="rounded-md border border-white/15 light:border-slate-900/15 px-1.5 py-0.5 text-[10px] text-white/40 light:text-slate-400">ESC</kbd>
            </div>
            <ul ref={listRef} className="max-h-72 overflow-y-auto p-2" role="listbox">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-white/40 light:text-slate-400">No matches for “{query}”</li>}
              {results.map((cmd, i) => <li key={cmd.to + cmd.label} role="option" aria-selected={i === active}>
                  <button onClick={() => run(cmd)} onMouseEnter={() => setActive(i)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${i === active ? "bg-white/10 light:bg-slate-900/8 text-white light:text-slate-900" : "text-white/65 light:text-slate-600"}`}>
                    {cmd.label}
                    <span className="ml-3 shrink-0 rounded-full border border-white/10 light:border-slate-900/10 px-2 py-0.5 text-[10px] text-white/40 light:text-slate-400">
                      {cmd.hint}
                    </span>
                  </button>
                </li>)}
            </ul>
            <div className="border-t border-white/10 light:border-slate-900/10 px-4 py-2 text-[11px] text-white/30 light:text-slate-400">
              ↑↓ navigate · Enter open · Esc close
            </div>
          </motion.div>
        </motion.div>}
    </AnimatePresence>;
}