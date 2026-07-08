-- Two fixes for the customer panel:
-- 1. check_results joins the realtime publication so the Recent Checks table
--    updates live as the scheduler writes results.
-- 2. get_dashboard_summary scopes to the caller's own organization. It was
--    security-invoker counting through RLS, which inflated every number with
--    foreign orgs' data for platform admins.

alter publication supabase_realtime add table check_results;

create or replace function get_dashboard_summary()
returns table (
  total_monitors int,
  up_monitors int,
  down_monitors int,
  open_incidents int,
  total_assets int,
  expiring_ssl int
)
language plpgsql security definer stable
set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  return query select
    (select count(*) from monitors m where m.organization_id = v_org_id)::int,
    (select count(*) from monitors m where m.organization_id = v_org_id and m.last_status = 'UP')::int,
    (select count(*) from monitors m where m.organization_id = v_org_id and m.last_status in ('DOWN', 'ERROR'))::int,
    (select count(*) from incidents i where i.organization_id = v_org_id and i.status = 'OPEN')::int,
    (select count(*) from assets a where a.organization_id = v_org_id)::int,
    (select count(*) from ssl_info s where s.organization_id = v_org_id and s.days_remaining <= 14)::int;
end;
$$;

grant execute on function get_dashboard_summary() to authenticated;
