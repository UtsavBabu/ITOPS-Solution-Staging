// Kada Nigrani metrics ingestion.
//
// Called by the host agent (agents/kada-nigrani-agent.sh) on a schedule. The
// agent presents the project anon key as the bearer (so the platform's
// verify_jwt gate passes — the anon key is public by design) AND its own
// per-host ingest key in X-Agent-Key, which is what actually authenticates the
// host. We look the host up by that key with the service role, store a metrics
// row, and stamp last_seen. No user session is involved.
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

// Coerce to a finite number or null — never let a bad field abort the whole insert.
function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const agentKey = req.headers.get("x-agent-key");
  if (!agentKey) return json({ error: "Missing X-Agent-Key" }, 401);

  const { data: host, error: hostErr } = await supabase
    .from("host_agents")
    .select("id, organization_id")
    .eq("ingest_key", agentKey)
    .maybeSingle();

  if (hostErr) return json({ error: hostErr.message }, 500);
  if (!host) return json({ error: "Invalid agent key" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { error: insertErr } = await supabase.from("host_metrics").insert({
    organization_id: host.organization_id,
    host_agent_id: host.id,
    cpu_percent: num(payload.cpu_percent),
    mem_percent: num(payload.mem_percent),
    mem_used_mb: num(payload.mem_used_mb),
    mem_total_mb: num(payload.mem_total_mb),
    disk_percent: num(payload.disk_percent),
    disk_used_gb: num(payload.disk_used_gb),
    disk_total_gb: num(payload.disk_total_gb),
    uptime_seconds: num(payload.uptime_seconds),
    load1: num(payload.load1),
    load5: num(payload.load5),
    load15: num(payload.load15),
    process_count: num(payload.process_count),
  });

  if (insertErr) return json({ error: insertErr.message }, 500);

  // Stamp host metadata + heartbeat. Best-effort — a failure here shouldn't
  // fail an otherwise-successful metrics write.
  await supabase
    .from("host_agents")
    .update({
      last_seen_at: new Date().toISOString(),
      hostname: typeof payload.hostname === "string" ? payload.hostname : undefined,
      os: typeof payload.os === "string" ? payload.os : undefined,
      agent_version: typeof payload.agent_version === "string" ? payload.agent_version : undefined,
    })
    .eq("id", host.id);

  return json({ ok: true });
});
