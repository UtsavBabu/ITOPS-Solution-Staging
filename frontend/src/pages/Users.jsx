import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { assignCybersachetCourseToMember, archiveDepartment, archiveTeam, assignDepartmentManager, assignMemberDepartment, assignMemberTeam, assignTeamLead, bulkAssignCybersachetCourse, createDepartment, createOrgInvite, createTeam, deleteDepartment, deleteTeam, fetchAcademyLicense, fetchCybersachetCourses, fetchCybersachetLicense, fetchDepartments, fetchDepartmentTrainingReport, fetchMyPermissions, fetchOrgCybersachetAssignments, fetchOrganizationCertificates, fetchOrgInvites, fetchOrgRoles, fetchOrganizationMembers, fetchTeamTrainingReport, fetchTeams, removeOrganizationMember, renameDepartment, renameTeam, resetCybersachetProgress, restoreCertificate, restoreDepartment, restoreTeam, revokeCertificate, revokeOrgInvite, sendOrgInviteEmail, unassignCybersachetCourseFromMember, updateMemberRole } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { Reveal, SpotlightCard } from "../components/Animated";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
const EASE = [0.16, 1, 0.3, 1];
const INLINE_INPUT_CLASS = "w-36 rounded-lg border border-cyan-400/40 bg-black/40 light:bg-white px-2 py-1 text-xs text-white light:text-slate-900 focus:outline-none";
const INLINE_SELECT_CLASS = "rounded-lg border border-cyan-400/40 bg-black/40 light:bg-white px-2 py-1 text-xs text-white light:text-slate-900 focus:outline-none";

// Read-mode by default (plain text + a pencil that appears on hover),
// switching to an input only when clicked — matches the click-to-edit
// pattern AdminUsers.jsx's name field and AdminCustomers.jsx's rename
// already use elsewhere in this app, instead of every row permanently
// showing a live input the moment you have edit rights.
function EditableText({ value, onSave, disabled, pending, className = "", inputClassName = INLINE_INPUT_CLASS }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  if (disabled) return <span className={className}>{value}</span>;
  if (!editing) {
    return <button type="button" onClick={() => setEditing(true)} className={`group inline-flex items-center gap-1.5 text-left ${className}`}>
        <span>{value}</span>
        <span className="text-white/25 light:text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>✎</span>
      </button>;
  }
  return <form onSubmit={e => { e.preventDefault(); onSave(draft); setEditing(false); }} className="flex items-center gap-1.5">
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} className={inputClassName} />
      <button type="submit" disabled={pending} className="text-[11px] text-emerald-300 light:text-emerald-600 hover:underline disabled:opacity-50">Save</button>
      <button type="button" onClick={() => setEditing(false)} className="text-[11px] text-white/40 light:text-slate-400 hover:text-white/70 light:hover:text-slate-600">Cancel</button>
    </form>;
}

