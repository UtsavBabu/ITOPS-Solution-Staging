import { useState } from "react";
import { motion } from "motion/react";
import { useSound } from "../context/SoundContext";
const EASE = [0.16, 1, 0.3, 1];

function TerminalLine({ command, output, index }) {
  const [run, setRun] = useState(false);
  const [copied, setCopied] = useState(false);
  const { play } = useSound();
  function doRun() {
    if (run) return;
    setRun(true);
    play("tick");
  }
  function doCopy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(command);
    play("success");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05, ease: EASE }}>
      <div onClick={doRun} className={`group flex items-center gap-2 rounded px-1.5 py-0.5 ${run ? "" : "cursor-pointer hover:bg-white/[0.04]"}`}>
        <span className="shrink-0 text-emerald-400">$</span>
        <span className="flex-1 truncate text-cyan-100/90">{command}</span>
        <button onClick={doCopy} aria-label="Copy command" className="shrink-0 text-white/25 opacity-0 transition-opacity hover:text-white/70 group-hover:opacity-100">
          {copied ? <svg className="h-3.5 w-3.5 text-emerald-300" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg> : <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><path d="M9 9h10v10H9zM5 15V5h10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>}
        </button>
        {!run && <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 opacity-0 transition-opacity group-hover:opacity-100">▶ Run</span>}
      </div>
      {run && <motion.pre initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.25, ease: EASE }} className="ml-4 mt-1 overflow-hidden whitespace-pre-wrap break-words text-white/55 light:text-slate-400">
          {output || "(no output)"}
        </motion.pre>}
    </motion.div>;
}

// A practice terminal, not a real shell — every command here is one this
// lesson's body actually teaches, and every output is a hand-written,
// technically accurate worked example (see data/terminalDemos.js), never
// live execution. Clicking a line reveals its output; nothing runs until
// you click, so a learner can try to predict the result first.
export function TerminalPlayground({ demos }) {
  if (!demos || demos.length === 0) return null;
  return <div className="glass mt-4 overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-white/10 light:border-slate-900/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-red-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          </span>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Practice terminal</p>
        </div>
        <span className="text-[10px] text-white/30 light:text-slate-400">Simulated output — click a command to run it</span>
      </div>
      <div className="space-y-2 p-3 font-mono text-[12.5px] leading-relaxed">
        {demos.map((d, i) => <TerminalLine key={d.command} command={d.command} output={d.output} index={i} />)}
      </div>
    </div>;
}
