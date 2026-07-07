import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NetworkPulseBackground } from "./PageBackgrounds";
import { BrandMark } from "./BrandLogo";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/monitors", label: "Monitors" },
  { to: "/hosts", label: "Hosts (Kada Nigrani)" },
  { to: "/incidents", label: "Incidents" },
  { to: "/assets", label: "Assets" },
  { to: "/settings/alerts", label: "Alert Channels" },
  { to: "/team", label: "Team & Plan" },
];


export function Layout() {
  const { user, organization, isPlatformAdmin, logout } = useAuth();

  return (
    <div
      className="flex min-h-screen bg-black text-white antialiased"
      style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}
    >
      <div className="fixed inset-0 z-0">
        <NetworkPulseBackground tint="emerald" />
      </div>
      <aside className="relative z-10 flex w-64 shrink-0 flex-col border-r border-white/10 bg-neutral-950">
        <Link to="/" className="flex items-center gap-2.5 border-b border-white/10 p-4">
          <BrandMark size={30} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">ITOps Monitor</p>
            <p className="truncate text-xs text-white/45">{organization?.name}</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-white text-black" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isPlatformAdmin && (
            <NavLink
              to="/admin"
              className="mt-4 block rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              Platform Admin →
            </NavLink>
          )}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="truncate text-xs text-white/45">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/5"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="relative z-10 flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
