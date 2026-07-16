-- Real bug found during first-ever live deployment of 0012/0048/0050 to this
-- project: pgcrypto (digest(), gen_random_bytes()) lives in Supabase's
-- `extensions` schema, not `public`. Every SECURITY DEFINER function here
-- explicitly pins `search_path = public, pg_temp` (migration 0003's fix for
-- search_path hijacking) — correct practice, but it means none of these
-- functions could ever see `extensions`, so any pgcrypto call inside one
-- fails with "function ... does not exist" the moment it actually runs,
-- regardless of how long the function had been sitting deployed. Top-level
-- migration statements didn't show this (the connecting role's own default
-- search_path already includes `extensions`), which is why this went
-- unnoticed until these functions were actually exercised live. Fixed by
-- adding `extensions` to each affected function's own search_path — nothing
-- else changes; same signatures, same bodies.

create or replace function create_org_invite(p_email text, p_role text)
returns table (id uuid, token text)
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
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

create or replace function issue_cybersachet_certificate()
returns table (certificate_no text, average_score int, course_count int, hours_trained numeric, issued_at timestamptz, expires_at timestamptz, certificate_hash text)
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_org_id uuid;
  v_plan text;
  v_published_count int;
  v_completed_count int;
  v_avg_score numeric;
  v_hours numeric;
  v_existing text;
  v_cert_no text;
  v_seq int;
  v_hash text;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  select plan into v_plan from organizations where id = v_org_id;
  if v_plan = 'STARTER' then
    raise exception 'CyberSachet certificates require the Professional package or above.';
  end if;
  if not my_cybersachet_license() then
    raise exception 'Your organization does not have an active CyberSachet license.';
  end if;

  select count(*) into v_published_count from cybersachet_courses where published;
  select count(*), avg(quiz_score), sum(estimated_minutes) / 60.0
    into v_completed_count, v_avg_score, v_hours
    from cybersachet_enrollments e join cybersachet_courses c on c.id = e.course_id
    where e.user_id = auth.uid() and e.completed_at is not null;

  if v_completed_count < v_published_count or v_published_count = 0 then
    raise exception 'Complete every published course (%/%) before a certificate can be issued.', coalesce(v_completed_count, 0), v_published_count;
  end if;

  select certificate_no into v_existing from cybersachet_certificates where user_id = auth.uid() and level_code = 'CSSA';
  v_hash := encode(digest(coalesce(v_existing, 'NEW') || '|' || auth.uid()::text || '|CSSA|' || round(v_avg_score)::text || '|' || v_published_count::text, 'sha256'), 'hex');

  if v_existing is not null then
    update cybersachet_certificates set average_score = round(v_avg_score), hours_trained = round(v_hours, 1), certificate_hash = v_hash
    where user_id = auth.uid() and level_code = 'CSSA';
    v_cert_no := v_existing;
  else
    select count(*) + 1 into v_seq from cybersachet_certificates where level_code = 'CSSA';
    v_cert_no := 'CSSA-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    v_hash := encode(digest(v_cert_no || '|' || auth.uid()::text || '|CSSA|' || round(v_avg_score)::text || '|' || v_published_count::text, 'sha256'), 'hex');
    insert into cybersachet_certificates (certificate_no, organization_id, user_id, level_code, average_score, course_count, hours_trained, expires_at, certificate_hash)
    values (v_cert_no, v_org_id, auth.uid(), 'CSSA', round(v_avg_score), v_published_count, round(v_hours, 1), now() + interval '1 year', v_hash);
    perform _log_admin_action('issue_certificate', 'cybersachet_certificate', v_cert_no, v_cert_no);
  end if;

  return query select certificate_no, average_score, course_count, hours_trained, issued_at, expires_at, certificate_hash
    from cybersachet_certificates where certificate_no = v_cert_no;
end;
$$;

create or replace function issue_course_certificate(p_course_id uuid)
returns table (certificate_no text, course_title text, average_score int, hours_trained numeric, issued_at timestamptz, expires_at timestamptz, certificate_hash text)
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_org_id uuid;
  v_course_title text;
  v_estimated_minutes int;
  v_score int;
  v_completed_at timestamptz;
  v_existing text;
  v_cert_no text;
  v_seq int;
  v_hash text;
begin
  if not my_cybersachet_license() then
    raise exception 'Your organization does not have an active CyberSachet license.';
  end if;

  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  select title, estimated_minutes into v_course_title, v_estimated_minutes from cybersachet_courses where id = p_course_id and published;
  if v_course_title is null then raise exception 'Course not found'; end if;

  select quiz_score, completed_at into v_score, v_completed_at
    from cybersachet_enrollments where user_id = auth.uid() and course_id = p_course_id;
  if v_completed_at is null then
    raise exception 'Complete this course''s quiz with a passing score before a certificate can be issued.';
  end if;

  select certificate_no into v_existing from cybersachet_certificates where user_id = auth.uid() and course_id = p_course_id;
  if v_existing is not null then
    v_hash := encode(digest(v_existing || '|' || auth.uid()::text || '|' || p_course_id::text || '|' || v_score::text, 'sha256'), 'hex');
    update cybersachet_certificates set average_score = v_score, course_title = v_course_title, certificate_hash = v_hash
    where user_id = auth.uid() and course_id = p_course_id;
    v_cert_no := v_existing;
  else
    select count(*) + 1 into v_seq from cybersachet_certificates where course_id is not null;
    v_cert_no := 'CRS-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    v_hash := encode(digest(v_cert_no || '|' || auth.uid()::text || '|' || p_course_id::text || '|' || v_score::text, 'sha256'), 'hex');
    insert into cybersachet_certificates (certificate_no, organization_id, user_id, level_code, course_id, course_title, average_score, course_count, hours_trained, expires_at, certificate_hash)
    values (v_cert_no, v_org_id, auth.uid(), 'COURSE', p_course_id, v_course_title, v_score, 1, round(v_estimated_minutes / 60.0, 1), now() + interval '1 year', v_hash);
    perform _log_admin_action('issue_course_certificate', 'cybersachet_certificate', v_cert_no, v_course_title);
  end if;

  return query select certificate_no, course_title, average_score, hours_trained, issued_at, expires_at, certificate_hash
    from cybersachet_certificates where certificate_no = v_cert_no;
end;
$$;

create or replace function create_host_agent(p_name text, p_hostname text default null)
returns host_agents
language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare
  v_org_id uuid;
  v_host   host_agents;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Host name is required';
  end if;

  insert into host_agents (organization_id, name, hostname)
  values (v_org_id, p_name, nullif(trim(coalesce(p_hostname, '')), ''))
  returning * into v_host;

  return v_host;
end;
$$;

create or replace function regenerate_host_agent_key(p_id uuid)
returns host_agents
language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare
  v_org_id uuid;
  v_host   host_agents;
begin
  select organization_id into v_org_id from host_agents where id = p_id;
  if v_org_id is null or not is_org_member(v_org_id) then
    raise exception 'Host not found or not authorized';
  end if;
  update host_agents
  set ingest_key = encode(gen_random_bytes(24), 'hex')
  where id = p_id
  returning * into v_host;
  return v_host;
end;
$$;
