import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { fetchAdminPlanLimits, updatePlanLimit } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
const EASE = [0.16, 1, 0.3, 1];
function PlanRow({
  plan,
  index
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [maxMonitors, setMaxMonitors] = useState(plan.maxMonitors);
  const [maxHosts, setMaxHosts] = useState(plan.maxHosts);
  const [maxAlertChannels, setMaxAlertChannels] = useState(plan.maxAlertChannels);
  const [historyDays, setHistoryDays] = useState(plan.historyDays);
  const mutation = useMutation({
    mutationFn: () => updatePlanLimit({
      plan: plan.plan,
      maxMonitors,
      maxAlertChannels,
      historyDays,
      maxHosts
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-plan-limits"]
      });
      toast.success(`${plan.plan} limits saved.`);
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to save plan limits.")
  });
  return <motion.tr initial={{
    opacity: 0,
    y: 6
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.3,
    delay: index * 0.04,
    ease: EASE
  }}>
      <td className="px-4 py-3 font-medium text-white light:text-slate-900">{plan.plan}</td>
      <td className="px-4 py-3">
        <input type="number" min={0} value={maxMonitors} onChange={e => setMaxMonitors(Number(e.target.value))} className="w-24 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-sm text-white light:text-slate-900 focus:border-white/40 focus:outline-none" />
      </td>
      <td className="px-4 py-3">
        <input type="number" min={0} value={maxHosts} onChange={e => setMaxHosts(Number(e.target.value))} className="w-24 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-sm text-white light:text-slate-900 focus:border-white/40 focus:outline-none" />
      </td>
      <td className="px-4 py-3">
        <input type="number" min={0} value={maxAlertChannels} onChange={e => setMaxAlertChannels(Number(e.target.value))} className="w-24 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-sm text-white light:text-slate-900 focus:border-white/40 focus:outline-none" />
      </td>
      <td className="px-4 py-3">
        <input type="number" min={0} value={historyDays} onChange={e => setHistoryDays(Number(e.target.value))} className="w-24 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-sm text-white light:text-slate-900 focus:border-white/40 focus:outline-none" />
      </td>
      <td className="px-4 py-3">
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-50">
          {mutation.isPending ? "Saving…" : mutation.isSuccess ? "Saved" : "Save"}
        </button>
      </td>
    </motion.tr>;
}
export default function AdminPlans() {
  const {
    data: plans,
    isLoading
  } = useQuery({
    queryKey: ["admin-plan-limits"],
    queryFn: fetchAdminPlanLimits
  });
  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Plan Limits</h1>
        <p className="text-sm text-white/50 light:text-slate-500">
          These limits are enforced live — changing a number here immediately changes what customers on that plan can do.
        </p>
      </Reveal>

      <SpotlightCard className="overflow-hidden" delay={0.05} tint="amber">
        {isLoading ? <SkeletonRows count={4} /> : <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Max Monitors</th>
                <th className="px-4 py-3">Max Hosts</th>
                <th className="px-4 py-3">Max Alert Channels</th>
                <th className="px-4 py-3">History (days)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {plans?.map((plan, i) => <PlanRow key={plan.plan} plan={plan} index={i} />)}
            </tbody>
          </table>}
      </SpotlightCard>
    </div>;
}