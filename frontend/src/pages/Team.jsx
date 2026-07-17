import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { assignCybersachetCourseToMember, archiveDepartment, assignDepartmentManager, assignMemberDepartment, createDepartment, createOrgInvite, deleteDepartment, fetchCybersachetCourses, fetchCybersachetLicense, fetchDepartments, fetchDepartmentTrainingReport, fetchMyPermissions, fetchOrgCybersachetAssignments, fetchOrgInvites, fetchOrgRoles, fetchOrganizationMembers, fetchPlanUsage, createCheckoutSession, renameDepartment, resetCybersachetProgress, restoreDepartment, revokeOrgInvite, sendOrgInviteEmail, unassignCybersachetCourseFromMember, updateMemberRole } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { StatusPageCard } from "../components/StatusPageCard";
import { Reveal, SpotlightCard } from "../components/Animated";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
const EASE = [0.16, 1, 0.3, 1];
const PLANS = [{
  name: "STARTER",
  label: "Starter",
  price: "Free",
  color: "border-white/15 light:border-slate-900/15",
  features: ["3 monitors", "1 alert channel", "7-day history", "Website monitoring only", "No network devices", "No server agents"]
}, {
  name: "PROFESSIONAL",
  label: "Professional",
  price: "$29/mo",
  color: "border-blue-400/30",
  highlight: true,
  features: ["25 monitors", "5 alert channels", "30-day history", "Website + network monitoring", "10 server agents", "Public status page"]
}, {
  name: "BUSINESS",
  label: "Business",
  price: "$99/mo",
  color: "border-violet-400/30",
  features: ["100 monitors", "20 alert channels", "90-day history", "All check types", "50 server agents", "Priority support"]
}, {
  name: "ENTERPRISE",
  label: "Enterprise",
  price: "Custom",
  color: "border-amber-400/30",
  features: ["Unlimited monitors", "Unlimited channels", "365-day history", "All features", "Unlimited agents", "Dedicated support"]
}];
function UpgradeButton({
  plan
}) {
  const toast = useToast();
  const checkout = useMutation({
    mutationFn: () => createCheckoutSession(plan)
  });
  if (plan === "ENTERPRISE") {
    return <a href="mailto:sales@itops-monitor.local" className="mt-4 block rounded-full border border-white/20 px-3 py-2 text-center text-xs font-medium text-white/80 light:text-slate-700 transition-colors hover:bg-white/10">
        Contact Sales
      </a>;
  }
  return <button type="button" onClick={() => checkout.mutate(undefined, {
    onSuccess: url => window.location.href = url,
    onError: err => toast.error(err instanceof Error ? err.message : "Couldn't start checkout")
  })} disabled={checkout.isPending} className="mt-4 w-full rounded-full bg-white px-3 py-2 text-center text-xs font-medium text-black transition-transform hover:scale-105 hover:bg-neutral-200 disabled:opacity-60">
      {checkout.isPending ? "Redirecting…" : "Upgrade with Card"}
    </button>;
}
function UsageBar({
  label,
  current,
  max
}) {
  const unlimited = max >= 100000;
  const pct = unlimited ? 0 : Math.min(100, current / max * 100);
  const atLimit = !unlimited && current >= max;
  return <div>
      <div className="flex justify-between text-xs text-white/50 light:text-slate-500">
        <span>{label}</span>
        <span className={atLimit ? "text-amber-300" : ""}>
          <AnimatedCounter value={current} />/{unlimited ? "∞" : max}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10 light:bg-slate-900/10">
        <motion.div className={`h-full rounded-full ${atLimit ? "bg-amber-400" : "bg-emerald-400"}`} initial={{
        width: 0
      }} animate={{
        width: unlimited ? "0%" : `${pct}%`
      }} transition={{
        duration: 0.7,
        ease: EASE
      }} />
      </div>
    </div>;
}

