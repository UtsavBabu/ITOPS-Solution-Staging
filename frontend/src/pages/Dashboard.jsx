import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { fetchDashboardSummary, fetchIncidents, fetchMonitors, fetchMyPermissions, fetchPlanUsage } from "../api/endpoints";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { Reveal, SpotlightCard } from "../components/Animated";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";
import { useAuth } from "../context/AuthContext";
import { GettingStartedChecklist } from "../components/GettingStartedChecklist";
const REALTIME_TABLES = ["monitors", "incidents", "check_results"];
const REALTIME_KEYS = [["dashboard-summary"], ["monitors"], ["incidents", "OPEN"]];
const EASE = [0.16, 1, 0.3, 1];
const PLAN_FEATURES = {
  STARTER: {
    networkMonitors: false,
    hosts: false,
    alertChannels: 1,
    historyDays: 7
  },
  PROFESSIONAL: {
    networkMonitors: true,
    hosts: true,
    alertChannels: 5,
    historyDays: 30
  },
  BUSINESS: {
    networkMonitors: true,
    hosts: true,
    alertChannels: 20,
    historyDays: 90
  },
  ENTERPRISE: {
    networkMonitors: true,
    hosts: true,
    alertChannels: 999999,
    historyDays: 365
  }
};
// Real wall-clock time, ticking every second — not decorative, this is the
// same clock a NOC/command-center display shows so a screenshot or a
// glance always carries "as of when."
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>;
}

// The ticker line is computed from the same real summary data the stat
// cards show — never a separate "looks healthy" flag that could drift
// from what's actually true.
function StatusTicker({ summary }) {
  if (!summary) return <span className="text-white/40 light:text-slate-400">Loading system status…</span>;
  const down = summary.downMonitors ?? 0;
  const incidents = summary.openIncidents ?? 0;
  if (down === 0 && incidents === 0) {
    return <span className="inline-flex items-center gap-1.5 text-emerald-300 light:text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
        All systems operational
      </span>;
  }
  const parts = [];
  if (down > 0) parts.push(`${down} monitor${down === 1 ? "" : "s"} down`);
  if (incidents > 0) parts.push(`${incidents} open incident${incidents === 1 ? "" : "s"}`);
  return <span className="inline-flex items-center gap-1.5 text-red-300 light:text-red-700">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400 [animation:pulse-glow_1s_ease-in-out_infinite]" />
      {parts.join(" · ")}
    </span>;
}

