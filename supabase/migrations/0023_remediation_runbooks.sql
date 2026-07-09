-- Safe, allowlisted remediation runbooks for the Kada Nigrani agent.
--
-- SECURITY MODEL (why this is not a backdoor):
--   * The database only ever stores an action_key from a fixed allowlist plus a
--     single validated argument — never a raw shell command. The mapping from
--     action_key -> real command lives in the agent, hardcoded, so nothing the
--     database (or a compromised web session) contains can inject a command.
--   * An org admin explicitly requesting an action IS the authorization; the row
--     is created via a SECURITY DEFINER RPC that checks org membership.
--   * The agent only runs actions when started with AGENT_ALLOW_ACTIONS=1 (opt in)
--     and only for its own host (authenticated by its per-host ingest key).
--   * Every execution records exit code + output = a full audit trail.

create table host_commands (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  host_agent_id   uuid not null references host_agents (id) on delete cascade,
  action_key      text not null check (action_key in (
    'ping', 'clear_temp', 'restart_service', 'reload_nginx', 'reload_apache', 'restart_docker_container'
  )),
  arg             text,
  status          text not null default 'approved'
                  check (status in ('approved', 'running', 'success', 'failed', 'cancelled')),
  requested_by    uuid references auth.users (id) on delete set null,
  exit_code       int,
  output          text,
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  finished_at     timestamptz
);

create index host_commands_agent_idx on host_commands (host_agent_id, created_at desc);
create index host_commands_dispatch_idx on host_commands (host_agent_id) where status = 'approved';

alter table host_commands enable row level security;

create policy host_commands_select on host_commands
  for select using (is_org_member(organization_id));
create policy host_commands_admin_select on host_commands
  for select using (is_platform_admin());

alter publication supabase_realtime add table host_commands;

-- Catalog for the UI: which actions exist, their risk, and whether they need
-- an argument. Kept in SQL so it stays the single source of truth.
create function list_runbook_actions()
returns table (action_key text, label text, description text, risk text, needs_arg boolean, arg_label text)
language sql immutable as $$
  select * from (values
    ('ping',                    'Agent health ping',        'Confirms the agent is alive and returns uptime/load. Harmless.',            'safe',   false, null),
    ('clear_temp',              'Clear agent temp files',   'Removes the agent''s own scratch files under /tmp. Harmless.',              'safe',   false, null),
    ('reload_nginx',            'Reload Nginx config',      'Gracefully reloads Nginx without dropping connections.',                    'low',    false, null),
    ('reload_apache',           'Reload Apache config',     'Gracefully reloads Apache (apachectl graceful).',                          'low',    false, null),
    ('restart_docker_container','Restart Docker container', 'Restarts one container by name. Brief downtime for that container.',        'medium', true,  'Container name'),
    ('restart_service',         'Restart system service',   'systemctl restart of one allowlisted service. Brief downtime.',             'medium', true,  'Service name')
  ) as t(action_key, label, description, risk, needs_arg, arg_label);
$$;

grant execute on function list_runbook_actions() to authenticated;

-- Org admin requests an action for a host they own. Starts 'approved' (ready
-- for the agent to pick up). Argument is length-limited and shape-validated.
create function request_host_command(p_host_agent_id uuid, p_action_key text, p_arg text default null)
returns host_commands
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_arg    text;
  v_cmd    host_commands;
begin
  select organization_id into v_org_id from host_agents where id = p_host_agent_id;
  if v_org_id is null or not is_org_member(v_org_id) then
    raise exception 'Host not found or not authorized';
  end if;

  if p_action_key not in ('ping','clear_temp','restart_service','reload_nginx','reload_apache','restart_docker_container') then
    raise exception 'Unknown action: %', p_action_key;
  end if;

  -- Arg is only meaningful for the two parametrized actions; validate shape.
  if p_action_key in ('restart_service','restart_docker_container') then
    v_arg := trim(coalesce(p_arg, ''));
    if v_arg = '' or v_arg !~ '^[A-Za-z0-9._-]{1,64}$' then
      raise exception 'This action requires a valid name (letters, numbers, . _ - only)';
    end if;
  else
    v_arg := null;
  end if;

  insert into host_commands (organization_id, host_agent_id, action_key, arg, requested_by)
  values (v_org_id, p_host_agent_id, p_action_key, v_arg, auth.uid())
  returning * into v_cmd;
  return v_cmd;
end;
$$;

grant execute on function request_host_command(uuid, text, text) to authenticated;

create function list_host_commands(p_host_agent_id uuid, p_limit int default 25)
returns setof host_commands
language sql security invoker stable
set search_path = public, pg_temp as $$
  select * from host_commands
  where host_agent_id = p_host_agent_id
  order by created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function list_host_commands(uuid, int) to authenticated;
