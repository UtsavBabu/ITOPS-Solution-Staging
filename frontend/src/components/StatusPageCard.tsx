import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchStatusPageSettings, updateStatusPageSettings } from "../api/endpoints";

export function StatusPageCard() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["status-page-settings"], queryFn: fetchStatusPageSettings });

  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    mutationFn: () => updateStatusPageSettings({ enabled, slug: slug.trim() || null, title: title.trim() || null }),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["status-page-settings"] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err: unknown) => {
      setSaved(false);
      setError(err instanceof Error ? err.message : "Failed to save status page settings");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  }

  const publicUrl = settings?.enabled && settings.slug ? `${window.location.origin}/status/${settings.slug}` : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white">Public Status Page</h2>
        <p className="mt-0.5 text-xs text-white/45">
          Publish a live, shareable page showing the current status of your monitors. Internal URLs are never exposed —
          only the service name and up/down status.
        </p>
      </div>

      {isLoading ? (
        <p className="p-4 text-sm text-white/50">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-white"
            />
            <span className="text-white/80">Enable public status page</span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70">Page URL</span>
              <div className="flex items-center rounded-lg border border-white/15 bg-black/40 focus-within:border-white/40">
                <span className="pl-3 text-sm text-white/40">/status/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="acme-corp"
                  disabled={!enabled}
                  className="w-full bg-transparent px-1 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
                />
              </div>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70">Page title (optional)</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Acme Corp Status"
                disabled={!enabled}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none disabled:opacity-50"
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-sm text-emerald-300">Saved.</span>}
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">
                View live page →
              </a>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
