import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCybersachetLicense, fetchMyCertificate, fetchMyCybersachetAssignments, fetchMyCybersachetStats, fetchMyEnrollments } from "../api/endpoints";
import { Reveal, SpotlightCard } from "../components/Animated";
import { Skeleton } from "../components/Skeleton";
import { BadgeChip, StreakFlame } from "../components/CyberSachetTheme";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  read_only: "Employee",
  READ_ONLY: "Employee",
  MEMBER: "Member",
  ADMIN: "Organization Administrator"
};

/**
 * The Employee Portal home page — for a member whose role has no
 * operational view access at all (see usePortalType.js). Composed entirely
 * from real per-user data already used elsewhere (my_cybersachet_stats,
 * assignments, certificate) — not a cut-down mock of the operator
 * Dashboard. An employee with no CyberSachet license yet sees an honest
 * "not licensed" state, not an empty shell pretending to be a dashboard.
 */
export default function EmployeeDashboard() {
  const { user, organization } = useAuth();
  const { data: licensed, isLoading: licenseLoading } = useQuery({ queryKey: ["cybersachet-license"], queryFn: fetchCybersachetLicense, retry: false });
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ["cybersachet-my-stats"], queryFn: fetchMyCybersachetStats, enabled: !!licensed });
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({ queryKey: ["cybersachet-my-assignments"], queryFn: fetchMyCybersachetAssignments, enabled: !!licensed });
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({ queryKey: ["cybersachet-enrollments"], queryFn: fetchMyEnrollments, enabled: !!licensed });
  const { data: certificate } = useQuery({ queryKey: ["cybersachet-my-certificate"], queryFn: fetchMyCertificate, enabled: !!licensed });

  const enrollmentByCourseId = new Map((enrollments ?? []).map(e => [e.courseId, e]));
  const upcoming = (assignments ?? []).filter(a => !enrollmentByCourseId.get(a.courseId)?.completedAt);
  // These three queries only fire once `licensed` resolves true, so a plain
  // `licenseLoading` gate isn't enough — without this, the stat tiles and
  // "you're caught up" message flash their empty/zero state for everyone
  // while these are still in flight, which reads as "nothing assigned" even
  // when it isn't.
  const dataLoading = statsLoading || assignmentsLoading || enrollmentsLoading;

  if (licenseLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-40 rounded-2xl" /></div>;
  }

  return <div className="space-y-6">
      <Reveal y={12}>
        <div className="rounded-3xl border border-white/10 light:border-sky-200 bg-gradient-to-br from-neutral-950 via-neutral-950 to-sky-950 light:from-white light:via-sky-50 light:to-sky-100 p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">{ROLE_LABELS[user?.role] ?? "Employee"} · {organization?.name}</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight text-white light:text-slate-900">Welcome, {user?.name}</h1>
          <p className="mt-1 text-sm text-white/55 light:text-slate-500">Your assigned training, certificates, and progress.</p>
        </div>
      </Reveal>

      {!licensed ? <Reveal delay={0.05}>
          <SpotlightCard className="p-6 text-center" tint="white">
            <p className="text-sm font-medium text-white light:text-slate-900">CyberSachet isn't licensed for your organization yet.</p>
            <p className="mt-1 text-xs text-white/45 light:text-slate-400">Ask your organization administrator to enable it from Team &amp; Plan.</p>
          </SpotlightCard>
        </Reveal> : dataLoading ? <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <Skeleton className="h-40 rounded-2xl" />
        </div> : <>
          <Reveal delay={0.05}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 light:border-sky-200 bg-white/[0.02] light:bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Assigned</p>
                <p className="mt-1.5 text-xl font-semibold text-white light:text-slate-900">{assignments?.length ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 light:border-sky-200 bg-white/[0.02] light:bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Completed</p>
                <p className="mt-1.5 text-xl font-semibold text-white light:text-slate-900">{stats?.completedCourses ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 light:border-sky-200 bg-white/[0.02] light:bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Avg. score</p>
                <p className="mt-1.5 text-xl font-semibold text-white light:text-slate-900">{stats?.avgScore != null ? `${stats.avgScore}%` : "—"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 light:border-sky-200 bg-white/[0.02] light:bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Streak</p>
                <div className="mt-1.5"><StreakFlame days={stats?.streakDays ?? 0} /></div>
              </div>
            </div>
          </Reveal>

          {stats?.badges?.length > 0 && <Reveal delay={0.08}>
              <div className="flex flex-wrap gap-1.5">
                {stats.badges.map(b => <BadgeChip key={b} code={b} />)}
              </div>
            </Reveal>}

          <Reveal delay={0.1}>
            <SpotlightCard className="p-5" tint="rose">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-white light:text-slate-900">Assigned training</p>
                <Link to="/training" className="text-xs text-rose-300 light:text-sky-600 hover:underline">Open Training →</Link>
              </div>
              {upcoming.length === 0 ? <p className="text-sm text-white/40 light:text-slate-400">Nothing outstanding — you're caught up.</p> : <ul className="space-y-2">
                  {upcoming.map(a => {
                const e = enrollmentByCourseId.get(a.courseId);
                return <li key={a.courseId} className="flex items-center justify-between rounded-xl border border-white/10 light:border-slate-900/10 px-3 py-2 text-sm">
                        <span className="text-white/80 light:text-slate-700">{a.courseTitle ?? e?.courseTitle ?? "Course"}</span>
                        <span className="text-xs text-white/40 light:text-slate-400">
                          {e?.enrolledAt ? "In progress" : "Not started"}{a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString()}` : ""}
                        </span>
                      </li>;
              })}
                </ul>}
            </SpotlightCard>
          </Reveal>

          {certificate && <Reveal delay={0.12}>
              <SpotlightCard className="flex items-center justify-between p-5" tint="amber">
                <div>
                  <p className="text-sm font-medium text-white light:text-slate-900">CSSA certificate</p>
                  <p className="text-xs text-white/45 light:text-slate-400">{certificate.certificateNo} · expires {new Date(certificate.expiresAt).toLocaleDateString()}</p>
                </div>
                <Link to="/training" className="rounded-full bg-gradient-to-r from-blue-700 to-teal-600 px-4 py-2 text-xs font-medium text-white shadow-[0_8px_24px_-8px_rgba(30,58,138,0.5)]">
                  View certificate
                </Link>
              </SpotlightCard>
            </Reveal>}
        </>}
    </div>;
}
