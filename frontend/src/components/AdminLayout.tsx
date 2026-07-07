import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GridScanBackground } from "./PageBackgrounds";
import { BrandMark } from "./BrandLogo";

const NAV_ITEMS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/organizations", label: "Organizations" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/content", label: "Content Manager" },
  { to: "/admin/visibility", label: "Site Visibility" },
  { to: "/admin/plans", label: "Plan Limits" },
  { to: "/admin/leads", label: "Leads & Messages" },
];

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div
      className="flex min-h-screen bg-black text-white antialiased"
      style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}
    >
      <div className="fixed inset-0 z-0">
        <GridScanBackground tint="amber" />
      </div>
      {/* Amber accent stripe + badge distinguish this from the customer app at a glance. */}
      <div className="fixed left-0 right-0 top-0 z-40 h-1 bg-amber-400" />
      <aside className="relative z-10 flex w-64 shrink-0 flex-col border-r border-white/10 bg-neutral-950 pt-1">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                Platform Admin
              </span>
              <p className="mt-1 truncate text-xs text-white/45">ITOps Solution</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-amber-400 text-black" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Link to="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white">
            ← Back to your organization
          </Link>
          <p className="mt-2 truncate px-3 text-xs text-white/45">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/5"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="relative z-10 flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
