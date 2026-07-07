-- A real platform-superadmin role, separate from per-organization ADMIN.
-- Membership in platform_admins grants read access across every organization
-- (via additional, additive RLS policies — existing tenant-scoped policies
-- are untouched) plus a small set of admin-only actions.

create table platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

create policy platform_admins_select_self on platform_admins
  for select using (user_id = auth.uid());

create or replace function is_platform_admin() returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create policy platform_admins_select_all on platform_admins
  for select using (is_platform_admin());

-- ---------------------------------------------------------------------------
-- Additive "platform admin sees everything" policies. Postgres OR's multiple
-- permissive policies together, so these only ever grant additional access —
-- they cannot narrow what a regular tenant-scoped user already sees.
-- ---------------------------------------------------------------------------

create policy organizations_admin_select on organizations
  for select using (is_platform_admin());

create policy memberships_admin_select on memberships
  for select using (is_platform_admin());

create policy monitors_admin_select on monitors
  for select using (is_platform_admin());

create policy incidents_admin_select on incidents
  for select using (is_platform_admin());

create policy waitlist_signups_admin_select on waitlist_signups
  for select using (is_platform_admin());

create policy contact_messages_admin_select on contact_messages
  for select using (is_platform_admin());

-- Support triage state for inbound messages.
alter table contact_messages
  add column status text not null default 'new' check (status in ('new', 'read', 'resolved'));

create policy contact_messages_admin_update on contact_messages
  for update using (is_platform_admin()) with check (is_platform_admin());

-- Platform admins can change an org's plan directly — this is how an
-- "upgrade request" from the pricing page actually gets fulfilled today,
-- since there's no self-serve billing yet.
create or replace function admin_update_organization_plan(p_organization_id uuid, p_plan text)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  update organizations set plan = p_plan where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  return v_org;
end;
$$;

create or replace function admin_platform_stats()
returns table (
  total_organizations int,
  total_users int,
  total_monitors int,
  total_open_incidents int,
  total_waitlist_signups int,
  new_contact_messages int
)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query select
    (select count(*) from organizations)::int,
    (select count(*) from auth.users)::int,
    (select count(*) from monitors)::int,
    (select count(*) from incidents where status = 'OPEN')::int,
    (select count(*) from waitlist_signups)::int,
    (select count(*) from contact_messages where status = 'new')::int;
end;
$$;

grant execute on function is_platform_admin() to authenticated;
grant execute on function admin_update_organization_plan(uuid, text) to authenticated;
grant execute on function admin_platform_stats() to authenticated;
