// Remediation command channel for the Kada Nigrani agent.
//   GET  (action=fetch): agent presents its ingest key, receives approved
//        commands for its host, and they flip to 'running'.
//   POST (action=result): agent reports {command_id, exit_code, output}; the
//        row flips to 'success'/'failed'.
// Auth is the per-host ingest key (looked up with the service role), exactly
// like ingest-metrics. The agent presents the public anon key as bearer so the
// platform JWT gate passes; the ingest key is what actually authorizes.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

  return json({ error: "Unknown action" }, 400);
});
