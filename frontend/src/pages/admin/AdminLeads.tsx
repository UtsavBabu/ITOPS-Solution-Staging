import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminContactMessages, fetchAdminWaitlistSignups, updateContactMessageStatus } from "../../api/adminEndpoints";
import type { ContactMessageStatus } from "../../api/types";

const STATUS_OPTIONS: ContactMessageStatus[] = ["new", "read", "resolved"];

export default function AdminLeads() {
  const queryClient = useQueryClient();
  const { data: signups, isLoading: signupsLoading } = useQuery({
    queryKey: ["admin-waitlist"],
    queryFn: fetchAdminWaitlistSignups,
  });
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-contact-messages"],
    queryFn: fetchAdminContactMessages,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactMessageStatus }) => updateContactMessageStatus(id, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Leads & Messages</h1>
        <p className="text-sm text-white/50">Every waitlist signup and contact form submission across the marketing site.</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.1em] text-white/45">Contact messages</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
          {messagesLoading ? (
            <p className="p-4 text-sm text-white/50">Loading…</p>
          ) : !messages || messages.length === 0 ? (
            <p className="p-4 text-sm text-white/50">No messages yet.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {messages.map((msg) => (
                <li key={msg.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {msg.name} <span className="text-white/40">· {msg.email}</span>
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-white/40">{msg.topic}</p>
                    <p className="mt-2 max-w-xl text-sm text-white/70">{msg.message}</p>
                    <p className="mt-2 text-xs text-white/40">{new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                  <select
                    value={msg.status}
                    onChange={(e) => statusMutation.mutate({ id: msg.id, status: e.target.value as ContactMessageStatus })}
                    className="shrink-0 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.1em] text-white/45">Waitlist signups</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
          {signupsLoading ? (
            <p className="p-4 text-sm text-white/50">Loading…</p>
          ) : !signups || signups.length === 0 ? (
            <p className="p-4 text-sm text-white/50">No signups yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-white/40">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {signups.map((signup) => (
                  <tr key={signup.id}>
                    <td className="px-4 py-3 font-medium text-white">{signup.email}</td>
                    <td className="px-4 py-3 text-white/60">{signup.product}</td>
                    <td className="px-4 py-3 text-white/50">{signup.note ?? "—"}</td>
                    <td className="px-4 py-3 text-white/50">{new Date(signup.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
