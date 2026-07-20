// Remediation + network-device-check channel for the Kada Nigrani agent.
//   POST (action=fetch): agent presents its ingest key, receives approved
//        commands for its host, and they flip to 'running'.
//   POST (action=result): agent reports {command_id, exit_code, output}; the
//        row flips to 'success'/'failed'.
//   POST (action=fetch_checks): agent receives network device monitors that
//        are relayed through it (monitors.via_host_agent_id = this host) and
//        are due — for devices on the agent's own LAN the cloud can't reach
//        directly (behind NAT/firewall).
//   POST (action=submit_check_result): agent reports back the result of one
//        of those checks; recorded exactly like a cloud check (same
//        incident/alert logic — see _shared/monitorResults.ts).
// Auth is the per-host ingest key (looked up with the service role), exactly
// like ingest-metrics. The agent presents the public anon key as bearer so the
// platform JWT gate passes; the ingest key is what actually authorizes.
import { createClient } from "npm:@supabase/supabase-js@2";
import { INTERVAL_MS, recordCheckResult } from "../_shared/monitorResults.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FAILURE_THRESHOLD = Number(Deno.env.get("FAILURE_THRESHOLD") ?? "2");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const agentKey = req.headers.get("x-agent-key");
  if (!agentKey) return json({ error: "Missing X-Agent-Key" }, 401);

  const { data: host, error: hostErr } = await supabase
    .from("host_agents")
    .select("id, organization_id")
    .eq("ingest_key", agentKey)
    .maybeSingle();
  if (hostErr) return json({ error: hostErr.message }, 500);
  if (!host) return json({ error: "Invalid agent key" }, 401);

  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "fetch";

  if (action === "fetch") {
    // Claim approved commands for this host and hand them over.
    const { data: cmds, error } = await supabase
      .from("host_commands")
      .select("id, action_key, arg")
      .eq("host_agent_id", host.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(5);
    if (error) return json({ error: error.message }, 500);

    const ids = (cmds ?? []).map((c) => c.id);
    if (ids.length > 0) {
      await supabase
        .from("host_commands")
        .update({ status: "running", started_at: new Date().toISOString() })
        .in("id", ids);
    }
    return json({ commands: cmds ?? [] });
  }

  if (action === "result") {
    const id = body.command_id as string | undefined;
    if (!id) return json({ error: "command_id required" }, 400);
    const exitCode = Number(body.exit_code ?? 1);
    const output = String(body.output ?? "").slice(0, 8000);
    // Guard: only update a command that belongs to this host.
    const { error } = await supabase
      .from("host_commands")
      .update({
        status: exitCode === 0 ? "success" : "failed",
        exit_code: exitCode,
        output,
        finished_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("host_agent_id", host.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "fetch_checks") {
    const { data: due, error } = await supabase
      .from("monitors")
      .select("id, url, tcp_port, interval")
      .eq("via_host_agent_id", host.id)
      .eq("is_active", true)
      .eq("check_type", "TCP")
      .lte("next_check_at", new Date().toISOString())
      .limit(10);
    if (error) return json({ error: error.message }, 500);

    // Push next_check_at forward at dispatch time (not just on result) so an
    // agent whose poll cycle overlaps a slow check can't be handed the same
    // monitor twice before it reports back.
    if (due && due.length > 0) {
      await Promise.all(
        due.map((m) =>
          supabase
            .from("monitors")
            .update({
              next_check_at: new Date(
                Date.now() + (INTERVAL_MS[m.interval] ?? INTERVAL_MS.FIVE_MINUTES),
              ).toISOString(),
            })
            .eq("id", m.id)
        ),
      );
    }

    return json({ checks: (due ?? []).map((m) => ({ id: m.id, host: m.url, port: m.tcp_port })) });
  }

  if (action === "submit_check_result") {
    const monitorId = body.monitor_id as string | undefined;
    if (!monitorId) return json({ error: "monitor_id required" }, 400);

    // Guard: only accept a result for a monitor actually relayed via this
    // agent — an agent's key can't be used to write results for someone
    // else's monitor.
    const { data: monitor, error: monErr } = await supabase
      .from("monitors")
      .select("*")
      .eq("id", monitorId)
      .eq("via_host_agent_id", host.id)
      .maybeSingle();
    if (monErr) return json({ error: monErr.message }, 500);
    if (!monitor) return json({ error: "Monitor not found or not assigned to this agent" }, 404);

    const status = body.status === "UP" ? "UP" : body.status === "DOWN" ? "DOWN" : "ERROR";
    const responseTimeMs = Number.isFinite(Number(body.response_time_ms))
      ? Number(body.response_time_ms)
      : undefined;
    const errorMessage = body.error_message ? String(body.error_message).slice(0, 500) : undefined;

    await recordCheckResult(
      supabase,
      monitor,
      { status, responseTimeMs, errorMessage, redirectChain: [] },
      { failureThreshold: FAILURE_THRESHOLD },
    );
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
