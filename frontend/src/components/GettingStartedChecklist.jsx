import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { fetchAlertChannels, fetchCybersachetLicense, fetchOrgCybersachetAssignments, fetchOrganizationMembers, listHostAgents } from "../api/endpoints";
import { Reveal, SpotlightCard } from "./Animated";
import { useAuth } from "../context/AuthContext";
const EASE = [0.16, 1, 0.3, 1];
const DISMISS_KEY_PREFIX = "itops-getting-started-dismissed:";

// Every checkbox here reflects real org data (monitors, alert_channels,
// memberships, host_agents, cybersachet assignments) — never a separate
// "onboarding progress" flag that could say "done" while nothing real
// happened. Auto-hides once every step is genuinely complete.
export function GettingStartedChecklist({ monitors }) {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const [dismissed, setDismissed] = useState(() => orgId ? localStorage.getItem(DISMISS_KEY_PREFIX + orgId) === "1" : false);

  const { data: alertChannels } = useQuery({ queryKey: ["alert-channels"], queryFn: fetchAlertChannels, staleTime: 60_000 });
  const { data: members } = useQuery({ queryKey: ["org-members"], queryFn: fetchOrganizationMembers, staleTime: 60_000 });
  const { data: hostAgents } = useQuery({ queryKey: ["host-agents"], queryFn: listHostAgents, staleTime: 60_000 });
  const { data: hasCybersachet } = useQuery({ queryKey: ["cybersachet-license"], queryFn: fetchCybersachetLicense, staleTime: 5 * 60_000 });
  const { data: assignments } = useQuery({
    queryKey: ["org-cybersachet-assignments"],
    queryFn: fetchOrgCybersachetAssignments,
    enabled: !!hasCybersachet,
    staleTime: 60_000
  });

  const steps = [
    { key: "monitor", label: "Add your first monitor", description: "A website, network device, or DNS record to watch.", done: (monitors?.length ?? 0) > 0, to: "/monitors" },
    { key: "alert", label: "Set up an alert channel", description: "Email, Slack, or a webhook so you hear about incidents.", done: (alertChannels?.length ?? 0) > 0, to: "/settings/alerts" },
    { key: "team", label: "Invite your team", description: "Bring in the people who'll respond when something breaks.", done: (members?.length ?? 0) > 1, to: "/users" },
    { key: "agent", label: "Install a server agent", description: "Optional — CPU, memory, and disk for servers you run.", done: (hostAgents?.length ?? 0) > 0, to: "/hosts" },
    ...(hasCybersachet ? [{ key: "training", label: "Assign security training", description: "Get your team started on a CyberSachet course.", done: (assignments?.length ?? 0) > 0, to: "/training" }] : [])
  ];

  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;

  if (dismissed || allDone) return null;

  function dismiss() {
    if (orgId) localStorage.setItem(DISMISS_KEY_PREFIX + orgId, "1");
    setDismissed(true);
  }

  return <Reveal y={12}>
      <SpotlightCard className="p-4" scan tint="violet">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-white light:text-slate-900">Getting started</h2>
            <p className="mt-0.5 text-xs text-white/45 light:text-slate-400">{doneCount} of {steps.length} done</p>
          </div>
          <button onClick={dismiss} aria-label="Dismiss getting started checklist" className="text-xs text-white/40 light:text-slate-400 hover:text-white light:hover:text-slate-900">
            Dismiss
          </button>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10 light:bg-slate-900/10">
          <motion.div className="h-full rounded-full bg-violet-400" initial={{ width: 0 }} animate={{ width: `${(doneCount / steps.length) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
        </div>
        <ul className="space-y-1">
          {steps.map((step, i) => <motion.li key={step.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }}>
              <Link to={step.to} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03] light:hover:bg-slate-900/[0.03]">
                <div className="flex items-center gap-3">
                  <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${step.done ? "bg-emerald-400/20 text-emerald-300" : "border border-white/20 text-white/30 light:border-slate-900/20 light:text-slate-400"}`}>
                    {step.done ? "✓" : ""}
                  </span>
                  <div>
                    <p className={`text-sm ${step.done ? "text-white/50 line-through light:text-slate-400" : "text-white light:text-slate-900"}`}>{step.label}</p>
                    <p className="text-xs text-white/40 light:text-slate-400">{step.description}</p>
                  </div>
                </div>
                {!step.done && <span className="shrink-0 text-xs text-violet-300 light:text-violet-600">Go →</span>}
              </Link>
            </motion.li>)}
        </ul>
      </SpotlightCard>
    </Reveal>;
}
