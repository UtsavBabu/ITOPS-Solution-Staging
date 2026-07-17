-- Resellers page was an application-review inbox only — once an application
-- is approved (or a reseller is added directly), they vanish into the "All
-- Users" list with everyone else. There was no real "here are your active
-- reseller partners and how many customers each has provisioned" view,
-- which is the actual "how are reseller accounts managed" question. Add it.

create or replace function admin_list_resellers()
returns table (
  user_id        uuid,
  email          text,
  full_name      text,
  granted_at     timestamptz,
  customer_count int
)
language plpgsql security definer stable
set search_path = public, pg_temp as $$
begin
  if not has_admin_role(array['super_admin', 'support', 'platform_administrator']) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    pa.user_id,
    u.email::text,
    coalesce(u.raw_user_meta_data->>'full_name', '')::text,
    pa.created_at,
    (select count(*)::int from organizations o where o.created_by = pa.user_id)
  from platform_admins pa
  join auth.users u on u.id = pa.user_id
  where pa.role = 'reseller'
  order by pa.created_at desc;
end;
$$;
grant execute on function admin_list_resellers() to authenticated;
