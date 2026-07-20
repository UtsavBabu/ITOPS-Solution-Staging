import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { fetchMonitor, fetchMonitorHistory, listHostAgents } from "../api/endpoints";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { ResponseTimeChart } from "../components/ResponseTimeChart";
import { RootCauseAnalysis } from "../components/RootCauseAnalysis";
import { DnsRecordsPanel } from "../components/DnsRecordsPanel";
import { Reveal, SpotlightCard } from "../components/Animated";
import { Skeleton, SkeletonRows, SkeletonStatGrid } from "../components/Skeleton";
import { ErrorState } from "../components/EmptyState";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";
const EASE = [0.16, 1, 0.3, 1];
const CHECK_TYPE_LABELS = {
  HTTP: "Uptime",
  KEYWORD: "Keyword",
  STATUS_CODE: "Status code",
  DNS: "DNS",
  TCP: "TCP port"
};
const REALTIME_TABLES = ["monitors", "check_results", "incidents"];
function describeCheck(monitor) {
  switch (monitor.checkType) {
    case "KEYWORD":
      return `Page must ${monitor.keywordMatchMode === "NOT_CONTAINS" ? "not contain" : "contain"} "${monitor.expectedKeyword ?? ""}"`;
    case "STATUS_CODE":
      return `Endpoint must return HTTP ${monitor.expectedStatusCode ?? "—"}`;
    case "DNS":
      return `${monitor.dnsRecordType} record must resolve${monitor.dnsExpectedValue ? ` and match "${monitor.dnsExpectedValue}"` : ""}`;
    case "TCP":
      return `Port ${monitor.tcpPort ?? "?"} must accept TCP connections`;
    case "HTTP":
    default:
      return "Endpoint must respond without an HTTP error";
  }
}
function RecentChecksTable({
  history,
  isLoading
}) {
  if (isLoading) {
    return <SkeletonRows count={5} className="h-9" />;
  }
  if (!history || history.length === 0) {
    return <div className="p-6 text-center">
        <p className="text-sm text-white/50 light:text-slate-500">No checks recorded yet.</p>
        <p className="mt-1 text-xs text-white/30 light:text-slate-400">Results appear here once the scheduler runs.</p>
      </div>;
  }
  return <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
          <tr>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Time</th>
            <th className="px-4 py-2.5">Response</th>
            <th className="px-4 py-2.5">HTTP Code</th>
            <th className="px-4 py-2.5">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {history.map((check, i) => <motion.tr key={check.id} initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          duration: 0.25,
          delay: Math.min(i, 20) * 0.015,
          ease: EASE
        }} className="transition-colors hover:bg-white/[0.02] light:hover:bg-slate-900/[0.02]">
              <td className="px-4 py-2.5">
                <StatusBadge status={check.status} />
              </td>
              <td className="px-4 py-2.5 text-white/60 light:text-slate-500">
                {new Date(check.checkedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            })}
              </td>
              <td className="px-4 py-2.5">
                {check.responseTimeMs != null ? <span className={check.responseTimeMs > 2000 ? "text-amber-300" : "text-white/80 light:text-slate-700"}>
                    {check.responseTimeMs.toLocaleString()} ms
                  </span> : <span className="text-white/30 light:text-slate-400">—</span>}
              </td>
              <td className="px-4 py-2.5 text-white/60 light:text-slate-500">
                {check.statusCode ?? <span className="text-white/30 light:text-slate-400">—</span>}
              </td>
              <td className="px-4 py-2.5 max-w-xs truncate text-white/40 light:text-slate-400 text-xs">
                {check.errorMessage ?? (check.redirectChain.length > 0 ? `${check.redirectChain.length} redirect(s)` : "—")}
              </td>
            </motion.tr>)}
        </tbody>
      </table>
    </div>;
}
export default function MonitorDetail() {
  const {
    id
  } = useParams();
  const realtimeKeys = [["monitor", id], ["monitor-history", id], ["monitors"]];
  useRealtimeInvalidate(REALTIME_TABLES, realtimeKeys);
  const {
    data: monitor,
    isLoading: monitorLoading,
    isError: monitorError,
    error: monitorErrorObj,
    refetch: refetchMonitor
  } = useQuery({
    queryKey: ["monitor", id],
    queryFn: () => fetchMonitor(id),
    enabled: !!id,
    refetchInterval: 15_000
  });
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ["monitor-history", id],
    queryFn: () => fetchMonitorHistory(id, 100),
    enabled: !!id,
    refetchInterval: 15_000
  });
  const { data: hostAgents } = useQuery({
    queryKey: ["host-agents"],
    queryFn: listHostAgents,
    enabled: !!monitor?.viaHostAgentId,
    staleTime: 30_000
  });
  if (monitorLoading) {
    return <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <SkeletonStatGrid count={4} />
      </div>;
  }

  // Distinguish a genuine fetch failure (network/server error — retryable)
  // from "this monitor doesn't exist / isn't yours" (RLS returns no row).
  if (monitorError) {
    return <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white">
        <ErrorState message={`Couldn't load this monitor: ${monitorErrorObj instanceof Error ? monitorErrorObj.message : "unknown error"}`} onRetry={() => refetchMonitor()} />
      </div>;
  }
  if (!monitor) {
    return <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white p-8 text-center">
        <p className="text-sm text-white/50 light:text-slate-500">Monitor not found.</p>
        <Link to="/monitors" className="mt-3 inline-block text-sm text-white light:text-slate-900 hover:underline">
          ← Back to Monitors
        </Link>
      </div>;
  }
  const upCount = history?.filter(h => h.status === "UP").length ?? 0;
  const totalCount = history?.length ?? 0;
  const uptimePct = totalCount > 0 ? (upCount / totalCount * 100).toFixed(1) : "—";
  const avgResponseMs = history && history.length > 0 ? Math.round(history.filter(h => h.responseTimeMs != null).reduce((sum, h) => sum + (h.responseTimeMs ?? 0), 0) / Math.max(1, history.filter(h => h.responseTimeMs != null).length)) : null;
  return <div className="space-y-6">
      {/* Header */}
      <Reveal y={12}>
        <Link to="/monitors" className="text-sm text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
          ← Back to Monitors
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">{monitor.name}</h1>
          <StatusBadge status={monitor.lastStatus} />
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/70 light:text-slate-600">
            {CHECK_TYPE_LABELS[monitor.checkType]} check
          </span>
          {monitor.viaHostAgentId && <span className="rounded-full bg-violet-400/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-300 light:bg-violet-100 light:text-violet-700">
              Relayed via {(hostAgents ?? []).find(a => a.id === monitor.viaHostAgentId)?.name ?? "agent"}
            </span>}
          {!monitor.isActive && <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
              Paused
            </span>}
        </div>
        {monitor.checkType === "DNS" || monitor.checkType === "TCP" ? <p className="text-sm text-white/50 light:text-slate-500">{monitor.url}</p> : <a href={monitor.url} target="_blank" rel="noreferrer" className="text-sm text-white/50 light:text-slate-500 hover:underline">
            {monitor.url}
          </a>}
        <p className="mt-1 text-sm text-white/40 light:text-slate-400">{describeCheck(monitor)}</p>
        <p className="mt-0.5 text-xs text-white/30 light:text-slate-400">
          Last checked:{" "}
          {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : "Pending first check"}
          {" · "}
          Next check:{" "}
          {monitor.nextCheckAt ? new Date(monitor.nextCheckAt).toLocaleString() : "—"}
        </p>
      </Reveal>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard label={`Uptime (${totalCount} checks)`} value={`${uptimePct}%`} delay={0} />
        <StatCard label="Avg response time" value={avgResponseMs != null ? `${avgResponseMs.toLocaleString()} ms` : "—"} tone={avgResponseMs != null && avgResponseMs > 2000 ? "warning" : "default"} delay={0.04} />
        <StatCard label="Consecutive failures" value={monitor.consecutiveFails} tone={monitor.consecutiveFails > 0 ? "danger" : "default"} delay={0.08} />
        <StatCard label="Security score" value={monitor.securitySnapshot ? `${monitor.securitySnapshot.score}/100` : "—"} tone={monitor.securitySnapshot ? monitor.securitySnapshot.score < 40 ? "danger" : monitor.securitySnapshot.score < 70 ? "warning" : "default" : "default"} delay={0.12} />
        <StatCard label="SSL expires in" value={monitor.sslInfo?.daysRemaining != null ? `${monitor.sslInfo.daysRemaining}d` : "—"} tone={monitor.sslInfo?.daysRemaining != null && monitor.sslInfo.daysRemaining <= 14 ? "warning" : "default"} delay={0.16} />
      </div>

      {/* Resolved DNS records — the actual values a public resolver returned
          on the most recent check, not just resolves-or-doesn't. */}
      {monitor.checkType === "DNS" && <SpotlightCard className="p-4" delay={0.08} scan tint="cyan">
          <h2 className="mb-3 text-sm font-medium text-white light:text-slate-900">Resolved Records</h2>
          <DnsRecordsPanel monitor={monitor} latestCheck={history && history.length > 0 ? history[0] : null} />
        </SpotlightCard>}

      {/* Root cause analysis — evidence-based diagnosis over real telemetry.
          Skipped on a history fetch error so a failed load never reads as
          "all checks are healthy" from an empty-by-accident history array. */}
      {!historyLoading && !historyError && <Reveal delay={0.1}>
          <RootCauseAnalysis monitor={monitor} history={history ?? []} />
        </Reveal>}

      {/* Response time chart */}
      <SpotlightCard className="p-4" delay={0.12} scan>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white light:text-slate-900">Response Time</h2>
          {history && history.length > 0 && <span className="text-xs text-white/40 light:text-slate-400">{history.length} data points</span>}
        </div>
        {historyError ? <ErrorState message="Couldn't load response-time history." onRetry={() => refetchHistory()} /> : historyLoading ? <Skeleton className="h-[220px]" /> : <ResponseTimeChart history={history ?? []} />}
      </SpotlightCard>

      {/* Recent checks table */}
      <SpotlightCard className="overflow-hidden" delay={0.14} scan>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white light:text-slate-900">Recent Checks</h2>
          {history && history.length > 0 && <span className="text-xs text-white/40 light:text-slate-400">Last {history.length} results</span>}
        </div>
        {historyError ? <ErrorState message="Couldn't load recent checks." onRetry={() => refetchHistory()} /> : <RecentChecksTable history={history} isLoading={historyLoading} />}
      </SpotlightCard>

      {/* SSL + Security headers */}
      {monitor.checkType !== "DNS" && monitor.checkType !== "TCP" && <div className="grid gap-4 lg:grid-cols-2">
          <SpotlightCard className="p-4" delay={0.16} scan tint="cyan">
            <h2 className="mb-3 text-sm font-medium text-white light:text-slate-900">SSL Certificate</h2>
            {!monitor.sslInfo ? <p className="text-sm text-white/50 light:text-slate-500">Not yet checked or not applicable (HTTP).</p> : !monitor.sslInfo.validTo && monitor.sslInfo.errorMessage ? <p className="text-sm text-white/50 light:text-slate-500">{monitor.sslInfo.errorMessage}</p> : <dl className="space-y-2 text-sm">
                <Row label="Valid" value={monitor.sslInfo.isValid ? "✓ Yes" : "✗ No"} />
                <Row label="Issuer" value={monitor.sslInfo.issuer ?? "—"} />
                <Row label="Protocol" value={monitor.sslInfo.protocol ?? "—"} />
                <Row label="Expires" value={monitor.sslInfo.validTo ? `${new Date(monitor.sslInfo.validTo).toLocaleDateString()}${monitor.sslInfo.daysRemaining != null ? ` (${monitor.sslInfo.daysRemaining}d remaining)` : ""}` : "—"} />
                {monitor.sslInfo.errorMessage && <Row label="Note" value={monitor.sslInfo.errorMessage} />}
              </dl>}
          </SpotlightCard>

          <SpotlightCard className="p-4" delay={0.18} scan tint="emerald">
            <h2 className="mb-3 text-sm font-medium text-white light:text-slate-900">Security Headers</h2>
            {!monitor.securitySnapshot ? <p className="text-sm text-white/50 light:text-slate-500">Not yet checked.</p> : <div className="space-y-3 text-sm">
                {/* Score bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-white/50 light:text-slate-500">
                    <span>Score</span>
                    <span className="font-medium text-white light:text-slate-900">{monitor.securitySnapshot.score}/100</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div className={`h-full rounded-full ${monitor.securitySnapshot.score >= 70 ? "bg-emerald-400" : monitor.securitySnapshot.score >= 40 ? "bg-amber-400" : "bg-red-400"}`} initial={{
                width: 0
              }} animate={{
                width: `${monitor.securitySnapshot.score}%`
              }} transition={{
                duration: 0.8,
                delay: 0.3,
                ease: EASE
              }} />
                  </div>
                </div>

                {monitor.securitySnapshot.missingHeaders.length > 0 && <div>
                    <p className="text-xs font-medium text-white/70 light:text-slate-600">Missing headers:</p>
                    <ul className="mt-1 space-y-0.5">
                      {monitor.securitySnapshot.missingHeaders.map(h => <li key={h} className="flex items-center gap-1.5 text-xs text-white/50 light:text-slate-500">
                          <span className="text-red-400">✗</span> {h}
                        </li>)}
                    </ul>
                  </div>}
                {monitor.securitySnapshot.cookieIssues.length > 0 && <div>
                    <p className="text-xs font-medium text-white/70 light:text-slate-600">Cookie issues:</p>
                    <ul className="mt-1 space-y-0.5">
                      {monitor.securitySnapshot.cookieIssues.map(c => <li key={c} className="flex items-center gap-1.5 text-xs text-white/50 light:text-slate-500">
                          <span className="text-amber-400">⚠</span> {c}
                        </li>)}
                    </ul>
                  </div>}
                {monitor.securitySnapshot.serverHeaderLeak && <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                    ⚠ Server header leaks version info: {monitor.securitySnapshot.serverHeaderLeak}
                  </p>}
                {monitor.securitySnapshot.missingHeaders.length === 0 && monitor.securitySnapshot.cookieIssues.length === 0 && !monitor.securitySnapshot.serverHeaderLeak && <p className="text-xs text-emerald-300">✓ No issues detected</p>}
              </div>}
          </SpotlightCard>
        </div>}

      {/* Content & SEO — parsed from the page's own markup, not a rendered
          Lighthouse pass (this runtime has no browser/layout engine), so it's
          scoped honestly to what's actually checkable: title/meta/headings/
          alt text/canonical/OG tags/robots.txt/sitemap.xml. */}
      {monitor.checkType !== "DNS" && monitor.checkType !== "TCP" && <SpotlightCard className="p-4" delay={0.19} scan tint="amber">
          <h2 className="mb-3 text-sm font-medium text-white light:text-slate-900">Content &amp; SEO</h2>
          {!monitor.contentAnalysis ? <p className="text-sm text-white/50 light:text-slate-500">Not yet checked.</p> : <div className="space-y-3 text-sm">
              <div>
                <div className="flex items-center justify-between text-xs text-white/50 light:text-slate-500">
                  <span>Title</span>
                  {monitor.contentAnalysis.titleLength != null && <span className={monitor.contentAnalysis.titleLength >= 10 && monitor.contentAnalysis.titleLength <= 60 ? "text-emerald-300" : "text-amber-300"}>
                      {monitor.contentAnalysis.titleLength} chars
                    </span>}
                </div>
                <p className="mt-0.5 truncate text-white light:text-slate-900">{monitor.contentAnalysis.title || "— missing —"}</p>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-white/50 light:text-slate-500">
                  <span>Meta description</span>
                  {monitor.contentAnalysis.metaDescriptionLength != null && <span className={monitor.contentAnalysis.metaDescriptionLength >= 50 && monitor.contentAnalysis.metaDescriptionLength <= 160 ? "text-emerald-300" : "text-amber-300"}>
                      {monitor.contentAnalysis.metaDescriptionLength} chars
                    </span>}
                </div>
                <p className="mt-0.5 truncate text-white light:text-slate-900">{monitor.contentAnalysis.metaDescription || "— missing —"}</p>
              </div>
              <Row label="H1 headings" value={monitor.contentAnalysis.h1Count === 1 ? "1 ✓" : `${monitor.contentAnalysis.h1Count} ${monitor.contentAnalysis.h1Count === 0 ? "(none found)" : "(should be exactly 1)"}`} />
              <Row label="Canonical URL" value={monitor.contentAnalysis.canonicalUrl ?? "Not set"} />
              <Row label="Images missing alt text" value={monitor.contentAnalysis.imageCount === 0 ? "No images" : `${monitor.contentAnalysis.imagesMissingAlt} of ${monitor.contentAnalysis.imageCount}`} />
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
                {[["Mobile viewport tag", monitor.contentAnalysis.hasViewportMeta], ["Open Graph title", monitor.contentAnalysis.hasOgTitle], ["Open Graph description", monitor.contentAnalysis.hasOgDescription], ["Open Graph image", monitor.contentAnalysis.hasOgImage], ["robots.txt", monitor.contentAnalysis.hasRobotsTxt], ["sitemap.xml", monitor.contentAnalysis.hasSitemapXml]].map(([label, present]) => <span key={label} className={present ? "text-emerald-300" : "text-white/30 light:text-slate-400"}>
                    {present ? "✓" : "✗"} {label}
                  </span>)}
              </div>
            </div>}
        </SpotlightCard>}

      {/* Incident history */}
      <SpotlightCard className="overflow-hidden" delay={0.2} scan>
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white light:text-slate-900">Incident History</h2>
        </div>
        {!monitor.incidents || monitor.incidents.length === 0 ? <p className="p-4 text-sm text-white/50 light:text-slate-500">No incidents recorded. ✓</p> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
            {monitor.incidents.map((incident, i) => <motion.li key={incident.id} initial={{
          opacity: 0,
          x: -8
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.3,
          delay: i * 0.04,
          ease: EASE
        }} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-white light:text-slate-900">{incident.cause ?? "Unknown cause"}</p>
                  <p className="text-white/50 light:text-slate-500">
                    {new Date(incident.startedAt).toLocaleString()}
                    {incident.resolvedAt ? ` → ${new Date(incident.resolvedAt).toLocaleString()}` : " (ongoing)"}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${incident.status === "OPEN" ? "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700" : "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700"}`}>
                  {incident.status}
                </span>
              </motion.li>)}
          </ul>}
      </SpotlightCard>
    </div>;
}
function Row({
  label,
  value
}) {
  return <div className="flex justify-between gap-4">
      <dt className="text-white/50 light:text-slate-500">{label}</dt>
      <dd className="text-right text-white light:text-slate-900">{value}</dd>
    </div>;
}