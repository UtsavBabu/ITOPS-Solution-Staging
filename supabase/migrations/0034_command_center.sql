-- Platform Command Center — a real operational dashboard for Platform
-- Overview, built entirely from data that already exists (monitor status,
-- host agent heartbeats, SSL expiry, product licensing). Nothing here is a
-- placeholder metric: every number maps to a real table this platform
-- already writes to in the normal course of monitoring customers.

-- admin_platform_stats() return shape changes, so drop-then-create rather
-- than create-or-replace (same reasoning as admin_list_all_users in 0030).
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

-- Product adoption — how many active licenses each real product has,
-- platform-wide. Backs a "product adoption" panel instead of vague copy.
create or replace function admin_product_adoption()
returns table (product_key text, product_name text, organization_count int)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select p.key, p.name, count(op.organization_id)::int
  from products p
  left join organization_products op on op.product_key = p.key and op.status = 'active'
  group by p.key, p.name
  order by count(op.organization_id) desc, p.name;
end;
$$;
grant execute on function admin_product_adoption() to authenticated;

-- Security highlights — SSL certificates actually expiring soon, by name,
-- not just a count. Real rows from ssl_info, nothing synthesized.
--
-- Deliberately excludes reseller: named org/monitor detail is exactly the
-- "other customers' individual data" a reseller shouldn't see — they get
-- the aggregate stat tiles (platform-wide, no identifying detail) but not
-- this. Same reasoning applies to the platform-wide audit log used by the
-- Command Center's "recent activity" panel; that one is hidden client-side
-- in AdminOverview.jsx since admin_list_audit_log() predates this feature
-- and reworking its RLS is a separate, larger change.
create or replace function admin_security_highlights(p_limit int default 8)
returns table (
  organization_id   uuid,
  organization_name text,
  monitor_id        uuid,
  monitor_name      text,
  days_remaining    int,
  valid_to          timestamptz
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() or is_reseller_only() then
    raise exception 'Not authorized';
  end if;

  return query
  select o.id, o.name, m.id, m.name, s.days_remaining, s.valid_to
  from ssl_info s
  join monitors m on m.id = s.monitor_id
  join organizations o on o.id = s.organization_id
  where s.is_valid and s.days_remaining is not null and s.days_remaining <= 14
  order by s.days_remaining asc
  limit p_limit;
end;
$$;
grant execute on function admin_security_highlights(int) to authenticated;
