-- Per-course completion certificates, alongside the existing overall CSSA
-- certificate (migration 0044). A learner asking "where's the certificate
-- for THIS course" after finishing it — not after finishing the entire
-- catalog — is a real, common LMS pattern (Coursera issues a certificate
-- per course, plus one for a whole Specialization; this platform now does
-- the same: a certificate per course, plus CSSA for completing all of
-- them). Reuses the existing cybersachet_certificates table, RLS,
-- verify_certificate() and admin revoke path rather than building a
-- parallel system — a course certificate is just another row, with
-- course_id set and level_code = 'COURSE' instead of 'CSSA'.

alter table cybersachet_certificates
  add column course_id uuid references cybersachet_courses(id) on delete cascade,
  add column course_title text;

-- The original `unique (user_id, level_code)` assumed one certificate per
-- level ever — true for the single overall CSSA row, but a user can now
-- hold many 'COURSE' rows (one per course). Replace it with two partial
-- indexes: at most one overall CSSA row per user, and at most one
-- certificate per (user, course).
alter table cybersachet_certificates drop constraint if exists cybersachet_certificates_user_id_level_code_key;
create unique index cybersachet_certificates_overall_uidx on cybersachet_certificates(user_id, level_code) where course_id is null;
create unique index cybersachet_certificates_course_uidx on cybersachet_certificates(user_id, course_id) where course_id is not null;

create or replace function my_course_certificate(p_course_id uuid)
returns table (
  certificate_no text, course_title text, average_score int,
  hours_trained numeric, issued_at timestamptz, expires_at timestamptz, revoked_at timestamptz
)
language sql security definer stable set search_path = public, pg_temp as $$
  select certificate_no, course_title, average_score, hours_trained, issued_at, expires_at, revoked_at
  from cybersachet_certificates where user_id = auth.uid() and course_id = p_course_id;
$$;
grant execute on function my_course_certificate(uuid) to authenticated;

-- Issues (or re-fetches / re-scores, if one already exists) a certificate
-- for one specific completed course. Unlike the overall CSSA certificate,
-- this isn't gated on plan tier beyond what enrollment itself already
-- enforces — a Starter org's two free_tier courses earn a real, honest
-- certificate too; a Starter learner simply can never complete (and thus
-- never certificate) a non-free course, because enroll_in_course/
-- submit_quiz already refuse those (migration 0045's
-- _cybersachet_course_allowed).
create or replace function issue_course_certificate(p_course_id uuid)
returns table (certificate_no text, course_title text, average_score int, hours_trained numeric, issued_at timestamptz, expires_at timestamptz)
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
    update cybersachet_certificates set average_score = v_score, course_title = v_course_title
    where user_id = auth.uid() and course_id = p_course_id;
    v_cert_no := v_existing;
  else
    select count(*) + 1 into v_seq from cybersachet_certificates where course_id is not null;
    v_cert_no := 'CRS-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    insert into cybersachet_certificates (certificate_no, organization_id, user_id, level_code, course_id, course_title, average_score, course_count, hours_trained, expires_at)
    values (v_cert_no, v_org_id, auth.uid(), 'COURSE', p_course_id, v_course_title, v_score, 1, round(v_estimated_minutes / 60.0, 1), now() + interval '1 year');
    perform _log_admin_action('issue_course_certificate', 'cybersachet_certificate', v_cert_no, v_course_title);
  end if;

  return query select certificate_no, course_title, average_score, hours_trained, issued_at, expires_at
    from cybersachet_certificates where certificate_no = v_cert_no;
end;
$$;
grant execute on function issue_course_certificate(uuid) to authenticated;

-- verify_certificate() return shape changes (adds course_title) — the same
-- drop-then-create rule as every other return-shape change in this feature.
drop function if exists verify_certificate(text);
create or replace function verify_certificate(p_certificate_no text)
returns table (
  valid boolean, user_name text, organization_name text, level_code text, course_title text,
  average_score int, issued_at timestamptz, expires_at timestamptz, revoked boolean
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
    return query select false, null::text, null::text, null::text, null::text, null::int, null::timestamptz, null::timestamptz, null::boolean;
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
    v_row.revoked_at is not null;
end;
$$;
grant execute on function verify_certificate(text) to authenticated, anon;
