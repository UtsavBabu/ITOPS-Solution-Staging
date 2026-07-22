import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { assignCybersachetCourseToMember, checkLessonAnswer, enrollInCourse, fetchAcademyLicense, fetchCourseLessons, fetchCourseModules, fetchCourseQuiz, fetchCybersachetCourses, fetchCybersachetLeaderboard, fetchCybersachetLicense, fetchLearningPaths, fetchMyCertificate, fetchMyCourseCertificate, fetchMyCybersachetAssignments, fetchMyCybersachetStats, fetchMyEnrollments, fetchMyLessonProgress, fetchMyPermissions, fetchOrganizationMembers, fetchPlanUsage, issueCourseCertificate, issueCybersachetCertificate, PLAN_ORDER, submitCourseQuiz } from "../api/endpoints";
import { LearningPathCard } from "../components/LearningPathCard";
import { CATEGORY_LABELS, getLocalCourses, getLocalEnrollments, getLocalLearningPaths, getLocalLessons, getLocalModules, getLocalQuiz, getLocalStats, localCheckLessonAnswer, localEnroll, localGetLessonProgress, localSubmitQuiz } from "../data/cybersachetCourses";
import { Reveal, SpotlightCard } from "../components/Animated";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { TrainingHero, ProgressRing, CompletionCelebration, LocalPreviewBanner, CourseIcon, CategoryIcon, BadgeChip, StreakFlame, ModuleProgressBar, Leaderboard, xpLevel } from "../components/CyberSachetTheme";
import { CyberSachetCertificate, CertificationPath, CertificateDownloadCard } from "../components/CyberSachetCertificate";
import { AcademyMark } from "../components/AcademyBrand";
import { TerminalPlayground } from "../components/TerminalPlayground";
import { TERMINAL_DEMOS } from "../data/terminalDemos";
import { InteractiveDiagram } from "../components/InteractiveDiagram";
import { DIAGRAM_DEMOS } from "../data/interactiveDiagrams";
import { LabCard } from "../components/LabCard";
import { InterviewQuestions } from "../components/InterviewQuestions";
import { Flashcards } from "../components/Flashcards";
import { buildCheatSheetText, downloadTextFile } from "../lib/cheatSheet";
import { useAuth } from "../context/AuthContext";

const LEVEL_TONE = {
  beginner: "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700",
  intermediate: "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700",
  advanced: "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700"
};
// Progressive-reveal variant for a lesson's content — body, terminal demo,
// key takeaway, checkpoint, and notes fade/slide in one after another
// (via the parent's staggerChildren) instead of all appearing at once.
const FADE_UP = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } };

// ── Per-device notes & bookmarks ────────────────────────────────────────────
// Deliberately local-only (not a database table) — a personal scratchpad
// for a lesson, not shared training-record data. If cross-device notes turn
// out to matter, that's a real follow-up migration, not a guess baked in now.
const NOTES_KEY = "cybersachet-lesson-notes";
const BOOKMARKS_KEY = "cybersachet-lesson-bookmarks";
function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function StatTile({ label, value, suffix = "" }) {
  return <div className="rounded-2xl border border-white/10 light:border-sky-200 bg-white/[0.02] light:bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-white light:text-slate-900">
        {typeof value === "number" ? <AnimatedCounter value={value} /> : value}{suffix}
      </p>
    </div>;
}

