import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { fetchMyPermissions, fetchPlanUsage, createCheckoutSession } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { StatusPageCard } from "../components/StatusPageCard";
import { Reveal, SpotlightCard } from "../components/Animated";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
const EASE = [0.16, 1, 0.3, 1];
const PLANS = [{
  name: "STARTER",
  label: "Starter",
  price: "Free",
  color: "border-white/15 light:border-slate-900/15",
  features: ["3 monitors", "1 alert channel", "7-day history", "Website monitoring only", "No network devices", "No server agents"]
}, {
  name: "PROFESSIONAL",
  label: "Professional",
  price: "$29/mo",
  color: "border-blue-400/30",
  highlight: true,
  features: ["25 monitors", "5 alert channels", "30-day history", "Website + network monitoring", "10 server agents", "Public status page"]
}, {
  name: "BUSINESS",
  label: "Business",
  price: "$99/mo",
  color: "border-violet-400/30",
  features: ["100 monitors", "20 alert channels", "90-day history", "All check types", "50 server agents", "Priority support"]
}, {
  name: "ENTERPRISE",
  label: "Enterprise",
  price: "Custom",
  color: "border-amber-400/30",
  features: ["Unlimited monitors", "Unlimited channels", "365-day history", "All features", "Unlimited agents", "Dedicated support"]
}];
function UpgradeButton({
  plan
}) {
  const toast = useToast();
  const checkout = useMutation({
    mutationFn: () => createCheckoutSession(plan)
  });
  if (plan === "ENTERPRISE") {
    return <a href="mailto:sales@itops-monitor.local" className="mt-4 block rounded-full border border-white/20 px-3 py-2 text-center text-xs font-medium text-white/80 light:text-slate-700 transition-colors hover:bg-white/10">
        Contact Sales
      </a>;
  }
  return <button type="button" onClick={() => checkout.mutate(undefined, {
    onSuccess: url => window.location.href = url,
    onError: err => toast.error(err instanceof Error ? err.message : "Couldn't start checkout")
  })} disabled={checkout.isPending} className="mt-4 w-full rounded-full bg-white px-3 py-2 text-center text-xs font-medium text-black transition-transform hover:scale-105 hover:bg-neutral-200 disabled:opacity-60">
      {checkout.isPending ? "Redirecting…" : "Upgrade with Card"}
    </button>;
}
function UsageBar({
  label,
  current,
  max
}) {
  const unlimited = max >= 100000;
  const pct = unlimited ? 0 : Math.min(100, current / max * 100);
  const atLimit = !unlimited && current >= max;
  return <div>
      <div className="flex justify-between text-xs text-white/50 light:text-slate-500">
        <span>{label}</span>
        <span className={atLimit ? "text-amber-300" : ""}>
          <AnimatedCounter value={current} />/{unlimited ? "∞" : max}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10 light:bg-slate-900/10">
        <motion.div className={`h-full rounded-full ${atLimit ? "bg-amber-400" : "bg-emerald-400"}`} initial={{
        width: 0
      }} animate={{
        width: unlimited ? "0%" : `${pct}%`
      }} transition={{
        duration: 0.7,
        ease: EASE
      }} />
      </div>
    </div>;
}
export default function Team() {
  const {
    organization
  } = useAuth();
  const {
    data: usage,
    isError: usageError,
    refetch: refetchUsage
  } = useQuery({
    queryKey: ["plan-usage"],
    queryFn: fetchPlanUsage
  });
  // Billing is its own permission module (migration 0061), separate from
  // 'team' (Users) — only an org's admin (and billing_manager) get it, so
  // this page is admin-only even though get_plan_usage() itself stays
  // readable everywhere (the sidebar plan badge and upgrade prompts on
  // other pages need it). undefined while loading means "don't flash the
  // restricted state before permissions resolve."
  const { data: can, isLoading: permsLoading } = useQuery({
    queryKey: ["my-permissions", organization?.id],
    queryFn: () => fetchMyPermissions(organization?.id),
    enabled: !!organization?.id,
    retry: false
  });
  const canViewBilling = !can || can("organization", "billing", "view");
  const [searchParams] = useSearchParams();
  const upgraded = searchParams.get("upgraded");
  const currentPlan = usage?.plan ?? "STARTER";
  if (!permsLoading && !canViewBilling) {
    return <div className="space-y-8">
        <Reveal y={12}>
          <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Team & Plan</h1>
        </Reveal>
        <EmptyState title="Admin access required." description="Only your organization's administrator (or a billing manager) can view plan and billing details. Head to Users to manage your own team." />
      </div>;
  }
  return <div className="space-y-8">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Team & Plan</h1>
        <p className="text-sm text-white/50 light:text-slate-500">{organization?.name} — billing and usage. Manage members, roles, departments and invites in <a href="/users" className="underline hover:text-white/70 light:hover:text-slate-600">Users</a>.</p>
      </Reveal>

      {/* Current usage */}
      {usageError ? <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white">
          <ErrorState message="Couldn't load your plan usage." onRetry={() => refetchUsage()} />
        </div> : usage ? <SpotlightCard className="p-5" delay={0.05}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white light:text-slate-900">Current Usage</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 light:text-slate-600">
              {currentPlan} plan
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <UsageBar label="Team Members" current={usage.currentMembers} max={usage.maxMembers} />
            <UsageBar label="Monitors" current={usage.currentMonitors} max={usage.maxMonitors} />
            <UsageBar label="Alert Channels" current={usage.currentAlertChannels} max={usage.maxAlertChannels} />
            <div>
              <p className="text-xs text-white/50 light:text-slate-500">History Retention</p>
              <p className="mt-1 text-sm font-medium text-white light:text-slate-900">{usage.historyDays} days</p>
            </div>
            <div>
              <p className="text-xs text-white/50 light:text-slate-500">Plan</p>
              <p className="mt-1 text-sm font-medium text-white light:text-slate-900">{currentPlan}</p>
            </div>
          </div>
        </SpotlightCard> : null}

      {/* Plan comparison */}
      <div>
        {upgraded && <motion.div initial={{
        opacity: 0,
        y: 8
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Thanks! Your upgrade to {upgraded} is confirmed and active.
          </motion.div>}
        <h2 className="mb-4 text-sm font-medium text-white light:text-slate-900">Available Plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => {
          const isCurrent = plan.name === currentPlan;
          return <motion.div key={plan.name} initial={{
            opacity: 0,
            y: 16
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.5,
            delay: i * 0.06,
            ease: EASE
          }} className={`rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${plan.color} ${isCurrent ? "bg-white/[0.04] light:bg-slate-900/[0.03]" : "bg-neutral-900/40 light:bg-white hover:border-white/30 light:hover:border-slate-900/30"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white light:text-slate-900">{plan.label}</p>
                    <p className="mt-0.5 text-lg font-semibold text-white light:text-slate-900">{plan.price}</p>
                  </div>
                  {isCurrent && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      Current
                    </span>}
                </div>
                <ul className="mt-4 space-y-1.5">
                  {plan.features.map(f => <li key={f} className="flex items-center gap-1.5 text-xs text-white/60 light:text-slate-500">
                      <span className="text-emerald-400">✓</span> {f}
                    </li>)}
                </ul>
                {!isCurrent && <UpgradeButton plan={plan.name} />}
              </motion.div>;
        })}
        </div>
        <p className="mt-3 text-xs text-white/35 light:text-slate-400">
          Professional and Business upgrade instantly by card. Enterprise is custom — email sales@itops-monitor.local or contact your account manager.
        </p>
      </div>

      <StatusPageCard />
    </div>;
}
