import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { adminCreateUser, adminDeleteUser, adminInviteUserToOrganization, adminResetPassword, adminUpdateMemberRole, adminUpdateUserName, fetchAdminCustomers, fetchAdminUsers, fetchRoles, setUserPlatformAdmin } from "../../api/adminEndpoints";
import { fetchOrgRoles } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { useConfirm } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
const EASE = [0.16, 1, 0.3, 1];
// Fallback for a database that hasn't run migration 0032 yet — fetchRoles()
// throws on an un-migrated DB, and this keeps role-granting working exactly
// as it did before (same five roles from migration 0030/0031).
const FALLBACK_ADMIN_ROLES = [
  { key: "super_admin", name: "Super Admin" },
  { key: "support", name: "Support" },
  { key: "billing", name: "Billing" },
  { key: "content_editor", name: "Content Editor" },
  { key: "reseller", name: "Reseller Admin" }
];
function NewOrgFields({ email, setEmail, password, setPassword, organizationName, setOrganizationName, fullName, setFullName, inputClass }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
      <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 8 chars)" className={inputClass} />
      <input value={organizationName} onChange={e => setOrganizationName(e.target.value)} placeholder="Organization name" className={inputClass} />
      <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name (optional)" className={inputClass} />
    </div>;
}

function ExistingOrgFields({ email, setEmail, organizationId, setOrganizationId, role, setRole, inputClass }) {
  const { data: customers } = useQuery({ queryKey: ["admin-customers-picker"], queryFn: fetchAdminCustomers });
  const { data: orgRoles } = useQuery({ queryKey: ["org-roles"], queryFn: fetchOrgRoles });
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
      <select required value={organizationId} onChange={e => setOrganizationId(e.target.value)} className={inputClass}>
        <option value="">Select organization…</option>
        {(customers ?? []).map(c => <option key={c.organizationId} value={c.organizationId}>{c.name}</option>)}
      </select>
      <select required value={role} onChange={e => setRole(e.target.value)} className={inputClass}>
        <option value="">Select role…</option>
        {(orgRoles ?? []).map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
      </select>
    </div>;
}

function CreateUserForm() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("new"); // "new" | "existing"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);

  function resetFields() {
    setEmail("");
    setPassword("");
    setOrganizationName("");
    setFullName("");
    setOrganizationId("");
    setRole("");
  }

  const createMutation = useMutation({
    mutationFn: () => adminCreateUser({ email, password, organizationName, fullName }),
    onSuccess: () => {
      resetFields();
      setOpen(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: err => setError(err instanceof Error ? err.message : "Failed to create user")
  });
  const inviteMutation = useMutation({
    mutationFn: () => adminInviteUserToOrganization(organizationId, email, role),
    onSuccess: result => {
      setError(null);
      setInviteLink(result.inviteLink);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: err => setError(err instanceof Error ? err.message : "Failed to create invite")
  });

  function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (mode === "new") createMutation.mutate(); else inviteMutation.mutate();
  }
  const inputClass = "w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none";
  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300">
        + Add user
      </button>;
  }
  if (inviteLink) {
    return <div className="space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
        <p className="text-sm font-medium text-white light:text-slate-900">Invite created.</p>
        <p className="text-xs text-white/50 light:text-slate-400">Send this link to {email} — they'll create their own account and land directly in the organization.</p>
        <div className="flex items-center gap-2">
          <input readOnly value={inviteLink} className={`${inputClass} font-mono text-xs`} onFocus={e => e.target.select()} />
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(inviteLink); toast.success("Link copied."); }} className="shrink-0 rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 light:text-slate-600 hover:text-white light:hover:text-slate-900">
            Copy
          </button>
        </div>
        <button type="button" onClick={() => { setInviteLink(null); resetFields(); setOpen(false); }} className="text-sm text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
          Done
        </button>
      </div>;
  }
  return <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-amber-400/20 light:border-amber-500/30 bg-neutral-900/60 light:bg-amber-50/40 p-5">
      <div className="flex items-center gap-2">
        {[["new", "New organization"], ["existing", "Add to existing organization"]].map(([key, label]) => <button key={key} type="button" onClick={() => { setMode(key); setError(null); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${mode === key ? "bg-amber-400 text-black" : "border border-white/15 text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
            {label}
          </button>)}
      </div>
      <p className="text-xs text-white/45 light:text-slate-400">
        {mode === "new" ? "Creates a confirmed account with its own organization. They can log in immediately with this password."
          : "Sends a real invite link — they create their own account and land directly in the selected organization, same as that org inviting them itself."}
      </p>
      {mode === "new"
        ? <NewOrgFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} organizationName={organizationName} setOrganizationName={setOrganizationName} fullName={fullName} setFullName={setFullName} inputClass={inputClass} />
        : <ExistingOrgFields email={email} setEmail={setEmail} organizationId={organizationId} setOrganizationId={setOrganizationId} role={role} setRole={setRole} inputClass={inputClass} />}
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={createMutation.isPending || inviteMutation.isPending} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-60">
          {mode === "new" ? (createMutation.isPending ? "Creating…" : "Create user") : (inviteMutation.isPending ? "Sending…" : "Send invite")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
          Cancel
        </button>
      </div>
    </form>;
}
function MemberOrgRoleControl({ u, canEdit, orgRoles, orgRoleLabel, roleMutation }) {
  const [pendingRole, setPendingRole] = useState(u.role ?? "");
  if (!canEdit || !u.role || orgRoles.length === 0) {
    return <span className="text-white/50 light:text-slate-500">{orgRoleLabel[u.role] ?? u.role ?? "—"}</span>;
  }
  return <div className="flex items-center gap-1.5">
      <select value={pendingRole} onChange={e => setPendingRole(e.target.value)} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-xs text-white light:text-slate-900">
        {orgRoles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
      </select>
      {pendingRole !== u.role && <button onClick={() => roleMutation.mutate({ userId: u.userId, role: pendingRole })} disabled={roleMutation.isPending} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/60 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900 disabled:opacity-50">
          Save
        </button>}
    </div>;
}
function NameCell({ u, canEdit }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(u.fullName ?? "");
  const mutation = useMutation({
    mutationFn: () => adminUpdateUserName(u.userId, value),
    onSuccess: () => {
      toast.success("Name updated.");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update name")
  });
  if (editing) {
    return <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="mt-0.5 flex items-center gap-1.5">
        <input autoFocus value={value} onChange={e => setValue(e.target.value)} placeholder="Full name" className="w-32 rounded-md border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-1.5 py-0.5 text-xs text-white light:text-slate-900 focus:border-amber-400/40 focus:outline-none" />
        <button type="submit" disabled={mutation.isPending} className="text-[11px] text-emerald-300 light:text-emerald-600 hover:underline disabled:opacity-50">Save</button>
        <button type="button" onClick={() => setEditing(false)} className="text-[11px] text-white/40 light:text-slate-400 hover:text-white light:hover:text-slate-900">Cancel</button>
      </form>;
  }
  return <p className="mt-0.5 flex items-center gap-1.5 text-xs font-normal text-white/40 light:text-slate-400">
      {u.fullName || "No name set"}
      {canEdit && <button onClick={() => setEditing(true)} className="text-white/25 light:text-slate-300 transition-colors hover:text-white light:hover:text-slate-900" aria-label="Edit name">✎</button>}
    </p>;
}
function ResetPasswordControl({ u, canReset }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => adminResetPassword(u.userId, password),
    onSuccess: () => {
      toast.success(`Password reset for ${u.email}.`);
      setPassword("");
      setOpen(false);
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to reset password")
  });
  if (!canReset) return null;
  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-xs text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900">
        Reset password
      </button>;
  }
  return <form onSubmit={async e => {
    e.preventDefault();
    const ok = await confirm({ title: `Reset password for ${u.email}?`, description: "They'll need the new password to log in — share it with them yourself.", confirmLabel: "Reset" });
    if (ok) mutation.mutate();
  }} className="flex items-center gap-1.5">
      <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="w-32 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-xs text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
      <button type="submit" disabled={mutation.isPending} className="text-xs text-emerald-300 light:text-emerald-600 hover:underline disabled:opacity-50">Save</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-white/40 light:text-slate-400 hover:text-white light:hover:text-slate-900">Cancel</button>
    </form>;
}
function GrantAdminControl({ u, isSelf, isSuperAdmin, adminMutation, adminRoles, roleLabel }) {
  const [pendingRole, setPendingRole] = useState("support");
  if (isSelf) return <span className="text-xs text-white/40 light:text-slate-400">(you)</span>;
  if (!isSuperAdmin) {
    // Non-super-admin roles can see admin status but not change it.
    return u.isPlatformAdmin ? <span className="text-xs text-amber-300">{roleLabel[u.platformAdminRole] ?? "Admin"}</span> : <span className="text-xs text-white/30 light:text-slate-400">—</span>;
  }
  if (u.isPlatformAdmin) {
    return <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
          {roleLabel[u.platformAdminRole] ?? "Admin"}
        </span>
        <button onClick={() => adminMutation.mutate({ userId: u.userId, isAdmin: false })} disabled={adminMutation.isPending} className="text-xs text-white/60 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900 disabled:opacity-50">
          Revoke
        </button>
      </div>;
  }
  return <div className="flex items-center gap-1.5">
      <select value={pendingRole} onChange={e => setPendingRole(e.target.value)} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-xs text-white light:text-slate-900">
        {adminRoles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
      </select>
      <button onClick={() => adminMutation.mutate({ userId: u.userId, isAdmin: true, role: pendingRole })} disabled={adminMutation.isPending} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900 disabled:opacity-50">
        Grant
      </button>
    </div>;
}
export default function AdminUsers() {
  const {
    user: currentUser,
    platformAdminRole
  } = useAuth();
  const isSuperAdmin = platformAdminRole === "super_admin";
  const canResetPasswords = ["super_admin", "support", "reseller"].includes(platformAdminRole);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const {
    data: users,
    isLoading
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers
  });
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter(u => u.email.toLowerCase().includes(q) || (u.organizationName ?? "").toLowerCase().includes(q));
  }, [users, search]);
  // Reads live from the roles table (migration 0032) so a new/renamed
  // platform role shows up here with zero code changes; falls back to the
  // fixed migration-0030/0031 list on an un-migrated database.
  const { data: platformRoles } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: () => fetchRoles("platform"),
    retry: false
  });
  const adminRoles = platformRoles?.length ? platformRoles.map(r => ({ key: r.key, name: r.name })) : FALLBACK_ADMIN_ROLES;
  const roleLabel = Object.fromEntries(adminRoles.map(r => [r.key, r.name]));
  // Org-role editing needs migration 0032 (roles table) + 0033
  // (admin_update_member_role) — both catch a missing table/function and
  // fall back to the plain read-only role text, same degrade pattern as
  // the platform-role grid above.
  const { data: orgRolesRaw } = useQuery({
    queryKey: ["org-roles"],
    queryFn: fetchOrgRoles,
    retry: false
  });
  const orgRoles = orgRolesRaw ?? [];
  const orgRoleLabel = Object.fromEntries(orgRoles.map(r => [r.key, r.name]));
  const canEditOrgRoles = ["super_admin", "support", "platform_administrator"].includes(platformAdminRole) && orgRoles.length > 0;
  const memberRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => adminUpdateMemberRole(userId, role),
    onSuccess: () => {
      toast.success("Role updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update role")
  });
  const adminMutation = useMutation({
    mutationFn: ({
      userId,
      isAdmin,
      role
    }) => setUserPlatformAdmin(userId, isAdmin, role),
    onSettled: () => queryClient.invalidateQueries({
      queryKey: ["admin-users"]
    }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update admin access")
  });
  const deleteMutation = useMutation({
    mutationFn: userId => adminDeleteUser(userId),
    onSettled: () => queryClient.invalidateQueries({
      queryKey: ["admin-users"]
    }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete user")
  });
  async function handleDelete(u) {
    const ok = await confirm({
      title: `Delete user "${u.email}"?`,
      description: "This permanently removes their account.",
      confirmLabel: "Delete",
      danger: true
    });
    if (ok) {
      deleteMutation.mutate(u.userId, {
        onSuccess: () => toast.success(`Deleted "${u.email}".`)
      });
    }
  }
  return <div className="space-y-6">
      <Reveal y={12} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Users</h1>
          <p className="text-sm text-white/50 light:text-slate-500">Every individual person across every organization — not the organizations themselves (see <Link to="/admin/customers" className="underline hover:text-white/70 light:hover:text-slate-600">Customers</Link> for those). Change a person's Role here; to see what a role actually grants, see <Link to="/admin/roles" className="underline hover:text-white/70 light:hover:text-slate-600">Roles &amp; Permissions</Link>.</p>
        </div>
        <CreateUserForm />
      </Reveal>

      <Reveal delay={0.03} className="flex items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email or organization…" className="w-72 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-1.5 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <span className="text-xs text-white/40 light:text-slate-400">
          {filteredUsers.length} of {users?.length ?? 0}
        </span>
      </Reveal>

      <SpotlightCard className="overflow-hidden" delay={0.05} tint="amber" scan>
        {isLoading ? <SkeletonRows count={4} /> : !users || users.length === 0 ? <EmptyState title="No users yet." /> : filteredUsers.length === 0 ? <EmptyState title="No users match your search." /> : <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Platform Admin</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {filteredUsers.map((u, i) => <motion.tr key={u.userId} initial={{
            opacity: 0,
            y: 6
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.3,
            delay: Math.min(i, 15) * 0.02,
            ease: EASE
          }}>
                  <td className="px-4 py-3 font-medium text-white light:text-slate-900">
                    {u.email}
                    <NameCell u={u} canEdit={canResetPasswords} />
                  </td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{u.organizationName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <MemberOrgRoleControl u={u} canEdit={canEditOrgRoles} orgRoles={orgRoles} orgRoleLabel={orgRoleLabel} roleMutation={memberRoleMutation} />
                  </td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <GrantAdminControl u={u} isSelf={u.userId === currentUser?.id} isSuperAdmin={isSuperAdmin} adminMutation={adminMutation} adminRoles={adminRoles} roleLabel={roleLabel} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <ResetPasswordControl u={u} canReset={canResetPasswords} />
                      {u.userId !== currentUser?.id && <button onClick={() => handleDelete(u)} disabled={deleteMutation.isPending} className="text-xs text-red-300 light:text-red-600 transition-colors hover:underline disabled:opacity-50">
                          Delete
                        </button>}
                    </div>
                  </td>
                </motion.tr>)}
            </tbody>
          </table>}
      </SpotlightCard>
    </div>;
}