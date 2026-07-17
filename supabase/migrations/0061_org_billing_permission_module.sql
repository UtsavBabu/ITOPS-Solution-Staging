-- Team & Plan and Users were split into separate pages last round, but they
-- still shared one underlying permission module ('team', labeled "Team &
-- Billing") — any role with team:view saw both. That's not a real
-- admin-only boundary, just two pages pointed at the same switch. Split
-- billing into its own module so it can actually be restricted to the
-- organization's admin (and the billing_manager role, whose entire purpose
-- already was billing — it just had no dedicated module to grant until now).

insert into permission_modules (key, label, scope, sort_order) values
  ('billing', 'Billing', 'organization', 71)
on conflict (key) do nothing;

update permission_modules set label = 'Team' where key = 'team' and scope = 'organization';

-- organization_administrator / legacy ADMIN: full billing control, same as
-- every other module they fully own.
insert into role_permissions (role_key, module_key, can_view, can_create, can_edit, can_delete, can_configure, can_export, can_manage) values
  ('organization_administrator', 'billing', true, false, false, false, false, true, true),
  ('ADMIN', 'billing', true, false, false, false, false, true, true)
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view, can_export = excluded.can_export, can_manage = excluded.can_manage;

-- billing_manager: this role's grant on 'team' (view/export/manage, no
-- create/edit/delete) was always modeling billing access — there was just
-- nowhere else to put it before this module existed. Move it to 'billing'
-- and drop the role back to plain team-member visibility (view only) on
-- 'team' itself, since a billing_manager was never meant to manage other
-- people's roles, departments, or invites.
insert into role_permissions (role_key, module_key, can_view, can_create, can_edit, can_delete, can_configure, can_export, can_manage) values
  ('billing_manager', 'billing', true, false, false, false, false, true, true)
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view, can_export = excluded.can_export, can_manage = excluded.can_manage;

update role_permissions set can_export = false, can_manage = false
  where role_key = 'billing_manager' and module_key = 'team';

-- Everyone else (MEMBER, helpdesk, auditor, READ_ONLY, it_manager,
-- network_engineer, security_analyst, system_administrator) gets no row on
-- 'billing' at all — has_org_permission() already defaults missing rows to
-- false, so this is a real deny, not just a hidden nav item.
