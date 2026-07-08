// Re-runnable fallback to seed the platform super-admin.
//
//   email : babulearn57@gmail.com
//   pass  : admin@123
//
// Use this if you prefer not to rely on the SQL migration (e.g. your Supabase
// version is picky about raw auth.users inserts). The migration 0022 already
// seeds the owner on deploy; this is a manual, idempotent equivalent.
//
// Run from the frontend dir (which has @supabase/supabase-js installed):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ../scripts/seed-superadmin.mjs
//
// The service-role key bypasses RLS — keep it secret, never ship it to the client.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const EMAIL = "babulearn57@gmail.com";
const PASSWORD = "admin@123";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Create the user (idempotent — skip if it already exists).
  let userId;
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === EMAIL);

  if (found) {
    console.log("Super-admin already exists, reusing.");
    userId = found.id;
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { organization_name: "ITOps Platform", full_name: "Super Admin" },
    });
    if (error) throw error;
    userId = created.user.id;
    console.log("Created super-admin.");
  }

  // 2. Grant platform-admin (super-admin) rights.
  const { error: grantErr } = await supabase.rpc("admin_set_platform_admin", {
    p_user_id: userId,
    p_is_admin: true,
  });
  if (grantErr) throw grantErr;

  // 3. Give the owner org the top-tier package.
  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (membership?.organization_id) {
    await supabase
      .from("organizations")
      .update({ plan: "ENTERPRISE" })
      .eq("id", membership.organization_id);
  }

  console.log(`Done. Log in at /admin/login with ${EMAIL} / ${PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
