# ITOps Monitor — Website Monitoring SaaS (Supabase)

A multi-tenant SaaS that monitors websites: uptime, response time, SSL
certificate expiry, and security header posture — with incident tracking and
alerting (email / Slack / generic webhook). Built entirely on **Supabase**:
Auth, Postgres + Row Level Security, and Edge Functions — no separate
backend server to run or host.

**Status: deployed and verified live** against a real Supabase project —
signup/login, monitor CRUD, the scheduled checker, incident tracking, and
alert channels have all been exercised end-to-end in a real browser, not
just typechecked. See "What's actually been verified" below for specifics,
including two real bugs that browser testing caught and fixed.

## Architecture

```
frontend/          React + Vite + JavaScript + Tailwind — talks directly to
                    Supabase via supabase-js. No custom REST API in between.

supabase/
├── migrations/     Schema, RLS policies, and RPC functions (Postgres)
│   ├── 0001_init.sql   Tables, RLS, auth trigger (signup -> org + membership),
│   │                   create_monitor/delete_monitor/get_dashboard_summary RPCs
│   ├── 0002_cron.sql   pg_cron + pg_net extensions (the schedule itself is
│   │                   set up via SQL Editor — see step 4 below)
│   └── 0003_fix_security_definer_search_path.sql
│                       Fixes "Database error saving new user": GoTrue runs
│                       the signup trigger as a role whose search_path
│                       excludes `public`, so unqualified table names in
│                       SECURITY DEFINER functions silently failed to
│                       resolve. Every such function now sets
│                       search_path explicitly and fully-qualifies tables.
└── functions/      Deno Edge Functions
    ├── _shared/        checks.ts (http/ssl/header logic), alerts.ts (dispatch)
    ├── run-due-checks/     the scheduler: finds due monitors, runs checks,
    │                       opens/resolves incidents, sends alerts
    └── test-alert-channel/ "send test alert" button, called from the frontend
```

**Auth**: Supabase Auth (email/password). A Postgres trigger on
`auth.users` (`handle_new_user`) auto-creates an organization + admin
membership on signup, reading `organization_name`/`full_name` from the
signup call's `options.data`.

**Multi-tenancy**: every table is scoped by `organization_id` and protected
by Row Level Security — the `is_org_member()` helper function checks the
`memberships` table. The frontend never talks to a trusted backend that
enforces authorization; **RLS is the authorization layer**.

