# Deploying ITOps Solution

The platform has two halves:

| Half | Where it runs | State |
|---|---|---|
| **Backend** — Postgres, Auth, RLS, Edge Functions, Storage, cron checks | Supabase project `ayzsuxmmnbtsylqdenna` | **Already live.** Nothing to host yourself. |
| **Frontend** — React SPA (marketing site + customer dashboard + admin panel) | Any server or static host | Build & serve `frontend/dist` |

## Option A — Docker on any cloud server (recommended)

```bash
cd frontend
docker build -t itops-frontend \
  --build-arg VITE_SUPABASE_URL="https://ayzsuxmmnbtsylqdenna.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="<anon key from frontend/.env>" .
docker run -d --restart unless-stopped -p 80:80 --name itops itops-frontend
```

Put your domain in front (any reverse proxy / load balancer) and enable HTTPS
(e.g. Caddy, Traefik, or certbot + nginx on the host).

## Option B — Static hosting (Vercel / Netlify / S3+CloudFront / any nginx)

```bash
cd frontend && npm ci && npm run build   # produces dist/
```

Serve `dist/` with an SPA fallback (all unknown paths → `index.html`).
`frontend/nginx.conf` shows the exact rules, including keeping
`/kada-nigrani-agent.sh` downloadable — customer servers fetch the monitoring
agent from that path.

Set the two env vars at build time: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(the anon key is public by design; tenant isolation is enforced by RLS).

## Backend redeploys (only when backend code changes)

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

Pushes any new `supabase/migrations/*.sql` and redeploys the edge functions
(`run-due-checks`, `ingest-metrics`, `admin-manage-users`, `test-alert-channel`).

## Super-admin (platform owner)

Migration `0022_seed_superadmin.sql` seeds the platform owner on deploy:

- **email:** `babulearn57@gmail.com`
- **password:** `admin@123`  *(rotate after first login)*

On the **first deploy** it also wipes all test data (monitors, orgs, users) for a
clean slate; on **subsequent deploys** it never wipes — it only ensures the
platform-admin grant and ENTERPRISE package stay intact, so customer data is safe.

The owner can:

- Log in at `/admin/login` (verified as a platform admin).
- Resell / provision customers from **Customers** (`/admin/customers`) on any package.
- Manage users platform-wide from **All Users** (`/admin/users`).
- Change any org's package from the Customers table.

If your Supabase version rejects the raw `auth.users` insert in the migration,
seed manually instead (idempotent):

```bash
cd frontend
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ../scripts/seed-superadmin.mjs
```

## Post-deploy smoke test

1. `https://<your-domain>/` — homepage loads, tech logos animate.
2. Register a Starter account → dashboard (plan defaults to **STARTER**, feature-gated).
3. Add a monitor:
   - **Website** tab — HTTP / Keyword / Status-Code checks.
   - **Network Devices** tab — TCP (routers, switches, firewalls, printers) and DNS.
   - First check lands within ~1 min (cron runs every minute).
4. `/admin/login` — super-admin (`babulearn57@gmail.com`) can manage customers, content, photos.
5. `curl https://<your-domain>/kada-nigrani-agent.sh | head` — agent downloadable.
6. **Self-serve upgrade (if Stripe is configured):** Pricing or Team → Professional/Business →
   "Upgrade with Card" redirects to Stripe Checkout; returning applies the plan automatically.

## Self-serve payments (Stripe Checkout)

Paid upgrades (Professional, Business) are purchased by card through Stripe Checkout.
The plan is applied by a webhook, not trusted to the browser.

Set the secrets (values are never committed):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set STRIPE_PRICE_PROFESSIONAL=price_xxx
supabase secrets set STRIPE_PRICE_BUSINESS=price_xxx
supabase secrets set APP_URL=https://<your-domain>
```

Then register the webhook in the Stripe dashboard pointing at:

```
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

Events to send: `checkout.session.completed`.

If Stripe secrets are absent, the buttons degrade gracefully to a "contact sales" message,
so the app still works without payments configured. ENTERPRISE remains sales-led.

## Remediation runbooks (Kada Nigrani agent)

The agent can run a **fixed allowlist** of safe, named actions an org admin
requests from the Hosts page — never arbitrary shell.

**How it works**
1. In the app: **Hosts → a host → Runbooks → choose an action → Run.** This
   inserts an `approved` row in `host_commands` (via the `request_host_command`
   RPC, which checks org membership). Nothing runs yet.
2. On the server, the agent (started with `AGENT_ALLOW_ACTIONS=1`) polls the
   `agent-commands` edge function each cycle, authenticated by its per-host
   ingest key, and receives its approved actions.
3. The agent maps each `action_key` to a **hardcoded** command (the database
   never stores a raw command), runs it, and posts back the exit code + output.
4. The Runbooks panel shows the result live with a full audit trail.

**Allowlisted actions:** `ping`, `clear_temp` (safe) · `reload_nginx`,
`reload_apache` (low) · `restart_service`, `restart_docker_container` (medium).

**Enable on a server** (opt-in — the default agent only reports metrics):
```bash
INGEST_URL=".../functions/v1/ingest-metrics" \
COMMANDS_URL=".../functions/v1/agent-commands" \
ANON_KEY="<anon>" AGENT_KEY="<host ingest key>" \
AGENT_ALLOW_ACTIONS=1 \
AGENT_ALLOWED_SERVICES="nginx apache2 docker" \   # only these may be restarted
/opt/kada-nigrani-agent.sh
```
Run it as a user with permission for the actions you enable (e.g. root or a
sudo-scoped service account). Omit `AGENT_ALLOW_ACTIONS` and the agent will
refuse all remediation and only stream metrics.