function DepartmentRow({ dept, members, canManage, onSaved }) {
  const [name, setName] = useState(dept.name);
  const [managerId, setManagerId] = useState(dept.managerUserId ?? "");
  const toast = useToast();
  const confirm = useConfirm();
  const selectClass = "rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900";
  const rename = useMutation({
    mutationFn: () => renameDepartment(dept.id, name),
    onSuccess: () => { toast.success("Department renamed."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to rename department")
  });
  const setManager = useMutation({
    mutationFn: () => assignDepartmentManager(dept.id, managerId || null),
    onSuccess: () => { toast.success("Manager updated."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to assign manager")
  });
  const archive = useMutation({
    mutationFn: () => archiveDepartment(dept.id),
    onSuccess: () => { toast.success("Department archived."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to archive department")
  });
  const restore = useMutation({
    mutationFn: () => restoreDepartment(dept.id),
    onSuccess: () => { toast.success("Department restored."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to restore department")
  });
  const remove = useMutation({
    mutationFn: () => deleteDepartment(dept.id),
    onSuccess: () => { toast.success("Department deleted."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete department")
  });

  if (!canManage) {
    return <tr>
        <td className="px-3 py-2.5 text-white light:text-slate-900">{dept.name}{dept.archived && <span className="ml-2 text-[10px] text-white/35 light:text-slate-400">Archived</span>}</td>
        <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{dept.managerEmail ?? "—"}</td>
        <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{dept.memberCount}</td>
      </tr>;
  }
  return <tr>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <input value={name} onChange={e => setName(e.target.value)} className={`w-36 ${selectClass}`} />
          {name !== dept.name && <button onClick={() => rename.mutate()} disabled={rename.isPending} className="rounded-full border border-white/15 px-2 py-1 text-[11px] text-white/60 hover:text-white">Save</button>}
          {dept.archived && <span className="text-[10px] text-white/35 light:text-slate-400">Archived</span>}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <select value={managerId} onChange={e => setManagerId(e.target.value)} className={selectClass}>
            <option value="">No manager</option>
            {members.map(m => <option key={m.userId} value={m.userId}>{m.email}</option>)}
          </select>
          {managerId !== (dept.managerUserId ?? "") && <button onClick={() => setManager.mutate()} disabled={setManager.isPending} className="rounded-full border border-white/15 px-2 py-1 text-[11px] text-white/60 hover:text-white">Save</button>}
        </div>
      </td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{dept.memberCount}</td>
      <td className="px-3 py-2.5 text-right space-x-3">
        {dept.archived ? <button onClick={() => restore.mutate()} className="text-xs text-emerald-300 light:text-emerald-600 hover:underline">Restore</button>
          : <button onClick={() => archive.mutate()} className="text-xs text-amber-300 light:text-amber-600 hover:underline">Archive</button>}
        <button onClick={async () => { if (await confirm({ title: "Delete department?", description: "Members keep their accounts — they just become unassigned." })) remove.mutate(); }} className="text-xs text-red-300 light:text-red-600 hover:underline">Delete</button>
      </td>
    </tr>;
}

function DepartmentsPanel({ members, canManage }) {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const { data: departments, isLoading, isError, refetch } = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const create = useMutation({
    mutationFn: () => createDepartment(newName),
    onSuccess: () => { toast.success("Department created."); setNewName(""); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to create department")
  });
  const active = (departments ?? []).filter(d => !d.archived);
  const archived = (departments ?? []).filter(d => d.archived);

  return <SpotlightCard className="overflow-hidden" delay={0.11}>
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white light:text-slate-900">Departments</h2>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">Group your team — IT, Security, Finance, whatever fits — to assign a manager and see per-department training compliance below.</p>
      </div>
      <div className="p-4 space-y-3">
        {canManage && <div className="flex items-center gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New department name" className="w-56 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900 placeholder:text-white/30" />
            <button onClick={() => create.mutate()} disabled={!newName.trim() || create.isPending} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {create.isPending ? "Creating…" : "+ Add department"}
            </button>
          </div>}
        {isError ? <ErrorState message="Couldn't load departments." onRetry={refetch} /> : isLoading ? <SkeletonRows count={2} /> : (departments ?? []).length === 0 ? <p className="text-sm text-white/40 light:text-slate-400">No departments yet.</p> : <div className="overflow-hidden rounded-xl border border-white/10 light:border-slate-900/10">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 light:border-slate-900/10 text-[11px] uppercase text-white/40 light:text-slate-400">
                <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Manager</th><th className="px-3 py-2">Members</th>{canManage && <th />}</tr>
              </thead>
              <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                {[...active, ...archived].map(d => <DepartmentRow key={d.id} dept={d} members={members} canManage={canManage} onSaved={refetch} />)}
              </tbody>
            </table>
          </div>}
      </div>
    </SpotlightCard>;
}

function DepartmentComplianceCard() {
  const { data: report, isLoading, isError, refetch } = useQuery({ queryKey: ["department-training-report"], queryFn: fetchDepartmentTrainingReport });
  if (isLoading) return <SkeletonRows count={2} />;
  if (isError) return <ErrorState message="Couldn't load department training report." onRetry={refetch} />;
  const rows = (report ?? []).filter(r => r.assignedCount > 0 || r.memberCount > 0);
  if (rows.length === 0) return null;
  return <div className="border-t border-white/10 light:border-slate-900/10 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Department compliance</p>
      <div className="space-y-2">
        {rows.map(r => <div key={r.departmentId ?? "none"} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs text-white/70 light:text-slate-600">{r.departmentName}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10 light:bg-slate-900/8">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${r.completionPct}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-medium text-white/70 light:text-slate-600">{r.completionPct}%</span>
            <span className="w-24 shrink-0 text-right text-[11px] text-white/40 light:text-slate-400">{r.completedCount}/{r.assignedCount} done</span>
          </div>)}
      </div>
    </div>;
}

function InviteRow({ invite, canManage, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [sending, setSending] = useState(false);
  const revoke = useMutation({
    mutationFn: () => revokeOrgInvite(invite.id),
    onSuccess: () => { toast.success("Invite revoked."); onChanged(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to revoke invite")
  });
  const statusColor = {
    pending: "text-cyan-300 light:text-cyan-600",
    accepted: "text-emerald-300 light:text-emerald-600",
    expired: "text-white/35 light:text-slate-400",
    revoked: "text-red-300 light:text-red-600"
  }[invite.status] ?? "text-white/50";

  async function copyLink(link) {
    await navigator.clipboard.writeText(link ?? `${window.location.origin}/invite/${invite.token}`);
  }
  async function handleSend() {
    setSending(true);
    try {
      const result = await sendOrgInviteEmail(invite.id);
      if (result.sent) {
        toast.success(`Invite emailed to ${invite.email}.`);
      } else {
        await copyLink(result.inviteLink);
        toast.info("Email delivery isn't configured — invite link copied instead.");
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSending(false);
    }
  }
  async function handleCopy() {
    await copyLink();
    toast.success("Invite link copied.");
  }

  return <tr>
      <td className="px-3 py-2.5 text-white light:text-slate-900">{invite.email}</td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{invite.roleName}</td>
      <td className={`px-3 py-2.5 text-xs font-medium capitalize ${statusColor}`}>{invite.status}</td>
      <td className="px-3 py-2.5 text-xs text-white/40 light:text-slate-400">{new Date(invite.expiresAt).toLocaleDateString()}</td>
      {canManage && <td className="px-3 py-2.5 text-right space-x-3">
          {invite.status === "pending" && <>
              <button onClick={handleSend} disabled={sending} className="text-xs text-cyan-300 light:text-cyan-600 hover:underline disabled:opacity-50">{sending ? "Sending…" : "Email"}</button>
              <button onClick={handleCopy} className="text-xs text-white/60 light:text-slate-500 hover:underline">Copy link</button>
              <button onClick={async () => { if (await confirm({ title: "Revoke invite?", description: `${invite.email} won't be able to use this link anymore.` })) revoke.mutate(); }} className="text-xs text-red-300 light:text-red-600 hover:underline">Revoke</button>
            </>}
        </td>}
    </tr>;
}

function InvitesPanel({ orgRoles, canManage }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const { data: invites, isLoading, isError, refetch } = useQuery({ queryKey: ["org-invites"], queryFn: fetchOrgInvites, enabled: canManage });
  const create = useMutation({
    mutationFn: () => createOrgInvite(email, role || orgRoles[0]?.key),
    onSuccess: () => { toast.success("Invite created."); setEmail(""); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to create invite")
  });

  if (!canManage) return null;

  return <SpotlightCard className="overflow-hidden" delay={0.15}>
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white light:text-slate-900">Invite a team member</h2>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">A real invite link — they create their own account and land directly in your organization with the role you choose. Email delivery uses Resend if configured; otherwise copy the link and send it yourself.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2 border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@company.com" className="w-56 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900 placeholder:text-white/30" />
        <select value={role} onChange={e => setRole(e.target.value)} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900">
          {orgRoles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
        <button onClick={() => create.mutate()} disabled={create.isPending || !email || !orgRoles.length} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:opacity-50">
          {create.isPending ? "Sending…" : "+ Send invite"}
        </button>
      </div>
      {isError ? <ErrorState message="Couldn't load invites." onRetry={refetch} /> : isLoading ? <SkeletonRows count={2} /> : (invites ?? []).length === 0 ? <p className="p-4 text-sm text-white/40 light:text-slate-400">No invites sent yet.</p> : <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                {invites.map(invite => <InviteRow key={invite.id} invite={invite} canManage={canManage} onChanged={refetch} />)}
              </tbody>
            </table>
          </div>}
    </SpotlightCard>;
}

function TrainingManagementPanel({ members, canManage }) {
  const toast = useToast();
  const { data: courses } = useQuery({ queryKey: ["cybersachet-courses"], queryFn: fetchCybersachetCourses });
  const { data: assignments, isLoading, isError, refetch } = useQuery({ queryKey: ["org-cybersachet-assignments"], queryFn: fetchOrgCybersachetAssignments });
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const selectClass = "rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900";

  const assign = useMutation({
    mutationFn: () => assignCybersachetCourseToMember(userId, courseId, dueDate ? new Date(dueDate).toISOString() : null),
    onSuccess: () => { toast.success("Course assigned."); setUserId(""); setCourseId(""); setDueDate(""); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to assign course")
  });
  const unassign = useMutation({
    mutationFn: ({ uid, cid }) => unassignCybersachetCourseFromMember(uid, cid),
    onSuccess: () => refetch(),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to unassign course")
  });
  const reset = useMutation({
    mutationFn: ({ uid, cid }) => resetCybersachetProgress(uid, cid),
    onSuccess: () => { toast.success("Progress reset."); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to reset progress")
  });

  const now = Date.now();
  const total = assignments?.length ?? 0;
  const completed = (assignments ?? []).filter(a => a.completedAt);
  const overdue = (assignments ?? []).filter(a => !a.completedAt && a.dueAt && new Date(a.dueAt).getTime() < now);
  const completionPct = total > 0 ? Math.round(completed.length / total * 100) : 0;
  const avgScore = completed.length > 0 ? Math.round(completed.reduce((sum, a) => sum + (a.quizScore ?? 0), 0) / completed.length) : null;

  return <SpotlightCard className="overflow-hidden" delay={0.12}>
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white light:text-slate-900">CyberSachet Training</h2>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">Members only see courses assigned here — there's no self-enroll. Assign a course to require it, then track completion below.</p>
      </div>
      <div className="p-4 space-y-4">
        {total > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wide text-white/40 light:text-slate-400">Completion</p>
              <p className="mt-1 text-lg font-medium text-white light:text-slate-900"><AnimatedCounter value={completionPct} />%</p>
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

        {canManage && <div className="flex flex-wrap items-center gap-2">
            <select value={userId} onChange={e => setUserId(e.target.value)} className={selectClass}>
              <option value="">Choose member…</option>
              {members.map(m => <option key={m.userId} value={m.userId}>{m.email}</option>)}
            </select>
            <select value={courseId} onChange={e => setCourseId(e.target.value)} className={selectClass}>
              <option value="">Choose course…</option>
              {(courses ?? []).map(c => <option key={c.id} value={c.id}>{c.title}{c.freeTier ? " (free)" : ""}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} title="Due date (optional)" className={selectClass} />
            <button onClick={() => assign.mutate()} disabled={!userId || !courseId || assign.isPending} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {assign.isPending ? "Assigning…" : "Assign"}
            </button>
          </div>}

        {isError ? <ErrorState message="Couldn't load training assignments — CyberSachet may not be licensed for your organization yet." onRetry={refetch} /> : isLoading ? <SkeletonRows count={2} /> : !assignments || assignments.length === 0 ? <p className="text-sm text-white/40 light:text-slate-400">No courses assigned yet.</p> : <div className="overflow-hidden rounded-xl border border-white/10 light:border-slate-900/10">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                {assignments.map(a => {
              const isOverdue = !a.completedAt && a.dueAt && new Date(a.dueAt).getTime() < now;
              return <tr key={`${a.userId}-${a.courseId}`}>
                    <td className="px-3 py-2.5 text-white light:text-slate-900">{a.userEmail}</td>
                    <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{a.courseTitle}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.completedAt ? "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700" : isOverdue ? "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700" : "bg-white/10 text-white/50 light:text-slate-500"}`}>
                        {a.completedAt ? `Completed · ${a.quizScore}%` : isOverdue ? "Overdue" : "Not completed"}
                      </span>
                    </td>
                    {canManage && <td className="px-3 py-2.5 text-right space-x-3">
                        {a.completedAt && <button onClick={() => reset.mutate({ uid: a.userId, cid: a.courseId })} className="text-xs text-amber-300 light:text-amber-600 hover:underline">Reset</button>}
                        <button onClick={() => unassign.mutate({ uid: a.userId, cid: a.courseId })} className="text-xs text-red-300 light:text-red-600 hover:underline">Unassign</button>
                      </td>}
                  </tr>;
            })}
              </tbody>
            </table>
          </div>}
      </div>
      <DepartmentComplianceCard />
    </SpotlightCard>;
}

function MemberRoleControl({ member, isSelf, canManage, orgRoles, roleLabel, mutation }) {
  const [pendingRole, setPendingRole] = useState(member.role);
  if (isSelf || !canManage) {
    return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70 light:text-slate-600">{roleLabel[member.role] ?? member.role}</span>;
  }
  return <div className="flex items-center gap-1.5">
      <select value={pendingRole} onChange={e => setPendingRole(e.target.value)} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-xs text-white light:text-slate-900">
        {orgRoles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
      </select>
      {pendingRole !== member.role && <button onClick={() => mutation.mutate({ userId: member.userId, role: pendingRole })} disabled={mutation.isPending} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/60 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900 disabled:opacity-50">
          Save
        </button>}
    </div>;
}

function DepartmentControl({ member, canManage, departments, mutation }) {
  const [pending, setPending] = useState(member.departmentId ?? "");
  if (!canManage) {
    return <span className="text-xs text-white/50 light:text-slate-500">{member.departmentName ?? "—"}</span>;
  }
  return <div className="flex items-center gap-1.5">
      <select value={pending} onChange={e => setPending(e.target.value)} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-xs text-white light:text-slate-900">
        <option value="">No department</option>
        {departments.filter(d => !d.archived).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      {pending !== (member.departmentId ?? "") && <button onClick={() => mutation.mutate({ userId: member.userId, departmentId: pending || null })} disabled={mutation.isPending} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/60 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900 disabled:opacity-50">
          Save
        </button>}
    </div>;
}
export default function Team() {
  const {
    user,
    organization
  } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers
  } = useQuery({
    queryKey: ["organization-members"],
    queryFn: fetchOrganizationMembers
  });
  // Both fall back gracefully: fetchOrgRoles() only ever reads system roles
  // (organization_id is null), and fetchMyPermissions() catches a missing
  // my_permissions() RPC on an un-migrated database — so on an older DB
  // `canManage` stays false and everyone just sees their role as a badge,
  // same as before this feature existed.
  const { data: orgRolesRaw } = useQuery({
    queryKey: ["org-roles"],
    queryFn: fetchOrgRoles,
    retry: false
  });
  const orgRoles = orgRolesRaw ?? [];
  const roleLabel = Object.fromEntries(orgRoles.map(r => [r.key, r.name]));
  const { data: can } = useQuery({
    queryKey: ["my-permissions", organization?.id],
    queryFn: () => fetchMyPermissions(organization?.id),
    enabled: !!organization?.id,
    retry: false
  });
  const canManageTeam = !!can && can("organization", "team", "manage");
  const canViewTraining = !!can && (can("organization", "training", "view") || can("organization", "training", "manage"));
  const canManageTraining = !!can && can("organization", "training", "manage");
  // Same graceful-degradation pattern as canManageTeam: fetchCybersachetLicense()
  // catches a missing my_cybersachet_license() RPC on an un-migrated database
  // and this just stays false, hiding the panel rather than erroring.
  const { data: cybersachetLicensed } = useQuery({ queryKey: ["cybersachet-license"], queryFn: fetchCybersachetLicense, retry: false });
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateMemberRole(userId, role),
    onSuccess: () => {
      toast.success("Role updated.");
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update role")
  });
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments, retry: false });
  const departmentMutation = useMutation({
    mutationFn: ({ userId, departmentId }) => assignMemberDepartment(userId, departmentId),
    onSuccess: () => {
      toast.success("Department updated.");
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-training-report"] });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update department")
  });
  const {
    data: usage,
    isError: usageError,
    refetch: refetchUsage
  } = useQuery({
    queryKey: ["plan-usage"],
    queryFn: fetchPlanUsage
  });
  const [searchParams] = useSearchParams();
  const upgraded = searchParams.get("upgraded");
  const currentPlan = usage?.plan ?? "STARTER";
  return <div className="space-y-8">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Team & Plan</h1>
        <p className="text-sm text-white/50 light:text-slate-500">{organization?.name}</p>
      </Reveal>

      <Reveal delay={0.02}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40 light:text-slate-400">Plan &amp; Billing</h2>
      </Reveal>

      {/* Current usage */}
      {usageError ? <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white">
          <ErrorState message="Couldn't load your plan usage." onRetry={() => refetchUsage()} />
        </div> : usage ? <SpotlightCard className="p-5" delay={0.05}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white light:text-slate-900">Current Usage</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 light:text-slate-600">
              {currentPlan} plan
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <UsageBar label="Team Members" current={usage.currentMembers} max={usage.maxMembers} />
            <UsageBar label="Monitors" current={usage.currentMonitors} max={usage.maxMonitors} />
            <UsageBar label="Alert Channels" current={usage.currentAlertChannels} max={usage.maxAlertChannels} />
            <div>
              <p className="text-xs text-white/50 light:text-slate-500">History Retention</p>
              <p className="mt-1 text-sm font-medium text-white light:text-slate-900">{usage.historyDays} days</p>
            </div>
            <div>
              <p className="text-xs text-white/50 light:text-slate-500">Plan</p>
              <p className="mt-1 text-sm font-medium text-white light:text-slate-900">{currentPlan}</p>
            </div>
          </div>
        </SpotlightCard> : null}

      {/* Plan comparison */}
      <div>
        {upgraded && <motion.div initial={{
        opacity: 0,
        y: 8
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Thanks! Your upgrade to {upgraded} is confirmed and active.
          </motion.div>}
        <h2 className="mb-4 text-sm font-medium text-white light:text-slate-900">Available Plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => {
          const isCurrent = plan.name === currentPlan;
          return <motion.div key={plan.name} initial={{
            opacity: 0,
            y: 16
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.5,
            delay: i * 0.06,
            ease: EASE
          }} className={`rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${plan.color} ${isCurrent ? "bg-white/[0.04] light:bg-slate-900/[0.03]" : "bg-neutral-900/40 light:bg-white hover:border-white/30 light:hover:border-slate-900/30"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white light:text-slate-900">{plan.label}</p>
                    <p className="mt-0.5 text-lg font-semibold text-white light:text-slate-900">{plan.price}</p>
                  </div>
                  {isCurrent && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      Current
                    </span>}
                </div>
                <ul className="mt-4 space-y-1.5">
                  {plan.features.map(f => <li key={f} className="flex items-center gap-1.5 text-xs text-white/60 light:text-slate-500">
                      <span className="text-emerald-400">✓</span> {f}
                    </li>)}
                </ul>
                {!isCurrent && <UpgradeButton plan={plan.name} />}
              </motion.div>;
        })}
        </div>
        <p className="mt-3 text-xs text-white/35 light:text-slate-400">
          Professional and Business upgrade instantly by card. Enterprise is custom — email sales@itops-monitor.local or contact your account manager.
        </p>
      </div>

      <Reveal delay={0.08}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40 light:text-slate-400">Identity &amp; Access</h2>
        <p className="mt-0.5 text-xs text-white/35 light:text-slate-400">Who's in your organization, what they can do, how they're grouped, and who you've invited.</p>
      </Reveal>

      {/* Members */}
      <SpotlightCard className="overflow-hidden" delay={0.1}>
        <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white light:text-slate-900">Team Members</h2>
        </div>
        {membersError ? <ErrorState message="Couldn't load team members." onRetry={() => refetchMembers()} /> : membersLoading ? <SkeletonRows count={2} /> : !members || members.length === 0 ? <EmptyState title="No members found." /> : <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {members.map((member, i) => <motion.tr key={member.userId} initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            duration: 0.3,
            delay: i * 0.05,
            ease: EASE
          }}>
                  <td className="px-4 py-3 font-medium text-white light:text-slate-900">{member.email}</td>
                  <td className="px-4 py-3">
                    <MemberRoleControl member={member} isSelf={member.userId === user?.id} canManage={canManageTeam} orgRoles={orgRoles} roleLabel={roleLabel} mutation={roleMutation} />
                  </td>
                  <td className="px-4 py-3">
                    <DepartmentControl member={member} canManage={canManageTeam} departments={departments ?? []} mutation={departmentMutation} />
                  </td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{new Date(member.joinedAt).toLocaleDateString()}</td>
                </motion.tr>)}
            </tbody>
          </table>}
      </SpotlightCard>

      {canManageTeam && <InvitesPanel orgRoles={orgRoles} canManage={canManageTeam} />}

      {members && <DepartmentsPanel members={members} canManage={canManageTeam} />}

      {cybersachetLicensed && canViewTraining && members && <TrainingManagementPanel members={members} canManage={canManageTraining} />}

      <StatusPageCard />
    </div>;
}