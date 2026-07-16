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

  // Are they a platform admin? Checked against the table with the service
  // role. Their specific role governs which actions below they can take —
  // requires migration 0030/0031 (platform_admins.role) — falls back to
  // "any admin, any action" if that column doesn't exist yet, so this
  // doesn't hard-fail on an un-migrated database.
  const { data: adminRow } = await admin
    .from("platform_admins")
    .select("user_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!adminRow) return json({ error: "Not authorized — platform admins only" }, 403);
  const role = (adminRow as { role?: string }).role;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "create") {
    // Provisioning covers support's day-to-day customer onboarding and a
    // reseller's own sales — both need it. Billing/content_editor don't.
    if (role && !["super_admin", "support", "reseller"].includes(role)) {
      return json({ error: "Not authorized — support, reseller, or super admin access required" }, 403);
    }

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

    // Stamp who provisioned this org (a reseller's console is scoped to
    // orgs they created — see migration 0031) and assign the chosen
    // package (the trigger just made it on STARTER). Both best-effort: the
    // account still exists if either of these fails.
    if (created.user?.id) {
      const { data: membership } = await admin
        .from("memberships")
        .select("organization_id")
        .eq("user_id", created.user.id)
        .maybeSingle();
      if (membership?.organization_id) {
        const updates: Record<string, unknown> = { created_by: userData.user.id };
        if (plan && plan !== "STARTER") updates.plan = plan;
        await admin.from("organizations").update(updates).eq("id", membership.organization_id);
      }
    }

    return json({ ok: true, userId: created.user?.id });
  }

  if (action === "delete") {
    if (role && !["super_admin", "support"].includes(role)) {
      return json({ error: "Not authorized — support or super admin access required" }, 403);
    }

    const userId = body.userId as string | undefined;
    if (!userId) return json({ error: "userId is required" }, 400);
    if (userId === userData.user.id) return json({ error: "You can't delete your own account here." }, 400);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 400);

    return json({ ok: true });
  }

  if (action === "update") {
    // Same reach as reset_password — editing a name isn't a higher-trust
    // action than resetting the credential that gets you into the account.
    if (role && !["super_admin", "support", "reseller"].includes(role)) {
      return json({ error: "Not authorized — support, reseller, or super admin access required" }, 403);
    }

    const userId = body.userId as string | undefined;
    const fullName = (body.fullName as string | undefined)?.trim();
    if (!userId || fullName === undefined) {
      return json({ error: "userId and fullName are required." }, 400);
    }

    // updateUserById replaces user_metadata wholesale — fetch first and
    // merge so organization_name (set at signup) doesn't get wiped out.
    const { data: existing, error: fetchErr } = await admin.auth.admin.getUserById(userId);
    if (fetchErr || !existing.user) return json({ error: fetchErr?.message ?? "User not found" }, 404);

    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { ...existing.user.user_metadata, full_name: fullName },
    });
    if (updateErr) return json({ error: updateErr.message }, 400);

    return json({ ok: true });
  }

  if (action === "reset_password") {
    // Same reach as provisioning — a support/reseller/super_admin who can
    // create an account can also help its owner back into it.
    if (role && !["super_admin", "support", "reseller"].includes(role)) {
      return json({ error: "Not authorized — support, reseller, or super admin access required" }, 403);
    }

    const userId = body.userId as string | undefined;
    const password = body.password as string | undefined;
    if (!userId || !password || password.length < 8) {
      return json({ error: "userId and a password of at least 8 characters are required." }, 400);
    }

    const { error: resetErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (resetErr) return json({ error: resetErr.message }, 400);

    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
