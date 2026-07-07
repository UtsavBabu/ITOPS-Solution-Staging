import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAsset, deleteAsset, fetchAssets } from "../api/endpoints";
import type { AssetType } from "../api/types";

const MANUAL_TYPES: AssetType[] = ["SERVER", "DATABASE", "OTHER"];

export default function Assets() {
  const queryClient = useQueryClient();
  const { data: assets, isLoading } = useQuery({ queryKey: ["assets"], queryFn: fetchAssets });

  const [type, setType] = useState<AssetType>("SERVER");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => createAsset({ type, name, identifier, tags: [] }),
    onSuccess: () => {
      setName("");
      setIdentifier("");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : "Failed to create asset");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium tracking-tight text-white">Asset Inventory</h1>
      <p className="text-sm text-white/50">
        Websites are added automatically from the Monitors page. Use this form for other infrastructure you want to track
        (servers, databases, etc.) — monitoring for those asset types isn't implemented yet.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AssetType)}
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
          >
            {MANUAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="db-primary-01"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-white/70">Identifier (IP / Hostname)</span>
          <input
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="10.0.0.5"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
        >
          {createMutation.isPending ? "Adding…" : "Add Asset"}
        </button>
        {formError && <p className="w-full text-sm text-red-300">{formError}</p>}
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : !assets || assets.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No assets yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Identifier</th>
                <th className="px-4 py-2">Added</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-4 py-3 text-white/50">{asset.type}</td>
                  <td className="px-4 py-3 font-medium text-white">{asset.name}</td>
                  <td className="px-4 py-3 text-white/50">{asset.identifier}</td>
                  <td className="px-4 py-3 text-white/50">{new Date(asset.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {/* Monitor-backed assets are managed from the Monitors page; only
                        manually-added infrastructure gets a delete button here. */}
                    {!asset.monitor && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete asset "${asset.name}"?`)) deleteMutation.mutate(asset.id);
                        }}
                        className="text-red-300 hover:underline"
                      >
                        Delete
                      </button>
                    )}
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
