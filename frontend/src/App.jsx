import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { usePortalType } from "./hooks/usePortalType";
import { CommandPalette } from "./components/CommandPalette";
import { BrandLoading } from "./components/BrandLogo";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
// Route-level code splitting: a first-time mobile visitor downloads only the
// page they landed on, not the whole admin panel and customer app with it.
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));
const Monitors = lazy(() => import("./pages/Monitors"));
const MonitorDetail = lazy(() => import("./pages/MonitorDetail"));
const Hosts = lazy(() => import("./pages/Hosts"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Assets = lazy(() => import("./pages/Assets"));
const AlertChannels = lazy(() => import("./pages/AlertChannels"));
const Team = lazy(() => import("./pages/Team"));
const CyberSachetTraining = lazy(() => import("./pages/CyberSachetTraining"));
const Platform = lazy(() => import("./pages/Platform"));
const Solutions = lazy(() => import("./pages/Solutions"));
const SolutionDetail = lazy(() => import("./pages/SolutionDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Company = lazy(() => import("./pages/Company"));
const Support = lazy(() => import("./pages/Support"));
const CyberSachet = lazy(() => import("./pages/CyberSachet"));
const BecomeReseller = lazy(() => import("./pages/BecomeReseller"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const InviteAccept = lazy(() => import("./pages/InviteAccept"));
const _DevCertPreview = lazy(() => import("./pages/_DevCertPreview"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminVisibility = lazy(() => import("./pages/admin/AdminVisibility"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));
const AdminResellers = lazy(() => import("./pages/admin/AdminResellers"));
const AdminMonitors = lazy(() => import("./pages/admin/AdminMonitors"));
const AdminIncidents = lazy(() => import("./pages/admin/AdminIncidents"));
const AdminAgents = lazy(() => import("./pages/admin/AdminAgents"));
const AdminSslCerts = lazy(() => import("./pages/admin/AdminSslCerts"));
const AdminCyberSachetCourses = lazy(() => import("./pages/admin/AdminCyberSachetCourses"));
function ProtectedRoute({
  children
}) {
  const {
    user,
    isLoading
  } = useAuth();
  if (isLoading) {
    return <BrandLoading />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
function PlatformAdminRoute({
  children
}) {
  const {
    user,
    isPlatformAdmin,
    isLoading
  } = useAuth();
  if (isLoading) {
    return <BrandLoading />;
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
function PublicOnlyRoute({
  children
}) {
  const {
    user,
    isLoading
  } = useAuth();
  if (isLoading) {
    return <BrandLoading />;
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
function AdminPublicOnlyRoute({
  children
}) {
  const {
    user,
    isPlatformAdmin,
    isLoading
  } = useAuth();
  if (isLoading) {
    return <BrandLoading />;
  }
  if (user && isPlatformAdmin) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
// Employee Portal vs Organization Console (see usePortalType.js): a member
// with no operational view access anywhere lands on the curated training
// home instead of a monitoring dashboard that would show nothing relevant
// to them anyway.
function DashboardGate() {
  const { portal, isLoading } = usePortalType();
  if (isLoading) return <BrandLoading />;
  return portal === "employee" ? <EmployeeDashboard /> : <Dashboard />;
}
// Defense in depth beyond the sidebar's nav filtering: an Employee Portal
// member who navigates straight to an operator route by URL gets bounced
// to their own dashboard, not a mostly-empty operator page.
function RequireConsoleAccess({ children }) {
  const { portal, isLoading } = usePortalType();
  if (isLoading) return <BrandLoading />;
  if (portal === "employee") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
export default function App() {
  return <>
    <CommandPalette />
    <Suspense fallback={<BrandLoading />}>
    <Routes>
      <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
      {/* Not PublicOnlyRoute: Supabase's recovery link establishes a logged-in
          session on this exact page, so gating on "no user" would bounce the
          visitor to /dashboard before they can set a new password. */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin/login" element={<AdminPublicOnlyRoute><AdminLogin /></AdminPublicOnlyRoute>} />

      {/* Marketing pages are viewable whether logged in or out, like any real SaaS site. */}
      <Route path="/platform" element={<Platform />} />
      <Route path="/solutions" element={<Solutions />} />
      <Route path="/solutions/:slug" element={<SolutionDetail />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/company" element={<Company />} />
      <Route path="/support" element={<Support />} />
      <Route path="/cybersachet" element={<CyberSachet />} />
      <Route path="/partners" element={<BecomeReseller />} />

      {/* Public per-organization status page — no auth required. */}
      <Route path="/status/:slug" element={<StatusPage />} />

      {/* Public certificate verification — same "no auth required" pattern
          as the status page; anyone with a certificate ID or QR code can
          check it, logged in or not. */}
      <Route path="/verify" element={<VerifyCertificate />} />
      <Route path="/_dev-cert-preview" element={<_DevCertPreview />} />
      <Route path="/verify/:certificateNo" element={<VerifyCertificate />} />

      {/* Team invite acceptance — reachable logged out (to sign up) or logged
          in (to see the "already have an organization" message); not wrapped
          in ProtectedRoute or PublicOnlyRoute for that reason. */}
      <Route path="/invite/:token" element={<InviteAccept />} />

      <Route element={<ProtectedRoute>
            <Layout />
          </ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardGate />} />
        <Route path="/training" element={<CyberSachetTraining />} />
        {/* Operator-only routes — an Employee Portal member (no operational
            view access anywhere) is redirected back to /dashboard even on a
            direct URL, not just hidden from the sidebar. */}
        <Route element={<RequireConsoleAccess><Outlet /></RequireConsoleAccess>}>
          <Route path="/monitors" element={<Monitors mode="web" />} />
          <Route path="/network" element={<Monitors mode="network" />} />
          <Route path="/monitors/:id" element={<MonitorDetail />} />
          <Route path="/hosts" element={<Hosts />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/settings/alerts" element={<AlertChannels />} />
          <Route path="/team" element={<Team />} />
        </Route>
      </Route>

      <Route element={<PlatformAdminRoute>
            <AdminLayout />
          </PlatformAdminRoute>}>
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/customers" element={<AdminCustomers />} />
        {/* Organizations was a strict subset of Customers (same rename/archive/
            delete/plan actions, none of the provisioning or license detail) —
            consolidated into one page; redirect any old bookmarks/links. */}
        <Route path="/admin/organizations" element={<Navigate to="/admin/customers" replace />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/content" element={<AdminContent />} />
        <Route path="/admin/visibility" element={<AdminVisibility />} />
        <Route path="/admin/plans" element={<AdminPlans />} />
        <Route path="/admin/leads" element={<AdminLeads />} />
        <Route path="/admin/audit-log" element={<AdminAuditLog />} />
        <Route path="/admin/roles" element={<AdminRoles />} />
        <Route path="/admin/resellers" element={<AdminResellers />} />
        <Route path="/admin/monitors" element={<AdminMonitors />} />
        <Route path="/admin/incidents" element={<AdminIncidents />} />
        <Route path="/admin/agents" element={<AdminAgents />} />
        <Route path="/admin/ssl" element={<AdminSslCerts />} />
        <Route path="/admin/cybersachet-courses" element={<AdminCyberSachetCourses />} />
      </Route>

      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<Cookies />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>;
}