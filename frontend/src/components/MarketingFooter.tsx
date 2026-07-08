import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { submitWaitlistSignup } from "../api/endpoints";
import { Button } from "./Button";
import { BrandLogo } from "./BrandLogo";
import { Reveal } from "./Animated";

interface FooterLink {
  label: string;
  to: string;
  /** Plain <a> instead of router Link (real file downloads). */
  download?: boolean;
  badge?: string;
}

const COLUMNS: Array<{ heading: string; links: FooterLink[] }> = [
  {
    heading: "Platform",
    links: [
      { label: "Overview", to: "/platform" },
      { label: "Packages & Pricing", to: "/pricing" },
      { label: "Get Started", to: "/pricing" },
      { label: "Log in", to: "/login" },
    ],
  },
  {
    // Every product lives here — CyberSachet included; it's a product, not a resource.
    heading: "Products",
    links: [
      { label: "Website & API Monitoring", to: "/solutions/website-api-monitoring", badge: "Live" },
      { label: "Security Monitoring", to: "/solutions/security-monitoring", badge: "Live" },
      { label: "Kada Nigrani — Servers", to: "/solutions/kada-nigrani", badge: "Live" },
      { label: "Infrastructure Monitor", to: "/solutions/infrastructure-monitor" },
      { label: "DevOps Monitor", to: "/solutions/devops-monitor" },
      { label: "CyberSachet", to: "/cybersachet" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Support & FAQ", to: "/support" },
      { label: "Contact Us", to: "/company" },
      { label: "Compare Packages", to: "/pricing" },
      { label: "Download Monitoring Agent", to: "/kada-nigrani-agent.sh", download: true },
    ],
  },
];


function NewsletterForm() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({
    mutationFn: () => submitWaitlistSignup({ email, product: "newsletter" }),
  });

  if (mutation.isSuccess) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-300">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Subscribed — we'll keep you posted.
      </p>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
      <label htmlFor="footer-newsletter" className="sr-only">
        Email address
      </label>
      <input
        id="footer-newsletter"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="h-11 flex-1 rounded-full border border-white/12 bg-black/40 px-4 text-sm text-white placeholder:text-white/35 transition-all focus:border-cyan-400/50 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)] focus:outline-none"
      />
      <Button type="submit" size="sm" loading={mutation.isPending} className="h-11 shrink-0">
        Subscribe
      </Button>
    </form>
  );
}

export function MarketingFooter() {
  return (
    <footer id="site-footer" className="relative overflow-hidden border-t border-white/10 bg-[#04050a] px-6 pb-10 pt-16 md:px-10">
      {/* ambient top glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 max-w-3xl rounded-full bg-blue-500/10 blur-[100px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          {/* brand block */}
          <div>
            <Link to="/" className="inline-flex">
              <BrandLogo size={34} tagline />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              The company behind ITOps Monitor, Kada Nigrani, and CyberSachet — real-time monitoring products for
              infrastructure, servers, websites, and security.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
              Checks running 24/7
            </p>

            <div className="mt-6 space-y-2.5 text-sm">
              <a href="tel:+9779803350658" className="group flex items-center gap-2.5 text-white/60 transition-colors hover:text-white">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-cyan-300 transition-colors group-hover:border-cyan-400/40">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </span>
                +977 980-335-0658
              </a>
              <p className="flex items-center gap-2.5 text-white/60">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-emerald-300">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 21s-7-5.3-7-11a7 7 0 1114 0c0 5.7-7 11-7 11z" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </span>
                Kathmandu, Nepal
              </p>
            </div>
          </div>

          {/* link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column, ci) => (
              <Reveal key={column.heading} delay={ci * 0.08}>
                <nav aria-label={column.heading}>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">{column.heading}</p>
                  <ul className="mt-4 space-y-3">
                    {column.links.map((link) => {
                      const inner = (
                        <>
                          <span className="border-b border-transparent transition-colors group-hover:border-white/30">
                            {link.label}
                          </span>
                          {link.badge && (
                            <span className="rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-300">
                              {link.badge}
                            </span>
                          )}
                          <span aria-hidden className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-60">
                            {link.download ? "↓" : "→"}
                          </span>
                        </>
                      );
                      const cls = "group inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white";
                      return (
                        <li key={link.label}>
                          {link.download ? (
                            <a href={link.to} download className={cls}>
                              {inner}
                            </a>
                          ) : (
                            <Link to={link.to} className={cls}>
                              {inner}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </Reveal>
            ))}
          </div>
        </div>

        {/* newsletter */}
        <div className="mt-14 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Product updates, no noise</p>
            <p className="mt-1 text-xs text-white/45">New modules, check types, and platform news. Unsubscribe anytime.</p>
          </div>
          <NewsletterForm />
        </div>

        {/* legal row */}
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p>© {new Date().getFullYear()} ITOps Solution. All rights reserved.</p>
            <Link to="/privacy" className="transition-colors hover:text-white/70">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-white/70">
              Terms of Service
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <p>Built for teams who'd rather sleep than firefight.</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
              className="group grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/50 transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:text-cyan-300"
            >
              <svg className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 19V5m-6 6l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