function UpgradePrompt({
  feature
}) {
  return <div className="flex items-center justify-between rounded-xl border border-dashed border-white/15 bg-white/[0.02] light:bg-slate-900/[0.02] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white/70 light:text-slate-600">{feature}</p>
        <p className="text-xs text-white/40 light:text-slate-400">Available on Professional plan and above</p>
      </div>
      <Link to="/team" className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200">
        Upgrade
      </Link>
    </div>;
}
function SectionPanel({
  title,
  action,
  children,
  delay = 0,
  badge,
  scan = false
}) {
  return <SpotlightCard delay={delay} scan={scan}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-white light:text-slate-900">{title}</h2>
          {badge}
        </div>
        {action && <Link to={action.to} className="text-xs text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900">
            {action.label} →
          </Link>}
      </div>
      {children}
    </SpotlightCard>;
}
function MonitorRow({
  monitor,
  index,
  subtitle
}) {
  return <motion.li initial={{
    opacity: 0,
    x: -8
  }} animate={{
    opacity: 1,
    x: 0
  }} transition={{
    duration: 0.35,
    delay: index * 0.04,
    ease: EASE
  }} className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-white/[0.02] light:hover:bg-slate-900/[0.02]">
      <div className="min-w-0">
        <p className="truncate font-medium text-white light:text-slate-900">{monitor.name}</p>
        <p className="truncate text-xs text-white/50 light:text-slate-500">{subtitle}</p>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-3">
        <StatusBadge status={monitor.lastStatus} />
        <Link to={`/monitors/${monitor.id}`} className="text-xs text-white/60 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900">
          View
        </Link>
      </div>
    </motion.li>;
}
export default function Dashboard() {
  useRealtimeInvalidate(REALTIME_TABLES, REALTIME_KEYS);
  const {
    organization
  } = useAuth();
  const { data: can } = useQuery({
    queryKey: ["my-permissions", organization?.id],
    queryFn: () => fetchMyPermissions(organization?.id),
    enabled: !!organization?.id,
    retry: false
  });
  const canViewBilling = !can || can("organization", "billing", "view");
  const {
    data: summary
  } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000
  });
  const {
    data: monitors,
    isError: monitorsError,
    refetch: refetchMonitors
  } = useQuery({
    queryKey: ["monitors"],
    queryFn: fetchMonitors,
    refetchInterval: 60_000
  });
  const {
    data: openIncidents,
    isError: incidentsError,
    refetch: refetchIncidents
  } = useQuery({
    queryKey: ["incidents", "OPEN"],
    queryFn: () => fetchIncidents("OPEN"),
    refetchInterval: 60_000
  });
  const {
    data: usage
  } = useQuery({
    queryKey: ["plan-usage"],
    queryFn: fetchPlanUsage,
    staleTime: 60_000
  });
  const plan = usage?.plan ?? "STARTER";
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.STARTER;
  const webMonitors = monitors?.filter(m => ["HTTP", "KEYWORD", "STATUS_CODE"].includes(m.checkType)) ?? [];
  const networkMonitors = monitors?.filter(m => ["TCP", "DNS"].includes(m.checkType)) ?? [];
  return <div className="space-y-6">
      <Reveal y={12}>
        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Dashboard</h1>
            <p className="mt-0.5 text-sm text-white/40 light:text-slate-400">{organization?.name}</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-xs"><StatusTicker summary={summary} /></p>
              <p className="mt-0.5 text-[11px] text-white/35 light:text-slate-400"><LiveClock /></p>
            </div>
            <Link to="/monitors" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-200">
              + Add Monitor
            </Link>
          </div>
        </div>
      </Reveal>

      <GettingStartedChecklist monitors={monitors} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Monitors" value={summary?.totalMonitors ?? "—"} icon="monitors" delay={0} countUp />
        <StatCard label="Up" value={summary?.upMonitors ?? "—"} icon="up" delay={0.04} countUp />
        <StatCard label="Down" value={summary?.downMonitors ?? "—"} tone={summary && summary.downMonitors > 0 ? "danger" : "default"} icon="down" delay={0.08} countUp />
        <StatCard label="Open Incidents" value={summary?.openIncidents ?? "—"} tone={summary && summary.openIncidents > 0 ? "danger" : "default"} icon="incidents" delay={0.12} countUp />
        <StatCard label="Assets" value={summary?.totalAssets ?? "—"} icon="assets" delay={0.16} countUp />
        <StatCard label="SSL Expiring" value={summary?.expiringSsl ?? "—"} tone={summary && summary.expiringSsl > 0 ? "warning" : "default"} icon="ssl" delay={0.2} countUp />
      </div>

      {/* Open Incidents */}
      <SectionPanel title="Open Incidents" action={{
      label: "View all",
      to: "/incidents"
    }} delay={0.05} scan>
        {incidentsError ? <ErrorState message="Couldn't load open incidents." onRetry={() => refetchIncidents()} /> : !openIncidents ? <SkeletonRows count={2} /> : openIncidents.length === 0 ? <p className="p-4 text-sm text-white/50 light:text-slate-500">✓ No open incidents. Everything looks healthy.</p> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
            {openIncidents.slice(0, 5).map((incident, i) => <motion.li key={incident.id} initial={{
          opacity: 0,
          x: -8
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.35,
          delay: i * 0.04,
          ease: EASE
        }} className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-white/[0.02] light:hover:bg-slate-900/[0.02]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white light:text-slate-900">{incident.monitor.name}</p>
                  <p className="truncate text-xs text-white/50 light:text-slate-500">
                    {incident.cause ?? "Unknown cause"} · {new Date(incident.startedAt).toLocaleString()}
                  </p>
                </div>
                <Link to={`/monitors/${incident.monitor.id}`} className="ml-4 shrink-0 text-xs text-red-300 light:text-red-600 hover:underline">
                  View →
                </Link>
              </motion.li>)}
          </ul>}
      </SectionPanel>

      {/* Website Monitors */}
      <SectionPanel title="Website & API Monitors" action={{
      label: "Manage",
      to: "/monitors"
    }} delay={0.1} scan>
        {monitorsError ? <ErrorState message="Couldn't load monitors." onRetry={() => refetchMonitors()} /> : !monitors ? <SkeletonRows count={3} /> : webMonitors.length === 0 ? <EmptyState title="No website monitors yet." action={{
        label: "Add your first monitor",
        to: "/monitors"
      }} /> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
            {webMonitors.slice(0, 6).map((monitor, i) => <MonitorRow key={monitor.id} monitor={monitor} index={i} subtitle={monitor.url} />)}
          </ul>}
      </SectionPanel>

      {/* Network Device Monitors — plan gated */}
      {features.networkMonitors ? <SectionPanel title="Network Devices" action={{
      label: "Manage",
      to: "/network"
    }} delay={0.15} badge={<span className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">TCP/DNS</span>}>
          {networkMonitors.length === 0 ? <EmptyState title="No network devices monitored yet." description="Add your router, GPON terminal, switches, or firewalls from Network Devices." action={{
        label: "Add device",
        to: "/network"
      }} /> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
              {networkMonitors.slice(0, 6).map((monitor, i) => <MonitorRow key={monitor.id} monitor={monitor} index={i} subtitle={monitor.checkType === "TCP" ? `${monitor.url}:${monitor.tcpPort}` : monitor.url} />)}
            </ul>}
        </SectionPanel> : <Reveal delay={0.15}>
          <UpgradePrompt feature="Network Device Monitoring (Routers, GPON/Fiber Terminals, Switches, Firewalls)" plan={plan} />
        </Reveal>}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[{
        label: "Add Monitor",
        to: "/monitors",
        color: "border-white/15 light:border-slate-900/15 hover:bg-white/5 light:hover:bg-slate-900/[0.04]"
      }, {
        label: "View Incidents",
        to: "/incidents",
        color: "border-white/15 light:border-slate-900/15 hover:bg-white/5 light:hover:bg-slate-900/[0.04]"
      }, {
        label: "Alert Channels",
        to: "/settings/alerts",
        color: "border-white/15 light:border-slate-900/15 hover:bg-white/5 light:hover:bg-slate-900/[0.04]"
      }, {
        label: "Users",
        to: "/users",
        color: "border-white/15 light:border-slate-900/15 hover:bg-white/5 light:hover:bg-slate-900/[0.04]"
      }, ...(canViewBilling ? [{
        label: "Team & Plan",
        to: "/team",
        color: "border-amber-400/20 light:border-amber-500/30 bg-amber-400/5 light:bg-amber-100 hover:bg-amber-400/10 light:hover:bg-amber-400/20 text-amber-300 light:text-amber-700"
      }] : [])].map((action, i) => <motion.div key={action.to} initial={{
        opacity: 0,
        y: 12
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.4,
        delay: 0.2 + i * 0.05,
        ease: EASE
      }}>
            <Link to={action.to} className={`block rounded-xl border px-4 py-3 text-center text-sm font-medium text-white/70 light:text-slate-600 transition-all duration-200 hover:-translate-y-0.5 ${action.color}`}>
              {action.label}
            </Link>
          </motion.div>)}
      </div>
    </div>;
}