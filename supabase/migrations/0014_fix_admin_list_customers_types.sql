-- Fix: admin_list_customers declared admin_email as text, but auth.users.email
-- is varchar(255). RETURNS TABLE is strict about column types, so cast the
-- varchar columns to text explicitly.

create or replace function admin_list_customers()
returns table (
  organization_id uuid,
  name            text,
  plan            text,
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
