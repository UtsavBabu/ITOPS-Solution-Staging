-- Real organization/customer lifecycle management for the admin panel.
-- Today AdminCustomers/AdminOrganizations can only provision + change plan —
-- there's no rename, archive, restore, delete, or detail view. This adds:
--   1. organizations.status (active/archived) — archive is a reversible
--      soft-delete; the org's data stays intact and can be restored.
--   2. admin_rename_organization / admin_archive_organization /
--      admin_restore_organization / admin_delete_organization RPCs.
--   3. admin_list_customers rewritten to include status.
--   4. admin_get_organization_detail — real data for a "View details" panel:
--      members (email/role/joined), monitor/incident/asset counts, recent
--      incident activity. No fabricated fields.

alter table organizations
  add column if not exists status text not null default 'active' check (status in ('active', 'archived'));

-- admin_list_customers signature is unchanged in name/args but its return
-- columns grow, so it must be dropped and recreated rather than replaced.
drop function if exists admin_list_customers();

create function admin_list_customers()
returns table (
  organization_id uuid,
  name            text,
  plan            text,
  status          text,
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
    o.name::text,
    o.plan::text,
    o.status::text,
    (
      select u.email::text
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

create or replace function admin_rename_organization(p_organization_id uuid, p_name text)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if trim(p_name) = '' then
    raise exception 'Name cannot be empty';
  end if;

  update organizations set name = trim(p_name) where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;
  return v_org;
end;
$$;

create or replace function admin_archive_organization(p_organization_id uuid)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  update organizations set status = 'archived' where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;
  return v_org;
end;
$$;

create or replace function admin_restore_organization(p_organization_id uuid)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  update organizations set status = 'active' where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;
  return v_org;
end;
$$;

-- Hard delete. Every child table (memberships, monitors, assets,
-- alert_channels, host_agents, host_commands, ...) has organization_id
-- references organizations(id) on delete cascade, so this is a full,
-- clean teardown of the org's data. User accounts themselves are not
-- deleted — they simply lose their membership/access.
create or replace function admin_delete_organization(p_organization_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  delete from organizations where id = p_organization_id;

  if not found then
    raise exception 'Organization not found';
  end if;
end;
$$;

create or replace function admin_get_organization_detail(p_organization_id uuid)
returns jsonb
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org organizations;
  v_members jsonb;
  v_recent_incidents jsonb;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_org from organizations where id = p_organization_id;
  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', m.user_id,
    'email', u.email,
    'role', m.role,
    'joinedAt', m.created_at
  ) order by m.created_at asc), '[]'::jsonb)
  into v_members
  from memberships m
  join auth.users u on u.id = m.user_id
  where m.organization_id = p_organization_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'monitorName', mo.name,
    'status', i.status,
    'cause', i.cause,
    'startedAt', i.started_at,
    'resolvedAt', i.resolved_at
  ) order by i.started_at desc), '[]'::jsonb)
  into v_recent_incidents
  from (
    select * from incidents where organization_id = p_organization_id
    order by started_at desc limit 5
  ) i
  join monitors mo on mo.id = i.monitor_id;

  return jsonb_build_object(
    'organizationId', v_org.id,
    'name', v_org.name,
    'plan', v_org.plan,
    'status', v_org.status,
    'createdAt', v_org.created_at,
    'members', v_members,
    'monitorCount', (select count(*)::int from monitors where organization_id = p_organization_id),
    'assetCount', (select count(*)::int from assets where organization_id = p_organization_id),
    'hostCount', (select count(*)::int from host_agents where organization_id = p_organization_id),
    'openIncidentCount', (select count(*)::int from incidents where organization_id = p_organization_id and status = 'OPEN'),
    'recentIncidents', v_recent_incidents
  );
end;
$$;

grant execute on function admin_rename_organization(uuid, text) to authenticated;
grant execute on function admin_archive_organization(uuid) to authenticated;
grant execute on function admin_restore_organization(uuid) to authenticated;
grant execute on function admin_delete_organization(uuid) to authenticated;
grant execute on function admin_get_organization_detail(uuid) to authenticated;
