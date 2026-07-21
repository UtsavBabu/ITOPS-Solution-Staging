-- A real "Training Manager" organization role — assign/track training
-- across the org without also granting team-roster or billing management.
-- Every RPC this role needs already exists and already gates on the real
-- 'training' permission module built in migration 0045 (assign_cybersachet_
-- course, bulk_assign_cybersachet_course, reset_cybersachet_progress,
-- issue/revoke certificate) — this migration only adds the role itself and
-- its grants, matching the module × action grid every other org role uses,
-- zero RPC changes required.
--
-- Scope, matching the standing "least privilege" pattern from the
-- platform_instructors role (migration 0083): full control over training
-- (view/create/edit/delete/manage), read-only on the team roster (so the
-- Users page and its department/team compliance reports are visible and
-- usable) and dashboard, and nothing else — no monitors/hosts/assets/
-- incidents/alert_channels, no team:manage (can't invite/remove members or
-- change roles), no billing.

insert into roles (key, name, description, scope, is_system) values
  ('training_manager', 'Training Manager', 'Assigns and tracks CyberSachet/Academy training across the organization — full training control, without team-roster or billing management.', 'organization', true)
on conflict (key) do nothing;

insert into role_permissions (role_key, module_key, can_view, can_create, can_edit, can_delete, can_configure, can_export, can_manage) values
  ('training_manager', 'training',  true, true,  true,  true,  false, true, true),
  ('training_manager', 'team',      true, false, false, false, false, false, false),
  ('training_manager', 'dashboard', true, false, false, false, false, false, false)
on conflict (role_key, module_key) do nothing;
