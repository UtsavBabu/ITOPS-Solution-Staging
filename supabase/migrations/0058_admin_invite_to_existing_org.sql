-- Real gap found while validating: Platform Admin's "+ Add user" always
-- creates a brand-new organization — there was no way to add someone to
-- an *existing* customer's org from the admin side, only from that org's
-- own Team & Plan page. Same underlying mechanism as create_org_invite()
-- (email/password acceptance at /invite/:token, seat-limit-aware), just
-- authorized by is_platform_admin() instead of the caller's own org
-- membership, and taking an explicit target organization.

create or replace function admin_invite_user_to_organization(p_organization_id uuid, p_email text, p_role text)
returns table (id uuid, token text)
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_email text;
  v_existing_id uuid;
  v_new_token text;
  v_plan text;
  v_max_members int;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from organizations where id = p_organization_id) then
    raise exception 'Organization not found';
  end if;

  v_email := lower(btrim(p_email));
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required';
  end if;
  if not exists (
    select 1 from roles
    where key = p_role and scope = 'organization' and (organization_id is null or organization_id = p_organization_id)
  ) then
    raise exception 'Invalid role';
  end if;
  if exists (
    select 1 from memberships m join auth.users u on u.id = m.user_id
    where m.organization_id = p_organization_id and lower(u.email) = v_email
  ) then
    raise exception 'That person is already a member of this organization';
  end if;

  update org_invites set revoked_at = now()
    where organization_id = p_organization_id and lower(email) = v_email
      and accepted_at is null and revoked_at is null and expires_at <= now();

  select oi.id into v_existing_id from org_invites oi
    where oi.organization_id = p_organization_id and lower(oi.email) = v_email
      and oi.accepted_at is null and oi.revoked_at is null and oi.expires_at > now();

  if v_existing_id is null then
    select o.plan, pl.max_members into v_plan, v_max_members
      from organizations o join plan_limits pl on pl.plan = o.plan where o.id = p_organization_id;
    if _org_seats_used(p_organization_id) >= v_max_members then
      raise exception '% plan allows up to % team members (including pending invites). Upgrade the organization to add more.', v_plan, v_max_members;
    end if;
  end if;

  v_new_token := encode(gen_random_bytes(24), 'hex');

  if v_existing_id is not null then
    update org_invites
      set role = p_role, token = v_new_token, expires_at = now() + interval '7 days',
          created_at = now(), invited_by = auth.uid()
      where org_invites.id = v_existing_id;
    perform _log_admin_action('admin_resend_org_invite', 'org_invite', v_existing_id::text, v_email);
    return query select v_existing_id, v_new_token;
  end if;

  insert into org_invites (organization_id, email, role, token, invited_by)
  values (p_organization_id, v_email, p_role, v_new_token, auth.uid())
  returning org_invites.id into v_existing_id;
  perform _log_admin_action('admin_invite_user_to_organization', 'org_invite', v_existing_id::text, v_email);
  return query select v_existing_id, v_new_token;
end;
$$;
grant execute on function admin_invite_user_to_organization(uuid, text, text) to authenticated;
