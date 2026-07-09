import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveOrganization,
  deleteOrganization,
  fetchAdminOrganizations,
  renameOrganization,
  restoreOrganization,
  updateOrganizationPlan,
} from "../../api/adminEndpoints";
import type { Plan } from "../../api/types";

const PLANS: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

function titleCase(v: string): string {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

export default function AdminOrganizations() {
  const queryClient = useQueryClient();
  const { data: organizations, isLoading } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: fetchAdminOrganizations,
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "ALL">("ALL");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: Plan }) => updateOrganizationPlan(id, plan),
    onMutate: ({ id }) => setSavingId(id),
    onSettled: () => {
      setSavingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameOrganization(id, name),
    onSuccess: () => {
      setRenamingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
    onError: (err: unknown) => alert(err instanceof Error ? err.message : "Failed to rename"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveOrganization(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-organizations"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreOrganization(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-organizations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-organizations"] }),
    onError: (err: unknown) => alert(err instanceof Error ? err.message : "Failed to delete"),
  });

  const filtered = useMemo(() => {
    let rows = organizations ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((o) => o.name.toLowerCase().includes(q));
    }
    if (statusFilter !== "ALL") rows = rows.filter((o) => o.status === statusFilter);
    return rows;
  }, [organizations, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Organizations</h1>
        <p className="text-sm text-white/50">Every organization on the platform. Rename, archive, restore, or delete — plans change instantly.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations…"
          className="w-64 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/40 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
        >
          <option value="ALL">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <span className="ml-auto text-xs text-white/40">
          {filtered.length} of {organizations?.length ?? 0}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : !organizations || organizations.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No organizations yet.</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No organizations match your filters.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((org) => (
                <tr key={org.id} className={org.status === "archived" ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-medium text-white">
                    {renamingId === org.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          renameMutation.mutate({ id: org.id, name: renameValue });
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="w-32 rounded-md border border-amber-400/40 bg-black/40 px-2 py-1 text-sm text-white focus:outline-none"
                        />
                        <button type="submit" className="text-xs text-emerald-300 hover:underline">Save</button>
                        <button type="button" onClick={() => setRenamingId(null)} className="text-xs text-white/40 hover:text-white">Cancel</button>
                      </form>
                    ) : (
                      org.name
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${org.status === "active" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                      {titleCase(org.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50">{new Date(org.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <select
                      value={org.plan}
                      disabled={savingId === org.id}
                      onChange={(e) => planMutation.mutate({ id: org.id, plan: e.target.value as Plan })}
                      className="rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      {PLANS.map((plan) => (
                        <option key={plan} value={plan}>
                          {plan}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap text-xs">
                      <button
                        onClick={() => {
                          setRenamingId(org.id);
                          setRenameValue(org.name);
                        }}
                        className="text-white/50 hover:text-white"
                      >
                        Rename
                      </button>
                      {org.status === "active" ? (
                        <button
                          onClick={() => archiveMutation.mutate(org.id)}
                          disabled={archiveMutation.isPending}
                          className="text-amber-300 hover:underline disabled:opacity-50"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => restoreMutation.mutate(org.id)}
                          disabled={restoreMutation.isPending}
                          className="text-emerald-300 hover:underline disabled:opacity-50"
                        >
                          Restore
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${org.name}"? This permanently removes the organization and all its monitors, incidents, assets, and hosts. User accounts remain but lose access. This cannot be undone.`)) {
                            deleteMutation.mutate(org.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-red-300 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
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
