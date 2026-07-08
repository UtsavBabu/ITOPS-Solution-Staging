import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NetworkPulseBackground } from "./PageBackgrounds";
import { BrandMark } from "./BrandLogo";
import { useQuery } from "@tanstack/react-query";
import { fetchPlanUsage } from "../api/endpoints";

const PLAN_COLORS: Record<string, string> = {
  STARTER: "bg-white/10 text-white/60",
  PROFESSIONAL: "bg-blue-400/10 text-blue-300",
  BUSINESS: "bg-violet-400/10 text-violet-300",
  ENTERPRISE: "bg-amber-400/10 text-amber-300",
};

const NAV_GROUPS = [
  {
    label: "Monitoring",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "⬡", end: true },
      { to: "/monitors", label: "Website & Network", icon: "◈" },
      { to: "/hosts", label: "Server Agents", icon: "▣" },
      { to: "/incidents", label: "Incidents", icon: "⚡" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/assets", label: "Assets", icon: "◫" },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/settings/alerts", label: "Alert Channels", icon: "◎" },
      { to: "/team", label: "Team & Plan", icon: "◉" },
    ],
  },
];

export function Layout() {
  const { user, organization, isPlatformAdmin, logout } = useAuth();
  const { data: usage } = useQuery({ queryKey: ["plan-usage"], queryFn: fetchPlanUsage, staleTime: 60_000 });

  const planColor = PLAN_COLORS[usage?.plan ?? "STARTER"] ?? PLAN_COLORS.STARTER;

  return (
    <div
      className="flex min-h-screen bg-black text-white antialiased"
      style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}
    >
      <div className="fixed inset-0 z-0">
        <NetworkPulseBackground tint="emerald" />
      </div>

      {/* Fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-white/10 bg-neutral-950">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 border-b border-white/10 p-4">
          <BrandMark size={30} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">ITOps Monitor</p>
            <p className="truncate text-xs text-white/45">{organization?.name ?? "Loading…"}</p>
          </div>
        </Link>

        {/* Plan badge */}
        {usage && (
          <div className="border-b border-white/10 px-4 py-2">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${planColor}`}>
                {usage.plan} plan
              </span>
              <span className="text-[11px] text-white/35">
                {usage.currentMonitors}/{usage.maxMonitors} monitors
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${Math.min(100, (usage.currentMonitors / usage.maxMonitors) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                {group.label}
              </p>
              <div className="space-y-0.5 px-2">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={"end" in item ? item.end : false}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive ? "bg-white text-black" : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <span className="text-[13px] opacity-70">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {isPlatformAdmin && (
            <div className="px-2">
              <NavLink
                to="/admin"
                className="flex items-center gap-2.5 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-400/10"
              >
                <span className="text-[13px]">★</span>
                Platform Admin
              </NavLink>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3">
          <p className="truncate px-1 text-xs text-white/40">{user?.email}</p>
          <div className="mt-2 flex gap-2">
            <Link
              to="/team"
              className="flex-1 rounded-lg border border-white/10 px-2 py-1.5 text-center text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              Upgrade
            </Link>
            <button
              onClick={logout}
              className="flex-1 rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/5"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="relative z-10 ml-64 flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
