import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { createHostAgent, deleteHostAgent, fetchMyPermissions, listHostAgents, regenerateHostAgentKey } from "../api/endpoints";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";
import { HostRunbooks } from "../components/HostRunbooks";
import { HostDiagnosisPanel } from "../components/RootCauseAnalysis";
import { Reveal, SpotlightCard } from "../components/Animated";
import { Skeleton } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { useSound } from "../context/SoundContext";
const EASE = [0.16, 1, 0.3, 1];
const INGEST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-metrics`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REALTIME_TABLES = ["host_agents", "host_metrics"];
const REALTIME_KEYS = [["host-agents"]];
const PROVIDERS = [{
  value: "aws",
  label: "AWS",
  icon: "🟧"
}, {
  value: "azure",
  label: "Azure",
  icon: "🔷"
}, {
  value: "gcp",
  label: "GCP",
  icon: "🟢"
}, {
  value: "on_prem",
  label: "On-Prem",
  icon: "🏠"
}, {
  value: "other",
  label: "Other",
  icon: "☁️"
}];
const PROVIDER_LABEL = Object.fromEntries(PROVIDERS.map(p => [p.value, p.label]));
const PROVIDER_STYLE = {
  aws: "bg-orange-400/10 text-orange-300",
  azure: "bg-blue-400/10 light:bg-blue-100 text-blue-300 light:text-blue-700",
  gcp: "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700",
  on_prem: "bg-white/10 text-white/60 light:text-slate-500",
  other: "bg-violet-400/10 light:bg-violet-100 text-violet-300 light:text-violet-700"
};
function formatUptime(seconds) {
  if (seconds == null) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor(seconds % 86400 / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function UsageBar({
  label,
  value
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const tone = pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";
  return <div>
      <div className="flex justify-between text-[11px] text-white/50 light:text-slate-500">
        <span>{label}</span>
        <span>{value == null ? "—" : `${value.toFixed(0)}%`}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div className={`h-full rounded-full ${tone}`} initial={{
        width: 0
      }} animate={{
        width: `${pct}%`
      }} transition={{
        duration: 0.6,
        ease: EASE
      }} />
      </div>
    </div>;
}
function InstallSnippet({
  host
}) {
  const [copied, setCopied] = useState(false);
  const { play } = useSound();
  const snippet = `curl -fsSL "${window.location.origin}/kada-nigrani-agent.sh" -o /opt/kada-nigrani-agent.sh && chmod +x /opt/kada-nigrani-agent.sh
