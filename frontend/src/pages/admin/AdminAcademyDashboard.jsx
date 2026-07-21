import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { adminFetchAcademyCourseStats, adminFetchAcademyDashboardStats, adminFetchRecentAcademyCertificates } from "../../api/adminEndpoints";
import { AdminStatCard } from "../../components/AdminStatCard";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows, SkeletonStatGrid } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/EmptyState";
import { AcademyMark } from "../../components/AcademyBrand";

const TRACK_LABEL = { academy: "ITOps Academy", security: "CyberSachet" };

export default function AdminAcademyDashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["admin-academy-stats"],
    queryFn: adminFetchAcademyDashboardStats
  });
  const { data: courseStats, isLoading: courseStatsLoading, isError: courseStatsError, refetch: refetchCourseStats } = useQuery({
    queryKey: ["admin-academy-course-stats"],
    queryFn: adminFetchAcademyCourseStats
  });
  const { data: recentCerts, isLoading: certsLoading, isError: certsError, refetch: refetchCerts } = useQuery({
    queryKey: ["admin-recent-academy-certificates"],
    queryFn: () => adminFetchRecentAcademyCertificates(15)
  });

  const completionRate = stats && stats.totalEnrollments > 0 ? Math.round((stats.completedEnrollments / stats.totalEnrollments) * 100) : null;

  return <div className="space-y-6">
      <Reveal y={12} className="flex items-center gap-3">
        <AcademyMark size={34} />
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Academy Dashboard</h1>
          <p className="text-sm text-white/50 light:text-slate-500">Real operational numbers across both training products — CyberSachet and Moonsav ITOps Academy — from actual enrollment and certificate data, nothing precomputed.</p>
        </div>
      </Reveal>

      {statsLoading ? <SkeletonStatGrid count={6} /> : statsError ? <ErrorState message="Couldn't load Academy stats." onRetry={refetchStats} /> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <AdminStatCard label="Students" value={stats.totalStudents} icon="users" delay={0} />
          <AdminStatCard label="Organizations" value={stats.totalOrganizations} icon="organizations" delay={0.03} to="/admin/customers" />
          <AdminStatCard label="Active Courses" value={stats.activeCourses} icon="hosts" delay={0.06} to="/admin/cybersachet-courses" />
          <AdminStatCard label="Certificates Issued" value={stats.certificatesIssued} icon="security" delay={0.09} />
          <AdminStatCard label="Completion Rate" value={completionRate != null ? `${completionRate}%` : "—"} icon="incidents" delay={0.12} />
          <AdminStatCard label="Training Hours" value={stats.totalTrainingHours} icon="waitlist" delay={0.15} />
        </div>}

      {stats && <Reveal delay={0.18}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-4">
              <p className="text-[11px] uppercase tracking-wide text-white/40 light:text-slate-400">ITOps Academy courses</p>
              <p className="mt-1 text-lg font-medium text-white light:text-slate-900">{stats.academyCourses}</p>
            </div>
            <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-4">
              <p className="text-[11px] uppercase tracking-wide text-white/40 light:text-slate-400">CyberSachet courses</p>
              <p className="mt-1 text-lg font-medium text-white light:text-slate-900">{stats.securityCourses}</p>
            </div>
            <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-4">
              <p className="text-[11px] uppercase tracking-wide text-white/40 light:text-slate-400">Total enrollments</p>
              <p className="mt-1 text-lg font-medium text-white light:text-slate-900">{stats.totalEnrollments}</p>
            </div>
            <div className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-4">
              <p className="text-[11px] uppercase tracking-wide text-white/40 light:text-slate-400">Avg. quiz score</p>
              <p className="mt-1 text-lg font-medium text-white light:text-slate-900">{stats.avgQuizScore != null ? `${stats.avgQuizScore}%` : "—"}</p>
            </div>
          </div>
        </Reveal>}

      <div className="grid gap-4 lg:grid-cols-2">
        <SpotlightCard className="overflow-hidden" delay={0.2} scan>
          <div className="flex items-center justify-between border-b border-white/10 light:border-slate-900/10 px-4 py-3">
            <h2 className="text-sm font-medium text-white light:text-slate-900">Popular Courses</h2>
            <Link to="/admin/cybersachet-courses" className="text-xs text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">Manage →</Link>
          </div>
          {courseStatsLoading ? <SkeletonRows count={4} /> : courseStatsError ? <ErrorState message="Couldn't load course stats." onRetry={refetchCourseStats} /> : (courseStats ?? []).length === 0 ? <EmptyState title="No published courses yet." className="py-6" /> : <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
                <tr><th className="px-4 py-2">Course</th><th className="px-4 py-2">Enrolled</th><th className="px-4 py-2">Completed</th><th className="px-4 py-2">Avg score</th></tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {courseStats.slice(0, 8).map(c => <tr key={c.courseId}>
                    <td className="px-4 py-2.5">
                      <p className="text-white light:text-slate-900">{c.title}</p>
                      <span className="text-[10px] text-white/40 light:text-slate-400">{TRACK_LABEL[c.track] ?? c.track}</span>
                    </td>
                    <td className="px-4 py-2.5 text-white/60 light:text-slate-500">{c.enrollmentCount}</td>
                    <td className="px-4 py-2.5 text-white/60 light:text-slate-500">{c.completedCount}</td>
                    <td className="px-4 py-2.5 text-white/60 light:text-slate-500">{c.avgScore != null ? `${c.avgScore}%` : "—"}</td>
                  </tr>)}
              </tbody>
            </table>}
        </SpotlightCard>

        <SpotlightCard className="overflow-hidden" delay={0.24} scan>
          <div className="flex items-center justify-between border-b border-white/10 light:border-slate-900/10 px-4 py-3">
            <h2 className="text-sm font-medium text-white light:text-slate-900">Recent Certificates</h2>
          </div>
          {certsLoading ? <SkeletonRows count={4} /> : certsError ? <ErrorState message="Couldn't load certificates." onRetry={refetchCerts} /> : (recentCerts ?? []).length === 0 ? <EmptyState title="No certificates issued yet." className="py-6" /> : <ul className="divide-y divide-white/[0.06]">
              {recentCerts.map(cert => <li key={cert.certificateNo} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-white light:text-slate-900">{cert.courseTitle ?? "CSSA — Overall"}</p>
                    <p className="truncate text-xs text-white/40 light:text-slate-400">{cert.userEmail} · {cert.organizationName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {cert.revokedAt && <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-medium text-red-300">Revoked</span>}
                    <Link to={`/verify/${cert.certificateNo}`} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 light:text-cyan-600 hover:underline">Verify →</Link>
                  </div>
                </li>)}
            </ul>}
        </SpotlightCard>
      </div>
    </div>;
}
