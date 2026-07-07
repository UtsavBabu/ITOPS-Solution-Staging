-- Three real, small additions backing the marketing site redesign:
--  1. waitlist_signups / contact_messages — anon-insert-only capture for CTAs
--     that don't have a real product behind them yet (CyberSachet, roadmap
--     solutions, contact/support forms). No fake success state without a
--     real row landing somewhere.
--  2. organizations.plan + enforced limits — pricing page reflects real,
--     enforced caps, not just marketing copy.
--  3. list_organization_members() — backs a real (read-only) Team page.

-- ---------------------------------------------------------------------------
-- Lead capture
-- ---------------------------------------------------------------------------

create table waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  product    text not null check (product in ('cybersachet', 'infrastructure-monitor', 'devops-monitor', 'upgrade-request')),
  note       text,
  created_at timestamptz not null default now()
);

alter table waitlist_signups enable row level security;

create policy waitlist_signups_insert on waitlist_signups
  for insert to anon, authenticated
  with check (true);

create table contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  topic      text not null check (topic in ('sales', 'support', 'company', 'other')),
  message    text not null,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

create policy contact_messages_insert on contact_messages
  for insert to anon, authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- Plans + enforced limits
-- ---------------------------------------------------------------------------

alter table organizations
  add column plan text not null default 'STARTER' check (plan in ('STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'));

create table plan_limits (
  plan               text primary key,
  max_monitors       int not null,
  max_alert_channels int not null,
  history_days       int not null
);

insert into plan_limits (plan, max_monitors, max_alert_channels, history_days) values
  ('STARTER', 3, 1, 7),
  ('PROFESSIONAL', 25, 5, 30),
  ('BUSINESS', 100, 20, 90),
  ('ENTERPRISE', 100000, 100000, 365);

alter table plan_limits enable row level security;

create policy plan_limits_select on plan_limits
  for select to anon, authenticated
  using (true);

-- Replace create_monitor to enforce max_monitors for the org's plan.
create or replace function create_monitor(p_name text, p_url text, p_interval text default 'FIVE_MINUTES')
returns monitors
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id     uuid;
  v_org_plan   text;
  v_max        int;
  v_current    int;
  v_asset      assets;
  v_monitor    monitors;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  select o.plan, pl.max_monitors into v_org_plan, v_max
  from organizations o join plan_limits pl on pl.plan = o.plan
  where o.id = v_org_id;

  select count(*) into v_current from monitors where organization_id = v_org_id;

  if v_current >= v_max then
    raise exception 'Plan limit reached: % plan allows up to % monitors. Upgrade to add more.', v_org_plan, v_max;
  end if;

  insert into assets (organization_id, type, name, identifier)
  values (v_org_id, 'WEBSITE', p_name, p_url)
  returning * into v_asset;

  insert into monitors (organization_id, asset_id, name, url, interval)
  values (v_org_id, v_asset.id, p_name, p_url, p_interval)
  returning * into v_monitor;

  return v_monitor;
end;
$$;

-- New RPC so alert-channel creation enforces max_alert_channels the same way
-- (previously a direct client-side insert with no limit check).
create or replace function create_alert_channel(p_type text, p_name text, p_config jsonb)
returns alert_channels
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id   uuid;
  v_org_plan text;
  v_max      int;
  v_current  int;
  v_channel  alert_channels;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  select o.plan, pl.max_alert_channels into v_org_plan, v_max
  from organizations o join plan_limits pl on pl.plan = o.plan
  where o.id = v_org_id;

  select count(*) into v_current from alert_channels where organization_id = v_org_id;

  if v_current >= v_max then
    raise exception 'Plan limit reached: % plan allows up to % alert channels. Upgrade to add more.', v_org_plan, v_max;
  end if;

  insert into alert_channels (organization_id, type, name, config)
  values (v_org_id, p_type, p_name, p_config)
  returning * into v_channel;

  return v_channel;
end;
$$;

-- The old direct-insert policy is now redundant with create_alert_channel and
-- would let a client bypass the plan check by inserting directly — remove it.
drop policy if exists alert_channels_insert on alert_channels;

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
  join plan_limits pl on pl.plan = o.plan;
$$;

grant execute on function create_alert_channel(text, text, jsonb) to authenticated;
grant execute on function get_plan_usage() to authenticated;

-- ---------------------------------------------------------------------------
-- Real (read-only) Team page
-- ---------------------------------------------------------------------------

create or replace function list_organization_members()
returns table (
  user_id    uuid,
  email      text,
  role       text,
  joined_at  timestamptz
)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  return query
    select m.user_id, u.email::text, m.role, m.created_at
    from memberships m
    join auth.users u on u.id = m.user_id
    where m.organization_id = v_org_id
    order by m.created_at asc;
end;
$$;

grant execute on function list_organization_members() to authenticated;