# Run every minute via cron:
( crontab -l 2>/dev/null; echo '* * * * * INGEST_URL="${INGEST_URL}" ANON_KEY="${ANON_KEY}" AGENT_KEY="${host.ingestKey}" /opt/kada-nigrani-agent.sh >/dev/null 2>&1' ) | crontab -`;
  return <div className="glass mt-3 overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-white/10 light:border-slate-900/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-red-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          </span>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Install on this host</p>
        </div>
        <button onClick={() => {
        navigator.clipboard.writeText(snippet);
        play("success");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }} className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${copied ? "bg-emerald-400/15 text-emerald-300" : "text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900 hover:bg-white/5"}`}>
          <AnimatePresence mode="wait" initial={false}>
            {copied ? <motion.span key="copied" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.2 }} className="flex items-center gap-1">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Copied!
              </motion.span> : <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>Copy</motion.span>}
          </AnimatePresence>
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-3 font-mono text-[11px] leading-relaxed text-cyan-100/80 light:text-slate-600">{snippet}</pre>
    </div>;
}
function HostCard({
  host,
  index,
  canDelete
}) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const [showInstall, setShowInstall] = useState(!host.lastSeenAt);
  const [showRunbooks, setShowRunbooks] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => deleteHostAgent(host.id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["host-agents"]
    })
  });
  const regenMutation = useMutation({
    mutationFn: () => regenerateHostAgentKey(host.id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["host-agents"]
    })
  });
  async function handleDelete() {
    const ok = await confirm({
      title: `Delete host "${host.name}"?`,
      description: "Its metrics history will be removed. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    deleteMutation.mutate(undefined, {
      onSuccess: () => toast.success(`Deleted "${host.name}".`),
      onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete host.")
    });
  }
  async function handleRegen() {
    const ok = await confirm({
      title: "Regenerate ingest key?",
      description: "The old key stops working immediately — update the install command on this host afterward.",
      confirmLabel: "Regenerate",
      danger: true
    });
    if (!ok) return;
    regenMutation.mutate(undefined, {
      onSuccess: () => toast.success("Ingest key regenerated."),
      onError: err => toast.error(err instanceof Error ? err.message : "Failed to regenerate key.")
    });
  }
  return <SpotlightCard className="p-5" delay={Math.min(index, 8) * 0.05} tint={host.isOnline ? "emerald" : "white"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative grid h-2.5 w-2.5 shrink-0 place-items-center">
              {host.isOnline && <span className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400/70 animate-sonar" />}
              <span className={`relative h-2.5 w-2.5 rounded-full ${host.isOnline ? "bg-emerald-400" : "bg-white/30"}`} />
            </span>
            <h3 className="truncate text-sm font-medium text-white light:text-slate-900">{host.name}</h3>
            {host.provider && <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PROVIDER_STYLE[host.provider]}`}>{PROVIDER_LABEL[host.provider]}</span>}
          </div>
          <p className="mt-0.5 truncate text-xs text-white/45 light:text-slate-400">
            {host.hostname ?? "awaiting first report"}
            {host.os ? ` · ${host.os}` : ""}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${host.isOnline ? "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700" : host.lastSeenAt ? "bg-white/10 text-white/50 light:text-slate-500" : "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700"}`}>
          {!host.lastSeenAt && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />}
          {host.isOnline ? "Online" : host.lastSeenAt ? "Offline" : "Awaiting first report"}
        </span>
      </div>

      {host.lastSeenAt ? <div className="mt-4 space-y-2.5">
          <UsageBar label="CPU" value={host.cpuPercent} />
          <UsageBar label="Memory" value={host.memPercent} />
          <UsageBar label="Disk" value={host.diskPercent} />
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div>
              <p className="text-white light:text-slate-900">{formatUptime(host.uptimeSeconds)}</p>
              <p className="text-[10px] text-white/40 light:text-slate-400">Uptime</p>
            </div>
            <div>
              <p className="text-white light:text-slate-900">{host.load1?.toFixed(2) ?? "—"}</p>
              <p className="text-[10px] text-white/40 light:text-slate-400">Load</p>
            </div>
            <div>
              <p className="text-white light:text-slate-900">{host.processCount ?? "—"}</p>
              <p className="text-[10px] text-white/40 light:text-slate-400">Procs</p>
            </div>
          </div>
          <p className="pt-1 text-[11px] text-white/35 light:text-slate-400">
            Last report {host.lastSeenAt ? new Date(host.lastSeenAt).toLocaleTimeString() : "—"}
          </p>
        </div> : <p className="mt-4 text-xs text-white/45 light:text-slate-400">No data yet. Install the agent below, then reports appear within a minute.</p>}

      {/* What to do about it — only ever shows up when something's
          actually wrong (offline, or CPU/mem/disk over 70%); a clean host
          renders nothing here. */}
      <HostDiagnosisPanel host={host} onOpenRunbooks={() => setShowRunbooks(true)} />

      <div className="mt-4 flex items-center gap-3 text-xs">
        <button onClick={() => setShowRunbooks(v => !v)} className={showRunbooks ? "text-cyan-300" : "text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"}>
          {showRunbooks ? "Hide runbooks" : "Runbooks"}
        </button>
        <button onClick={() => setShowInstall(v => !v)} className="text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900">
          {showInstall ? "Hide install" : "Install command"}
        </button>
        {canDelete && <button onClick={handleRegen} className="text-amber-300 light:text-amber-600 hover:text-amber-200 light:hover:text-amber-700">
          Regenerate key
        </button>}
        {canDelete && <button onClick={handleDelete} className="ml-auto text-red-300 light:text-red-600 transition-colors hover:underline">
          Delete
        </button>}
      </div>

      {showRunbooks && <HostRunbooks hostId={host.id} />}
      {showInstall && <InstallSnippet host={host} />}
    </SpotlightCard>;
}
export default function Hosts() {
  useRealtimeInvalidate(REALTIME_TABLES, REALTIME_KEYS);
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { data: can } = useQuery({
    queryKey: ["my-permissions", organization?.id],
    queryFn: () => fetchMyPermissions(organization?.id),
    enabled: !!organization?.id,
    retry: false
  });
  const canCreate = !!can && can("organization", "hosts", "create");
  const canDelete = !!can && can("organization", "hosts", "delete");
  const {
    data: hosts,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["host-agents"],
    queryFn: listHostAgents,
    refetchInterval: 30_000
  });
  const [name, setName] = useState("");
  const [provider, setProvider] = useState(null);
  const [formError, setFormError] = useState(null);
  const createMutation = useMutation({
    mutationFn: () => createHostAgent({
      name,
      provider
    }),
    onSuccess: () => {
      setName("");
      setProvider(null);
      queryClient.invalidateQueries({
        queryKey: ["host-agents"]
      });
    },
    onError: err => setFormError(err instanceof Error ? err.message : "Failed to add host")
  });
  function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }
  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Kada Nigrani — Hosts</h1>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">
          Install a lightweight agent on any Linux server to stream CPU, memory, disk, load, and uptime here in real time.
        </p>
      </Reveal>

      {!canCreate && <Reveal delay={0.05}>
          <p className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] px-4 py-3 text-sm text-white/50 light:text-slate-500">
            Your role can view hosts but not add new ones — ask an organization admin if you need one added.
          </p>
        </Reveal>}

      {canCreate && <Reveal delay={0.05}>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70 light:text-slate-600">Host name</span>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="web-01 (production)" className="w-64 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none" />
          </label>
          <button type="submit" disabled={createMutation.isPending} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60">
            {createMutation.isPending ? "Adding…" : "Add Host"}
          </button>
        </div>
        <div>
          <span className="mb-1.5 block text-sm text-white/70 light:text-slate-600">Running on <span className="font-normal text-white/40 light:text-slate-400">(optional, just a label)</span></span>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map(p => <button key={p.value} type="button" onClick={() => setProvider(v => v === p.value ? null : p.value)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all ${provider === p.value ? "bg-white text-black" : "border border-white/15 text-white/60 light:text-slate-500 hover:border-white/30 hover:text-white light:hover:text-slate-900"}`}>
                <span aria-hidden>{p.icon}</span> {p.label}
              </button>)}
          </div>
        </div>
        {formError && <p className="text-sm text-red-300">{formError}</p>}
      </form>
      </Reveal>}

      {isError ? <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white">
          <ErrorState message="Couldn't load hosts." onRetry={() => refetch()} />
        </div> : isLoading ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({
        length: 3
      }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div> : !hosts || hosts.length === 0 ? <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white">
          <EmptyState title="No hosts yet." description="Add one above, then run the install command on your server." />
        </div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hosts.map((host, i) => <HostCard key={host.id} host={host} index={i} canDelete={canDelete} />)}
        </div>}
    </div>;
}