import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminOrganizations, updateOrganizationPlan } from "../../api/adminEndpoints";
import type { Plan } from "../../api/types";

const PLANS: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

export default function AdminOrganizations() {
  const queryClient = useQueryClient();
  const { data: organizations, isLoading } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: fetchAdminOrganizations,
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: Plan }) => updateOrganizationPlan(id, plan),
    onMutate: ({ id }) => setSavingId(id),
    onSettled: () => {
      setSavingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Organizations</h1>
        <p className="text-sm text-white/50">Every organization on the platform. Change a plan directly — there's no self-serve billing yet.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : !organizations || organizations.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No organizations yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td className="px-4 py-3 font-medium text-white">{org.name}</td>
                  <td className="px-4 py-3 text-white/50">{new Date(org.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <select
                      value={org.plan}
                      disabled={savingId === org.id}
                      onChange={(e) => mutation.mutate({ id: org.id, plan: e.target.value as Plan })}
                      className="rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      {PLANS.map((plan) => (
                        <option key={plan} value={plan}>
                          {plan}
                        </option>
                      ))}
                    </select>
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
