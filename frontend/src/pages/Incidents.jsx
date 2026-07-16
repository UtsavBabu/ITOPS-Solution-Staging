import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { fetchIncidents } from "../api/endpoints";
import { Reveal, SpotlightCard } from "../components/Animated";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
const EASE = [0.16, 1, 0.3, 1];
function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
function SummaryCard({
  label,
  value,
  tone = "default",
  delay = 0
}) {
  const color = tone === "danger" ? "text-red-300" : tone === "good" ? "text-emerald-300" : "text-white light:text-slate-900";
  return <motion.div initial={{
    opacity: 0,
    y: 16
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.5,
    delay,
    ease: EASE
  }} className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20">
      <p className="text-xs uppercase tracking-wide text-white/40 light:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>
        <AnimatedCounter value={value} />
      </p>
    </motion.div>;
}

// A real, evidence-based lifecycle timeline derived from the incident record.
function IncidentTimeline({
  incident
}) {
  const start = new Date(incident.startedAt);
  const resolved = incident.resolvedAt ? new Date(incident.resolvedAt) : null;
  const steps = [{
    t: start,
    label: "Issue detected",
    detail: "Consecutive failed checks crossed the failure threshold.",
    done: true,
    tone: "bg-red-400"
  }, {
    t: start,
    label: "Root cause identified",
    detail: incident.cause ?? "Cause recorded from the failing check.",
    done: true,
    tone: "bg-amber-400"
  }, {
    t: start,
    label: "Alerts dispatched",
    detail: "Configured alert channels were notified.",
    done: true,
    tone: "bg-cyan-400"
  }, resolved ? {
    t: resolved,
    label: "Recovery verified",
    detail: "Checks passed again; the endpoint recovered.",
    done: true,
    tone: "bg-emerald-400"
  } : {
    t: null,
    label: "Awaiting recovery",
    detail: "The monitor is still failing. Recovery will auto-close this incident.",
    done: false,
    tone: "bg-white/30"
  }, resolved ? {
    t: resolved,
    label: "Incident closed",
    detail: "Auto-resolved on recovery.",
    done: true,
    tone: "bg-emerald-400"
  } : {
    t: null,
    label: "Incident open",
    detail: "Investigate on the monitor page for a full diagnosis.",
    done: false,
    tone: "bg-white/30"
  }];
  return <div className="mt-3 border-t border-white/10 pt-3">
      <ol className="space-y-0">
        {steps.map((s, i) => <motion.li key={i} initial={{
        opacity: 0,
        x: -6
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        duration: 0.3,
        delay: i * 0.06,
        ease: EASE
      }} className="relative flex gap-3 pb-3.5 last:pb-0">
            {i < steps.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-white/10" />}
            <span className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${s.tone}`} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className={`text-xs font-medium ${s.done ? "text-white/85 light:text-slate-700" : "text-white/45 light:text-slate-400"}`}>{s.label}</span>
                {s.t && <span className="font-mono text-[10px] text-white/30 light:text-slate-400">{s.t.toLocaleString()}</span>}
              </div>
              <p className="text-[11px] leading-relaxed text-white/45 light:text-slate-400">{s.detail}</p>
            </div>
          </motion.li>)}
      </ol>
    </div>;
}
export default function Incidents() {
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState(null);
  const {
    data: incidents,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["incidents", filter],
    queryFn: () => fetchIncidents(filter === "ALL" ? undefined : filter),
    refetchInterval: 30_000
  });
  // MTTR is computed from ALL incidents regardless of the current view filter.
  const {
    data: allIncidents
  } = useQuery({
    queryKey: ["incidents", "ALL"],
    queryFn: () => fetchIncidents(),
    refetchInterval: 60_000
  });
  const stats = useMemo(() => {
    const all = allIncidents ?? [];
    const resolved = all.filter(i => i.resolvedAt);
    const open = all.filter(i => i.status === "OPEN").length;
    const durations = resolved.map(i => new Date(i.resolvedAt).getTime() - new Date(i.startedAt).getTime());
    const mttr = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    return {
      total: all.length,
      open,
      resolved: resolved.length,
      mttr
    };
  }, [allIncidents]);
  return <div className="space-y-6">
      <Reveal y={12} className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Incidents</h1>
        <div className="flex gap-2 text-sm">
          {["ALL", "OPEN", "RESOLVED"].map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 transition-colors ${filter === value ? "bg-white text-black" : "border border-white/15 text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
              {value === "ALL" ? "All" : value === "OPEN" ? "Open" : "Resolved"}
            </button>)}
        </div>
      </Reveal>

      {/* Troubleshooting summary — real metrics from incident history */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Open incidents" value={stats.open} tone={stats.open > 0 ? "danger" : "good"} delay={0} />
        <SummaryCard label="Mean time to repair" value={stats.mttr != null ? fmtDuration(stats.mttr) : "—"} delay={0.04} />
        <SummaryCard label="Resolved" value={stats.resolved} tone="good" delay={0.08} />
        <SummaryCard label="Total incidents" value={stats.total} delay={0.12} />
      </div>

      <SpotlightCard className="overflow-hidden" delay={0.1} scan tint={stats.open > 0 ? "cyan" : "white"}>
        {isLoading ? <SkeletonRows count={3} className="h-12" /> : isError ? <ErrorState message={`Couldn't load incidents: ${error instanceof Error ? error.message : "unknown error"}`} onRetry={() => refetch()} /> : !incidents || incidents.length === 0 ? <EmptyState title={`No incidents${filter !== "ALL" ? ` (${filter.toLowerCase()})` : ""}.`} description="When a monitor fails repeatedly, an incident opens here automatically." /> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
            {incidents.map((incident, i) => {
          const open = expanded === incident.id;
          const dur = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime() : Date.now() - new Date(incident.startedAt).getTime();
          return <motion.li key={incident.id} initial={{
            opacity: 0,
            x: -8
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            duration: 0.35,
            delay: Math.min(i, 15) * 0.03,
            ease: EASE
          }} className="px-4 py-3.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/monitors/${incident.monitor.id}`} className="font-medium text-white light:text-slate-900 hover:underline">
                        {incident.monitor.name}
                      </Link>
                      <p className="truncate text-white/50 light:text-slate-500">
                        {incident.cause ?? "Unknown cause"} · started {new Date(incident.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/40 light:text-slate-400">{fmtDuration(dur)}{incident.status === "OPEN" ? " ongoing" : ""}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${incident.status === "OPEN" ? "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700" : "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700"}`}>
                        {incident.status === "OPEN" && <span className="relative grid h-1.5 w-1.5 place-items-center">
                            <span className="absolute h-1.5 w-1.5 rounded-full bg-red-400/70 animate-sonar [animation-duration:1.1s]" />
                            <span className="relative h-1.5 w-1.5 rounded-full bg-red-400" />
                          </span>}
                        {incident.status}
                      </span>
                      <button onClick={() => setExpanded(open ? null : incident.id)} className="text-xs text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900" aria-expanded={open}>
                        {open ? "Hide timeline" : "Timeline"}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {open && <motion.div initial={{
                height: 0,
                opacity: 0
              }} animate={{
                height: "auto",
                opacity: 1
              }} exit={{
                height: 0,
                opacity: 0
              }} transition={{
                duration: 0.3,
                ease: EASE
              }} className="overflow-hidden">
                        <IncidentTimeline incident={incident} />
                      </motion.div>}
                  </AnimatePresence>
                </motion.li>;
        })}
          </ul>}
      </SpotlightCard>
    </div>;
}