// Same read-mode-by-default pattern for assignment dropdowns (manager, lead,
// role, department, team). `groups` (label + options) renders as <optgroup>
// for the Team picker; flat `options` covers everything else.
function EditableSelect({ value, options, groups, emptyLabel = "—", onSave, disabled, pending, className = "", selectClassName = INLINE_SELECT_CLASS, currentLabelOverride }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);
  const flatOptions = groups ? groups.flatMap(g => g.options) : options;
  // `options`/`groups` only ever list the currently-active choices (an
  // archived department shouldn't be pickable), but the value assigned to
  // this row might point at one anyway — currentLabelOverride lets the
  // caller supply the real name in that case instead of falling back to
  // emptyLabel just because it's missing from the active list.
  const currentLabel = currentLabelOverride ?? flatOptions.find(o => o.value === (value ?? ""))?.label ?? emptyLabel;
  if (disabled) return <span className={className}>{currentLabel}</span>;
  if (!editing) {
    return <button type="button" onClick={() => setEditing(true)} className={`group inline-flex items-center gap-1.5 text-left ${className}`}>
        <span>{currentLabel}</span>
        <span className="text-white/25 light:text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>✎</span>
      </button>;
  }
  return <div className="flex items-center gap-1.5">
      <select autoFocus value={draft} onChange={e => setDraft(e.target.value)} className={selectClassName}>
        <option value="">{emptyLabel}</option>
        {groups
        ? groups.map(g => <optgroup key={g.label} label={g.label}>{g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>)
        : options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button type="button" onClick={() => { onSave(draft || null); setEditing(false); }} disabled={pending} className="text-[11px] text-emerald-300 light:text-emerald-600 hover:underline disabled:opacity-50">Save</button>
      <button type="button" onClick={() => setEditing(false)} className="text-[11px] text-white/40 light:text-slate-400 hover:text-white/70 light:hover:text-slate-600">Cancel</button>
    </div>;
}

function DepartmentRow({ dept, members, canManage, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const rename = useMutation({
    mutationFn: name => renameDepartment(dept.id, name),
    onSuccess: () => { toast.success("Department renamed."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to rename department")
  });
  const setManager = useMutation({
    mutationFn: userId => assignDepartmentManager(dept.id, userId),
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
  const managerOptions = members.map(m => ({ value: m.userId, label: m.email }));

  return <tr>
      <td className="px-3 py-2.5 text-white light:text-slate-900">
        <div className="flex items-center gap-1.5">
          <EditableText value={dept.name} onSave={rename.mutate} disabled={!canManage} pending={rename.isPending} />
          {dept.archived && <span className="text-[10px] text-white/35 light:text-slate-400">Archived</span>}
        </div>
      </td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">
        <EditableSelect value={dept.managerUserId} options={managerOptions} emptyLabel="No manager" onSave={setManager.mutate} disabled={!canManage} pending={setManager.isPending} />
      </td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{dept.memberCount}</td>
      {canManage && <td className="px-3 py-2.5 text-right space-x-3">
        {dept.archived ? <button onClick={() => restore.mutate()} className="text-xs text-emerald-300 light:text-emerald-600 hover:underline">Restore</button>
          : <button onClick={() => archive.mutate()} className="text-xs text-amber-300 light:text-amber-600 hover:underline">Archive</button>}
        <button onClick={async () => { if (await confirm({ title: "Delete department?", description: "Members keep their accounts — they just become unassigned." })) remove.mutate(); }} className="text-xs text-red-300 light:text-red-600 hover:underline">Delete</button>
      </td>}
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

function TeamRow({ team, members, canManage, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const deptMembers = members.filter(m => m.departmentId === team.departmentId);
  const rename = useMutation({
    mutationFn: name => renameTeam(team.id, name),
    onSuccess: () => { toast.success("Team renamed."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to rename team")
  });
  const setLead = useMutation({
    mutationFn: userId => assignTeamLead(team.id, userId),
    onSuccess: () => { toast.success("Team lead updated."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to assign team lead")
  });
  const archive = useMutation({
    mutationFn: () => archiveTeam(team.id),
    onSuccess: () => { toast.success("Team archived."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to archive team")
  });
  const restore = useMutation({
    mutationFn: () => restoreTeam(team.id),
    onSuccess: () => { toast.success("Team restored."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to restore team")
  });
  const remove = useMutation({
    mutationFn: () => deleteTeam(team.id),
    onSuccess: () => { toast.success("Team deleted."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete team")
  });
  const leadOptions = deptMembers.map(m => ({ value: m.userId, label: m.email }));

  return <tr>
      <td className="px-3 py-2.5 text-white light:text-slate-900">
        <div className="flex items-center gap-1.5">
          <EditableText value={team.name} onSave={rename.mutate} disabled={!canManage} pending={rename.isPending} inputClassName="w-32 rounded-lg border border-cyan-400/40 bg-black/40 light:bg-white px-2 py-1 text-xs text-white light:text-slate-900 focus:outline-none" />
          {team.archived && <span className="text-[10px] text-white/35 light:text-slate-400">Archived</span>}
        </div>
      </td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{team.departmentName}</td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">
        <EditableSelect value={team.leadUserId} options={leadOptions} emptyLabel="No lead" onSave={setLead.mutate} disabled={!canManage} pending={setLead.isPending} />
      </td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{team.memberCount}</td>
      {canManage && <td className="px-3 py-2.5 text-right space-x-3">
        {team.archived ? <button onClick={() => restore.mutate()} className="text-xs text-emerald-300 light:text-emerald-600 hover:underline">Restore</button>
          : <button onClick={() => archive.mutate()} className="text-xs text-amber-300 light:text-amber-600 hover:underline">Archive</button>}
        <button onClick={async () => { if (await confirm({ title: "Delete team?", description: "Members keep their accounts and department — they just become unassigned from this team." })) remove.mutate(); }} className="text-xs text-red-300 light:text-red-600 hover:underline">Delete</button>
      </td>}
    </tr>;
}

function TeamsPanel({ members, departments, canManage }) {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [newDeptId, setNewDeptId] = useState("");
  const { data: teams, isLoading, isError, refetch } = useQuery({ queryKey: ["teams"], queryFn: () => fetchTeams() });
  const activeDepartments = (departments ?? []).filter(d => !d.archived);
  const create = useMutation({
    mutationFn: () => createTeam(newDeptId, newName),
    onSuccess: () => { toast.success("Team created."); setNewName(""); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to create team")
  });
  if (activeDepartments.length === 0) return null;
  const active = (teams ?? []).filter(t => !t.archived);
  const archived = (teams ?? []).filter(t => t.archived);

  return <SpotlightCard className="overflow-hidden" delay={0.13}>
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white light:text-slate-900">Teams</h2>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">Sub-groups within a department — Engineering → Backend, Frontend, DevOps. A team has its own lead, separate from the department manager.</p>
      </div>
      <div className="p-4 space-y-3">
        {canManage && <div className="flex flex-wrap items-center gap-2">
            <select value={newDeptId} onChange={e => setNewDeptId(e.target.value)} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900">
              <option value="">Choose department…</option>
              {activeDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New team name" className="w-48 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900 placeholder:text-white/30" />
            <button onClick={() => create.mutate()} disabled={!newName.trim() || !newDeptId || create.isPending} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {create.isPending ? "Creating…" : "+ Add team"}
            </button>
          </div>}
        {isError ? <ErrorState message="Couldn't load teams." onRetry={refetch} /> : isLoading ? <SkeletonRows count={2} /> : (teams ?? []).length === 0 ? <p className="text-sm text-white/40 light:text-slate-400">No teams yet — create one within a department above.</p> : <div className="overflow-hidden rounded-xl border border-white/10 light:border-slate-900/10">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 light:border-slate-900/10 text-[11px] uppercase text-white/40 light:text-slate-400">
                <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Department</th><th className="px-3 py-2">Lead</th><th className="px-3 py-2">Members</th>{canManage && <th />}</tr>
              </thead>
              <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                {[...active, ...archived].map(t => <TeamRow key={t.id} team={t} members={members} canManage={canManage} onSaved={refetch} />)}
              </tbody>
            </table>
          </div>}
      </div>
    </SpotlightCard>;
}

function TeamComplianceCard() {
  const { data: report, isLoading, isError, refetch } = useQuery({ queryKey: ["team-training-report"], queryFn: fetchTeamTrainingReport });
  if (isLoading) return <SkeletonRows count={2} />;
  if (isError) return <ErrorState message="Couldn't load team training report." onRetry={refetch} />;
  const rows = (report ?? []).filter(r => r.assignedCount > 0 || r.memberCount > 0);
  if (rows.length === 0) return null;
  return <div className="border-t border-white/10 light:border-slate-900/10 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Team compliance</p>
      <div className="space-y-2">
        {rows.map(r => <div key={r.teamId} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-xs text-white/70 light:text-slate-600">{r.departmentName} / {r.teamName}</span>
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

// email,role — role matches either a role key (e.g. "it_manager") or its
// display name (e.g. "IT Manager"), case-insensitive. A header row is
// detected and skipped automatically if its first cell isn't an email.
// Third column is optional and purely a convenience: an unmatched or blank
// department name never blocks the invite (an admin can always assign a
// department to a real member later on the Departments panel below) — it
// just means that one row's "assign initial training group" step didn't
// happen automatically.
function parseInviteCsv(text, orgRoles, departments) {
  const roleByKey = new Map(orgRoles.map(r => [r.key.toLowerCase(), r]));
  const roleByName = new Map(orgRoles.map(r => [r.name.toLowerCase(), r]));
  const deptByName = new Map((departments ?? []).filter(d => !d.archived).map(d => [d.name.toLowerCase(), d]));
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length && !/^[^@\s]+@[^@\s]+\.[^@\s]+,/.test(lines[0] + ",")) {
    const firstCell = lines[0].split(",")[0]?.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(firstCell)) lines.shift();
  }
  return lines.map(line => {
    const [emailRaw, roleRaw, deptRaw] = line.split(",").map(s => (s ?? "").trim().replace(/^"|"$/g, ""));
    const email = (emailRaw ?? "").toLowerCase();
    const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    const matchedRole = roleRaw ? roleByKey.get(roleRaw.toLowerCase()) ?? roleByName.get(roleRaw.toLowerCase()) : null;
    const matchedDept = deptRaw ? deptByName.get(deptRaw.toLowerCase()) ?? null : null;
    let reason = null;
    if (!emailValid) reason = "Invalid email";
    else if (!matchedRole) reason = roleRaw ? `Unknown role "${roleRaw}"` : "Missing role";
    return { email, roleRaw: roleRaw ?? "", role: matchedRole, deptRaw: deptRaw ?? "", department: matchedDept, valid: emailValid && !!matchedRole, reason };
  });
}

function BulkInvitePanel({ orgRoles, onDone }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    const reader = new FileReader();
    reader.onload = () => setRows(parseInviteCsv(String(reader.result ?? ""), orgRoles, departments));
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const sampleRole = orgRoles[0]?.key ?? "helpdesk";
    const sampleDept = departments?.[0]?.name ?? "Engineering";
    const csv = `email,role,department\njane@yourcompany.com,${sampleRole},${sampleDept}\njohn@yourcompany.com,${sampleRole},\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invite-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const validRows = rows.filter(r => r.valid);

  async function handleSend() {
    setSending(true);
    const outcomes = [];
    for (const row of validRows) {
      try {
        await createOrgInvite(row.email, row.role.key, row.department?.id);
        outcomes.push({ email: row.email, ok: true });
      } catch (err) {
        outcomes.push({ email: row.email, ok: false, error: err instanceof Error ? err.message : "Failed" });
      }
    }
    setSending(false);
    setResults(outcomes);
    const succeeded = outcomes.filter(o => o.ok).length;
    if (succeeded > 0) toast.success(`${succeeded} of ${outcomes.length} invited.`);
    if (succeeded < outcomes.length) toast.error(`${outcomes.length - succeeded} invite(s) failed — see the list below.`);
    onDone();
  }

  return <div className="space-y-3 border-b border-white/10 light:border-slate-900/10 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-full border border-white/15 light:border-slate-900/15 px-3 py-1.5 text-xs text-white/70 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-900/5">
          {fileName ?? "Choose CSV…"}
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </label>
        <button type="button" onClick={downloadTemplate} className="text-xs text-cyan-300 light:text-cyan-600 hover:underline">Download template</button>
        <span className="text-xs text-white/35 light:text-slate-400">Columns: email, role (key or name), department (optional — must match an existing department name)</span>
      </div>

      {rows.length > 0 && <>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 light:border-slate-900/10">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-white/10 light:border-slate-900/10 bg-neutral-900 light:bg-white uppercase text-white/40 light:text-slate-400">
                <tr><th className="px-3 py-1.5">Email</th><th className="px-3 py-1.5">Role</th><th className="px-3 py-1.5">Department</th><th className="px-3 py-1.5">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                {rows.map((r, i) => <tr key={i}>
                    <td className="px-3 py-1.5 text-white light:text-slate-900">{r.email || "—"}</td>
                    <td className="px-3 py-1.5 text-white/60 light:text-slate-600">{r.role?.name ?? r.roleRaw ?? "—"}</td>
                    <td className="px-3 py-1.5 text-white/60 light:text-slate-600">
                      {r.department ? r.department.name : r.deptRaw ? <span className="text-amber-300" title="No department matches this name — the invite still sends, just without a department.">{r.deptRaw} (no match)</span> : "—"}
                    </td>
                    <td className={`px-3 py-1.5 ${r.valid ? "text-emerald-300 light:text-emerald-600" : "text-red-300 light:text-red-600"}`}>{r.valid ? "Ready" : r.reason}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSend} disabled={sending || validRows.length === 0} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:opacity-50">
              {sending ? "Sending…" : `Send ${validRows.length} invite${validRows.length === 1 ? "" : "s"}`}
            </button>
            {rows.length > validRows.length && <span className="text-xs text-amber-300">{rows.length - validRows.length} row(s) need fixing before they can be sent.</span>}
          </div>
        </>}

      {results && <div className="rounded-xl border border-white/10 light:border-slate-900/10 p-3 text-xs">
          {results.map(r => <p key={r.email} className={r.ok ? "text-emerald-300 light:text-emerald-600" : "text-red-300 light:text-red-600"}>{r.email} — {r.ok ? "invited" : r.error}</p>)}
        </div>}
    </div>;
}

function InvitesPanel({ orgRoles, canManage }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const { data: invites, isLoading, isError, refetch } = useQuery({ queryKey: ["org-invites"], queryFn: fetchOrgInvites, enabled: canManage });
  const create = useMutation({
    mutationFn: () => createOrgInvite(email, role || orgRoles[0]?.key),
    onSuccess: () => { toast.success("Invite created."); setEmail(""); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to create invite")
  });
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  function handleSingleInvite() {
    if (!emailValid) {
      toast.error("Enter a valid email address.");
      return;
    }
    create.mutate();
  }

  if (!canManage) return null;

  return <SpotlightCard className="overflow-hidden" delay={0.06}>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-white light:text-slate-900">Invite a team member</h2>
          <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">A real invite link — they create their own account and land directly in your organization with the role you choose. Email delivery uses Resend if configured; otherwise copy the link and send it yourself.</p>
        </div>
        <button type="button" onClick={() => setBulkOpen(v => !v)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${bulkOpen ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300" : "border-white/15 light:border-slate-900/15 text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
          {bulkOpen ? "Single invite" : "Bulk import (CSV)"}
        </button>
      </div>
      {bulkOpen ? <BulkInvitePanel orgRoles={orgRoles} onDone={refetch} /> : <div className="flex flex-wrap items-end gap-2 border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@company.com" className="w-56 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900 placeholder:text-white/30" />
        <select value={role} onChange={e => setRole(e.target.value)} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-2 py-1.5 text-xs text-white light:text-slate-900">
          {orgRoles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
        <button onClick={handleSingleInvite} disabled={create.isPending || !email || !emailValid || !orgRoles.length} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:opacity-50">
          {create.isPending ? "Sending…" : "+ Send invite"}
        </button>
      </div>}
      {!bulkOpen && email && !emailValid && <p className="px-4 pb-2 text-xs text-red-300">Enter a valid email address.</p>}
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

// Assigns a course to every member of a real Department or Team at once,
// instead of one person at a time — reuses the org's actual Department/Team
// structure (see DepartmentComplianceCard/TeamComplianceCard below) rather
// than a separate invented "group" concept.
function BulkAssignRow({ courses, selectClass, onAssigned }) {
  const toast = useToast();
  const [targetType, setTargetType] = useState("department");
  const [targetId, setTargetId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const { data: teams } = useQuery({ queryKey: ["teams", null], queryFn: () => fetchTeams(), enabled: targetType === "team" });
  const options = targetType === "department" ? (departments ?? []).filter(d => !d.archived) : (teams ?? []).filter(t => !t.archived);
  const bulkAssign = useMutation({
    mutationFn: () => bulkAssignCybersachetCourse({
      courseId,
      departmentId: targetType === "department" ? targetId : undefined,
      teamId: targetType === "team" ? targetId : undefined,
      dueAt: dueDate ? new Date(dueDate).toISOString() : null
    }),
    onSuccess: count => { toast.success(`Assigned to ${count} member${count === 1 ? "" : "s"}.`); setTargetId(""); setCourseId(""); setDueDate(""); onAssigned(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to bulk-assign course")
  });
  return <div className="flex flex-wrap items-center gap-2 border-t border-white/10 light:border-slate-900/10 pt-3">
      <span className="text-xs text-white/40 light:text-slate-400">Bulk assign to</span>
      <select value={targetType} onChange={e => { setTargetType(e.target.value); setTargetId(""); }} className={selectClass}>
        <option value="department">Department</option>
        <option value="team">Team</option>
      </select>
      <select value={targetId} onChange={e => setTargetId(e.target.value)} className={selectClass}>
        <option value="">{targetType === "department" ? "Choose department…" : "Choose team…"}</option>
        {options.map(o => <option key={o.id} value={o.id}>{targetType === "team" ? `${o.departmentName} / ${o.name}` : o.name} ({o.memberCount})</option>)}
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
      <button onClick={() => bulkAssign.mutate()} disabled={!targetId || !courseId || bulkAssign.isPending} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-400/20 disabled:opacity-50">
        {bulkAssign.isPending ? "Assigning…" : "Assign to group"}
      </button>
    </div>;
}

function TrainingManagementPanel({ members, canManage }) {
  const toast = useToast();
  const confirm = useConfirm();
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

  async function handleReset(a) {
    const ok = await confirm({
      title: `Reset ${a.userEmail}'s progress on "${a.courseTitle}"?`,
      description: "Their completion and quiz score for this course are wiped — they'll need to retake it. This cannot be undone.",
      confirmLabel: "Reset progress",
      danger: true
    });
    if (ok) reset.mutate({ uid: a.userId, cid: a.courseId });
  }

  async function handleUnassign(a) {
    const ok = await confirm({
      title: `Unassign "${a.courseTitle}" from ${a.userEmail}?`,
      description: a.completedAt ? "Their completion record for this course is removed." : "This removes it from their required training.",
      confirmLabel: "Unassign",
      danger: true
    });
    if (ok) unassign.mutate({ uid: a.userId, cid: a.courseId });
  }

  const now = Date.now();
  const total = assignments?.length ?? 0;
  const completed = (assignments ?? []).filter(a => a.completedAt);
  const overdue = (assignments ?? []).filter(a => !a.completedAt && a.dueAt && new Date(a.dueAt).getTime() < now);
  const completionPct = total > 0 ? Math.round(completed.length / total * 100) : 0;
  const avgScore = completed.length > 0 ? Math.round(completed.reduce((sum, a) => sum + (a.quizScore ?? 0), 0) / completed.length) : null;

  return <SpotlightCard className="overflow-hidden" delay={0.16}>
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white light:text-slate-900">Training</h2>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">CyberSachet (security) and Moonsav ITOps Academy courses, in one place. Members only see courses assigned here — there's no self-enroll.</p>
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
              <optgroup label="CyberSachet">
                {(courses ?? []).filter(c => (c.track ?? "security") === "security").map(c => <option key={c.id} value={c.id}>{c.title}{c.freeTier ? " (free)" : ""}</option>)}
              </optgroup>
              <optgroup label="Moonsav ITOps Academy">
                {(courses ?? []).filter(c => c.track === "academy").map(c => <option key={c.id} value={c.id}>{c.title}{c.freeTier ? " (free)" : ""}</option>)}
              </optgroup>
            </select>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} title="Due date (optional)" className={selectClass} />
            <button onClick={() => assign.mutate()} disabled={!userId || !courseId || assign.isPending} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {assign.isPending ? "Assigning…" : "Assign"}
            </button>
          </div>}

        {canManage && <BulkAssignRow courses={courses} selectClass={selectClass} onAssigned={refetch} />}

        {isError ? <ErrorState message="Couldn't load training assignments — CyberSachet may not be licensed for your organization yet." onRetry={refetch} /> : isLoading ? <SkeletonRows count={2} /> : !assignments || assignments.length === 0 ? <p className="text-sm text-white/40 light:text-slate-400">No courses assigned yet.</p> : <div className="overflow-hidden rounded-xl border border-white/10 light:border-slate-900/10">
            <table className="w-full text-left text-sm">
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
                    {canManage && <td className="px-3 py-2.5 text-right space-x-3">
                        {a.completedAt && <button onClick={() => handleReset(a)} className="text-xs text-amber-300 light:text-amber-600 hover:underline">Reset</button>}
                        <button onClick={() => handleUnassign(a)} className="text-xs text-red-300 light:text-red-600 hover:underline">Unassign</button>
                      </td>}
                  </tr>;
            })}
              </tbody>
            </table>
          </div>}
      </div>
      <DepartmentComplianceCard />
      <TeamComplianceCard />
    </SpotlightCard>;
}

function CertificateRow({ cert, canManage, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const revoke = useMutation({
    mutationFn: () => revokeCertificate(cert.certificateNo),
    onSuccess: () => { toast.success("Certificate revoked."); onChanged(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to revoke certificate")
  });
  const restore = useMutation({
    mutationFn: () => restoreCertificate(cert.certificateNo),
    onSuccess: () => { toast.success("Certificate restored."); onChanged(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to restore certificate")
  });
  const expired = new Date(cert.expiresAt).getTime() < Date.now();
  const status = cert.revokedAt ? "Revoked" : expired ? "Expired" : "Valid";
  const statusColor = cert.revokedAt ? "bg-red-400/10 text-red-300 light:bg-red-100 light:text-red-700" : expired ? "bg-white/10 text-white/50 light:bg-slate-900/[0.05] light:text-slate-400" : "bg-emerald-400/10 text-emerald-300 light:bg-emerald-100 light:text-emerald-700";
  return <tr>
      <td className="px-3 py-2.5 text-white light:text-slate-900">{cert.holderName || cert.holderEmail}</td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{cert.courseTitle ?? `${cert.levelCode} (full certification)`}</td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{cert.averageScore}%</td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{new Date(cert.issuedAt).toLocaleDateString()}</td>
      <td className="px-3 py-2.5 text-white/60 light:text-slate-600">{new Date(cert.expiresAt).toLocaleDateString()}</td>
      <td className="px-3 py-2.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>{status}</span>
      </td>
      <td className="px-3 py-2.5 text-right space-x-3 whitespace-nowrap">
        <a href={`/verify/${cert.certificateNo}`} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 light:text-cyan-600 hover:underline">Verify</a>
        {canManage && (cert.revokedAt
          ? <button onClick={() => restore.mutate()} disabled={restore.isPending} className="text-xs text-emerald-300 light:text-emerald-600 hover:underline disabled:opacity-50">Restore</button>
          : <button onClick={async () => { if (await confirm({ title: "Revoke this certificate?", description: `${cert.certificateNo} will show as revoked on the public verification page.`, confirmLabel: "Revoke", danger: true })) revoke.mutate(); }} disabled={revoke.isPending} className="text-xs text-red-300 light:text-red-600 hover:underline disabled:opacity-50">Revoke</button>)}
      </td>
    </tr>;
}

function CertificateCenterPanel({ canManage }) {
  const [search, setSearch] = useState("");
  const { data: certificates, isLoading, isError, refetch } = useQuery({ queryKey: ["organization-certificates"], queryFn: fetchOrganizationCertificates });
  const filtered = (certificates ?? []).filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.holderEmail.toLowerCase().includes(q) || (c.holderName ?? "").toLowerCase().includes(q) || (c.courseTitle ?? "").toLowerCase().includes(q) || c.certificateNo.toLowerCase().includes(q);
  });
  if (!isLoading && !isError && (certificates ?? []).length === 0) return null;

  return <SpotlightCard className="overflow-hidden" delay={0.18}>
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white light:text-slate-900">Certificate Center</h2>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">Every certificate issued to your team — real QR-verifiable credentials with a SHA-256 document hash. Anyone can check one at <span className="text-white/60 light:text-slate-600">/verify</span>.</p>
      </div>
      {(certificates ?? []).length > 5 && <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-2.5">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, course, or certificate #…" className="w-72 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-3 py-1.5 text-xs text-white light:text-slate-900 placeholder:text-white/30" />
        </div>}
      {isError ? <ErrorState message="Couldn't load certificates." onRetry={refetch} /> : isLoading ? <SkeletonRows count={2} /> : filtered.length === 0 ? <p className="p-4 text-sm text-white/40 light:text-slate-400">No certificates match your search.</p> : <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Holder</th>
                  <th className="px-3 py-2">Credential</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Issued</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                {filtered.map(cert => <CertificateRow key={cert.certificateNo} cert={cert} canManage={canManage} onChanged={refetch} />)}
              </tbody>
            </table>
          </div>}
    </SpotlightCard>;
}

function MemberRoleControl({ member, isSelf, canManage, orgRoles, roleLabel, mutation }) {
  const confirm = useConfirm();
  if (isSelf) {
    return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70 light:text-slate-600">{roleLabel[member.role] ?? member.role}</span>;
  }
  const roleOptions = orgRoles.map(r => ({ value: r.key, label: r.name }));
  async function handleSave(role) {
    const ok = await confirm({
      title: `Change ${member.email}'s role to "${roleLabel[role] ?? role}"?`,
      description: `They currently have the "${roleLabel[member.role] ?? member.role}" role — this changes what they can access immediately.`,
      confirmLabel: "Change role",
      danger: true
    });
    if (ok) mutation.mutate({ userId: member.userId, role });
  }
  return <EditableSelect value={member.role} options={roleOptions} onSave={handleSave} disabled={!canManage} pending={mutation.isPending} className="text-xs text-white/80 light:text-slate-700" />;
}

function DepartmentControl({ member, canManage, departments, mutation }) {
  const deptOptions = departments.filter(d => !d.archived).map(d => ({ value: d.id, label: d.name }));
  return <EditableSelect value={member.departmentId} options={deptOptions} emptyLabel="No department" currentLabelOverride={member.departmentId ? member.departmentName : null} onSave={departmentId => mutation.mutate({ userId: member.userId, departmentId })} disabled={!canManage} pending={mutation.isPending} className="text-xs text-white/70 light:text-slate-600" />;
}

function TeamControl({ member, canManage, teams, mutation }) {
  // Picking a team also moves the member into that team's department
  // (enforced server-side in assign_member_team) — a team member is a
  // department member by definition, so the two never drift apart.
  const groups = [...new Map(teams.filter(t => !t.archived).map(t => [t.departmentName, true])).keys()].map(deptName => ({
    label: deptName,
    options: teams.filter(t => !t.archived && t.departmentName === deptName).map(t => ({ value: t.id, label: t.name }))
  }));
  return <EditableSelect value={member.teamId} groups={groups} emptyLabel="No team" currentLabelOverride={member.teamId ? member.teamName : null} onSave={teamId => mutation.mutate({ userId: member.userId, teamId })} disabled={!canManage} pending={mutation.isPending} className="text-xs text-white/70 light:text-slate-600" />;
}

export default function Users() {
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers
  } = useQuery({
    queryKey: ["organization-members"],
    queryFn: fetchOrganizationMembers
  });
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
  // Academy and CyberSachet are independently licensable — the training
  // panel and certificate center should appear if EITHER is active (the
  // course picker inside already groups by product and only ever offers
  // what's actually licensed).
  const { data: cybersachetLicensed } = useQuery({ queryKey: ["cybersachet-license"], queryFn: fetchCybersachetLicense, retry: false });
  const { data: academyLicensed } = useQuery({ queryKey: ["academy-license"], queryFn: fetchAcademyLicense, retry: false });
  const anyTrainingLicensed = cybersachetLicensed || academyLicensed;
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateMemberRole(userId, role),
    onSuccess: () => {
      toast.success("Role updated.");
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update role")
  });
  const removeMutation = useMutation({
    mutationFn: userId => removeOrganizationMember(userId),
    onSuccess: () => {
      toast.success("Member removed.");
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to remove member")
  });
  const [memberSearch, setMemberSearch] = useState("");
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
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: () => fetchTeams(), retry: false });
  const teamMutation = useMutation({
    mutationFn: ({ userId, teamId }) => assignMemberTeam(userId, teamId),
    onSuccess: () => {
      toast.success("Team updated.");
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-training-report"] });
      queryClient.invalidateQueries({ queryKey: ["team-training-report"] });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update team")
  });

  const q = memberSearch.trim().toLowerCase();
  const filteredMembers = (members ?? []).filter(m => !q
    || m.email.toLowerCase().includes(q)
    || (roleLabel[m.role] ?? m.role ?? "").toLowerCase().includes(q)
    || (m.departmentName ?? "").toLowerCase().includes(q)
    || (m.teamName ?? "").toLowerCase().includes(q));
  const activeDepartmentCount = (departments ?? []).filter(d => !d.archived).length;
  const mfaCount = (members ?? []).filter(m => m.hasMfa).length;

  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Users</h1>
        <p className="text-sm text-white/50 light:text-slate-500">Who's in {organization?.name ?? "your organization"}, what they can do, how they're grouped, who you've invited, and what training they're assigned. Billing and plan usage moved to <a href="/team" className="underline hover:text-white/70 light:hover:text-slate-600">Team &amp; Plan</a>.</p>
      </Reveal>

      {members && members.length > 0 && <Reveal delay={0.04} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-white p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Members</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-white light:text-slate-900"><AnimatedCounter value={members.length} /></p>
          </div>
          <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-white p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Departments</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-white light:text-slate-900"><AnimatedCounter value={activeDepartmentCount} /></p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 light:border-emerald-500/25 bg-emerald-400/[0.05] light:bg-emerald-50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-300/80 light:text-emerald-700">MFA enabled</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-emerald-200 light:text-emerald-800"><AnimatedCounter value={mfaCount} />/{members.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-white p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Your role</p>
            <p className="mt-1.5 truncate text-sm font-medium text-white light:text-slate-900">{roleLabel[members.find(m => m.userId === user?.id)?.role] ?? "—"}</p>
          </div>
        </Reveal>}

      {/* Members */}
      <SpotlightCard className="overflow-hidden" delay={0.02}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 light:border-slate-900/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white light:text-slate-900">Team Members</h2>
          {members && members.length > 0 && <div className="relative">
              <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search name, role, department, team…" className="w-64 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-3 py-1.5 text-xs text-white light:text-slate-900 placeholder:text-white/30 focus:outline-none focus:border-cyan-400/40" />
            </div>}
        </div>
        {membersError ? <ErrorState message="Couldn't load team members." onRetry={() => refetchMembers()} /> : membersLoading ? <SkeletonRows count={2} /> : !members || members.length === 0 ? <EmptyState title="No members found." /> : filteredMembers.length === 0 ? <EmptyState title="No members match your search." description="Try a different name, role, department, or team." /> : <>
            {/* 6 columns is real width even scrolled within its own
                container — a card list below md reads better than
                horizontal-scrolling a table on a phone. */}
            <div className="divide-y divide-white/10 light:divide-slate-900/8 md:hidden">
              {filteredMembers.map((member, i) => {
              const isSelf = member.userId === user?.id;
              return <motion.div key={member.userId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05, ease: EASE }} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-medium text-white light:text-slate-900">{member.email}</p>
                    {member.hasMfa ? <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 light:bg-emerald-100 light:text-emerald-700">✓ MFA</span> : <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/40 light:bg-slate-900/[0.05] light:text-slate-400">No MFA</span>}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Role</p>
                      <div className="mt-1"><MemberRoleControl member={member} isSelf={isSelf} canManage={canManageTeam} orgRoles={orgRoles} roleLabel={roleLabel} mutation={roleMutation} /></div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Joined</p>
                      <p className="mt-1 text-white/50 light:text-slate-500">{new Date(member.joinedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Department</p>
                      <div className="mt-1"><DepartmentControl member={member} canManage={canManageTeam} departments={departments ?? []} mutation={departmentMutation} /></div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Team</p>
                      <div className="mt-1"><TeamControl member={member} canManage={canManageTeam} teams={teams ?? []} mutation={teamMutation} /></div>
                    </div>
                  </div>
                  {canManageTeam && !isSelf && <button onClick={async () => { if (await confirm({ title: `Remove ${member.email}?`, description: "They lose access to this organization immediately. Their training history and certificates are kept.", confirmLabel: "Remove", danger: true })) removeMutation.mutate(member.userId); }} className="mt-3 text-xs text-red-300 light:text-red-600 hover:underline">Remove from organization</button>}
                </motion.div>;
            })}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
                <tr>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Team</th>
                  <th className="px-4 py-2">MFA</th>
                  <th className="px-4 py-2">Joined</th>
                  {canManageTeam && <th />}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                {filteredMembers.map((member, i) => {
              const isSelf = member.userId === user?.id;
              return <motion.tr key={member.userId} initial={{
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
                      <MemberRoleControl member={member} isSelf={isSelf} canManage={canManageTeam} orgRoles={orgRoles} roleLabel={roleLabel} mutation={roleMutation} />
                    </td>
                    <td className="px-4 py-3">
                      <DepartmentControl member={member} canManage={canManageTeam} departments={departments ?? []} mutation={departmentMutation} />
                    </td>
                    <td className="px-4 py-3">
                      <TeamControl member={member} canManage={canManageTeam} teams={teams ?? []} mutation={teamMutation} />
                    </td>
                    <td className="px-4 py-3">
                      {member.hasMfa ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 light:bg-emerald-100 light:text-emerald-700">✓ Enabled</span> : <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/40 light:bg-slate-900/[0.05] light:text-slate-400">Off</span>}
                    </td>
                    <td className="px-4 py-3 text-white/50 light:text-slate-500">{new Date(member.joinedAt).toLocaleDateString()}</td>
                    {canManageTeam && <td className="px-4 py-3 text-right">
                        {!isSelf && <button onClick={async () => { if (await confirm({ title: `Remove ${member.email}?`, description: "They lose access to this organization immediately. Their training history and certificates are kept.", confirmLabel: "Remove", danger: true })) removeMutation.mutate(member.userId); }} className="text-xs text-red-300 light:text-red-600 hover:underline">Remove</button>}
                      </td>}
                  </motion.tr>;
            })}
              </tbody>
            </table>
            </div>
          </>}
      </SpotlightCard>

      {canManageTeam && <InvitesPanel orgRoles={orgRoles} canManage={canManageTeam} />}

      {members && <DepartmentsPanel members={members} canManage={canManageTeam} />}

      {members && <TeamsPanel members={members} departments={departments ?? []} canManage={canManageTeam} />}

      {anyTrainingLicensed && canViewTraining && members && <TrainingManagementPanel members={members} canManage={canManageTraining} />}

      {anyTrainingLicensed && canViewTraining && <CertificateCenterPanel canManage={canManageTraining} />}
    </div>;
}
