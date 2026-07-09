import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createHostAgent, deleteHostAgent, listHostAgents, regenerateHostAgentKey } from "../api/endpoints";
import type { HostAgent } from "../api/types";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";
import { HostRunbooks } from "../components/HostRunbooks";

const INGEST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-metrics`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const REALTIME_TABLES = ["host_agents", "host_metrics"];
const REALTIME_KEYS = [["host-agents"]];

function formatUptime(seconds: number | null): string {
  if (seconds == null) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function UsageBar({ label, value }: { label: string; value: number | null }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const tone = pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/50">
        <span>{label}</span>
        <span>{value == null ? "—" : `${value.toFixed(0)}%`}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InstallSnippet({ host }: { host: HostAgent }) {
  const [copied, setCopied] = useState(false);
  const snippet = `curl -fsSL "${window.location.origin}/kada-nigrani-agent.sh" -o /opt/kada-nigrani-agent.sh && chmod +x /opt/kada-nigrani-agent.sh
# Run every minute via cron:
( crontab -l 2>/dev/null; echo '* * * * * INGEST_URL="${INGEST_URL}" ANON_KEY="${ANON_KEY}" AGENT_KEY="${host.ingestKey}" /opt/kada-nigrani-agent.sh >/dev/null 2>&1' ) | crontab -`;

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">Install on this host</p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-[11px] text-white/60 hover:text-white"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-white/55">{snippet}</pre>
    </div>
  );
}

function HostCard({ host }: { host: HostAgent }) {
  const queryClient = useQueryClient();
  const [showInstall, setShowInstall] = useState(!host.lastSeenAt);
  const [showRunbooks, setShowRunbooks] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteHostAgent(host.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["host-agents"] }),
  });
  const regenMutation = useMutation({
    mutationFn: () => regenerateHostAgentKey(host.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["host-agents"] }),
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${host.isOnline ? "bg-emerald-400" : "bg-white/30"}`} />
            <h3 className="truncate text-sm font-medium text-white">{host.name}</h3>
          </div>
          <p className="mt-0.5 truncate text-xs text-white/45">
            {host.hostname ?? "awaiting first report"}
            {host.os ? ` · ${host.os}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${host.isOnline ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/50"}`}>
          {host.isOnline ? "Online" : host.lastSeenAt ? "Offline" : "Pending"}
        </span>
      </div>

      {host.lastSeenAt ? (
        <div className="mt-4 space-y-2.5">
          <UsageBar label="CPU" value={host.cpuPercent} />
          <UsageBar label="Memory" value={host.memPercent} />
          <UsageBar label="Disk" value={host.diskPercent} />
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div>
              <p className="text-white">{formatUptime(host.uptimeSeconds)}</p>
              <p className="text-[10px] text-white/40">Uptime</p>
            </div>
            <div>
              <p className="text-white">{host.load1?.toFixed(2) ?? "—"}</p>
              <p className="text-[10px] text-white/40">Load</p>
            </div>
            <div>
              <p className="text-white">{host.processCount ?? "—"}</p>
              <p className="text-[10px] text-white/40">Procs</p>
            </div>
          </div>
          <p className="pt-1 text-[11px] text-white/35">
            Last report {host.lastSeenAt ? new Date(host.lastSeenAt).toLocaleTimeString() : "—"}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-white/45">No data yet. Install the agent below, then reports appear within a minute.</p>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs">
        <button onClick={() => setShowRunbooks((v) => !v)} className={showRunbooks ? "text-cyan-300" : "text-white/60 hover:text-white"}>
          {showRunbooks ? "Hide runbooks" : "Runbooks"}
        </button>
        <button onClick={() => setShowInstall((v) => !v)} className="text-white/60 hover:text-white">
          {showInstall ? "Hide install" : "Install command"}
        </button>
        <button
          onClick={() => {
            if (confirm("Regenerate this host's ingest key? The old key stops working immediately.")) regenMutation.mutate();
          }}
          className="text-white/60 hover:text-white"
        >
          Regenerate key
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete host "${host.name}"? Its metrics history will be removed.`)) deleteMutation.mutate();
          }}
          className="ml-auto text-red-300 hover:underline"
        >
          Delete
        </button>
      </div>

      {showRunbooks && <HostRunbooks hostId={host.id} />}
      {showInstall && <InstallSnippet host={host} />}
    </div>
  );
}

export default function Hosts() {
  useRealtimeInvalidate(REALTIME_TABLES, REALTIME_KEYS);
  const queryClient = useQueryClient();
  const { data: hosts, isLoading } = useQuery({ queryKey: ["host-agents"], queryFn: listHostAgents, refetchInterval: 30_000 });

  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => createHostAgent({ name }),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["host-agents"] });
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : "Failed to add host"),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Kada Nigrani — Hosts</h1>
        <p className="mt-1 text-sm text-white/50">
          Install a lightweight agent on any Linux server to stream CPU, memory, disk, load, and uptime here in real time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70">Host name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="web-01 (production)"
            className="w-64 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
        >
          {createMutation.isPending ? "Adding…" : "Add Host"}
        </button>
        {formError && <p className="w-full text-sm text-red-300">{formError}</p>}
      </form>

      {isLoading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : !hosts || hosts.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 text-sm text-white/50">
          No hosts yet. Add one above, then run the install command on your server.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hosts.map((host) => (
            <HostCard key={host.id} host={host} />
          ))}
        </div>
      )}
    </div>
  );
}
