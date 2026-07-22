import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchDepartments, fetchOrgAcademyCourseStats, fetchOrgAcademySummary, fetchTeams } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { Reveal, SpotlightCard } from "../components/Animated";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { CategoryIcon } from "../components/CyberSachetTheme";
import { CATEGORY_LABELS } from "../data/cybersachetCourses";
import { AcademyMark } from "../components/AcademyBrand";

const LEVEL_TONE = {
  beginner: "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700",
  intermediate: "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700",
  advanced: "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700"
};
const TABS = [{ key: "overview", label: "Overview" }, { key: "users", label: "Users" }, { key: "courses", label: "Courses" }, { key: "groups", label: "Groups" }];

function StatTile({ label, value, tone, suffix }) {
  return <div className={`rounded-2xl border p-4 ${tone ?? "border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-white"}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-white light:text-slate-900">
        {value == null ? "—" : <AnimatedCounter value={value} />}{value != null && suffix}
      </p>
    </div>;
}

function OverviewTab({ summary, courseStats }) {
  const topCourses = (courseStats ?? []).slice().sort((a, b) => b.assignedCount - a.assignedCount).slice(0, 5);
  return <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total users" value={summary?.memberCount} />
        <StatTile label="Active courses" value={summary?.activeCourseCount} />
        <StatTile label="Groups" value={summary?.groupCount} />
        <StatTile label="Avg score" value={summary?.avgScore ?? null} suffix="%" tone="border-violet-400/20 light:border-violet-500/25 bg-violet-400/[0.05] light:bg-violet-50" />
      </div>

      <SpotlightCard className="overflow-hidden" tint="violet">
        <div className="flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-violet-300 light:text-violet-700"><AcademyMark size={13} /> Moonsav ITOps Academy</p>
            <h2 className="mt-1 text-xl font-medium text-white light:text-slate-900">Master IT Operations</h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/60 light:text-slate-500">Cloud, DevOps, and infrastructure training your team can actually use — real labs, real interview prep, and a certificate at the end of every course, not a slideshow.</p>
          </div>
          <Link to="/training/academy" className="shrink-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-center text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.5)]">
            View catalog →
          </Link>
        </div>
      </SpotlightCard>

      <SpotlightCard className="overflow-hidden" delay={0.05}>
        <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
          <h3 className="text-sm font-medium text-white light:text-slate-900">Most-assigned courses</h3>
        </div>
        {!courseStats ? <SkeletonRows count={2} /> : topCourses.length === 0 ? <EmptyState title="No courses assigned yet." description="Assign a course from the Courses tab or from Users." /> : <div className="divide-y divide-white/10 light:divide-slate-900/8">
            {topCourses.map(c => <div key={c.courseId} className="flex items-center gap-3 px-4 py-3">
                <CategoryIcon category={c.category} size={16} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white light:text-slate-900">{c.title}</p>
                  <p className="text-[11px] text-white/40 light:text-slate-400">{c.completedCount}/{c.assignedCount} completed{c.avgScore != null ? ` · avg ${c.avgScore}%` : ""}</p>
                </div>
                <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/10 light:bg-slate-900/8">
                  <div className="h-full rounded-full bg-violet-400" style={{ width: `${c.completionPct}%` }} />
                </div>
              </div>)}
          </div>}
      </SpotlightCard>
    </div>;
}

function UsersTab({ summary }) {
  return <SpotlightCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h3 className="text-sm font-medium text-white light:text-slate-900">Recent users</h3>
        <Link to="/users" className="text-xs text-violet-300 light:text-violet-600 hover:underline">Manage all users →</Link>
      </div>
      {!summary ? <SkeletonRows count={2} /> : (summary.recentMembers ?? []).length === 0 ? <EmptyState title="No users yet." /> : <div className="divide-y divide-white/10 light:divide-slate-900/8">
          {summary.recentMembers.map(m => <div key={m.userId} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-white light:text-slate-900">{m.email}</span>
              <span className="text-[11px] text-white/40 light:text-slate-400">Joined {new Date(m.joinedAt).toLocaleDateString()}</span>
            </div>)}
        </div>}
    </SpotlightCard>;
}

function CoursesTab({ courseStats, isLoading, isError, onRetry }) {
  return <SpotlightCard className="overflow-hidden">
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h3 className="text-sm font-medium text-white light:text-slate-900">Academy courses</h3>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">Every course your plan currently unlocks, with real assignment and completion numbers for your organization.</p>
      </div>
      {isError ? <ErrorState message="Couldn't load course stats." onRetry={onRetry} /> : isLoading ? <SkeletonRows count={3} /> : !courseStats || courseStats.length === 0 ? <EmptyState title="No academy courses available yet." /> : <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-[11px] uppercase text-white/40 light:text-slate-400">
              <tr><th className="px-4 py-2">Course</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">Assigned</th><th className="px-4 py-2">Completed</th><th className="px-4 py-2">Avg score</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {courseStats.map(c => <tr key={c.courseId}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={c.category} size={14} />
                      <span className="text-white light:text-slate-900">{c.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${LEVEL_TONE[c.level] ?? LEVEL_TONE.beginner}`}>{c.level}</span></td>
                  <td className="px-4 py-3 text-white/70 light:text-slate-600">{c.assignedCount}</td>
                  <td className="px-4 py-3 text-white/70 light:text-slate-600">{c.completedCount} ({c.completionPct}%)</td>
                  <td className="px-4 py-3 text-white/70 light:text-slate-600">{c.avgScore != null ? `${c.avgScore}%` : "—"}</td>
                </tr>)}
            </tbody>
          </table>
        </div>}
    </SpotlightCard>;
}

