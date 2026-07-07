-- Fixes "Database error saving new user": GoTrue runs this trigger as the
-- restricted supabase_auth_admin role, whose search_path doesn't include
-- `public`, so the unqualified table names in handle_new_user() failed to
-- resolve. Re-defining every SECURITY DEFINER function with an explicit
-- search_path and fully-qualified table names — both the fix and the
-- documented Postgres best practice for SECURITY DEFINER functions (avoids
-- search_path hijacking).

create or replace function public.is_org_member(p_organization_id uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.memberships
    where organization_id = p_organization_id and user_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  insert into public.organizations (name)
  values (coalesce(new.raw_user_meta_data ->> 'organization_name', 'My Organization'))
  returning id into v_org_id;

  insert into public.memberships (user_id, organization_id, role)
  values (new.id, v_org_id, 'ADMIN');

  return new;
end;
$$;

create or replace function public.create_monitor(p_name text, p_url text, p_interval text default 'FIVE_MINUTES')
returns monitors
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id  uuid;
  v_asset   assets;
  v_monitor monitors;
begin
  select organization_id into v_org_id
  from public.memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  insert into public.assets (organization_id, type, name, identifier)
  values (v_org_id, 'WEBSITE', p_name, p_url)
  returning * into v_asset;

  insert into public.monitors (organization_id, asset_id, name, url, interval)
  values (v_org_id, v_asset.id, p_name, p_url, p_interval)
  returning * into v_monitor;

  return v_monitor;
end;
$$;

create or replace function public.delete_monitor(p_monitor_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id   uuid;
  v_asset_id uuid;
begin
  select organization_id, asset_id into v_org_id, v_asset_id
  from public.monitors where id = p_monitor_id;

  if v_org_id is null or not public.is_org_member(v_org_id) then
    raise exception 'Monitor not found or not authorized';
  end if;

  delete from public.monitors where id = p_monitor_id;
  delete from public.assets where id = v_asset_id;
end;
$$;

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
  select
    (select count(*) from public.monitors)::int,
    (select count(*) from public.monitors where last_status = 'UP')::int,
    (select count(*) from public.monitors where last_status in ('DOWN', 'ERROR'))::int,
    (select count(*) from public.incidents where status = 'OPEN')::int,
    (select count(*) from public.assets)::int,
    (select count(*) from public.ssl_info where days_remaining <= 14)::int;
$$;

drop table if exists public.debug_log;
