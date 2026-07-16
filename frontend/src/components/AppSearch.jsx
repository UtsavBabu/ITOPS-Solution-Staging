import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { fetchAssets, fetchIncidents, fetchMonitors, listHostAgents } from "../api/endpoints";
import { fetchAdminCustomers, fetchAdminUsers } from "../api/adminEndpoints";

/**
 * Real global search over live data — every result here comes from a
 * Supabase query already used elsewhere in the app (same shape, same RLS
 * boundary), never invented. `scope` picks which live sources to query:
 * "customer" searches this organization's own monitors/incidents/hosts/
 * assets; "admin" searches organizations/users the current admin role can
 * already see via fetchAdminCustomers/fetchAdminUsers.
 */
function useCustomerResults(query) {
  const { data: monitors } = useQuery({ queryKey: ["monitors"], queryFn: fetchMonitors, staleTime: 30_000 });
  const { data: incidents } = useQuery({ queryKey: ["incidents", "ALL"], queryFn: () => fetchIncidents(), staleTime: 30_000 });
  const { data: hosts } = useQuery({ queryKey: ["host-agents"], queryFn: listHostAgents, staleTime: 30_000 });
  const { data: assets } = useQuery({ queryKey: ["assets"], queryFn: fetchAssets, staleTime: 30_000 });
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = [];
    if (monitors?.length) {
      const items = monitors.filter(m => !q || `${m.name} ${m.url}`.toLowerCase().includes(q)).slice(0, 6).map(m => ({ label: m.name, hint: m.url, to: `/monitors/${m.id}` }));
      if (items.length) groups.push({ label: "Monitors", items });
    }
    if (incidents?.length) {
      const items = incidents.filter(i => !q || `${i.monitor?.name ?? ""} ${i.cause ?? ""}`.toLowerCase().includes(q)).slice(0, 6).map(i => ({ label: i.monitor?.name ?? "Incident", hint: `${i.status === "OPEN" ? "Open" : "Resolved"} · ${i.cause ?? "Unknown cause"}`, to: i.monitor?.id ? `/monitors/${i.monitor.id}` : "/incidents" }));
      if (items.length) groups.push({ label: "Incidents", items });
    }
    if (hosts?.length) {
      const items = hosts.filter(h => !q || `${h.name} ${h.hostname ?? ""}`.toLowerCase().includes(q)).slice(0, 6).map(h => ({ label: h.name, hint: h.isOnline ? "Online" : "Offline", to: "/hosts" }));
      if (items.length) groups.push({ label: "Server Agents", items });
    }
    if (assets?.length) {
      const items = assets.filter(a => !q || `${a.name} ${a.identifier ?? ""}`.toLowerCase().includes(q)).slice(0, 6).map(a => ({ label: a.name, hint: a.type, to: "/assets" }));
      if (items.length) groups.push({ label: "Assets", items });
    }
    return groups;
  }, [query, monitors, incidents, hosts, assets]);
}
function useAdminResults(query) {
  const { data: customers } = useQuery({ queryKey: ["admin-customers"], queryFn: fetchAdminCustomers, staleTime: 30_000 });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: fetchAdminUsers, staleTime: 30_000, retry: false });
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = [];
    if (customers?.length) {
      const items = customers.filter(c => !q || `${c.name} ${c.adminEmail ?? ""}`.toLowerCase().includes(q)).slice(0, 6).map(c => ({ label: c.name, hint: `${c.plan} · ${c.adminEmail ?? "no admin email"}`, to: "/admin/customers" }));
      if (items.length) groups.push({ label: "Organizations", items });
    }
    if (users?.length) {
      const items = users.filter(u => !q || `${u.email} ${u.fullName ?? ""} ${u.organizationName ?? ""}`.toLowerCase().includes(q)).slice(0, 6).map(u => ({ label: u.fullName || u.email, hint: `${u.organizationName ?? "—"} · ${u.role ?? "member"}`, to: "/admin/users" }));
      if (items.length) groups.push({ label: "Users", items });
    }
    return groups;
  }, [query, customers, users]);
}

export function AppSearch({ scope, navItems }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const customerResults = useCustomerResults(scope === "customer" ? query : "");
  const adminResults = useAdminResults(scope === "admin" ? query : "");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const navMatches = navItems.filter(n => !q || n.label.toLowerCase().includes(q)).map(n => ({ label: n.label, hint: "Go to", to: n.to }));
    const dataGroups = scope === "admin" ? adminResults : customerResults;
    const out = [];
    if (navMatches.length) out.push({ label: "Pages", items: navMatches });
    out.push(...dataGroups);
    return out;
  }, [query, navItems, scope, adminResults, customerResults]);
  const flat = useMemo(() => groups.flatMap(g => g.items), [groups]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);
  useEffect(() => {
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
  }, [close]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);
  useEffect(() => {
    setActive(0);
  }, [query]);
  function run(item) {
    close();
    navigate(item.to);
  }
  function onInputKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      run(flat[active]);
    }
  }
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let cursor = -1;
  return <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Search" className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] px-3 py-2 text-left text-xs text-white/40 light:text-slate-400 transition-colors hover:border-white/20 hover:text-white/70 light:hover:text-slate-600">
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="flex-1">Search…</span>
        <kbd className="rounded border border-white/10 light:border-slate-900/10 px-1 text-[10px]">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) close(); }} role="dialog" aria-modal="true" aria-label="Search">
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -8 }} transition={{ duration: 0.18 }} className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-950 light:bg-white shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] light:shadow-[0_40px_120px_-30px_rgba(15,23,42,0.25)]">
              <div className="flex items-center gap-3 border-b border-white/10 light:border-slate-900/10 px-4">
                <svg className="h-4 w-4 shrink-0 text-white/40 light:text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onInputKey} placeholder={scope === "admin" ? "Search organizations, users, pages…" : "Search monitors, incidents, hosts, pages…"} aria-label="Search" className="h-14 w-full bg-transparent text-sm text-white light:text-slate-900 placeholder:text-white/35 light:placeholder:text-slate-400 focus:outline-none" />
                <kbd className="rounded-md border border-white/15 light:border-slate-900/15 px-1.5 py-0.5 text-[10px] text-white/40 light:text-slate-400">ESC</kbd>
              </div>
              <div ref={listRef} className="max-h-96 overflow-y-auto p-2">
                {flat.length === 0 && <p className="px-3 py-6 text-center text-sm text-white/40 light:text-slate-400">No matches for "{query}"</p>}
                {groups.map(group => <div key={group.label} className="mb-1">
                    <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-white/30 light:text-slate-400">{group.label}</p>
                    <ul role="listbox">
                      {group.items.map(item => {
                    cursor += 1;
                    const i = cursor;
                    return <li key={`${group.label}-${item.to}-${item.label}`} role="option" aria-selected={i === active} data-active={i === active}>
                            <button onClick={() => run(item)} onMouseEnter={() => setActive(i)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${i === active ? "bg-white/10 light:bg-slate-900/8 text-white light:text-slate-900" : "text-white/65 light:text-slate-600"}`}>
                              <span className="truncate">{item.label}</span>
                              <span className="ml-3 shrink-0 truncate text-xs text-white/40 light:text-slate-400">{item.hint}</span>
                            </button>
                          </li>;
                  })}
                    </ul>
                  </div>)}
              </div>
              <div className="border-t border-white/10 light:border-slate-900/10 px-4 py-2 text-[11px] text-white/30 light:text-slate-400">
                ↑↓ navigate · Enter open · Esc close
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>
    </>;
}
