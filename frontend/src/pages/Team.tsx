import { useQuery } from "@tanstack/react-query";
import { fetchOrganizationMembers, fetchPlanUsage } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { StatCard } from "../components/StatCard";
import { StatusPageCard } from "../components/StatusPageCard";

export default function Team() {
  const { organization } = useAuth();
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["organization-members"],
    queryFn: fetchOrganizationMembers,
  });
  const { data: usage } = useQuery({ queryKey: ["plan-usage"], queryFn: fetchPlanUsage });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Team & Organization</h1>
        <p className="text-sm text-white/50">{organization?.name}</p>
      </div>

      {usage && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Plan" value={usage.plan} />
          <StatCard
            label="Monitors used"
            value={`${usage.currentMonitors}/${usage.maxMonitors}`}
            tone={usage.currentMonitors >= usage.maxMonitors ? "warning" : "default"}
          />
          <StatCard
            label="Alert channels used"
            value={`${usage.currentAlertChannels}/${usage.maxAlertChannels}`}
            tone={usage.currentAlertChannels >= usage.maxAlertChannels ? "warning" : "default"}
          />
          <StatCard label="History retention" value={`${usage.historyDays}d`} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">Members</h2>
        </div>
        {membersLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
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
                  <td className="px-4 py-3 text-white/50">{member.role}</td>
                  <td className="px-4 py-3 text-white/50">{new Date(member.joinedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StatusPageCard />

      <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-900/30 p-4 text-sm text-white/50">
        Inviting new teammates into this organization is on our roadmap — today, each signup gets its own
        organization automatically.
      </div>
    </div>
  );
}
