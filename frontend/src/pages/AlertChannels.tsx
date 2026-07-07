import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAlertChannel, deleteAlertChannel, fetchAlertChannels, testAlertChannel } from "../api/endpoints";
import type { AlertChannelType } from "../api/types";

const CONFIG_FIELD: Record<AlertChannelType, { key: string; label: string; placeholder: string }> = {
  EMAIL: { key: "to", label: "Recipient Email", placeholder: "ops@example.com" },
  SLACK: { key: "webhookUrl", label: "Slack Incoming Webhook URL", placeholder: "https://hooks.slack.com/services/…" },
  WEBHOOK: { key: "url", label: "Webhook URL", placeholder: "https://example.com/hooks/itops" },
};

export default function AlertChannels() {
  const queryClient = useQueryClient();
  const { data: channels, isLoading } = useQuery({ queryKey: ["alert-channels"], queryFn: fetchAlertChannels });

  const [type, setType] = useState<AlertChannelType>("EMAIL");
  const [name, setName] = useState("");
  const [configValue, setConfigValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const field = CONFIG_FIELD[type];

  const createMutation = useMutation({
    mutationFn: () => createAlertChannel({ type, name, config: { [field.key]: configValue } }),
    onSuccess: () => {
      setName("");
      setConfigValue("");
      queryClient.invalidateQueries({ queryKey: ["alert-channels"] });
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : "Failed to create channel");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAlertChannel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-channels"] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => testAlertChannel(id),
    onSuccess: () => setTestMessage("Test alert sent."),
    onError: () => setTestMessage("Failed to send test alert — check the channel configuration."),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium tracking-tight text-white">Alert Channels</h1>
      <p className="text-sm text-white/50">Channels fire on monitor down/up, and SSL certificates expiring within 14 days.</p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70">Type</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as AlertChannelType);
              setConfigValue("");
            }}
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
          >
            <option value="EMAIL">Email</option>
            <option value="SLACK">Slack</option>
            <option value="WEBHOOK">Webhook</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="On-call team"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70">{field.label}</span>
          <input
            required
            value={configValue}
            onChange={(e) => setConfigValue(e.target.value)}
            placeholder={field.placeholder}
            className="w-72 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
        >
          {createMutation.isPending ? "Adding…" : "Add Channel"}
        </button>
        {formError && <p className="w-full text-sm text-red-300">{formError}</p>}
      </form>

      {testMessage && <p className="text-sm text-white/70">{testMessage}</p>}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : !channels || channels.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No alert channels configured yet.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {channels.map((channel) => (
              <li key={channel.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">
                    {channel.name} <span className="text-white/40">({channel.type})</span>
                  </p>
                  <p className="text-white/50">{Object.values(channel.config)[0]}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => testMutation.mutate(channel.id)} className="text-white/70 hover:text-white">
                    Send Test
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete channel "${channel.name}"?`)) deleteMutation.mutate(channel.id);
                    }}
                    className="text-red-300 hover:text-red-200"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
