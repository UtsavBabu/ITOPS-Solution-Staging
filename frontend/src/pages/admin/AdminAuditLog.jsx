import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { fetchAuditLog } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/EmptyState";
const EASE = [0.16, 1, 0.3, 1];
const PAGE_SIZE = 25;
const ACTION_LABEL = {
  update_plan: {
    label: "Changed plan",
    tone: "bg-cyan-400/10 light:bg-cyan-100 text-cyan-300 light:text-cyan-700"
  },
  rename: {
    label: "Renamed",
    tone: "bg-white/10 text-white/70 light:text-slate-600"
  },
  archive: {
    label: "Archived",
    tone: "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700"
  },
  restore: {
    label: "Restored",
    tone: "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700"
  },
  delete: {
    label: "Deleted",
    tone: "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700"
  },
  grant_admin: {
    label: "Granted admin",
    tone: "bg-violet-400/10 light:bg-violet-100 text-violet-300 light:text-violet-700"
  },
  revoke_admin: {
    label: "Revoked admin",
    tone: "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700"
  }
};
function describeMetadata(action, metadata) {
  if (action === "update_plan" && metadata.from && metadata.to) return `${metadata.from} → ${metadata.to}`;
  if (action === "rename" && metadata.from && metadata.to) return `"${metadata.from}" → "${metadata.to}"`;
  return null;
}
export default function AdminAuditLog() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const {
    data,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["admin-audit-log", page, search],
    queryFn: () => fetchAuditLog(PAGE_SIZE, page * PAGE_SIZE, search || undefined),
    refetchInterval: 30_000
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Audit Log</h1>
        <p className="text-sm text-white/50 light:text-slate-500">
          Every organization lifecycle action and platform-admin grant, in order. Real entries only — nothing here is backfilled or simulated.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
      <form onSubmit={e => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(0);
      }} className="flex items-center gap-2">
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search by actor, action, or target…" className="w-72 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-1.5 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <button type="submit" className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 light:text-slate-600 hover:text-white light:hover:text-slate-900">
          Search
        </button>
        {search && <button type="button" onClick={() => {
          setSearch("");
          setSearchInput("");
          setPage(0);
        }} className="text-xs text-white/40 light:text-slate-400 hover:text-white light:hover:text-slate-900">
            Clear
          </button>}
      </form>
      </Reveal>

      <SpotlightCard className="overflow-hidden" delay={0.1} tint="amber" scan>
        {isError ? <ErrorState message="Couldn't load the audit log." onRetry={() => refetch()} /> : isLoading ? <SkeletonRows count={6} className="h-12" /> : !data || data.entries.length === 0 ? <EmptyState title={search ? "No entries match your search." : "No admin actions logged yet."} /> : <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {data.entries.map((entry, i) => {
            const meta = ACTION_LABEL[entry.action] ?? {
              label: entry.action,
              tone: "bg-white/10 text-white/60 light:text-slate-500"
            };
            const detail = describeMetadata(entry.action, entry.metadata);
            return <motion.tr key={entry.id} initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} transition={{
              duration: 0.25,
              delay: Math.min(i, 20) * 0.015,
              ease: EASE
            }}>
                    <td className="px-4 py-3 text-white/70 light:text-slate-600">{entry.actorEmail ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60 light:text-slate-500">
                      {entry.targetLabel ?? entry.targetId ?? "—"}
                      <span className="ml-1.5 text-xs text-white/30 light:text-slate-400">({entry.targetType})</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/45 light:text-slate-400">{detail ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/40 light:text-slate-400">{new Date(entry.createdAt).toLocaleString()}</td>
                  </motion.tr>;
          })}
            </tbody>
          </table>}
      </SpotlightCard>

      {data && data.totalCount > PAGE_SIZE && <div className="flex items-center justify-between text-sm">
          <p className="text-xs text-white/40 light:text-slate-400">
            Page {page + 1} of {totalPages} · {data.totalCount} entries
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 light:text-slate-600 disabled:opacity-40">
              ← Previous
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 light:text-slate-600 disabled:opacity-40">
              Next →
            </button>
          </div>
        </div>}
    </div>;
}