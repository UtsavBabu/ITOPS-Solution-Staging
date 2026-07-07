// Platform-admin user management: create and delete users. Runs the auth-admin
// API (service role), but only after verifying the CALLER is a platform admin
// via their own JWT — so a normal user can't reach these actions even though
// the function itself holds the service role.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  // Who is calling?
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

  // Are they a platform admin? Checked against the table with the service role.
  const { data: adminRow } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!adminRow) return json({ error: "Not authorized — platform admins only" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "create") {
    const email = (body.email as string | undefined)?.trim();
    const password = body.password as string | undefined;
    const organizationName = (body.organizationName as string | undefined)?.trim() || "New Organization";
    const fullName = (body.fullName as string | undefined)?.trim() || "";
    const plan = (body.plan as string | undefined)?.trim().toUpperCase();
    const validPlans = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

    if (!email || !password || password.length < 8) {
      return json({ error: "A valid email and a password of at least 8 characters are required." }, 400);
    }
    if (plan && !validPlans.includes(plan)) {
      return json({ error: `Invalid package: ${plan}` }, 400);
    }

    // email_confirm:true so the account can log in immediately. The
    // handle_new_user trigger creates the organization + membership from
    // user_metadata (organization_name / full_name).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { organization_name: organizationName, full_name: fullName },
    });
    if (createErr) return json({ error: createErr.message }, 400);

    // Assign the chosen package to the freshly-created org (the trigger just
    // made it on STARTER). Best-effort: the account still exists if this fails.
    if (plan && plan !== "STARTER" && created.user?.id) {
      const { data: membership } = await admin
        .from("memberships")
        .select("organization_id")
        .eq("user_id", created.user.id)
        .maybeSingle();
      if (membership?.organization_id) {
        await admin.from("organizations").update({ plan }).eq("id", membership.organization_id);
      }
    }

    return json({ ok: true, userId: created.user?.id });
  }

  if (action === "delete") {
    const userId = body.userId as string | undefined;
    if (!userId) return json({ error: "userId is required" }, 400);
    if (userId === userData.user.id) return json({ error: "You can't delete your own account here." }, 400);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 400);

    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
