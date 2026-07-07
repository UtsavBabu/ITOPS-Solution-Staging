-- Reseller/partner model: a super-admin "Customers" console for provisioning
-- and managing customer organizations by package, plus package-gated host
-- creation (so "packages" govern every resource a customer can create, not
-- just monitors).

-- ---------------------------------------------------------------------------
-- Packages now also cap hosts (Kada Nigrani agents)
-- ---------------------------------------------------------------------------

alter table plan_limits add column if not exists max_hosts int not null default 1;

update plan_limits set max_hosts = 1      where plan = 'STARTER';
update plan_limits set max_hosts = 10     where plan = 'PROFESSIONAL';
update plan_limits set max_hosts = 50     where plan = 'BUSINESS';
update plan_limits set max_hosts = 100000 where plan = 'ENTERPRISE';

-- Enforce the host cap the same way monitors are enforced.
create or replace function create_host_agent(p_name text, p_hostname text default null)
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

  select pl.max_hosts into v_max
  from organizations o join plan_limits pl on pl.plan = o.plan
  where o.id = v_org_id;

  select count(*) into v_current from host_agents where organization_id = v_org_id;

  if v_current >= v_max then
    raise exception 'Plan limit reached: your package allows up to % host(s). Request an upgrade to add more.', v_max;
  end if;

  insert into host_agents (organization_id, name, hostname)
  values (v_org_id, p_name, nullif(trim(coalesce(p_hostname, '')), ''))
  returning * into v_host;

  return v_host;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customers overview for the reseller console (platform admins only)
-- ---------------------------------------------------------------------------

create or replace function admin_list_customers()
returns table (
  organization_id uuid,
  name            text,
  plan            text,
  admin_email     text,
  member_count    int,
  monitors_used   int,
  max_monitors    int,
  hosts_used      int,
  max_hosts       int,
  created_at      timestamptz
)
language plpgsql security definer stable
set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    o.id,
    o.name,
    o.plan,
    (
      select u.email
      from memberships m2
      join auth.users u on u.id = m2.user_id
      where m2.organization_id = o.id
      order by (m2.role = 'ADMIN') desc, m2.created_at asc
      limit 1
    ) as admin_email,
    (select count(*)::int from memberships m3 where m3.organization_id = o.id),
    (select count(*)::int from monitors mo where mo.organization_id = o.id),
    pl.max_monitors,
    (select count(*)::int from host_agents h where h.organization_id = o.id),
    pl.max_hosts,
    o.created_at
  from organizations o
  join plan_limits pl on pl.plan = o.plan
  order by o.created_at desc;
end;
$$;

grant execute on function admin_list_customers() to authenticated;
