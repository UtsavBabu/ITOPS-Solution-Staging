import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { fetchIncidents, fetchMonitors, fetchPlanUsage } from "../api/endpoints";
import { fetchAdminOpenIncidents, fetchResellerApplications, fetchSecurityHighlights } from "../api/adminEndpoints";

/**
 * Real notifications only — every entry here is derived from data the app
 * already fetches elsewhere (open incidents, SSL expiry embedded on each
 * monitor, plan usage, pending reseller applications). No invented alert
 * types like "failed backups" or "vulnerabilities" that nothing in this
 * codebase actually tracks yet.
 */
function useCustomerNotifications(active) {
  const { data: incidents } = useQuery({ queryKey: ["incidents", "OPEN"], queryFn: () => fetchIncidents("OPEN"), staleTime: 30_000, enabled: active });
  const { data: monitors } = useQuery({ queryKey: ["monitors"], queryFn: fetchMonitors, staleTime: 30_000, enabled: active });
  const { data: usage } = useQuery({ queryKey: ["plan-usage"], queryFn: fetchPlanUsage, staleTime: 30_000, enabled: active });
  const items = [];
  for (const i of incidents ?? []) {
    items.push({ id: `incident-${i.id}`, tone: "danger", title: i.monitor?.name ?? "Incident", detail: i.cause ?? "Open incident", to: i.monitor?.id ? `/monitors/${i.monitor.id}` : "/incidents", at: i.startedAt });
  }
  for (const m of monitors ?? []) {
    const d = m.sslInfo?.daysRemaining;
    if (d != null && d <= 14) {
      items.push({ id: `ssl-${m.id}`, tone: d <= 3 ? "danger" : "warning", title: m.name, detail: d <= 0 ? "SSL certificate expired" : `SSL certificate expires in ${d}d`, to: `/monitors/${m.id}`, at: null });
    }
  }
  if (usage && usage.maxMonitors > 0 && usage.currentMonitors / usage.maxMonitors >= 0.9) {
    items.push({ id: "plan-usage", tone: "warning", title: "Approaching monitor limit", detail: `${usage.currentMonitors}/${usage.maxMonitors} monitors used on the ${usage.plan} plan`, to: "/team", at: null });
  }
  return items;
}
function useAdminNotifications(active) {
  const { data: incidents } = useQuery({ queryKey: ["admin-open-incidents"], queryFn: fetchAdminOpenIncidents, staleTime: 30_000, retry: false, enabled: active });
  const { data: securityHighlights } = useQuery({ queryKey: ["admin-security-highlights"], queryFn: () => fetchSecurityHighlights(6), staleTime: 30_000, retry: false, enabled: active });
  const { data: resellerApps } = useQuery({ queryKey: ["reseller-applications"], queryFn: fetchResellerApplications, staleTime: 30_000, retry: false, enabled: active });
  const items = [];
  for (const i of (incidents ?? []).slice(0, 6)) {
    items.push({ id: `incident-${i.id}`, tone: "danger", title: i.monitorName ?? "Incident", detail: `${i.organizationName} · ${i.cause ?? "Open incident"}`, to: "/admin/incidents", at: i.startedAt });
  }
  for (const s of securityHighlights ?? []) {
    items.push({ id: `ssl-${s.monitorId}`, tone: s.daysRemaining <= 3 ? "danger" : "warning", title: s.monitorName, detail: `${s.organizationName} · SSL expires in ${s.daysRemaining}d`, to: "/admin/ssl", at: null });
  }
  for (const a of (resellerApps ?? []).filter(a => a.status === "pending")) {
    items.push({ id: `reseller-${a.id}`, tone: "info", title: a.companyName, detail: "Reseller application pending review", to: "/admin/resellers", at: a.createdAt });
  }
  return items;
}
const TONE_DOT = { danger: "bg-red-400", warning: "bg-amber-400", info: "bg-cyan-400" };
const TONE_TEXT = { danger: "text-red-300 light:text-red-700", warning: "text-amber-300 light:text-amber-700", info: "text-cyan-300 light:text-cyan-700" };

export function NotificationCenter({ scope }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const customerItems = useCustomerNotifications(scope !== "admin");
  const adminItems = useAdminNotifications(scope === "admin");
  const items = scope === "admin" ? adminItems : customerItems;
  const urgentCount = items.filter(i => i.tone === "danger" || i.tone === "warning").length;

  useEffect(() => {
    function onClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} aria-label={`Notifications${urgentCount > 0 ? ` (${urgentCount} need attention)` : ""}`} className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 light:border-slate-900/10 text-white/60 light:text-slate-500 transition-colors hover:border-white/25 hover:text-white light:hover:text-slate-900">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 1112 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z" />
          <path d="M10 19a2 2 0 004 0" />
        </svg>
        {urgentCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-400 px-1 text-[9px] font-medium text-black [animation:pulse-glow_1.8s_ease-in-out_infinite]">{urgentCount}</span>}
      </button>
      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.15 }} className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-950 light:bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] light:shadow-[0_30px_80px_-20px_rgba(15,23,42,0.25)]">
            <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
              <p className="text-sm font-medium text-white light:text-slate-900">Notifications</p>
              <p className="text-xs text-white/40 light:text-slate-400">{items.length === 0 ? "Nothing needs attention." : `${items.length} item${items.length === 1 ? "" : "s"}`}</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-white/40 light:text-slate-400">✓ All clear.</p> : <ul className="divide-y divide-white/[0.06] light:divide-slate-900/[0.06]">
                  {items.map(item => <li key={item.id}>
                      <Link to={item.to} onClick={() => setOpen(false)} className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-white/[0.03] light:hover:bg-slate-900/[0.02]">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white light:text-slate-900">{item.title}</p>
                          <p className={`truncate text-xs ${TONE_TEXT[item.tone]}`}>{item.detail}</p>
                        </div>
                      </Link>
                    </li>)}
                </ul>}
            </div>
          </motion.div>}
      </AnimatePresence>
    </div>;
}
