import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  adminCreateUser,
  archiveOrganization,
  deleteOrganization,
  fetchAdminCustomers,
  fetchOrganizationDetail,
  renameOrganization,
  restoreOrganization,
  updateOrganizationPlan,
} from "../../api/adminEndpoints";
import type { AdminCustomer, Plan } from "../../api/types";

const PLANS: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];
type SortKey = "name" | "createdAt" | "monitorsUsed" | "memberCount";

function titleCase(v: string): string {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

function ProvisionForm() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState<Plan>("STARTER");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => adminCreateUser({ email, password, organizationName, fullName, plan }),
    onSuccess: () => {
      setDone(`Provisioned ${email} on the ${titleCase(plan)} package.`);
      setError(null);
      setOrganizationName("");
      setEmail("");
      setPassword("");
      setFullName("");
      setPlan("STARTER");
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: unknown) => {
      setDone(null);
      setError(err instanceof Error ? err.message : "Failed to provision customer");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(null);
    mutation.mutate();
  }

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/40 focus:outline-none";

  if (!open) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300"
        >
          + Provision new customer
        </button>
        {done && <p className="text-sm text-emerald-300">{done}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-amber-400/20 bg-neutral-900/60 p-5">
      <p className="text-sm font-medium text-white">Provision a new customer</p>
      <p className="text-xs text-white/45">
        Creates the customer's organization and its admin account on the package you choose. They log in and use it
        independently, capped by the package limits.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Customer / organization name" required className={inputClass} />
        <label className="text-sm">
          <select value={plan} onChange={(e) => setPlan(e.target.value as Plan)} className={inputClass}>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {titleCase(p)} package
              </option>
            ))}
          </select>
        </label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" required className={inputClass} />
        <input type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temp password (min 8 chars)" required className={inputClass} />
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Admin full name (optional)" className={`sm:col-span-2 ${inputClass}`} />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-60"
        >
          {mutation.isPending ? "Provisioning…" : "Provision customer"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-white/50 hover:text-white">
          Cancel
        </button>
      </div>
    </form>
  );
}

