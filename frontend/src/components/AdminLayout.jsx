import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { EnterpriseAuroraBackground } from "./PageBackgrounds";
import { BrandMark } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import { AppSearch } from "./AppSearch";
import { NotificationCenter } from "./NotificationCenter";
// `roles` omitted = visible to every admin role. Purely a UX affordance —
// the real authorization boundary is the RLS/SECURITY DEFINER checks added
// in migration 0030, not this list.
const NAV_GROUPS = [{
  label: "Overview",
  items: [{
    to: "/admin",
    label: "Platform Overview",
    icon: "⬡",
    end: true
  }]
}, {
  label: "Customers",
  roles: ["super_admin", "platform_administrator", "support", "reseller"],
  items: [{
    to: "/admin/customers",
    label: "Customers",
    icon: "◈"
    // No per-item roles — reseller sees this page too (scoped server-side
    // to the customers they provisioned, see migration 0031), but not the
    // items below. (Organizations was a duplicate of this page and was
    // folded in — same rename/archive/delete/plan actions, nothing lost.)
  }, {
    to: "/admin/resellers",
    label: "Resellers",
    icon: "🤝",
    roles: ["super_admin", "platform_administrator", "support"]
  }, {
    to: "/admin/users",
    label: "All Users",
    icon: "◉",
    roles: ["super_admin", "platform_administrator", "support"]
  }]
}, {
  // Cross-org monitoring views — excluded for reseller the same way the
  // backing RPCs are (migration 0035): named data belonging to organizations
  // a reseller didn't provision isn't theirs to see.
  label: "Monitoring",
  roles: ["super_admin", "platform_administrator", "support", "billing", "content_editor"],
  items: [{
    to: "/admin/monitors",
    label: "Monitors",
    icon: "◈"
  }, {
    to: "/admin/incidents",
    label: "Incidents",
    icon: "⚡"
  }, {
    to: "/admin/agents",
    label: "Server Agents",
    icon: "▣"
  }, {
    to: "/admin/ssl",
    label: "SSL Certificates",
    icon: "🔒"
  }]
}, {
  label: "Platform",
  items: [{
    to: "/admin/plans",
    label: "Plan Limits",
    icon: "◎",
    roles: ["super_admin", "billing"]
  }, {
    to: "/admin/content",
    label: "Content Manager",
    icon: "◫",
    roles: ["super_admin", "content_editor"]
  }, {
    to: "/admin/visibility",
    label: "Site Visibility",
    icon: "◈",
    roles: ["super_admin", "content_editor"]
  }, {
    to: "/admin/roles",
    label: "Roles & Permissions",
    icon: "🛡",
    roles: ["super_admin", "platform_administrator"]
  }, {
    to: "/admin/audit-log",
    label: "Audit Log",
    icon: "☰"
  }]
}, {
  label: "Training",
  roles: ["super_admin", "content_editor"],
  items: [{
    to: "/admin/cybersachet-courses",
    label: "CyberSachet Courses",
    icon: "🎓"
  }]
}, {
  label: "CRM",
  roles: ["super_admin", "platform_administrator", "support"],
  items: [{
    to: "/admin/leads",
    label: "Leads & Messages",
    icon: "⚡"
  }]
}];
const ROLE_LABEL = {
  super_admin: "Super Admin",
  platform_administrator: "Platform Admin",
  support: "Support",
  billing: "Billing",
  content_editor: "Content Editor",
  reseller: "Reseller Admin"
};
function visibleFor(role, itemOrGroup) {
  if (!itemOrGroup.roles) return true;
  if (!role) return true; // role not loaded yet — don't flash-hide items
  return itemOrGroup.roles.includes(role);
}
export function AdminLayout() {
  const {
    user,
    logout,
    platformAdminRole
  } = useAuth();
  const visibleGroups = NAV_GROUPS.filter(g => visibleFor(platformAdminRole, g)).map(g => ({
    ...g,
    items: g.items.filter(item => visibleFor(platformAdminRole, item))
  })).filter(g => g.items.length > 0);
  const navItems = visibleGroups.flatMap(group => group.items.map(item => ({ label: item.label, to: item.to })));
  return <div className="flex min-h-screen bg-black light:bg-slate-50 text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <div className="fixed inset-0 z-0">
        <EnterpriseAuroraBackground intensity="ambient" tint="amber" forceDark />
      </div>
      {/* Amber accent stripe */}
      <div className="fixed left-0 right-0 top-0 z-40 h-1 bg-amber-400" />

      {/* Fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/10 light:border-slate-900/10 bg-neutral-950 light:bg-white pt-1">
        <Link to="/admin" className="group block border-b border-white/10 light:border-slate-900/10 p-4 transition-colors hover:bg-white/[0.02] light:hover:bg-slate-900/[0.02]">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-amber-400/10 light:bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 light:text-amber-700">
                {ROLE_LABEL[platformAdminRole] ?? "Admin"}
              </span>
              <p className="mt-1 truncate text-xs text-white/45 light:text-slate-500 transition-colors group-hover:text-white/70 light:group-hover:text-slate-600 light:group-hover:text-slate-700">ITOps Solution · Platform Console</p>
            </div>
          </div>
        </Link>

        <AppSearch scope="admin" navItems={navItems} />

        <nav className="flex-1 overflow-y-auto py-3">
          {visibleGroups.map(group => <div key={group.label} className="mb-4">
              <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 light:text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5 px-2">
                {group.items.map(item => <NavLink key={item.to} to={item.to} end={"end" in item ? item.end : false} className={({
              isActive
            }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-amber-400 text-black" : "text-white/60 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-900/5 hover:text-white light:hover:text-slate-900 light:hover:text-slate-900"}`}>
                    <span className="text-[13px] opacity-70">{item.icon}</span>
                    {item.label}
                  </NavLink>)}
              </div>
            </div>)}
        </nav>

        <div className="border-t border-white/10 light:border-slate-900/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-900/5 hover:text-white light:hover:text-slate-900 light:hover:text-slate-900">
              ← Customer Dashboard
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationCenter scope="admin" />
              <ThemeToggle className="h-7 w-7 shrink-0 border-white/10 light:border-slate-900/10" />
            </div>
          </div>
          <p className="mt-2 truncate px-3 text-xs text-white/40 light:text-slate-500">{user?.email}</p>
          <button onClick={logout} className="mt-2 w-full rounded-lg border border-white/15 light:border-slate-900/15 px-3 py-1.5 text-sm text-white/80 light:text-slate-700 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5">
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="relative z-10 ml-64 flex-1 overflow-y-auto p-8 light:bg-white">
        <Outlet />
      </main>
    </div>;
}
