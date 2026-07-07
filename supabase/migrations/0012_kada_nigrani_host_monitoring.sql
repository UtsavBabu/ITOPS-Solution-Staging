-- Kada Nigrani — real agent-based host monitoring.
--
-- A lightweight agent (see agents/kada-nigrani-agent.sh) runs on a Linux host,
-- reads CPU/memory/disk/uptime/load from /proc + coreutils, and POSTs them to
-- the ingest-metrics edge function authenticated by a per-host ingest key.
-- This is genuine server monitoring — the same push model Datadog/Netdata use —
-- not a mock. Windows agents, containers, VMware/SNMP, and SIEM features remain
-- honest roadmap.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table host_agents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name            text not null,
  hostname        text,
  os              text,
  agent_version   text,
  -- Secret the agent presents on every ingest call. Random, per host.
  ingest_key      text not null unique default encode(gen_random_bytes(24), 'hex'),
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index host_agents_org_idx on host_agents (organization_id);

create table host_metrics (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  host_agent_id   uuid not null references host_agents (id) on delete cascade,
  cpu_percent     real,
  mem_percent     real,
  mem_used_mb     real,
  mem_total_mb    real,
  disk_percent    real,
  disk_used_gb    real,
  disk_total_gb   real,
  uptime_seconds  bigint,
  load1           real,
  load5           real,
  load15          real,
  process_count   int,
  recorded_at     timestamptz not null default now()
);

create index host_metrics_agent_idx on host_metrics (host_agent_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- RLS — org members read their own hosts/metrics; platform admins read all
-- (additive). Writes happen through SECURITY DEFINER RPCs (host management) or
-- the ingest edge function using the service role (metrics), so no direct
-- client insert/update policies.
-- ---------------------------------------------------------------------------

alter table host_agents enable row level security;
alter table host_metrics enable row level security;

create policy host_agents_select on host_agents
  for select using (is_org_member(organization_id));
create policy host_agents_admin_select on host_agents
  for select using (is_platform_admin());

create policy host_metrics_select on host_metrics
  for select using (is_org_member(organization_id));
create policy host_metrics_admin_select on host_metrics
  for select using (is_platform_admin());

-- ---------------------------------------------------------------------------
-- Host management RPCs
-- ---------------------------------------------------------------------------

create function create_host_agent(p_name text, p_hostname text default null)
returns host_agents
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_host   host_agents;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Host name is required';
  end if;

  insert into host_agents (organization_id, name, hostname)
  values (v_org_id, p_name, nullif(trim(coalesce(p_hostname, '')), ''))
  returning * into v_host;

  return v_host;
end;
$$;

create function delete_host_agent(p_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from host_agents where id = p_id;
  if v_org_id is null or not is_org_member(v_org_id) then
    raise exception 'Host not found or not authorized';
  end if;
  delete from host_agents where id = p_id;
end;
$$;

create function regenerate_host_agent_key(p_id uuid)
returns host_agents
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_host   host_agents;
begin
  select organization_id into v_org_id from host_agents where id = p_id;
  if v_org_id is null or not is_org_member(v_org_id) then
    raise exception 'Host not found or not authorized';
  end if;
  update host_agents
  set ingest_key = encode(gen_random_bytes(24), 'hex')
  where id = p_id
  returning * into v_host;
  return v_host;
end;
$$;

-- Hosts with their latest metric snapshot + online flag (seen in last 5 min),
-- for the dashboard. Runs as the caller (security invoker) so RLS applies.
create function list_host_agents()
returns table (
  id             uuid,
  name           text,
  hostname       text,
  os             text,
  agent_version  text,
  ingest_key     text,
  last_seen_at   timestamptz,
  is_online      boolean,
  cpu_percent    real,
  mem_percent    real,
  disk_percent   real,
  uptime_seconds bigint,
  load1          real,
  process_count  int,
  created_at     timestamptz
)
language sql security invoker stable
set search_path = public, pg_temp as $$
  select
    h.id, h.name, h.hostname, h.os, h.agent_version, h.ingest_key, h.last_seen_at,
    (h.last_seen_at is not null and h.last_seen_at > now() - interval '5 minutes') as is_online,
    m.cpu_percent, m.mem_percent, m.disk_percent, m.uptime_seconds, m.load1, m.process_count,
    h.created_at
  from host_agents h
  left join lateral (
    select * from host_metrics hm
    where hm.host_agent_id = h.id
    order by hm.recorded_at desc
    limit 1
  ) m on true
  order by h.created_at desc;
$$;

grant execute on function create_host_agent(text, text) to authenticated;
grant execute on function delete_host_agent(uuid) to authenticated;
grant execute on function regenerate_host_agent_key(uuid) to authenticated;
grant execute on function list_host_agents() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime — live host status/metrics on the dashboard
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table host_agents;
alter publication supabase_realtime add table host_metrics;

-- ---------------------------------------------------------------------------
-- Solutions catalog + platform module content for Kada Nigrani
-- ---------------------------------------------------------------------------

insert into content_items (page_slug, section_key, item_key, sort_order, title, subtitle, body, status, href, metadata) values
('solutions', 'solutions', 'kada-nigrani', 2, 'Kada Nigrani — Server & Device Monitoring',
  'A real agent watching every server you run',
  'Install a lightweight agent on any Linux server and stream CPU, memory, disk, load, and uptime into the same dashboard as your website monitors. The agent is real and works today; broader device coverage is on the roadmap.',
  'live', null,
  '{"capabilities": [
    {"title": "Linux server agent", "detail": "One-line install. Reports CPU, memory, disk, load average, uptime, and process count.", "status": "live"},
    {"title": "Live host dashboard", "detail": "Online/offline status and latest resource usage for every host, updating in real time.", "status": "live"},
    {"title": "Per-host secure ingest key", "detail": "Each host authenticates with its own rotatable key — revoke or regenerate anytime.", "status": "live"},
    {"title": "Windows server agent", "detail": "A PowerShell agent reporting the same metrics from Windows hosts.", "status": "roadmap"},
    {"title": "Container & Docker stats", "detail": "Per-container CPU/memory and health from Docker and Kubernetes nodes.", "status": "roadmap"},
    {"title": "VMware & Hyper-V", "detail": "Hypervisor-level visibility across your virtualization estate.", "status": "roadmap"},
    {"title": "Network devices via SNMP", "detail": "Switches, routers, and storage arrays polled over SNMP.", "status": "roadmap"},
    {"title": "Log & security monitoring", "detail": "Centralized log collection and threat detection rules, Wazuh-style.", "status": "roadmap"},
    {"title": "Resource threshold alerts", "detail": "Alert when CPU, memory, or disk crosses a threshold you set.", "status": "roadmap"}
  ]}'::jsonb),
('platform', 'modules', null, 6, 'Kada Nigrani (Server Monitoring)', null,
  'A lightweight agent streams CPU, memory, disk, and uptime from your Linux servers into the same dashboard.',
  'live', '/solutions/kada-nigrani', '{}');
