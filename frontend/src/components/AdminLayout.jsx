import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useExpandedNavGroups } from "../hooks/useExpandedNavGroups";
import { useAuth } from "../context/AuthContext";
import { EnterpriseAuroraBackground } from "./PageBackgrounds";
import { BrandMark } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import { AppSearch } from "./AppSearch";
import { NotificationCenter } from "./NotificationCenter";
const EASE = [0.16, 1, 0.3, 1];
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
    // to the customers they provisioned, see migration 0031). Org lifecycle
    // and billing, not identity/access or partner management, which is why
    // Resellers and All Users/Roles/Audit Log each live in their own group
    // below instead of here. (Organizations was a duplicate of this page
    // and was folded in — same rename/archive/delete/plan actions, nothing
    // lost.)
  }]
}, {
  // A reseller is a business/partner relationship, not an identity or
  // permission concept — it doesn't belong grouped with All Users/Roles/
  // Audit Log any more than Customers does. Its own top-level entry, same
  // as the mega-scope IA request explicitly listed it separately from
  // "Platform Users".
  label: "Resellers",
  roles: ["super_admin", "platform_administrator", "support"],
  items: [{
    to: "/admin/resellers",
    label: "Resellers",
    icon: "🤝"
  }]
}, {
  // "Who can do what" — platform users, role/permission definitions, and
  // the audit trail of access changes. No group-level `roles` here (unlike
  // Customers/Monitoring): each item keeps exactly the individual
  // restriction it already had, so this is a pure regrouping, not a
  // visibility change.
  label: "Identity & Access",
  items: [{
    to: "/admin/users",
    label: "All Users",
    icon: "◉",
    roles: ["super_admin", "platform_administrator", "support"]
  }, {
    to: "/admin/roles",
    label: "Roles & Permissions",
    icon: "🛡",
    roles: ["super_admin", "platform_administrator"]
  }, {
    to: "/admin/audit-log",
    label: "Audit Log",
    icon: "☰",
    // A reseller's own actions already surface in My Customers — the
    // global cross-tenant action feed (every admin, every organization)
    // isn't theirs to see. Enforced server-side too (migration 0062).
    roles: ["super_admin", "platform_administrator", "support", "billing", "content_editor"]
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
  // Was "Platform" — a catch-all label that gave no hint whether Plan
  // Limits (billing) or Content Manager (marketing site) lived inside it.
  // Split by actual concern instead.
  label: "Billing",
  items: [{
    to: "/admin/plans",
    label: "Plan Limits",
    icon: "◎",
    roles: ["super_admin", "billing"]
  }]
}, {
  label: "Website & Content",
  items: [{
    to: "/admin/content",
    label: "Content Manager",
    icon: "◫",
    roles: ["super_admin", "content_editor"]
  }, {
    to: "/admin/visibility",
    label: "Site Visibility",
    icon: "◈",
    roles: ["super_admin", "content_editor"]
  }]
}, {
  label: "Academy",
  roles: ["super_admin", "content_editor"],
  items: [{
    to: "/admin/academy",
    label: "Dashboard",
    icon: "🎓"
  }, {
    to: "/admin/cybersachet-courses",
    label: "Courses",
    icon: "📚"
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
  const isResellerOnly = platformAdminRole === "reseller";
  const visibleGroups = NAV_GROUPS.filter(g => visibleFor(platformAdminRole, g)).map(g => ({
    ...g,
    // A reseller's "Customers" page only ever shows organizations they
    // themselves provisioned (migration 0031/0062) — "My Customers" says
    // that plainly instead of implying it's the platform's full customer list.
    items: g.items.filter(item => visibleFor(platformAdminRole, item)).map(item => isResellerOnly && item.to === "/admin/customers" ? { ...item, label: "My Customers" } : item)
  })).filter(g => g.items.length > 0);
  const navItems = visibleGroups.flatMap(group => group.items.map(item => ({ label: item.label, to: item.to })));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);
  const location = useLocation();
  const { expanded, toggle } = useExpandedNavGroups(visibleGroups, location.pathname);
  return <div className="flex min-h-screen bg-black light:bg-slate-50 text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <div className="fixed inset-0 z-0">
        <EnterpriseAuroraBackground intensity="ambient" tint="amber" forceDark />
      </div>
      {/* Amber accent stripe */}
      <div className="fixed left-0 right-0 top-0 z-40 h-1 bg-amber-400" />

      {/* Mobile top bar — the sidebar below is off-canvas until this hamburger opens it */}
      <div className="fixed inset-x-0 top-1 z-30 flex h-14 items-center justify-between border-b border-white/10 light:border-slate-900/10 bg-neutral-950/95 light:bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <BrandMark size={24} />
          <span className="truncate text-sm font-medium text-white light:text-slate-900">Platform Console</span>
        </Link>
        <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 light:border-slate-900/15 text-white/70 light:text-slate-600">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Backdrop — mobile only, closes the sidebar on tap */}
      <AnimatePresence>
        {mobileNavOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeMobileNav} className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden" />}
      </AnimatePresence>

      {/* Sidebar — off-canvas (slides in) below the lg breakpoint, always
          docked at lg and up. Transform-based so desktop keeps its existing
          persistent layout untouched. */}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/10 light:border-slate-900/10 bg-neutral-950 light:bg-white pt-1 transition-transform duration-300 ease-out lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Link to="/admin" onClick={closeMobileNav} className="group block border-b border-white/10 light:border-slate-900/10 p-4 transition-colors hover:bg-white/[0.02] light:hover:bg-slate-900/[0.02]">
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
          {visibleGroups.map(group => {
          const AdminNavItem = item => <NavLink key={item.to} to={item.to} end={"end" in item ? item.end : false} onClick={closeMobileNav} className={({
            isActive
          }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-amber-400 text-black" : "text-white/60 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-900/5 hover:text-white light:hover:text-slate-900 light:hover:text-slate-900"}`}>
              <span className="text-[13px] opacity-70">{item.icon}</span>
              {item.label}
            </NavLink>;
          // A single-item group (e.g. "Overview", "Customers") is just a
          // plain link, same as Google's own "Home"/"Dashboard" entries sitting
          // outside the collapsible tree — collapsing a one-item section would
          // be pure friction with nothing to hide.
          if (group.items.length === 1) {
            return <div key={group.label} className="mb-1 px-2">{AdminNavItem(group.items[0])}</div>;
          }
          const isOpen = expanded.has(group.label);
          return <div key={group.label} className="mb-1">
                <button type="button" onClick={() => toggle(group.label)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 light:text-slate-400 transition-colors hover:text-white/55 light:hover:text-slate-600">
                  <span>{group.label}</span>
                  <motion.span animate={{
                rotate: isOpen ? 90 : 0
              }} transition={{
                duration: 0.2,
                ease: EASE
              }} className="text-[9px]" aria-hidden>▸</motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && <motion.div initial={{
                height: 0,
                opacity: 0
              }} animate={{
                height: "auto",
                opacity: 1
              }} exit={{
                height: 0,
                opacity: 0
              }} transition={{
                duration: 0.2,
                ease: EASE
              }} className="overflow-hidden">
                      <div className="space-y-0.5 px-2 pb-1.5 pt-0.5">
                        {group.items.map(AdminNavItem)}
                      </div>
                    </motion.div>}
                </AnimatePresence>
              </div>;
        })}
        </nav>

        <div className="border-t border-white/10 light:border-slate-900/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <Link to="/dashboard" onClick={closeMobileNav} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-900/5 hover:text-white light:hover:text-slate-900 light:hover:text-slate-900">
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
      <main className="relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pt-14 lg:ml-64 lg:pt-1 light:bg-white">
        <div className="p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>;
}
