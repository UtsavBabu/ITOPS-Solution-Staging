-- ITOps Monitor — core schema, RLS policies, and RPCs
-- Multi-tenant website monitoring on Supabase (Auth + Postgres + RLS).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table memberships (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  role            text not null default 'ADMIN' check (role in ('ADMIN', 'MEMBER', 'READ_ONLY')),
  created_at      timestamptz not null default now(),
  unique (user_id, organization_id)
);

create table assets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  type            text not null check (type in ('WEBSITE', 'SERVER', 'DATABASE', 'OTHER')),
  name            text not null,
  identifier      text not null,
  owner           text,
  tags            text[] not null default '{}',
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table monitors (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations (id) on delete cascade,
  asset_id           uuid not null unique references assets (id) on delete cascade,
  url                text not null,
  name               text not null,
  interval           text not null default 'FIVE_MINUTES'
                      check (interval in ('THIRTY_SECONDS', 'ONE_MINUTE', 'FIVE_MINUTES', 'FIFTEEN_MINUTES')),
  is_active          boolean not null default true,
  consecutive_fails  int not null default 0,
  last_checked_at    timestamptz,
  last_status        text check (last_status in ('UP', 'DOWN', 'ERROR')),
  next_check_at      timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index monitors_org_idx on monitors (organization_id);
create index monitors_next_check_idx on monitors (next_check_at) where is_active;

create table check_results (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  monitor_id       uuid not null references monitors (id) on delete cascade,
  status           text not null check (status in ('UP', 'DOWN', 'ERROR')),
  status_code      int,
  response_time_ms int,
  error_message    text,
  redirect_chain   text[] not null default '{}',
  checked_at       timestamptz not null default now()
);

create index check_results_monitor_idx on check_results (monitor_id, checked_at desc);

create table ssl_info (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  monitor_id      uuid not null unique references monitors (id) on delete cascade,
  issuer          text,
  subject         text,
  valid_from      timestamptz,
  valid_to        timestamptz,
  days_remaining  int,
  protocol        text,
  is_valid        boolean not null default false,
  error_message   text,
  last_alerted_at timestamptz,
  checked_at      timestamptz not null default now()
);

create table security_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations (id) on delete cascade,
  monitor_id         uuid not null unique references monitors (id) on delete cascade,
  score              int not null,
  headers            jsonb not null default '{}',
  missing_headers    text[] not null default '{}',
  cookie_issues      text[] not null default '{}',
  server_header_leak text,
  checked_at         timestamptz not null default now()
);

create table incidents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  monitor_id      uuid not null references monitors (id) on delete cascade,
  status          text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED')),
  started_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  cause           text
);

create index incidents_monitor_idx on incidents (monitor_id, status);

create table alert_channels (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  type            text not null check (type in ('EMAIL', 'SLACK', 'WEBHOOK')),
  name            text not null,
  config          jsonb not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assets_set_updated_at before update on assets
  for each row execute function set_updated_at();

create trigger monitors_set_updated_at before update on monitors
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helper (used by every RLS policy below)
-- ---------------------------------------------------------------------------

create function is_org_member(p_organization_id uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from memberships
    where organization_id = p_organization_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- New-user bootstrap: auth.users insert -> organization + membership
-- Expects signUp() options.data = { organization_name, full_name }
-- ---------------------------------------------------------------------------

create function handle_new_user() returns trigger
language plpgsql security definer as $$
declare
  v_org_id uuid;
begin
  insert into organizations (name)
  values (coalesce(new.raw_user_meta_data ->> 'organization_name', 'My Organization'))
  returning id into v_org_id;

  insert into memberships (user_id, organization_id, role)
  values (new.id, v_org_id, 'ADMIN');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table assets enable row level security;
alter table monitors enable row level security;
alter table check_results enable row level security;
alter table ssl_info enable row level security;
alter table security_snapshots enable row level security;
alter table incidents enable row level security;
alter table alert_channels enable row level security;

create policy organizations_select on organizations
  for select using (is_org_member(id));

create policy memberships_select on memberships
  for select using (is_org_member(organization_id));

create policy assets_select on assets
  for select using (is_org_member(organization_id));
create policy assets_insert on assets
  for insert with check (is_org_member(organization_id) and type <> 'WEBSITE');
create policy assets_update on assets
  for update using (is_org_member(organization_id))
  with check (is_org_member(organization_id) and type <> 'WEBSITE');
create policy assets_delete on assets
  for delete using (is_org_member(organization_id) and type <> 'WEBSITE');

create policy monitors_select on monitors
  for select using (is_org_member(organization_id));
create policy monitors_update on monitors
  for update using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
-- monitors insert/delete go through the create_monitor/delete_monitor RPCs below
-- (SECURITY DEFINER) so the linked asset stays consistent; no direct insert/delete policy.

create policy check_results_select on check_results
  for select using (is_org_member(organization_id));

create policy ssl_info_select on ssl_info
  for select using (is_org_member(organization_id));

create policy security_snapshots_select on security_snapshots
  for select using (is_org_member(organization_id));

create policy incidents_select on incidents
  for select using (is_org_member(organization_id));

create policy alert_channels_select on alert_channels
  for select using (is_org_member(organization_id));
create policy alert_channels_insert on alert_channels
  for insert with check (is_org_member(organization_id));
create policy alert_channels_update on alert_channels
  for update using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
create policy alert_channels_delete on alert_channels
  for delete using (is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- RPCs for compound operations (keep asset + monitor in lockstep)
-- ---------------------------------------------------------------------------

create function create_monitor(p_name text, p_url text, p_interval text default 'FIVE_MINUTES')
returns monitors
language plpgsql security definer as $$
declare
  v_org_id  uuid;
  v_asset   assets;
  v_monitor monitors;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  insert into assets (organization_id, type, name, identifier)
  values (v_org_id, 'WEBSITE', p_name, p_url)
  returning * into v_asset;

  insert into monitors (organization_id, asset_id, name, url, interval)
  values (v_org_id, v_asset.id, p_name, p_url, p_interval)
  returning * into v_monitor;

  return v_monitor;
end;
$$;

create function delete_monitor(p_monitor_id uuid) returns void
language plpgsql security definer as $$
declare
  v_org_id  uuid;
  v_asset_id uuid;
begin
  select organization_id, asset_id into v_org_id, v_asset_id
  from monitors where id = p_monitor_id;

  if v_org_id is null or not is_org_member(v_org_id) then
    raise exception 'Monitor not found or not authorized';
  end if;

  delete from monitors where id = p_monitor_id;
  delete from assets where id = v_asset_id;
end;
$$;

create function get_dashboard_summary()
returns table (
  total_monitors int,
  up_monitors int,
  down_monitors int,
  open_incidents int,
  total_assets int,
  expiring_ssl int
)
language sql security invoker stable as $$
  select
    (select count(*) from monitors)::int,
    (select count(*) from monitors where last_status = 'UP')::int,
    (select count(*) from monitors where last_status in ('DOWN', 'ERROR'))::int,
    (select count(*) from incidents where status = 'OPEN')::int,
    (select count(*) from assets)::int,
    (select count(*) from ssl_info where days_remaining <= 14)::int;
$$;

grant execute on function create_monitor(text, text, text) to authenticated;
grant execute on function delete_monitor(uuid) to authenticated;
grant execute on function get_dashboard_summary() to authenticated;
