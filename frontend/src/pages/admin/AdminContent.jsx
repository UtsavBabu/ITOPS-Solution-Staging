import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { createContentItem, deleteContentItem, fetchAllContentItems, updateContentItem, uploadPublicImage } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { useToast } from "../../components/Toast";
import { ErrorState } from "../../components/EmptyState";
const EASE = [0.16, 1, 0.3, 1];
const fieldInputClass = "w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1.5 text-xs text-white light:text-slate-900 focus:border-white/40 focus:outline-none";
const fieldLabelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/35 light:text-slate-400";
// Compact inline labels above each control — placeholder text alone reads
// fine on an empty field, but once real content fills it in (a course
// title, a roadmap item's title) there's no way to tell what any field is
// without clearing it first.
function LabeledInput({ label, className = "", inputClassName = "", ...props }) {
  return <label className={`block ${className}`}>
      <span className={fieldLabelClass}>{label}</span>
      <input className={`${fieldInputClass} ${inputClassName}`} {...props} />
    </label>;
}
function LabeledTextarea({ label, className = "", ...props }) {
  return <label className={`block ${className}`}>
      <span className={fieldLabelClass}>{label}</span>
      <textarea className={fieldInputClass} {...props} />
    </label>;
}
const PAGE_LABELS = {
  landing: "Landing",
  platform: "Platform",
  solutions: "Solutions",
  pricing: "Pricing",
  company: "Company",
  support: "Support",
  cybersachet: "CyberSachet"
};
function CapabilitiesEditor({
  capabilities,
  onChange
}) {
  function updateRow(index, patch) {
    onChange(capabilities.map((cap, i) => i === index ? {
      ...cap,
      ...patch
    } : cap));
  }
  function removeRow(index) {
    onChange(capabilities.filter((_, i) => i !== index));
  }
  function addRow() {
    onChange([...capabilities, {
      title: "",
      detail: "",
      status: "roadmap"
    }]);
  }
  return <div className="mt-3 space-y-2 border-t border-white/10 light:border-slate-900/10 pt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Capabilities</p>
      {capabilities.map((cap, i) => <div key={i} className="flex flex-wrap items-end gap-2">
          <LabeledInput label="Title" value={cap.title} onChange={e => updateRow(i, {
        title: e.target.value
      })} className="w-48" />
          <LabeledInput label="Detail" value={cap.detail} onChange={e => updateRow(i, {
        detail: e.target.value
      })} className="flex-1" />
          <label className="block">
            <span className={fieldLabelClass}>Status</span>
            <select value={cap.status} onChange={e => updateRow(i, {
        status: e.target.value
      })} className={fieldInputClass}>
              <option value="live">live</option>
              <option value="roadmap">roadmap</option>
            </select>
          </label>
          <button onClick={() => removeRow(i)} className="pb-2 text-xs text-red-300 light:text-red-600 hover:text-red-200">
            Remove
          </button>
        </div>)}
      <button onClick={addRow} className="text-xs text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900">
        + Add capability
      </button>
    </div>;
}
function ItemEditor({
  item,
  isFirst,
  isLast
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(item.title);
  const [subtitle, setSubtitle] = useState(item.subtitle ?? "");
  const [body, setBody] = useState(item.body ?? "");
  const [status, setStatus] = useState(item.status ?? "");
  const [href, setHref] = useState(item.href ?? "");
  const [imageUrl, setImageUrl] = useState(typeof item.metadata?.imageUrl === "string" ? item.metadata.imageUrl : "");
  const [isPublished, setIsPublished] = useState(item.isPublished);
  const [capabilities, setCapabilities] = useState(Array.isArray(item.metadata?.capabilities) ? item.metadata.capabilities : []);
  const hasCapabilities = item.sectionKey === "solutions";
  // Leadership/team cards render a profile picture from metadata.imageUrl.
  const hasImage = item.sectionKey === "leadership" || item.sectionKey === "team";
  const saveMutation = useMutation({
    mutationFn: () => {
      const metadata = {
        ...item.metadata
      };
      if (hasCapabilities) metadata.capabilities = capabilities;
      if (hasImage) {
        if (imageUrl.trim()) metadata.imageUrl = imageUrl.trim();else delete metadata.imageUrl;
      }
      return updateContentItem(item.id, {
        title,
        subtitle: subtitle || null,
        body: body || null,
        status: status || null,
        href: href || null,
        isPublished,
        metadata
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-content"]
      });
      toast.success("Saved.");
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to save item.")
  });
  const fileInputRef = useRef(null);

  // Persist the current fields with a specific image URL (used right after an
  // upload finishes, and by Remove — no second "Save" click needed).
  function saveWithImage(url) {
    const metadata = {
      ...item.metadata
    };
    if (hasCapabilities) metadata.capabilities = capabilities;
    if (url.trim()) metadata.imageUrl = url.trim();else delete metadata.imageUrl;
    return updateContentItem(item.id, {
      title,
      subtitle: subtitle || null,
      body: body || null,
      status: status || null,
      href: href || null,
      isPublished,
      metadata
    });
  }
  const uploadMutation = useMutation({
    mutationFn: async file => {
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
      const url = await uploadPublicImage(file);
      setImageUrl(url);
      await saveWithImage(url);
    },
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["admin-content"]
    })
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteContentItem(item.id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["admin-content"]
    }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete item.")
  });
  const moveMutation = useMutation({
    mutationFn: newSortOrder => updateContentItem(item.id, {
      sortOrder: newSortOrder
    }),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["admin-content"]
    }),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to reorder item.")
  });
  return <motion.div layout initial={{
    opacity: 0,
    y: 8
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.3,
    ease: EASE
  }} className="rounded-xl border border-white/10 light:border-slate-900/10 bg-black/30 light:bg-slate-900/[0.02] p-4">
      <div className="flex flex-wrap items-end gap-2">
        <LabeledInput label="Title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" inputClassName="text-sm font-medium" />
        <button onClick={() => moveMutation.mutate(item.sortOrder - 1)} disabled={isFirst || moveMutation.isPending} aria-label="Move up" className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/60 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900 disabled:opacity-30 disabled:hover:text-white/60 light:hover:text-slate-500">
          ↑
        </button>
        <button onClick={() => moveMutation.mutate(item.sortOrder + 1)} disabled={isLast || moveMutation.isPending} aria-label="Move down" className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/60 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900 disabled:opacity-30 disabled:hover:text-white/60 light:hover:text-slate-500">
          ↓
        </button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <LabeledInput label="Subtitle (optional)" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
        <LabeledInput label="Status (e.g. live/roadmap)" value={status} onChange={e => setStatus(e.target.value)} />
        <LabeledInput label="Link (optional)" value={href} onChange={e => setHref(e.target.value)} />
      </div>

      <LabeledTextarea label="Body / description" value={body} onChange={e => setBody(e.target.value)} rows={2} className="mt-2" />

      {hasImage && <div className="mt-2 flex items-center gap-3 border-t border-white/10 light:border-slate-900/10 pt-3">
          {imageUrl.trim() ? <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-full border border-white/15 light:border-slate-900/15 object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 light:border-slate-900/20 bg-white/5 light:bg-slate-900/[0.03] text-[10px] text-white/40 light:text-slate-400">
              No photo
            </div>}
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={e => {
        const file = e.target.files?.[0];
        if (file) uploadMutation.mutate(file);
        e.target.value = "";
      }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 light:text-slate-700 transition-colors hover:bg-white/10 disabled:opacity-50">
            {uploadMutation.isPending ? "Uploading…" : imageUrl ? "Change photo" : "Upload photo"}
          </button>
          {imageUrl && <button type="button" onClick={() => {
        setImageUrl("");
        saveWithImage("");
      }} className="text-xs text-red-300 light:text-red-600 hover:underline">
              Remove
            </button>}
          {uploadMutation.isSuccess && <span className="text-xs text-emerald-300">Photo saved ✓</span>}
          {uploadMutation.isError && <span className="text-xs text-red-300">
              {uploadMutation.error instanceof Error ? uploadMutation.error.message : "Upload failed"}
            </span>}
        </div>}

      {hasCapabilities && <CapabilitiesEditor capabilities={capabilities} onChange={setCapabilities} />}

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-white/60 light:text-slate-500">
          <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
          Published
        </label>
        <div className="flex gap-2">
          <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-300 light:text-red-600 hover:bg-red-400/10 disabled:opacity-50">
            Delete
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300 disabled:opacity-50">
            {saveMutation.isPending ? "Saving…" : saveMutation.isSuccess ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </motion.div>;
}
function NewItemForm({
  pageSlug,
  sectionKey,
  nextSortOrder
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const mutation = useMutation({
    mutationFn: () => createContentItem({
      pageSlug,
      sectionKey,
      sortOrder: nextSortOrder,
      title,
      isPublished: true
    }),
    onSuccess: () => {
      setTitle("");
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["admin-content"]
      });
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to create item.")
  });
  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-xs text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900">
        + Add item to this section
      </button>;
  }
  return <div className="flex items-end gap-2">
      <LabeledInput label="Title for new item" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" />
      <button onClick={() => title.trim() && mutation.mutate()} disabled={mutation.isPending} className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300 disabled:opacity-50">
        Create
      </button>
      <button onClick={() => setOpen(false)} className="pb-1.5 text-xs text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
        Cancel
      </button>
    </div>;
}
export default function AdminContent() {
  const {
    data: items,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => fetchAllContentItems()
  });
  const [selectedPage, setSelectedPage] = useState("all");
  const grouped = useMemo(() => {
    const filtered = (items ?? []).filter(item => selectedPage === "all" || item.pageSlug === selectedPage);
    const byPage = new Map();
    for (const item of filtered) {
      if (!byPage.has(item.pageSlug)) byPage.set(item.pageSlug, new Map());
      const bySection = byPage.get(item.pageSlug);
      if (!bySection.has(item.sectionKey)) bySection.set(item.sectionKey, []);
      bySection.get(item.sectionKey).push(item);
    }
    return byPage;
  }, [items, selectedPage]);
  const pages = useMemo(() => Array.from(new Set((items ?? []).map(i => i.pageSlug))).sort(), [items]);
  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Content Manager</h1>
        <p className="text-sm text-white/50 light:text-slate-500">
          Every editable section across the marketing site. Changes here are live immediately — no deploy needed.
        </p>
      </Reveal>

      <Reveal delay={0.05} className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedPage("all")} className={`rounded-full px-3 py-1.5 text-sm ${selectedPage === "all" ? "bg-amber-400 text-black" : "border border-white/15 text-white/60 light:text-slate-500"}`}>
          All pages
        </button>
        {pages.map(page => <button key={page} onClick={() => setSelectedPage(page)} className={`rounded-full px-3 py-1.5 text-sm ${selectedPage === page ? "bg-amber-400 text-black" : "border border-white/15 text-white/60 light:text-slate-500"}`}>
            {PAGE_LABELS[page] ?? page}
          </button>)}
      </Reveal>

      {isError ? <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white">
          <ErrorState message="Couldn't load site content." onRetry={() => refetch()} />
        </div> : isLoading ? <div className="space-y-2">
          {Array.from({
        length: 3
      }).map((_, i) => <div key={i} className="h-24 animate-shimmer rounded-2xl bg-[linear-gradient(110deg,rgba(255,255,255,0.04)_8%,rgba(251,191,36,0.07)_18%,rgba(255,255,255,0.04)_33%)] bg-[length:200%_100%]" />)}
        </div> : Array.from(grouped.entries()).map(([pageSlug, sections], pi) => <Reveal key={pageSlug} delay={0.1 + pi * 0.03} className="space-y-4">
            <h2 className="text-lg font-medium text-white light:text-slate-900">{PAGE_LABELS[pageSlug] ?? pageSlug}</h2>
            {Array.from(sections.entries()).map(([sectionKey, sectionItems]) => <SpotlightCard key={sectionKey} className="p-5" tint="amber">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-white/45 light:text-slate-400">{sectionKey.replace(/_/g, " ")}</h3>
                <div className="space-y-3">
                  {sectionItems.map((item, ii) => <ItemEditor key={item.id} item={item} isFirst={ii === 0} isLast={ii === sectionItems.length - 1} />)}
                  <NewItemForm pageSlug={pageSlug} sectionKey={sectionKey} nextSortOrder={sectionItems.length ? Math.max(...sectionItems.map(i => i.sortOrder)) + 1 : 0} />
                </div>
              </SpotlightCard>)}
          </Reveal>)}
    </div>;
}