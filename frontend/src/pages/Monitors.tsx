import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createMonitor, deleteMonitor, fetchMonitors } from "../api/endpoints";
import type { CheckType, DnsRecordType, KeywordMatchMode, MonitorInterval } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";

const INTERVAL_LABELS: Record<MonitorInterval, string> = {
  THIRTY_SECONDS: "30 seconds",
  ONE_MINUTE: "1 minute",
  FIVE_MINUTES: "5 minutes",
  FIFTEEN_MINUTES: "15 minutes",
};

const CHECK_TYPES: Array<{ value: CheckType; label: string; blurb: string }> = [
  { value: "HTTP", label: "Website / API uptime", blurb: "Alerts when the URL returns an error or stops responding." },
  { value: "KEYWORD", label: "Keyword on page", blurb: "Alerts when expected text is missing (or unexpected text appears)." },
  { value: "STATUS_CODE", label: "Exact status code", blurb: "Alerts unless the endpoint returns one specific HTTP code." },
  { value: "DNS", label: "DNS record", blurb: "Alerts when a DNS record stops resolving (or changes value)." },
];

const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  HTTP: "Uptime",
  KEYWORD: "Keyword",
  STATUS_CODE: "Status code",
  DNS: "DNS",
};

const DNS_RECORD_TYPES: DnsRecordType[] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];

const REALTIME_TABLES = ["monitors", "incidents"];
const REALTIME_KEYS = [["monitors"]];

const inputClass =
  "rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none";

export default function Monitors() {
  useRealtimeInvalidate(REALTIME_TABLES, REALTIME_KEYS);
  const queryClient = useQueryClient();
  const { data: monitors, isLoading } = useQuery({ queryKey: ["monitors"], queryFn: fetchMonitors, refetchInterval: 60_000 });

  const [checkType, setCheckType] = useState<CheckType>("HTTP");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState<MonitorInterval>("FIVE_MINUTES");
  const [expectedKeyword, setExpectedKeyword] = useState("");
  const [keywordMatchMode, setKeywordMatchMode] = useState<KeywordMatchMode>("CONTAINS");
  const [expectedStatusCode, setExpectedStatusCode] = useState("200");
  const [dnsRecordType, setDnsRecordType] = useState<DnsRecordType>("A");
  const [dnsExpectedValue, setDnsExpectedValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isDns = checkType === "DNS";

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }

  const activeType = CHECK_TYPES.find((t) => t.value === checkType)!;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium tracking-tight text-white">Monitors</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70">Check type</span>
            <select value={checkType} onChange={(e) => setCheckType(e.target.value as CheckType)} className={`w-full ${inputClass}`}>
              {CHECK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70">Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing site" className={`w-full ${inputClass}`} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70">{isDns ? "Hostname" : "URL"}</span>
            <input
              required
              type={isDns ? "text" : "url"}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={isDns ? "example.com" : "https://example.com"}
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

        {/* Per-type assertion fields */}
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
              <input
                required
                value={expectedKeyword}
                onChange={(e) => setExpectedKeyword(e.target.value)}
                placeholder="Sign in"
                className={`w-full ${inputClass}`}
              />
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
            {createMutation.isPending ? "Adding…" : "Add Monitor"}
          </button>
          {formError && <p className="text-sm text-red-300">{formError}</p>}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : !monitors || monitors.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No monitors yet. Add a check above to start monitoring.</p>
        ) : (
          <table className="w-full text-left text-sm">
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
                <tr key={monitor.id}>
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
                  <td className="px-4 py-3 text-white/50">{monitor.url}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={monitor.lastStatus} />
                  </td>
                  <td className="px-4 py-3 text-white/50">{INTERVAL_LABELS[monitor.interval]}</td>
                  <td className="px-4 py-3 text-white/50">
                    {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : "Pending first check"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Delete monitor "${monitor.name}"?`)) deleteMutation.mutate(monitor.id);
                      }}
                      className="text-red-300 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
