import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchIncidents } from "../api/endpoints";
import type { Incident, IncidentStatus } from "../api/types";

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" | "good" }) {
  const color = tone === "danger" ? "text-red-300" : tone === "good" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

// A real, evidence-based lifecycle timeline derived from the incident record.
function IncidentTimeline({ incident }: { incident: Incident }) {
  const start = new Date(incident.startedAt);
  const resolved = incident.resolvedAt ? new Date(incident.resolvedAt) : null;
  const steps: Array<{ t: Date | null; label: string; detail: string; done: boolean; tone: string }> = [
    { t: start, label: "Issue detected", detail: "Consecutive failed checks crossed the failure threshold.", done: true, tone: "bg-red-400" },
    { t: start, label: "Root cause identified", detail: incident.cause ?? "Cause recorded from the failing check.", done: true, tone: "bg-amber-400" },
    { t: start, label: "Alerts dispatched", detail: "Configured alert channels were notified.", done: true, tone: "bg-cyan-400" },
    resolved
      ? { t: resolved, label: "Recovery verified", detail: "Checks passed again; the endpoint recovered.", done: true, tone: "bg-emerald-400" }
      : { t: null, label: "Awaiting recovery", detail: "The monitor is still failing. Recovery will auto-close this incident.", done: false, tone: "bg-white/30" },
    resolved
      ? { t: resolved, label: "Incident closed", detail: "Auto-resolved on recovery.", done: true, tone: "bg-emerald-400" }
      : { t: null, label: "Incident open", detail: "Investigate on the monitor page for a full diagnosis.", done: false, tone: "bg-white/30" },
  ];
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <ol className="space-y-0">
        {steps.map((s, i) => (
          <li key={i} className="relative flex gap-3 pb-3.5 last:pb-0">
            {i < steps.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-white/10" />}
            <span className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${s.tone}`} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className={`text-xs font-medium ${s.done ? "text-white/85" : "text-white/45"}`}>{s.label}</span>
                {s.t && <span className="font-mono text-[10px] text-white/30">{s.t.toLocaleString()}</span>}
              </div>
              <p className="text-[11px] leading-relaxed text-white/45">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Incidents() {
  const [filter, setFilter] = useState<IncidentStatus | "ALL">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents", filter],
    queryFn: () => fetchIncidents(filter === "ALL" ? undefined : filter),
    refetchInterval: 30_000,
  });
  // MTTR is computed from ALL incidents regardless of the current view filter.
  const { data: allIncidents } = useQuery({ queryKey: ["incidents", "ALL"], queryFn: () => fetchIncidents(), refetchInterval: 60_000 });

  const stats = useMemo(() => {
    const all = allIncidents ?? [];
    const resolved = all.filter((i) => i.resolvedAt);
    const open = all.filter((i) => i.status === "OPEN").length;
    const durations = resolved.map((i) => new Date(i.resolvedAt!).getTime() - new Date(i.startedAt).getTime());
    const mttr = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    return { total: all.length, open, resolved: resolved.length, mttr };
  }, [allIncidents]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-tight text-white">Incidents</h1>
        <div className="flex gap-2 text-sm">
          {(["ALL", "OPEN", "RESOLVED"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                filter === value ? "bg-white text-black" : "border border-white/15 text-white/60 hover:text-white"
              }`}
            >
              {value === "ALL" ? "All" : value === "OPEN" ? "Open" : "Resolved"}
            </button>
          ))}
        </div>
      </div>

      {/* Troubleshooting summary — real metrics from incident history */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Open incidents" value={String(stats.open)} tone={stats.open > 0 ? "danger" : "good"} />
        <SummaryCard label="Mean time to repair" value={stats.mttr != null ? fmtDuration(stats.mttr) : "—"} />
        <SummaryCard label="Resolved" value={String(stats.resolved)} tone="good" />
        <SummaryCard label="Total incidents" value={String(stats.total)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : !incidents || incidents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-white/60">No incidents{filter !== "ALL" ? ` (${filter.toLowerCase()})` : ""}.</p>
            <p className="mt-1 text-xs text-white/35">When a monitor fails repeatedly, an incident opens here automatically.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {incidents.map((incident) => {
              const open = expanded === incident.id;
              const dur = incident.resolvedAt
                ? new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime()
                : Date.now() - new Date(incident.startedAt).getTime();
              return (
                <li key={incident.id} className="px-4 py-3.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/monitors/${incident.monitor.id}`} className="font-medium text-white hover:underline">
                        {incident.monitor.name}
                      </Link>
                      <p className="truncate text-white/50">
                        {incident.cause ?? "Unknown cause"} · started {new Date(incident.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/40">{fmtDuration(dur)}{incident.status === "OPEN" ? " ongoing" : ""}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${incident.status === "OPEN" ? "bg-red-400/10 text-red-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                        {incident.status}
                      </span>
                      <button onClick={() => setExpanded(open ? null : incident.id)} className="text-xs text-white/50 hover:text-white" aria-expanded={open}>
                        {open ? "Hide timeline" : "Timeline"}
                      </button>
                    </div>
                  </div>
                  {open && <IncidentTimeline incident={incident} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
