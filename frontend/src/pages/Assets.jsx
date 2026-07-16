import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { createAsset, deleteAsset, fetchAssets } from "../api/endpoints";
import { Reveal, SpotlightCard } from "../components/Animated";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
const EASE = [0.16, 1, 0.3, 1];
const MANUAL_TYPES = ["SERVER", "DATABASE", "OTHER"];
export default function Assets() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const {
    data: assets,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["assets"],
    queryFn: fetchAssets
  });
  const [type, setType] = useState("SERVER");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [formError, setFormError] = useState(null);
  const createMutation = useMutation({
    mutationFn: () => createAsset({
      type,
      name,
      identifier,
      tags: []
    }),
    onSuccess: () => {
      setName("");
      setIdentifier("");
      queryClient.invalidateQueries({
        queryKey: ["assets"]
      });
    },
    onError: err => {
      setFormError(err instanceof Error ? err.message : "Failed to create asset");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: id => deleteAsset(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["assets"]
    })
  });
  function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }
  async function handleDelete(id, name) {
    const ok = await confirm({
      title: `Delete asset "${name}"?`,
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Deleted "${name}".`),
      onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete asset.")
    });
  }
  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Asset Inventory</h1>
        <p className="text-sm text-white/50 light:text-slate-500">
          Websites are added automatically from the Monitors page. Use this form for other infrastructure you want to track
          (servers, databases, etc.) — monitoring for those asset types isn't implemented yet.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white p-4">
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Type</span>
          <select value={type} onChange={e => setType(e.target.value)} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 focus:border-white/40 focus:outline-none">
            {MANUAL_TYPES.map(t => <option key={t} value={t}>
                {t}
              </option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Name</span>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="db-primary-01" className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none" />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Identifier (IP / Hostname)</span>
          <input required value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="10.0.0.5" className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none" />
        </label>
        <button type="submit" disabled={createMutation.isPending} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60">
          {createMutation.isPending ? "Adding…" : "Add Asset"}
        </button>
        {formError && <p className="w-full text-sm text-red-300">{formError}</p>}
      </form>
      </Reveal>

      <SpotlightCard className="overflow-hidden" delay={0.1} scan tint="amber">
        {isError ? <ErrorState message="Couldn't load assets." onRetry={() => refetch()} /> : isLoading ? <SkeletonRows count={4} /> : !assets || assets.length === 0 ? <EmptyState title="No assets yet." description="Add infrastructure above, or connect a monitor to auto-track it." /> : <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Identifier</th>
                <th className="px-4 py-2">Added</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {assets.map((asset, i) => <motion.tr key={asset.id} initial={{
            opacity: 0,
            y: 6
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.3,
            delay: i * 0.03,
            ease: EASE
          }} className="transition-colors hover:bg-white/[0.02] light:hover:bg-slate-900/[0.02]">
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{asset.type}</td>
                  <td className="px-4 py-3 font-medium text-white light:text-slate-900">{asset.name}</td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{asset.identifier}</td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{new Date(asset.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {/* Monitor-backed assets are managed from the Monitors page; only
                        manually-added infrastructure gets a delete button here. */}
                    {!asset.monitor && <button onClick={() => handleDelete(asset.id, asset.name)} className="text-red-300 light:text-red-600 transition-colors hover:underline">
                        Delete
                      </button>}
                  </td>
                </motion.tr>)}
            </tbody>
          </table>}
      </SpotlightCard>
    </div>;
}