import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { fetchAdminOpenIncidents } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/EmptyState";

const EASE = [0.16, 1, 0.3, 1];

function timeSince(iso) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function AdminIncidents() {
  const [search, setSearch] = useState("");
  const { data: incidents, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-open-incidents"],
    queryFn: fetchAdminOpenIncidents,
    retry: false,
    refetchInterval: 60_000
  });
  const filtered = useMemo(() => {
    if (!search.trim()) return incidents ?? [];
    const q = search.trim().toLowerCase();
    return (incidents ?? []).filter(i => i.monitorName.toLowerCase().includes(q) || i.organizationName.toLowerCase().includes(q));
  }, [incidents, search]);

  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Open Incidents</h1>
        <p className="text-sm text-white/50 light:text-slate-500">Every unresolved incident across every organization, oldest attention-worthy first.</p>
      </Reveal>

      <Reveal delay={0.05} className="flex items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by monitor or organization…" className="w-72 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-1.5 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <span className="ml-auto text-xs text-white/40 light:text-slate-400">{filtered.length} of {incidents?.length ?? 0}</span>
      </Reveal>

      <SpotlightCard className="overflow-hidden" delay={0.1} tint="amber" scan>
        {isLoading ? <SkeletonRows count={5} className="h-16" /> : isError ? <ErrorState message="Couldn't load incidents — migration 0035 may not be applied yet." onRetry={() => refetch()} /> : filtered.length === 0 ? <EmptyState title="No open incidents." description="Every organization is healthy right now." /> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
            {filtered.map((incident, i) => <motion.li key={incident.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 20) * 0.03, ease: EASE }} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white light:text-slate-900">{incident.monitorName}</p>
                  <p className="truncate text-xs text-white/45 light:text-slate-400">{incident.organizationName} · {incident.cause ?? "Unknown cause"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-red-400/10 px-2.5 py-1 text-[11px] font-medium text-red-300">
                  {timeSince(incident.startedAt)} open
                </span>
              </motion.li>)}
          </ul>}
      </SpotlightCard>
    </div>;
}
