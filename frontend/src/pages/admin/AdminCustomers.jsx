import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { adminAssignCybersachetCourse, adminCreateUser, adminFetchCybersachetCourses, adminListCybersachetAssignments, adminUnassignCybersachetCourse, archiveOrganization, deleteOrganization, fetchAdminCustomers, fetchOrganizationDetail, fetchOrgProducts, renameOrganization, restoreOrganization, setOrgProduct, updateOrganizationPlan } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { AdminStatCard } from "../../components/AdminStatCard";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { useConfirm } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
const EASE = [0.16, 1, 0.3, 1];
const PLANS = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];
function titleCase(v) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}
function ProvisionForm() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState("STARTER");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const mutation = useMutation({
    mutationFn: () => adminCreateUser({
      email,
      password,
      organizationName,
      fullName,
      plan
    }),
    onSuccess: () => {
      setDone(`Provisioned ${email} on the ${titleCase(plan)} package.`);
      setError(null);
      setOrganizationName("");
      setEmail("");
      setPassword("");
      setFullName("");
      setPlan("STARTER");
      queryClient.invalidateQueries({
        queryKey: ["admin-customers"]
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-users"]
      });
    },
    onError: err => {
      setDone(null);
      setError(err instanceof Error ? err.message : "Failed to provision customer");
    }
  });
  function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setDone(null);
    mutation.mutate();
  }
  const inputClass = "w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none";
  if (!open) {
    return <div className="space-y-3">
        <button onClick={() => setOpen(true)} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300">
          + Provision new customer
        </button>
        {done && <p className="text-sm text-emerald-300">{done}</p>}
      </div>;
  }
  return <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-amber-400/20 light:border-amber-500/30 bg-neutral-900/60 light:bg-amber-50/40 p-5">
      <p className="text-sm font-medium text-white light:text-slate-900">Provision a new customer</p>
      <p className="text-xs text-white/45 light:text-slate-400">
        Creates the customer's organization and its admin account on the package you choose. They log in and use it
        independently, capped by the package limits.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={organizationName} onChange={e => setOrganizationName(e.target.value)} placeholder="Customer / organization name" required className={inputClass} />
        <label className="text-sm">
          <select value={plan} onChange={e => setPlan(e.target.value)} className={inputClass}>
            {PLANS.map(p => <option key={p} value={p}>
                {titleCase(p)} package
              </option>)}
          </select>
        </label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin email" required className={inputClass} />
        <input type="text" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Temp password (min 8 chars)" required className={inputClass} />
        <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Admin full name (optional)" className={`sm:col-span-2 ${inputClass}`} />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={mutation.isPending} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-60">
          {mutation.isPending ? "Provisioning…" : "Provision customer"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
          Cancel
        </button>
      </div>
    </form>;
}
function UsageCell({
  used,
  max
}) {
  const unlimited = max >= 100000;
  const atLimit = !unlimited && used >= max;
  return <span className={atLimit ? "text-amber-300" : "text-white/70 light:text-slate-600"}>
      {used}/{unlimited ? "∞" : max}
    </span>;
}
function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function CybersachetAssignmentsPanel({ organizationId, members }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: courses } = useQuery({
    queryKey: ["admin-cybersachet-courses"],
    queryFn: adminFetchCybersachetCourses
  });
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["admin-cybersachet-assignments", organizationId],
    queryFn: () => adminListCybersachetAssignments(organizationId)
  });
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const assign = useMutation({
    mutationFn: () => adminAssignCybersachetCourse(organizationId, userId, courseId, dueDate ? new Date(dueDate).toISOString() : null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cybersachet-assignments", organizationId] });
      setUserId("");
      setCourseId("");
      setDueDate("");
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to assign course")
  });
  const unassign = useMutation({
    mutationFn: ({ uid, cid }) => adminUnassignCybersachetCourse(organizationId, uid, cid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-cybersachet-assignments", organizationId] }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to unassign course")
  });
  const selectClass = "rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900";

  const now = Date.now();
  const total = assignments?.length ?? 0;
  const completed = (assignments ?? []).filter(a => a.completedAt);
  const overdue = (assignments ?? []).filter(a => !a.completedAt && a.dueAt && new Date(a.dueAt).getTime() < now);
  const completionPct = total > 0 ? Math.round(completed.length / total * 100) : 0;
  const avgScore = completed.length > 0 ? Math.round(completed.reduce((sum, a) => sum + (a.quizScore ?? 0), 0) / completed.length) : null;

  function exportCsv() {
    const rows = [["Member", "Course", "Product", "Assigned", "Due", "Completed", "Score"], ...(assignments ?? []).map(a => [a.userEmail, a.courseTitle, a.track === "academy" ? "Moonsav ITOps Academy" : "CyberSachet", new Date(a.assignedAt).toLocaleDateString(), a.dueAt ? new Date(a.dueAt).toLocaleDateString() : "", a.completedAt ? new Date(a.completedAt).toLocaleDateString() : "Not completed", a.quizScore ?? ""])];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cybersachet-assignments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Training Assignments</p>
      <p className="mt-1 text-[11px] text-white/35 light:text-slate-400">
        CyberSachet (security) and Moonsav ITOps Academy courses. Members only see courses assigned here — there's no
        self-enroll. Assign a course to require it for a specific person and track their completion below.
      </p>

      {total > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wide text-white/40 light:text-slate-400">Completion</p>
            <p className="mt-1 text-lg font-medium text-white light:text-slate-900">{completionPct}%</p>
          </div>
          <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wide text-white/40 light:text-slate-400">Avg. score</p>
            <p className="mt-1 text-lg font-medium text-white light:text-slate-900">{avgScore != null ? `${avgScore}%` : "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wide text-white/40 light:text-slate-400">Overdue</p>
            <p className={`mt-1 text-lg font-medium ${overdue.length > 0 ? "text-amber-300" : "text-white light:text-slate-900"}`}>{overdue.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wide text-white/40 light:text-slate-400">Total assigned</p>
            <p className="mt-1 text-lg font-medium text-white light:text-slate-900">{total}</p>
          </div>
        </div>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={userId} onChange={e => setUserId(e.target.value)} className={selectClass}>
          <option value="">Choose member…</option>
          {members.map(m => <option key={m.userId} value={m.userId}>{m.email}</option>)}
        </select>
        <select value={courseId} onChange={e => setCourseId(e.target.value)} className={selectClass}>
          <option value="">Choose course…</option>
          <optgroup label="CyberSachet">
            {(courses ?? []).filter(c => (c.track ?? "security") === "security").map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </optgroup>
          <optgroup label="Moonsav ITOps Academy">
            {(courses ?? []).filter(c => c.track === "academy").map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </optgroup>
        </select>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} title="Due date (optional)" className={selectClass} />
        <button onClick={() => assign.mutate()} disabled={!userId || !courseId || assign.isPending} className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300 disabled:opacity-50">
          {assign.isPending ? "Assigning…" : "Assign"}
        </button>
        {total > 0 && <button onClick={exportCsv} className="ml-auto rounded-full border border-white/15 light:border-slate-900/15 px-3 py-1.5 text-xs text-white/70 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-900/5">
            Export CSV
          </button>}
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 light:border-slate-900/10">
        {isLoading ? <SkeletonRows count={2} /> : !assignments || assignments.length === 0 ? <p className="px-3 py-3 text-sm text-white/40 light:text-slate-400">No courses assigned yet.</p> : <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {assignments.map(a => {
            const isOverdue = !a.completedAt && a.dueAt && new Date(a.dueAt).getTime() < now;
            return <tr key={`${a.userId}-${a.courseId}`}>
                  <td className="px-3 py-2.5 text-white light:text-slate-900">{a.userEmail}</td>
                  <td className="px-3 py-2.5 text-white/60 light:text-slate-600">
                    {a.courseTitle}
                    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${a.track === "academy" ? "bg-amber-400/10 text-amber-300" : "bg-rose-400/10 text-rose-300"}`}>
                      {a.track === "academy" ? "Academy" : "CyberSachet"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.completedAt ? "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700" : isOverdue ? "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700" : "bg-white/10 text-white/50 light:text-slate-500"}`}>
                      {a.completedAt ? `Completed · ${a.quizScore}%` : isOverdue ? "Overdue" : "Not completed"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => unassign.mutate({ uid: a.userId, cid: a.courseId })} className="text-xs text-red-300 light:text-red-600 hover:underline">
                      Unassign
                    </button>
                  </td>
                </tr>;
          })}
            </tbody>
          </table>}
      </div>
    </div>;
}
function CustomerDetailModal({
  organizationId,
  onClose
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const {
    data: detail,
    isLoading
  } = useQuery({
    queryKey: ["admin-customer-detail", organizationId],
    queryFn: () => fetchOrganizationDetail(organizationId)
  });
  const {
    data: orgProducts
  } = useQuery({
    queryKey: ["admin-org-products", organizationId],
    queryFn: () => fetchOrgProducts(organizationId)
  });
  const [togglingKey, setTogglingKey] = useState(null);
  const productMutation = useMutation({
    mutationFn: ({
      key,
      active
    }) => setOrgProduct(organizationId, key, active),
    onMutate: ({
      key
    }) => setTogglingKey(key),
    onSettled: () => {
      setTogglingKey(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-org-products", organizationId]
      });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update product license")
  });
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0
  }} className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{
      opacity: 0,
      scale: 0.97,
      y: -8
    }} animate={{
      opacity: 1,
      scale: 1,
      y: 0
    }} exit={{
      opacity: 0,
      scale: 0.97,
      y: -8
    }} className="w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-950 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        {isLoading || !detail ? <SkeletonRows count={4} className="h-10" /> : <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium text-white light:text-slate-900">{detail.name}</h2>
                <p className="mt-1 text-xs text-white/45 light:text-slate-400">
                  {titleCase(detail.plan)} plan ·{" "}
                  <span className={detail.status === "active" ? "text-emerald-300" : "text-amber-300"}>
                    {titleCase(detail.status)}
                  </span>{" "}
                  · Customer since {new Date(detail.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={onClose} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900">
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Monitors", detail.monitorCount], ["Assets", detail.assetCount], ["Hosts", detail.hostCount], ["Open incidents", detail.openIncidentCount]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-white/40 light:text-slate-400">{label}</p>
                  <p className="mt-1 text-lg font-medium text-white light:text-slate-900">{value}</p>
                </div>)}
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Licensed Products</p>
              <div className="mt-2 space-y-1.5">
                {(orgProducts ?? []).map(p => {
              const active = p.status === "active" || p.status === "trial";
              const busy = togglingKey === p.productKey;
              return <div key={p.productKey} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] light:bg-slate-900/[0.02] px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/80 light:text-slate-700">{p.productName}</p>
                        {active && p.grantedAt && <p className="text-[10px] text-white/35 light:text-slate-400">Granted {new Date(p.grantedAt).toLocaleDateString()}</p>}
                      </div>
                      <button onClick={() => productMutation.mutate({
                  key: p.productKey,
                  active: !active
                })} disabled={busy} aria-pressed={active} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${active ? "bg-emerald-400" : "bg-white/15"}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                      </button>
                    </div>;
            })}
              </div>
            </div>

            {(orgProducts ?? []).some(p => p.productKey === "cybersachet" && (p.status === "active" || p.status === "trial")) && (detail.plan === "STARTER" ? <div className="mt-6 rounded-xl border border-dashed border-white/15 light:border-slate-900/15 bg-white/[0.02] light:bg-slate-900/[0.02] p-4 text-sm text-white/50 light:text-slate-500">
                CyberSachet is licensed for this organization, but they're on the Starter package — members only see the free preview
                lesson until they upgrade to Professional or above.
              </div> : <CybersachetAssignmentsPanel organizationId={organizationId} members={detail.members} />)}

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Assigned users</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-white/10 light:border-slate-900/10">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                    {detail.members.length === 0 ? <tr>
                        <td className="px-3 py-2.5 text-white/40 light:text-slate-400">No members</td>
                      </tr> : detail.members.map(m => <tr key={m.userId}>
                          <td className="px-3 py-2.5 text-white light:text-slate-900">{m.email}</td>
                          <td className="px-3 py-2.5 text-white/50 light:text-slate-500">{m.role}</td>
                          <td className="px-3 py-2.5 text-right text-white/40 light:text-slate-400">{new Date(m.joinedAt).toLocaleDateString()}</td>
                        </tr>)}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Recent activity</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-white/10 light:border-slate-900/10">
                {detail.recentIncidents.length === 0 ? <p className="px-3 py-3 text-sm text-white/40 light:text-slate-400">No incidents recorded.</p> : <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                      {detail.recentIncidents.map(inc => <tr key={inc.id}>
                          <td className="px-3 py-2.5 text-white light:text-slate-900">{inc.monitorName}</td>
                          <td className="px-3 py-2.5 text-white/50 light:text-slate-500">{inc.cause ?? "Unknown cause"}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${inc.status === "OPEN" ? "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700" : "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700"}`}>
                              {inc.status === "OPEN" ? "Open" : fmtDuration(new Date(inc.resolvedAt).getTime() - new Date(inc.startedAt).getTime())}
                            </span>
                          </td>
                        </tr>)}
                    </tbody>
                  </table>}
              </div>
            </div>
          </div>}
      </motion.div>
    </motion.div>;
}
export default function AdminCustomers() {
  const { platformAdminRole } = useAuth();
  // A reseller's console is scoped to customers they provisioned (migration
  // 0031) and can create + change plan, but not rename/archive/delete a
  // customer's organization — that stays support/super_admin only. Hiding
  // these here is a UX affordance; the actual boundary is enforced by the
  // RLS/SECURITY DEFINER checks, which reject these calls regardless.
  const isResellerOnly = platformAdminRole === "reseller";
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const {
    data: customers,
    isLoading
  } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: fetchAdminCustomers
  });
  // "Book of business" snapshot for a reseller — no fabricated dollar
  // revenue (this platform doesn't mirror Stripe subscription amounts
  // locally, only the plan/status/usage data these are built from), just
  // the real aggregate counts across the customers they actually provisioned.
  const resellerSummary = useMemo(() => {
    if (!isResellerOnly || !customers) return null;
    const active = customers.filter(c => c.status === "active").length;
    const paid = customers.filter(c => c.plan !== "STARTER" && c.status === "active").length;
    const totalMembers = customers.reduce((sum, c) => sum + c.memberCount, 0);
    const totalMonitors = customers.reduce((sum, c) => sum + c.monitorsUsed, 0);
    return { total: customers.length, active, paid, totalMembers, totalMonitors };
  }, [isResellerOnly, customers]);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkPlan, setBulkPlan] = useState(PLANS[0]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const planMutation = useMutation({
    mutationFn: ({
      id,
      plan
    }) => updateOrganizationPlan(id, plan),
    onMutate: ({
      id
    }) => setSavingId(id),
    onSettled: () => {
      setSavingId(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-customers"]
      });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to change package")
  });
  const renameMutation = useMutation({
    mutationFn: ({
      id,
      name
    }) => renameOrganization(id, name),
    onSuccess: () => {
      setRenamingId(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-customers"]
      });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to rename")
  });
  const archiveMutation = useMutation({
    mutationFn: id => archiveOrganization(id),
    onSettled: () => queryClient.invalidateQueries({
      queryKey: ["admin-customers"]
    }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to archive")
  });
  const restoreMutation = useMutation({
    mutationFn: id => restoreOrganization(id),
    onSettled: () => queryClient.invalidateQueries({
      queryKey: ["admin-customers"]
    }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to restore")
  });
  const deleteMutation = useMutation({
    mutationFn: id => deleteOrganization(id),
    onSettled: () => queryClient.invalidateQueries({
      queryKey: ["admin-customers"]
    }),
    onSuccess: (_data, id) => toast.success(`Deleted "${customers?.find(c => c.organizationId === id)?.name ?? "organization"}".`),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete")
  });
  async function handleDelete(c) {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      description: "This permanently removes the organization and all its monitors, incidents, assets, and hosts. User accounts remain but lose access. This cannot be undone.",
      confirmLabel: "Delete permanently",
      danger: true
    });
    if (ok) deleteMutation.mutate(c.organizationId);
  }
  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelectAll(rows) {
    setSelectedIds(prev => prev.size === rows.length ? new Set() : new Set(rows.map(c => c.organizationId)));
  }
  // Reuses the same single-row mutations one at a time (not Promise.all) so
  // seat/plan-limit style backend checks that could depend on prior calls
  // in the batch stay correct, and one failure doesn't abort the rest.
  async function runBulk(ids, fn) {
    setBulkBusy(true);
    let succeeded = 0;
    for (const id of ids) {
      try { await fn(id); succeeded++; } catch { /* toast already shown by the underlying mutation's onError */ }
    }
    setBulkBusy(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    if (succeeded > 0) toast.success(`${succeeded} of ${ids.length} organization${ids.length === 1 ? "" : "s"} updated.`);
  }
  async function handleBulkArchive() {
    await runBulk([...selectedIds], id => archiveMutation.mutateAsync(id));
  }
  async function handleBulkDelete() {
    const ok = await confirm({
      title: `Delete ${selectedIds.size} organization${selectedIds.size === 1 ? "" : "s"}?`,
      description: "This permanently removes each organization and all its monitors, incidents, assets, and hosts. User accounts remain but lose access. This cannot be undone.",
      confirmLabel: "Delete permanently",
      danger: true
    });
    if (ok) await runBulk([...selectedIds], id => deleteMutation.mutateAsync(id));
  }
  async function handleBulkPlanChange() {
    await runBulk([...selectedIds], id => planMutation.mutateAsync({ id, plan: bulkPlan }));
  }
  const filtered = useMemo(() => {
    let rows = customers ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(c => c.name.toLowerCase().includes(q) || (c.adminEmail ?? "").toLowerCase().includes(q));
    }
    if (planFilter !== "ALL") rows = rows.filter(c => c.plan === planFilter);
    if (statusFilter !== "ALL") rows = rows.filter(c => c.status === statusFilter);
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);else if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();else if (sortKey === "monitorsUsed") cmp = a.monitorsUsed - b.monitorsUsed;else if (sortKey === "memberCount") cmp = a.memberCount - b.memberCount;
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [customers, search, planFilter, statusFilter, sortKey, sortDesc]);
  function toggleSort(key) {
    if (sortKey === key) setSortDesc(d => !d);else {
      setSortKey(key);
      setSortDesc(true);
    }
  }
  function SortHeader({
    label,
    k
  }) {
    return <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-white light:hover:text-slate-900">
        {label}
        {sortKey === k && <span aria-hidden>{sortDesc ? "↓" : "↑"}</span>}
      </button>;
  }
  const selectClass = "rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1.5 text-xs text-white light:text-slate-900";
  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">{isResellerOnly ? "My Customers" : "Customers"}</h1>
        <p className="text-sm text-white/50 light:text-slate-500">
          {isResellerOnly ? "The organizations you've provisioned — only you can see or manage these. Change a package instantly; usage below is capped by it." : "Provision and manage customer accounts by package — like a reseller console. Change a package instantly; usage below is capped by it."}
        </p>
      </Reveal>

      {resellerSummary && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="My Customers" value={resellerSummary.total} icon="organizations" delay={0} />
          <AdminStatCard label="Active" value={resellerSummary.active} icon="organizations" delay={0.03} />
          <AdminStatCard label="On a paid package" value={resellerSummary.paid} icon="organizations" delay={0.06} />
          <AdminStatCard label="Total seats used" value={resellerSummary.totalMembers} icon="users" delay={0.09} />
        </div>}

      <Reveal delay={0.05}>
        <ProvisionForm />
      </Reveal>

      <Reveal delay={0.08} className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or admin email…" className="w-64 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-1.5 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className={selectClass}>
          <option value="ALL">All packages</option>
          {PLANS.map(p => <option key={p} value={p}>
              {titleCase(p)}
            </option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="ALL">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        {(search || planFilter !== "ALL" || statusFilter !== "ALL") && <button onClick={() => {
        setSearch("");
        setPlanFilter("ALL");
        setStatusFilter("ALL");
      }} className="text-xs text-white/40 light:text-slate-400 hover:text-white light:hover:text-slate-900">
            Clear filters
          </button>}
        <span className="ml-auto text-xs text-white/40 light:text-slate-400">
          {filtered.length} of {customers?.length ?? 0}
        </span>
      </Reveal>

      {selectedIds.size > 0 && <Reveal className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-2.5">
          <span className="text-sm font-medium text-white light:text-slate-900">{selectedIds.size} selected</span>
          <div className="flex items-center gap-1.5">
            <select value={bulkPlan} onChange={e => setBulkPlan(e.target.value)} disabled={bulkBusy} className={selectClass}>
              {PLANS.map(p => <option key={p} value={p}>{titleCase(p)}</option>)}
            </select>
            <button onClick={handleBulkPlanChange} disabled={bulkBusy} className="rounded-full border border-white/15 light:border-slate-900/15 px-3 py-1.5 text-xs text-white/70 light:text-slate-600 hover:text-white light:hover:text-slate-900 disabled:opacity-50">
              Change package
            </button>
          </div>
          {!isResellerOnly && <>
            <button onClick={handleBulkArchive} disabled={bulkBusy} className="text-xs text-amber-300 light:text-amber-600 hover:underline disabled:opacity-50">Archive</button>
            <button onClick={handleBulkDelete} disabled={bulkBusy} className="text-xs text-red-300 light:text-red-600 hover:underline disabled:opacity-50">Delete</button>
          </>}
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-white/40 light:text-slate-400 hover:text-white light:hover:text-slate-900">Clear selection</button>
        </Reveal>}

      <SpotlightCard className="overflow-x-auto" delay={0.1} tint="amber" scan>
        {isLoading ? <SkeletonRows count={5} /> : !customers || customers.length === 0 ? <EmptyState title="No customers yet." description="Provision one above." /> : filtered.length === 0 ? <EmptyState title="No customers match your filters." /> : <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="w-8 px-4 py-3">
                  <input type="checkbox" aria-label="Select all" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={() => toggleSelectAll(filtered)} className="h-3.5 w-3.5 accent-amber-400" />
                </th>
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
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {filtered.map((c, i) => <motion.tr key={c.organizationId} initial={{
            opacity: 0,
            y: 6
          }} animate={{
            opacity: c.status === "archived" ? 0.5 : 1,
            y: 0
          }} transition={{
            duration: 0.3,
            delay: Math.min(i, 15) * 0.02,
            ease: EASE
          }}>
                  <td className="px-4 py-3">
                    <input type="checkbox" aria-label={`Select ${c.name}`} checked={selectedIds.has(c.organizationId)} onChange={() => toggleSelect(c.organizationId)} className="h-3.5 w-3.5 accent-amber-400" />
                  </td>
                  <td className="px-4 py-3 font-medium text-white light:text-slate-900">
                    {renamingId === c.organizationId ? <form onSubmit={e => {
                e.preventDefault();
                renameMutation.mutate({
                  id: c.organizationId,
                  name: renameValue
                });
              }} className="flex items-center gap-1.5">
                        <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} className="w-32 rounded-md border border-amber-400/40 bg-black/40 light:bg-white px-2 py-1 text-sm text-white light:text-slate-900 focus:outline-none" />
                        <button type="submit" className="text-xs text-emerald-300 light:text-emerald-600 hover:underline">Save</button>
                        <button type="button" onClick={() => setRenamingId(null)} className="text-xs text-white/40 light:text-slate-400 hover:text-white light:hover:text-slate-900">Cancel</button>
                      </form> : <button onClick={() => setDetailId(c.organizationId)} className="hover:underline">
                        {c.name}
                      </button>}
                  </td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{c.adminEmail ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select value={c.plan} disabled={savingId === c.organizationId} onChange={e => planMutation.mutate({
                id: c.organizationId,
                plan: e.target.value
              })} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-xs text-white light:text-slate-900 disabled:opacity-50">
                      {PLANS.map(p => <option key={p} value={p}>
                          {titleCase(p)}
                        </option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.status === "active" ? "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700" : "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700"}`}>
                      {titleCase(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3"><UsageCell used={c.monitorsUsed} max={c.maxMonitors} /></td>
                  <td className="px-4 py-3"><UsageCell used={c.hostsUsed} max={c.maxHosts} /></td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{c.memberCount}</td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap text-xs">
                      <button onClick={() => setDetailId(c.organizationId)} className="text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
                        View
                      </button>
                      {!isResellerOnly && <>
                        <button onClick={() => {
                    setRenamingId(c.organizationId);
                    setRenameValue(c.name);
                  }} className="text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
                          Rename
                        </button>
                        {c.status === "active" ? <button onClick={() => archiveMutation.mutate(c.organizationId)} disabled={archiveMutation.isPending} className="text-amber-300 light:text-amber-600 hover:underline disabled:opacity-50">
                            Archive
                          </button> : <button onClick={() => restoreMutation.mutate(c.organizationId)} disabled={restoreMutation.isPending} className="text-emerald-300 light:text-emerald-600 hover:underline disabled:opacity-50">
                            Restore
                          </button>}
                        <button onClick={() => handleDelete(c)} disabled={deleteMutation.isPending} className="text-red-300 light:text-red-600 transition-colors hover:underline disabled:opacity-50">
                          Delete
                        </button>
                      </>}
                    </div>
                  </td>
                </motion.tr>)}
            </tbody>
          </table>}
      </SpotlightCard>

      <AnimatePresence>
        {detailId && <CustomerDetailModal organizationId={detailId} onClose={() => setDetailId(null)} />}
      </AnimatePresence>
    </div>;
}