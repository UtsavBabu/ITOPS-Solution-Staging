import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchMonitor, fetchMonitorHistory } from "../api/endpoints";
import type { CheckResult, Monitor } from "../api/types";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { ResponseTimeChart } from "../components/ResponseTimeChart";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";

const CHECK_TYPE_LABELS: Record<Monitor["checkType"], string> = {
  HTTP: "Uptime",
  KEYWORD: "Keyword",
  STATUS_CODE: "Status code",
  DNS: "DNS",
  TCP: "TCP port",
};

const REALTIME_TABLES = ["monitors", "check_results", "incidents"];

function describeCheck(monitor: Monitor): string {
  switch (monitor.checkType) {
    case "KEYWORD":
      return `Page must ${monitor.keywordMatchMode === "NOT_CONTAINS" ? "not contain" : "contain"} "${monitor.expectedKeyword ?? ""}"`;
    case "STATUS_CODE":
      return `Endpoint must return HTTP ${monitor.expectedStatusCode ?? "—"}`;
    case "DNS":
      return `${monitor.dnsRecordType} record must resolve${
        monitor.dnsExpectedValue ? ` and match "${monitor.dnsExpectedValue}"` : ""
      }`;
    case "TCP":
      return `Port ${monitor.tcpPort ?? "?"} must accept TCP connections`;
    case "HTTP":
    default:
      return "Endpoint must respond without an HTTP error";
  }
}

