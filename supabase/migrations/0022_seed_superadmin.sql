-- =============================================================================
-- 0022: Seed the platform super-admin + one-time clean slate
-- =============================================================================
--
-- The owner account that can log into /admin, resell packages, provision
-- customer organizations, and manage users platform-wide.
--
--   email : babulearn57@gmail.com
--   pass  : admin@123   (please rotate after first login)
--
-- Behaviour:
--   * FIRST DEPLOY (no super-admin present yet): wipe all tenant data for a
--     clean slate, then create the super-admin + their ENTERPRISE org.
--   * SUBSEQUENT DEPLOYS (super-admin already exists): no wipe, just make sure
--     the platform-admin grant and ENTERPRISE package are intact. This keeps
--     customer data safe on every future redeploy.
--
-- Password is hashed with pgcrypto's crypt() (a standard bcrypt hash that
-- GoTrue's own bcrypt verifier accepts), so the hash is reproducible in SQL
-- without baking in an external tool's output.
--
-- NOTE: as originally written this failed against a live project on a
-- current Supabase/GoTrue schema (confirmed_at is now a generated column,
-- can't be assigned explicitly) — fixed below. On the project this was
-- first deployed to, the super-admin account already existed by the time
-- this was reconciled, so the wipe branch never ran; this file is kept as
-- the accurate bootstrap path for any future from-scratch deploy.

do $$
declare
  v_user_id uuid;
  v_org_id  uuid;
  v_exists  boolean;
begin
  select exists (
    select 1 from auth.users where email = 'babulearn57@gmail.com'
  ) into v_exists;

  -- 1. One-time clean slate (only when the platform has no owner yet).
  if not v_exists then
    delete from public.check_results;
    delete from public.security_snapshots;
    delete from public.ssl_info;
    delete from public.incidents;
    delete from public.monitors;
    delete from public.host_metrics;
    delete from public.host_agents;
    delete from public.alert_channels;
    delete from public.assets;
    delete from public.memberships;
    delete from public.organizations;
    delete from public.waitlist_signups;
    delete from public.contact_messages;
    delete from public.platform_admins;
    delete from auth.users;
  end if;

  -- 2. Create the super-admin auth user (idempotent). confirmed_at is a
  --    generated column on current Supabase/GoTrue schemas (derived from
  --    email_confirmed_at) — it can no longer be assigned explicitly the
  --    way this statement originally did.
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  select
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'babulearn57@gmail.com',
    crypt('admin@123', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"organization_name":"ITOps Platform","full_name":"Super Admin"}'::jsonb,
    now(),
    now()
  where not exists (
    select 1 from auth.users where email = 'babulearn57@gmail.com'
  )
  returning id into v_user_id;

  -- Already existed? resolve the id so the steps below still run.
  if v_user_id is null then
    select id into v_user_id from auth.users where email = 'babulearn57@gmail.com';
  end if;

  if v_user_id is null then
    raise exception 'Failed to resolve super-admin user id';
  end if;

  -- 3. Ensure org + membership exist (handle_new_user trigger normally does
  --    this on insert; defensive for the pre-existing case).
  select organization_id into v_org_id
  from public.memberships where user_id = v_user_id limit 1;

  if v_org_id is null then
    insert into public.organizations (name) values ('ITOps Platform') returning id into v_org_id;
    insert into public.memberships (user_id, organization_id, role)
    values (v_user_id, v_org_id, 'ADMIN');
  end if;

  -- 4. Grant platform-admin (super-admin) rights.
  insert into public.platform_admins (user_id) values (v_user_id)
  on conflict (user_id) do nothing;

  -- 5. Top-tier package so nothing is capped for the owner.
  update public.organizations set plan = 'ENTERPRISE' where id = v_org_id;

  -- 6. Best-effort identity row (some GoTrue paths expect one). Ignore schema
  --    differences across versions.
  begin
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    )
    select gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'babulearn57@gmail.com', 'email_verified', true),
      'password', 'babulearn57@gmail.com', now(), now(), now()
    where not exists (
      select 1 from auth.identities where user_id = v_user_id and provider = 'password'
    );
  exception when others then null;
  end;
end;
$$;
