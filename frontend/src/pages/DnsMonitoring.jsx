import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { createMonitor, deleteMonitor, fetchDnsMonitors, fetchMyPermissions } from "../api/endpoints";
import { Reveal, SpotlightCard } from "../components/Animated";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { DnsRecordsPanel } from "../components/DnsRecordsPanel";
import { DomainLookup } from "../components/DomainLookup";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";
import { useAuth } from "../context/AuthContext";

// A bare hostname/domain: labels of letters/digits/hyphens separated by dots,
// no protocol or path — rejects obvious garbage before it ever reaches a
// resolver that will just fail silently later.
const HOSTNAME_RE = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$|^(\d{1,3}\.){3}\d{1,3}$/;

const EASE = [0.16, 1, 0.3, 1];
const INTERVAL_LABELS = {
  THIRTY_SECONDS: "30 seconds",
  ONE_MINUTE: "1 minute",
  FIVE_MINUTES: "5 minutes",
  FIFTEEN_MINUTES: "15 minutes"
};
const DNS_RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];
const REALTIME_TABLES = ["monitors", "incidents", "check_results"];
const REALTIME_KEYS = [["dns-monitors"]];
const inputClass = "rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none";

export default function DnsMonitoring() {
  useRealtimeInvalidate(REALTIME_TABLES, REALTIME_KEYS);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const { organization } = useAuth();
  const { data: can } = useQuery({
    queryKey: ["my-permissions", organization?.id],
    queryFn: () => fetchMyPermissions(organization?.id),
    enabled: !!organization?.id,
    retry: false
  });
  const canCreate = !!can && can("organization", "monitors", "create");
  const canDelete = !!can && can("organization", "monitors", "delete");
  const { data: monitors, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dns-monitors"],
    queryFn: fetchDnsMonitors,
    refetchInterval: 60_000
  });

  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [dnsRecordType, setDnsRecordType] = useState("A");
  const [dnsExpectedValue, setDnsExpectedValue] = useState("");
  const [interval, setInterval] = useState("FIVE_MINUTES");
  const [formError, setFormError] = useState(null);
  const formRef = useRef(null);

  function handleMonitorFromLookup(domain, recordType) {
    setName(`${domain} ${recordType}`);
    setHostname(domain);
    setDnsRecordType(recordType);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const createMutation = useMutation({
    mutationFn: () => createMonitor({
      name,
      url: hostname,
      interval,
      checkType: "DNS",
      dnsRecordType,
      dnsExpectedValue: dnsExpectedValue || undefined
    }),
    onSuccess: () => {
      setName("");
      setHostname("");
      setDnsExpectedValue("");
      queryClient.invalidateQueries({ queryKey: ["dns-monitors"] });
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    },
    onError: err => setFormError(err instanceof Error ? err.message : "Failed to create DNS monitor")
  });

  const deleteMutation = useMutation({
    mutationFn: id => deleteMonitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns-monitors"] });
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    }
  });

  async function handleDelete(monitor) {
    const ok = await confirm({
      title: `Delete DNS monitor "${monitor.name}"?`,
      description: "This stops all lookups and removes its history. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    deleteMutation.mutate(monitor.id, {
      onSuccess: () => toast.success(`Deleted "${monitor.name}".`),
      onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete DNS monitor.")
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const cleanHostname = hostname.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    if (!HOSTNAME_RE.test(cleanHostname)) {
      setFormError("Enter a real hostname or IP (e.g. example.com or 203.0.113.1) — not a URL or free text.");
      return;
    }
    createMutation.mutate();
  }

  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">DNS Monitoring</h1>
        <p className="mt-1 text-sm text-white/45 light:text-slate-400">
          Real DNS-over-HTTPS lookups against a public resolver — A, AAAA, CNAME, MX, TXT, and NS records, with the
          actual resolved values and TTLs on every check, not just resolves-or-doesn't. For port-reachability checks
          on network hardware, see{" "}
          <Link to="/network" className="text-cyan-300 light:text-cyan-600 hover:underline">Network Devices</Link>.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <DomainLookup onMonitor={handleMonitorFromLookup} />
      </Reveal>

      {!canCreate && <Reveal delay={0.08}>
          <p className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] px-4 py-3 text-sm text-white/50 light:text-slate-500">
            Your role can view DNS monitors but not add new ones — ask an organization admin if you need one added.
          </p>
        </Reveal>}

      {canCreate && <Reveal delay={0.08}>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-cyan-400/15 light:border-cyan-900/10 bg-neutral-900/60 light:bg-white p-5">
          <div>
            <h2 className="text-sm font-medium text-white light:text-slate-900">Add a Scheduled Monitor</h2>
            <p className="mt-1 text-xs text-white/45 light:text-slate-400">Checks one record type on a repeating schedule and alerts if it stops resolving or changes.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70 light:text-slate-600">Name</span>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Primary domain MX" className={`w-full ${inputClass}`} />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70 light:text-slate-600">Hostname</span>
              <input required value={hostname} onChange={e => setHostname(e.target.value)} placeholder="example.com" className={`w-full ${inputClass}`} />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70 light:text-slate-600">Record type</span>
              <select value={dnsRecordType} onChange={e => setDnsRecordType(e.target.value)} className={`w-full ${inputClass}`}>
                {DNS_RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70 light:text-slate-600">Expected value (optional)</span>
              <input value={dnsExpectedValue} onChange={e => setDnsExpectedValue(e.target.value)} placeholder="Leave blank to just check it resolves" className={`w-full ${inputClass}`} />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70 light:text-slate-600">Check every</span>
              <select value={interval} onChange={e => setInterval(e.target.value)} className={`w-full ${inputClass}`}>
                {Object.entries(INTERVAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={createMutation.isPending} className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60">
              {createMutation.isPending ? "Adding…" : "Add DNS Monitor"}
            </button>
            {formError && <p className="text-sm text-red-300">{formError}</p>}
          </div>
        </form>
      </Reveal>}

      <Reveal delay={0.1}>
        <h2 className="text-sm font-medium text-white light:text-slate-900">Scheduled Monitors</h2>
      </Reveal>
      {isLoading ? <SpotlightCard className="p-4" scan><SkeletonRows count={3} /></SpotlightCard> : isError ? <SpotlightCard className="p-4" scan><ErrorState message={`Couldn't load DNS monitors: ${error instanceof Error ? error.message : "unknown error"}`} onRetry={() => refetch()} /></SpotlightCard> : (monitors ?? []).length === 0 ? <SpotlightCard className="p-4" scan><EmptyState title="No DNS monitors yet." description="Add a hostname and record type above to start watching what it resolves to." /></SpotlightCard> : <div className="space-y-4">
          {monitors.map((monitor, i) => <motion.div key={monitor.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }}>
              <SpotlightCard className="p-4" scan tint="cyan">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/monitors/${monitor.id}`} className="font-medium text-white light:text-slate-900 hover:underline">
                      {monitor.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">
                      Every {INTERVAL_LABELS[monitor.interval]} · {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : "Pending first check"}
                    </p>
                  </div>
                  {canDelete && <button onClick={() => handleDelete(monitor)} className="text-xs text-red-300 light:text-red-600 hover:underline">
                    Delete
                  </button>}
                </div>
                <DnsRecordsPanel monitor={monitor} latestCheck={monitor.latestCheck} />
              </SpotlightCard>
            </motion.div>)}
        </div>}
    </div>;
}
