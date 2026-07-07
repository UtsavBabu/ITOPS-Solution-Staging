import { Link, NavLink } from "react-router-dom";

const NAV_LINKS: Array<{ label: string; to: string }> = [
  { label: "Platform", to: "/platform" },
  { label: "Solutions", to: "/solutions" },
  { label: "Pricing", to: "/pricing" },
  { label: "Company", to: "/company" },
  { label: "Support", to: "/support" },
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

export function MarketingNav() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-4 px-6 pt-6 md:px-10">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full bg-neutral-900/90 py-3 pl-4 pr-6 backdrop-blur"
        >
          <LogoMark />
          <span className="text-sm font-normal tracking-tight text-white">ITOps Solution</span>
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
