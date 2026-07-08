import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchDashboardSummary, fetchIncidents, fetchMonitors, fetchPlanUsage } from "../api/endpoints";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";
import { useAuth } from "../context/AuthContext";

const REALTIME_TABLES = ["monitors", "incidents", "check_results"];
const REALTIME_KEYS = [["dashboard-summary"], ["monitors"], ["incidents", "OPEN"]];

const PLAN_FEATURES: Record<string, { networkMonitors: boolean; hosts: boolean; alertChannels: number; historyDays: number }> = {
  STARTER:      { networkMonitors: false, hosts: false, alertChannels: 1,      historyDays: 7   },
  PROFESSIONAL: { networkMonitors: true,  hosts: true,  alertChannels: 5,      historyDays: 30  },
  BUSINESS:     { networkMonitors: true,  hosts: true,  alertChannels: 20,     historyDays: 90  },
  ENTERPRISE:   { networkMonitors: true,  hosts: true,  alertChannels: 999999, historyDays: 365 },
};

function UpgradePrompt({ feature }: { feature: string; plan: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white/70">{feature}</p>
        <p className="text-xs text-white/40">Available on Professional plan and above</p>
      </div>
      <Link
        to="/team"
        className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200"
      >
        Upgrade
      </Link>
    </div>
  );
}

export default function Dashboard() {
  useRealtimeInvalidate(REALTIME_TABLES, REALTIME_KEYS);
  const { organization } = useAuth();

  const { data: summary } = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary, refetchInterval: 60_000 });
  const { data: monitors } = useQuery({ queryKey: ["monitors"], queryFn: fetchMonitors, refetchInterval: 60_000 });
  const { data: openIncidents } = useQuery({ queryKey: ["incidents", "OPEN"], queryFn: () => fetchIncidents("OPEN"), refetchInterval: 60_000 });
  const { data: usage } = useQuery({ queryKey: ["plan-usage"], queryFn: fetchPlanUsage, staleTime: 60_000 });

  const plan = usage?.plan ?? "STARTER";
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.STARTER;

  const webMonitors = monitors?.filter((m) => ["HTTP", "KEYWORD", "STATUS_CODE"].includes(m.checkType)) ?? [];
  const networkMonitors = monitors?.filter((m) => ["TCP", "DNS"].includes(m.checkType)) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-white/40">{organization?.name}</p>
        </div>
        <Link
          to="/monitors"
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
        >
          + Add Monitor
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Monitors" value={summary?.totalMonitors ?? "—"} />
        <StatCard label="Up" value={summary?.upMonitors ?? "—"} />
        <StatCard label="Down" value={summary?.downMonitors ?? "—"} tone={summary && summary.downMonitors > 0 ? "danger" : "default"} />
        <StatCard label="Open Incidents" value={summary?.openIncidents ?? "—"} tone={summary && summary.openIncidents > 0 ? "danger" : "default"} />
        <StatCard label="Assets" value={summary?.totalAssets ?? "—"} />
        <StatCard label="SSL Expiring" value={summary?.expiringSsl ?? "—"} tone={summary && summary.expiringSsl > 0 ? "warning" : "default"} />
      </div>

      {/* Open Incidents */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">Open Incidents</h2>
          <Link to="/incidents" className="text-xs text-white/50 hover:text-white">View all →</Link>
        </div>
        {!openIncidents ? (
          <div className="space-y-2 p-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}</div>
        ) : openIncidents.length === 0 ? (
          <p className="p-4 text-sm text-white/50">✓ No open incidents. Everything looks healthy.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {openIncidents.slice(0, 5).map((incident) => (
              <li key={incident.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{incident.monitor.name}</p>
                  <p className="truncate text-xs text-white/50">{incident.cause ?? "Unknown cause"} · {new Date(incident.startedAt).toLocaleString()}</p>
                </div>
                <Link to={`/monitors/${incident.monitor.id}`} className="ml-4 shrink-0 text-xs text-red-300 hover:underline">View →</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Website Monitors */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">Website & API Monitors</h2>
          <Link to="/monitors" className="text-xs text-white/50 hover:text-white">Manage →</Link>
        </div>
        {!monitors ? (
          <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}</div>
        ) : webMonitors.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-white/50">No website monitors yet.</p>
            <Link to="/monitors" className="mt-2 inline-block text-sm text-white hover:underline">Add your first monitor →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {webMonitors.slice(0, 6).map((monitor) => (
              <li key={monitor.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{monitor.name}</p>
                  <p className="truncate text-xs text-white/50">{monitor.url}</p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-3">
                  <StatusBadge status={monitor.lastStatus} />
                  <Link to={`/monitors/${monitor.id}`} className="text-xs text-white/60 hover:text-white">View</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Network Device Monitors — plan gated */}
      {features.networkMonitors ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-white">Network Devices</h2>
              <span className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">TCP/DNS</span>
            </div>
            <Link to="/monitors" className="text-xs text-white/50 hover:text-white">Manage →</Link>
          </div>
          {networkMonitors.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-white/50">No network devices monitored yet.</p>
              <p className="mt-1 text-xs text-white/30">Add routers, switches, firewalls via Monitors → Network Devices tab.</p>
              <Link to="/monitors" className="mt-2 inline-block text-sm text-white hover:underline">Add device →</Link>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {networkMonitors.slice(0, 6).map((monitor) => (
                <li key={monitor.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{monitor.name}</p>
                    <p className="truncate text-xs text-white/50">
                      {monitor.checkType === "TCP" ? `${monitor.url}:${monitor.tcpPort}` : monitor.url}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <StatusBadge status={monitor.lastStatus} />
                    <Link to={`/monitors/${monitor.id}`} className="text-xs text-white/60 hover:text-white">View</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <UpgradePrompt feature="Network Device Monitoring (Routers, Switches, Firewalls)" plan={plan} />
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Add Monitor", to: "/monitors", color: "border-white/15 hover:bg-white/5" },
          { label: "View Incidents", to: "/incidents", color: "border-white/15 hover:bg-white/5" },
          { label: "Alert Channels", to: "/settings/alerts", color: "border-white/15 hover:bg-white/5" },
          { label: "Team & Plan", to: "/team", color: "border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10 text-amber-300" },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`rounded-xl border px-4 py-3 text-center text-sm font-medium text-white/70 transition-colors ${action.color}`}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
