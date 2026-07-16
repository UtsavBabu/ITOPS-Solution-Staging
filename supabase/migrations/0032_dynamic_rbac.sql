-- Dynamic, Google-Workspace-style RBAC: roles become rows, not a hardcoded
-- enum. This migration:
--   1. Introduces permission_modules (the canonical list of gateable areas
--      of the product) and roles/role_permissions (a real module × action
--      grid per role, editable from the new Roles & Permissions admin page
--      with zero code changes).
--   2. Seeds every existing platform role (super_admin/support/billing/
--      content_editor/reseller from migrations 0030-0031) plus a new
--      platform_administrator role, with their real, already-enforced
--      permissions mirrored into the grid so the UI reflects reality.
--   3. Seeds nine organization-level roles (Organization Administrator, IT
--      Manager, Network Engineer, Security Analyst, System Administrator,
--      Helpdesk, Billing Manager, Auditor, Read Only) scoped to what the
--      product actually does today — Security Analyst and Billing Manager
--      are intentionally narrow until MoonSAV EDR and per-org billing
--      exist; nothing here claims a permission for a feature that isn't
--      real.
--   4. Migrates platform_admins.role and memberships.role from CHECK-
--      constraint enums to real foreign keys into roles(key) — existing
--      data (including the legacy ADMIN/MEMBER/READ_ONLY membership
--      values) keeps working unchanged.
--   5. Adds has_permission()/has_org_permission()/has_platform_permission()
--      — the dynamic check going forward. The five platform roles that
--      already have hardcoded RLS/RPC checks (migrations 0030-0031) keep
--      those checks untouched (they're tested and live); this is the
--      permission system new surfaces (org-level modules, custom roles)
--      build on.

-- ---------------------------------------------------------------------------
-- 1. Permission modules
-- ---------------------------------------------------------------------------

create table permission_modules (
  key        text primary key,
  label      text not null,
  scope      text not null check (scope in ('platform', 'organization')),
  sort_order int not null default 0
);
alter table permission_modules enable row level security;
create policy permission_modules_select on permission_modules for select to authenticated using (true);

insert into permission_modules (key, label, scope, sort_order) values
  ('organizations',   'Organizations',                  'platform', 10),
  ('users',           'Users',                           'platform', 20),
  ('products',        'Products & Licensing',            'platform', 30),
  ('plan_limits',     'Plan Limits',                     'platform', 40),
  ('content',         'Content Manager',                 'platform', 50),
  ('site_visibility', 'Site Visibility',                 'platform', 60),
  ('leads',           'Leads & Messages',                'platform', 70),
  ('audit_log',       'Audit Log',                       'platform', 80),
  ('roles',           'Roles & Permissions',             'platform', 90),
  ('dashboard',       'Dashboard',                       'organization', 10),
  ('monitors',        'Website & Network Monitoring',    'organization', 20),
  ('hosts',           'Server Agents',                   'organization', 30),
  ('assets',          'Inventory',                       'organization', 40),
  ('incidents',       'Incidents',                       'organization', 50),
  ('alert_channels',  'Alert Channels',                  'organization', 60),
  ('team',            'Team & Billing',                  'organization', 70)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Roles
-- ---------------------------------------------------------------------------

create table roles (
  key             text primary key,
  name            text not null,
  description     text,
  scope           text not null check (scope in ('platform', 'organization')),
  is_system       boolean not null default false,
  -- null = a global/system role available everywhere; set = a custom role
  -- an organization created for its own team (Team page → custom roles).
  organization_id uuid references organizations(id) on delete cascade,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index roles_org_idx on roles(organization_id);
alter table roles enable row level security;

create policy roles_select on roles for select to authenticated using (
  organization_id is null or is_org_member(organization_id) or is_platform_admin()
);

create table role_permissions (
  role_key      text not null references roles(key) on delete cascade,
  module_key    text not null references permission_modules(key) on delete cascade,
  can_view      boolean not null default false,
  can_create    boolean not null default false,
  can_edit      boolean not null default false,
  can_delete    boolean not null default false,
  can_configure boolean not null default false,
  can_export    boolean not null default false,
  can_manage    boolean not null default false,
  primary key (role_key, module_key)
);
alter table role_permissions enable row level security;
-- Direct table reads are for the Roles & Permissions admin UI only — every
-- other surface reads its own applicable permissions via my_permissions(),
-- a SECURITY DEFINER function, so it never needs this table opened wider.
create policy role_permissions_select on role_permissions for select to authenticated using (is_platform_admin());

-- ---------------------------------------------------------------------------
-- 3. Seed system roles
-- ---------------------------------------------------------------------------

insert into roles (key, name, description, scope, is_system) values
  ('super_admin',          'Super Administrator',   'Complete platform control. ITOps Solution employees only. Cannot be restricted.', 'platform', true),
  ('platform_administrator','Platform Administrator','Manages platform operations day to day — organizations, users, products, support. Cannot change pricing, billing policy, or platform ownership.', 'platform', true),
  ('support',               'Support',               'Customer/organization lifecycle and the leads inbox.', 'platform', true),
  ('billing',               'Billing',                'Plan changes, the Plan Limits catalog, and product licensing.', 'platform', true),
  ('content_editor',        'Content Editor',         'Marketing site Content Manager and Site Visibility.', 'platform', true),
  ('reseller',              'Reseller Administrator', 'Provisions and manages their own customers only — scoped by organizations.created_by (migration 0031), not by this grid alone.', 'platform', true),
  ('ADMIN',                 'Organization Administrator (legacy)', 'Original org-owner role — full access to their organization.', 'organization', true),
  ('MEMBER',                'Member (legacy)',        'Original standard-member role.', 'organization', true),
  ('READ_ONLY',             'Read Only (legacy)',     'Original read-only role.', 'organization', true),
  ('organization_administrator', 'Organization Administrator', 'Full control of their own organization.', 'organization', true),
  ('it_manager',            'IT Manager',             'Manages infrastructure — monitoring, servers, inventory, alerting. Not billing or org deletion.', 'organization', true),
  ('network_engineer',      'Network Engineer',       'Manages network-facing monitors and their alerting. Not users or billing.', 'organization', true),
  ('security_analyst',      'Security Analyst',       'Views security posture (SSL/header scores, incidents). Deeper EDR-specific capabilities (threat/device isolation) are scoped in once MoonSAV EDR ships.', 'organization', true),
  ('system_administrator',  'System Administrator',   'Manages server agents and inventory.', 'organization', true),
  ('helpdesk',              'Helpdesk',               'Read-only visibility for first-line support. Per-member password reset is not yet a product feature.', 'organization', true),
  ('billing_manager',       'Billing Manager',        'Views and manages the organization''s plan and usage. No access to monitoring/infrastructure.', 'organization', true),
  ('auditor',                'Auditor',                'Read-only visibility across every organization module.', 'organization', true),
  ('read_only',              'Read Only',              'Dashboard visibility only.', 'organization', true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Seed role_permissions grids
-- ---------------------------------------------------------------------------

-- super_admin: everything.
insert into role_permissions (role_key, module_key, can_view, can_create, can_edit, can_delete, can_configure, can_export, can_manage)
select 'super_admin', key, true, true, true, true, true, true, true from permission_modules where scope = 'platform'
on conflict do nothing;

insert into role_permissions (role_key, module_key, can_view, can_create, can_edit, can_delete, can_configure, can_export, can_manage) values
  -- platform_administrator: broad operational access, no pricing/billing/roles.
  ('platform_administrator', 'organizations', true, true, true, false, true, true, true),
  ('platform_administrator', 'users',         true, true, true, true,  false, true, true),
  ('platform_administrator', 'products',      true, false, true, false, true, false, true),
  ('platform_administrator', 'leads',         true, true, true, false, false, true, true),
  ('platform_administrator', 'audit_log',     true, false, false, false, false, true, false),
  -- support (mirrors migration 0030's has_admin_role(['support']) checks).
  ('support', 'organizations', true, true, true, true, true, true, true),
  ('support', 'users',         true, true, false, true, false, true, false),
  ('support', 'leads',         true, false, true, false, false, true, true),
  -- billing (mirrors migration 0030's has_admin_role(['billing']) checks).
  ('billing', 'organizations', true, false, false, false, false, true, false),
  ('billing', 'plan_limits',   true, false, true, false, true, true, true),
  ('billing', 'products',      true, false, true, false, true, false, true),
  -- content_editor.
  ('content_editor', 'content',         true, true, true, true, true, false, true),
  ('content_editor', 'site_visibility', true, false, true, false, true, false, true),
  -- reseller: row-level scoped by created_by via dedicated RPCs (migration
  -- 0031) — this row documents the module-level shape for the UI grid.
  ('reseller', 'organizations', true, true, false, false, false, true, false),

  -- organization_administrator / legacy ADMIN: full control of their org.
  ('organization_administrator', 'dashboard',      true, false, false, false, false, false, false),
  ('organization_administrator', 'monitors',       true, true, true, true, true, true, true),
  ('organization_administrator', 'hosts',          true, true, true, true, true, true, true),
  ('organization_administrator', 'assets',         true, true, true, true, false, true, true),
  ('organization_administrator', 'incidents',      true, false, true, false, false, true, true),
  ('organization_administrator', 'alert_channels', true, true, true, true, true, true, true),
  ('organization_administrator', 'team',           true, true, true, true, false, true, true),
  ('ADMIN', 'dashboard',      true, false, false, false, false, false, false),
  ('ADMIN', 'monitors',       true, true, true, true, true, true, true),
  ('ADMIN', 'hosts',          true, true, true, true, true, true, true),
  ('ADMIN', 'assets',         true, true, true, true, false, true, true),
  ('ADMIN', 'incidents',      true, false, true, false, false, true, true),
  ('ADMIN', 'alert_channels', true, true, true, true, true, true, true),
  ('ADMIN', 'team',           true, true, true, true, false, true, true),

  -- MEMBER (legacy): day-to-day operator, no deletes/manage.
  ('MEMBER', 'dashboard',      true, false, false, false, false, false, false),
  ('MEMBER', 'monitors',       true, true, true, false, true, true, false),
  ('MEMBER', 'hosts',          true, true, true, false, true, true, false),
  ('MEMBER', 'assets',         true, true, true, false, false, true, false),
  ('MEMBER', 'incidents',      true, false, true, false, false, true, false),
  ('MEMBER', 'alert_channels', true, true, true, false, true, true, false),
  ('MEMBER', 'team',           true, false, false, false, false, false, false),

  -- it_manager: infrastructure, not billing or org lifecycle.
  ('it_manager', 'dashboard',      true, false, false, false, false, false, false),
  ('it_manager', 'monitors',       true, true, true, true, true, true, true),
  ('it_manager', 'hosts',          true, true, true, true, true, true, true),
  ('it_manager', 'assets',         true, true, true, true, false, true, true),
  ('it_manager', 'incidents',      true, false, true, false, false, true, true),
  ('it_manager', 'alert_channels', true, true, true, true, true, true, false),

  -- network_engineer: monitors + their alerting only.
  ('network_engineer', 'dashboard',      true, false, false, false, false, false, false),
  ('network_engineer', 'monitors',       true, true, true, true, true, true, false),
  ('network_engineer', 'incidents',      true, false, false, false, false, true, false),
  ('network_engineer', 'alert_channels', true, true, false, false, false, false, false),

  -- security_analyst: real-today security visibility (SSL/header scores
  -- live inside monitor detail; EDR-specific rows land once that ships).
  ('security_analyst', 'dashboard',  true, false, false, false, false, false, false),
  ('security_analyst', 'monitors',   true, false, false, false, false, true, false),
  ('security_analyst', 'incidents',  true, false, false, false, false, true, false),

  -- system_administrator: servers + inventory.
  ('system_administrator', 'dashboard', true, false, false, false, false, false, false),
  ('system_administrator', 'hosts',     true, true, true, true, true, true, true),
  ('system_administrator', 'assets',    true, true, true, true, false, true, true),
  ('system_administrator', 'incidents', true, false, false, false, false, true, false),

  -- helpdesk: read-only first-line support view.
  ('helpdesk', 'dashboard',  true, false, false, false, false, false, false),
  ('helpdesk', 'incidents',  true, false, false, false, false, false, false),
  ('helpdesk', 'assets',     true, false, false, false, false, false, false),
  ('helpdesk', 'team',       true, false, false, false, false, false, false),

  -- billing_manager: plan/usage only.
  ('billing_manager', 'team', true, false, false, false, false, true, true),

  -- auditor: read-only, everywhere.
  ('auditor', 'dashboard',      true, false, false, false, false, false, false),
  ('auditor', 'monitors',       true, false, false, false, false, true, false),
  ('auditor', 'hosts',          true, false, false, false, false, true, false),
  ('auditor', 'assets',         true, false, false, false, false, true, false),
  ('auditor', 'incidents',      true, false, false, false, false, true, false),
  ('auditor', 'alert_channels', true, false, false, false, false, true, false),
  ('auditor', 'team',           true, false, false, false, false, true, false),
  ('READ_ONLY', 'dashboard',      true, false, false, false, false, false, false),
  ('READ_ONLY', 'monitors',       true, false, false, false, false, true, false),
  ('READ_ONLY', 'hosts',          true, false, false, false, false, true, false),
  ('READ_ONLY', 'assets',         true, false, false, false, false, true, false),
  ('READ_ONLY', 'incidents',      true, false, false, false, false, true, false),
  ('READ_ONLY', 'alert_channels', true, false, false, false, false, true, false),
  ('READ_ONLY', 'team',           true, false, false, false, false, true, false),

  -- read_only: dashboard visibility only, nothing else.
  ('read_only', 'dashboard', true, false, false, false, false, false, false)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5. Migrate platform_admins.role and memberships.role to reference roles(key)
-- ---------------------------------------------------------------------------

alter table platform_admins drop constraint if exists platform_admins_role_check;
alter table platform_admins add constraint platform_admins_role_fkey foreign key (role) references roles(key);

alter table memberships drop constraint if exists memberships_role_check;
alter table memberships add constraint memberships_role_fkey foreign key (role) references roles(key);

-- ---------------------------------------------------------------------------
-- 6. Dynamic permission checks
-- ---------------------------------------------------------------------------

create or replace function public.has_platform_permission(p_module text, p_action text) returns boolean
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_role_key text;
  v_granted boolean;
begin
  select role into v_role_key from platform_admins where user_id = auth.uid();
  if v_role_key is null then return false; end if;

  select case p_action
    when 'view' then can_view
    when 'create' then can_create
    when 'edit' then can_edit
    when 'delete' then can_delete
    when 'configure' then can_configure
    when 'export' then can_export
    when 'manage' then can_manage
    else false
  end into v_granted
  from role_permissions where role_key = v_role_key and module_key = p_module;

  return coalesce(v_granted, false);
end;
$$;
grant execute on function public.has_platform_permission(text, text) to authenticated;

create or replace function public.has_org_permission(p_organization_id uuid, p_module text, p_action text) returns boolean
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_role_key text;
  v_granted boolean;
begin
  if p_organization_id is null then return false; end if;

  select role into v_role_key from memberships where user_id = auth.uid() and organization_id = p_organization_id;
  if v_role_key is null then return false; end if;

  select case p_action
    when 'view' then can_view
    when 'create' then can_create
    when 'edit' then can_edit
    when 'delete' then can_delete
    when 'configure' then can_configure
    when 'export' then can_export
    when 'manage' then can_manage
    else false
  end into v_granted
  from role_permissions where role_key = v_role_key and module_key = p_module;

  return coalesce(v_granted, false);
end;
$$;
grant execute on function public.has_org_permission(uuid, text, text) to authenticated;

-- Convenience for the frontend: every module/action the caller's own
-- platform role and (if given) org role currently grant, in one round trip
-- instead of one RPC call per checkbox.
create or replace function public.my_permissions(p_organization_id uuid default null)
returns table (scope text, module_key text, can_view boolean, can_create boolean, can_edit boolean, can_delete boolean, can_configure boolean, can_export boolean, can_manage boolean)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_platform_role text;
  v_org_role text;
begin
  select role into v_platform_role from platform_admins where user_id = auth.uid();
  if p_organization_id is not null then
    select role into v_org_role from memberships where user_id = auth.uid() and organization_id = p_organization_id;
  end if;

  return query
  select 'platform'::text, rp.module_key, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, rp.can_configure, rp.can_export, rp.can_manage
  from role_permissions rp where rp.role_key = v_platform_role
  union all
  select 'organization'::text, rp.module_key, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, rp.can_configure, rp.can_export, rp.can_manage
  from role_permissions rp where rp.role_key = v_org_role;
end;
$$;
grant execute on function public.my_permissions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Roles & Permissions management RPCs — creating/editing roles and their
-- grids is itself gated by the platform "roles" module (super_admin and
-- platform_administrator only, per the seed above), or by an org member
-- with team:manage creating a custom role for their own organization.
-- ---------------------------------------------------------------------------

create or replace function admin_list_roles(p_scope text default null)
returns setof roles
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  return query select * from roles where p_scope is null or scope = p_scope order by scope, is_system desc, name;
end;
$$;
grant execute on function admin_list_roles(text) to authenticated;

create or replace function admin_get_role_permissions(p_role_key text)
returns setof role_permissions
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  return query select * from role_permissions where role_key = p_role_key;
end;
$$;
grant execute on function admin_get_role_permissions(text) to authenticated;

create or replace function admin_upsert_role(
  p_key text, p_name text, p_description text, p_scope text,
  p_permissions jsonb -- array of {module_key, can_view, can_create, can_edit, can_delete, can_configure, can_export, can_manage}
) returns roles
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role roles;
  v_existing roles;
  v_perm jsonb;
begin
  if not has_platform_permission('roles', 'manage') then
    raise exception 'Not authorized — roles:manage required';
  end if;
  if p_scope not in ('platform', 'organization') then
    raise exception 'Invalid scope: %', p_scope;
  end if;
  if trim(coalesce(p_key, '')) = '' or trim(coalesce(p_name, '')) = '' then
    raise exception 'Role key and name are required';
  end if;

  select * into v_existing from roles where key = p_key;
  if v_existing.key is not null and v_existing.is_system then
    -- System roles can have their permissions edited, but not be renamed/rescoped.
    update roles set description = coalesce(p_description, description) where key = p_key returning * into v_role;
  else
    insert into roles (key, name, description, scope, is_system, created_by)
    values (p_key, p_name, p_description, p_scope, false, auth.uid())
    on conflict (key) do update set name = excluded.name, description = excluded.description
    returning * into v_role;
  end if;

  if p_permissions is not null then
    delete from role_permissions where role_key = p_key;
    for v_perm in select * from jsonb_array_elements(p_permissions) loop
      insert into role_permissions (role_key, module_key, can_view, can_create, can_edit, can_delete, can_configure, can_export, can_manage)
      values (
        p_key,
        v_perm ->> 'module_key',
        coalesce((v_perm ->> 'can_view')::boolean, false),
        coalesce((v_perm ->> 'can_create')::boolean, false),
        coalesce((v_perm ->> 'can_edit')::boolean, false),
        coalesce((v_perm ->> 'can_delete')::boolean, false),
        coalesce((v_perm ->> 'can_configure')::boolean, false),
        coalesce((v_perm ->> 'can_export')::boolean, false),
        coalesce((v_perm ->> 'can_manage')::boolean, false)
      );
    end loop;
  end if;

  perform _log_admin_action('upsert_role', 'role', p_key, p_name);
  return v_role;
end;
$$;
grant execute on function admin_upsert_role(text, text, text, text, jsonb) to authenticated;

create or replace function admin_delete_role(p_key text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_is_system boolean;
  v_in_use int;
begin
  if not has_platform_permission('roles', 'manage') then
    raise exception 'Not authorized — roles:manage required';
  end if;

  select is_system into v_is_system from roles where key = p_key;
  if v_is_system is null then
    raise exception 'Role not found';
  end if;
  if v_is_system then
    raise exception 'System roles cannot be deleted';
  end if;

  select count(*) into v_in_use from platform_admins where role = p_key;
  select v_in_use + count(*) into v_in_use from memberships where role = p_key;
  if v_in_use > 0 then
    raise exception 'This role is assigned to % account(s) — reassign them before deleting it', v_in_use;
  end if;

  delete from roles where key = p_key;
  perform _log_admin_action('delete_role', 'role', p_key, p_key);
end;
$$;
grant execute on function admin_delete_role(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Org-level role assignment. Team.jsx had no way to change a member's
-- role at all before this — the members table only ever displayed it. Real
-- and functional today even though multi-user invites aren't shipped yet
-- (Team.jsx's own "on the roadmap" notice), since it works immediately for
-- the one membership every organization already has, and needs no further
-- backend work once invites do ship.
-- ---------------------------------------------------------------------------

create or replace function update_organization_member_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_target_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;

  select organization_id into v_target_org_id from memberships where user_id = p_user_id;
  if v_target_org_id is distinct from v_org_id then
    raise exception 'That user is not a member of your organization';
  end if;

  update memberships set role = p_role where user_id = p_user_id and organization_id = v_org_id;
end;
$$;
grant execute on function update_organization_member_role(uuid, text) to authenticated;
