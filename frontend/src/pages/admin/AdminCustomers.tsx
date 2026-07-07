import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCreateUser, fetchAdminCustomers, updateOrganizationPlan } from "../../api/adminEndpoints";
import type { Plan } from "../../api/types";

const PLANS: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

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

export default function AdminCustomers() {
  const queryClient = useQueryClient();
  const { data: customers, isLoading } = useQuery({ queryKey: ["admin-customers"], queryFn: fetchAdminCustomers });
  const [savingId, setSavingId] = useState<string | null>(null);

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: Plan }) => updateOrganizationPlan(id, plan),
    onMutate: ({ id }) => setSavingId(id),
    onSettled: () => {
      setSavingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
  });

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

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : !customers || customers.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No customers yet. Provision one above.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Monitors</th>
                <th className="px-4 py-3">Hosts</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {customers.map((c) => (
                <tr key={c.organizationId}>
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
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
                  <td className="px-4 py-3"><UsageCell used={c.monitorsUsed} max={c.maxMonitors} /></td>
                  <td className="px-4 py-3"><UsageCell used={c.hostsUsed} max={c.maxHosts} /></td>
                  <td className="px-4 py-3 text-white/50">{c.memberCount}</td>
                  <td className="px-4 py-3 text-white/50">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
