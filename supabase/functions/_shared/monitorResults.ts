// Recording a check result and reconciling incident state is identical
// whether the check ran in the cloud (run-due-checks) or was relayed through
// a Kada Nigrani agent on the device's own LAN (agent-commands) — one shared
// implementation so the two paths can't quietly drift (different alert
// thresholds, different incident behavior) from each other.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { dispatchAlert } from "./alerts.ts";
import type { CheckStatus, DnsAnswer } from "./checks.ts";

export const INTERVAL_MS: Record<string, number> = {
  THIRTY_SECONDS: 30_000,
  ONE_MINUTE: 60_000,
  FIVE_MINUTES: 5 * 60_000,
  FIFTEEN_MINUTES: 15 * 60_000,
};

export interface CheckOutcome {
  status: CheckStatus;
  statusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  redirectChain?: string[];
  dnsAnswers?: DnsAnswer[];
}

// deno-lint-ignore no-explicit-any
export async function recordCheckResult(
  supabase: SupabaseClient,
  monitor: any,
  outcome: CheckOutcome,
  options: { failureThreshold: number },
): Promise<void> {
  await supabase.from("check_results").insert({
    organization_id: monitor.organization_id,
    monitor_id: monitor.id,
    status: outcome.status,
    status_code: outcome.statusCode,
    response_time_ms: outcome.responseTimeMs,
    error_message: outcome.errorMessage,
    redirect_chain: outcome.redirectChain ?? [],
    dns_answers: outcome.dnsAnswers ?? null,
  });

  await reconcileIncidentState(supabase, monitor, outcome.status, outcome.errorMessage, options.failureThreshold);

  const now = new Date();
  const intervalMs = INTERVAL_MS[monitor.interval] ?? INTERVAL_MS.FIVE_MINUTES;
  await supabase
    .from("monitors")
    .update({
      last_checked_at: now.toISOString(),
      last_status: outcome.status,
      next_check_at: new Date(now.getTime() + intervalMs).toISOString(),
      consecutive_fails: outcome.status === "UP" ? 0 : monitor.consecutive_fails + 1,
    })
    .eq("id", monitor.id);
}

// deno-lint-ignore no-explicit-any
async function reconcileIncidentState(
  supabase: SupabaseClient,
  monitor: any,
  status: CheckStatus,
  errorMessage: string | undefined,
  failureThreshold: number,
): Promise<void> {
  const { data: openIncident } = await supabase
    .from("incidents")
    .select("*")
    .eq("monitor_id", monitor.id)
    .eq("status", "OPEN")
    .maybeSingle();

  if (status !== "UP") {
    const willFailCount = monitor.consecutive_fails + 1;
    if (!openIncident && willFailCount >= failureThreshold) {
      await supabase.from("incidents").insert({
        organization_id: monitor.organization_id,
        monitor_id: monitor.id,
        cause: errorMessage ?? (status === "ERROR" ? "Connection error" : "Check assertion failed"),
      });
      await dispatchAlert(supabase, monitor.organization_id, {
        type: "MONITOR_DOWN",
        monitor,
        message: `${monitor.name} (${monitor.url}) appears to be down.`,
      });
    }
    return;
  }

  if (openIncident) {
    await supabase
      .from("incidents")
      .update({ status: "RESOLVED", resolved_at: new Date().toISOString() })
      .eq("id", openIncident.id);
    await dispatchAlert(supabase, monitor.organization_id, {
      type: "MONITOR_UP",
      monitor,
      message: `${monitor.name} (${monitor.url}) has recovered.`,
    });
  }
}
