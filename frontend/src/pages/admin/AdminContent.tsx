import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContentItem, deleteContentItem, fetchAllContentItems, updateContentItem, uploadPublicImage } from "../../api/adminEndpoints";
import type { ContentItem, SolutionCapability } from "../../api/types";

const PAGE_LABELS: Record<string, string> = {
  landing: "Landing",
  platform: "Platform",
  solutions: "Solutions",
  pricing: "Pricing",
  company: "Company",
  support: "Support",
  cybersachet: "CyberSachet",
};

function CapabilitiesEditor({
  capabilities,
  onChange,
}: {
  capabilities: SolutionCapability[];
  onChange: (next: SolutionCapability[]) => void;
}) {
  function updateRow(index: number, patch: Partial<SolutionCapability>) {
    onChange(capabilities.map((cap, i) => (i === index ? { ...cap, ...patch } : cap)));
  }
  function removeRow(index: number) {
    onChange(capabilities.filter((_, i) => i !== index));
  }
  function addRow() {
    onChange([...capabilities, { title: "", detail: "", status: "roadmap" }]);
  }

  return (
    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-white/40">Capabilities</p>
      {capabilities.map((cap, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            value={cap.title}
            onChange={(e) => updateRow(i, { title: e.target.value })}
            placeholder="Title"
            className="w-48 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
          />
          <input
            value={cap.detail}
            onChange={(e) => updateRow(i, { detail: e.target.value })}
            placeholder="Detail"
            className="flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
          />
          <select
            value={cap.status}
            onChange={(e) => updateRow(i, { status: e.target.value as "live" | "roadmap" })}
            className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
          >
            <option value="live">live</option>
            <option value="roadmap">roadmap</option>
          </select>
          <button onClick={() => removeRow(i)} className="text-xs text-red-300 hover:text-red-200">
            Remove
          </button>
        </div>
      ))}
      <button onClick={addRow} className="text-xs text-white/60 hover:text-white">
        + Add capability
      </button>
    </div>
  );
}

function ItemEditor({ item }: { item: ContentItem }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item.title);
  const [subtitle, setSubtitle] = useState(item.subtitle ?? "");
  const [body, setBody] = useState(item.body ?? "");
  const [status, setStatus] = useState(item.status ?? "");
  const [href, setHref] = useState(item.href ?? "");
  const [imageUrl, setImageUrl] = useState(typeof item.metadata?.imageUrl === "string" ? (item.metadata.imageUrl as string) : "");
  const [isPublished, setIsPublished] = useState(item.isPublished);
  const [capabilities, setCapabilities] = useState<SolutionCapability[]>(
    Array.isArray(item.metadata?.capabilities) ? (item.metadata.capabilities as SolutionCapability[]) : [],
  );

  const hasCapabilities = item.sectionKey === "solutions";
  // Leadership/team cards render a profile picture from metadata.imageUrl.
  const hasImage = item.sectionKey === "leadership" || item.sectionKey === "team";

  const saveMutation = useMutation({
    mutationFn: () => {
      const metadata: Record<string, unknown> = { ...item.metadata };
      if (hasCapabilities) metadata.capabilities = capabilities;
      if (hasImage) {
        if (imageUrl.trim()) metadata.imageUrl = imageUrl.trim();
        else delete metadata.imageUrl;
      }
      return updateContentItem(item.id, {
        title,
        subtitle: subtitle || null,
        body: body || null,
        status: status || null,
        href: href || null,
        isPublished,
        metadata,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-content"] }),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist the current fields with a specific image URL (used right after an
  // upload finishes, and by Remove — no second "Save" click needed).
  function saveWithImage(url: string) {
    const metadata: Record<string, unknown> = { ...item.metadata };
    if (hasCapabilities) metadata.capabilities = capabilities;
    if (url.trim()) metadata.imageUrl = url.trim();
    else delete metadata.imageUrl;
    return updateContentItem(item.id, {
      title,
      subtitle: subtitle || null,
      body: body || null,
      status: status || null,
      href: href || null,
      isPublished,
      metadata,
    });
  }

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
      const url = await uploadPublicImage(file);
      setImageUrl(url);
      await saveWithImage(url);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-content"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContentItem(item.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-content"] }),
  });

  const moveMutation = useMutation({
    mutationFn: (newSortOrder: number) => updateContentItem(item.id, { sortOrder: newSortOrder }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-content"] }),
  });

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-start gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm font-medium text-white focus:border-white/40 focus:outline-none"
        />
        <button onClick={() => moveMutation.mutate(item.sortOrder - 1)} className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/60 hover:text-white">
          ↑
        </button>
        <button onClick={() => moveMutation.mutate(item.sortOrder + 1)} className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/60 hover:text-white">
          ↓
        </button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Subtitle (optional)"
          className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="Status (e.g. live/roadmap)"
            className="w-1/2 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
          />
          <input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="Link (optional)"
            className="w-1/2 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
          />
        </div>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Body / description"
        rows={2}
        className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
      />

      {hasImage && (
        <div className="mt-2 flex items-center gap-3 border-t border-white/10 pt-3">
          {imageUrl.trim() ? (
            <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-full border border-white/15 object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/5 text-[10px] text-white/40">
              No photo
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {uploadMutation.isPending ? "Uploading…" : imageUrl ? "Change photo" : "Upload photo"}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => {
                setImageUrl("");
                saveWithImage("");
              }}
              className="text-xs text-red-300 hover:underline"
            >
              Remove
            </button>
          )}
          {uploadMutation.isSuccess && <span className="text-xs text-emerald-300">Photo saved ✓</span>}
          {uploadMutation.isError && (
            <span className="text-xs text-red-300">
              {uploadMutation.error instanceof Error ? uploadMutation.error.message : "Upload failed"}
            </span>
          )}
        </div>
      )}

      {hasCapabilities && <CapabilitiesEditor capabilities={capabilities} onChange={setCapabilities} />}

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-white/60">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving…" : saveMutation.isSuccess ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewItemForm({ pageSlug, sectionKey, nextSortOrder }: { pageSlug: string; sectionKey: string; nextSortOrder: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createContentItem({
        pageSlug,
        sectionKey,
        sortOrder: nextSortOrder,
        title,
        isPublished: true,
      }),
    onSuccess: () => {
      setTitle("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-content"] });
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-white/60 hover:text-white">
        + Add item to this section
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title for new item"
        className="flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
      />
      <button
        onClick={() => title.trim() && mutation.mutate()}
        disabled={mutation.isPending}
        className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300 disabled:opacity-50"
      >
        Create
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-white/50 hover:text-white">
        Cancel
      </button>
    </div>
  );
}

