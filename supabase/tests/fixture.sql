-- Minimal stand-in for exactly the two tables that predate every migration
-- this suite actually replays (0001_init.sql's organizations/memberships)
-- plus an auth.users/auth.uid() stand-in for Supabase's real auth schema.
-- Everything else (products, roles, departments, cybersachet_* tables, and
-- every function under test) comes from running the REAL migration files
-- verbatim — this suite exercises the actual RBAC/licensing engine, not a
-- reimplementation of it.

create extension if not exists pgcrypto;
create role authenticated;
create role anon;
create schema if not exists auth;
create schema if not exists extensions;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- Real column added by 0004_plans_waitlist_team.sql, stubbed directly
  -- here rather than replaying that whole migration (waitlist/team seat
  -- logic unrelated to what this suite checks) just for one column.
  plan       text not null default 'STARTER',
  created_at timestamptz not null default now()
);

create table memberships (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  role            text not null default 'ADMIN',
  created_at      timestamptz not null default now(),
  unique (user_id, organization_id)
);

-- Swapped per-test via `select test.set_current_user(uuid)` (see helpers.sql).
create or replace function auth.uid() returns uuid
language sql stable as $$ select current_setting('test.current_user_id', true)::uuid $$;

-- Real core helper from 0001_init.sql (predates everything this suite
-- replays) — copied verbatim, not reimplemented.
create function is_org_member(p_organization_id uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from memberships
    where organization_id = p_organization_id and user_id = auth.uid()
  );
$$;

-- Minimal empty stand-ins so the REAL migration files' unrelated policies/
-- stats queries (e.g. 0006's admin_platform_stats referencing monitors/
-- incidents/waitlist_signups/contact_messages) have something to point at.
-- This suite never reads or writes these — they exist only so CREATE
-- POLICY/CREATE FUNCTION on the real migration files doesn't fail on a
-- missing relation unrelated to RBAC/licensing.
create table host_agents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name            text not null,
  hostname        text,
  ingest_key      text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at      timestamptz not null default now()
);
create table monitors (id uuid primary key default gen_random_uuid(), organization_id uuid);
create table incidents (id uuid primary key default gen_random_uuid(), organization_id uuid, status text);
create table waitlist_signups (id uuid primary key default gen_random_uuid());
create table contact_messages (id uuid primary key default gen_random_uuid());
create table content_items (id uuid primary key default gen_random_uuid());
create table plan_limits (plan text primary key, max_monitors int not null default 0, max_alert_channels int not null default 0, history_days int not null default 0);
insert into plan_limits (plan, max_monitors, max_alert_channels, history_days) values
  ('STARTER', 3, 1, 7), ('PROFESSIONAL', 25, 5, 30), ('BUSINESS', 100, 20, 90), ('ENTERPRISE', 100000, 100000, 365);
