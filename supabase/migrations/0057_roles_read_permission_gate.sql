-- Validation pass on platform-admin access boundaries (as requested):
-- admin_upsert_role()/admin_delete_role() correctly require
-- has_platform_permission('roles', 'manage') — only super_admin actually
-- has that grant (via its blanket "every platform module" rule), so role
-- mutation is properly restricted. But the two READ paths,
-- admin_list_roles() and admin_get_role_permissions(), only checked the
-- coarse is_platform_admin() — true for every platform role. The nav
-- already hides "Roles & Permissions" from anyone but super_admin/
-- platform_administrator, but that's cosmetic only: a support or billing
-- admin could still call these RPCs directly and read the full role/
-- permission grid. Fixed to match the nav's actual intent: viewable by
-- super_admin (already granted) and platform_administrator (granted here,
-- view-only — it already can't edit, and this doesn't change that);
-- nobody else.

insert into role_permissions (role_key, module_key, can_view, can_create, can_edit, can_delete, can_configure, can_export, can_manage)
values ('platform_administrator', 'roles', true, false, false, false, false, false, false)
on conflict (role_key, module_key) do update set can_view = true;

create or replace function admin_list_roles(p_scope text default null)
returns setof roles
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not has_platform_permission('roles', 'view') then
    raise exception 'Not authorized — roles:view required';
  end if;
  return query select * from roles where p_scope is null or scope = p_scope order by scope, is_system desc, name;
end;
$$;

create or replace function admin_get_role_permissions(p_role_key text)
returns setof role_permissions
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not has_platform_permission('roles', 'view') then
    raise exception 'Not authorized — roles:view required';
  end if;
  return query select * from role_permissions where role_key = p_role_key;
end;
$$;
