import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchDashboardSummary, fetchIncidents, fetchMonitors } from "../api/endpoints";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";

const REALTIME_TABLES = ["monitors", "incidents", "check_results"];
const REALTIME_KEYS = [["dashboard-summary"], ["monitors"], ["incidents", "OPEN"]];

export default function Dashboard() {
  useRealtimeInvalidate(REALTIME_TABLES, REALTIME_KEYS);

  // Realtime pushes updates the moment a row changes; the interval below is
  // just a safety net in case a Realtime event is ever missed.
  const { data: summary } = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary, refetchInterval: 60_000 });
  const { data: monitors } = useQuery({ queryKey: ["monitors"], queryFn: fetchMonitors, refetchInterval: 60_000 });
  const { data: openIncidents } = useQuery({
    queryKey: ["incidents", "OPEN"],
    queryFn: () => fetchIncidents("OPEN"),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium tracking-tight text-white">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {["Monitors", "Up", "Down", "Open incidents", "Assets", "SSL expiring soon"].map((label, i) => {
          const values = [
            summary?.totalMonitors,
            summary?.upMonitors,
            summary?.downMonitors,
            summary?.openIncidents,
            summary?.totalAssets,
            summary?.expiringSsl,
          ];
          const tones: Array<"default" | "danger" | "warning"> = [
            "default",
            "default",
            summary && summary.downMonitors > 0 ? "danger" : "default",
            summary && summary.openIncidents > 0 ? "danger" : "default",
            "default",
            summary && summary.expiringSsl > 0 ? "warning" : "default",
          ];
          return (
            <StatCard
              key={label}
              label={label}
              value={values[i] ?? "—"}
              tone={tones[i]}
            />
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">Open Incidents</h2>
        </div>
        {!openIncidents || openIncidents.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No open incidents. Everything looks healthy.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {openIncidents.map((incident) => (
              <li key={incident.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">{incident.monitor.name}</p>
                  <p className="text-white/50">{incident.cause ?? "Unknown cause"} · since {new Date(incident.startedAt).toLocaleString()}</p>
                </div>
                <Link to={`/monitors/${incident.monitor.id}`} className="text-white hover:underline">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">Monitors</h2>
          <Link to="/monitors" className="text-xs text-white/50 hover:text-white">View all →</Link>
        </div>
        {!monitors ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : monitors.length === 0 ? (
          <p className="p-4 text-sm text-white/50">
            No monitors yet. <Link to="/monitors" className="text-white hover:underline">Add your first website</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {monitors.slice(0, 8).map((monitor) => (
              <li key={monitor.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{monitor.name}</p>
                  <p className="truncate text-xs text-white/50">{monitor.url}</p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-3">
                  <StatusBadge status={monitor.lastStatus} />
                  <Link to={`/monitors/${monitor.id}`} className="text-xs text-white/60 hover:text-white">
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
