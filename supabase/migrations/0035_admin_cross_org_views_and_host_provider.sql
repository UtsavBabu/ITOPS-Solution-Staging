-- Three independent additions:
--   1. Platform-wide list views backing the Command Center's stat tiles
--      (Monitors, Incidents, Agents, SSL) with an actual destination page —
--      previously those tiles had nowhere to click through to.
--   2. Optional cloud-provider tagging on server agents (Kada Nigrani hosts)
--      so a customer can label a host as AWS/Azure/GCP/on-prem/other —
--      metadata only, doesn't change how the agent is monitored.
--   3. admin_list_all_users() grows full_name, so All Users can show/edit it
--      (the admin-manage-users edge function's new "update" action).
--
-- All four list RPCs exclude reseller (is_reseller_only()) — same reasoning
-- as admin_security_highlights in migration 0034: named data belonging to
-- organizations a reseller didn't provision is off-limits to them, even
-- though the aggregate counts on the Command Center are not.

-- ---------------------------------------------------------------------------
-- 1. Cross-org list RPCs
-- ---------------------------------------------------------------------------

create or replace function admin_list_monitors(p_status text default null)
returns table (
  id                 uuid,
  organization_id    uuid,
  organization_name  text,
  name               text,
  check_type         text,
  url                text,
  tcp_port           int,
  last_status        text,
  last_checked_at    timestamptz,
  "interval"         text
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() or is_reseller_only() then
    raise exception 'Not authorized';
  end if;

  return query
  select m.id, m.organization_id, o.name, m.name, m.check_type, m.url, m.tcp_port, m.last_status, m.last_checked_at, m.interval
  from monitors m
  join organizations o on o.id = m.organization_id
  where p_status is null or m.last_status = p_status
  order by (m.last_status in ('DOWN', 'ERROR')) desc, m.last_checked_at desc nulls last;
end;
$$;
grant execute on function admin_list_monitors(text) to authenticated;

create or replace function admin_list_open_incidents()
returns table (
  id                 uuid,
  organization_id    uuid,
  organization_name  text,
  monitor_id         uuid,
  monitor_name       text,
  cause              text,
  started_at         timestamptz
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() or is_reseller_only() then
    raise exception 'Not authorized';
  end if;

  return query
  select i.id, i.organization_id, o.name, i.monitor_id, m.name, i.cause, i.started_at
  from incidents i
  join organizations o on o.id = i.organization_id
  join monitors m on m.id = i.monitor_id
  where i.status = 'OPEN'
  order by i.started_at desc;
end;
$$;
grant execute on function admin_list_open_incidents() to authenticated;

create or replace function admin_list_host_agents()
returns table (
  id                 uuid,
  organization_id    uuid,
  organization_name  text,
  name               text,
  hostname           text,
  os                 text,
  provider           text,
  agent_version      text,
  last_seen_at       timestamptz,
  is_online          boolean
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() or is_reseller_only() then
    raise exception 'Not authorized';
  end if;

  return query
  select h.id, h.organization_id, o.name, h.name, h.hostname, h.os, h.provider, h.agent_version, h.last_seen_at,
    (h.last_seen_at is not null and h.last_seen_at > now() - interval '5 minutes')
  from host_agents h
  join organizations o on o.id = h.organization_id
  order by is_online asc, h.last_seen_at desc nulls last;
end;
$$;
grant execute on function admin_list_host_agents() to authenticated;

create or replace function admin_list_ssl_certificates(p_expiring_only boolean default false)
returns table (
  organization_id   uuid,
  organization_name text,
  monitor_id        uuid,
  monitor_name      text,
  issuer            text,
  is_valid          boolean,
  days_remaining    int,
  valid_to          timestamptz
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() or is_reseller_only() then
    raise exception 'Not authorized';
  end if;

  return query
  select s.organization_id, o.name, s.monitor_id, m.name, s.issuer, s.is_valid, s.days_remaining, s.valid_to
  from ssl_info s
  join monitors m on m.id = s.monitor_id
  join organizations o on o.id = s.organization_id
  where not p_expiring_only or (s.is_valid and s.days_remaining is not null and s.days_remaining <= 14)
  order by s.days_remaining asc nulls last;
end;
$$;
grant execute on function admin_list_ssl_certificates(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Host agent cloud-provider tagging
-- ---------------------------------------------------------------------------

alter table host_agents add column if not exists provider text
  check (provider is null or provider in ('aws', 'azure', 'gcp', 'on_prem', 'other'));

-- list_host_agents() gains a return column, which Postgres treats as a
-- different function identity — drop before recreating, same reasoning as
-- create_host_agent below.
drop function if exists list_host_agents();

create function list_host_agents()
returns table (
  id             uuid,
  name           text,
  hostname       text,
  os             text,
  provider       text,
  agent_version  text,
  ingest_key     text,
  last_seen_at   timestamptz,
  is_online      boolean,
  cpu_percent    real,
  mem_percent    real,
  disk_percent   real,
  uptime_seconds bigint,
  load1          real,
  process_count  int,
  created_at     timestamptz
)
language sql security invoker stable
set search_path = public, pg_temp as $$
  select
    h.id, h.name, h.hostname, h.os, h.provider, h.agent_version, h.ingest_key, h.last_seen_at,
    (h.last_seen_at is not null and h.last_seen_at > now() - interval '5 minutes') as is_online,
    m.cpu_percent, m.mem_percent, m.disk_percent, m.uptime_seconds, m.load1, m.process_count,
    h.created_at
  from host_agents h
  left join lateral (
    select * from host_metrics hm
    where hm.host_agent_id = h.id
    order by hm.recorded_at desc
    limit 1
  ) m on true
  order by h.created_at desc;
$$;
grant execute on function list_host_agents() to authenticated;

-- Signature is growing (p_provider appended) — drop the old 2-arg overload
-- explicitly first, same gotcha as admin_set_platform_admin in migration
-- 0030: CREATE OR REPLACE only replaces an identical argument list, adding
-- a parameter creates a second, unprotected overload otherwise.
drop function if exists create_host_agent(text, text);

create function create_host_agent(p_name text, p_hostname text default null, p_provider text default null)
returns host_agents
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_max    int;
  v_current int;
  v_host   host_agents;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Host name is required';
  end if;

  if p_provider is not null and p_provider not in ('aws', 'azure', 'gcp', 'on_prem', 'other') then
    raise exception 'Invalid provider: %', p_provider;
  end if;

  select pl.max_hosts into v_max
  from organizations o join plan_limits pl on pl.plan = o.plan
  where o.id = v_org_id;

  select count(*) into v_current from host_agents where organization_id = v_org_id;

  if v_current >= v_max then
    raise exception 'Plan limit reached: your package allows up to % host(s). Request an upgrade to add more.', v_max;
  end if;

  insert into host_agents (organization_id, name, hostname, provider)
  values (v_org_id, p_name, nullif(trim(coalesce(p_hostname, '')), ''), p_provider)
  returning * into v_host;

  return v_host;
end;
$$;
grant execute on function create_host_agent(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. admin_list_all_users() gains full_name.
-- ---------------------------------------------------------------------------

drop function if exists admin_list_all_users();

create function admin_list_all_users()
returns table (
  user_id             uuid,
  email               text,
  full_name           text,
  organization_name   text,
  role                text,
  is_platform_admin   boolean,
  platform_admin_role text,
  created_at          timestamptz
)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query
    select
      u.id,
      u.email::text,
      u.raw_user_meta_data ->> 'full_name',
      o.name,
      m.role,
      exists (select 1 from platform_admins pa where pa.user_id = u.id),
      (select pa.role from platform_admins pa where pa.user_id = u.id),
      u.created_at
    from auth.users u
    left join memberships m on m.user_id = u.id
    left join organizations o on o.id = m.organization_id
    order by u.created_at desc;
end;
$$;

grant execute on function admin_list_all_users() to authenticated;
