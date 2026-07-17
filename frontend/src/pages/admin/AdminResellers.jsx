import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { adminCreateUser, fetchAdminResellers, fetchAdminUsers, fetchResellerApplications, reviewResellerApplication, setUserPlatformAdmin } from "../../api/adminEndpoints";
import { useAuth } from "../../context/AuthContext";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/EmptyState";
import { useConfirm } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";

const EASE = [0.16, 1, 0.3, 1];
const STATUS_STYLE = {
  pending: "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700",
  approved: "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700",
  rejected: "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700"
};

function GrantExistingForm({ app, matchedUser, onGranted }) {
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      await setUserPlatformAdmin(matchedUser.userId, true, "reseller");
      await reviewResellerApplication(app.id, "approved");
    },
    onSuccess: () => {
      toast.success(`Granted reseller access to ${matchedUser.email}.`);
      onGranted();
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to grant access")
  });
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
      <p className="text-xs text-emerald-200">
        An account already exists for <span className="font-medium">{matchedUser.email}</span>.
      </p>
      <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="ml-auto rounded-full bg-emerald-400 px-3.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-emerald-300 disabled:opacity-60">
        {mutation.isPending ? "Granting…" : "Grant Reseller Access"}
      </button>
    </div>;
}

function CreateAndGrantForm({ app, onGranted }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      const { userId } = await adminCreateUser({
        email: app.email,
        password,
        organizationName: `${app.companyName} (Reseller)`,
        fullName: app.contactName
      });
      if (!userId) throw new Error("Account was created but its id wasn't returned — grant the role from All Users instead.");
      await setUserPlatformAdmin(userId, true, "reseller");
      await reviewResellerApplication(app.id, "approved");
    },
    onSuccess: () => {
      toast.success(`Created an account for ${app.email} and granted reseller access.`);
      onGranted();
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to create account")
  });
  if (!open) {
    return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 light:border-slate-900/10 bg-black/20 light:bg-slate-900/[0.03] px-4 py-3">
        <p className="text-xs text-white/50 light:text-slate-500">No account exists yet for {app.email}.</p>
        <button onClick={() => setOpen(true)} className="ml-auto rounded-full bg-amber-400 px-3.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-amber-300">
          Create Account &amp; Grant Access
        </button>
      </div>;
  }
  return <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3.5">
      <p className="text-xs text-white/60 light:text-slate-500">
        Creates a confirmed login for <span className="font-medium text-white light:text-slate-900">{app.email}</span>, then grants
        reseller access immediately. Share this password with them yourself.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a password (min 8 chars)" className="min-w-0 flex-1 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-1.5 text-xs text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <button type="submit" disabled={mutation.isPending} className="rounded-full bg-amber-400 px-3.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-60">
          {mutation.isPending ? "Creating…" : "Create & Grant"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">Cancel</button>
      </div>
      {mutation.isError && <p className="text-xs text-red-300">{mutation.error.message}</p>}
    </form>;
}

