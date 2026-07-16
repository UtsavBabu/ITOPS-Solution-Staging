import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { fetchAdminMonitors } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/EmptyState";

const EASE = [0.16, 1, 0.3, 1];
const STATUS_FILTERS = [{ value: "ALL", label: "All" }, { value: "UP", label: "Up" }, { value: "DOWN", label: "Down" }, { value: "ERROR", label: "Error" }];

export default function AdminMonitors() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const { data: monitors, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-monitors"],
    queryFn: fetchAdminMonitors,
    retry: false,
    refetchInterval: 60_000
  });
  const filtered = useMemo(() => {
    let rows = monitors ?? [];
    if (statusFilter !== "ALL") rows = rows.filter(m => m.lastStatus === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(m => m.name.toLowerCase().includes(q) || m.organizationName.toLowerCase().includes(q) || m.url.toLowerCase().includes(q));
    }
    return rows;
  }, [monitors, statusFilter, search]);

  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Monitors</h1>
        <p className="text-sm text-white/50 light:text-slate-500">Every website, API, and network device check across every organization.</p>
      </Reveal>

      <Reveal delay={0.05} className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, organization, or URL…" className="w-72 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-1.5 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        {STATUS_FILTERS.map(f => <button key={f.value} onClick={() => setStatusFilter(f.value)} className={`rounded-full px-3 py-1.5 text-sm transition-colors ${statusFilter === f.value ? "bg-white text-black" : "border border-white/15 text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
            {f.label}
          </button>)}
        <span className="ml-auto text-xs text-white/40 light:text-slate-400">{filtered.length} of {monitors?.length ?? 0}</span>
      </Reveal>

      <SpotlightCard className="overflow-x-auto" delay={0.1} tint="amber" scan>
        {isLoading ? <SkeletonRows count={6} /> : isError ? <ErrorState message="Couldn't load monitors — migration 0035 may not be applied yet." onRetry={() => refetch()} /> : filtered.length === 0 ? <EmptyState title="No monitors match." /> : <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {filtered.map((m, i) => <motion.tr key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 20) * 0.02, ease: EASE }}>
                  <td className="px-4 py-3 font-medium text-white light:text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-white/60 light:text-slate-500">{m.organizationName}</td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{m.checkType === "TCP" ? `${m.url}:${m.tcpPort ?? "?"}` : m.url}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.lastStatus} /></td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleString() : "Pending"}</td>
                </motion.tr>)}
            </tbody>
          </table>}
      </SpotlightCard>
    </div>;
}
