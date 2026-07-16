import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { fetchAdminHostAgents } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/EmptyState";

const EASE = [0.16, 1, 0.3, 1];
const PROVIDER_LABEL = { aws: "AWS", azure: "Azure", gcp: "GCP", on_prem: "On-Prem", other: "Other" };
const PROVIDER_STYLE = {
  aws: "bg-orange-400/10 text-orange-300",
  azure: "bg-blue-400/10 light:bg-blue-100 text-blue-300 light:text-blue-700",
  gcp: "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700",
  on_prem: "bg-white/10 text-white/60 light:text-slate-500",
  other: "bg-violet-400/10 light:bg-violet-100 text-violet-300 light:text-violet-700"
};

export default function AdminAgents() {
  const [search, setSearch] = useState("");
  const { data: agents, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-host-agents"],
    queryFn: fetchAdminHostAgents,
    retry: false,
    refetchInterval: 60_000
  });
  const filtered = useMemo(() => {
    if (!search.trim()) return agents ?? [];
    const q = search.trim().toLowerCase();
    return (agents ?? []).filter(a => a.name.toLowerCase().includes(q) || a.organizationName.toLowerCase().includes(q));
  }, [agents, search]);

  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Server Agents</h1>
        <p className="text-sm text-white/50 light:text-slate-500">Every Kada Nigrani agent reporting in across every organization.</p>
      </Reveal>

      <Reveal delay={0.05} className="flex items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by host or organization…" className="w-72 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-1.5 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <span className="ml-auto text-xs text-white/40 light:text-slate-400">{filtered.length} of {agents?.length ?? 0}</span>
      </Reveal>

      <SpotlightCard className="overflow-x-auto" delay={0.1} tint="amber" scan>
        {isLoading ? <SkeletonRows count={5} /> : isError ? <ErrorState message="Couldn't load agents — migration 0035 may not be applied yet." onRetry={() => refetch()} /> : filtered.length === 0 ? <EmptyState title="No server agents match." /> : <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">OS</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {filtered.map((a, i) => <motion.tr key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 20) * 0.02, ease: EASE }}>
                  <td className="px-4 py-3 font-medium text-white light:text-slate-900">{a.name}</td>
                  <td className="px-4 py-3 text-white/60 light:text-slate-500">{a.organizationName}</td>
                  <td className="px-4 py-3">
                    {a.provider ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PROVIDER_STYLE[a.provider]}`}>{PROVIDER_LABEL[a.provider]}</span> : <span className="text-white/30 light:text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{a.os ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${a.isOnline ? "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700" : "bg-white/10 text-white/50 light:text-slate-500"}`}>
                      {a.isOnline ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{a.lastSeenAt ? new Date(a.lastSeenAt).toLocaleString() : "Never"}</td>
                </motion.tr>)}
            </tbody>
          </table>}
      </SpotlightCard>
    </div>;
}
