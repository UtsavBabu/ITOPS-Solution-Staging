import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllContentItems, updateContentItem } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { useToast } from "../../components/Toast";
import { ErrorState } from "../../components/EmptyState";
const PAGE_LABELS = {
  landing: "Landing",
  platform: "Platform",
  solutions: "Solutions",
  pricing: "Pricing",
  company: "Company",
  support: "Support",
  cybersachet: "CyberSachet"
};
function Toggle({
  on,
  disabled,
  onChange
}) {
  return <button onClick={() => onChange(!on)} disabled={disabled} aria-pressed={on} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${on ? "bg-emerald-400 shadow-[0_0_12px_1px_rgba(52,211,153,0.5)]" : "bg-white/15"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform duration-300 ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>;
}
function SectionRow({
  sectionKey,
  items
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const shown = items.filter(i => i.isPublished).length;
  const visible = shown > 0;
  const mutation = useMutation({
    // Toggle every item in the section at once so a section shows/hides as a unit.
    mutationFn: next => Promise.all(items.map(item => updateContentItem(item.id, {
      isPublished: next
    }))),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["admin-content"]
    }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update visibility.")
  });
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 light:border-slate-900/10 bg-black/30 light:bg-slate-900/[0.02] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium capitalize text-white light:text-slate-900">{sectionKey.replace(/_/g, " ")}</p>
        <p className="text-xs text-white/45 light:text-slate-400">
          {shown}/{items.length} item{items.length === 1 ? "" : "s"} shown
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium ${visible ? "text-emerald-300" : "text-white/40 light:text-slate-400"}`}>
          {mutation.isPending ? "Saving…" : visible ? "Visible" : "Hidden"}
        </span>
        <Toggle on={visible} disabled={mutation.isPending} onChange={next => mutation.mutate(next)} />
      </div>
    </div>;
}
export default function AdminVisibility() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const {
    data: items,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => fetchAllContentItems()
  });
  const grouped = useMemo(() => {
    const byPage = new Map();
    for (const item of items ?? []) {
      if (!byPage.has(item.pageSlug)) byPage.set(item.pageSlug, new Map());
      const bySection = byPage.get(item.pageSlug);
      if (!bySection.has(item.sectionKey)) bySection.set(item.sectionKey, []);
      bySection.get(item.sectionKey).push(item);
    }
    return byPage;
  }, [items]);
  const pageMutation = useMutation({
    mutationFn: ({
      pageItems,
      next
    }) => Promise.all(pageItems.map(item => updateContentItem(item.id, {
      isPublished: next
    }))),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["admin-content"]
    }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update page visibility.")
  });
  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Site Visibility</h1>
        <p className="text-sm text-white/50 light:text-slate-500">
          Show or hide entire sections of the public site. Hidden sections disappear from the live pages immediately — no
          deploy needed. Edit the actual text in the Content Manager.
        </p>
      </Reveal>

      {isError ? <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white">
          <ErrorState message="Couldn't load site content." onRetry={() => refetch()} />
        </div> : isLoading ? <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-shimmer rounded-2xl bg-[linear-gradient(110deg,rgba(255,255,255,0.04)_8%,rgba(251,191,36,0.07)_18%,rgba(255,255,255,0.04)_33%)] bg-[length:200%_100%]" />)}
        </div> : Array.from(grouped.entries()).map(([pageSlug, sections], pi) => {
      const pageItems = Array.from(sections.values()).flat();
      const anyShown = pageItems.some(item => item.isPublished);
      return <SpotlightCard key={pageSlug} className="p-5" delay={pi * 0.04} tint="amber">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-lg font-medium text-white light:text-slate-900">{PAGE_LABELS[pageSlug] ?? pageSlug}</h2>
                <button onClick={() => pageMutation.mutate({
            pageItems,
            next: !anyShown
          })} disabled={pageMutation.isPending} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 light:text-slate-600 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5 hover:text-white light:hover:text-slate-900 disabled:opacity-50">
                  {anyShown ? "Hide entire page" : "Show entire page"}
                </button>
              </div>
              <div className="space-y-2">
                {Array.from(sections.entries()).map(([sectionKey, sectionItems]) => <SectionRow key={sectionKey} sectionKey={sectionKey} items={sectionItems} />)}
              </div>
            </SpotlightCard>;
    })}
    </div>;
}