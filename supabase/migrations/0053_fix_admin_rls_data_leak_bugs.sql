-- Real bug found while checking Team & Plan on a mobile viewport: it showed
-- STARTER / 1 monitor for an account whose organization is actually
-- ENTERPRISE with several monitors. Root cause is in get_plan_usage()
-- (migration 0004) — it never filtered to the caller's own organization,
-- relying entirely on RLS to narrow `organizations` to one row. That's true
-- for an ordinary member (organizations_select: is_org_member(id)), but a
-- platform admin who is *also* a member of their own customer-style
-- organization (the super-admin account itself, or any admin who also
-- signed up as a customer) additionally matches organizations_admin_select
-- (is_platform_admin()), which grants visibility into every organization.
-- With no WHERE clause, the join returned one row per visible org, and the
-- frontend's .single()-style read just took whichever came back first —
-- a different, arbitrary organization's plan and monitor count. Fixed by
-- explicitly scoping to the caller's own organization, the same
-- `memberships ... limit 1` pattern every other org-scoped RPC uses.

create or replace function get_plan_usage()
returns table (
  plan text,
  max_monitors int,
  current_monitors int,
  max_alert_channels int,
  current_alert_channels int,
  history_days int
)
language sql security invoker stable set search_path = public, pg_temp as $$
  select
    o.plan,
    pl.max_monitors,
    (select count(*) from monitors where organization_id = o.id)::int,
    pl.max_alert_channels,
    (select count(*) from alert_channels where organization_id = o.id)::int,
    pl.history_days
  from organizations o
  join plan_limits pl on pl.plan = o.plan
  where o.id = (select organization_id from memberships where user_id = auth.uid() limit 1);
$$;

-- Same bug, same fix, on the Dashboard's stat tiles: get_dashboard_summary()
-- (migration 0001/0003) had literally no organization filter at all —
-- `monitors_admin_select` (using is_platform_admin()) means any platform
-- admin who is also a member of their own organization saw platform-wide
-- counts across every tenant on their own customer Dashboard, not their
-- org's real numbers.
create or replace function public.get_dashboard_summary()
returns table (
  total_monitors int,
  up_monitors int,
  down_monitors int,
  open_incidents int,
  total_assets int,
  expiring_ssl int
)
language sql security invoker stable set search_path = public, pg_temp as $$
  with my_org as (
    select organization_id from public.memberships where user_id = auth.uid() limit 1
  )
  select
    (select count(*) from public.monitors where organization_id = (select organization_id from my_org))::int,
    (select count(*) from public.monitors where organization_id = (select organization_id from my_org) and last_status = 'UP')::int,
    (select count(*) from public.monitors where organization_id = (select organization_id from my_org) and last_status in ('DOWN', 'ERROR'))::int,
    (select count(*) from public.incidents where organization_id = (select organization_id from my_org) and status = 'OPEN')::int,
    (select count(*) from public.assets where organization_id = (select organization_id from my_org))::int,
    (select count(*) from public.ssl_info where organization_id = (select organization_id from my_org) and days_remaining <= 14)::int;
$$;
