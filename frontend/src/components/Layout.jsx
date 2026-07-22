import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { EnterpriseAuroraBackground } from "./PageBackgrounds";
import { BrandMark } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import { SoundToggle } from "./SoundToggle";
import { useQuery } from "@tanstack/react-query";
import { fetchMyPermissions, fetchPlanUsage } from "../api/endpoints";
import { usePortalType } from "../hooks/usePortalType";
import { useExpandedNavGroups } from "../hooks/useExpandedNavGroups";
import { AppSearch } from "./AppSearch";
import { NotificationCenter } from "./NotificationCenter";
import { AcademyMark } from "./AcademyBrand";
const PLAN_COLORS = {
  STARTER: "bg-white/10 light:bg-slate-900/8 text-white/60 light:text-slate-600",
  PROFESSIONAL: "bg-blue-400/10 light:bg-blue-500/10 text-blue-300 light:text-blue-700",
  BUSINESS: "bg-violet-400/10 light:bg-violet-500/10 text-violet-300 light:text-violet-700",
  ENTERPRISE: "bg-amber-400/10 light:bg-amber-500/10 text-amber-300 light:text-amber-700"
};
// `module` maps each item to its permission_modules key (migration 0032).
// Every legacy role (ADMIN/MEMBER/READ_ONLY) already has `view` on the
// modules it always had access to, so this is purely additive — it only
// starts hiding items once an org actually assigns a narrower custom role.
const NAV_GROUPS = [{
  label: "Monitoring",
  items: [{
    to: "/dashboard",
    label: "Dashboard",
    icon: "⬡",
    end: true,
    module: "dashboard"
  }, {
    to: "/monitors",
    label: "Website & API",
    icon: "◈",
    module: "monitors"
  }, {
    to: "/network",
    label: "Network Devices",
    icon: "◇",
    module: "monitors"
  }, {
    to: "/dns",
    label: "DNS Monitoring",
    icon: "❖",
    module: "monitors"
  }, {
    to: "/hosts",
    label: "Server Agents",
    icon: "▣",
    module: "hosts"
  }, {
    to: "/incidents",
    label: "Incidents",
    icon: "⚡",
    module: "incidents"
  }]
}, {
  label: "Inventory",
  items: [{
    to: "/assets",
    label: "Assets",
    icon: "◫",
    module: "assets"
  }]
}, {
  label: "Training",
  items: [{
    to: "/training",
    label: "CyberSachet",
    icon: "🎓",
    end: true
    // No `module` gate — visibility of the page's real content is decided
    // by the CyberSachet product license (organization_products), not RBAC;
    // every org member can see the nav item and, if unlicensed, the upsell.
  }, {
    to: "/training/academy",
    label: "Moonsav ITOps Academy",
    icon: <AcademyMark size={13} />
    // Same license gate as CyberSachet above — one real per-org training
    // license unlocks both distinctly-branded catalogs.
  }, {
    to: "/academy-admin",
    label: "Manage Academy",
    icon: "⚙",
    // Gated on real training visibility (Training Manager, org admin,
    // auditor) — a regular learner never sees this, same boundary the
    // page's own RPCs (org_academy_summary/org_academy_course_stats)
    // enforce server-side.
    module: "training"
  }]
}, {
  label: "Settings",
  items: [{
    to: "/settings/alerts",
    label: "Alert Channels",
    icon: "◎",
    module: "alert_channels"
  }, {
    to: "/users",
    label: "Users",
    icon: "◒",
    module: "team"
  }, {
    to: "/team",
    label: "Team & Plan",
    icon: "◉",
    module: "billing"
  }]
}];
export function Layout() {
  const {
    user,
    organization,
    isPlatformAdmin,
    logout
  } = useAuth();
  const {
    data: usage
  } = useQuery({
    queryKey: ["plan-usage"],
    queryFn: fetchPlanUsage,
    staleTime: 60_000
  });
  // Undefined (still loading) or a thrown error (my_permissions() RPC
  // missing on an un-migrated database) both mean "don't hide anything yet"
  // — the real boundary is the RLS/RPC checks each page already makes, this
  // is only a UX affordance.
  const {
    data: can
  } = useQuery({
    queryKey: ["my-permissions", organization?.id],
    queryFn: () => fetchMyPermissions(organization?.id),
    enabled: !!organization?.id,
    retry: false,
    staleTime: 60_000
  });
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => !item.module || !can || can("organization", item.module, "view"))
  })).filter(group => group.items.length > 0);
  const canViewBilling = !can || can("organization", "billing", "view");
  const { portal } = usePortalType();
  const planColor = PLAN_COLORS[usage?.plan ?? "STARTER"] ?? PLAN_COLORS.STARTER;
  const navItems = visibleGroups.flatMap(group => group.items.map(item => ({ label: item.label, to: item.to })));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);
  const location = useLocation();
  const { expanded, toggle } = useExpandedNavGroups(visibleGroups, location.pathname);
  return <div className="flex min-h-screen bg-black light:bg-slate-50 text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <div className="fixed inset-0 z-0">
        <EnterpriseAuroraBackground intensity="ambient" tint="emerald" forceDark />
      </div>

      {/* Mobile top bar — the sidebar below is off-canvas until this hamburger opens it */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 light:border-slate-900/10 bg-neutral-950/95 light:bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size={24} />
          <span className="truncate text-sm font-medium text-white light:text-slate-900">{organization?.name ?? "ITOps Monitor"}</span>
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
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/10 light:border-slate-900/10 bg-neutral-950 light:bg-white transition-transform duration-300 ease-out lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Brand */}
        <Link to="/" onClick={closeMobileNav} className="flex items-center gap-2.5 border-b border-white/10 light:border-slate-900/10 p-4">
          <BrandMark size={30} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white light:text-slate-900">ITOps Monitor</p>
            <p className="truncate text-xs text-white/45 light:text-slate-500">{organization?.name ?? "Loading…"}</p>
          </div>
        </Link>
        <p className="border-b border-white/10 light:border-slate-900/10 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/30 light:text-slate-400">
          {portal === "employee" ? "Employee Portal" : "Organization Console"}
        </p>

        <AppSearch scope="customer" navItems={navItems} />

        {/* Plan badge */}
        {usage && <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-2">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${planColor}`}>
                {usage.plan} plan
              </span>
              <span className="text-[11px] text-white/35 light:text-slate-400">
                {usage.currentMonitors}/{usage.maxMonitors} monitors
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10 light:bg-slate-900/10">
              <motion.div className="h-full rounded-full bg-emerald-400" initial={{
            width: 0
          }} animate={{
            width: `${Math.min(100, usage.currentMonitors / usage.maxMonitors * 100)}%`
          }} transition={{
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1]
          }} />
            </div>
          </div>}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {visibleGroups.map(group => {
          const CustomerNavItem = item => <NavLink key={item.to} to={item.to} end={"end" in item ? item.end : false} onClick={closeMobileNav} className={({
            isActive
          }) => `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "text-black light:text-white" : "text-white/60 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-900/5 hover:text-white light:hover:text-slate-900"}`}>
              {({
              isActive
            }) => isActive ? <>
                    <motion.span layoutId="nav-active-pill" transition={{
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1]
              }} className="absolute inset-0 rounded-lg bg-white light:bg-slate-900" />
                    <span className="relative text-[13px] opacity-70">{item.icon}</span>
                    <span className="relative">{item.label}</span>
                  </> : <>
                    <span className="text-[13px] opacity-70">{item.icon}</span>
                    {item.label}
                  </>}
            </NavLink>;
          // A single-item group (Inventory, Training) is just a plain link —
          // nothing to collapse, same rule AdminLayout.jsx uses.
          if (group.items.length === 1) {
            return <div key={group.label} className="mb-1 px-2">{CustomerNavItem(group.items[0])}</div>;
          }
          const isOpen = expanded.has(group.label);
          return <div key={group.label} className="mb-1">
                <button type="button" onClick={() => toggle(group.label)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 light:text-slate-400 transition-colors hover:text-white/55 light:hover:text-slate-600">
                  <span>{group.label}</span>
                  <motion.span animate={{
                rotate: isOpen ? 90 : 0
              }} transition={{
                duration: 0.2,
                ease: [0.16, 1, 0.3, 1]
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
                ease: [0.16, 1, 0.3, 1]
              }} className="overflow-hidden">
                      <div className="space-y-0.5 px-2 pb-1.5 pt-0.5">
                        {group.items.map(CustomerNavItem)}
                      </div>
                    </motion.div>}
                </AnimatePresence>
              </div>;
        })}

          {isPlatformAdmin && <div className="px-2">
              <NavLink to="/admin" onClick={closeMobileNav} className="flex items-center gap-2.5 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-sm font-medium text-amber-300 light:text-amber-600 transition-colors hover:bg-amber-400/10">
                <span className="text-[13px]">★</span>
                Platform Admin
              </NavLink>
            </div>}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 light:border-slate-900/10 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Link to="/profile" onClick={closeMobileNav} className="truncate px-1 text-xs text-white/40 light:text-slate-500 hover:text-white light:hover:text-slate-900" title="My Profile">{user?.email}</Link>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationCenter scope="customer" />
              <SoundToggle className="h-7 w-7 border-white/10 light:border-slate-900/10" />
              <ThemeToggle className="h-7 w-7 border-white/10 light:border-slate-900/10" />
            </div>
          </div>
          <div className="flex gap-2">
            {/* /team is an operator-only route (RequireConsoleAccess in
                App.jsx) gated further on the 'billing' module (migration
                0061) — an Employee Portal member or a non-billing role
                wouldn't see anything useful there, so the link isn't shown
                to them at all. */}
            {portal !== "employee" && canViewBilling && <Link to="/team" className="flex-1 rounded-lg border border-white/10 light:border-slate-900/10 px-2 py-1.5 text-center text-xs text-white/60 light:text-slate-500 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5 hover:text-white light:hover:text-slate-900 light:hover:text-slate-900">
              Upgrade
            </Link>}
            <button onClick={logout} className="flex-1 rounded-lg border border-white/15 light:border-slate-900/15 px-2 py-1.5 text-xs text-white/80 light:text-slate-700 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5">
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      {/* Solid surface in light mode — the ambient aurora background is a
          deliberately dark-only effect (built for a dark canvas); a clean
          flat surface reads better in light mode than an inverted version
          of it would. */}
      <main className="relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pt-14 lg:ml-64 lg:pt-0 light:bg-white">
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>;
}