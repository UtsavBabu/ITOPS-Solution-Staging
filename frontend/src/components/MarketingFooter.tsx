import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { submitWaitlistSignup } from "../api/endpoints";
import { Button } from "./Button";

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; to: string }> }> = [
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
    heading: "Solutions",
    links: [
      { label: "Website & API Monitoring", to: "/solutions/website-api-monitoring" },
      { label: "Security Monitoring", to: "/solutions/security-monitoring" },
      { label: "Kada Nigrani — Servers", to: "/solutions/kada-nigrani" },
      { label: "Infrastructure Monitor", to: "/solutions/infrastructure-monitor" },
      { label: "DevOps Monitor", to: "/solutions/devops-monitor" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Support & FAQ", to: "/support" },
      { label: "Contact Us", to: "/company" },
      { label: "CyberSachet", to: "/cybersachet" },
    ],
  },
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
            <Link to="/" className="inline-flex items-center gap-2.5">
              <LogoMark />
              <span className="text-base font-medium tracking-tight text-white">ITOps Monitor</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              One real-time platform for infrastructure, servers, websites, and security — so your team finds out
              before your customers do.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
              Checks running 24/7
            </p>
          </div>

          {/* link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">{column.heading}</p>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="group inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white"
                      >
                        {link.label}
                        <span aria-hidden className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-60">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
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
          <p>© {new Date().getFullYear()} ITOps Monitor. All rights reserved.</p>
          <p>Built for teams who'd rather sleep than firefight.</p>
        </div>
      </div>
    </footer>
  );
}
