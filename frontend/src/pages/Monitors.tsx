import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createMonitor, deleteMonitor, fetchMonitors } from "../api/endpoints";
import type { CheckType, DnsRecordType, KeywordMatchMode, Monitor, MonitorInterval } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";

const INTERVAL_LABELS: Record<MonitorInterval, string> = {
  THIRTY_SECONDS: "30 seconds",
  ONE_MINUTE: "1 minute",
  FIVE_MINUTES: "5 minutes",
  FIFTEEN_MINUTES: "15 minutes",
};

const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  HTTP: "Uptime",
  KEYWORD: "Keyword",
  STATUS_CODE: "Status code",
  DNS: "DNS",
  TCP: "TCP port",
};

// The two product surfaces of the monitoring service. Websites speak HTTP;
// network devices (routers, switches, firewalls, printers, DNS servers) are
// checked at the transport layer — TCP connects and DNS resolution.
type Tab = "web" | "network";
const WEB_TYPES: CheckType[] = ["HTTP", "KEYWORD", "STATUS_CODE"];
const NETWORK_TYPES: CheckType[] = ["TCP", "DNS"];

const WEB_CHECKS: Array<{ value: CheckType; label: string; blurb: string }> = [
  { value: "HTTP", label: "Website / API uptime", blurb: "Alerts when the URL returns an error or stops responding." },
  { value: "KEYWORD", label: "Keyword on page", blurb: "Alerts when expected text is missing (or unexpected text appears)." },
  { value: "STATUS_CODE", label: "Exact status code", blurb: "Alerts unless the endpoint returns one specific HTTP code." },
];

const NETWORK_CHECKS: Array<{ value: CheckType; label: string; blurb: string }> = [
  { value: "TCP", label: "Device / TCP port", blurb: "Connects to a port on the device and alerts when it stops accepting connections — like Nagios check_tcp." },
  { value: "DNS", label: "DNS record", blurb: "Alerts when a DNS record stops resolving (or changes value)." },
];

const PORT_PRESETS: Array<{ label: string; port: number }> = [
  { label: "HTTPS · 443", port: 443 },
  { label: "HTTP · 80", port: 80 },
  { label: "SSH · 22", port: 22 },
  { label: "DNS · 53", port: 53 },
  { label: "RDP · 3389", port: 3389 },
  { label: "MySQL · 3306", port: 3306 },
];

const DNS_RECORD_TYPES: DnsRecordType[] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];

const REALTIME_TABLES = ["monitors", "incidents", "check_results"];
const REALTIME_KEYS = [["monitors"]];

const inputClass =
  "rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none";

function targetLabel(monitor: Monitor): string {
  if (monitor.checkType === "TCP") return `${monitor.url}:${monitor.tcpPort ?? "?"}`;
  return monitor.url;
}

