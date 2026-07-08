import { useQuery } from "@tanstack/react-query";
import { fetchOrganizationMembers, fetchPlanUsage } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { StatusPageCard } from "../components/StatusPageCard";

const PLANS = [
  {
    name: "STARTER",
    label: "Starter",
    price: "Free",
    color: "border-white/15",
    features: ["3 monitors", "1 alert channel", "7-day history", "Website monitoring only", "No network devices", "No server agents"],
  },
  {
    name: "PROFESSIONAL",
    label: "Professional",
    price: "$29/mo",
    color: "border-blue-400/30",
    highlight: true,
    features: ["25 monitors", "5 alert channels", "30-day history", "Website + network monitoring", "10 server agents", "Public status page"],
  },
  {
    name: "BUSINESS",
    label: "Business",
    price: "$99/mo",
    color: "border-violet-400/30",
    features: ["100 monitors", "20 alert channels", "90-day history", "All check types", "50 server agents", "Priority support"],
  },
  {
    name: "ENTERPRISE",
    label: "Enterprise",
    price: "Custom",
    color: "border-amber-400/30",
    features: ["Unlimited monitors", "Unlimited channels", "365-day history", "All features", "Unlimited agents", "Dedicated support"],
  },
];

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const unlimited = max >= 100000;
  const pct = unlimited ? 0 : Math.min(100, (current / max) * 100);
  const atLimit = !unlimited && current >= max;
  return (
    <div>
      <div className="flex justify-between text-xs text-white/50">
        <span>{label}</span>
        <span className={atLimit ? "text-amber-300" : ""}>{current}/{unlimited ? "∞" : max}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? "bg-amber-400" : "bg-emerald-400"}`}
          style={{ width: unlimited ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Team() {
  const { organization } = useAuth();
  const { data: members, isLoading: membersLoading } = useQuery({ queryKey: ["organization-members"], queryFn: fetchOrganizationMembers });
  const { data: usage } = useQuery({ queryKey: ["plan-usage"], queryFn: fetchPlanUsage });

  const currentPlan = usage?.plan ?? "STARTER";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Team & Plan</h1>
        <p className="text-sm text-white/50">{organization?.name}</p>
      </div>

      {/* Current usage */}
      {usage && (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Current Usage</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
              {currentPlan} plan
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UsageBar label="Monitors" current={usage.currentMonitors} max={usage.maxMonitors} />
            <UsageBar label="Alert Channels" current={usage.currentAlertChannels} max={usage.maxAlertChannels} />
            <div>
              <p className="text-xs text-white/50">History Retention</p>
              <p className="mt-1 text-sm font-medium text-white">{usage.historyDays} days</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Plan</p>
              <p className="mt-1 text-sm font-medium text-white">{currentPlan}</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-white">Available Plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.name === currentPlan;
            return (
              <div
                key={plan.name}
                className={`rounded-2xl border p-5 ${plan.color} ${isCurrent ? "bg-white/[0.04]" : "bg-neutral-900/40"}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{plan.label}</p>
                    <p className="mt-0.5 text-lg font-semibold text-white">{plan.price}</p>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      Current
                    </span>
                  )}
                </div>
                <ul className="mt-4 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-white/60">
                      <span className="text-emerald-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <a
                    href="mailto:sales@itops-monitor.local"
                    className="mt-4 block rounded-full border border-white/20 px-3 py-2 text-center text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                  >
                    Contact Sales
                  </a>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-white/35">
          To upgrade your plan, contact your ITOps Solution account manager or email sales@itops-monitor.local
        </p>
      </div>

      {/* Members */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">Team Members</h2>
        </div>
        {membersLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}</div>
        ) : !members || members.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No members found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {members.map((member) => (
                <tr key={member.userId}>
                  <td className="px-4 py-3 font-medium text-white">{member.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">{member.role}</span>
                  </td>
                  <td className="px-4 py-3 text-white/50">{new Date(member.joinedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StatusPageCard />

      <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-900/30 p-4 text-sm text-white/50">
        Multi-user team invites are on the roadmap. Each signup currently gets its own organization. Contact your account manager to add team members manually.
      </div>
    </div>
  );
}
