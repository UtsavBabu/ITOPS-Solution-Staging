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

## Post-deploy smoke test

1. `https://<your-domain>/` — homepage loads, tech logos animate.
2. Register a Starter account → dashboard.
3. Add a monitor → first check lands within ~1 min (cron runs every minute).
4. `/admin/login` — platform admin can manage customers, content, photos.
5. `curl https://<your-domain>/kada-nigrani-agent.sh | head` — agent downloadable.