**Scheduler**: Supabase has no built-in cron for Edge Functions, so
`pg_cron` (inside Postgres) calls `run-due-checks` over HTTP via `pg_net`
every minute (pg_cron's finest granularity), authenticated with two things:
`Authorization: Bearer <service_role key>` (satisfies Supabase's platform
JWT gate — every Edge Function requires *some* valid signed project JWT
before your code even runs) and a custom `X-Cron-Secret` header checked
against a `CRON_SECRET` value generated and stored as a function secret
(this is the actual authorization decision — see the comment in
`run-due-checks/index.ts` for why it doesn't rely on byte-matching the
auto-injected `SUPABASE_SERVICE_ROLE_KEY`). The `THIRTY_SECONDS` monitor
interval option effectively runs at most once/minute as a result of the
1-minute cron floor.

**SSL certificate checks** call an external API (whoisjson.com, free tier:
1,000 req/month) rather than opening a raw socket — see "What's actually
been verified" for why, and gate to at most once/24h per monitor since certs
don't need constant polling.

**Compound writes** (creating a monitor + its underlying asset atomically,
or deleting both together) go through Postgres RPC functions
(`create_monitor`, `delete_monitor`) rather than multiple client-side calls,
since supabase-js has no multi-statement transaction API.

## What it actually does

1. Multi-tenant auth, org-scoped everywhere via RLS.
2. Website monitors — add a URL, pick a check interval, scheduler polls due
   monitors and records uptime/response time/redirect chain.
3. SSL certificate monitoring (issuer, expiry, protocol, trust) via the
   whoisjson.com API — degrades gracefully with a clear "not configured"
   message (not a scary "invalid" state) if `WHOISJSON_API_KEY` isn't set.
4. Security header scoring (HSTS/CSP/X-Frame-Options/etc.) + cookie flag
   checks + server-header version leak detection.
5. Incident tracking — opens after N consecutive failures, auto-resolves.
6. Alerting — Slack/generic webhook work with zero extra setup; email uses
   [Resend](https://resend.com) (an HTTP email API — more reliable than raw
   SMTP from a serverless function) and needs a `RESEND_API_KEY` secret.
7. Asset inventory — websites auto-added via monitors; manual entries for
   other types (servers, databases, other).
8. Dashboard — stats, monitor list/detail with response-time chart, SSL/header
   detail, incidents, asset inventory, alert channel management with test-send.

## What's actually been verified (not just typechecked)

Everything below was exercised against a real, live Supabase project — real
signups, a real monitor pointed at `https://example.com`, a real cron run,
and a real Playwright-driven browser session against the actual dashboard:

- **Signup → org auto-provisioning**: hit the "Database error saving new
  user" bug live, root-caused it (search_path), fixed it, and reconfirmed
  with a real signup that created the organization + admin membership.
- **RLS**: confirmed a logged-in user sees exactly their own org's data via
  direct REST calls with their session token.
- **`create_monitor` / `delete_monitor` RPCs**: created and deleted a real
  monitor (and its underlying asset) through the actual UI, including the
  native `confirm()` delete dialog.
- **The scheduler runs on its own**: after wiring up `pg_cron`, watched
  `last_checked_at` advance on a monitor with zero manual intervention —
  the automated loop genuinely works, not just "the function runs when I
  curl it."
- **HTTP uptime + response time + security header scoring**: real data
  (200 status, response time series, header score, missing-headers list)
  rendered correctly in the dashboard and monitor detail page.
- **SSL certificate inspection**: originally implemented with Deno's
  `node:tls` compatibility layer (`getPeerCertificate()`), which worked
  perfectly under the vanilla Deno CLI locally — but timed out every time
  once actually deployed to Supabase's Edge Runtime. Confirmed via Deno's
  own docs that native `Deno.TlsConn` exposes nothing but an ALPN string,
  and that `node:tls` specifically isn't supported in Supabase's runtime
  (corroborated by other developers hitting the same wall). Replaced with
  the whoisjson.com HTTP API instead — this is a real platform limitation,
  not a bug I introduced.
- **`test-alert-channel` CORS bug**: found by driving the "Send test" button
  in an actual browser — supabase-js attaches an `x-client-info` header to
  every request, which wasn't in the function's `Access-Control-Allow-Headers`,
  so the browser's CORS preflight silently rejected every call before it
  reached the function. Invisible to curl-based testing; only showed up as
  a browser console error. Fixed and reconfirmed.
- **Auth edge cases**: wrong password shows a clear error; visiting a
  protected route while logged out redirects to `/login`; logout clears the
  session and redirects correctly.

The live database was returned to a clean, empty state after all of this —
no leftover test users, orgs, monitors, or alert channels.

## Setup

### 1. Create a Supabase project

At [supabase.com](https://supabase.com) if you don't have one already.

### 2. Push the schema

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # runs supabase/migrations/*.sql
```

### 3. Deploy the Edge Functions

```bash
npx supabase functions deploy run-due-checks
npx supabase functions deploy test-alert-channel

# Required for the cron auth check (see Scheduler above):
npx supabase secrets set CRON_SECRET=$(openssl rand -hex 32)

# Optional, for SSL certificate details (free tier: 1,000 req/month):
npx supabase secrets set WHOISJSON_API_KEY=<your-key>   # sign up at whoisjson.com

# Optional, for email alerts (Slack/webhook need no secrets):
npx supabase secrets set RESEND_API_KEY=re_xxx ALERT_EMAIL_FROM=alerts@yourdomain.com
```

### 4. Schedule the checker

In the Supabase SQL Editor, run once — substituting your values from
**Project Settings → API** and the `CRON_SECRET` you generated above:

```sql
select vault.create_secret(
  'https://<project-ref>.functions.supabase.co/run-due-checks', 'run_due_checks_url'
);
select vault.create_secret('<your-service-role-key>', 'service_role_key');
select vault.create_secret('<your-cron-secret>', 'cron_secret');

select cron.schedule(
  'run-due-checks-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'run_due_checks_url'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

To inspect or undo: `select * from cron.job;` /
`select cron.unschedule('run-due-checks-every-minute');`

### 5. Configure and run the frontend

```bash
cd frontend
cp .env.example .env   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
                        # from Project Settings > API
npm install
npm run dev
```

### 6. Turn off email confirmation for a faster demo (optional)

By default Supabase requires clicking a confirmation link before a new
signup gets a session. To skip that during testing: **Authentication →
Providers → Email → Confirm email → off**. The frontend already handles
both cases (shows "check your email" if confirmation is required) —
confirmed working in both modes during testing.

## How this maps to the original vision

Website monitoring, security headers, SSL, asset inventory, and alerting are
built. Endpoint agents, cloud connectors, vulnerability-DB integration,
compliance frameworks, AI analysis, Kubernetes monitoring, and billing are
not — this is Phase 1 (website monitoring) of a much larger possible
roadmap, done properly rather than stubbed everywhere.

## Honest limitations

- No automated tests yet.
- No password reset flow beyond what Supabase Auth provides out of the box.
- Alert channels are organization-wide (all channels fire for all monitors
  in the org) — no per-monitor channel routing yet.
- `pg_cron`'s 1-minute floor means the `THIRTY_SECONDS` monitor interval is
  aspirational, not real, on this architecture.
- SSL checks depend on a third-party API (whoisjson.com) with a metered free
  tier — fine at small scale (checked at most once/day/monitor), but a
  quota/reliability dependency worth knowing about as you grow.
- RLS policies assume one organization per user (the MVP signup flow only
  ever creates one membership). Multi-org-per-user isn't blocked at the
  schema level but nothing in the UI supports switching orgs.
- `legacy-express-backend/` (the Node/Express + Prisma version) and
  `legacy-python-mvp/` (the original root-cause-analysis prototype) are kept
  for reference but are not part of the running system anymore.
