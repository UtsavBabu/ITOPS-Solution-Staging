import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAdminCustomers, fetchAdminOrganizations, fetchAdminStats } from "../../api/adminEndpoints";
import { AdminStatCard } from "../../components/AdminStatCard";
import type { Plan } from "../../api/types";

const PLAN_ORDER: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];
const PLAN_COLOR: Record<Plan, string> = {
  STARTER: "bg-white/25",
  PROFESSIONAL: "bg-cyan-400/70",
  BUSINESS: "bg-violet-400/70",
  ENTERPRISE: "bg-amber-400/70",
};

const QUICK_LINKS = [
  { label: "Customers", to: "/admin/customers", hint: "Provision, rename, archive" },
  { label: "Organizations", to: "/admin/organizations", hint: "Every org on the platform" },
  { label: "All Users", to: "/admin/users", hint: "Cross-org user accounts" },
  { label: "Leads & Messages", to: "/admin/leads", hint: "Waitlist + contact inbox" },
  { label: "Content Manager", to: "/admin/content", hint: "Marketing site content" },
  { label: "Plan Limits", to: "/admin/plans", hint: "Per-package caps" },
  { label: "Audit Log", to: "/admin/audit-log", hint: "Every admin action, in order" },
];

function titleCase(v: string): string {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchAdminStats, refetchInterval: 60_000 });
  const { data: organizations } = useQuery({ queryKey: ["admin-organizations"], queryFn: fetchAdminOrganizations });
  const { data: customers } = useQuery({ queryKey: ["admin-customers"], queryFn: fetchAdminCustomers });

  const planCounts = useMemo(() => {
    const counts: Record<Plan, number> = { STARTER: 0, PROFESSIONAL: 0, BUSINESS: 0, ENTERPRISE: 0 };
    for (const org of organizations ?? []) counts[org.plan] = (counts[org.plan] ?? 0) + 1;
    return counts;
  }, [organizations]);
  const totalOrgs = organizations?.length ?? 0;

  const recentCustomers = useMemo(
    () => [...(customers ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [customers],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Platform Overview</h1>
        <p className="text-sm text-white/50">Real-time totals across every organization on ITOps Monitor.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <AdminStatCard label="Organizations" value={stats?.totalOrganizations ?? "—"} icon="organizations" />
          <AdminStatCard label="Users" value={stats?.totalUsers ?? "—"} icon="users" />
          <AdminStatCard label="Monitors" value={stats?.totalMonitors ?? "—"} icon="monitors" />
          <AdminStatCard
            label="Open incidents"
            value={stats?.totalOpenIncidents ?? "—"}
            tone={stats && stats.totalOpenIncidents > 0 ? "warning" : "default"}
            icon="incidents"
          />
          <AdminStatCard label="Waitlist signups" value={stats?.totalWaitlistSignups ?? "—"} icon="waitlist" />
          <AdminStatCard
            label="New messages"
            value={stats?.newContactMessages ?? "—"}
            tone={stats && stats.newContactMessages > 0 ? "warning" : "default"}
            icon="messages"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        {/* Plan distribution */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
          <h2 className="text-sm font-medium text-white">Customers by package</h2>
          {totalOrgs === 0 ? (
            <p className="mt-3 text-sm text-white/40">No organizations yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {PLAN_ORDER.map((plan) => {
                const count = planCounts[plan];
                const pct = totalOrgs > 0 ? Math.round((count / totalOrgs) * 100) : 0;
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{titleCase(plan)}</span>
                      <span className="text-white/40">
                        {count} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={`h-full rounded-full ${PLAN_COLOR[plan]} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent customers */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <h2 className="text-sm font-medium text-white">Newest customers</h2>
            <Link to="/admin/customers" className="text-xs text-white/50 hover:text-white">
              View all →
            </Link>
          </div>
          {recentCustomers.length === 0 ? (
            <p className="p-5 text-sm text-white/40">No customers yet.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {recentCustomers.map((c) => (
                <li key={c.organizationId} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{c.name}</p>
                    <p className="truncate text-xs text-white/45">{c.adminEmail ?? "—"}</p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.status === "active" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}
                    >
                      {titleCase(c.status)}
                    </span>
                    <span className="text-xs text-white/35">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-white/70">Quick links</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04]"
            >
              <p className="text-sm font-medium text-white/85 transition-colors group-hover:text-white">{link.label}</p>
              <p className="mt-0.5 text-xs text-white/40">{link.hint}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
