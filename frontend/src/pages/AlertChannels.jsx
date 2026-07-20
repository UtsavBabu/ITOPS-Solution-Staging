import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { createAlertChannel, deleteAlertChannel, fetchAlertChannels, fetchMyPermissions, testAlertChannel } from "../api/endpoints";
import { Reveal, SpotlightCard } from "../components/Animated";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
const EASE = [0.16, 1, 0.3, 1];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIG_FIELD = {
  EMAIL: {
    key: "to",
    label: "Recipient Email",
    placeholder: "ops@example.com",
    validate: v => EMAIL_RE.test(v.trim()) || "Enter a valid email address."
  },
  SLACK: {
    key: "webhookUrl",
    label: "Slack Incoming Webhook URL",
    placeholder: "https://hooks.slack.com/services/…",
    validate: v => v.trim().startsWith("https://hooks.slack.com/services/") || "Slack incoming webhooks look like https://hooks.slack.com/services/…"
  },
  WEBHOOK: {
    key: "url",
    label: "Webhook URL",
    placeholder: "https://example.com/hooks/itops",
    validate: v => {
      try {
        const u = new URL(v.trim());
        return u.protocol === "http:" || u.protocol === "https:" || "Webhook URL must start with http:// or https://";
      } catch {
        return "Enter a valid URL, e.g. https://example.com/hooks/itops";
      }
    }
  }
};
export default function AlertChannels() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const { organization } = useAuth();
  const { data: can } = useQuery({
    queryKey: ["my-permissions", organization?.id],
    queryFn: () => fetchMyPermissions(organization?.id),
    enabled: !!organization?.id,
    retry: false
  });
  const canCreate = !!can && can("organization", "alert_channels", "create");
  const canDelete = !!can && can("organization", "alert_channels", "delete");
  const {
    data: channels,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["alert-channels"],
    queryFn: fetchAlertChannels
  });
  const [type, setType] = useState("EMAIL");
  const [name, setName] = useState("");
  const [configValue, setConfigValue] = useState("");
  const [formError, setFormError] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const field = CONFIG_FIELD[type];
  const createMutation = useMutation({
    mutationFn: () => createAlertChannel({
      type,
      name,
      config: {
        [field.key]: configValue
      }
    }),
    onSuccess: () => {
      setName("");
      setConfigValue("");
      queryClient.invalidateQueries({
        queryKey: ["alert-channels"]
      });
    },
    onError: err => {
      setFormError(err instanceof Error ? err.message : "Failed to create channel");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: id => deleteAlertChannel(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["alert-channels"]
    })
  });
  const testMutation = useMutation({
    mutationFn: id => testAlertChannel(id),
    onSuccess: () => toast.success("Test alert sent."),
    onError: () => toast.error("Failed to send test alert — check the channel configuration."),
    onSettled: () => setTestingId(null)
  });
  function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const result = field.validate(configValue);
    if (result !== true) {
      setFormError(result);
      return;
    }
    createMutation.mutate();
  }
  function handleTest(id) {
    setTestingId(id);
    testMutation.mutate(id);
  }
  async function handleDelete(id, name) {
    const ok = await confirm({
      title: `Delete channel "${name}"?`,
      description: "Alerts will stop going to this channel immediately. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Deleted "${name}".`),
      onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete channel.")
    });
  }
  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Alert Channels</h1>
        <p className="text-sm text-white/50 light:text-slate-500">Channels fire on monitor down/up, and SSL certificates expiring within 14 days.</p>
      </Reveal>

      {!canCreate && <Reveal delay={0.05}>
          <p className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] px-4 py-3 text-sm text-white/50 light:text-slate-500">
            Your role can view alert channels but not add new ones — ask an organization admin if you need one added.
          </p>
        </Reveal>}

      {canCreate && <Reveal delay={0.05}>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white p-4">
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Type</span>
          <select value={type} onChange={e => {
            setType(e.target.value);
            setConfigValue("");
          }} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 focus:border-white/40 focus:outline-none">
            <option value="EMAIL">Email</option>
            <option value="SLACK">Slack</option>
            <option value="WEBHOOK">Webhook</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Name</span>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="On-call team" className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none" />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">{field.label}</span>
          <input required value={configValue} onChange={e => setConfigValue(e.target.value)} placeholder={field.placeholder} className="w-72 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none" />
        </label>
        <button type="submit" disabled={createMutation.isPending} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60">
          {createMutation.isPending ? "Adding…" : "Add Channel"}
        </button>
        {formError && <p className="w-full text-sm text-red-300">{formError}</p>}
      </form>
      </Reveal>}

      <SpotlightCard className="overflow-hidden" delay={0.1} scan tint="cyan">
        {isError ? <ErrorState message="Couldn't load alert channels." onRetry={() => refetch()} /> : isLoading ? <SkeletonRows count={3} /> : !channels || channels.length === 0 ? <EmptyState title="No alert channels configured yet." description="Add email, Slack, or webhook above to start receiving alerts." /> : <ul className="divide-y divide-white/10 light:divide-slate-900/8">
            {channels.map((channel, i) => <motion.li key={channel.id} initial={{
          opacity: 0,
          y: 6
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.3,
          delay: i * 0.04,
          ease: EASE
        }} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white light:text-slate-900">
                    {channel.name} <span className="text-white/40 light:text-slate-400">({channel.type})</span>
                  </p>
                  <p className="text-white/50 light:text-slate-500">{Object.values(channel.config)[0]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleTest(channel.id)} disabled={testingId === channel.id} className="relative flex items-center gap-1.5 text-white/70 light:text-slate-600 transition-colors hover:text-white light:hover:text-slate-900 disabled:text-white/40 light:disabled:text-slate-400">
                    {testingId === channel.id && <motion.span initial={{
                scale: 0.6,
                opacity: 0.8
              }} animate={{
                scale: 2.4,
                opacity: 0
              }} transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: "easeOut"
              }} className="absolute -left-1 h-2 w-2 rounded-full bg-cyan-400" />}
                    <span className="relative h-2 w-2 rounded-full bg-cyan-400/70" />
                    {testingId === channel.id ? "Sending…" : "Send Test"}
                  </button>
                  {canDelete && <button onClick={() => handleDelete(channel.id, channel.name)} className="text-red-300 light:text-red-600 transition-colors hover:text-red-200">
                    Delete
                  </button>}
                </div>
              </motion.li>)}
          </ul>}
      </SpotlightCard>
    </div>;
}