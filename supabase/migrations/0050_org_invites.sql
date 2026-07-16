-- Real team invites: an org admin invites a specific email to join as a
-- specific role. Three ways to redeem one, depending on who's asking:
--   1. Brand-new email/password signup — handle_new_user() (below) reads
--      the token from options.data and joins that org directly instead of
--      creating the fresh organization every other signup gets.
--   2. Brand-new or existing Google sign-in — OAuth never carries
--      options.data, so AuthContext.jsx's loadProfile() redeems a token
--      stashed in sessionStorage right after a real session exists,
--      via the same switch_organization_via_invite() function as #3.
--   3. An already-registered account (any login method) explicitly
--      choosing to switch, from the invite-accept page.
--
-- Deliberately NOT real simultaneous multi-org membership: every
-- org-scoped RPC in this codebase resolves "my organization" via
-- `memberships ... limit 1`, so #2 and #3 both *switch* — leave whatever
-- organization(s) the account is currently in and join the invited one —
-- rather than adding a second concurrent membership. Retrofitting every
-- org-scoped RPC to support real multi-org membership plus an org-switcher
-- UI is real, substantial, separate work, not something this migration
-- takes on.

create table org_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email           text not null,
  role            text not null references roles(key),
  token           text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users(id) on delete set null,
  revoked_at      timestamptz
);
create index org_invites_org_idx on org_invites(organization_id);
create index org_invites_token_idx on org_invites(token);
-- One live (not accepted, not revoked) invite per email per org — expired
-- ones are auto-revoked by create_org_invite() before it would otherwise
-- collide with this, so re-inviting someone whose link expired still works.
create unique index org_invites_org_email_pending_uidx on org_invites(organization_id, lower(email))
  where accepted_at is null and revoked_at is null;
alter table org_invites enable row level security;
create policy org_invites_select on org_invites for select to authenticated using (
  is_org_member(organization_id) or is_platform_admin()
);

-- ---------------------------------------------------------------------------
-- Mutations — gated by has_org_permission(v_org_id, 'team', 'manage'), same
-- check departments and member-role editing already use.
-- ---------------------------------------------------------------------------

