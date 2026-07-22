import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { motion } from "motion/react";
import { fetchAdminCustomers, fetchAdminOrganizations, fetchAdminStats, fetchAuditLog, fetchProductAdoption, fetchResellerApplications, fetchSecurityHighlights } from "../../api/adminEndpoints";
import { useAuth } from "../../context/AuthContext";
import { AdminStatCard } from "../../components/AdminStatCard";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonStatGrid, SkeletonRows } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/EmptyState";
import { PLAN_ORDER } from "../../lib/planTiers";
const EASE = [0.16, 1, 0.3, 1];
const PLAN_COLOR = {
  STARTER: "bg-white/25 light:bg-slate-900/25",
  PROFESSIONAL: "bg-cyan-400/70",
  BUSINESS: "bg-violet-400/70",
  ENTERPRISE: "bg-amber-400/70"
};
// `roles` omitted = visible to every admin role, same convention as
// AdminLayout's nav groups — a reseller only sees the ones relevant to
// managing their own book of customers.
const QUICK_LINKS = [{
  label: "Customers",
  to: "/admin/customers",
  hint: "Provision, rename, archive"
}, {
  label: "All Users",
  to: "/admin/users",
  hint: "Cross-org user accounts",
  roles: ["super_admin", "platform_administrator", "support"]
}, {
  label: "Roles & Permissions",
  to: "/admin/roles",
  hint: "Module × action grid, per role",
  roles: ["super_admin", "platform_administrator"]
}, {
  label: "Content Manager",
  to: "/admin/content",
  hint: "Marketing site content",
  roles: ["super_admin", "content_editor"]
}, {
  label: "Plan Limits",
  to: "/admin/plans",
  hint: "Per-package caps",
  roles: ["super_admin", "billing"]
}, {
  label: "Audit Log",
  to: "/admin/audit-log",
  hint: "Every admin action, in order",
  roles: ["super_admin", "platform_administrator", "support", "billing", "content_editor"]
}];
function titleCase(v) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}
function timeAgo(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
export default function AdminOverview() {
  const { platformAdminRole, isPlatformAdmin, isPlatformInstructor } = useAuth();
  // Resellers get the platform-wide aggregate stat tiles and pure-aggregate
  // product adoption panel, same as every other admin role — but not named
  // individual-customer detail that belongs to organizations they didn't
  // provision (SSL/security highlights, the platform-wide admin action feed).
  const isResellerOnly = platformAdminRole === "reseller";
  const {
    data: stats,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    refetchInterval: 60_000
  });
  const {
    data: organizations
  } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: fetchAdminOrganizations
  });
  const {
    data: customers
  } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: fetchAdminCustomers
  });
  const { data: adoption, isLoading: adoptionLoading } = useQuery({
    queryKey: ["admin-product-adoption"],
    queryFn: fetchProductAdoption,
    retry: false
  });
  const { data: securityHighlights, isLoading: securityLoading } = useQuery({
    queryKey: ["admin-security-highlights"],
    queryFn: () => fetchSecurityHighlights(6),
    retry: false,
    enabled: !isResellerOnly
  });
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: () => fetchAuditLog(6, 0, null),
    retry: false,
    enabled: !isResellerOnly
  });
  // Only super_admin/support/platform_administrator can read this RPC — a
  // billing/content_editor admin lands here too, so a permission error is
  // expected and just means "don't show the badge," not a real failure.
  const { data: resellerApps } = useQuery({
    queryKey: ["reseller-applications"],
    queryFn: fetchResellerApplications,
    retry: false
  });
  const pendingResellerCount = resellerApps?.filter(a => a.status === "pending").length ?? 0;
  const planCounts = useMemo(() => {
    const counts = {
      STARTER: 0,
      PROFESSIONAL: 0,
      BUSINESS: 0,
      ENTERPRISE: 0
    };
    for (const org of organizations ?? []) counts[org.plan] = (counts[org.plan] ?? 0) + 1;
    return counts;
  }, [organizations]);
  const totalOrgs = organizations?.length ?? 0;
  const recentCustomers = useMemo(() => [...(customers ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [customers]);
  const maxAdoption = Math.max(1, ...(adoption ?? []).map(p => p.organizationCount));

  // An instructor-only account (no real platform_admins row) can't load any
  // of the RPCs this page queries above — send them straight to the one
  // page they actually have access to instead of a page full of "Not
  // authorized" errors. After every hook, per the Rules of Hooks.
  if (!isPlatformAdmin && isPlatformInstructor) {
    return <Navigate to="/admin/academy" replace />;
  }

  return <div className="space-y-6">
      <Reveal y={12} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">{isResellerOnly ? "My Customers Overview" : "Platform Overview"}</h1>
          <p className="text-sm text-white/50 light:text-slate-500">{isResellerOnly ? "Real-time status across the customers you've provisioned." : "Real-time operational status across every organization on ITOps Monitor."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/customers" className="rounded-full bg-amber-400 px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-amber-300">
            {isResellerOnly ? "+ Add customer" : "+ Create organization"}
          </Link>
          {!isResellerOnly && <Link to="/admin/resellers" className="relative rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 light:text-slate-600 transition-colors hover:text-white light:hover:text-slate-900">
            Reseller applications
            {pendingResellerCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-medium text-black">{pendingResellerCount}</span>}
          </Link>}
          {!isResellerOnly && <Link to="/admin/users" className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 light:text-slate-600 transition-colors hover:text-white light:hover:text-slate-900">
            Invite admin
          </Link>}
        </div>
      </Reveal>

      {isLoading ? <SkeletonStatGrid count={8} /> : isError ? <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white">
          <ErrorState message="Couldn't load platform stats." onRetry={() => refetch()} />
        </div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          <AdminStatCard label={isResellerOnly ? "My Customers" : "Organizations"} value={stats?.totalOrganizations ?? "—"} icon="organizations" delay={0} to="/admin/customers" />
          <AdminStatCard label="Licensed" value={stats?.totalLicensedOrganizations ?? "—"} icon="organizations" delay={0.03} to="/admin/customers" />
          <AdminStatCard label="Users" value={stats?.totalUsers ?? "—"} icon="users" delay={0.06} to={isResellerOnly ? undefined : "/admin/users"} />
          <AdminStatCard label="Monitors up" value={stats?.totalMonitorsUp ?? "—"} icon="monitors" delay={0.09} to={isResellerOnly ? undefined : "/admin/monitors"} />
          <AdminStatCard label="Monitors down" value={stats?.totalMonitorsDown ?? "—"} tone={stats && stats.totalMonitorsDown > 0 ? "warning" : "default"} icon="monitors" delay={0.12} to={isResellerOnly ? undefined : "/admin/monitors"} />
          <AdminStatCard label="Open incidents" value={stats?.totalOpenIncidents ?? "—"} tone={stats && stats.totalOpenIncidents > 0 ? "warning" : "default"} icon="incidents" delay={0.15} to={isResellerOnly ? undefined : "/admin/incidents"} />
          <AdminStatCard label="Agents online" value={stats ? `${stats.totalHostAgentsOnline}/${stats.totalHostAgents}` : "—"} icon="hosts" delay={0.18} to={isResellerOnly ? undefined : "/admin/agents"} />
          <AdminStatCard label="SSL expiring" value={stats?.totalSslExpiringSoon ?? "—"} tone={stats && stats.totalSslExpiringSoon > 0 ? "warning" : "default"} icon="security" delay={0.21} to={isResellerOnly ? undefined : "/admin/ssl"} />
        </div>}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        {/* Plan distribution */}
        <SpotlightCard className="p-5" delay={0.1} tint="amber" scan>
          <h2 className="text-sm font-medium text-white light:text-slate-900">Customers by package</h2>
          {totalOrgs === 0 ? <EmptyState title="No organizations yet." /> : <div className="mt-4 space-y-3">
              {PLAN_ORDER.map((plan, i) => {
            const count = planCounts[plan];
            const pct = totalOrgs > 0 ? Math.round(count / totalOrgs * 100) : 0;
            return <div key={plan}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 light:text-slate-500">{titleCase(plan)}</span>
                      <span className="text-white/40 light:text-slate-400">
                        {count} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06] light:bg-slate-900/[0.08]">
                      <motion.div className={`h-full rounded-full ${PLAN_COLOR[plan]}`} initial={{
                  width: 0
                }} animate={{
                  width: `${pct}%`
                }} transition={{
                  duration: 0.8,
                  delay: 0.2 + i * 0.08,
                  ease: EASE
                }} />
                    </div>
                  </div>;
          })}
            </div>}
        </SpotlightCard>

        {/* Recent customers */}
        <SpotlightCard className="overflow-hidden" delay={0.14} tint="amber" scan>
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <h2 className="text-sm font-medium text-white light:text-slate-900">{isResellerOnly ? "Your newest customers" : "Newest customers"}</h2>
            <Link to="/admin/customers" className="text-xs text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900">
              View all →
            </Link>
          </div>
          {recentCustomers.length === 0 ? <EmptyState title="No customers yet." /> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
              {recentCustomers.map((c, i) => <motion.li key={c.organizationId} initial={{
            opacity: 0,
            x: -8
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            duration: 0.3,
            delay: i * 0.05,
            ease: EASE
          }} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white light:text-slate-900">{c.name}</p>
                    <p className="truncate text-xs text-white/45 light:text-slate-400">{c.adminEmail ?? "—"}</p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.status === "active" ? "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700" : "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700"}`}>
                      {titleCase(c.status)}
                    </span>
                    <span className="text-xs text-white/35 light:text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.li>)}
            </ul>}
        </SpotlightCard>
      </div>

      <div className={`grid gap-4 ${isResellerOnly ? "lg:grid-cols-1" : "lg:grid-cols-3"}`}>
        {/* Product adoption — pure aggregate counts, no organization names,
            so this is safe to show a reseller alongside everyone else. */}
        <SpotlightCard className={isResellerOnly ? "p-5 lg:max-w-md" : "p-5"} delay={0.18} tint="amber">
          <h2 className="text-sm font-medium text-white light:text-slate-900">Product adoption</h2>
          <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">Organizations with an active license, per product.</p>
          {adoptionLoading ? <SkeletonRows count={3} /> : !adoption || adoption.length === 0 ? <EmptyState title="No products yet." className="py-6" /> : <div className="mt-4 space-y-3">
              {adoption.map((p, i) => <div key={p.productKey}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-white/60 light:text-slate-500">{p.productName}</span>
                    <span className="text-white/40 light:text-slate-400">{p.organizationCount}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06] light:bg-slate-900/[0.08]">
                    <motion.div className="h-full rounded-full bg-cyan-400/70" initial={{ width: 0 }} animate={{ width: `${p.organizationCount / maxAdoption * 100}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.06, ease: EASE }} />
                  </div>
                </div>)}
            </div>}
        </SpotlightCard>

        {/* Security highlights — named orgs/monitors, so it's platform-admin
            only; a reseller shouldn't see another customer's cert status. */}
        {!isResellerOnly && <SpotlightCard className="overflow-hidden" delay={0.22} tint="amber">
          <div className="border-b border-white/10 px-5 py-3.5">
            <h2 className="text-sm font-medium text-white light:text-slate-900">Security — SSL expiring soon</h2>
            <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">Certificates valid today but expiring within 14 days.</p>
          </div>
          {securityLoading ? <SkeletonRows count={3} /> : !securityHighlights || securityHighlights.length === 0 ? <EmptyState title="Nothing expiring soon." className="py-6" /> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
              {securityHighlights.map(s => <li key={s.monitorId} className="flex items-center justify-between px-5 py-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white/80 light:text-slate-700">{s.monitorName}</p>
                    <p className="truncate text-white/40 light:text-slate-400">{s.organizationName}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${s.daysRemaining <= 3 ? "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700" : "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700"}`}>
                    {s.daysRemaining}d left
                  </span>
                </li>)}
            </ul>}
        </SpotlightCard>}

        {/* Recent activity — the platform-wide admin action feed, so it's
            hidden for reseller the same way Security highlights is. */}
        {!isResellerOnly && <SpotlightCard className="overflow-hidden" delay={0.26} tint="amber">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <h2 className="text-sm font-medium text-white light:text-slate-900">Recent activity</h2>
            <Link to="/admin/audit-log" className="text-xs text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900">
              View all →
            </Link>
          </div>
          {activityLoading ? <SkeletonRows count={3} /> : !recentActivity || recentActivity.entries.length === 0 ? <EmptyState title="No admin activity yet." className="py-6" /> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
              {recentActivity.entries.map(entry => <li key={entry.id} className="px-5 py-2.5 text-xs">
                  <p className="truncate text-white/80 light:text-slate-700">
                    <span className="font-medium">{entry.actorEmail ?? "System"}</span> {entry.action.replaceAll("_", " ")} {entry.targetLabel ? <span className="text-white/50 light:text-slate-500">· {entry.targetLabel}</span> : null}
                  </p>
                  <p className="mt-0.5 text-white/35 light:text-slate-400">{timeAgo(entry.createdAt)}</p>
                </li>)}
            </ul>}
        </SpotlightCard>}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-white/70 light:text-slate-600">Quick links</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.filter(link => !link.roles || !platformAdminRole || link.roles.includes(platformAdminRole)).map((link, i) => <motion.div key={link.to} initial={{
          opacity: 0,
          y: 12
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4,
          delay: 0.2 + i * 0.04,
          ease: EASE
        }}>
              <Link to={link.to} className="group block rounded-xl border border-white/10 bg-white/[0.02] light:bg-slate-900/[0.02] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04]">
                <p className="text-sm font-medium text-white/85 light:text-slate-700 transition-colors group-hover:text-white light:group-hover:text-slate-900">{link.label}</p>
                <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">{link.hint}</p>
              </Link>
            </motion.div>)}
        </div>
      </div>
    </div>;
}
