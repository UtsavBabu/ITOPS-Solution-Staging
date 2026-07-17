-- Real gap: plan_limits governs monitors, alert channels, history, and
-- hosts per package — but never team size. A Starter org could invite
-- unlimited members, identical to Enterprise. Adds a real seat limit,
-- enforced the same way monitor/host limits already are (checked inside
-- the RPC that actually adds someone, not just hidden in the UI), and
-- surfaced on the Current Usage panel so it's visible before it's hit.
--
-- Mirrors max_monitors' existing per-plan numbers for consistency (this
-- codebase already ties monitor/host caps to the same tier steps) rather
-- than inventing a new, unrelated number scheme.

alter table plan_limits add column if not exists max_members int not null default 100000;
update plan_limits set max_members = 3      where plan = 'STARTER';
update plan_limits set max_members = 25     where plan = 'PROFESSIONAL';
update plan_limits set max_members = 100    where plan = 'BUSINESS';
update plan_limits set max_members = 100000 where plan = 'ENTERPRISE';

-- A seat is "used" by an existing member or a live (pending, unexpired,
-- unrevoked) invite — an invite reserves the seat it was sent for so an
-- org can't oversell itself by sending more invites than it has room for.
create or replace function _org_seats_used(p_org_id uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select
    (select count(*)::int from memberships where organization_id = p_org_id)
    + (select count(*)::int from org_invites
         where organization_id = p_org_id and accepted_at is null and revoked_at is null and expires_at > now());
$$;

create or replace function create_org_invite(p_email text, p_role text)
returns table (id uuid, token text)
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_org_id uuid;
  v_email text;
  v_existing_id uuid;
  v_new_token text;
  v_plan text;
  v_max_members int;
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

  update org_invites set revoked_at = now()
    where organization_id = v_org_id and lower(email) = v_email
      and accepted_at is null and revoked_at is null and expires_at <= now();

  select oi.id into v_existing_id from org_invites oi
    where oi.organization_id = v_org_id and lower(oi.email) = v_email
      and oi.accepted_at is null and oi.revoked_at is null and oi.expires_at > now();

  -- Refreshing an existing invite reuses its already-reserved seat, so the
  -- seat-limit check only applies when this would reserve a new one.
  if v_existing_id is null then
    select o.plan, pl.max_members into v_plan, v_max_members
      from organizations o join plan_limits pl on pl.plan = o.plan where o.id = v_org_id;
    if _org_seats_used(v_org_id) >= v_max_members then
      raise exception '% plan allows up to % team members (including pending invites). Upgrade to add more.', v_plan, v_max_members;
    end if;
  end if;

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

create or replace function switch_organization_via_invite(p_token text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_invite org_invites;
  v_email text;
  v_plan text;
  v_max_members int;
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

  -- The invite already reserved its own seat at creation time; this only
  -- guards against the org having somehow filled up in the meantime (e.g.
  -- a downgrade after the invite was sent).
  select o.plan, pl.max_members into v_plan, v_max_members
    from organizations o join plan_limits pl on pl.plan = o.plan where o.id = v_invite.organization_id;
  if _org_seats_used(v_invite.organization_id) > v_max_members then
    raise exception 'This organization is at its %-plan member limit (%). Ask an admin to upgrade or free a seat first.', v_plan, v_max_members;
  end if;

  delete from memberships where user_id = auth.uid();

  insert into memberships (user_id, organization_id, role)
  values (auth.uid(), v_invite.organization_id, v_invite.role);

  update org_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;

  perform _log_admin_action('switch_organization_via_invite', 'org_invite', v_invite.id::text, v_email);
end;
$$;

-- get_plan_usage() gains max_members/current_members so the Current Usage
-- panel can show the same "N / max" bar it already shows for monitors and
-- alert channels — visible before the limit is hit, not just enforced
-- silently at invite time.
drop function if exists get_plan_usage();
create or replace function get_plan_usage()
returns table (
  plan text,
  max_monitors int,
  current_monitors int,
  max_alert_channels int,
  current_alert_channels int,
  history_days int,
  max_members int,
  current_members int
)
language sql security invoker stable set search_path = public, pg_temp as $$
  select
    o.plan,
    pl.max_monitors,
    (select count(*) from monitors where organization_id = o.id)::int,
    pl.max_alert_channels,
    (select count(*) from alert_channels where organization_id = o.id)::int,
    pl.history_days,
    pl.max_members,
    _org_seats_used(o.id)
  from organizations o
  join plan_limits pl on pl.plan = o.plan
  where o.id = (select organization_id from memberships where user_id = auth.uid() limit 1);
$$;
