// Sends (or re-sends) a real team-invite email for an org_invites row that
// already exists — create_org_invite() (an authenticated RPC) is the real
// authorization/creation boundary; this function only re-checks the caller
// still has team-manage permission and, if RESEND_API_KEY is configured,
// emails the invite link. The link is always returned either way so the
// admin can copy-share it manually when delivery isn't configured or fails —
// the same graceful-degradation pattern sendEmailAlert() already uses.
//
// Env (set via `supabase secrets set`):
//   RESEND_API_KEY    optional — without it, the email step is skipped
//   ALERT_EMAIL_FROM  optional — defaults to alerts@itops-monitor.local
//   APP_URL           optional — defaults to http://localhost:5173

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("ALERT_EMAIL_FROM") ?? "alerts@itops-monitor.local";
const APP_URL = (Deno.env.get("APP_URL") ?? "http://localhost:5173").replace(/\/$/, "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return json({ error: "Missing bearer token" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

  const body = await req.json().catch(() => ({}));
  const inviteId = body.inviteId as string | undefined;
  if (!inviteId) return json({ error: "inviteId is required" }, 400);

  const { data: membership } = await admin
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!membership?.organization_id) return json({ error: "No organization found for this user." }, 400);

  const { data: perm } = await admin
    .from("role_permissions")
    .select("can_manage")
    .eq("role_key", membership.role)
    .eq("module_key", "team")
    .maybeSingle();
  if (!perm?.can_manage) return json({ error: "Not authorized — team management access required" }, 403);

  const { data: invite, error: inviteErr } = await admin
    .from("org_invites")
    .select("email, token, expires_at, accepted_at, revoked_at, organizations(name), roles(name)")
    .eq("id", inviteId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (inviteErr || !invite) return json({ error: "Invite not found." }, 404);
  if (invite.accepted_at) return json({ error: "This invite has already been accepted." }, 400);
  if (invite.revoked_at) return json({ error: "This invite has been revoked." }, 400);

  const inviteLink = `${APP_URL}/invite/${invite.token}`;

  if (!RESEND_API_KEY) {
    console.warn(`[invite email skipped: RESEND_API_KEY not configured] ${invite.email}: ${inviteLink}`);
    return json({ sent: false, reason: "email_not_configured", inviteLink });
  }

  const orgName = (invite.organizations as { name?: string } | null)?.name ?? "your organization";
  const roleName = (invite.roles as { name?: string } | null)?.name ?? "team member";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: invite.email,
      subject: `You're invited to join ${orgName} on ITOps Solution`,
      html: `<p>You've been invited to join <strong>${orgName}</strong> as a <strong>${roleName}</strong>.</p>
             <p><a href="${inviteLink}">Accept your invite</a></p>
             <p>This link expires on ${new Date(invite.expires_at as string).toLocaleDateString()}.</p>`,
    }),
  });

  if (!res.ok) {
    console.warn(`[invite email failed] ${await res.text()}`);
    return json({ sent: false, reason: "send_failed", inviteLink });
  }

  return json({ sent: true, inviteLink });
});
