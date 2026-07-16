-- Real bug behind "why are there so many confusing roles": handle_new_user()
-- and ensure_user_organization() have hardcoded the legacy `ADMIN` role key
-- for every single org creator since migration 0001 — including brand-new
-- signups today, years after migration 0032 introduced the clean, current
-- `organization_administrator` role. Every new customer has been getting
-- labeled "Organization Administrator (legacy)" from day one, for no reason
-- — the two roles have byte-for-byte identical permission grids (verified
-- against migration 0032's seed data), so this was never a real behavior
-- difference, just a name nobody updated.
--
-- Fixed at the source (new signups get the current role going forward) and
-- backfilled for the 3 existing memberships that already hold `ADMIN` —
-- safe because the grids are identical and the only other place that reads
-- the literal role value (admin_list_customers()'s "pick the admin's email"
-- ordering) is fixed in the same migration to recognize both keys.

update memberships set role = 'organization_administrator' where role = 'ADMIN';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_invite public.org_invites;
begin
  if new.raw_user_meta_data ? 'invite_token' then
    select * into v_invite from public.org_invites
      where token = new.raw_user_meta_data ->> 'invite_token'
        and accepted_at is null
        and revoked_at is null
        and expires_at > now()
        and lower(email) = lower(new.email)
      limit 1;
  end if;

  if v_invite.id is not null then
    insert into public.memberships (user_id, organization_id, role)
    values (new.id, v_invite.organization_id, v_invite.role);

    update public.org_invites
      set accepted_at = now(), accepted_by = new.id
      where id = v_invite.id;

    return new;
  end if;

  insert into public.organizations (name)
  values (coalesce(new.raw_user_meta_data ->> 'organization_name', 'My Organization'))
  returning id into v_org_id;

  insert into public.memberships (user_id, organization_id, role)
  values (new.id, v_org_id, 'organization_administrator');

  return new;
end;
$$;

create or replace function public.ensure_user_organization()
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id   uuid;
  v_org_name text;
  v_user_meta jsonb;
begin
  select organization_id into v_org_id
  from public.memberships
  where user_id = auth.uid()
  limit 1;

  if v_org_id is not null then
    select name into v_org_name from public.organizations where id = v_org_id;
    return jsonb_build_object('organization_id', v_org_id, 'organization_name', v_org_name, 'created', false);
  end if;

  select raw_user_meta_data into v_user_meta
  from auth.users where id = auth.uid();

  v_org_name := coalesce(
    v_user_meta ->> 'organization_name',
    v_user_meta ->> 'full_name',
    'My Organization'
  );

  insert into public.organizations (name)
  values (v_org_name)
  returning id into v_org_id;

  insert into public.memberships (user_id, organization_id, role)
  values (auth.uid(), v_org_id, 'organization_administrator');

  return jsonb_build_object('organization_id', v_org_id, 'organization_name', v_org_name, 'created', true);
end;
$$;

grant execute on function public.ensure_user_organization() to authenticated;

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
      order by (m2.role in ('ADMIN', 'organization_administrator')) desc, m2.created_at asc
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
