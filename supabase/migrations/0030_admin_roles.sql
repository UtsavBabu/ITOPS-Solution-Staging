-- Role-Based Access Control for the platform admin portal.
--
-- Today every platform admin can do everything — grant other admins, change
-- any customer's plan, edit marketing content, delete organizations. This
-- splits that into four roles:
--   super_admin     — everything, including granting/revoking admin access.
--   support         — customer/organization lifecycle (rename, archive,
--                     restore, delete) and the leads inbox. No plan/billing
--                     changes, no admin grants, no content editing.
--   billing         — plan changes (per-customer and the global plan-limit
--                     catalog) and per-org product licensing. No customer
--                     lifecycle actions, no admin grants, no content editing.
--   content_editor  — the marketing-site Content Manager and Site
--                     Visibility toggles. No customer or billing access.
--
-- Every existing platform admin (including the seeded super-admin) becomes
-- super_admin via the column default below — nobody's access changes on
-- deploy. Reads (dashboards, lists, audit log) stay open to any admin role;
-- only the mutating actions are split by domain. This mirrors the project's
-- existing philosophy: RLS/SECURITY DEFINER checks are the real boundary,
-- the frontend just hides controls a role can't use.

alter table platform_admins
  add column if not exists role text not null default 'super_admin'
  check (role in ('super_admin', 'support', 'billing', 'content_editor'));

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.platform_admin_role() returns text
language sql security definer stable set search_path = public, pg_temp as $$
  select role from platform_admins where user_id = auth.uid();
$$;
grant execute on function public.platform_admin_role() to authenticated;

create or replace function public.is_super_admin() returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from platform_admins where user_id = auth.uid() and role = 'super_admin');
$$;
grant execute on function public.is_super_admin() to authenticated;

-- True if the caller is a platform admin whose role is in p_roles, OR is a
-- super_admin (super_admin can always do anything any other role can do).
create or replace function public.has_admin_role(p_roles text[]) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from platform_admins
    where user_id = auth.uid() and (role = any(p_roles) or role = 'super_admin')
  );
