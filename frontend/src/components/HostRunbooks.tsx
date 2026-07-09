import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRunbookActions, listHostCommands, requestHostCommand } from "../api/endpoints";
import type { HostCommand } from "../api/types";

const RISK_STYLE: Record<string, string> = {
  safe: "text-emerald-300 border-emerald-400/30",
  low: "text-cyan-300 border-cyan-400/30",
  medium: "text-amber-300 border-amber-400/30",
};

const STATUS_STYLE: Record<HostCommand["status"], { dot: string; text: string }> = {
  approved: { dot: "bg-cyan-400", text: "text-cyan-300" },
  running: { dot: "bg-amber-400 [animation:pulse-glow_1.2s_ease-in-out_infinite]", text: "text-amber-300" },
  success: { dot: "bg-emerald-400", text: "text-emerald-300" },
  failed: { dot: "bg-red-400", text: "text-red-300" },
  cancelled: { dot: "bg-white/30", text: "text-white/40" },
};

export function HostRunbooks({ hostId }: { hostId: string }) {
  const queryClient = useQueryClient();
  const { data: actions } = useQuery({ queryKey: ["runbook-actions"], queryFn: fetchRunbookActions, staleTime: 60 * 60 * 1000 });
  const { data: commands } = useQuery({
    queryKey: ["host-commands", hostId],
    queryFn: () => listHostCommands(hostId),
    refetchInterval: 5000,
  });

  const [actionKey, setActionKey] = useState("");
  const [arg, setArg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = actions?.find((a) => a.actionKey === actionKey);

  const runMutation = useMutation({
    mutationFn: () => requestHostCommand(hostId, actionKey, selected?.needsArg ? arg : undefined),
    onSuccess: () => {
      setArg("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["host-commands", hostId] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Failed to queue action"),
  });

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/40">Remediation runbooks</p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={actionKey}
          onChange={(e) => {
            setActionKey(e.target.value);
            setError(null);
          }}
          aria-label="Choose a runbook action"
          className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
        >
          <option value="">Choose action…</option>
          {actions?.map((a) => (
            <option key={a.actionKey} value={a.actionKey}>
              {a.label} · {a.risk}
            </option>
          ))}
        </select>
        {selected?.needsArg && (
          <input
            value={arg}
            onChange={(e) => setArg(e.target.value)}
            placeholder={selected.argLabel ?? "argument"}
            className="w-40 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
          />
        )}
        <button
          onClick={() => {
            if (confirm(`Queue "${selected?.label}"${arg ? ` (${arg})` : ""} on this host? The agent runs it on its next cycle.`)) runMutation.mutate();
          }}
          disabled={!actionKey || runMutation.isPending || (selected?.needsArg && !arg.trim())}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {runMutation.isPending ? "Queuing…" : "Run"}
        </button>
        {selected && <span className={`rounded-full border px-2 py-0.5 text-[10px] ${RISK_STYLE[selected.risk] ?? "text-white/50 border-white/20"}`}>{selected.risk} risk</span>}
      </div>

      {selected && <p className="mt-2 text-[11px] leading-relaxed text-white/45">{selected.description}</p>}
      {error && <p className="mt-2 text-[11px] text-red-300">{error}</p>}

      {commands && commands.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {commands.slice(0, 6).map((c) => {
            const st = STATUS_STYLE[c.status];
            return (
              <div key={c.id} className="text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  <span className="font-medium text-white/80">{c.actionKey}{c.arg ? ` · ${c.arg}` : ""}</span>
                  <span className={`ml-auto ${st.text}`}>
                    {c.status}
                    {c.exitCode != null ? ` (exit ${c.exitCode})` : ""}
                  </span>
                  <span className="text-white/30">{new Date(c.createdAt).toLocaleTimeString()}</span>
                </div>
                {c.output && <p className="ml-3.5 mt-0.5 truncate font-mono text-[10px] text-white/40">{c.output}</p>}
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-[10px] text-white/25">
        The agent runs actions only when started with <code>AGENT_ALLOW_ACTIONS=1</code>. Every run is logged with its
        exit code and output above.
      </p>
    </div>
  );
}
