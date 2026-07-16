-- A real document hash for every certificate — SHA-256 over the
-- certificate's own actual fields (number, holder, course/level, score),
-- computed server-side with pgcrypto (already enabled in migration 0001).
-- This is honest tamper-evidence: change any of those fields and the hash
-- changes, so a printed certificate's hash can be compared against what
-- /verify shows right now. It is deliberately NOT labeled "blockchain" —
-- there's no blockchain behind it, and calling a plain hash "blockchain-
-- ready" would be exactly the kind of decoration-with-no-substance this
-- feature has avoided everywhere else. Recomputed whenever the underlying
-- record changes (a retaken quiz, a re-issued certificate), never at mere
-- fetch time, so looking at a certificate twice never changes its hash.

alter table cybersachet_certificates add column certificate_hash text;

drop function if exists issue_cybersachet_certificate();
create or replace function issue_cybersachet_certificate()
returns table (certificate_no text, average_score int, course_count int, hours_trained numeric, issued_at timestamptz, expires_at timestamptz, certificate_hash text)
language plpgsql security definer set search_path = public, pg_temp as $$
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

drop function if exists issue_course_certificate(uuid);
create or replace function issue_course_certificate(p_course_id uuid)
returns table (certificate_no text, course_title text, average_score int, hours_trained numeric, issued_at timestamptz, expires_at timestamptz, certificate_hash text)
language plpgsql security definer set search_path = public, pg_temp as $$
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

drop function if exists my_cybersachet_certificate();
create or replace function my_cybersachet_certificate()
returns table (
  certificate_no text, level_code text, average_score int, course_count int,
  hours_trained numeric, issued_at timestamptz, expires_at timestamptz, revoked_at timestamptz, certificate_hash text
)
language sql security definer stable set search_path = public, pg_temp as $$
  select certificate_no, level_code, average_score, course_count, hours_trained, issued_at, expires_at, revoked_at, certificate_hash
  from cybersachet_certificates where user_id = auth.uid() and level_code = 'CSSA';
$$;

drop function if exists my_course_certificate(uuid);
create or replace function my_course_certificate(p_course_id uuid)
returns table (
  certificate_no text, course_title text, average_score int,
  hours_trained numeric, issued_at timestamptz, expires_at timestamptz, revoked_at timestamptz, certificate_hash text
)
language sql security definer stable set search_path = public, pg_temp as $$
  select certificate_no, course_title, average_score, hours_trained, issued_at, expires_at, revoked_at, certificate_hash
  from cybersachet_certificates where user_id = auth.uid() and course_id = p_course_id;
$$;

drop function if exists verify_certificate(text);
create or replace function verify_certificate(p_certificate_no text)
returns table (
  valid boolean, user_name text, organization_name text, level_code text, course_title text,
  average_score int, issued_at timestamptz, expires_at timestamptz, revoked boolean, certificate_hash text
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_row record;
begin
  select c.*, o.name as org_name, u.raw_user_meta_data ->> 'full_name' as full_name, u.email
    into v_row
    from cybersachet_certificates c
    join organizations o on o.id = c.organization_id
    join auth.users u on u.id = c.user_id
    where c.certificate_no = p_certificate_no;

  if v_row.certificate_no is null then
    return query select false, null::text, null::text, null::text, null::text, null::int, null::timestamptz, null::timestamptz, null::boolean, null::text;
    return;
  end if;

  return query select
    v_row.revoked_at is null and v_row.expires_at > now(),
    coalesce(v_row.full_name, v_row.email),
    v_row.org_name,
    v_row.level_code,
    v_row.course_title,
    v_row.average_score,
    v_row.issued_at,
    v_row.expires_at,
    v_row.revoked_at is not null,
    v_row.certificate_hash;
end;
$$;

grant execute on function my_cybersachet_certificate() to authenticated;
grant execute on function issue_cybersachet_certificate() to authenticated;
grant execute on function my_course_certificate(uuid) to authenticated;
grant execute on function issue_course_certificate(uuid) to authenticated;
grant execute on function verify_certificate(text) to authenticated, anon;

-- Backfill a hash for the (likely nonexistent, since 0037-0046 aren't
-- deployed anywhere yet as of this writing) certificates issued before
-- this migration, so nothing shows a blank fingerprint.
update cybersachet_certificates set certificate_hash = encode(digest(
  certificate_no || '|' || user_id::text || '|' || coalesce(course_id::text, level_code) || '|' || average_score::text, 'sha256'
), 'hex') where certificate_hash is null;