function GroupsTab() {
  const { data: departments, isLoading: deptLoading, isError: deptError, refetch: refetchDept } = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments, retry: false });
  const { data: teams, isLoading: teamsLoading, isError: teamsError, refetch: refetchTeams } = useQuery({ queryKey: ["teams"], queryFn: () => fetchTeams(), retry: false });
  const activeDepartments = (departments ?? []).filter(d => !d.archived);
  const activeTeams = (teams ?? []).filter(t => !t.archived);
  const isLoading = deptLoading || teamsLoading;
  const isError = deptError || teamsError;
  return <SpotlightCard className="overflow-hidden">
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h3 className="text-sm font-medium text-white light:text-slate-900">Groups</h3>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">Departments and the teams within them — the same real groups used everywhere training is assigned. Create or edit them from <Link to="/users" className="underline hover:text-white/70 light:hover:text-slate-600">Users</Link>.</p>
      </div>
      {isError ? <ErrorState message="Couldn't load groups." onRetry={() => { refetchDept(); refetchTeams(); }} /> : isLoading ? <SkeletonRows count={2} /> : activeDepartments.length === 0 ? <EmptyState title="No groups yet." description="Create a department from the Users page to start grouping learners." /> : <div className="divide-y divide-white/10 light:divide-slate-900/8">
          {activeDepartments.map(d => <div key={d.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white light:text-slate-900">{d.name}</p>
                <span className="text-[11px] text-white/40 light:text-slate-400">{d.memberCount} member{d.memberCount === 1 ? "" : "s"}</span>
              </div>
              {activeTeams.filter(t => t.departmentId === d.id).length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeTeams.filter(t => t.departmentId === d.id).map(t => <span key={t.id} className="rounded-full border border-white/10 light:border-slate-900/10 px-2.5 py-1 text-[11px] text-white/60 light:text-slate-600">{t.name} · {t.memberCount}</span>)}
                </div>}
            </div>)}
        </div>}
    </SpotlightCard>;
}

export default function AcademyAdmin() {
  const { organization } = useAuth();
  const [tab, setTab] = useState("overview");
  const { data: summary, isError: summaryError, refetch: refetchSummary } = useQuery({ queryKey: ["org-academy-summary"], queryFn: fetchOrgAcademySummary, retry: false });
  const { data: courseStats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({ queryKey: ["org-academy-course-stats"], queryFn: fetchOrgAcademyCourseStats, retry: false });

  return <div className="space-y-6">
      <Reveal y={12} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Manage Academy</h1>
          <p className="text-sm text-white/50 light:text-slate-500">Overview of {organization?.name ?? "your organization"}'s Moonsav ITOps Academy usage.</p>
        </div>
        <Link to="/users" className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.5)]">
          + Add user
        </Link>
      </Reveal>

      <div className="inline-flex gap-1 rounded-full border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-1" role="tablist">
        {TABS.map(t => <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${tab === t.key ? "bg-white text-black" : "text-white/55 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
            {t.label}
          </button>)}
      </div>

      {summaryError && <ErrorState message="Couldn't load academy summary." onRetry={refetchSummary} />}
      {tab === "overview" && <OverviewTab summary={summary} courseStats={courseStats} />}
      {tab === "users" && <UsersTab summary={summary} />}
      {tab === "courses" && <CoursesTab courseStats={courseStats} isLoading={statsLoading} isError={statsError} onRetry={refetchStats} />}
      {tab === "groups" && <GroupsTab />}
    </div>;
}
