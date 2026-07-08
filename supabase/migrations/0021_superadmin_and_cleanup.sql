-- =============================================================================
-- 0021: Superadmin setup, clean slate, plan enforcement, ensure_user_org fix
-- =============================================================================

-- 1. Wipe all test data (monitors, users, orgs) — clean slate
-- =============================================================================
delete from public.check_results;
delete from public.security_snapshots;
delete from public.ssl_info;
delete from public.incidents;
delete from public.monitors;
delete from public.host_metrics;
delete from public.host_agents;
delete from public.alert_channels;
delete from public.assets;
delete from public.memberships;
delete from public.organizations;
delete from public.waitlist_signups;
delete from public.contact_messages;
-- Remove all auth users (cascade deletes memberships via FK)
delete from auth.users;

-- 2. ensure_user_organization — idempotent self-heal RPC
-- =============================================================================
create or replace function public.ensure_user_organization()
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id    uuid;
  v_org_name  text;
  v_user_meta jsonb;
begin
  select organization_id into v_org_id
  from public.memberships where user_id = auth.uid() limit 1;

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

  insert into public.organizations (name) values (v_org_name) returning id into v_org_id;
  insert into public.memberships (user_id, organization_id, role)
  values (auth.uid(), v_org_id, 'ADMIN');

  return jsonb_build_object('organization_id', v_org_id, 'organization_name', v_org_name, 'created', true);
end;
$$;

grant execute on function public.ensure_user_organization() to authenticated;

-- 3. waitlist_signups: add 'newsletter' product if not already allowed
-- =============================================================================
alter table public.waitlist_signups
  drop constraint if exists waitlist_signups_product_check;
alter table public.waitlist_signups
  add constraint waitlist_signups_product_check
  check (product in ('cybersachet','infrastructure-monitor','devops-monitor','upgrade-request','newsletter'));

-- 4. contact_messages: add status column if missing
-- =============================================================================
alter table public.contact_messages
  add column if not exists status text not null default 'new'
  check (status in ('new','read','resolved'));

-- 5. Realtime for check_results (idempotent — ignore if already added)
-- =============================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.check_results;
  exception when others then null;
  end;
end;
$$;