function UsageCell({ used, max }: { used: number; max: number }) {
  const unlimited = max >= 100000;
  const atLimit = !unlimited && used >= max;
  return (
    <span className={atLimit ? "text-amber-300" : "text-white/70"}>
      {used}/{unlimited ? "∞" : max}
    </span>
  );
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function CustomerDetailModal({ organizationId, onClose }: { organizationId: string; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin-customer-detail", organizationId],
    queryFn: () => fetchOrganizationDetail(organizationId),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-950 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
      >
        {isLoading || !detail ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium text-white">{detail.name}</h2>
                <p className="mt-1 text-xs text-white/45">
                  {titleCase(detail.plan)} plan ·{" "}
                  <span className={detail.status === "active" ? "text-emerald-300" : "text-amber-300"}>
                    {titleCase(detail.status)}
                  </span>{" "}
                  · Customer since {new Date(detail.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={onClose} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 hover:text-white">
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Monitors", detail.monitorCount],
                ["Assets", detail.assetCount],
                ["Hosts", detail.hostCount],
                ["Open incidents", detail.openIncidentCount],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
                  <p className="mt-1 text-lg font-medium text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-white/40">Assigned users</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-white/10">
                    {detail.members.length === 0 ? (
                      <tr>
                        <td className="px-3 py-2.5 text-white/40">No members</td>
                      </tr>
                    ) : (
                      detail.members.map((m) => (
                        <tr key={m.userId}>
                          <td className="px-3 py-2.5 text-white">{m.email}</td>
                          <td className="px-3 py-2.5 text-white/50">{m.role}</td>
                          <td className="px-3 py-2.5 text-right text-white/40">{new Date(m.joinedAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-white/40">Recent activity</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
                {detail.recentIncidents.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-white/40">No incidents recorded.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-white/10">
                      {detail.recentIncidents.map((inc) => (
                        <tr key={inc.id}>
                          <td className="px-3 py-2.5 text-white">{inc.monitorName}</td>
                          <td className="px-3 py-2.5 text-white/50">{inc.cause ?? "Unknown cause"}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${inc.status === "OPEN" ? "bg-red-400/10 text-red-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                              {inc.status === "OPEN" ? "Open" : fmtDuration(new Date(inc.resolvedAt!).getTime() - new Date(inc.startedAt).getTime())}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function AdminCustomers() {
  const queryClient = useQueryClient();
  const { data: customers, isLoading } = useQuery({ queryKey: ["admin-customers"], queryFn: fetchAdminCustomers });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<Plan | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: Plan }) => updateOrganizationPlan(id, plan),
    onMutate: ({ id }) => setSavingId(id),
    onSettled: () => {
      setSavingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameOrganization(id, name),
    onSuccess: () => {
      setRenamingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (err: unknown) => alert(err instanceof Error ? err.message : "Failed to rename"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveOrganization(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-customers"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreOrganization(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-customers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-customers"] }),
    onError: (err: unknown) => alert(err instanceof Error ? err.message : "Failed to delete"),
  });

  const filtered = useMemo(() => {
    let rows = customers ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((c) => c.name.toLowerCase().includes(q) || (c.adminEmail ?? "").toLowerCase().includes(q));
    }
    if (planFilter !== "ALL") rows = rows.filter((c) => c.plan === planFilter);
    if (statusFilter !== "ALL") rows = rows.filter((c) => c.status === statusFilter);
    const sorted = [...rows].sort((a: AdminCustomer, b: AdminCustomer) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "monitorsUsed") cmp = a.monitorsUsed - b.monitorsUsed;
      else if (sortKey === "memberCount") cmp = a.memberCount - b.memberCount;
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [customers, search, planFilter, statusFilter, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    return (
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-white">
        {label}
        {sortKey === k && <span aria-hidden>{sortDesc ? "↓" : "↑"}</span>}
      </button>
    );
  }

  const selectClass = "rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Customers</h1>
        <p className="text-sm text-white/50">
          Provision and manage customer accounts by package — like a reseller console. Change a package instantly;
          usage below is capped by it.
        </p>
      </div>

      <ProvisionForm />

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer or admin email…"
          className="w-64 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/40 focus:outline-none"
        />
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value as Plan | "ALL")} className={selectClass}>
          <option value="ALL">All packages</option>
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {titleCase(p)}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={selectClass}>
          <option value="ALL">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        {(search || planFilter !== "ALL" || statusFilter !== "ALL") && (
          <button
            onClick={() => {
              setSearch("");
              setPlanFilter("ALL");
              setStatusFilter("ALL");
            }}
            className="text-xs text-white/40 hover:text-white"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-white/40">
          {filtered.length} of {customers?.length ?? 0}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : !customers || customers.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No customers yet. Provision one above.</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No customers match your filters.</p>
        ) : (
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="px-4 py-3"><SortHeader label="Customer" k="name" /></th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"><SortHeader label="Monitors" k="monitorsUsed" /></th>
                <th className="px-4 py-3">Hosts</th>
                <th className="px-4 py-3"><SortHeader label="Members" k="memberCount" /></th>
                <th className="px-4 py-3"><SortHeader label="Since" k="createdAt" /></th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((c) => (
                <tr key={c.organizationId} className={c.status === "archived" ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-medium text-white">
                    {renamingId === c.organizationId ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          renameMutation.mutate({ id: c.organizationId, name: renameValue });
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
                      <button onClick={() => setDetailId(c.organizationId)} className="hover:underline">
                        {c.name}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/50">{c.adminEmail ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.plan}
                      disabled={savingId === c.organizationId}
                      onChange={(e) => planMutation.mutate({ id: c.organizationId, plan: e.target.value as Plan })}
                      className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {titleCase(p)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.status === "active" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                      {titleCase(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3"><UsageCell used={c.monitorsUsed} max={c.maxMonitors} /></td>
                  <td className="px-4 py-3"><UsageCell used={c.hostsUsed} max={c.maxHosts} /></td>
                  <td className="px-4 py-3 text-white/50">{c.memberCount}</td>
                  <td className="px-4 py-3 text-white/50">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap text-xs">
                      <button onClick={() => setDetailId(c.organizationId)} className="text-white/50 hover:text-white">
                        View
                      </button>
                      <button
                        onClick={() => {
                          setRenamingId(c.organizationId);
                          setRenameValue(c.name);
                        }}
                        className="text-white/50 hover:text-white"
                      >
                        Rename
                      </button>
                      {c.status === "active" ? (
                        <button
                          onClick={() => archiveMutation.mutate(c.organizationId)}
                          disabled={archiveMutation.isPending}
                          className="text-amber-300 hover:underline disabled:opacity-50"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => restoreMutation.mutate(c.organizationId)}
                          disabled={restoreMutation.isPending}
                          className="text-emerald-300 hover:underline disabled:opacity-50"
                        >
                          Restore
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${c.name}"? This permanently removes the organization and all its monitors, incidents, assets, and hosts. User accounts remain but lose access. This cannot be undone.`)) {
                            deleteMutation.mutate(c.organizationId);
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

      <AnimatePresence>
        {detailId && <CustomerDetailModal organizationId={detailId} onClose={() => setDetailId(null)} />}
      </AnimatePresence>
    </div>
  );
}
