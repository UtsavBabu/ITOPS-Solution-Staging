import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchStatusPageSettings, updateStatusPageSettings } from "../api/endpoints";
export function StatusPageCard() {
  const queryClient = useQueryClient();
  const {
    data: settings,
    isLoading
  } = useQuery({
    queryKey: ["status-page-settings"],
    queryFn: fetchStatusPageSettings
  });
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Sync local form state once settings load.
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setSlug(settings.slug ?? "");
      setTitle(settings.title ?? "");
    }
  }, [settings]);
  const mutation = useMutation({
    mutationFn: () => updateStatusPageSettings({
      enabled,
      slug: slug.trim() || null,
      title: title.trim() || null
    }),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      queryClient.invalidateQueries({
        queryKey: ["status-page-settings"]
      });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: err => {
      setSaved(false);
      setError(err instanceof Error ? err.message : "Failed to save status page settings");
    }
  });
  function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  }
  const publicUrl = settings?.enabled && settings.slug ? `${window.location.origin}/status/${settings.slug}` : null;
  return <div className="overflow-hidden rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white light:text-slate-900">Public Status Page</h2>
        <p className="mt-0.5 text-xs text-white/45 light:text-slate-400">
          Publish a live, shareable page showing the current status of your monitors. Internal URLs are never exposed —
          only the service name and up/down status.
        </p>
      </div>

      {isLoading ? <p className="p-4 text-sm text-white/50 light:text-slate-500">Loading…</p> : <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4 rounded border-white/20 light:border-slate-900/25 bg-black/40 light:bg-slate-900/[0.03] accent-white" />
            <span className="text-white/80 light:text-slate-700">Enable public status page</span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70 light:text-slate-600">Page URL</span>
              <div className="flex items-center rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] focus-within:border-white/40">
                <span className="pl-3 text-sm text-white/40 light:text-slate-400">/status/</span>
                <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="acme-corp" disabled={!enabled} className="w-full bg-transparent px-1 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:outline-none disabled:opacity-50" />
              </div>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70 light:text-slate-600">Page title (optional)</span>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Acme Corp Status" disabled={!enabled} className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none disabled:opacity-50" />
            </label>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={mutation.isPending} className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60">
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-sm text-emerald-300">Saved.</span>}
            {publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-white/70 light:text-slate-600 underline-offset-4 hover:text-white light:hover:text-slate-900 hover:underline">
                View live page →
              </a>}
          </div>
        </form>}
    </div>;
}