function RecentChecksTable({ history, isLoading }: { history: CheckResult[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-white/50">No checks recorded yet.</p>
        <p className="mt-1 text-xs text-white/30">Results appear here once the scheduler runs.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase text-white/40">
          <tr>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Time</th>
            <th className="px-4 py-2.5">Response</th>
            <th className="px-4 py-2.5">HTTP Code</th>
            <th className="px-4 py-2.5">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {history.map((check) => (
            <tr key={check.id} className="transition-colors hover:bg-white/[0.02]">
              <td className="px-4 py-2.5">
                <StatusBadge status={check.status} />
              </td>
              <td className="px-4 py-2.5 text-white/60">
                {new Date(check.checkedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </td>
              <td className="px-4 py-2.5">
                {check.responseTimeMs != null ? (
                  <span className={check.responseTimeMs > 2000 ? "text-amber-300" : "text-white/80"}>
                    {check.responseTimeMs.toLocaleString()} ms
                  </span>
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-white/60">
                {check.statusCode ?? <span className="text-white/30">—</span>}
              </td>
              <td className="px-4 py-2.5 max-w-xs truncate text-white/40 text-xs">
                {check.errorMessage ?? (check.redirectChain.length > 0 ? `${check.redirectChain.length} redirect(s)` : "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MonitorDetail() {
  const { id } = useParams<{ id: string }>();

  const realtimeKeys = [["monitor", id!], ["monitor-history", id!], ["monitors"]];
  useRealtimeInvalidate(REALTIME_TABLES, realtimeKeys);

  const { data: monitor, isLoading: monitorLoading } = useQuery({
    queryKey: ["monitor", id],
    queryFn: () => fetchMonitor(id!),
    enabled: !!id,
    refetchInterval: 15_000,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["monitor-history", id],
    queryFn: () => fetchMonitorHistory(id!, 100),
    enabled: !!id,
    refetchInterval: 15_000,
  });

  if (monitorLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-8 text-center">
        <p className="text-sm text-white/50">Monitor not found.</p>
        <Link to="/monitors" className="mt-3 inline-block text-sm text-white hover:underline">
          ← Back to Monitors
        </Link>
      </div>
    );
  }

  const upCount = history?.filter((h) => h.status === "UP").length ?? 0;
  const totalCount = history?.length ?? 0;
  const uptimePct = totalCount > 0 ? ((upCount / totalCount) * 100).toFixed(1) : "—";
  const avgResponseMs =
    history && history.length > 0
      ? Math.round(
          history.filter((h) => h.responseTimeMs != null).reduce((sum, h) => sum + (h.responseTimeMs ?? 0), 0) /
            Math.max(1, history.filter((h) => h.responseTimeMs != null).length),
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/monitors" className="text-sm text-white/50 hover:text-white">
          ← Back to Monitors
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-white">{monitor.name}</h1>
          <StatusBadge status={monitor.lastStatus} />
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/70">
            {CHECK_TYPE_LABELS[monitor.checkType]} check
          </span>
          {!monitor.isActive && (
            <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
              Paused
            </span>
          )}
        </div>
        {monitor.checkType === "DNS" || monitor.checkType === "TCP" ? (
          <p className="text-sm text-white/50">{monitor.url}</p>
        ) : (
          <a href={monitor.url} target="_blank" rel="noreferrer" className="text-sm text-white/50 hover:underline">
            {monitor.url}
          </a>
        )}
        <p className="mt-1 text-sm text-white/40">{describeCheck(monitor)}</p>
        <p className="mt-0.5 text-xs text-white/30">
          Last checked:{" "}
          {monitor.lastCheckedAt
            ? new Date(monitor.lastCheckedAt).toLocaleString()
            : "Pending first check"}
          {" · "}
          Next check:{" "}
          {monitor.nextCheckAt ? new Date(monitor.nextCheckAt).toLocaleString() : "—"}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard label={`Uptime (${totalCount} checks)`} value={`${uptimePct}%`} />
        <StatCard
          label="Avg response time"
          value={avgResponseMs != null ? `${avgResponseMs.toLocaleString()} ms` : "—"}
          tone={avgResponseMs != null && avgResponseMs > 2000 ? "warning" : "default"}
        />
        <StatCard
          label="Consecutive failures"
          value={monitor.consecutiveFails}
          tone={monitor.consecutiveFails > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Security score"
          value={monitor.securitySnapshot ? `${monitor.securitySnapshot.score}/100` : "—"}
          tone={
            monitor.securitySnapshot
              ? monitor.securitySnapshot.score < 40
                ? "danger"
                : monitor.securitySnapshot.score < 70
                ? "warning"
                : "default"
              : "default"
          }
        />
        <StatCard
          label="SSL expires in"
          value={monitor.sslInfo?.daysRemaining != null ? `${monitor.sslInfo.daysRemaining}d` : "—"}
          tone={
            monitor.sslInfo?.daysRemaining != null && monitor.sslInfo.daysRemaining <= 14
              ? "warning"
              : "default"
          }
        />
      </div>

      {/* Response time chart */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Response Time</h2>
          {history && history.length > 0 && (
            <span className="text-xs text-white/40">{history.length} data points</span>
          )}
        </div>
        {historyLoading ? (
          <div className="h-[220px] animate-pulse rounded-lg bg-white/5" />
        ) : (
          <ResponseTimeChart history={history ?? []} />
        )}
      </div>

      {/* Recent checks table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">Recent Checks</h2>
          {history && history.length > 0 && (
            <span className="text-xs text-white/40">Last {history.length} results</span>
          )}
        </div>
        <RecentChecksTable history={history} isLoading={historyLoading} />
      </div>

      {/* SSL + Security headers */}
      {monitor.checkType !== "DNS" && monitor.checkType !== "TCP" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
            <h2 className="mb-3 text-sm font-medium text-white">SSL Certificate</h2>
            {!monitor.sslInfo ? (
              <p className="text-sm text-white/50">Not yet checked or not applicable (HTTP).</p>
            ) : !monitor.sslInfo.validTo && monitor.sslInfo.errorMessage ? (
              <p className="text-sm text-white/50">{monitor.sslInfo.errorMessage}</p>
            ) : (
              <dl className="space-y-2 text-sm">
                <Row label="Valid" value={monitor.sslInfo.isValid ? "✓ Yes" : "✗ No"} />
                <Row label="Issuer" value={monitor.sslInfo.issuer ?? "—"} />
                <Row label="Protocol" value={monitor.sslInfo.protocol ?? "—"} />
                <Row
                  label="Expires"
                  value={
                    monitor.sslInfo.validTo
                      ? `${new Date(monitor.sslInfo.validTo).toLocaleDateString()}${
                          monitor.sslInfo.daysRemaining != null
                            ? ` (${monitor.sslInfo.daysRemaining}d remaining)`
                            : ""
                        }`
                      : "—"
                  }
                />
                {monitor.sslInfo.errorMessage && (
                  <Row label="Note" value={monitor.sslInfo.errorMessage} />
                )}
              </dl>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
            <h2 className="mb-3 text-sm font-medium text-white">Security Headers</h2>
            {!monitor.securitySnapshot ? (
              <p className="text-sm text-white/50">Not yet checked.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {/* Score bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>Score</span>
                    <span className="font-medium text-white">{monitor.securitySnapshot.score}/100</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all ${
                        monitor.securitySnapshot.score >= 70
                          ? "bg-emerald-400"
                          : monitor.securitySnapshot.score >= 40
                          ? "bg-amber-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${monitor.securitySnapshot.score}%` }}
                    />
                  </div>
                </div>

                {monitor.securitySnapshot.missingHeaders.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-white/70">Missing headers:</p>
                    <ul className="mt-1 space-y-0.5">
                      {monitor.securitySnapshot.missingHeaders.map((h) => (
                        <li key={h} className="flex items-center gap-1.5 text-xs text-white/50">
                          <span className="text-red-400">✗</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {monitor.securitySnapshot.cookieIssues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-white/70">Cookie issues:</p>
                    <ul className="mt-1 space-y-0.5">
                      {monitor.securitySnapshot.cookieIssues.map((c) => (
                        <li key={c} className="flex items-center gap-1.5 text-xs text-white/50">
                          <span className="text-amber-400">⚠</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {monitor.securitySnapshot.serverHeaderLeak && (
                  <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                    ⚠ Server header leaks version info: {monitor.securitySnapshot.serverHeaderLeak}
                  </p>
                )}
                {monitor.securitySnapshot.missingHeaders.length === 0 &&
                  monitor.securitySnapshot.cookieIssues.length === 0 &&
                  !monitor.securitySnapshot.serverHeaderLeak && (
                    <p className="text-xs text-emerald-300">✓ No issues detected</p>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incident history */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">Incident History</h2>
        </div>
        {!monitor.incidents || monitor.incidents.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No incidents recorded. ✓</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {monitor.incidents.map((incident) => (
              <li key={incident.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-white">{incident.cause ?? "Unknown cause"}</p>
                  <p className="text-white/50">
                    {new Date(incident.startedAt).toLocaleString()}
                    {incident.resolvedAt
                      ? ` → ${new Date(incident.resolvedAt).toLocaleString()}`
                      : " (ongoing)"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    incident.status === "OPEN"
                      ? "bg-red-400/10 text-red-300"
                      : "bg-emerald-400/10 text-emerald-300"
                  }`}
                >
                  {incident.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-white/50">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}