export default function AdminContent() {
  const { data: items, isLoading } = useQuery({ queryKey: ["admin-content"], queryFn: () => fetchAllContentItems() });
  const [selectedPage, setSelectedPage] = useState<string>("all");

  const grouped = useMemo(() => {
    const filtered = (items ?? []).filter((item) => selectedPage === "all" || item.pageSlug === selectedPage);
    const byPage = new Map<string, Map<string, ContentItem[]>>();
    for (const item of filtered) {
      if (!byPage.has(item.pageSlug)) byPage.set(item.pageSlug, new Map());
      const bySection = byPage.get(item.pageSlug)!;
      if (!bySection.has(item.sectionKey)) bySection.set(item.sectionKey, []);
      bySection.get(item.sectionKey)!.push(item);
    }
    return byPage;
  }, [items, selectedPage]);

  const pages = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.pageSlug))).sort(), [items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-white">Content Manager</h1>
        <p className="text-sm text-white/50">
          Every editable section across the marketing site. Changes here are live immediately — no deploy needed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedPage("all")}
          className={`rounded-full px-3 py-1.5 text-sm ${selectedPage === "all" ? "bg-amber-400 text-black" : "border border-white/15 text-white/60"}`}
        >
          All pages
        </button>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => setSelectedPage(page)}
            className={`rounded-full px-3 py-1.5 text-sm ${selectedPage === page ? "bg-amber-400 text-black" : "border border-white/15 text-white/60"}`}
          >
            {PAGE_LABELS[page] ?? page}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : (
        Array.from(grouped.entries()).map(([pageSlug, sections]) => (
          <div key={pageSlug} className="space-y-4">
            <h2 className="text-lg font-medium text-white">{PAGE_LABELS[pageSlug] ?? pageSlug}</h2>
            {Array.from(sections.entries()).map(([sectionKey, sectionItems]) => (
              <div key={sectionKey} className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-white/45">{sectionKey.replace(/_/g, " ")}</h3>
                <div className="space-y-3">
                  {sectionItems.map((item) => (
                    <ItemEditor key={item.id} item={item} />
                  ))}
                  <NewItemForm
                    pageSlug={pageSlug}
                    sectionKey={sectionKey}
                    nextSortOrder={sectionItems.length ? Math.max(...sectionItems.map((i) => i.sortOrder)) + 1 : 0}
                  />
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
