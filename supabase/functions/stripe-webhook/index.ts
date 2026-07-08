// Stripe webhook receiver. Applies the purchased plan to the customer's
// organization once a Checkout Session completes. verify_jwt = false because
// Stripe calls this endpoint directly (no Supabase JWT) and proves itself with
// the Stripe-Signature header instead.
//
// Env (set via `supabase secrets set`):
//   STRIPE_WEBHOOK_SECRET    required (from the Stripe webhook endpoint config)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

// Constant-time-ish HMAC-SHA256 verification of Stripe's signature.
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<unknown | null> {
  const parts = header.split(",").reduce(
    (acc, p) => {
      const idx = p.indexOf("=");
      if (idx > -1) acc[p.slice(0, idx).trim()] = p.slice(idx + 1).trim();
      return acc;
    },
    {} as Record<string, string>,
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const computed = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computed.length !== signature.length) return null;
  let ok = true;
  for (let i = 0; i < computed.length; i++) if (computed[i] !== signature[i]) ok = false;
  if (!ok) return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!STRIPE_WEBHOOK_SECRET) return new Response("Webhook secret not configured", { status: 500 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe-Signature header", { status: 400 });

  const payload = await req.text();
  const event = await verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET);
  if (!event) return new Response("Invalid signature", { status: 400 });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // A completed Checkout Session is the moment we upgrade the org.
  if (event.type === "checkout.session.completed") {
    const session = (event as { data: { object: { metadata?: Record<string, string> } } }).data.object;
    const orgId = session.metadata?.organization_id;
    const plan = session.metadata?.plan;
    if (orgId && plan) {
      await supabase.rpc("admin_update_organization_plan", { p_organization_id: orgId, p_plan: plan });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
