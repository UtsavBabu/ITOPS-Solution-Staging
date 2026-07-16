import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { adminDeleteCybersachetCourse, adminDeleteCybersachetLesson, adminDeleteCybersachetModule, adminDeleteCybersachetQuizQuestion, adminFetchCybersachetCourses, adminFetchCybersachetLessons, adminFetchCybersachetModules, adminFetchCybersachetQuizQuestions, adminSaveCybersachetCourse, adminSaveCybersachetLesson, adminSaveCybersachetModule, adminSaveCybersachetQuizQuestion } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { useToast } from "../../components/Toast";
import { EmptyState, ErrorState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { useConfirm } from "../../components/ConfirmDialog";
import { CATEGORY_LABELS } from "../../data/cybersachetCourses";

const LEVELS = ["beginner", "intermediate", "advanced"];
const QUESTION_TYPES = [{ value: "single", label: "Single choice" }, { value: "multiple", label: "Multiple answer" }, { value: "ordering", label: "Arrange steps" }];
const inputClass = "w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none";
const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/35 light:text-slate-400";

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Every field in this file is compact and inline (a table-like list of
// courses/lessons/questions, not a full form page), so labels sit directly
// above each control instead of using the floating-label `Field` component
// built for the auth pages — same information, denser layout.
function LabeledField({ label, className = "", children }) {
  return <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>;
}
function LabeledInput({ label, className = "", ...props }) {
  return <LabeledField label={label} className={className}>
      <input className={inputClass} {...props} />
    </LabeledField>;
}
function LabeledSelect({ label, className = "", children, ...props }) {
  return <LabeledField label={label} className={className}>
      <select className={inputClass} {...props}>{children}</select>
    </LabeledField>;
}
function LabeledTextarea({ label, className = "", ...props }) {
  return <LabeledField label={label} className={className}>
      <textarea className={inputClass} {...props} />
    </LabeledField>;
}
function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40 light:text-slate-400">{children}</p>;
}

function ModulesEditor({ courseId }) {
  const toast = useToast();
  const { data: modules, isLoading, isError, refetch } = useQuery({ queryKey: ["admin-cybersachet-modules", courseId], queryFn: () => adminFetchCybersachetModules(courseId) });
  const create = useMutation({
    mutationFn: () => adminSaveCybersachetModule({ courseId, title: "New module", sortOrder: modules?.length ?? 0 }),
    onSuccess: () => { toast.success("Module added."); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to add module")
  });
  return <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Modules</p>
        <button onClick={() => create.mutate()} disabled={create.isPending} className="text-xs text-cyan-300 light:text-cyan-600 hover:text-cyan-200">+ Add module</button>
      </div>
      {isLoading ? <Skeleton className="h-16 rounded-xl" /> : isError ? <ErrorState message="Couldn't load modules." onRetry={refetch} /> : (modules ?? []).length === 0 ? <p className="text-xs text-white/35 light:text-slate-400">No modules yet — lessons show as one flat list until you add some.</p> : <div className="space-y-2">
          {modules.map(m => <ModuleRow key={m.id} mod={m} onSaved={refetch} />)}
        </div>}
    </div>;
}

function ModuleRow({ mod, onSaved }) {
  const [title, setTitle] = useState(mod.title);
  const toast = useToast();
  const confirm = useConfirm();
  const save = useMutation({
    mutationFn: () => adminSaveCybersachetModule({ id: mod.id, courseId: mod.courseId, title, sortOrder: mod.sortOrder }),
    onSuccess: () => { toast.success("Module saved."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to save module")
  });
  const remove = useMutation({
    mutationFn: () => adminDeleteCybersachetModule(mod.id),
    onSuccess: () => { toast.success("Module deleted — its lessons are ungrouped, not deleted."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete module")
  });
  return <div className="flex items-end gap-2 rounded-xl border border-white/10 light:border-slate-900/10 bg-black/20 light:bg-slate-900/[0.02] p-2.5">
      <LabeledInput label="Module name" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" />
      <span className="shrink-0 pb-2.5 text-[11px] text-white/35 light:text-slate-400">{mod.lessonCount} lesson{mod.lessonCount === 1 ? "" : "s"}</span>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300 disabled:opacity-50">Save</button>
      <button onClick={async () => { if (await confirm({ title: "Delete module?", description: "Its lessons become ungrouped, not deleted." })) remove.mutate(); }} className="shrink-0 rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-300 light:text-red-600 hover:bg-red-400/10">Delete</button>
    </div>;
}

function LessonRow({ lesson, courseId, modules, onSaved }) {
  const [title, setTitle] = useState(lesson.title);
  const [body, setBody] = useState(lesson.body);
  const [moduleId, setModuleId] = useState(lesson.moduleId ?? "");
  const [keyTakeaway, setKeyTakeaway] = useState(lesson.keyTakeaway ?? "");
  const [checkQuestion, setCheckQuestion] = useState(lesson.checkQuestion ?? "");
  const [checkChoices, setCheckChoices] = useState(lesson.checkChoices?.length ? lesson.checkChoices : ["", "", "", ""]);
  const [checkCorrectIndex, setCheckCorrectIndex] = useState(lesson.checkCorrectIndex ?? 0);
  const toast = useToast();
  const confirm = useConfirm();
  const save = useMutation({
    mutationFn: () => adminSaveCybersachetLesson({
      id: lesson.id, courseId, title, body, sortOrder: lesson.sortOrder,
      moduleId: moduleId || null, keyTakeaway: keyTakeaway || null,
      checkQuestion: checkQuestion || null,
      checkChoices: checkQuestion ? checkChoices : null,
      checkCorrectIndex: checkQuestion ? checkCorrectIndex : null
    }),
    onSuccess: () => { toast.success("Lesson saved."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to save lesson")
  });
  const remove = useMutation({
    mutationFn: () => adminDeleteCybersachetLesson(lesson.id),
    onSuccess: () => { toast.success("Lesson deleted."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete lesson")
  });
  function updateChoice(i, v) {
    setCheckChoices(checkChoices.map((c, idx) => idx === i ? v : c));
  }
  return <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-black/20 light:bg-slate-900/[0.02] p-3 space-y-3">
      <div className="flex items-end gap-2">
        <LabeledInput label="Lesson title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" />
        <LabeledSelect label="Module" value={moduleId} onChange={e => setModuleId(e.target.value)} className="w-40 shrink-0">
          <option value="">No module</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </LabeledSelect>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300 disabled:opacity-50">Save</button>
        <button onClick={async () => { if (await confirm({ title: "Delete lesson?", description: "This removes it for every organization." })) remove.mutate(); }} className="shrink-0 rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-300 light:text-red-600 hover:bg-red-400/10">Delete</button>
      </div>
      <LabeledTextarea label="Lesson content (plain text)" value={body} onChange={e => setBody(e.target.value)} rows={4} />
      <LabeledInput label="Key takeaway — shown as a highlighted callout (optional)" value={keyTakeaway} onChange={e => setKeyTakeaway(e.target.value)} />
      <div className="rounded-lg border border-white/10 light:border-slate-900/10 p-2.5 space-y-2">
        <SectionLabel>Knowledge checkpoint (optional — required to mark this lesson complete if set)</SectionLabel>
        <LabeledInput label="Comprehension question" value={checkQuestion} onChange={e => setCheckQuestion(e.target.value)} />
        {checkQuestion && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checkChoices.map((c, i) => <label key={i} className="flex items-center gap-2 text-sm">
                <input type="radio" name={`lesson-correct-${lesson.id}`} checked={checkCorrectIndex === i} onChange={() => setCheckCorrectIndex(i)} className="accent-emerald-400" />
                <input value={c} onChange={e => updateChoice(i, e.target.value)} placeholder={`Choice ${i + 1}`} className={inputClass} />
              </label>)}
          </div>}
      </div>
    </div>;
}

function LessonsEditor({ courseId, modules }) {
  const toast = useToast();
  const { data: lessons, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-cybersachet-lessons", courseId],
    queryFn: () => adminFetchCybersachetLessons(courseId)
  });
  const create = useMutation({
    mutationFn: () => adminSaveCybersachetLesson({ courseId, title: "New lesson", body: "", sortOrder: (lessons?.length ?? 0) }),
    onSuccess: () => { toast.success("Lesson added."); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to add lesson")
  });
  return <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Lessons</p>
        <button onClick={() => create.mutate()} disabled={create.isPending} className="text-xs text-cyan-300 light:text-cyan-600 hover:text-cyan-200">
          + Add lesson
        </button>
      </div>
      {isLoading ? <Skeleton className="h-24 rounded-xl" /> : isError ? <ErrorState message="Couldn't load lessons." onRetry={refetch} /> : lessons.length === 0 ? <EmptyState title="No lessons yet." className="py-6" /> : <div className="space-y-2">
          {lessons.map(l => <LessonRow key={l.id} lesson={l} courseId={courseId} modules={modules ?? []} onSaved={refetch} />)}
        </div>}
    </div>;
}

function QuizRow({ question, courseId, onSaved }) {
  const [text, setText] = useState(question.question);
  const [choices, setChoices] = useState(question.choices.length ? question.choices : ["", "", "", ""]);
  const [questionType, setQuestionType] = useState(question.questionType ?? "single");
  const [correctIndex, setCorrectIndex] = useState(question.correctIndex ?? 0);
  const [correctIndexes, setCorrectIndexes] = useState(new Set(question.correctIndexes ?? []));
  // Ordering is authored as "what step number is this choice", 1-based —
  // simpler for a human to fill in than reasoning about index arrays.
  const [positions, setPositions] = useState(() => {
    const order = question.correctOrder ?? choices.map((_, i) => i);
    const pos = new Array(choices.length);
    order.forEach((choiceIdx, stepIdx) => { pos[choiceIdx] = stepIdx + 1; });
    return pos;
  });
  const toast = useToast();
  const confirm = useConfirm();
  const save = useMutation({
    mutationFn: () => {
      const correctOrder = questionType === "ordering" ? choices.map((_, i) => i).sort((a, b) => positions[a] - positions[b]) : null;
      return adminSaveCybersachetQuizQuestion({
        id: question.id, courseId, question: text, choices, sortOrder: question.sortOrder,
        questionType,
        correctIndex: questionType === "single" ? correctIndex : null,
        correctIndexes: questionType === "multiple" ? [...correctIndexes].sort((a, b) => a - b) : null,
        correctOrder
      });
    },
    onSuccess: () => { toast.success("Question saved."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to save question")
  });
  const remove = useMutation({
    mutationFn: () => adminDeleteCybersachetQuizQuestion(question.id),
    onSuccess: () => { toast.success("Question deleted."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete question")
  });
  function updateChoice(i, v) {
    setChoices(choices.map((c, idx) => idx === i ? v : c));
  }
  function toggleMultiple(i) {
    const next = new Set(correctIndexes);
    if (next.has(i)) next.delete(i); else next.add(i);
    setCorrectIndexes(next);
  }
  return <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-black/20 light:bg-slate-900/[0.02] p-3 space-y-2">
      <div className="flex items-end gap-2">
        <LabeledInput label="Question" value={text} onChange={e => setText(e.target.value)} className="flex-1" />
        <LabeledSelect label="Answer type" value={questionType} onChange={e => setQuestionType(e.target.value)} className="w-36 shrink-0">
          {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </LabeledSelect>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300 disabled:opacity-50">Save</button>
        <button onClick={async () => { if (await confirm({ title: "Delete question?", description: "This removes it from the quiz for every organization." })) remove.mutate(); }} className="shrink-0 rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-300 light:text-red-600 hover:bg-red-400/10">Delete</button>
      </div>

      {questionType === "single" && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {choices.map((c, i) => <label key={i} className="flex items-center gap-2 text-sm">
              <input type="radio" name={`correct-${question.id}`} checked={correctIndex === i} onChange={() => setCorrectIndex(i)} className="accent-emerald-400" />
              <input value={c} onChange={e => updateChoice(i, e.target.value)} placeholder={`Choice ${i + 1}`} className={inputClass} />
            </label>)}
        </div>}
      {questionType === "multiple" && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {choices.map((c, i) => <label key={i} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={correctIndexes.has(i)} onChange={() => toggleMultiple(i)} className="accent-emerald-400" />
              <input value={c} onChange={e => updateChoice(i, e.target.value)} placeholder={`Choice ${i + 1}`} className={inputClass} />
            </label>)}
        </div>}
      {questionType === "ordering" && <div className="space-y-2">
          {choices.map((c, i) => <div key={i} className="flex items-center gap-2">
              <input type="number" min={1} max={choices.length} value={positions[i] ?? i + 1} onChange={e => { const next = [...positions]; next[i] = Number(e.target.value); setPositions(next); }} className={`w-16 shrink-0 ${inputClass}`} />
              <input value={c} onChange={e => updateChoice(i, e.target.value)} placeholder={`Step ${i + 1}`} className={inputClass} />
            </div>)}
        </div>}
      <p className="text-[11px] text-white/40 light:text-slate-400">
        {questionType === "single" ? "Select the radio button next to the correct answer."
          : questionType === "multiple" ? "Check every correct answer."
          : "Enter the correct step number (1 = first) next to each choice."}
      </p>
    </div>;
}

function QuizEditor({ courseId }) {
  const toast = useToast();
  const { data: questions, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-cybersachet-quiz", courseId],
    queryFn: () => adminFetchCybersachetQuizQuestions(courseId)
  });
  const create = useMutation({
    mutationFn: () => adminSaveCybersachetQuizQuestion({ courseId, question: "New question", choices: ["", "", "", ""], questionType: "single", correctIndex: 0, sortOrder: (questions?.length ?? 0) }),
    onSuccess: () => { toast.success("Question added."); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to add question")
  });
  return <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Quiz questions</p>
        <button onClick={() => create.mutate()} disabled={create.isPending} className="text-xs text-cyan-300 light:text-cyan-600 hover:text-cyan-200">
          + Add question
        </button>
      </div>
      {isLoading ? <Skeleton className="h-24 rounded-xl" /> : isError ? <ErrorState message="Couldn't load quiz questions." onRetry={refetch} /> : questions.length === 0 ? <EmptyState title="No quiz questions yet." className="py-6" /> : <div className="space-y-2">
          {questions.map(q => <QuizRow key={q.id} question={q} courseId={courseId} onSaved={refetch} />)}
        </div>}
    </div>;
}

function CourseCard({ course, expanded, onToggle, onSaved }) {
  const [title, setTitle] = useState(course.title);
  const [slug, setSlug] = useState(course.slug);
  const [description, setDescription] = useState(course.description ?? "");
  const [level, setLevel] = useState(course.level);
  const [estimatedMinutes, setEstimatedMinutes] = useState(course.estimatedMinutes);
  const [published, setPublished] = useState(course.published);
  const [category, setCategory] = useState(course.category ?? "security-awareness");
  const [freeTier, setFreeTier] = useState(course.freeTier ?? false);
  const toast = useToast();
  const confirm = useConfirm();
  const { data: modules } = useQuery({ queryKey: ["admin-cybersachet-modules", course.id], queryFn: () => adminFetchCybersachetModules(course.id), enabled: expanded });
  const save = useMutation({
    mutationFn: () => adminSaveCybersachetCourse({ id: course.id, slug, title, description, level, estimatedMinutes: Number(estimatedMinutes), published, sortOrder: course.sortOrder, category, freeTier }),
    onSuccess: () => { toast.success("Course saved."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to save course")
  });
  const remove = useMutation({
    mutationFn: () => adminDeleteCybersachetCourse(course.id),
    onSuccess: () => { toast.success("Course deleted."); onSaved(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete course")
  });
  return <SpotlightCard className="overflow-hidden" tint="amber">
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <LabeledInput label="Course title" value={title} onChange={e => setTitle(e.target.value)} className="min-w-[240px] flex-1 text-sm font-medium" />
          <span className="mt-6 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium bg-white/10 light:bg-slate-900/8 text-white/60 light:text-slate-500">
            {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"} · {course.quizQuestionCount} quiz Q · {course.enrollmentCount} enrolled
          </span>
        </div>

        <div>
          <SectionLabel>Catalog details</SectionLabel>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <LabeledInput label="URL slug" value={slug} onChange={e => setSlug(slugify(e.target.value))} />
            <LabeledSelect label="Difficulty" value={level} onChange={e => setLevel(e.target.value)}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </LabeledSelect>
            <LabeledInput label="Minutes" type="number" min={1} value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} />
            <LabeledField label="Category">
              <input list="cybersachet-categories" value={category} onChange={e => setCategory(e.target.value)} className={inputClass} />
              <datalist id="cybersachet-categories">
                {Object.keys(CATEGORY_LABELS).map(k => <option key={k} value={k} />)}
              </datalist>
            </LabeledField>
          </div>
        </div>

        <LabeledTextarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 light:border-slate-900/10 pt-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/70 light:text-slate-600">
              <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="h-4 w-4 rounded border-white/20 light:border-slate-900/25 bg-black/40 light:bg-slate-900/[0.03] accent-emerald-400" />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70 light:text-slate-600" title="Included on the Starter package with no license upgrade — keep this to at most two courses.">
              <input type="checkbox" checked={freeTier} onChange={e => setFreeTier(e.target.checked)} className="h-4 w-4 rounded border-white/20 light:border-slate-900/25 bg-black/40 light:bg-slate-900/[0.03] accent-emerald-400" />
              Included on Starter
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={onToggle} className="rounded-full border border-white/15 light:border-slate-900/15 px-3 py-1.5 text-xs text-white/70 light:text-slate-600 hover:text-white light:hover:text-slate-900">
              {expanded ? "Hide modules, lessons & quiz" : "Edit modules, lessons & quiz"}
            </button>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-medium text-black hover:bg-amber-300 disabled:opacity-50">
              Save
            </button>
            <button onClick={async () => { if (await confirm({ title: "Delete course?", description: "This removes it, its modules, lessons, quiz, and every organization's enrollment history." })) remove.mutate(); }} className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-300 light:text-red-600 hover:bg-red-400/10">
              Delete
            </button>
          </div>
        </div>
      </div>
      {expanded && <div className="border-t border-white/10 light:border-slate-900/10 p-5 space-y-6 bg-black/10 light:bg-slate-900/[0.015]">
          <ModulesEditor courseId={course.id} />
          <LessonsEditor courseId={course.id} modules={modules} />
          <QuizEditor courseId={course.id} />
        </div>}
    </SpotlightCard>;
}

export default function AdminCyberSachetCourses() {
  const toast = useToast();
  const { data: courses, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-cybersachet-courses"],
    queryFn: adminFetchCybersachetCourses
  });
  const [expandedId, setExpandedId] = useState(null);
  const create = useMutation({
    mutationFn: () => adminSaveCybersachetCourse({ slug: `new-course-${Date.now()}`, title: "New course", description: "", level: "beginner", estimatedMinutes: 15, published: false, sortOrder: (courses?.length ?? 0), category: "security-awareness", freeTier: false }),
    onSuccess: () => { toast.success("Course created — fill it in below."); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to create course")
  });

  return <div className="space-y-6">
      <Reveal y={12} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">CyberSachet Courses</h1>
          <p className="text-sm text-white/50 light:text-slate-500">
            The training catalog every CyberSachet-licensed organization sees. Unpublished courses are hidden from customers.
            "Included on Starter" courses stay free on every package — keep that to at most two.
          </p>
        </div>
        <button onClick={() => create.mutate()} disabled={create.isPending} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black hover:bg-amber-300 disabled:opacity-50">
          + New course
        </button>
      </Reveal>

      {isLoading ? <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div> : isError ? <ErrorState message={error instanceof Error ? `Couldn't load courses — ${error.message}` : "Couldn't load courses."} onRetry={refetch} /> : courses.length === 0 ? <EmptyState title="No courses yet." description="Create your first course to start building the training catalog." /> : <div className="space-y-4">
          {courses.map(course => <CourseCard key={course.id} course={course} expanded={expandedId === course.id} onToggle={() => setExpandedId(expandedId === course.id ? null : course.id)} onSaved={refetch} />)}
        </div>}
    </div>;
}
