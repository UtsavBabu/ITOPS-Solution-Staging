// Self-serve upgrade: creates a Stripe Checkout Session for a paid plan and
// returns the hosted URL. The caller's own JWT is verified (verify_jwt = true),
// then we resolve their organization and look up the plan's Stripe Price ID.
//
// On success Stripe redirects to APP_URL/team?upgraded=<plan>. The plan is
// actually applied by the stripe-webhook function when the session completes
// (so we never trust the client to flip its own plan).
//
// Env (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY        required
//   STRIPE_PRICE_PROFESSIONAL  required (Price ID for the Professional plan)
//   STRIPE_PRICE_BUSINESS      required (Price ID for the Business plan)
//   APP_URL                  success/cancel base URL (e.g. https://app.example.com)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const APP_URL = (Deno.env.get("APP_URL") ?? "http://localhost:5173").replace(/\/$/, "");

// Only these plans are self-serve by card; ENTERPRISE stays "talk to sales".
const SELF_SERVE_PLANS: Record<string, string> = {
  PROFESSIONAL: "STRIPE_PRICE_PROFESSIONAL",
  BUSINESS: "STRIPE_PRICE_BUSINESS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!authHeader) return json({ error: "Missing bearer token" }, 401);
  if (!STRIPE_SECRET_KEY) {
    return json({ error: "Payments are not enabled on this instance yet — contact sales to upgrade." }, 503);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader);
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan ?? "").toUpperCase();
  const priceEnv = SELF_SERVE_PLANS[plan];
  if (!priceEnv) return json({ error: `Plan "${plan}" is not available for self-serve checkout.` }, 400);

  const priceId = Deno.env.get(priceEnv);
  if (!priceId) return json({ error: "Stripe price not configured for this plan." }, 503);

  // Resolve the caller's organization.
  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!membership?.organization_id) return json({ error: "No organization found for this user." }, 400);

  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", membership.organization_id)
    .maybeSingle();
  if (org?.plan === plan) return json({ error: "Your organization is already on this plan." }, 400);

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("success_url", `${APP_URL}/team?upgraded=${plan}`);
  form.set("cancel_url", `${APP_URL}/pricing`);
  form.set("client_reference_id", membership.organization_id);
  if (userData.user.email) form.set("customer_email", userData.user.email);
  form.set("allow_promotion_codes", "true");
  form.set("metadata[organization_id]", membership.organization_id);
  form.set("metadata[plan]", plan);
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", "1");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const session = await res.json();
  if (!res.ok) {
    return json({ error: session?.error?.message ?? "Stripe request failed." }, 502);
  }

  return json({ url: session.url });
});
