-- Agent-relayed network device checks.
--
-- Cloud TCP checks (run-due-checks) need the device's port reachable from the
-- public internet. A home router, GPON/fiber ONT, or office switch usually
-- isn't — it sits behind NAT. The Kada Nigrani agent already runs on a real
-- server; if that server is on the SAME LAN as the device, the agent can do
-- the TCP connect itself and report back, exactly like the cloud check does,
-- just from inside the network instead of outside it. ICMP/SNMP still need
-- raw sockets neither the edge runtime nor this agent's polling model provide
-- yet, so those remain roadmap — this is TCP-connect relay only.

alter table monitors add column if not exists via_host_agent_id uuid references host_agents (id) on delete set null;

alter table monitors drop constraint if exists monitors_via_agent_check_type;
alter table monitors add constraint monitors_via_agent_check_type
  check (via_host_agent_id is null or check_type = 'TCP');

create index if not exists monitors_via_agent_idx on monitors (via_host_agent_id) where via_host_agent_id is not null;

-- ---------------------------------------------------------------------------
-- create_monitor: accept an optional relay agent
-- ---------------------------------------------------------------------------

drop function if exists create_monitor(text, text, text, text, text, text, int, text, text, int);

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
  p_tcp_port int default null,
  p_via_host_agent_id uuid default null
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

  if p_via_host_agent_id is not null then
    if p_check_type <> 'TCP' then
      raise exception 'Only device/TCP checks can be relayed via an agent';
    end if;
    if not exists (
      select 1 from host_agents where id = p_via_host_agent_id and organization_id = v_org_id
    ) then
      raise exception 'Agent not found or not in your organization';
    end if;
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
    expected_status_code, dns_record_type, dns_expected_value, tcp_port,
    via_host_agent_id
  )
  values (
    v_org_id, v_asset.id, p_name, p_url, p_interval,
    p_check_type, p_expected_keyword, p_keyword_match_mode,
    p_expected_status_code, p_dns_record_type, p_dns_expected_value, p_tcp_port,
    p_via_host_agent_id
  )
  returning * into v_monitor;

  return v_monitor;
end;
$$;

grant execute on function create_monitor(text, text, text, text, text, text, int, text, text, int, uuid) to authenticated;
