import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCreateUser, adminDeleteUser, fetchAdminUsers, setUserPlatformAdmin } from "../../api/adminEndpoints";
import { useAuth } from "../../context/AuthContext";

function CreateUserForm() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => adminCreateUser({ email, password, organizationName, fullName }),
    onSuccess: () => {
      setEmail("");
      setPassword("");
      setOrganizationName("");
      setFullName("");
      setOpen(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Failed to create user"),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  }

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/40 focus:outline-none";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300"
      >
        + Add user
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-amber-400/20 bg-neutral-900/60 p-5">
      <p className="text-sm font-medium text-white">Create a new user</p>
      <p className="text-xs text-white/45">
        Creates a confirmed account with its own organization. They can log in immediately with this password.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
        <input
          type="text"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)"
          className={inputClass}
        />
        <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Organization name" className={inputClass} />
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name (optional)" className={inputClass} />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-60"
        >
          {mutation.isPending ? "Creating…" : "Create user"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-white/50 hover:text-white">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: fetchAdminUsers });

  const adminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => setUserPlatformAdmin(userId, isAdmin),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminDeleteUser(userId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (err: unknown) => alert(err instanceof Error ? err.message : "Failed to delete user"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Users</h1>
          <p className="text-sm text-white/50">Every user across every organization on the platform.</p>
        </div>
        <CreateUserForm />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : !users || users.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No users yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Platform Admin</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => (
                <tr key={u.userId}>
                  <td className="px-4 py-3 font-medium text-white">{u.email}</td>
                  <td className="px-4 py-3 text-white/50">{u.organizationName ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50">{u.role ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.userId === currentUser?.id ? (
                      <span className="text-xs text-white/40">(you)</span>
                    ) : (
                      <button
                        onClick={() => adminMutation.mutate({ userId: u.userId, isAdmin: !u.isPlatformAdmin })}
                        disabled={adminMutation.isPending}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                          u.isPlatformAdmin ? "bg-amber-400/10 text-amber-300 hover:bg-amber-400/20" : "border border-white/15 text-white/60 hover:text-white"
                        }`}
                      >
                        {u.isPlatformAdmin ? "Revoke" : "Grant admin"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.userId !== currentUser?.id && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete user "${u.email}"? This permanently removes their account.`)) deleteMutation.mutate(u.userId);
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-red-300 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
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
