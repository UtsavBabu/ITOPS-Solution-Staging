import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSound } from "../context/SoundContext";
const EASE = [0.16, 1, 0.3, 1];

function DetailField({ label, value, tone }) {
  if (!value) return null;
  return <div>
      <p className={`text-[10px] font-medium uppercase tracking-wide ${tone}`}>{label}</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-white/70 light:text-slate-600">{value}</p>
    </div>;
}

function DetailPanel({ node }) {
  const d = node.detail ?? {};
  return <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
      <div className="mt-3 space-y-3 rounded-xl border border-cyan-400/20 light:border-cyan-500/25 bg-cyan-400/[0.05] light:bg-cyan-50 p-4">
        <p className="text-sm font-medium text-white light:text-slate-900">{node.label}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Purpose" value={d.purpose} tone="text-cyan-300 light:text-cyan-700" />
          <DetailField label="Configuration" value={d.configuration} tone="text-violet-300 light:text-violet-700" />
          <DetailField label="Best practice" value={d.bestPractice} tone="text-emerald-300 light:text-emerald-700" />
          <DetailField label="Common mistake" value={d.commonMistake} tone="text-amber-300 light:text-amber-700" />
        </div>
      </div>
    </motion.div>;
}

function NodeButton({ node, active, hasChildrenOpen, onClick }) {
  return <button onClick={onClick} className={`group relative w-full rounded-xl border px-4 py-3 text-left transition-all duration-200 ${active ? "border-cyan-400/50 light:border-cyan-500/50 bg-cyan-400/10 light:bg-cyan-50" : "border-white/10 light:border-slate-900/10 bg-white/[0.03] light:bg-slate-900/[0.02] hover:border-white/25 light:hover:border-slate-900/20 hover:bg-white/[0.06] light:hover:bg-slate-900/[0.04]"}`}>
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-white light:text-slate-900">
          {node.icon && <span className={active ? "text-cyan-300" : "text-white/40 light:text-slate-400"} aria-hidden>{node.icon}</span>}
          {node.label}
        </span>
        {(node.children || node.detail) && <svg className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${active || hasChildrenOpen ? "rotate-90 text-cyan-300" : "text-white/30 light:text-slate-400"}`} viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      {node.summary && <p className="mt-1 text-xs text-white/45 light:text-slate-500">{node.summary}</p>}
    </button>;
}

// A clickable, real-content architecture diagram — a layer stack (Docker),
// a cluster hierarchy with sub-components (Kubernetes), a resource
// hierarchy (Azure), or an unordered grid of services. Every node's detail
// is drawn from the same real material already taught in the lesson (see
// data/interactiveDiagrams.js) — this is a visual restatement of real
// content, not a separate source of truth.
export function InteractiveDiagram({ diagram }) {
  const [selectedId, setSelectedId] = useState(null);
  const [openParentId, setOpenParentId] = useState(null);
  const { play } = useSound();
  if (!diagram || !diagram.nodes?.length) return null;

  function selectLeaf(node) {
    play("tick");
    setSelectedId(prev => prev === node.id ? null : node.id);
  }
  function clickParent(node) {
    play("tick");
    const willOpen = openParentId !== node.id;
    setOpenParentId(willOpen ? node.id : null);
    setSelectedId(willOpen ? node.id : (selectedId === node.id ? null : selectedId));
  }

  const allNodes = diagram.nodes.flatMap(n => n.children ? [n, ...n.children] : [n]);
  const selectedNode = allNodes.find(n => n.id === selectedId);
  const isGrid = diagram.layout === "grid";

  return <div className="glass mt-4 overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-white/10 light:border-slate-900/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-cyan-400/70" />
            <span className="h-2 w-2 rounded-full bg-violet-400/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          </span>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Interactive diagram</p>
        </div>
        <span className="text-[10px] text-white/30 light:text-slate-400">{diagram.caption ?? "Click a node to explore it"}</span>
      </div>
      <div className="p-3">
        <div className={isGrid ? "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {diagram.nodes.map((node, i) => <div key={node.id}>
              <div className="relative">
                {!isGrid && i > 0 && <span className="absolute -top-2 left-6 h-2 w-px bg-white/10 light:bg-slate-900/10" aria-hidden />}
                <NodeButton node={node} active={selectedId === node.id} hasChildrenOpen={openParentId === node.id} onClick={() => node.children ? clickParent(node) : selectLeaf(node)} />
              </div>
              {node.children && <AnimatePresence>
                  {openParentId === node.id && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
                      <div className="ml-4 mt-2 space-y-2 border-l border-white/10 light:border-slate-900/10 pl-4">
                        {node.children.map(child => <NodeButton key={child.id} node={child} active={selectedId === child.id} onClick={() => selectLeaf(child)} />)}
                      </div>
                    </motion.div>}
                </AnimatePresence>}
            </div>)}
        </div>
        <AnimatePresence mode="wait">
          {selectedNode?.detail && <DetailPanel key={selectedNode.id} node={selectedNode} />}
        </AnimatePresence>
      </div>
    </div>;
}
