-- Real MFA status visibility for admins — list_organization_members() and
-- admin_list_all_users() gain has_mfa, read from auth.mfa_factors (the same
-- real Supabase Auth TOTP enrollment Profile.jsx now lets a person set up
-- for themselves). An admin can see who has/hasn't enrolled a factor; they
-- cannot flip it on for someone else — TOTP enrollment is inherently a
-- self-service action (it requires scanning a QR code on the person's own
-- device), so there is deliberately no "Enable MFA" admin action here, only
-- visibility. An admin CAN remove someone's factor via the Supabase Admin
-- API if a device is lost, which is a real follow-up, not built here.

drop function if exists list_organization_members();
create or replace function list_organization_members()
returns table (
  user_id         uuid,
  email           text,
  role            text,
  joined_at       timestamptz,
  department_id   uuid,
  department_name text,
  team_id         uuid,
  team_name       text,
  has_mfa         boolean
)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select m.organization_id into v_org_id from memberships m where m.user_id = auth.uid() limit 1;
  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  return query
    select m.user_id, u.email::text, m.role, m.created_at, m.department_id, d.name, m.team_id, t.name,
      exists (select 1 from auth.mfa_factors f where f.user_id = m.user_id and f.status = 'verified')
    from memberships m
    join auth.users u on u.id = m.user_id
    left join departments d on d.id = m.department_id
    left join teams t on t.id = m.team_id
    where m.organization_id = v_org_id
    order by m.created_at asc;
end;
$$;
grant execute on function list_organization_members() to authenticated;

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
  created_at          timestamptz,
  has_mfa             boolean
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
      u.created_at,
      exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified')
    from auth.users u
    left join memberships m on m.user_id = u.id
    left join organizations o on o.id = m.organization_id
    order by u.created_at desc;
end;
$$;

grant execute on function admin_list_all_users() to authenticated;
