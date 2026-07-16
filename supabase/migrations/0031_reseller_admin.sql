-- Reseller Admin — a 5th platform-admin role for partners who sell the
-- product to their own book of customers.
--
-- A reseller can:
--   - Provision new customers (create org + admin account), same as support.
--   - View and change the plan for customers THEY provisioned only.
-- A reseller cannot:
--   - See or touch any customer they didn't provision.
--   - Rename/archive/restore/delete organizations (support/super_admin only).
--   - Grant/revoke admin access, edit content, manage leads, or edit the
--     global Plan Limits catalog.
--
-- Only a super_admin can grant the reseller role (same rule as every other
-- role, unchanged from migration 0030 — admin_set_platform_admin already
-- requires is_super_admin() and already accepts an arbitrary p_role).

alter table platform_admins drop constraint if exists platform_admins_role_check;
alter table platform_admins add constraint platform_admins_role_check
  check (role in ('super_admin', 'support', 'billing', 'content_editor', 'reseller'));

-- Which admin provisioned this organization — null for orgs created by
-- self-serve signup (Register.jsx) or by an admin role that isn't scoped
-- to "their own" customers (support/super_admin creating on someone's
-- behalf still stamps this for the audit trail, it just isn't enforced
-- against them since they can see every org regardless).
alter table organizations add column if not exists created_by uuid references auth.users(id) on delete set null;

create or replace function public.is_reseller_only() returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from platform_admins where user_id = auth.uid() and role = 'reseller');
$$;
grant execute on function public.is_reseller_only() to authenticated;

-- ---------------------------------------------------------------------------
-- Reads: a reseller only sees organizations they created. Every other admin
-- role is unaffected (this only ever narrows what a reseller specifically
-- sees — is_platform_admin()'s OR'd base policy still covers everyone else).
-- ---------------------------------------------------------------------------

drop policy if exists organizations_admin_select on organizations;
create policy organizations_admin_select on organizations
  for select using (is_platform_admin() and (not is_reseller_only() or created_by = auth.uid()));

create or replace function admin_list_customers()
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
  where not is_reseller_only() or o.created_by = auth.uid()
  order by o.created_at desc;
end;
$$;
grant execute on function admin_list_customers() to authenticated;

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

  if is_reseller_only() and v_org.created_by is distinct from auth.uid() then
    raise exception 'Not authorized — you can only view customers you provisioned';
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
grant execute on function admin_get_organization_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Plan changes: billing and super_admin keep platform-wide access; a
-- reseller may only change the plan for organizations they provisioned.
-- ---------------------------------------------------------------------------

create or replace function admin_update_organization_plan(p_organization_id uuid, p_plan text)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
  v_old_plan text;
  v_created_by uuid;
begin
  if not has_admin_role(array['billing', 'reseller']) then
    raise exception 'Not authorized — billing access required';
  end if;

  select plan, created_by into v_old_plan, v_created_by from organizations where id = p_organization_id;

  if is_reseller_only() and v_created_by is distinct from auth.uid() then
    raise exception 'Not authorized — you can only manage customers you provisioned';
  end if;

  update organizations set plan = p_plan where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  perform _log_admin_action('update_plan', 'organization', v_org.id::text, v_org.name, jsonb_build_object('from', v_old_plan, 'to', p_plan));
  return v_org;
end;
$$;
grant execute on function admin_update_organization_plan(uuid, text) to authenticated;