function CategoryFilterChips({ categories, active, onChange }) {
  if (categories.length < 2) return null;
  return <div className="flex flex-wrap gap-2">
      <button onClick={() => onChange(null)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active === null ? "bg-white text-black" : "bg-white/[0.05] light:bg-slate-900/[0.05] text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
        All courses
      </button>
      {categories.map(c => <button key={c} onClick={() => onChange(c)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active === c ? "bg-white text-black" : "bg-white/[0.05] light:bg-slate-900/[0.05] text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
          <CategoryIcon category={c} size={13} />{CATEGORY_LABELS[c] ?? c}
        </button>)}
    </div>;
}

// Two real, differently-branded products sharing one LMS engine — shown only
// once Academy-track courses actually exist for this org (pre-deploy or for
// an org with only security courses, there's nothing to toggle between).
// Two separate, distinctly-branded products with their own sidebar entry
// and route (/training, /training/academy) — this toggle is a same-page
// shortcut between them, always in sync with the URL via navigate(), never
// a third "combined" view that would blur the two apart.
const TRACKS = [
  { value: "security", label: "CyberSachet", to: "/training" },
  { value: "academy", label: "Moonsav ITOps Academy", to: "/training/academy" }
];
function TrackToggle({ active }) {
  const navigate = useNavigate();
  return <div className="inline-flex gap-1 rounded-full border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-1" role="group" aria-label="Switch training product">
      {TRACKS.map(t => <button key={t.value} onClick={() => navigate(t.to)} aria-current={active === t.value ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${active === t.value ? "bg-white text-black" : "text-white/55 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
          {t.value === "academy" && <AcademyMark size={13} />}
          {t.label}
        </button>)}
    </div>;
}

// Org admins (training:manage) can assign a course straight from its
// catalog card instead of only from Users → CyberSachet Training — a
// popover, not a page navigation, since it's a one-field decision (who).
function AssignCourseButton({ course, members }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const assign = useMutation({
    mutationFn: () => assignCybersachetCourseToMember(userId, course.id, dueDate ? new Date(dueDate).toISOString() : null),
    onSuccess: () => { toast.success("Course assigned."); setOpen(false); setUserId(""); setDueDate(""); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to assign course")
  });
  return <div className="relative" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen(v => !v)} className="rounded-full border border-white/15 light:border-sky-200 px-2.5 py-1 text-[11px] font-medium text-white/60 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900">
        + Assign
      </button>
      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-0 top-full z-20 mt-1.5 w-56 space-y-2 rounded-xl border border-white/10 light:border-slate-900/10 bg-neutral-950 light:bg-white p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
            <p className="text-xs font-medium text-white light:text-slate-900">Assign "{course.title}"</p>
            <select value={userId} onChange={e => setUserId(e.target.value)} className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1.5 text-xs text-white light:text-slate-900">
              <option value="">Choose member…</option>
              {members.map(m => <option key={m.userId} value={m.userId}>{m.email}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} title="Due date (optional)" className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1.5 text-xs text-white light:text-slate-900" />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => assign.mutate()} disabled={!userId || assign.isPending} className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
                {assign.isPending ? "Assigning…" : "Assign"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-white/40 light:text-slate-400 hover:text-white/70 light:hover:text-slate-600">Cancel</button>
            </div>
          </motion.div>}
      </AnimatePresence>
    </div>;
}

function CourseCard({ course, enrollment, index, assignment, onOpen, canManageTraining, members }) {
  const pct = enrollment && course.lessonCount > 0 ? Math.round(enrollment.completedLessonCount / course.lessonCount * 100) : 0;
  const displayPct = enrollment?.completedAt ? 100 : pct;
  const status = enrollment?.completedAt ? "Completed" : enrollment ? "In progress" : "Not started";
  return <div role="button" tabIndex={0} onClick={() => onOpen(course)} onKeyDown={e => { if (e.key === "Enter") onOpen(course); }} className="block h-full w-full cursor-pointer text-left">
      <SpotlightCard tint="rose" delay={index * 0.06} className="h-full" overflowVisible>
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {assignment && <span className="inline-flex w-fit items-center gap-1 rounded-full bg-rose-400/10 light:bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-rose-300 light:text-sky-700">
                ★ Assigned{assignment.dueAt ? ` · due ${new Date(assignment.dueAt).toLocaleDateString()}` : ""}
              </span>}
            {course.freeTier && <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-400/10 light:bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-300 light:text-emerald-700">
                Included free
              </span>}
          </div>
          {canManageTraining && <AssignCourseButton course={course} members={members} />}
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <CourseIcon slug={course.slug} />
          <span className="text-xs text-white/40 light:text-slate-400">{course.estimatedMinutes} min</span>
        </div>
        <div className="mt-3 flex items-start gap-3">
          <h3 className="flex-1 text-base font-medium text-white light:text-slate-900">{course.title}</h3>
          {enrollment && <ProgressRing pct={displayPct} tone={enrollment.completedAt ? "emerald" : "rose"} />}
        </div>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55 light:text-slate-500">{course.description}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-white/45 light:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${LEVEL_TONE[course.level] ?? LEVEL_TONE.beginner}`}>{course.level}</span>
            {status}
          </span>
          <span>{course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"} · {course.quizQuestionCount} quiz Q</span>
        </div>
      </div>
      </SpotlightCard>
    </div>;
}

const PLAN_LABEL = { STARTER: "Starter", PROFESSIONAL: "Professional", BUSINESS: "Business", ENTERPRISE: "Enterprise" };

function LockedCourseCard({ course, index }) {
  const requiredPlan = PLAN_LABEL[course.minPlan] ?? "Professional";
  return <SpotlightCard tint="white" delay={index * 0.06} className="h-full border-dashed opacity-70">
      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-xl bg-white/[0.06] light:bg-slate-900/[0.05] text-white/40 light:text-slate-400" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.7" /></svg>
          </span>
          <span className="text-xs text-white/40 light:text-slate-400">{course.estimatedMinutes} min</span>
        </div>
        <h3 className="mt-3 text-base font-medium text-white/70 light:text-slate-600">{course.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-white/40 light:text-slate-400">{course.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-white/45 light:text-slate-400">🔒 {requiredPlan} plan required</span>
          <Link to="/team" className="shrink-0 rounded-full bg-gradient-to-r from-rose-500 to-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-[0_6px_16px_-6px_rgba(244,63,94,0.5)]">
            Upgrade
          </Link>
        </div>
      </div>
    </SpotlightCard>;
}

// A full custom clickable card, not a native radio/checkbox behind a
// <label> — the whole card is the hit target (no more clicking half an
// inch of text and nothing happening), the indicator's fill/checkmark is
// its own animated element (not relying on a browser's native accent-color
// rendering, which varies enough between browsers/themes to look "broken"
// even when the underlying state is correct), and shape (circle vs square)
// carries the single-vs-multiple-answer meaning at a glance.
function ChoiceOption({ selected, onClick, shape = "circle", children }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-150 ${selected ? "border-rose-400/60 light:border-sky-500/60 bg-rose-400/[0.09] light:bg-sky-100 text-white light:text-slate-900" : "border-white/10 light:border-slate-900/10 text-white/70 light:text-slate-600 hover:border-white/20 light:hover:border-slate-900/20 hover:bg-white/[0.03] light:hover:bg-slate-900/[0.02]"}`}>
      <span className={`grid h-5 w-5 shrink-0 place-items-center border-2 transition-colors ${shape === "circle" ? "rounded-full" : "rounded-[5px]"} ${selected ? "border-rose-400 light:border-sky-500 bg-rose-400 light:bg-sky-500" : "border-white/25 light:border-slate-900/25"}`}>
        <AnimatePresence>
          {selected && (shape === "circle"
            ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 25 }} className="h-2 w-2 rounded-full bg-white" />
            : <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 25 }} className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></motion.svg>)}
        </AnimatePresence>
      </span>
      <span className="flex-1">{children}</span>
    </button>;
}

function LessonCheck({ check, onCheck }) {
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [checking, setChecking] = useState(false);
  async function submit() {
    if (selected == null || checking) return;
    setChecking(true);
    try {
      const correct = await onCheck(selected);
      setFeedback(correct ? "correct" : "wrong");
      if (!correct) setTimeout(() => setFeedback(null), 1800);
    } catch {
      // Toasted by the mutation's onError already.
    } finally {
      setChecking(false);
    }
  }
  if (feedback === "correct") {
    return <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-400/10 light:bg-emerald-100 px-3 py-2.5 text-sm text-emerald-300 light:text-emerald-700">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>✓</motion.span>
        Correct — lesson complete.
      </motion.div>;
  }
  return <div className="mt-4 rounded-xl border border-rose-400/20 light:border-sky-300/40 bg-rose-400/[0.04] light:bg-sky-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-rose-300 light:text-sky-700">Knowledge checkpoint</p>
      <p className="mt-1.5 text-sm text-white/85 light:text-slate-800">{check.question}</p>
      <div className="mt-3 space-y-2">
        {check.choices.map((c, ci) => <ChoiceOption key={ci} selected={selected === ci} onClick={() => setSelected(ci)}>{c}</ChoiceOption>)}
      </div>
      {feedback === "wrong" && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-amber-300 light:text-amber-600">Not quite — review the lesson above and try again.</motion.p>}
      <button onClick={submit} disabled={selected == null || checking} className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50">
        {checking ? "Checking…" : "Check answer"}
      </button>
    </div>;
}

function LessonNote({ lessonId }) {
  const { user } = useAuth();
  const notesKey = `${NOTES_KEY}:${user?.id ?? "anon"}`;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => readJSON(notesKey, {})[lessonId] ?? "");
  function save(v) {
    setText(v);
    const notes = readJSON(notesKey, {});
    if (v.trim()) notes[lessonId] = v; else delete notes[lessonId];
    localStorage.setItem(notesKey, JSON.stringify(notes));
  }
  return <div className="mt-3">
      <button onClick={() => setOpen(o => !o)} className="text-xs text-white/40 light:text-slate-400 hover:text-white/70 light:hover:text-slate-600">
        {open ? "Hide my notes" : text ? "📝 My notes (saved)" : "+ Add a note"}
      </button>
      {open && <textarea value={text} onChange={e => save(e.target.value)} rows={3} placeholder="Jot down anything worth remembering — saved on this device only." className="mt-2 w-full rounded-lg border border-white/10 light:border-slate-900/10 bg-black/20 light:bg-slate-900/[0.02] px-3 py-2 text-xs text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:outline-none" />}
    </div>;
}

function LessonPane({ lesson, index, total, done, locked, bookmarked, onToggleBookmark, onCheck }) {
  const [expanded, setExpanded] = useState(!locked && !done);
  const wasLocked = useRef(locked);
  useEffect(() => {
    // A lesson that just became unlocked (finishing the one before it)
    // should open on its own — the `useState` initializer above only runs
    // once at mount, while this lesson was still a locked, collapsed row.
    if (wasLocked.current && !locked) setExpanded(true);
    wasLocked.current = locked;
  }, [locked]);
  if (locked) {
    return <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 light:border-slate-900/10 px-4 py-2.5 text-sm text-white/35 light:text-slate-400">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.04] light:bg-slate-900/[0.04] text-[11px]" aria-hidden>🔒</span>
        <span className="flex-1 truncate">{lesson.title}</span>
        <span className="shrink-0 text-[11px]">Complete the previous lesson to unlock</span>
      </div>;
  }
  return <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-emerald-400 text-black" : "bg-rose-400/15 light:bg-sky-100 text-rose-300 light:text-sky-700"}`}>
          {done ? "✓" : index + 1}
        </span>
        {index < total - 1 && <span className="mt-1 w-px flex-1 bg-white/10 light:bg-slate-900/10" />}
      </div>
      <SpotlightCard className="mb-3 flex-1 p-5" tint="rose">
        <div className="flex items-start justify-between gap-4">
          <button onClick={() => setExpanded(e => !e)} className="flex-1 text-left text-sm font-medium text-white light:text-slate-900">
            {lesson.title}
          </button>
          <div className="flex shrink-0 items-center gap-2">
            {done && <span className="rounded-full bg-emerald-400/10 light:bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-300 light:text-emerald-700">✓ Done</span>}
            <button onClick={() => onToggleBookmark(lesson.id)} aria-label="Bookmark this lesson" className={bookmarked ? "text-amber-300" : "text-white/25 light:text-slate-300 hover:text-white/50 light:hover:text-slate-400"}>
              {bookmarked ? "★" : "☆"}
            </button>
            <button onClick={() => setExpanded(e => !e)} aria-label="Expand lesson" className="text-white/40 light:text-slate-400">
              <svg className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
        {expanded && <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}>
            <motion.p variants={FADE_UP} className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/60 light:text-slate-600">{lesson.body}</motion.p>
            {DIAGRAM_DEMOS[lesson.title] && <motion.div variants={FADE_UP}><InteractiveDiagram diagram={DIAGRAM_DEMOS[lesson.title]} /></motion.div>}
            {lesson.lab && <motion.div variants={FADE_UP}><LabCard lab={lesson.lab} /></motion.div>}
            {TERMINAL_DEMOS[lesson.title] && <motion.div variants={FADE_UP}><TerminalPlayground demos={TERMINAL_DEMOS[lesson.title]} /></motion.div>}
            {lesson.keyTakeaway && <motion.div variants={FADE_UP} className="relative mt-4 overflow-hidden rounded-xl border border-emerald-400/25 light:border-emerald-500/25 bg-emerald-400/[0.06] light:bg-emerald-50 px-4 py-3 shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_0_28px_-10px_rgba(16,185,129,0.55)]">
                <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/20 blur-2xl" aria-hidden />
                <p className="relative flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300 light:text-emerald-700">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" fill="currentColor" /></svg>
                  Key takeaway
                </p>
                <p className="relative mt-1 text-sm text-white/85 light:text-slate-700">{lesson.keyTakeaway}</p>
              </motion.div>}
            {!done && lesson.check && <motion.div variants={FADE_UP}><LessonCheck check={lesson.check} onCheck={onCheck} /></motion.div>}
            <motion.div variants={FADE_UP}><LessonNote lessonId={lesson.id} /></motion.div>
          </motion.div>}
      </SpotlightCard>
    </div>;
}

// `lockedIds` is computed once, course-wide, by the caller — a module only
// ever renders a slice of the course's lessons, so it must never re-derive
// "is the previous lesson done" from its own local slice (that would treat
// every module's first lesson as automatically unlocked, letting someone
// skip straight to module 2 without finishing module 1).
function ModuleSection({ mod, lessons, progress, lockedIds, bookmarks, onToggleBookmark, onCheck }) {
  const completed = lessons.filter(l => progress?.has(l.id)).length;
  const pct = lessons.length > 0 ? Math.round(completed / lessons.length * 100) : 0;
  return <div id={`module-${mod.id}`} className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50 light:text-slate-500">{mod.title}</h3>
        <span className="shrink-0 text-xs text-white/40 light:text-slate-400">{completed}/{lessons.length} complete</span>
      </div>
      <div className="mb-4"><ModuleProgressBar pct={pct} tone={pct === 100 ? "emerald" : "rose"} /></div>
      {lessons.map((lesson, i) => {
        const done = progress?.has(lesson.id) ?? false;
        return <LessonPane key={lesson.id} lesson={lesson} index={i} total={lessons.length} done={done} locked={lockedIds.has(lesson.id)} bookmarked={bookmarks.has(lesson.id)} onToggleBookmark={onToggleBookmark} onCheck={choiceIndex => onCheck(lesson.id, choiceIndex)} />;
      })}
      <InterviewQuestions questions={mod.interviewQuestions} />
    </div>;
}

function SingleChoiceQuestion({ q, value, onChange }) {
  return <div className="mt-3 space-y-2">
      {q.choices.map((c, ci) => <ChoiceOption key={ci} selected={value === ci} onClick={() => onChange(ci)}>{c}</ChoiceOption>)}
    </div>;
}

function MultipleChoiceQuestion({ q, value, onChange }) {
  const selected = value ?? [];
  function toggle(ci) {
    onChange(selected.includes(ci) ? selected.filter(x => x !== ci) : [...selected, ci]);
  }
  return <div className="mt-3 space-y-2">
      <p className="text-[11px] text-white/40 light:text-slate-400">Select all that apply.</p>
      {q.choices.map((c, ci) => <ChoiceOption key={ci} shape="square" selected={selected.includes(ci)} onClick={() => toggle(ci)}>{c}</ChoiceOption>)}
    </div>;
}

function OrderingQuestion({ q, value, onChange }) {
  const order = value ?? q.choices.map((_, i) => i);
  function move(pos, dir) {
    const next = [...order];
    const swap = pos + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[pos], next[swap]] = [next[swap], next[pos]];
    onChange(next);
  }
  return <div className="mt-3 space-y-2">
      <p className="text-[11px] text-white/40 light:text-slate-400">Arrange in the correct order — use the arrows to reorder.</p>
      <AnimatePresence initial={false}>
        {order.map((choiceIdx, pos) => <motion.div layout key={choiceIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="flex items-center gap-3 rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] px-4 py-3 text-sm text-white/80 light:text-slate-700">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-400/15 light:bg-sky-100 text-xs font-semibold text-rose-300 light:text-sky-700">{pos + 1}</span>
            <span className="flex-1">{q.choices[choiceIdx]}</span>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => move(pos, -1)} disabled={pos === 0} aria-label="Move up" className="grid h-7 w-7 place-items-center rounded-lg text-white/50 light:text-slate-500 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5 hover:text-white light:hover:text-slate-900 disabled:opacity-20 disabled:hover:bg-transparent">▲</button>
              <button type="button" onClick={() => move(pos, 1)} disabled={pos === order.length - 1} aria-label="Move down" className="grid h-7 w-7 place-items-center rounded-lg text-white/50 light:text-slate-500 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5 hover:text-white light:hover:text-slate-900 disabled:opacity-20 disabled:hover:bg-transparent">▼</button>
            </div>
          </motion.div>)}
      </AnimatePresence>
    </div>;
}

function questionAnswered(q, v) {
  if (q.questionType === "multiple") return Array.isArray(v) && v.length > 0;
  if (q.questionType === "ordering") return Array.isArray(v);
  return v !== undefined;
}

function QuizPane({ courseId, questions, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const toast = useToast();
  const submit = useMutation({
    mutationFn: () => onSubmit(courseId, answers),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to submit quiz")
  });
  const answeredCount = questions.filter(q => questionAnswered(q, answers[q.id])).length;
  const allAnswered = answeredCount === questions.length;
  return <SpotlightCard className="p-6" tint="rose">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium text-white light:text-slate-900">Final assessment</h4>
          <span className="text-xs font-medium text-white/45 light:text-slate-400">{answeredCount}/{questions.length} answered</span>
        </div>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">{questions.length} question{questions.length === 1 ? "" : "s"} · pass with 70% or higher</p>
        <div className="mt-3"><ModuleProgressBar pct={Math.round(answeredCount / questions.length * 100)} /></div>
      </div>
      <div className="space-y-8">
        {questions.map((q, i) => {
        const answered = questionAnswered(q, answers[q.id]);
        return <motion.div key={q.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.35, delay: Math.min(i, 4) * 0.05 }} className={`rounded-2xl border p-5 transition-colors ${answered ? "border-emerald-400/25 light:border-emerald-500/25 bg-emerald-400/[0.02] light:bg-emerald-50/40" : "border-white/10 light:border-slate-900/10"}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors ${answered ? "bg-emerald-400 text-black" : "bg-white/10 light:bg-slate-900/8 text-white/60 light:text-slate-500"}`}>
                {answered ? "✓" : i + 1}
              </span>
              <p className="text-sm font-medium text-white/85 light:text-slate-800">{q.question}</p>
            </div>
            {q.questionType === "multiple" ? <MultipleChoiceQuestion q={q} value={answers[q.id]} onChange={v => setAnswers({ ...answers, [q.id]: v })} />
              : q.questionType === "ordering" ? <OrderingQuestion q={q} value={answers[q.id]} onChange={v => setAnswers({ ...answers, [q.id]: v })} />
              : <SingleChoiceQuestion q={q} value={answers[q.id]} onChange={v => setAnswers({ ...answers, [q.id]: v })} />}
          </motion.div>;
      })}
      </div>
      <button onClick={() => submit.mutate()} disabled={!allAnswered || submit.isPending} className="mt-6 w-full rounded-full bg-gradient-to-r from-rose-500 to-violet-600 light:from-sky-500 light:to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,0.5)] light:shadow-[0_8px_24px_-8px_rgba(14,165,233,0.5)] transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100">
        {submit.isPending ? "Submitting…" : allAnswered ? "Submit quiz" : `Answer all questions to submit (${answeredCount}/${questions.length})`}
      </button>
    </SpotlightCard>;
}

function CourseDetail({ course, enrollment, local, onBack, onProgress }) {
  const { user } = useAuth();
  const bookmarksKey = `${BOOKMARKS_KEY}:${user?.id ?? "anon"}`;
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [bookmarks, setBookmarks] = useState(() => new Set(readJSON(bookmarksKey, [])));
  function toggleBookmark(lessonId) {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId); else next.add(lessonId);
      localStorage.setItem(bookmarksKey, JSON.stringify([...next]));
      return next;
    });
  }

  const fns = useMemo(() => local ? {
    modules: () => Promise.resolve(getLocalModules(course.id)),
    lessons: () => Promise.resolve(getLocalLessons(course.id)),
    quiz: () => Promise.resolve(getLocalQuiz(course.id)),
    enroll: () => localEnroll(course.id, user?.id),
    progress: () => localGetLessonProgress(course.id, user?.id),
    checkAnswer: (lessonId, choiceIndex) => localCheckLessonAnswer(course.id, lessonId, choiceIndex, user?.id),
    submitQuiz: (courseId, answers) => localSubmitQuiz(courseId, answers, user?.id)
  } : {
    modules: () => fetchCourseModules(course.id),
    lessons: () => fetchCourseLessons(course.id),
    quiz: () => fetchCourseQuiz(course.id),
    enroll: () => enrollInCourse(course.id),
    progress: () => fetchMyLessonProgress(course.id),
    checkAnswer: (lessonId, choiceIndex) => checkLessonAnswer(lessonId, choiceIndex),
    submitQuiz: (courseId, answers) => submitCourseQuiz(courseId, answers)
  }, [local, course.id, user?.id]);

  const { data: modules } = useQuery({ queryKey: ["cybersachet-modules", local, course.id], queryFn: fns.modules });
  const { data: lessons, isLoading: lessonsLoading } = useQuery({ queryKey: ["cybersachet-lessons", local, course.id], queryFn: fns.lessons });
  const { data: quiz, isLoading: quizLoading } = useQuery({ queryKey: ["cybersachet-quiz", local, course.id], queryFn: fns.quiz, enabled: course.quizQuestionCount > 0 });
  const enroll = useMutation({ mutationFn: fns.enroll, onSuccess: onProgress, onError: err => toast.error(err instanceof Error ? err.message : "Failed to enroll") });
  const { data: progress, refetch: refetchProgress } = useQuery({ queryKey: ["cybersachet-lesson-progress", local, course.id], queryFn: fns.progress, enabled: !!enrollment });
  const check = useMutation({
    mutationFn: ({ lessonId, choiceIndex }) => fns.checkAnswer(lessonId, choiceIndex),
    onSuccess: correct => { if (correct) { onProgress(); refetchProgress(); } },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to check answer")
  });
  const [lastScore, setLastScore] = useState(enrollment?.quizScore ?? null);

  const filteredLessons = useMemo(() => {
    if (!lessons) return [];
    if (!search.trim()) return lessons;
    const q = search.trim().toLowerCase();
    return lessons.filter(l => l.title.toLowerCase().includes(q) || l.body.toLowerCase().includes(q));
  }, [lessons, search]);

  const groups = useMemo(() => {
    const mods = modules ?? [];
    if (mods.length === 0) return [{ id: "_all", title: "Lessons", lessons: filteredLessons }];
    return [
      ...mods.map(m => ({ id: m.id, title: m.title, interviewQuestions: m.interviewQuestions ?? [], lessons: filteredLessons.filter(l => l.moduleId === m.id) })),
      { id: "_ungrouped", title: "More lessons", lessons: filteredLessons.filter(l => !l.moduleId) }
    ].filter(g => g.lessons.length > 0);
  }, [modules, filteredLessons]);

  // Sequential unlocking is course-wide, not per-module — computed from the
  // full, unfiltered lesson order (search only changes what's displayed,
  // never what's unlocked) so module 2's first lesson doesn't look
  // "unlocked" just because it's first within its own module slice.
  const lockedIds = useMemo(() => {
    const locked = new Set();
    const all = lessons ?? [];
    let prevDone = true;
    for (const lesson of all) {
      const done = progress?.has(lesson.id) ?? false;
      if (!done && !prevDone) locked.add(lesson.id);
      prevDone = done;
    }
    return locked;
  }, [lessons, progress]);

  const objectives = (lessons ?? []).map(l => l.title);

  return <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900">← Back to courses</button>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${LEVEL_TONE[course.level] ?? LEVEL_TONE.beginner}`}>{course.level}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] light:bg-sky-100 px-2.5 py-1 text-[11px] font-medium text-white/60 light:text-sky-700">
            <CategoryIcon category={course.category} size={12} />{CATEGORY_LABELS[course.category] ?? course.category}
          </span>
          <span className="text-[11px] text-white/40 light:text-slate-400">{course.estimatedMinutes} min · Authored by the ITOps Solution {course.track === "academy" ? "Academy" : "security"} team</span>
        </div>
        <h1 className="mt-3 text-2xl font-medium tracking-tight text-white light:text-slate-900">{course.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55 light:text-slate-500">{course.description}</p>
        {course.level !== "beginner" && <p className="mt-2 text-xs text-white/35 light:text-slate-400">Recommended: familiarity with a beginner-level CyberSachet course first.</p>}
      </div>

      {objectives.length > 0 && <SpotlightCard className="p-4" tint="white">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">What you'll learn</p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {objectives.map(o => <li key={o} className="flex items-start gap-1.5 text-xs text-white/60 light:text-slate-500"><span className="mt-0.5 text-emerald-300" aria-hidden>✓</span>{o}</li>)}
          </ul>
        </SpotlightCard>}

      <div className="flex flex-wrap items-center gap-2.5">
        {!enrollment && <button onClick={() => enroll.mutate()} disabled={enroll.isPending} className="rounded-full bg-gradient-to-r from-rose-500 to-violet-600 light:from-sky-500 light:to-cyan-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,0.5)] light:shadow-[0_8px_24px_-8px_rgba(14,165,233,0.5)] transition-transform hover:scale-[1.03] disabled:opacity-50">
            {enroll.isPending ? "Enrolling…" : "Start course"}
          </button>}
        {(lessons?.length ?? 0) > 0 && <button onClick={() => setShowFlashcards(true)} className="rounded-full border border-white/15 light:border-slate-900/15 px-4 py-2 text-xs font-medium text-white/70 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-900/5">
            🗂 Flashcards
          </button>}
        {(lessons?.length ?? 0) > 0 && <button onClick={() => downloadTextFile(`${course.slug}-cheat-sheet.txt`, buildCheatSheetText(course, modules, lessons, TERMINAL_DEMOS))} className="rounded-full border border-white/15 light:border-slate-900/15 px-4 py-2 text-xs font-medium text-white/70 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-900/5">
            ⬇ Cheat sheet
          </button>}
      </div>

      {groups.length > 1 && <div className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-1.5 overflow-x-auto bg-neutral-950/80 light:bg-sky-50/90 px-1 py-2 backdrop-blur">
          {groups.map(g => <a key={g.id} href={`#module-${g.id}`} className="shrink-0 rounded-full border border-white/10 light:border-sky-200 px-3 py-1 text-xs text-white/60 light:text-slate-600 hover:text-white light:hover:text-slate-900">{g.title}</a>)}
          {course.capstone && <a href="#module-_capstone" className="shrink-0 rounded-full border border-white/10 light:border-sky-200 px-3 py-1 text-xs text-white/60 light:text-slate-600 hover:text-white light:hover:text-slate-900">Capstone Project</a>}
          {course.quizQuestionCount > 0 && <a href="#module-_assessment" className="shrink-0 rounded-full border border-white/10 light:border-sky-200 px-3 py-1 text-xs text-white/60 light:text-slate-600 hover:text-white light:hover:text-slate-900">Final Assessment</a>}
        </div>}

      <div className="relative">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search this course…" className="w-full rounded-full border border-white/10 light:border-sky-200 bg-white/[0.02] light:bg-white px-4 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:outline-none focus:border-rose-400/40 light:focus:border-sky-400" />
      </div>

      {lessonsLoading ? <Skeleton className="h-32 rounded-2xl" /> : <div className="space-y-8">
          {groups.map(g => <ModuleSection key={g.id} mod={{ id: g.id, title: g.title, interviewQuestions: g.interviewQuestions }} lessons={g.lessons} progress={progress} lockedIds={lockedIds} bookmarks={bookmarks} onToggleBookmark={toggleBookmark} onCheck={(lessonId, choiceIndex) => check.mutateAsync({ lessonId, choiceIndex })} />)}
          {groups.length === 0 && search && <EmptyState title="No lessons match your search." description="Try a different word or clear the search." />}
        </div>}

      {course.capstone && enrollment && <div id="module-_capstone">
          <SpotlightCard className="p-6" tint="violet">
            <p className="text-[11px] font-medium uppercase tracking-wide text-violet-300 light:text-violet-700">🏁 Capstone project</p>
            <h3 className="mt-1 text-lg font-medium text-white light:text-slate-900">{course.capstone.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60 light:text-slate-500">{course.capstone.description}</p>
            {course.capstone.requirements?.length > 0 && <ul className="mt-4 space-y-1.5">
                {course.capstone.requirements.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm text-white/70 light:text-slate-600">
                    <span className="mt-0.5 shrink-0 text-violet-300" aria-hidden>☐</span>{r}
                  </li>)}
              </ul>}
            {course.capstone.deliverable && <p className="mt-4 rounded-lg border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-3 text-xs leading-relaxed text-white/50 light:text-slate-500">
                <span className="font-medium text-white/70 light:text-slate-700">Deliverable: </span>{course.capstone.deliverable}
              </p>}
          </SpotlightCard>
        </div>}

      {course.quizQuestionCount > 0 && enrollment && <div id="module-_assessment">
          {lastScore !== null ? <SpotlightCard className="p-6" tint="rose">
              <CompletionCelebration score={lastScore} />
              <div className="mt-4 text-center">
                <button onClick={() => setLastScore(null)} className="rounded-full border border-white/15 light:border-slate-900/15 px-4 py-2 text-xs text-white/70 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-900/5">
                  Retake quiz
                </button>
              </div>
            </SpotlightCard> : quizLoading ? <Skeleton className="h-40 rounded-2xl" /> : quiz && quiz.length > 0 ? <QuizPane courseId={course.id} questions={quiz} onSubmit={async (courseId, answers) => {
              const score = await fns.submitQuiz(courseId, answers);
              setLastScore(score);
              onProgress();
              return score;
            }} /> : null}
        </div>}

      <CourseCertificateSection course={course} enrollment={enrollment} score={lastScore ?? enrollment?.quizScore} local={local} passed={(lastScore !== null && lastScore >= 70) || !!enrollment?.completedAt} />

      {showFlashcards && <Flashcards cards={(lessons ?? []).filter(l => l.keyTakeaway).map(l => ({ front: l.title, back: l.keyTakeaway }))} onClose={() => setShowFlashcards(false)} />}
    </div>;
}

// A certificate for THIS course specifically — separate from CertificateSection
// below, which is the single CSSA certificate for finishing the whole
// catalog. Coursera-style: a certificate per course, plus a program-level
// one for finishing every course. Shown right on the course page the
// moment it's passed, not buried in a separate dashboard section.
function CourseCertificateSection({ course, enrollment, score, local, passed }) {
  const { user, organization } = useAuth();
  const toast = useToast();
  const { data: certificate, refetch } = useQuery({
    queryKey: ["cybersachet-course-certificate", course.id],
    queryFn: () => fetchMyCourseCertificate(course.id),
    enabled: !local && passed
  });
  const issue = useMutation({
    mutationFn: () => issueCourseCertificate(course.id),
    onSuccess: () => refetch(),
    onError: err => toast.error(err instanceof Error ? err.message : "Couldn't issue certificate")
  });

  if (!passed) return null;

  if (local) {
    // Same real design as a real certificate — real name, org, course
    // title, score, hours — just watermarked "Preview" and with no QR/
    // verify block, since there's no database record behind it yet.
    return <div>
        <CyberSachetCertificate preview brand={course.track === "academy" ? "academy" : "cybersachet"} userName={user?.name} orgName={organization?.name ?? "Your organization"} courseTitle={course.title} score={score ?? 0} averageScore={score ?? 0} hoursTrained={Math.round((course.estimatedMinutes / 60) * 10) / 10} issuedAt={enrollment?.completedAt ?? new Date().toISOString()} expiresAt={new Date(new Date(enrollment?.completedAt ?? Date.now()).setFullYear(new Date(enrollment?.completedAt ?? Date.now()).getFullYear() + 1)).toISOString()} />
        <p className="mx-auto mt-3 max-w-md text-center text-xs text-white/45 light:text-slate-500">
          This is a preview of the real certificate design — a verifiable version with a QR code and a public verification page is
          issued the moment your organization licenses {course.track === "academy" ? "Moonsav ITOps Academy" : "CyberSachet"}.
        </p>
      </div>;
  }

  return certificate ? <div id={`course-certificate-${course.id}`}>
      <CertificateDownloadCard verifyPath={`/verify/${certificate.certificateNo}`}>
        <CyberSachetCertificate brand={course.track === "academy" ? "academy" : "cybersachet"} userName={user?.name} orgName={organization?.name} certId={certificate.certificateNo} score={certificate.averageScore} averageScore={certificate.averageScore} courseTitle={certificate.courseTitle} hoursTrained={certificate.hoursTrained} issuedAt={certificate.issuedAt} expiresAt={certificate.expiresAt} certificateHash={certificate.certificateHash} verifyPath={`${window.location.origin}/verify/${certificate.certificateNo}`} />
      </CertificateDownloadCard>
    </div> : <SpotlightCard className="p-6 text-center" tint="amber">
      <p className="text-2xl" aria-hidden>🎓</p>
      <p className="mt-2 text-sm font-medium text-white light:text-slate-900">You've passed this course — your certificate is ready.</p>
      <button onClick={() => issue.mutate()} disabled={issue.isPending} className="mt-4 rounded-full bg-gradient-to-r from-blue-700 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(30,58,138,0.5)] disabled:opacity-50">
        {issue.isPending ? "Generating…" : "Claim your certificate"}
      </button>
    </SpotlightCard>;
}

function CertificateSection({ eligible, userName, orgName }) {
  const toast = useToast();
  const { data: certificate, refetch } = useQuery({ queryKey: ["cybersachet-my-certificate"], queryFn: fetchMyCertificate });
  const issue = useMutation({
    mutationFn: issueCybersachetCertificate,
    onSuccess: () => refetch(),
    onError: err => toast.error(err instanceof Error ? err.message : "Couldn't issue certificate")
  });

  return <div className="space-y-6">
      {certificate ? <div id="certificate-print-area">
          <CertificateDownloadCard verifyPath={`/verify/${certificate.certificateNo}`}>
            <CyberSachetCertificate userName={userName} orgName={orgName} certId={certificate.certificateNo} score={certificate.averageScore} averageScore={certificate.averageScore} courseCount={certificate.courseCount} hoursTrained={certificate.hoursTrained} issuedAt={certificate.issuedAt} expiresAt={certificate.expiresAt} certificateHash={certificate.certificateHash} verifyPath={`${window.location.origin}/verify/${certificate.certificateNo}`} />
          </CertificateDownloadCard>
        </div> : eligible ? <Reveal>
          <div className="rounded-2xl border border-amber-400/25 light:border-amber-500/30 bg-amber-400/[0.06] light:bg-amber-50 p-6 text-center">
            <p className="text-2xl" aria-hidden>🏅</p>
            <p className="mt-2 text-sm font-medium text-white light:text-slate-900">You've completed every assigned course — your CSSA certificate is ready.</p>
            <button onClick={() => issue.mutate()} disabled={issue.isPending} className="mt-4 rounded-full bg-gradient-to-r from-blue-700 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(30,58,138,0.5)] disabled:opacity-50">
              {issue.isPending ? "Generating…" : "Claim your certificate"}
            </button>
          </div>
        </Reveal> : null}
      <CertificationPath earnedCode={certificate ? "CSSA" : null} />
    </div>;
}

// Local preview never earns a real, verifiable certificate (there's no
// database record behind it) — but hiding the whole concept from a
// prospect trying the free preview is worse than an honest teaser. Once
// every visible local course is done, this shows the real overall-CSSA
// certificate design (real name, org, real average score/hours computed
// from local progress) watermarked "Preview", not just a text blurb.
function LocalCertificatePreview({ eligible, stats, courseCount }) {
  const { user, organization } = useAuth();
  if (!eligible) return <CertificationPath earnedCode={null} />;
  return <div className="space-y-6">
      <div>
        <CyberSachetCertificate preview userName={user?.name} orgName={organization?.name ?? "Your organization"} score={stats?.avgScore ?? 0} averageScore={stats?.avgScore ?? 0} courseCount={courseCount} hoursTrained={stats?.hoursTrained ?? 0} issuedAt={new Date().toISOString()} expiresAt={new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()} />
        <p className="mx-auto mt-3 max-w-md text-center text-xs text-white/45 light:text-slate-500">
          This is a preview of the real CSSA certificate design — a verifiable version with a QR code and a public verification
          page is issued the moment your organization licenses CyberSachet.
        </p>
      </div>
      <CertificationPath earnedCode={null} />
    </div>;
}

export default function CyberSachetTraining({ defaultTrack = "security" }) {
  const { user, organization } = useAuth();
  // Academy and CyberSachet are independently licensable products — each
  // route mount checks only its own track's real license, never the other
  // track's flag.
  const { data: licensed, isLoading: licenseLoading, isError: licenseError, refetch: refetchLicense } = useQuery({ queryKey: ["cybersachet-license", defaultTrack], queryFn: defaultTrack === "academy" ? fetchAcademyLicense : fetchCybersachetLicense, retry: false });
  const { data: usage, isLoading: usageLoading } = useQuery({ queryKey: ["plan-usage"], queryFn: fetchPlanUsage, staleTime: 60_000 });
  const orgPlan = usage?.plan ?? "STARTER";
  const orgPlanRank = PLAN_ORDER.indexOf(orgPlan);
  const isStarter = orgPlan === "STARTER";
  // Local preview courses (data/cybersachetCourses.js) predate min_plan and
  // only carry the old freeTier boolean — fall back to it the same way the
  // live-fetch mappers do, so a free local course doesn't regress to locked.
  const courseAllowedByPlan = c => PLAN_ORDER.indexOf(c.minPlan ?? (c.freeTier ? "STARTER" : "PROFESSIONAL")) <= orgPlanRank;
  // A failed license check is not the same as "not licensed" — falling back
  // to `local` here would silently demote a real, paying, licensed org to
  // local-preview mode (fake device-local progress) on a transient network
  // blip. Show a real, retryable error instead of guessing.
  const local = !licenseLoading && !licensed && !licenseError;

  const { data: liveCourses, isLoading: coursesLoading, isError: coursesError, refetch: refetchCourses } = useQuery({ queryKey: ["cybersachet-courses"], queryFn: fetchCybersachetCourses, enabled: !!licensed });
  const { data: liveEnrollments, refetch: refetchEnrollments } = useQuery({ queryKey: ["cybersachet-enrollments"], queryFn: fetchMyEnrollments, enabled: !!licensed });
  const { data: assignments } = useQuery({ queryKey: ["cybersachet-my-assignments"], queryFn: fetchMyCybersachetAssignments, enabled: !!licensed });
  const { data: stats } = useQuery({ queryKey: ["cybersachet-my-stats"], queryFn: fetchMyCybersachetStats, enabled: !!licensed });
  const { data: leaderboard } = useQuery({ queryKey: ["cybersachet-leaderboard"], queryFn: fetchCybersachetLeaderboard, enabled: !!licensed });
  const { data: learningPaths } = useQuery({ queryKey: ["cybersachet-learning-paths"], queryFn: fetchLearningPaths, enabled: !!licensed });
  const { data: can } = useQuery({ queryKey: ["my-permissions", organization?.id], queryFn: () => fetchMyPermissions(organization?.id), enabled: !!organization?.id, retry: false });
  const canManageTraining = !!can && can("organization", "training", "manage");
  // Only fetched for an admin who can actually assign something — a regular
  // member never needs the org's member list just to see their own courses.
  const { data: members } = useQuery({ queryKey: ["organization-members"], queryFn: fetchOrganizationMembers, enabled: canManageTraining, retry: false });
  const assignmentByCourseId = new Map((assignments ?? []).map(a => [a.courseId, a]));

  const [, setLocalVersion] = useState(0);
  const refreshLocal = () => setLocalVersion(v => v + 1);
  const localCourses = getLocalCourses();
  const localEnrollments = local ? getLocalEnrollments(user?.id) : [];
  const localStats = local ? getLocalStats(user?.id) : null;

  const courses = local ? localCourses : liveCourses;
  const enrollments = local ? localEnrollments : liveEnrollments;
  const [openCourse, setOpenCourse] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const activeTrack = defaultTrack;

  if (licenseLoading || usageLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-2xl" /></div>;
  }

  const enrollmentByCourseId = new Map((enrollments ?? []).map(e => [e.courseId, e]));
  const completedCount = (enrollments ?? []).filter(e => e.completedAt).length;
  const inProgressCount = (enrollments ?? []).filter(e => !e.completedAt && e.enrolledAt).length;

  function refreshEnrollments() {
    if (local) refreshLocal(); else refetchEnrollments();
  }
  if (openCourse) {
    return <CourseDetail course={openCourse} enrollment={enrollmentByCourseId.get(openCourse.id)} local={local} onBack={() => { setOpenCourse(null); refreshEnrollments(); }} onProgress={refreshEnrollments} />;
  }

  // Visibility rule (real accounts, not local preview):
  //  - A course's own min_plan decides it, not a Starter/non-Starter binary
  //    — a course requiring Business stays locked for a Professional org
  //    exactly like it would for Starter. free_tier (min_plan STARTER)
  //    courses are always open, on any plan — the honest "always on" on-ramp
  //    described in DEPLOY.md.
  //  - Once a course's tier is unlocked by the org's plan, it's still
  //    admin-assigned-only for a regular member (an employee never sees the
  //    full catalog, only what was assigned) — that part is unchanged.
  //  - Local preview applies the same real tiered rule against the org's
  //    actual plan, not a simplified "Starter locked / anything else open"
  //    — showing a Professional org's preview as if Business/Enterprise-only
  //    courses were open would be an honest-looking preview of an
  //    entitlement that isn't real. The RPC layer (_cybersachet_course_
  //    allowed) enforces the identical tiered rule server-side.
  const allCourses = local ? localCourses : (courses ?? []);
  // Local preview data predates the track column and is CyberSachet-only —
  // default anything without an explicit track to "security" rather than
  // dropping it from every track-filtered view.
  const courseTrack = c => c.track ?? "security";
  const trackCourses = allCourses.filter(c => courseTrack(c) === activeTrack);
  const trackLearningPaths = (local ? getLocalLearningPaths(user?.id) : (learningPaths ?? [])).filter(p => p.track === activeTrack);
  const courseById = new Map(allCourses.map(c => [c.id, c]));
  const freeCourses = trackCourses.filter(c => c.freeTier);
  // Local preview and an org admin (training:manage) both need to see
  // everything their plan tier actually unlocks — a solo preview has no
  // admin to assign anything, and an admin needs to browse the catalog to
  // decide what to assign, not just see what's already assigned to them.
  const assignedCourses = local ? [] : trackCourses.filter(c => !c.freeTier && courseAllowedByPlan(c) && assignmentByCourseId.has(c.id));
  const lockedCourses = trackCourses.filter(c => !courseAllowedByPlan(c));
  const visibleCourses = local || canManageTraining ? trackCourses.filter(courseAllowedByPlan) : [...freeCourses, ...assignedCourses];
  const filteredVisible = activeCategory ? visibleCourses.filter(c => c.category === activeCategory) : visibleCourses;
  const filteredLocked = activeCategory ? lockedCourses.filter(c => c.category === activeCategory) : lockedCourses;
  const categories = [...new Set(trackCourses.map(c => c.category))].filter(Boolean);

  // The CSSA certificate only ever certified the CyberSachet security
  // catalog — scope its eligibility to security-track courses so an Academy
  // (Cloud/DevOps) course completion can never gate or count toward it,
  // matching issue_cybersachet_certificate()'s own server-side scoping.
  const securityCourses = allCourses.filter(c => courseTrack(c) === "security");
  const securityCompletedCount = securityCourses.filter(c => enrollmentByCourseId.get(c.id)?.completedAt).length;

  const dashboardStats = local ? localStats : stats;
  const heroTitle = activeTrack === "academy" ? "Moonsav ITOps Academy" : "CyberSachet Training";
  const heroSubtitle = activeTrack === "academy" ? "Cloud, DevOps, and infrastructure courses — enroll, complete lessons, and pass the quiz." : local ? "Security awareness courses for your team — enroll, complete lessons, and pass the quiz." : canManageTraining ? "The full catalog — assign any course to a team member, or take one yourself." : "Your assigned courses, progress, and certification, in one place.";
  // Track-scoped, from the same real enrollment map every course card
  // already reads — never cross-counts a CyberSachet completion into the
  // Academy ring or vice versa.
  const trackCompletedCount = visibleCourses.filter(c => enrollmentByCourseId.get(c.id)?.completedAt).length;
  const trackProgressPct = visibleCourses.length > 0 ? Math.round((trackCompletedCount / visibleCourses.length) * 100) : 0;

  return <div className="space-y-6">
      <Reveal y={12} className="flex flex-wrap items-center justify-between gap-3">
        <TrackToggle active={activeTrack} />
      </Reveal>

      <Reveal y={12}>
        <TrainingHero academy={activeTrack === "academy"} title={heroTitle} subtitle={heroSubtitle} progressPct={visibleCourses.length > 0 ? trackProgressPct : null} stats={visibleCourses ? [{ label: local || canManageTraining ? "Courses" : "Assigned", value: visibleCourses.length }, { label: "In progress", value: inProgressCount }, { label: "Completed", value: completedCount }] : null} />
      </Reveal>

      {licenseError && <Reveal delay={0.05}><ErrorState message="Couldn't confirm your license status — this is a connection issue, not a licensing change. Your organization's data is safe." onRetry={refetchLicense} /></Reveal>}
      {local && <Reveal delay={0.05}><LocalPreviewBanner /></Reveal>}

      {dashboardStats && (() => {
        const currentXp = dashboardStats.completedCourses * 250 + Math.round(dashboardStats.hoursTrained * 20) + (dashboardStats.avgScore ?? 0) * 2 + dashboardStats.streakDays * 15;
        return <Reveal delay={0.08}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {/* XP is a display-only score computed live from real progress
                (courses completed, hours trained, quiz average, streak) —
                never a separately stored counter that could drift from
                what actually happened. Level is a deterministic function
                of that same XP (see xpLevel), not a second counter. */}
            <div className="rounded-2xl border border-amber-400/20 light:border-amber-500/25 bg-amber-400/[0.05] light:bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-amber-300/80 light:text-amber-700">XP</p>
                <span className="rounded-full bg-amber-400/15 light:bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-200 light:text-amber-800">{xpLevel(currentXp).label}</span>
              </div>
              <p className="mt-1.5 text-xl font-semibold tabular-nums text-amber-200 light:text-amber-800">
                <AnimatedCounter value={currentXp} />
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-amber-400/10 light:bg-amber-500/15">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${xpLevel(currentXp).pct}%` }} />
              </div>
            </div>
            <StatTile label="Avg. quiz score" value={dashboardStats.avgScore != null ? dashboardStats.avgScore : "—"} suffix={dashboardStats.avgScore != null ? "%" : ""} />
            {/* Not AnimatedCounter here — it always rounds to a whole
                number, which would silently show "0.3h" as "0h". */}
            <StatTile label="Learning hours" value={dashboardStats.hoursTrained.toFixed(1)} suffix="h" />
            <div className="rounded-2xl border border-white/10 light:border-sky-200 bg-white/[0.02] light:bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Current streak</p>
              <div className="mt-1.5"><StreakFlame days={dashboardStats.streakDays} /></div>
            </div>
            <div className="rounded-2xl border border-white/10 light:border-sky-200 bg-white/[0.02] light:bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Badges</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {dashboardStats.badges.length > 0 ? dashboardStats.badges.map(b => <BadgeChip key={b} code={b} />) : <span className="text-xs text-white/30 light:text-slate-300">None yet</span>}
              </div>
            </div>
          </div>
        </Reveal>;
      })()}

      {!local && leaderboard && leaderboard.length > 0 && <Reveal delay={0.1}>
          <SpotlightCard className="p-5" tint="white">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Team leaderboard</p>
            <Leaderboard rows={leaderboard} currentUserId={user?.id} />
          </SpotlightCard>
        </Reveal>}

      {trackLearningPaths.length > 0 && <Reveal delay={0.1} className="space-y-4">
          {trackLearningPaths.map(path => <LearningPathCard key={path.id} path={path} orgPlanRank={orgPlanRank} onOpenCourse={c => { const full = courseById.get(c.courseId); if (full) setOpenCourse(full); }} />)}
        </Reveal>}

      <CategoryFilterChips categories={categories} active={activeCategory} onChange={setActiveCategory} />

      {!local && coursesLoading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div> : !local && coursesError ? <ErrorState message="Couldn't load courses." onRetry={refetchCourses} /> : filteredVisible.length === 0 && filteredLocked.length === 0 ? (
        activeCategory ? <EmptyState title="No courses in this category." description="Try a different category, or clear the filter to see everything available to you." />
        : canManageTraining && !local ? <EmptyState title="No courses in the catalog yet." description="Courses are managed by ITOps Solution — check back soon, or contact support if you expected to see some here." />
        : <EmptyState title="No courses assigned yet." description="Course assignment is admin-only — ask your organization admin to assign training." />
      ) : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVisible.map((course, i) => <CourseCard key={course.id} course={course} index={i} enrollment={enrollmentByCourseId.get(course.id)} assignment={assignmentByCourseId.get(course.id)} onOpen={setOpenCourse} canManageTraining={canManageTraining && !local} members={members ?? []} />)}
          {filteredLocked.map((course, i) => <LockedCourseCard key={course.id} course={course} index={filteredVisible.length + i} />)}
        </div>}

      {!local && activeTrack !== "academy" && securityCourses.length > 0 && <CertificateSection eligible={!isStarter && securityCompletedCount >= securityCourses.length} userName={user?.name} orgName={organization?.name} />}
      {local && activeTrack !== "academy" && <LocalCertificatePreview eligible={!isStarter && securityCompletedCount >= securityCourses.length && securityCompletedCount > 0} stats={localStats} courseCount={securityCourses.length} />}
    </div>;
}
