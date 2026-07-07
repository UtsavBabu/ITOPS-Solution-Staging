import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchMonitor, fetchMonitorHistory } from "../api/endpoints";
import type { Monitor } from "../api/types";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { ResponseTimeChart } from "../components/ResponseTimeChart";

const CHECK_TYPE_LABELS: Record<Monitor["checkType"], string> = {
  HTTP: "Uptime",
  KEYWORD: "Keyword",
  STATUS_CODE: "Status code",
  DNS: "DNS",
};

function describeCheck(monitor: Monitor): string {
  switch (monitor.checkType) {
    case "KEYWORD":
      return `Page must ${monitor.keywordMatchMode === "NOT_CONTAINS" ? "not contain" : "contain"} “${monitor.expectedKeyword ?? ""}”`;
    case "STATUS_CODE":
      return `Endpoint must return HTTP ${monitor.expectedStatusCode ?? "—"}`;
    case "DNS":
      return `${monitor.dnsRecordType} record must resolve${
        monitor.dnsExpectedValue ? ` and match “${monitor.dnsExpectedValue}”` : ""
      }`;
    case "HTTP":
    default:
      return "Endpoint must respond without an HTTP error";
  }
}

export default function MonitorDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: monitor } = useQuery({
    queryKey: ["monitor", id],
    queryFn: () => fetchMonitor(id!),
    enabled: !!id,
    refetchInterval: 15_000,
  });
  const { data: history } = useQuery({
    queryKey: ["monitor-history", id],
    queryFn: () => fetchMonitorHistory(id!, 100),
    enabled: !!id,
    refetchInterval: 15_000,
  });

  if (!monitor) return <p className="text-sm text-white/50">Loading…</p>;

  const upCount = history?.filter((h) => h.status === "UP").length ?? 0;
  const uptimePct = history && history.length > 0 ? ((upCount / history.length) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-6">
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
        </div>
        {monitor.checkType === "DNS" ? (
          <p className="text-sm text-white/50">{monitor.url}</p>
        ) : (
          <a href={monitor.url} target="_blank" rel="noreferrer" className="text-sm text-white/50 hover:underline">
            {monitor.url}
          </a>
        )}
        <p className="mt-1 text-sm text-white/40">{describeCheck(monitor)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Uptime (recent checks)" value={`${uptimePct}%`} />
        <StatCard label="Consecutive failures" value={monitor.consecutiveFails} tone={monitor.consecutiveFails > 0 ? "danger" : "default"} />
        <StatCard label="Security score" value={monitor.securitySnapshot ? `${monitor.securitySnapshot.score}/100` : "—"} />
        <StatCard
          label="SSL expires in"
          value={monitor.sslInfo?.daysRemaining != null ? `${monitor.sslInfo.daysRemaining}d` : "—"}
          tone={monitor.sslInfo?.daysRemaining != null && monitor.sslInfo.daysRemaining <= 14 ? "warning" : "default"}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
        <h2 className="mb-3 text-sm font-medium text-white">Response Time</h2>
        <ResponseTimeChart history={history ?? []} />
      </div>

      {monitor.checkType !== "DNS" && (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
          <h2 className="mb-3 text-sm font-medium text-white">SSL Certificate</h2>
          {!monitor.sslInfo ? (
            <p className="text-sm text-white/50">Not applicable (HTTP site) or not yet checked.</p>
          ) : !monitor.sslInfo.validTo && monitor.sslInfo.errorMessage ? (
            // No certificate data was ever retrieved (e.g. the check is unavailable/unconfigured) —
            // showing "Valid: No" here would read as a real failure rather than "no data yet".
            <p className="text-sm text-white/50">{monitor.sslInfo.errorMessage}</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <Row label="Valid" value={monitor.sslInfo.isValid ? "Yes" : "No"} />
              <Row label="Issuer" value={monitor.sslInfo.issuer ?? "—"} />
              <Row label="Protocol" value={monitor.sslInfo.protocol ?? "—"} />
              <Row label="Expires" value={monitor.sslInfo.validTo ? new Date(monitor.sslInfo.validTo).toLocaleDateString() : "—"} />
              {monitor.sslInfo.errorMessage && <Row label="Error" value={monitor.sslInfo.errorMessage} />}
            </dl>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
          <h2 className="mb-3 text-sm font-medium text-white">Security Headers</h2>
          {!monitor.securitySnapshot ? (
            <p className="text-sm text-white/50">Not yet checked.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-white">Score: {monitor.securitySnapshot.score}/100</p>
              {monitor.securitySnapshot.missingHeaders.length > 0 && (
                <div>
                  <p className="text-white/70">Missing headers:</p>
                  <ul className="list-inside list-disc text-white/50">
                    {monitor.securitySnapshot.missingHeaders.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {monitor.securitySnapshot.cookieIssues.length > 0 && (
                <div>
                  <p className="text-white/70">Cookie issues:</p>
                  <ul className="list-inside list-disc text-white/50">
                    {monitor.securitySnapshot.cookieIssues.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {monitor.securitySnapshot.serverHeaderLeak && (
                <p className="text-amber-300">Server header leaks version info: {monitor.securitySnapshot.serverHeaderLeak}</p>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">Incident History</h2>
        </div>
        {!monitor.incidents || monitor.incidents.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No incidents recorded.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {monitor.incidents.map((incident) => (
              <li key={incident.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-white">{incident.cause ?? "Unknown cause"}</p>
                  <p className="text-white/50">
                    {new Date(incident.startedAt).toLocaleString()}
                    {incident.resolvedAt ? ` → ${new Date(incident.resolvedAt).toLocaleString()}` : " (ongoing)"}
                  </p>
                </div>
                <span className={incident.status === "OPEN" ? "text-red-300" : "text-emerald-300"}>{incident.status}</span>
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
