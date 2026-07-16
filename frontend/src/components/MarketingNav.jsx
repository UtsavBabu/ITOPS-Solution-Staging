import { Link, NavLink } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
function openSearch() {
  window.dispatchEvent(new Event("open-command-palette"));
}
function SearchButton({ className = "" }) {
  return <button type="button" onClick={openSearch} aria-label="Search pages and products" className={`flex items-center gap-2 rounded-full border light:border-white/60 border-transparent px-3.5 py-2 text-sm text-neutral-300 light:text-slate-500 backdrop-blur-md transition-colors hover:text-white light:hover:text-slate-900 ${className}`}>
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <span className="hidden lg:inline">Search</span>
      <kbd className="hidden rounded-md border border-white/15 light:border-slate-900/15 px-1.5 py-0.5 text-[10px] text-white/40 light:text-slate-400 lg:inline">⌘K</kbd>
    </button>;
}
const NAV_LINKS = [{
  label: "Platform",
  to: "/platform"
}, {
  label: "Products",
  to: "/solutions"
}, {
  label: "Pricing",
  to: "/pricing"
}, {
  label: "Company",
  to: "/company"
}, {
  label: "Support",
  to: "/support"
}];
export function MarketingNav() {
  return <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-4 px-6 pt-6 md:px-10 light:bg-gradient-to-b light:from-white/70 light:to-transparent light:pb-6 light:backdrop-blur-[2px]">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center rounded-full border border-white/10 light:border-white/60 bg-neutral-900/90 light:bg-white/70 py-2 pl-3.5 pr-5 backdrop-blur-md light:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_30px_-12px_rgba(15,23,42,0.18)]">
          <BrandLogo size={26} />
        </Link>

        <div className="hidden items-center gap-1 rounded-full bg-neutral-900/90 light:bg-white/70 border light:border-white/60 border-transparent light:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_30px_-12px_rgba(15,23,42,0.18)] px-3 py-2 backdrop-blur-md md:flex">
          {NAV_LINKS.map(link => <NavLink key={link.label} to={link.to} className={({
          isActive
        }) => `rounded-full px-5 py-2 text-sm transition-colors ${isActive ? "bg-white text-black light:bg-slate-900 light:text-white" : "text-neutral-300 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
              {link.label}
            </NavLink>)}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SearchButton className="bg-neutral-900/90 light:bg-white/70 light:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_30px_-12px_rgba(15,23,42,0.18)]" />
        <ThemeToggle className="bg-neutral-900/90 light:bg-white/70 backdrop-blur-md light:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_30px_-12px_rgba(15,23,42,0.18)]" />
        <Link to="/login" className="hidden text-sm text-neutral-300 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900 sm:inline">
          Log in
        </Link>
        <Link to="/pricing" className="rounded-full bg-white text-black light:bg-slate-900 light:text-white px-6 py-3 text-sm font-normal transition-colors hover:bg-neutral-200 light:hover:bg-slate-800 light:shadow-[0_8px_24px_-10px_rgba(15,23,42,0.4)]">
          Get Started
        </Link>
      </div>
    </nav>;
}