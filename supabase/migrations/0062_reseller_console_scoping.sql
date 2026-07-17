-- Reseller Console framing, part 1: two real data-scoping gaps found while
-- checking what a reseller actually sees today, not just what the nav shows.
--
-- 1. admin_platform_stats() and admin_product_adoption() were never scoped
--    to is_reseller_only() the way admin_list_customers() and
--    admin_get_organization_detail() already are (migration 0031) — a
--    reseller's Platform Overview showed PLATFORM-WIDE totals (every
--    organization, every user, every monitor across every reseller and
--    house account), not just their own book. Fixed the same way: narrow
--    every count to organizations they created when is_reseller_only().
-- 2. admin_list_audit_log() had no reseller check at all — the global
--    admin action feed (every admin's every action, across every
--    organization) was readable by any reseller. Denied outright; a
--    reseller's own actions already appear in their own customer list,
--    and a cross-tenant activity feed isn't theirs to see.

drop function if exists admin_platform_stats();

create function admin_platform_stats()
returns table (
  total_organizations       int,
  total_licensed_organizations int,
  total_users                int,
  total_monitors             int,
  total_monitors_up          int,
  total_monitors_down        int,
  total_open_incidents       int,
  total_host_agents          int,
  total_host_agents_online   int,
  total_ssl_expiring_soon    int,
  total_waitlist_signups     int,
  new_contact_messages       int
)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  if is_reseller_only() then
    return query select
      (select count(*) from organizations where created_by = auth.uid())::int,
      (select count(distinct op.organization_id) from organization_products op
        join organizations o on o.id = op.organization_id
        where op.status = 'active' and o.created_by = auth.uid())::int,
      (select count(*) from memberships m join organizations o on o.id = m.organization_id where o.created_by = auth.uid())::int,
      (select count(*) from monitors mo join organizations o on o.id = mo.organization_id where o.created_by = auth.uid())::int,
      (select count(*) from monitors mo join organizations o on o.id = mo.organization_id where o.created_by = auth.uid() and mo.last_status = 'UP')::int,
      (select count(*) from monitors mo join organizations o on o.id = mo.organization_id where o.created_by = auth.uid() and mo.last_status in ('DOWN', 'ERROR'))::int,
      (select count(*) from incidents i join organizations o on o.id = i.organization_id where o.created_by = auth.uid() and i.status = 'OPEN')::int,
      (select count(*) from host_agents h join organizations o on o.id = h.organization_id where o.created_by = auth.uid())::int,
      (select count(*) from host_agents h join organizations o on o.id = h.organization_id where o.created_by = auth.uid() and h.last_seen_at > now() - interval '5 minutes')::int,
      (select count(*) from ssl_info si join monitors mo on mo.id = si.monitor_id join organizations o on o.id = mo.organization_id
        where o.created_by = auth.uid() and si.is_valid and si.days_remaining is not null and si.days_remaining <= 14)::int,
      0, 0; -- waitlist signups / contact messages are platform marketing data, not a reseller's book
    return;
  end if;

  return query select
    (select count(*) from organizations)::int,
    (select count(distinct organization_id) from organization_products where status = 'active')::int,
    (select count(*) from auth.users)::int,
    (select count(*) from monitors)::int,
    (select count(*) from monitors where last_status = 'UP')::int,
    (select count(*) from monitors where last_status in ('DOWN', 'ERROR'))::int,
    (select count(*) from incidents where status = 'OPEN')::int,
    (select count(*) from host_agents)::int,
    (select count(*) from host_agents where last_seen_at > now() - interval '5 minutes')::int,
    (select count(*) from ssl_info where is_valid and days_remaining is not null and days_remaining <= 14)::int,
    (select count(*) from waitlist_signups)::int,
    (select count(*) from contact_messages where status = 'new')::int;
end;
$$;
grant execute on function admin_platform_stats() to authenticated;

create or replace function admin_product_adoption()
returns table (product_key text, product_name text, organization_count int)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  if is_reseller_only() then
    return query
    select p.key, p.name, count(op.organization_id)::int
    from products p
    left join organization_products op on op.product_key = p.key and op.status = 'active'
    left join organizations o on o.id = op.organization_id and o.created_by = auth.uid()
    group by p.key, p.name
    order by count(o.id) desc, p.name;
    return;
  end if;

  return query
  select p.key, p.name, count(op.organization_id)::int
  from products p
  left join organization_products op on op.product_key = p.key and op.status = 'active'
  group by p.key, p.name
  order by count(op.organization_id) desc, p.name;
end;
$$;

create or replace function admin_list_audit_log(p_limit int default 50, p_offset int default 0, p_search text default null)
returns table (
  id            uuid,
  actor_email   text,
  action        text,
  target_type   text,
  target_id     text,
  target_label  text,
  metadata      jsonb,
  created_at    timestamptz,
  total_count   bigint
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() or is_reseller_only() then
    raise exception 'Not authorized';
  end if;

  return query
  select a.id, a.actor_email, a.action, a.target_type, a.target_id, a.target_label, a.metadata, a.created_at,
    count(*) over () as total_count
  from audit_log a
  where p_search is null or p_search = '' or
    a.actor_email ilike '%' || p_search || '%' or
    a.action ilike '%' || p_search || '%' or
    a.target_label ilike '%' || p_search || '%'
  order by a.created_at desc
  limit p_limit offset p_offset;
end;
$$;
