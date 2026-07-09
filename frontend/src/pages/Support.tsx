import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { ContactForm } from "../components/ContactForm";
import { fetchContentItems } from "../api/endpoints";
import { HeartbeatLineBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";
import { FaqAccordion } from "../components/FaqAccordion";

const CARD_TINTS = ["emerald", "cyan", "violet"] as const;

const EXPLORE_LINKS = [
  { label: "Platform overview", to: "/platform" },
  { label: "Products & solutions", to: "/solutions" },
  { label: "Packages & pricing", to: "/pricing" },
  { label: "Company & contact", to: "/company" },
];

const TRUST_LINKS = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Cookie Policy", to: "/cookies" },
];

export default function Support() {
  const { data: channels } = useQuery({ queryKey: ["content", "support", "channels"], queryFn: () => fetchContentItems("support", "channels") });
  const { data: faqs } = useQuery({ queryKey: ["content", "support", "faqs"], queryFn: () => fetchContentItems("support", "faqs") });
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-4xl overflow-hidden rounded-3xl pb-16 pt-16 text-center">
          <HeartbeatLineBackground tint="emerald" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Support</p>
            <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">
              We'll Answer Directly — No Bots
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60">
              Live chat and a full knowledge base aren't built yet. Right now, the fastest way to reach us is the form
              below — a real person reads every message.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 2xl:max-w-6xl">
          {channels?.map((channel, i) => (
            <SpotlightCard key={channel.id} tint={CARD_TINTS[i % CARD_TINTS.length]} delay={i * 0.08}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">{channel.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      channel.status === "Available" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {channel.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{channel.body}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>

        <div className="mx-auto mt-20 grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_300px]">
          {/* Left: explore + popular questions */}
          <Reveal className="space-y-8 lg:order-1">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">Popular Questions</p>
              <ul className="mt-3 space-y-1">
                {(faqs ?? []).map((faq) => (
                  <li key={faq.id}>
                    <a
                      href="#faq"
                      onClick={() => setOpenFaqId(faq.id)}
                      className="block rounded-lg px-2.5 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
                    >
                      {faq.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">Explore</p>
              <ul className="mt-3 space-y-1">
                {EXPLORE_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="block rounded-lg px-2.5 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">Legal &amp; Trust</p>
              <ul className="mt-3 space-y-1">
                {TRUST_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="block rounded-lg px-2.5 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Center: FAQ */}
          <div id="faq" className="lg:order-2">
            <Reveal>
              <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45 lg:text-left">Frequently Asked</p>
            </Reveal>
            <div className="mt-8">
              <FaqAccordion faqs={faqs ?? []} openId={openFaqId} onOpenChange={setOpenFaqId} />
            </div>
          </div>

          {/* Right: live support + contact info */}
          <Reveal delay={0.1} className="space-y-6 lg:order-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
                <p className="text-sm font-medium text-white">Talk to a real person</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/55">
                No bots, no ticket queue — every message below is read and answered by the team directly.
              </p>
              <div className="mt-4">
                <ContactForm defaultTopic="support" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">Contact Information</p>
              <div className="mt-3 space-y-2.5 text-sm">
                <a href="tel:+9779803350658" className="flex items-center gap-2.5 text-white/65 transition-colors hover:text-white">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-cyan-300">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </span>
                  +977 980-335-0658
                </a>
                <a href="mailto:sales@itops-monitor.local" className="flex items-center gap-2.5 text-white/65 transition-colors hover:text-white">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-violet-300">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </span>
                  sales@itops-monitor.local
                </a>
                <p className="flex items-center gap-2.5 text-white/65">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-emerald-300">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 21s-7-5.3-7-11a7 7 0 1114 0c0 5.7-7 11-7 11z" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </span>
                  Kathmandu, Nepal
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
