import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { fetchContentItems, fetchPlanCatalog, fetchPlanUsage, submitWaitlistSignup, createCheckoutSession, type PlanCatalogEntry } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Plan } from "../api/types";
import { MetricBarsBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";

const PLAN_TINTS: Record<string, "emerald" | "cyan" | "violet" | "amber"> = {
  STARTER: "emerald",
  PROFESSIONAL: "cyan",
  BUSINESS: "violet",
  ENTERPRISE: "amber",
};

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function UpgradeForm({ plan }: { plan: Plan }) {
  const [email, setEmail] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const checkout = useMutation({ mutationFn: () => createCheckoutSession(plan) });
  const lead = useMutation({
    mutationFn: () => submitWaitlistSignup({ email, product: "upgrade-request", note: `Interested in ${plan}` }),
  });

  // Enterprise is custom — keep the sales-led flow.
  if (plan === "ENTERPRISE") {
    if (lead.isSuccess) {
      return <p className="text-xs text-emerald-300">Thanks — we'll follow up at {email}.</p>;
    }
    function handleSubmit(event: FormEvent) {
      event.preventDefault();
      lead.mutate();
    }
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={lead.isPending}
          className="w-full rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white hover:text-black disabled:opacity-60"
        >
          {lead.isPending ? "Sending…" : "Talk to Sales"}
        </button>
      </form>
    );
  }

  // Paid, self-serve plans — pay by card via Stripe Checkout.
  function handleUpgrade() {
    setCheckoutError(null);
    checkout.mutate(undefined, {
      onSuccess: (url) => {
        window.location.href = url;
      },
      onError: (err) => setCheckoutError(err.message),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={checkout.isPending}
        className="w-full rounded-full bg-white px-4 py-2.5 text-center text-xs font-medium text-black transition-transform hover:scale-105 hover:bg-neutral-200 disabled:opacity-60"
      >
        {checkout.isPending ? "Redirecting…" : `Upgrade with Card · ${titleCase(plan)}`}
      </button>
      {checkoutError && <p className="text-xs text-amber-300">{checkoutError}</p>}
    </div>
  );
}

export default function Pricing() {
  const { user } = useAuth();
  const { data: plans, isLoading } = useQuery({ queryKey: ["plan-catalog"], queryFn: fetchPlanCatalog });
  const { data: usage } = useQuery({ queryKey: ["plan-usage"], queryFn: fetchPlanUsage, enabled: !!user });
  const { data: planCopyItems } = useQuery({
    queryKey: ["content", "pricing", "plan_copy"],
    queryFn: () => fetchContentItems("pricing", "plan_copy"),
  });
  const planCopy = new Map((planCopyItems ?? []).map((item) => [item.itemKey, { forWho: item.title, tagline: item.subtitle }]));

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-4xl overflow-hidden rounded-3xl pb-16 pt-16 text-center">
          <MetricBarsBackground tint="emerald" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
          <Reveal className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Packages</p>
            <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">Start Free, Scale When Ready</h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60">
              The Starter package is free and self-serve — create your account and start monitoring in minutes. Need
              more? Upgrade to a paid package anytime; every limit below is real and enforced.
            </p>
          </Reveal>
        </div>

        {user && usage && (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-neutral-900/60 p-5 text-center text-sm">
            <p className="text-white/60">
              Your organization is on <span className="font-medium text-white">{titleCase(usage.plan)}</span> —{" "}
              {usage.currentMonitors}/{usage.maxMonitors} monitors, {usage.currentAlertChannels}/{usage.maxAlertChannels}{" "}
              alert channels used.
            </p>
          </div>
        )}

        {isLoading ? (
          <p className="mt-16 text-center text-white/50">Loading plans…</p>
        ) : (
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 2xl:max-w-7xl">
            {plans?.map((plan, i) => (
              <SpotlightCard
                key={plan.plan}
                tint={PLAN_TINTS[plan.plan] ?? "white"}
                delay={i * 0.08}
                className={`flex flex-col p-6 ${
                  plan.plan === "STARTER"
                    ? "border-emerald-400/30"
                    : plan.plan === "PROFESSIONAL"
                      ? "border-cyan-400/40 shadow-[0_0_60px_-20px_rgba(34,211,238,0.35)]"
                      : ""
                }`}
              >
                {plan.plan === "STARTER" && (
                  <span className="absolute right-4 top-4 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                    Free
                  </span>
                )}
                {plan.plan === "PROFESSIONAL" && (
                  <span className="absolute right-4 top-4 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-300">
                    Most Popular
                  </span>
                )}
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-white/45">{planCopy.get(plan.plan)?.forWho}</p>
                <h2 className="mt-2 text-xl font-medium tracking-tight">{titleCase(plan.plan)}</h2>
                <p className="mt-1 text-sm text-white/55">{planCopy.get(plan.plan)?.tagline}</p>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-white/70">
                  <li>
                    <span className="font-medium text-white">{plan.maxMonitors >= 100000 ? "Unlimited" : plan.maxMonitors}</span> monitors
                  </li>
                  <li>
                    <span className="font-medium text-white">{plan.maxHosts >= 100000 ? "Unlimited" : plan.maxHosts}</span>{" "}
                    {plan.maxHosts === 1 ? "server host" : "server hosts"}
                  </li>
                  <li>
                    <span className="font-medium text-white">
                      {plan.maxAlertChannels >= 100000 ? "Unlimited" : plan.maxAlertChannels}
                    </span>{" "}
                    alert channels
                  </li>
                  <li>
                    <span className="font-medium text-white">{plan.historyDays}</span> days of history
                  </li>
                </ul>

                <div className="mt-6">
                  {plan.plan === "STARTER" ? (
                    <Link
                      to="/register"
                      className="block w-full rounded-full bg-white px-4 py-2.5 text-center text-sm font-medium text-black transition-transform hover:scale-105 hover:bg-neutral-200"
                    >
                      Get Started Free
                    </Link>
                  ) : (
                    <UpgradeForm plan={plan.plan} />
                  )}
                </div>
              </SpotlightCard>
            ))}
          </div>
        )}

        {/* Full feature comparison — every number here is a real, enforced limit */}
        {!isLoading && plans && plans.length > 0 && (
          <Reveal className="mx-auto mt-20 max-w-5xl">
            <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45">Compare Packages</p>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/50">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                    <th className="px-5 py-4 font-medium">Capability</th>
                    {plans.map((p) => (
                      <th key={p.plan} className={`px-5 py-4 font-medium ${p.plan === "PROFESSIONAL" ? "text-cyan-300" : "text-white/70"}`}>
                        {titleCase(p.plan)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {(
                    [
                      ["Website & API monitors", (p: PlanCatalogEntry) => (p.maxMonitors >= 100000 ? "Unlimited" : String(p.maxMonitors))],
                      ["Server hosts (Kada Nigrani)", (p: PlanCatalogEntry) => (p.maxHosts >= 100000 ? "Unlimited" : String(p.maxHosts))],
                      ["Alert channels", (p: PlanCatalogEntry) => (p.maxAlertChannels >= 100000 ? "Unlimited" : String(p.maxAlertChannels))],
                      ["Check history retention", (p: PlanCatalogEntry) => `${p.historyDays} days`],
                    ] as Array<[string, (p: PlanCatalogEntry) => string]>
                  ).map(([label, cell]) => (
                    <tr key={label}>
                      <td className="px-5 py-3.5 text-white/60">{label}</td>
                      {plans.map((p) => (
                        <td key={p.plan} className={`px-5 py-3.5 ${p.plan === "PROFESSIONAL" ? "font-medium text-white" : "text-white/70"}`}>
                          {cell(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {(
                    [
                      ["Uptime, keyword, status-code & DNS checks", () => true],
                      ["SSL & security-header scoring", () => true],
                      ["Automatic incident tracking", () => true],
                      ["Public status page", () => true],
                      ["Real-time dashboard", () => true],
                    ] as Array<[string, () => boolean]>
                  ).map(([label]) => (
                    <tr key={label}>
                      <td className="px-5 py-3.5 text-white/60">{label}</td>
                      {plans.map((p) => (
                        <td key={p.plan} className="px-5 py-3.5">
                          <span className={p.plan === "PROFESSIONAL" ? "text-cyan-300" : "text-emerald-300"} aria-label="Included">
                            ✓
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}

        {/* Enterprise CTA */}
        {!isLoading && (
          <Reveal className="relative mx-auto mt-16 max-w-5xl overflow-hidden rounded-3xl border border-white/10 p-10 text-center md:p-14">
            <div className="pointer-events-none absolute inset-0 [background:var(--grad-brand-soft)]" />
            <div className="pointer-events-none absolute -top-20 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-blue-500/15 blur-[90px]" />
            <div className="relative">
              <p className="text-2xl font-semibold tracking-tight md:text-3xl">Running something bigger?</p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60">
                Banks, hospitals, government, MSPs — if you need custom limits, isolated tenants, or a dedicated
                onboarding, talk to us directly and we'll shape Enterprise around your infrastructure.
              </p>
              <a
                href="/company"
                className="mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-[#04050a] transition-transform hover:-translate-y-0.5 [background:var(--grad-brand)] shadow-[0_8px_30px_-8px_rgba(59,130,246,0.5)]"
              >
                Talk to our team <span aria-hidden>→</span>
              </a>
            </div>
          </Reveal>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}
