-- Reseller Admin, end to end. Two real gaps surfaced by testing the actual
-- flow a super_admin would use to make someone a reseller (or, once 0032 is
-- applied, a platform_administrator):
--
--   1. admin_set_platform_admin's role check was still a hardcoded list from
--      migration 0030 — ('super_admin','support','billing','content_editor')
--      — that migration 0031 never actually updated despite its own comment
--      claiming otherwise. Granting 'reseller' has raised "Invalid role:
--      reseller" from day one. Fixed here by validating against the real
--      roles table (migration 0032) instead of a list that has to be kept
--      in sync by hand.
--   2. There was no way for a platform admin to set an arbitrary user's
--      *organization* role from All Users — org roles could only be changed
--      by a member of that org with team:manage, from their own Team page.
--      admin_update_member_role() adds the platform-admin-scoped version.
--
-- Plus the actual missing piece: a public entry point. Nobody could become a
-- reseller without a super_admin already knowing to grant it manually — no
-- signup, no application, nothing to click. reseller_applications is a real,
-- reviewable pipeline: anyone submits a request from the marketing site,
-- support/super_admin/platform_administrator triage it, and only a
-- super_admin's actual grant (admin_set_platform_admin, unchanged privilege
-- boundary) turns it into reseller access — approving an application here
-- never grants access by itself.

-- ---------------------------------------------------------------------------
-- 1. Fix admin_set_platform_admin's role validation.
-- ---------------------------------------------------------------------------

create or replace function admin_set_platform_admin(p_user_id uuid, p_is_admin boolean, p_role text default 'support')
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_email text;
begin
  if not is_super_admin() then
    raise exception 'Not authorized — only super admins can grant or revoke admin access';
  end if;
  if p_is_admin and not exists (select 1 from roles where key = p_role and scope = 'platform') then
    raise exception 'Invalid role: %', p_role;
  end if;

  select email into v_email from auth.users where id = p_user_id;

  if p_is_admin then
    insert into platform_admins (user_id, role) values (p_user_id, p_role)
    on conflict (user_id) do update set role = excluded.role;
  else
    delete from platform_admins where user_id = p_user_id;
  end if;

  perform _log_admin_action(
    case when p_is_admin then 'grant_admin' else 'revoke_admin' end,
    'user', p_user_id::text, v_email,
    case when p_is_admin then jsonb_build_object('role', p_role) else '{}'::jsonb end
  );
end;
$$;
grant execute on function admin_set_platform_admin(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Platform-admin scoped org-role editing (All Users page).
-- ---------------------------------------------------------------------------

create or replace function admin_update_member_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_email text;
begin
  if not has_admin_role(array['support', 'platform_administrator']) then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from roles where key = p_role and scope = 'organization') then
    raise exception 'Invalid role: %', p_role;
  end if;

  select organization_id into v_org_id from memberships where user_id = p_user_id;
  if v_org_id is null then
    raise exception 'That user has no organization membership';
  end if;

  update memberships set role = p_role where user_id = p_user_id and organization_id = v_org_id;

  select email into v_email from auth.users where id = p_user_id;
  perform _log_admin_action('update_member_role', 'user', p_user_id::text, v_email, jsonb_build_object('role', p_role));
end;
$$;
grant execute on function admin_update_member_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Reseller applications — the public entry point.
-- ---------------------------------------------------------------------------

create table reseller_applications (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null,
  contact_name  text not null,
  email         text not null,
  phone         text,
  message       text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by   uuid references auth.users(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
alter table reseller_applications enable row level security;

create policy reseller_applications_insert on reseller_applications
  for insert to anon, authenticated with check (true);

create policy reseller_applications_select on reseller_applications
  for select to authenticated using (has_admin_role(array['support', 'platform_administrator']));

create or replace function admin_review_reseller_application(p_id uuid, p_status text)
returns reseller_applications
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_app reseller_applications;
begin
  if not has_admin_role(array['support', 'platform_administrator']) then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update reseller_applications
  set status = p_status, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id
  returning * into v_app;

  if v_app.id is null then
    raise exception 'Application not found';
  end if;

  perform _log_admin_action('review_reseller_application', 'reseller_application', v_app.id::text, v_app.company_name, jsonb_build_object('status', p_status));
  return v_app;
end;
$$;
grant execute on function admin_review_reseller_application(uuid, text) to authenticated;

create or replace function admin_list_reseller_applications()
returns setof reseller_applications
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not has_admin_role(array['support', 'platform_administrator']) then
    raise exception 'Not authorized';
  end if;
  return query select * from reseller_applications order by (status = 'pending') desc, created_at desc;
end;
$$;
grant execute on function admin_list_reseller_applications() to authenticated;
