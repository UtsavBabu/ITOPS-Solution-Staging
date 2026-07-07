import { Link, NavLink } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

const NAV_LINKS: Array<{ label: string; to: string }> = [
  { label: "Platform", to: "/platform" },
  { label: "Products", to: "/solutions" },
  { label: "Pricing", to: "/pricing" },
  { label: "Company", to: "/company" },
  { label: "Support", to: "/support" },
];

export function MarketingNav() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-4 px-6 pt-6 md:px-10">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center rounded-full border border-white/10 bg-neutral-900/90 py-2 pl-3.5 pr-5 backdrop-blur"
        >
          <BrandLogo size={26} />
        </Link>

        <div className="hidden items-center gap-1 rounded-full bg-neutral-900/90 px-3 py-2 backdrop-blur md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-5 py-2 text-sm transition-colors ${
                  isActive ? "bg-white text-black" : "text-neutral-300 hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link to="/login" className="hidden text-sm text-neutral-300 transition-colors hover:text-white sm:inline">
          Log in
        </Link>
        <Link
          to="/pricing"
          className="rounded-full bg-white px-6 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
