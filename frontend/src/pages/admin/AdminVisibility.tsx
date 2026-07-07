import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllContentItems, updateContentItem } from "../../api/adminEndpoints";
import type { ContentItem } from "../../api/types";

const PAGE_LABELS: Record<string, string> = {
  landing: "Landing",
  platform: "Platform",
  solutions: "Solutions",
  pricing: "Pricing",
  company: "Company",
  support: "Support",
  cybersachet: "CyberSachet",
};

function Toggle({ on, disabled, onChange }: { on: boolean; disabled: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={disabled}
      aria-pressed={on}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-emerald-400" : "bg-white/15"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function SectionRow({ sectionKey, items }: { sectionKey: string; items: ContentItem[] }) {
  const queryClient = useQueryClient();
  const shown = items.filter((i) => i.isPublished).length;
  const visible = shown > 0;

  const mutation = useMutation({
    // Toggle every item in the section at once so a section shows/hides as a unit.
    mutationFn: (next: boolean) => Promise.all(items.map((item) => updateContentItem(item.id, { isPublished: next }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-content"] }),
  });

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium capitalize text-white">{sectionKey.replace(/_/g, " ")}</p>
        <p className="text-xs text-white/45">
          {shown}/{items.length} item{items.length === 1 ? "" : "s"} shown
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium ${visible ? "text-emerald-300" : "text-white/40"}`}>
          {mutation.isPending ? "Saving…" : visible ? "Visible" : "Hidden"}
        </span>
        <Toggle on={visible} disabled={mutation.isPending} onChange={(next) => mutation.mutate(next)} />
      </div>
    </div>
  );
}

export default function AdminVisibility() {
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useQuery({ queryKey: ["admin-content"], queryFn: () => fetchAllContentItems() });

  const grouped = useMemo(() => {
    const byPage = new Map<string, Map<string, ContentItem[]>>();
    for (const item of items ?? []) {
      if (!byPage.has(item.pageSlug)) byPage.set(item.pageSlug, new Map());
      const bySection = byPage.get(item.pageSlug)!;
      if (!bySection.has(item.sectionKey)) bySection.set(item.sectionKey, []);
      bySection.get(item.sectionKey)!.push(item);
    }
    return byPage;
  }, [items]);

  const pageMutation = useMutation({
    mutationFn: ({ pageItems, next }: { pageItems: ContentItem[]; next: boolean }) =>
      Promise.all(pageItems.map((item) => updateContentItem(item.id, { isPublished: next }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-content"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Site Visibility</h1>
        <p className="text-sm text-white/50">
          Show or hide entire sections of the public site. Hidden sections disappear from the live pages immediately — no
          deploy needed. Edit the actual text in the Content Manager.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : (
        Array.from(grouped.entries()).map(([pageSlug, sections]) => {
          const pageItems = Array.from(sections.values()).flat();
          const anyShown = pageItems.some((i) => i.isPublished);
          return (
            <div key={pageSlug} className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-lg font-medium text-white">{PAGE_LABELS[pageSlug] ?? pageSlug}</h2>
                <button
                  onClick={() => pageMutation.mutate({ pageItems, next: !anyShown })}
                  disabled={pageMutation.isPending}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  {anyShown ? "Hide entire page" : "Show entire page"}
                </button>
              </div>
              <div className="space-y-2">
                {Array.from(sections.entries()).map(([sectionKey, sectionItems]) => (
                  <SectionRow key={sectionKey} sectionKey={sectionKey} items={sectionItems} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
