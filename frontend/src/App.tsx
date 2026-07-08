import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { CommandPalette } from "./components/CommandPalette";
import { BrandLoading } from "./components/BrandLogo";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
// Route-level code splitting: a first-time mobile visitor downloads only the
// page they landed on, not the whole admin panel and customer app with it.
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Monitors = lazy(() => import("./pages/Monitors"));
const MonitorDetail = lazy(() => import("./pages/MonitorDetail"));
const Hosts = lazy(() => import("./pages/Hosts"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Assets = lazy(() => import("./pages/Assets"));
const AlertChannels = lazy(() => import("./pages/AlertChannels"));
const Team = lazy(() => import("./pages/Team"));
const Platform = lazy(() => import("./pages/Platform"));
const Solutions = lazy(() => import("./pages/Solutions"));
const SolutionDetail = lazy(() => import("./pages/SolutionDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Company = lazy(() => import("./pages/Company"));
const Support = lazy(() => import("./pages/Support"));
const CyberSachet = lazy(() => import("./pages/CyberSachet"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminOrganizations = lazy(() => import("./pages/admin/AdminOrganizations"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminVisibility = lazy(() => import("./pages/admin/AdminVisibility"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <BrandLoading />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isPlatformAdmin, isLoading } = useAuth();

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

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <BrandLoading />;
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AdminPublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isPlatformAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <BrandLoading />;
  }
  if (user && isPlatformAdmin) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <>
    <CommandPalette />
    <Suspense fallback={<BrandLoading />}>
    <Routes>
      <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/admin/login" element={<AdminPublicOnlyRoute><AdminLogin /></AdminPublicOnlyRoute>} />

      {/* Marketing pages are viewable whether logged in or out, like any real SaaS site. */}
      <Route path="/platform" element={<Platform />} />
      <Route path="/solutions" element={<Solutions />} />
      <Route path="/solutions/:slug" element={<SolutionDetail />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/company" element={<Company />} />
      <Route path="/support" element={<Support />} />
      <Route path="/cybersachet" element={<CyberSachet />} />

      {/* Public per-organization status page — no auth required. */}
      <Route path="/status/:slug" element={<StatusPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/monitors" element={<Monitors />} />
        <Route path="/monitors/:id" element={<MonitorDetail />} />
        <Route path="/hosts" element={<Hosts />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/settings/alerts" element={<AlertChannels />} />
        <Route path="/team" element={<Team />} />
      </Route>

      <Route
        element={
          <PlatformAdminRoute>
            <AdminLayout />
          </PlatformAdminRoute>
        }
      >
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/customers" element={<AdminCustomers />} />
        <Route path="/admin/organizations" element={<AdminOrganizations />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/content" element={<AdminContent />} />
        <Route path="/admin/visibility" element={<AdminVisibility />} />
        <Route path="/admin/plans" element={<AdminPlans />} />
        <Route path="/admin/leads" element={<AdminLeads />} />
      </Route>

      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>
  );
}