create or replace function create_org_invite(p_email text, p_role text)
returns table (id uuid, token text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_email text;
  v_existing_id uuid;
  v_new_token text;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;

  v_email := lower(btrim(p_email));
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required';
  end if;
  if not exists (
    select 1 from roles
    where key = p_role and scope = 'organization' and (organization_id is null or organization_id = v_org_id)
  ) then
    raise exception 'Invalid role';
  end if;
  if exists (
    select 1 from memberships m join auth.users u on u.id = m.user_id
    where m.organization_id = v_org_id and lower(u.email) = v_email
  ) then
    raise exception 'That person is already a member of your organization';
  end if;

  -- Clear out any stale expired-but-unresolved invite for this email so it
  -- can't collide with the partial unique index below.
  update org_invites set revoked_at = now()
    where organization_id = v_org_id and lower(email) = v_email
      and accepted_at is null and revoked_at is null and expires_at <= now();

  select oi.id into v_existing_id from org_invites oi
    where oi.organization_id = v_org_id and lower(oi.email) = v_email
      and oi.accepted_at is null and oi.revoked_at is null and oi.expires_at > now();

  v_new_token := encode(gen_random_bytes(24), 'hex');

  if v_existing_id is not null then
    update org_invites
      set role = p_role, token = v_new_token, expires_at = now() + interval '7 days',
          created_at = now(), invited_by = auth.uid()
      where org_invites.id = v_existing_id;
    perform _log_admin_action('resend_org_invite', 'org_invite', v_existing_id::text, v_email);
    return query select v_existing_id, v_new_token;
  end if;

  insert into org_invites (organization_id, email, role, token, invited_by)
  values (v_org_id, v_email, p_role, v_new_token, auth.uid())
  returning org_invites.id into v_existing_id;
  perform _log_admin_action('create_org_invite', 'org_invite', v_existing_id::text, v_email);
  return query select v_existing_id, v_new_token;
end;
$$;
grant execute on function create_org_invite(text, text) to authenticated;

create or replace function list_org_invites()
returns table (
  id uuid, email text, role text, role_name text, status text, token text,
  created_at timestamptz, expires_at timestamptz, accepted_at timestamptz, invited_by_email text
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;

  -- token is only ever exposed here to a caller who already has team-manage
  -- permission — the same trust level already required to revoke or resend.
  return query
  select oi.id, oi.email, oi.role, r.name,
    case
      when oi.revoked_at is not null then 'revoked'
      when oi.accepted_at is not null then 'accepted'
      when oi.expires_at < now() then 'expired'
      else 'pending'
    end,
    oi.token, oi.created_at, oi.expires_at, oi.accepted_at, u.email::text
  from org_invites oi
  join roles r on r.key = oi.role
  left join auth.users u on u.id = oi.invited_by
  where oi.organization_id = v_org_id
  order by oi.created_at desc;
end;
$$;
grant execute on function list_org_invites() to authenticated;

create or replace function revoke_org_invite(p_invite_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  if not exists (select 1 from org_invites where id = p_invite_id and organization_id = v_org_id) then
    raise exception 'Invite not found';
  end if;

  update org_invites set revoked_at = now() where id = p_invite_id and accepted_at is null;
  perform _log_admin_action('revoke_org_invite', 'org_invite', p_invite_id::text, null);
end;
$$;
grant execute on function revoke_org_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Public read — the invite-accept page needs this before the visitor has
-- any session at all, same reasoning as verify_certificate().
-- ---------------------------------------------------------------------------

create or replace function get_invite_details(p_token text)
returns table (organization_name text, role_name text, email text, status text)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_row org_invites;
begin
  select * into v_row from org_invites where token = p_token;
  if v_row.id is null then
    return query select null::text, null::text, null::text, 'not_found';
    return;
  end if;

  return query
  select o.name, r.name, v_row.email,
    case
      when v_row.revoked_at is not null then 'revoked'
      when v_row.accepted_at is not null then 'accepted'
      when v_row.expires_at < now() then 'expired'
      else 'pending'
    end
  from organizations o, roles r
  where o.id = v_row.organization_id and r.key = v_row.role;
end;
$$;
grant execute on function get_invite_details(text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Org switch — how an *already-registered* account (email/password login,
-- an existing session, or a fresh-but-real Google OAuth signup that already
-- got its own default organization from handle_new_user()) redeems an
-- invite. Real simultaneous multi-org membership isn't built anywhere in
-- this codebase (every org-scoped RPC resolves "my organization" via
-- `memberships ... limit 1`), so this leaves whatever organization(s) the
-- caller is currently in and joins the invited one instead — exactly one
-- org at all times, same invariant as before, just reassignable. The old
-- organization and its data are left in place, just with one fewer member;
-- nothing is deleted.
-- ---------------------------------------------------------------------------

create or replace function switch_organization_via_invite(p_token text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_invite org_invites;
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then raise exception 'Not authenticated'; end if;

  select * into v_invite from org_invites
    where token = p_token
      and accepted_at is null
      and revoked_at is null
      and expires_at > now()
      and lower(email) = lower(v_email)
    limit 1;
  if v_invite.id is null then
    raise exception 'This invite is no longer valid for your account.';
  end if;

  if exists (select 1 from memberships where user_id = auth.uid() and organization_id = v_invite.organization_id) then
    raise exception 'You are already a member of this organization.';
  end if;

  delete from memberships where user_id = auth.uid();

  insert into memberships (user_id, organization_id, role)
  values (auth.uid(), v_invite.organization_id, v_invite.role);

  update org_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;

  perform _log_admin_action('switch_organization_via_invite', 'org_invite', v_invite.id::text, v_email);
end;
$$;
grant execute on function switch_organization_via_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- handle_new_user() — redeem a valid invite token instead of creating a
-- fresh organization, when one was passed at signup (options.data.invite_token).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_invite public.org_invites;
begin
  if new.raw_user_meta_data ? 'invite_token' then
    select * into v_invite from public.org_invites
      where token = new.raw_user_meta_data ->> 'invite_token'
        and accepted_at is null
        and revoked_at is null
        and expires_at > now()
        and lower(email) = lower(new.email)
      limit 1;
  end if;

  if v_invite.id is not null then
    insert into public.memberships (user_id, organization_id, role)
    values (new.id, v_invite.organization_id, v_invite.role);

    update public.org_invites
      set accepted_at = now(), accepted_by = new.id
      where id = v_invite.id;

    return new;
  end if;

  insert into public.organizations (name)
  values (coalesce(new.raw_user_meta_data ->> 'organization_name', 'My Organization'))
  returning id into v_org_id;

  insert into public.memberships (user_id, organization_id, role)
  values (new.id, v_org_id, 'ADMIN');

  return new;
end;
$$;