function DirectAddResellerForm({ onCreated }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      const { userId } = await adminCreateUser({
        email,
        password,
        organizationName: `${companyName} (Reseller)`,
        fullName: contactName
      });
      if (!userId) throw new Error("Account was created but its id wasn't returned — grant the role from All Users instead.");
      await setUserPlatformAdmin(userId, true, "reseller");
    },
    onSuccess: () => {
      toast.success(`Created a reseller account for ${email}.`);
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPassword("");
      setOpen(false);
      onCreated();
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to create reseller")
  });
  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300">
        + Add reseller directly
      </button>;
  }
  return <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-3 rounded-2xl border border-amber-400/20 light:border-amber-500/30 bg-neutral-900/60 light:bg-amber-50/40 p-5">
      <p className="text-sm font-medium text-white light:text-slate-900">Add a reseller directly</p>
      <p className="text-xs text-white/45 light:text-slate-400">
        Skips the application review — use this when you already know and trust the partner. Creates their login and
        grants reseller access in one step; they can provision and manage only the customers they create from here on.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company name" className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <input required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact name" className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 8 chars)" className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
      </div>
      {mutation.isError && <p className="text-sm text-red-300">{mutation.error.message}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={mutation.isPending} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-60">
          {mutation.isPending ? "Creating…" : "Create & grant reseller access"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
          Cancel
        </button>
      </div>
    </form>;
}

function ResellerRow({ reseller, i, isSuperAdmin, onRevoked }) {
  const confirm = useConfirm();
  const toast = useToast();
  const revoke = useMutation({
    mutationFn: () => setUserPlatformAdmin(reseller.userId, false),
    onSuccess: () => { toast.success(`Revoked reseller access for ${reseller.email}.`); onRevoked(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to revoke access")
  });
  async function handleRevoke() {
    const ok = await confirm({
      title: `Revoke ${reseller.email}'s reseller access?`,
      description: reseller.customerCount > 0 ? `They provisioned ${reseller.customerCount} customer${reseller.customerCount === 1 ? "" : "s"} — those organizations stay, they just lose access to manage them as a reseller.` : "They have no customers provisioned yet.",
      confirmLabel: "Revoke",
      danger: true
    });
    if (ok) revoke.mutate();
  }
  return <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.03 }}>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-white light:text-slate-900">{reseller.fullName || reseller.email}</p>
        {reseller.fullName && <p className="text-xs text-white/40 light:text-slate-400">{reseller.email}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-white/70 light:text-slate-600">
        {reseller.customerCount} customer{reseller.customerCount === 1 ? "" : "s"}
      </td>
      <td className="px-4 py-3 text-xs text-white/40 light:text-slate-400">{new Date(reseller.grantedAt).toLocaleDateString()}</td>
      {isSuperAdmin && <td className="px-4 py-3 text-right">
          <button onClick={handleRevoke} disabled={revoke.isPending} className="text-xs text-red-300 light:text-red-600 hover:underline disabled:opacity-50">
            Revoke
          </button>
        </td>}
    </motion.tr>;
}

function ActiveResellersPanel({ isSuperAdmin }) {
  const { data: resellers, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-resellers"],
    queryFn: fetchAdminResellers,
    retry: false
  });
  const totalCustomers = (resellers ?? []).reduce((sum, r) => sum + r.customerCount, 0);

  return <SpotlightCard className="overflow-hidden" delay={0.02}>
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white light:text-slate-900">Active Resellers</h2>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">
          Partners with reseller access today{resellers && resellers.length > 0 ? ` — ${resellers.length} reseller${resellers.length === 1 ? "" : "s"}, ${totalCustomers} customer${totalCustomers === 1 ? "" : "s"} provisioned between them.` : "."}
        </p>
      </div>
      {isError ? <ErrorState message="Couldn't load resellers — migration 0060 may not be applied yet." onRetry={() => refetch()} /> : isLoading ? <SkeletonRows count={2} /> : !resellers || resellers.length === 0 ? <EmptyState title="No active resellers yet." description="Approve an application below, or add one directly, to grant reseller access." /> : <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
                <tr>
                  <th className="px-4 py-2">Reseller</th>
                  <th className="px-4 py-2">Customers</th>
                  <th className="px-4 py-2">Granted</th>
                  {isSuperAdmin && <th className="px-4 py-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                {resellers.map((r, i) => <ResellerRow key={r.userId} reseller={r} i={i} isSuperAdmin={isSuperAdmin} onRevoked={refetch} />)}
              </tbody>
            </table>
          </div>}
    </SpotlightCard>;
}

function ApplicationRow({ app, i, matchedUser, isSuperAdmin, canReview, onChanged }) {
  const confirm = useConfirm();
  const toast = useToast();
  const rejectMutation = useMutation({
    mutationFn: () => reviewResellerApplication(app.id, "rejected"),
    onSuccess: () => { toast.success("Application rejected."); onChanged(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update application")
  });
  async function handleReject() {
    const ok = await confirm({ title: `Reject ${app.companyName}'s application?`, confirmLabel: "Reject", danger: true });
    if (ok) rejectMutation.mutate();
  }
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.04, ease: EASE }} className="border-b border-white/10 p-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white light:text-slate-900">
            {app.companyName} <span className="font-normal text-white/40 light:text-slate-400">· {app.contactName}</span>
          </p>
          <p className="mt-0.5 text-xs text-white/50 light:text-slate-500">{app.email}{app.phone ? ` · ${app.phone}` : ""}</p>
          {app.message && <p className="mt-2 max-w-xl text-sm text-white/60 light:text-slate-500">{app.message}</p>}
          <p className="mt-2 text-xs text-white/35 light:text-slate-400">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${STATUS_STYLE[app.status]}`}>
          {app.status}
        </span>
      </div>

      {app.status === "pending" && canReview && <div className="mt-3 space-y-2">
          {isSuperAdmin ? matchedUser ? <GrantExistingForm app={app} matchedUser={matchedUser} onGranted={onChanged} /> : <CreateAndGrantForm app={app} onGranted={onChanged} /> : <p className="rounded-xl border border-white/10 light:border-slate-900/10 bg-black/20 light:bg-slate-900/[0.03] px-4 py-3 text-xs text-white/45 light:text-slate-400">
              Only a Super Admin can grant reseller access. You can still reject this application below.
            </p>}
          <button onClick={handleReject} disabled={rejectMutation.isPending} className="text-xs text-red-300 light:text-red-600 transition-colors hover:underline disabled:opacity-50">
            Reject application
          </button>
        </div>}
    </motion.div>;
}

export default function AdminResellers() {
  const { platformAdminRole } = useAuth();
  const isSuperAdmin = platformAdminRole === "super_admin";
  const canReview = ["super_admin", "support", "platform_administrator"].includes(platformAdminRole);
  const queryClient = useQueryClient();
  const { data: applications, isLoading, isError, refetch } = useQuery({
    queryKey: ["reseller-applications"],
    queryFn: fetchResellerApplications,
    retry: false
  });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: fetchAdminUsers });
  const usersByEmail = useMemo(() => {
    const map = new Map();
    for (const u of users ?? []) map.set(u.email.toLowerCase(), u);
    return map;
  }, [users]);

  function handleChanged() {
    queryClient.invalidateQueries({ queryKey: ["reseller-applications"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
  }

  const pendingCount = applications?.filter(a => a.status === "pending").length ?? 0;

  return <div className="space-y-6">
      <Reveal y={12} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Resellers</h1>
          <p className="text-sm text-white/50 light:text-slate-500">
            Partners who provision and manage their own customers under this platform.
            {pendingCount > 0 && <span className="ml-1 font-medium text-amber-300">{pendingCount} application{pendingCount === 1 ? "" : "s"} pending review.</span>}
          </p>
        </div>
        {isSuperAdmin && <DirectAddResellerForm onCreated={handleChanged} />}
      </Reveal>

      <ActiveResellersPanel isSuperAdmin={isSuperAdmin} />

      <div>
        <Reveal delay={0.06}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/40 light:text-slate-400">Applications</h2>
        </Reveal>
        <SpotlightCard className="overflow-hidden" delay={0.08} tint="amber">
          {isLoading ? <SkeletonRows count={3} className="h-24" /> : isError ? <ErrorState message="Couldn't load applications — the reseller pipeline migration (0033) may not be applied yet." onRetry={() => refetch()} /> : !applications || applications.length === 0 ? <EmptyState title="No reseller applications yet." description="They'll show up here as soon as someone applies from the public 'Become a Reseller' page." /> : applications.map((app, i) => <ApplicationRow key={app.id} app={app} i={i} matchedUser={usersByEmail.get(app.email.toLowerCase())} isSuperAdmin={isSuperAdmin} canReview={canReview} onChanged={handleChanged} />)}
        </SpotlightCard>
      </div>
    </div>;
}
