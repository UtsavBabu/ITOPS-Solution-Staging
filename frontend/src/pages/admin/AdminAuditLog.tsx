import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLog } from "../../api/adminEndpoints";

const PAGE_SIZE = 25;

const ACTION_LABEL: Record<string, { label: string; tone: string }> = {
  update_plan: { label: "Changed plan", tone: "bg-cyan-400/10 text-cyan-300" },
  rename: { label: "Renamed", tone: "bg-white/10 text-white/70" },
  archive: { label: "Archived", tone: "bg-amber-400/10 text-amber-300" },
  restore: { label: "Restored", tone: "bg-emerald-400/10 text-emerald-300" },
  delete: { label: "Deleted", tone: "bg-red-400/10 text-red-300" },
  grant_admin: { label: "Granted admin", tone: "bg-violet-400/10 text-violet-300" },
  revoke_admin: { label: "Revoked admin", tone: "bg-amber-400/10 text-amber-300" },
};

function describeMetadata(action: string, metadata: Record<string, unknown>): string | null {
  if (action === "update_plan" && metadata.from && metadata.to) return `${metadata.from} → ${metadata.to}`;
  if (action === "rename" && metadata.from && metadata.to) return `"${metadata.from}" → "${metadata.to}"`;
  return null;
}

export default function AdminAuditLog() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-log", page, search],
    queryFn: () => fetchAuditLog(PAGE_SIZE, page * PAGE_SIZE, search || undefined),
    refetchInterval: 30_000,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Audit Log</h1>
        <p className="text-sm text-white/50">
          Every organization lifecycle action and platform-admin grant, in order. Real entries only — nothing here is backfilled or simulated.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput);
          setPage(0);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by actor, action, or target…"
          className="w-72 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/40 focus:outline-none"
        />
        <button type="submit" className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:text-white">
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSearchInput("");
              setPage(0);
            }}
            className="text-xs text-white/40 hover:text-white"
          >
            Clear
          </button>
        )}
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : !data || data.entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-white/45">
            {search ? "No entries match your search." : "No admin actions logged yet."}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.entries.map((entry) => {
                const meta = ACTION_LABEL[entry.action] ?? { label: entry.action, tone: "bg-white/10 text-white/60" };
                const detail = describeMetadata(entry.action, entry.metadata);
                return (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-white/70">{entry.actorEmail ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {entry.targetLabel ?? entry.targetId ?? "—"}
                      <span className="ml-1.5 text-xs text-white/30">({entry.targetType})</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/45">{detail ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/40">{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-xs text-white/40">
            Page {page + 1} of {totalPages} · {data.totalCount} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
