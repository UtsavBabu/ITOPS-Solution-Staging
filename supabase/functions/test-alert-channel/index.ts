// Invoked from the frontend via supabase.functions.invoke("test-alert-channel").
// Runs as the calling user's JWT (verified below), not the service role, so it
// double-checks org membership before sending anything.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmailAlert, sendSlackAlert, sendWebhookAlert } from "../_shared/alerts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  // supabase-js attaches apikey/x-client-info to every request automatically;
  // omitting them here made the browser's CORS preflight reject the call
  // before it ever reached this function.
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { channelId } = await req.json().catch(() => ({ channelId: null }));
  if (!channelId) {
    return new Response(JSON.stringify({ error: "channelId is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: channel, error: channelError } = await admin
    .from("alert_channels")
    .select("*")
    .eq("id", channelId)
    .single();
  if (channelError || !channel) {
    return new Response(JSON.stringify({ error: "Alert channel not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: membership } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("organization_id", channel.organization_id)
    .maybeSingle();
  if (!membership) {
    return new Response(JSON.stringify({ error: "Not authorized for this channel" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const testEvent = {
    type: "MONITOR_DOWN" as const,
    monitor: { id: "test", name: "Test Monitor", url: "https://example.com" },
    message: "This is a test alert from ITOps Monitor.",
  };

  try {
    if (channel.type === "EMAIL") await sendEmailAlert(channel.config, testEvent);
    if (channel.type === "SLACK") await sendSlackAlert(channel.config, testEvent);
    if (channel.type === "WEBHOOK") await sendWebhookAlert(channel.config, testEvent);
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Failed to send" }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
