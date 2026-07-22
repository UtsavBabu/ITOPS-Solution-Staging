-- Real "delete a user" for the Users/HR panel — role, department, and team
-- can already be edited, and an invite can be revoked before it's accepted,
-- but there was no way to actually remove someone who has already joined.
-- Only the membership row is deleted (this org's access), never the
-- auth.users account itself — a person can belong to a different
-- organization, and their historical records here (training completions,
-- certificates, audit log entries) stay intact for compliance, the same
-- "soft" bias archive/restore already uses for departments and teams.

create or replace function remove_organization_member(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_target_org_id uuid;
  v_target_email text;
  v_member_count int;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself this way — leave the organization from your own account settings instead.';
  end if;

  select organization_id into v_target_org_id from memberships where user_id = p_user_id;
  if v_target_org_id is distinct from v_org_id then
    raise exception 'That user is not a member of your organization';
  end if;

  select count(*) into v_member_count from memberships where organization_id = v_org_id;
  if v_member_count <= 1 then
    raise exception 'Cannot remove the organization''s only remaining member';
  end if;

  select email into v_target_email from auth.users where id = p_user_id;

  delete from memberships where user_id = p_user_id and organization_id = v_org_id;

  perform _log_admin_action('remove_organization_member', 'membership', p_user_id::text, coalesce(v_target_email, p_user_id::text));
end;
$$;
grant execute on function remove_organization_member(uuid) to authenticated;
