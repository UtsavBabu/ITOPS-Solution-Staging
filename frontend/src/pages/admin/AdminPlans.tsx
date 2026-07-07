import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminPlanLimits, updatePlanLimit } from "../../api/adminEndpoints";
import type { AdminPlanLimit } from "../../api/types";

function PlanRow({ plan }: { plan: AdminPlanLimit }) {
  const queryClient = useQueryClient();
  const [maxMonitors, setMaxMonitors] = useState(plan.maxMonitors);
  const [maxHosts, setMaxHosts] = useState(plan.maxHosts);
  const [maxAlertChannels, setMaxAlertChannels] = useState(plan.maxAlertChannels);
  const [historyDays, setHistoryDays] = useState(plan.historyDays);

  const mutation = useMutation({
    mutationFn: () => updatePlanLimit({ plan: plan.plan, maxMonitors, maxAlertChannels, historyDays, maxHosts }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-plan-limits"] }),
  });

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-white">{plan.plan}</td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={maxMonitors}
          onChange={(e) => setMaxMonitors(Number(e.target.value))}
          className="w-24 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm text-white focus:border-white/40 focus:outline-none"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={maxHosts}
          onChange={(e) => setMaxHosts(Number(e.target.value))}
          className="w-24 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm text-white focus:border-white/40 focus:outline-none"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={maxAlertChannels}
          onChange={(e) => setMaxAlertChannels(Number(e.target.value))}
          className="w-24 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm text-white focus:border-white/40 focus:outline-none"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={historyDays}
          onChange={(e) => setHistoryDays(Number(e.target.value))}
          className="w-24 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm text-white focus:border-white/40 focus:outline-none"
        />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : mutation.isSuccess ? "Saved" : "Save"}
        </button>
      </td>
    </tr>
  );
}

export default function AdminPlans() {
  const { data: plans, isLoading } = useQuery({ queryKey: ["admin-plan-limits"], queryFn: fetchAdminPlanLimits });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Plan Limits</h1>
        <p className="text-sm text-white/50">
          These limits are enforced live — changing a number here immediately changes what customers on that plan can do.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Max Monitors</th>
                <th className="px-4 py-3">Max Hosts</th>
                <th className="px-4 py-3">Max Alert Channels</th>
                <th className="px-4 py-3">History (days)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {plans?.map((plan) => (
                <PlanRow key={plan.plan} plan={plan} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
