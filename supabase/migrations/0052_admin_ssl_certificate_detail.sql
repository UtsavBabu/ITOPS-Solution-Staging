-- The admin SSL Certificates page only ever showed a bare "Invalid" badge
-- with no explanation — not because the data doesn't exist (ssl_info has
-- carried subject/protocol/valid_from/error_message/checked_at since
-- migration 0001), but because admin_list_ssl_certificates() never
-- selected them. Real fix: return what's actually captured. This does NOT
-- add algorithm/key-length/SAN/fingerprint/OCSP/HSTS/weak-cipher-detection —
-- the current SSL check (runSslCheck() in supabase/functions/_shared/
-- checks.ts) gets its data from a third-party API (whoisjson.com), whose
-- exact response schema is already flagged there as unverified; inventing
-- fields it may not actually provide would be exactly the kind of
-- decoration this codebase has avoided everywhere else.

drop function if exists admin_list_ssl_certificates(boolean);
create or replace function admin_list_ssl_certificates(p_expiring_only boolean default false)
returns table (
  organization_id   uuid,
  organization_name text,
  monitor_id        uuid,
  monitor_name      text,
  issuer            text,
  subject           text,
  protocol          text,
  is_valid          boolean,
  error_message     text,
  days_remaining    int,
  valid_from        timestamptz,
  valid_to          timestamptz,
  checked_at        timestamptz
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() or is_reseller_only() then
    raise exception 'Not authorized';
  end if;

  return query
  select s.organization_id, o.name, s.monitor_id, m.name, s.issuer, s.subject, s.protocol,
    s.is_valid, s.error_message, s.days_remaining, s.valid_from, s.valid_to, s.checked_at
  from ssl_info s
  join monitors m on m.id = s.monitor_id
  join organizations o on o.id = s.organization_id
  where not p_expiring_only or (s.is_valid and s.days_remaining is not null and s.days_remaining <= 14)
  order by s.days_remaining asc nulls last;
end;
$$;
grant execute on function admin_list_ssl_certificates(boolean) to authenticated;
