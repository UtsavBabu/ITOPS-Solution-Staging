-- Network device monitoring (Nagios check_tcp-style): TCP connect checks with
-- latency against routers, switches, firewalls, DNS servers, printers — any
-- device exposing a service port. ICMP ping and SNMP need raw sockets the edge
-- runtime doesn't provide, so they stay on the roadmap rather than being faked.

alter table monitors drop constraint if exists monitors_check_type_check;
alter table monitors add constraint monitors_check_type_check
  check (check_type in ('HTTP', 'KEYWORD', 'STATUS_CODE', 'DNS', 'TCP'));

alter table monitors add column if not exists tcp_port int
  check (tcp_port is null or (tcp_port >= 1 and tcp_port <= 65535));

alter table assets drop constraint if exists assets_type_check;
alter table assets add constraint assets_type_check
  check (type in ('WEBSITE', 'SERVER', 'DATABASE', 'NETWORK', 'OTHER'));

drop function if exists create_monitor(text, text, text, text, text, text, int, text, text);

create function create_monitor(
  p_name text,
  p_url text,
  p_interval text default 'FIVE_MINUTES',
  p_check_type text default 'HTTP',
  p_expected_keyword text default null,
  p_keyword_match_mode text default 'CONTAINS',
  p_expected_status_code int default null,
  p_dns_record_type text default 'A',
  p_dns_expected_value text default null,
  p_tcp_port int default null
)
returns monitors
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id     uuid;
  v_org_plan   text;
  v_max        int;
  v_current    int;
  v_asset      assets;
  v_monitor    monitors;
  v_asset_type text;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  if p_check_type not in ('HTTP', 'KEYWORD', 'STATUS_CODE', 'DNS', 'TCP') then
    raise exception 'Invalid check type: %', p_check_type;
  end if;

  if p_check_type = 'TCP' and (p_tcp_port is null or p_tcp_port < 1 or p_tcp_port > 65535) then
    raise exception 'A port between 1 and 65535 is required for TCP checks';
  end if;

  select o.plan, pl.max_monitors into v_org_plan, v_max
  from organizations o join plan_limits pl on pl.plan = o.plan
  where o.id = v_org_id;

  select count(*) into v_current from monitors where organization_id = v_org_id;

  if v_current >= v_max then
    raise exception 'Plan limit reached: % plan allows up to % monitors. Upgrade to add more.', v_org_plan, v_max;
  end if;

  v_asset_type := case
    when p_check_type = 'TCP' then 'NETWORK'
    when p_check_type = 'DNS' then 'OTHER'
    else 'WEBSITE'
  end;

  insert into assets (organization_id, type, name, identifier)
  values (v_org_id, v_asset_type, p_name, p_url)
  returning * into v_asset;

  insert into monitors (
    organization_id, asset_id, name, url, interval,
    check_type, expected_keyword, keyword_match_mode,
    expected_status_code, dns_record_type, dns_expected_value, tcp_port
  )
  values (
    v_org_id, v_asset.id, p_name, p_url, p_interval,
    p_check_type, p_expected_keyword, p_keyword_match_mode,
    p_expected_status_code, p_dns_record_type, p_dns_expected_value, p_tcp_port
  )
  returning * into v_monitor;

  return v_monitor;
end;
$$;

grant execute on function create_monitor(text, text, text, text, text, text, int, text, text, int) to authenticated;
