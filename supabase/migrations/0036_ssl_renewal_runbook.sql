-- SSL renewal via the existing Runbooks remediation system. SSL monitoring
-- (ssl_info) only ever reports on a certificate's status — it can't renew
-- one, because ITOps Monitor checks customer sites remotely and has no
-- domain-control access to request a new cert. Kada Nigrani agents already
-- run ON the customer's own server, though, so the fix is the same pattern
-- as every other remediation action: a fixed allowlisted action_key, the
-- real command hardcoded in the agent (kada-nigrani-agent.sh), never a raw
-- command from the database. Assumes certbot is already installed and
-- configured on that host — this triggers its renewal, it doesn't install
-- or configure certbot itself.

alter table host_commands drop constraint host_commands_action_key_check;
alter table host_commands add constraint host_commands_action_key_check
  check (action_key in (
    'ping', 'clear_temp', 'restart_service', 'reload_nginx', 'reload_apache',
    'restart_docker_container', 'renew_ssl_certbot'
  ));

create or replace function list_runbook_actions()
returns table (action_key text, label text, description text, risk text, needs_arg boolean, arg_label text)
language sql immutable as $$
  select * from (values
    ('ping',                    'Agent health ping',        'Confirms the agent is alive and returns uptime/load. Harmless.',            'safe',   false, null),
    ('clear_temp',              'Clear agent temp files',   'Removes the agent''s own scratch files under /tmp. Harmless.',              'safe',   false, null),
    ('reload_nginx',            'Reload Nginx config',      'Gracefully reloads Nginx without dropping connections.',                    'low',    false, null),
    ('reload_apache',           'Reload Apache config',     'Gracefully reloads Apache (apachectl graceful).',                          'low',    false, null),
    ('renew_ssl_certbot',       'Renew SSL (Certbot)',      'Runs certbot renew on this host. Only renews certs already due; no-op otherwise. Requires certbot to already be installed and configured.', 'low', false, null),
    ('restart_docker_container','Restart Docker container', 'Restarts one container by name. Brief downtime for that container.',        'medium', true,  'Container name'),
    ('restart_service',         'Restart system service',   'systemctl restart of one allowlisted service. Brief downtime.',             'medium', true,  'Service name')
  ) as t(action_key, label, description, risk, needs_arg, arg_label);
$$;

create or replace function request_host_command(p_host_agent_id uuid, p_action_key text, p_arg text default null)
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

  if p_action_key not in ('ping','clear_temp','restart_service','reload_nginx','reload_apache','restart_docker_container','renew_ssl_certbot') then
    raise exception 'Unknown action: %', p_action_key;
  end if;

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
