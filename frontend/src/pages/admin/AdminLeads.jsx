import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { fetchAdminContactMessages, fetchAdminWaitlistSignups, updateContactMessageStatus } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";
const EASE = [0.16, 1, 0.3, 1];
const STATUS_OPTIONS = ["new", "read", "resolved"];
export default function AdminLeads() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const {
    data: signups,
    isLoading: signupsLoading
  } = useQuery({
    queryKey: ["admin-waitlist"],
    queryFn: fetchAdminWaitlistSignups
  });
  const {
    data: messages,
    isLoading: messagesLoading
  } = useQuery({
    queryKey: ["admin-contact-messages"],
    queryFn: fetchAdminContactMessages
  });
  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status
    }) => updateContactMessageStatus(id, status),
    onSettled: () => queryClient.invalidateQueries({
      queryKey: ["admin-contact-messages"]
    }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update status.")
  });
  return <div className="space-y-8">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Leads & Messages</h1>
        <p className="text-sm text-white/50 light:text-slate-500">Every waitlist signup and contact form submission across the marketing site.</p>
      </Reveal>

      <Reveal delay={0.05}>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.1em] text-white/45 light:text-slate-400">Contact messages</h2>
        <SpotlightCard className="overflow-hidden" tint="cyan">
          {messagesLoading ? <SkeletonRows count={3} className="h-16" /> : !messages || messages.length === 0 ? <EmptyState title="No messages yet." /> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
              {messages.map((msg, i) => <motion.li key={msg.id} initial={{
            opacity: 0,
            y: 6
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.3,
            delay: Math.min(i, 10) * 0.04,
            ease: EASE
          }} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium text-white light:text-slate-900">
                      {msg.name} <span className="text-white/40 light:text-slate-400">· {msg.email}</span>
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-white/40 light:text-slate-400">{msg.topic}</p>
                    <p className="mt-2 max-w-xl text-sm text-white/70 light:text-slate-600">{msg.message}</p>
                    <p className="mt-2 text-xs text-white/40 light:text-slate-400">{new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                  <select value={msg.status} onChange={e => statusMutation.mutate({
              id: msg.id,
              status: e.target.value
            })} className="shrink-0 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-1.5 text-sm text-white light:text-slate-900">
                    {STATUS_OPTIONS.map(status => <option key={status} value={status}>
                        {status}
                      </option>)}
                  </select>
                </motion.li>)}
            </ul>}
        </SpotlightCard>
      </Reveal>

      <Reveal delay={0.1}>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.1em] text-white/45 light:text-slate-400">Waitlist signups</h2>
        <SpotlightCard className="overflow-hidden" tint="cyan">
          {signupsLoading ? <SkeletonRows count={3} /> : !signups || signups.length === 0 ? <EmptyState title="No signups yet." /> : <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
                {signups.map((signup, i) => <motion.tr key={signup.id} initial={{
              opacity: 0,
              y: 6
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.3,
              delay: Math.min(i, 10) * 0.03,
              ease: EASE
            }}>
                    <td className="px-4 py-3 font-medium text-white light:text-slate-900">{signup.email}</td>
                    <td className="px-4 py-3 text-white/60 light:text-slate-500">{signup.product}</td>
                    <td className="px-4 py-3 text-white/50 light:text-slate-500">{signup.note ?? "—"}</td>
                    <td className="px-4 py-3 text-white/50 light:text-slate-500">{new Date(signup.createdAt).toLocaleDateString()}</td>
                  </motion.tr>)}
              </tbody>
            </table>}
        </SpotlightCard>
      </Reveal>
    </div>;
}