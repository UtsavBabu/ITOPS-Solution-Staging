import { useQuery } from "@tanstack/react-query";
import { fetchAdminStats } from "../../api/adminEndpoints";
import { AdminStatCard } from "../../components/AdminStatCard";

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchAdminStats, refetchInterval: 60_000 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Platform Overview</h1>
        <p className="text-sm text-white/50">Real-time totals across every organization on ITOps Monitor.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <AdminStatCard label="Organizations" value={stats?.totalOrganizations ?? "—"} />
          <AdminStatCard label="Users" value={stats?.totalUsers ?? "—"} />
          <AdminStatCard label="Monitors" value={stats?.totalMonitors ?? "—"} />
          <AdminStatCard
            label="Open incidents"
            value={stats?.totalOpenIncidents ?? "—"}
            tone={stats && stats.totalOpenIncidents > 0 ? "warning" : "default"}
          />
          <AdminStatCard label="Waitlist signups" value={stats?.totalWaitlistSignups ?? "—"} />
          <AdminStatCard
            label="New messages"
            value={stats?.newContactMessages ?? "—"}
            tone={stats && stats.newContactMessages > 0 ? "warning" : "default"}
          />
        </div>
      )}
    </div>
  );
}