$$;
grant execute on function public.has_admin_role(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin grants — super_admin only (highest-stakes action: it's how someone
-- gets any of these roles in the first place).
-- ---------------------------------------------------------------------------

-- CREATE OR REPLACE can't change a function's argument list — the old
-- 2-argument admin_set_platform_admin(uuid, boolean) would otherwise keep
-- existing as an unprotected overload alongside this one (still callable,
-- still using the old is_platform_admin() check). Drop it explicitly.
drop function if exists admin_set_platform_admin(uuid, boolean);

create or replace function admin_set_platform_admin(p_user_id uuid, p_is_admin boolean, p_role text default 'support')
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_email text;
begin
  if not is_super_admin() then
    raise exception 'Not authorized — only super admins can grant or revoke admin access';
  end if;
  if p_role not in ('super_admin', 'support', 'billing', 'content_editor') then
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
-- Billing — plan changes and product licensing. billing or super_admin.
-- ---------------------------------------------------------------------------

create or replace function admin_update_organization_plan(p_organization_id uuid, p_plan text)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
  v_old_plan text;
begin
  if not has_admin_role(array['billing']) then
    raise exception 'Not authorized — billing access required';
  end if;

  select plan into v_old_plan from organizations where id = p_organization_id;

  update organizations set plan = p_plan where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  perform _log_admin_action('update_plan', 'organization', v_org.id::text, v_org.name, jsonb_build_object('from', v_old_plan, 'to', p_plan));
  return v_org;
end;
$$;
grant execute on function admin_update_organization_plan(uuid, text) to authenticated;

drop policy if exists plan_limits_admin_update on plan_limits;
create policy plan_limits_admin_update on plan_limits
  for update using (has_admin_role(array['billing'])) with check (has_admin_role(array['billing']));

create or replace function admin_set_org_product(p_organization_id uuid, p_product_key text, p_active boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_name text;
  v_product_name text;
begin
  if not has_admin_role(array['billing']) then
    raise exception 'Not authorized — billing access required';
  end if;

  select name into v_org_name from organizations where id = p_organization_id;
  select name into v_product_name from products where key = p_product_key;
  if v_org_name is null then raise exception 'Organization not found'; end if;
  if v_product_name is null then raise exception 'Product not found'; end if;

  if p_active then
    insert into organization_products (organization_id, product_key, status, granted_by)
    values (p_organization_id, p_product_key, 'active', auth.uid())
    on conflict (organization_id, product_key) do update set status = 'active', granted_at = now(), granted_by = auth.uid();
  else
    update organization_products set status = 'revoked' where organization_id = p_organization_id and product_key = p_product_key;
  end if;

  perform _log_admin_action(
    case when p_active then 'grant_product' else 'revoke_product' end,
    'organization_product',
    p_organization_id::text,
    v_org_name || ' — ' || v_product_name
  );
end;
$$;
grant execute on function admin_set_org_product(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Customer/organization lifecycle — support or super_admin.
-- ---------------------------------------------------------------------------

create or replace function admin_rename_organization(p_organization_id uuid, p_name text)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
  v_old_name text;
begin
  if not has_admin_role(array['support']) then
    raise exception 'Not authorized — support access required';
  end if;
  if trim(p_name) = '' then
    raise exception 'Name cannot be empty';
  end if;

  select name into v_old_name from organizations where id = p_organization_id;

  update organizations set name = trim(p_name) where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  perform _log_admin_action('rename', 'organization', v_org.id::text, v_org.name, jsonb_build_object('from', v_old_name, 'to', v_org.name));
  return v_org;
end;
$$;

create or replace function admin_archive_organization(p_organization_id uuid)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
begin
  if not has_admin_role(array['support']) then
    raise exception 'Not authorized — support access required';
  end if;

  update organizations set status = 'archived' where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  perform _log_admin_action('archive', 'organization', v_org.id::text, v_org.name);
  return v_org;
end;
$$;

create or replace function admin_restore_organization(p_organization_id uuid)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
begin
  if not has_admin_role(array['support']) then
    raise exception 'Not authorized — support access required';
  end if;

  update organizations set status = 'active' where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  perform _log_admin_action('restore', 'organization', v_org.id::text, v_org.name);
  return v_org;
end;
$$;

create or replace function admin_delete_organization(p_organization_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text;
begin
  if not has_admin_role(array['support']) then
    raise exception 'Not authorized — support access required';
  end if;

  select name into v_name from organizations where id = p_organization_id;
  if v_name is null then
    raise exception 'Organization not found';
  end if;

  delete from organizations where id = p_organization_id;

  perform _log_admin_action('delete', 'organization', p_organization_id::text, v_name);
end;
$$;

grant execute on function admin_rename_organization(uuid, text) to authenticated;
grant execute on function admin_archive_organization(uuid) to authenticated;
grant execute on function admin_restore_organization(uuid) to authenticated;
grant execute on function admin_delete_organization(uuid) to authenticated;

-- Leads inbox — support or super_admin.
drop policy if exists contact_messages_admin_update on contact_messages;
create policy contact_messages_admin_update on contact_messages
  for update using (has_admin_role(array['support'])) with check (has_admin_role(array['support']));

-- ---------------------------------------------------------------------------
-- Marketing content — content_editor or super_admin.
-- ---------------------------------------------------------------------------

drop policy if exists content_items_admin_insert on content_items;
create policy content_items_admin_insert on content_items
  for insert with check (has_admin_role(array['content_editor']));

drop policy if exists content_items_admin_update on content_items;
create policy content_items_admin_update on content_items
  for update using (has_admin_role(array['content_editor'])) with check (has_admin_role(array['content_editor']));

drop policy if exists content_items_admin_delete on content_items;
create policy content_items_admin_delete on content_items
  for delete using (has_admin_role(array['content_editor']));

-- content_items_admin_select stays gated on is_platform_admin() (any role) —
-- the Content Manager list itself is a read, and other roles reasonably need
-- to see what's live even if they can't edit it.

-- ---------------------------------------------------------------------------
-- admin_list_all_users grows a platform_admin_role column so the Users page
-- can show/manage roles. Return columns change, so drop-then-create rather
-- than create-or-replace.
-- ---------------------------------------------------------------------------

drop function if exists admin_list_all_users();

create function admin_list_all_users()
returns table (
  user_id             uuid,
  email               text,
  organization_name   text,
  role                text,
  is_platform_admin   boolean,
  platform_admin_role text,
  created_at          timestamptz
)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query
    select
      u.id,
      u.email::text,
      o.name,
      m.role,
      exists (select 1 from platform_admins pa where pa.user_id = u.id),
      (select pa.role from platform_admins pa where pa.user_id = u.id),
      u.created_at
    from auth.users u
    left join memberships m on m.user_id = u.id
    left join organizations o on o.id = m.organization_id
    order by u.created_at desc;
end;
$$;

grant execute on function admin_list_all_users() to authenticated;
