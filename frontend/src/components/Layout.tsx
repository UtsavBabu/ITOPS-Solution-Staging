import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NetworkPulseBackground } from "./PageBackgrounds";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/monitors", label: "Monitors" },
  { to: "/hosts", label: "Hosts (Kada Nigrani)" },
  { to: "/incidents", label: "Incidents" },
  { to: "/assets", label: "Assets" },
  { to: "/settings/alerts", label: "Alert Channels" },
  { to: "/team", label: "Team & Plan" },
];

function LogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} fill="none" aria-hidden="true">
      <path
        d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z"
        fill="#ffffff"
      />
    </svg>
  );
}

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
        <Link to="/" className="flex items-center gap-2 border-b border-white/10 p-4">
          <LogoMark />
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