function MonitorTable({
  monitors,
  onDelete,
}: {
  monitors: Monitor[];
  onDelete: (m: Monitor) => void;
}) {
  return (
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead className="border-b border-white/10 text-xs uppercase text-white/40">
        <tr>
          <th className="px-4 py-2">Name</th>
          <th className="px-4 py-2">Type</th>
          <th className="px-4 py-2">Target</th>
          <th className="px-4 py-2">Status</th>
          <th className="px-4 py-2">Interval</th>
          <th className="px-4 py-2">Last Checked</th>
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody className="divide-y divide-white/10">
        {monitors.map((monitor) => (
          <tr key={monitor.id} className="transition-colors hover:bg-white/[0.02]">
            <td className="px-4 py-3 font-medium text-white">
              <Link to={`/monitors/${monitor.id}`} className="hover:underline">
                {monitor.name}
              </Link>
            </td>
            <td className="px-4 py-3">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
                {CHECK_TYPE_LABELS[monitor.checkType]}
              </span>
            </td>
            <td className="px-4 py-3 text-white/50">{targetLabel(monitor)}</td>
            <td className="px-4 py-3">
              <StatusBadge status={monitor.lastStatus} />
            </td>
            <td className="px-4 py-3 text-white/50">{INTERVAL_LABELS[monitor.interval]}</td>
            <td className="px-4 py-3 text-white/50">
              {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : "Pending first check"}
            </td>
            <td className="px-4 py-3 text-right">
              <button onClick={() => onDelete(monitor)} className="text-red-300 hover:underline">
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Monitors() {
  useRealtimeInvalidate(REALTIME_TABLES, REALTIME_KEYS);
  const queryClient = useQueryClient();
  const { data: monitors, isLoading, isError, error, refetch } = useQuery({ queryKey: ["monitors"], queryFn: fetchMonitors, refetchInterval: 60_000 });

  const [tab, setTab] = useState<Tab>("web");
  const [checkType, setCheckType] = useState<CheckType>("HTTP");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState<MonitorInterval>("FIVE_MINUTES");
  const [expectedKeyword, setExpectedKeyword] = useState("");
  const [keywordMatchMode, setKeywordMatchMode] = useState<KeywordMatchMode>("CONTAINS");
  const [expectedStatusCode, setExpectedStatusCode] = useState("200");
  const [dnsRecordType, setDnsRecordType] = useState<DnsRecordType>("A");
  const [dnsExpectedValue, setDnsExpectedValue] = useState("");
  const [tcpPort, setTcpPort] = useState("443");
  const [formError, setFormError] = useState<string | null>(null);

  const isDns = checkType === "DNS";
  const isTcp = checkType === "TCP";
  const activeChecks = tab === "web" ? WEB_CHECKS : NETWORK_CHECKS;
  const activeType = activeChecks.find((t) => t.value === checkType) ?? activeChecks[0];

  const { webMonitors, networkMonitors } = useMemo(() => {
    const all = monitors ?? [];
    return {
      webMonitors: all.filter((m) => WEB_TYPES.includes(m.checkType)),
      networkMonitors: all.filter((m) => NETWORK_TYPES.includes(m.checkType)),
    };
  }, [monitors]);

  function switchTab(next: Tab) {
    setTab(next);
    setCheckType(next === "web" ? "HTTP" : "TCP");
    setFormError(null);
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createMonitor({
        name,
        url,
        interval,
        checkType,
        expectedKeyword: checkType === "KEYWORD" ? expectedKeyword : undefined,
        keywordMatchMode: checkType === "KEYWORD" ? keywordMatchMode : undefined,
        expectedStatusCode: checkType === "STATUS_CODE" ? Number(expectedStatusCode) : undefined,
        dnsRecordType: isDns ? dnsRecordType : undefined,
        dnsExpectedValue: isDns ? dnsExpectedValue : undefined,
        tcpPort: isTcp ? Number(tcpPort) : undefined,
      }),
    onSuccess: () => {
      setName("");
      setUrl("");
      setExpectedKeyword("");
      setDnsExpectedValue("");
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : "Failed to create monitor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMonitor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  function handleDelete(monitor: Monitor) {
    if (confirm(`Delete monitor "${monitor.name}"?`)) deleteMutation.mutate(monitor.id);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }

  const shownMonitors = tab === "web" ? webMonitors : networkMonitors;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight text-white">Monitors</h1>
        <div className="flex rounded-full border border-white/10 bg-black/30 p-1" role="tablist" aria-label="Monitor category">
          {(
            [
              ["web", `Websites & APIs (${webMonitors.length})`],
              ["network", `Network Devices (${networkMonitors.length})`],
            ] as Array<[Tab, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => switchTab(value)}
              className={`rounded-full px-4 py-1.5 text-sm transition-all ${
                tab === value ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "network" && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/50">
          Agentless checks for routers, switches, firewalls, printers, and DNS servers — TCP connect with latency
          (Nagios <code className="text-white/70">check_tcp</code> style) and DNS resolution. The device's port must be
          reachable from the internet; for servers behind NAT, install the{" "}
          <Link to="/hosts" className="text-cyan-300 hover:underline">
            Kada Nigrani agent
          </Link>{" "}
          instead. ICMP ping and SNMP polling are on the roadmap.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70">Check type</span>
            <select value={checkType} onChange={(e) => setCheckType(e.target.value as CheckType)} className={`w-full ${inputClass}`}>
              {activeChecks.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tab === "web" ? "Marketing site" : "Office router"}
              className={`w-full ${inputClass}`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70">{isDns || isTcp ? "Hostname / IP" : "URL"}</span>
            <input
              required
              type={isDns || isTcp ? "text" : "url"}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={isDns || isTcp ? "gateway.example.com or 203.0.113.1" : "https://example.com"}
              className={`w-full ${inputClass}`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70">Check every</span>
            <select value={interval} onChange={(e) => setInterval(e.target.value as MonitorInterval)} className={`w-full ${inputClass}`}>
              {Object.entries(INTERVAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs text-white/45">{activeType.blurb}</p>

        {isTcp && (
          <div className="space-y-2.5">
            <span className="block text-sm text-white/70">Port</span>
            <div className="flex flex-wrap items-center gap-2">
              {PORT_PRESETS.map((p) => (
                <button
                  key={p.port}
                  type="button"
                  onClick={() => setTcpPort(String(p.port))}
                  className={`rounded-full px-3 py-1.5 text-xs transition-all ${
                    Number(tcpPort) === p.port
                      ? "bg-white text-black"
                      : "border border-white/15 text-white/60 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <input
                required
                type="number"
                min={1}
                max={65535}
                value={tcpPort}
                onChange={(e) => setTcpPort(e.target.value)}
                aria-label="Custom port"
                className={`w-28 ${inputClass}`}
              />
            </div>
          </div>
        )}

        {checkType === "KEYWORD" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70">Page must…</span>
              <select
                value={keywordMatchMode}
                onChange={(e) => setKeywordMatchMode(e.target.value as KeywordMatchMode)}
                className={`w-full ${inputClass}`}
              >
                <option value="CONTAINS">Contain this text</option>
                <option value="NOT_CONTAINS">Not contain this text</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70">Text to look for</span>
              <input required value={expectedKeyword} onChange={(e) => setExpectedKeyword(e.target.value)} placeholder="Sign in" className={`w-full ${inputClass}`} />
            </label>
          </div>
        )}

        {checkType === "STATUS_CODE" && (
          <label className="block max-w-xs text-sm">
            <span className="mb-1.5 block text-white/70">Expected HTTP status code</span>
            <input
              required
              type="number"
              min={100}
              max={599}
              value={expectedStatusCode}
              onChange={(e) => setExpectedStatusCode(e.target.value)}
              placeholder="200"
              className={`w-full ${inputClass}`}
            />
          </label>
        )}

        {isDns && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70">Record type</span>
              <select value={dnsRecordType} onChange={(e) => setDnsRecordType(e.target.value as DnsRecordType)} className={`w-full ${inputClass}`}>
                {DNS_RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70">Expected value (optional)</span>
              <input
                value={dnsExpectedValue}
                onChange={(e) => setDnsExpectedValue(e.target.value)}
                placeholder="Leave blank to just check it resolves"
                className={`w-full ${inputClass}`}
              />
            </label>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
          >
            {createMutation.isPending ? "Adding…" : tab === "web" ? "Add Monitor" : "Add Device"}
          </button>
          {formError && <p className="text-sm text-red-300">{formError}</p>}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center">
            <p className="text-sm text-red-300">Couldn't load monitors: {error instanceof Error ? error.message : "unknown error"}</p>
            <button onClick={() => refetch()} className="mt-3 rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/80 hover:bg-white/5">
              Retry
            </button>
          </div>
        ) : shownMonitors.length === 0 ? (
          <p className="p-4 text-sm text-white/50">
            {tab === "web"
              ? "No website monitors yet. Add a check above to start monitoring."
              : "No network devices yet. Add a router, switch, or any device with a reachable port above."}
          </p>
        ) : (
          <MonitorTable monitors={shownMonitors} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
