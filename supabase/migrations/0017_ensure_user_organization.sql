-- Self-healing RPC: if the handle_new_user trigger failed at signup (e.g.
-- the user was created before migration 0003 fixed the search_path, or the
-- trigger errored silently), this function creates the missing organization
-- and membership row on first authenticated call.
-- Safe to call repeatedly — does nothing if the membership already exists.

create or replace function public.ensure_user_organization()
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id   uuid;
  v_org_name text;
  v_user_meta jsonb;
begin
  -- Already has a membership — nothing to do.
  select organization_id into v_org_id
  from public.memberships
  where user_id = auth.uid()
  limit 1;

  if v_org_id is not null then
    select name into v_org_name from public.organizations where id = v_org_id;
    return jsonb_build_object('organization_id', v_org_id, 'organization_name', v_org_name, 'created', false);
  end if;

  -- Pull display name from user metadata (set at signup via options.data).
  select raw_user_meta_data into v_user_meta
  from auth.users where id = auth.uid();

  v_org_name := coalesce(
    v_user_meta ->> 'organization_name',
    v_user_meta ->> 'full_name',
    'My Organization'
  );

  -- Create org + membership atomically.
  insert into public.organizations (name)
  values (v_org_name)
  returning id into v_org_id;

  insert into public.memberships (user_id, organization_id, role)
  values (auth.uid(), v_org_id, 'ADMIN');

  return jsonb_build_object('organization_id', v_org_id, 'organization_name', v_org_name, 'created', true);
end;
$$;

grant execute on function public.ensure_user_organization() to authenticated;
