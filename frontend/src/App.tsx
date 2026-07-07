import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { CommandPalette } from "./components/CommandPalette";
import { BrandLoading } from "./components/BrandLogo";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Monitors from "./pages/Monitors";
import MonitorDetail from "./pages/MonitorDetail";
import Hosts from "./pages/Hosts";
import Incidents from "./pages/Incidents";
import Assets from "./pages/Assets";
import AlertChannels from "./pages/AlertChannels";
import Team from "./pages/Team";
import Platform from "./pages/Platform";
import Solutions from "./pages/Solutions";
import SolutionDetail from "./pages/SolutionDetail";
import Pricing from "./pages/Pricing";
import Company from "./pages/Company";
import Support from "./pages/Support";
import CyberSachet from "./pages/CyberSachet";
import StatusPage from "./pages/StatusPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminContent from "./pages/admin/AdminContent";
import AdminVisibility from "./pages/admin/AdminVisibility";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminLeads from "./pages/admin/AdminLeads";

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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
