import { SpotlightCard } from "./Animated";
import { PLAN_ORDER } from "../api/endpoints";

function StepIcon({ status }) {
  if (status === "done") return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-400 text-xs font-semibold text-black" aria-hidden>✓</span>;
  if (status === "current") return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-400/15 light:bg-cyan-100 text-xs font-semibold text-cyan-300 light:text-cyan-700 ring-2 ring-cyan-400/40" aria-hidden>●</span>;
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.05] light:bg-slate-900/[0.05] text-xs font-semibold text-white/30 light:text-slate-400" aria-hidden>○</span>;
}

// A real progression across independently-enrollable courses (Introduction
// -> Intermediate -> Advanced) — each step keeps its own real plan-gating,
// enrollment, and certificate; this is purely a visual/navigational grouping
// on top of data list_learning_paths() already computes from real
// enrollments, not a separate progress system.
export function LearningPathCard({ path, orgPlanRank, onOpenCourse }) {
  if (!path.courses?.length) return null;
  const firstIncompleteIndex = path.courses.findIndex(c => !c.completed);
  return <SpotlightCard className="p-5" tint="violet">
      <p className="text-[11px] font-medium uppercase tracking-wide text-violet-300 light:text-violet-700">Learning path</p>
      <h3 className="mt-1 text-base font-medium text-white light:text-slate-900">{path.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/55 light:text-slate-500">{path.description}</p>
      <div className="mt-4 space-y-1">
        {path.courses.map((c, i) => {
          const status = c.completed ? "done" : i === firstIncompleteIndex ? "current" : i < firstIncompleteIndex ? "done" : "upcoming";
          const allowed = PLAN_ORDER.indexOf(c.minPlan) <= orgPlanRank;
          return <div key={c.courseId} className="flex items-center gap-3">
              <div className="flex flex-col items-center self-stretch">
                <StepIcon status={status} />
                {i < path.courses.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10 light:bg-slate-900/10" />}
              </div>
              <button onClick={() => allowed && onOpenCourse(c)} disabled={!allowed} className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${allowed ? "border-white/10 light:border-slate-900/10 hover:border-white/25 light:hover:border-slate-900/20 hover:bg-white/[0.03] light:hover:bg-slate-900/[0.02]" : "border-dashed border-white/10 light:border-slate-900/10 opacity-60"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-violet-300/80 light:text-violet-600">{c.levelLabel}</span>
                  <span className="text-[11px] text-white/35 light:text-slate-400">{c.lessonCount} lessons · {Math.round(c.estimatedMinutes / 60 * 10) / 10}h</span>
                </div>
                <p className="mt-0.5 text-sm text-white light:text-slate-900">{c.title}</p>
                {!allowed && <p className="mt-0.5 text-[11px] text-amber-300/80 light:text-amber-700">🔒 {c.minPlan} plan required</p>}
              </button>
            </div>;
        })}
      </div>
    </SpotlightCard>;
}
