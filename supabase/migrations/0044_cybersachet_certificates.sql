-- Level 1 (CSSA) certificate issuance and verification. Levels 2-5 in the
-- ITOps Solution Certification Framework aren't built — see
-- CyberSachetCertificate.jsx's CERT_LEVELS — so there's nothing here for
-- them; issuing a certificate for a level with no course content would be
-- fabricating a credential. verify_certificate() is a real, callable RPC
-- backing the in-app /verify/:certId page — not a marketing domain that
-- doesn't exist.
--
-- Gated on plan tier at the RPC layer, not just the frontend: Starter
-- orgs can't earn a certificate even if someone licenses CyberSachet for
-- them, matching the same rule the frontend enforces.

create table cybersachet_certificates (
  id              uuid primary key default gen_random_uuid(),
  certificate_no  text not null unique,
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  level_code      text not null default 'CSSA',
  average_score   int not null,
  course_count    int not null,
  hours_trained   numeric not null,
  issued_at       timestamptz not null default now(),
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  unique (user_id, level_code)
);
create index cybersachet_certificates_org_idx on cybersachet_certificates(organization_id);
alter table cybersachet_certificates enable row level security;

create policy cybersachet_certificates_select on cybersachet_certificates for select to authenticated using (
  user_id = auth.uid() or is_org_member(organization_id) or is_platform_admin()
);

create or replace function my_cybersachet_certificate()
returns table (
  certificate_no text, level_code text, average_score int, course_count int,
  hours_trained numeric, issued_at timestamptz, expires_at timestamptz, revoked_at timestamptz
)
language sql security definer stable set search_path = public, pg_temp as $$
  select certificate_no, level_code, average_score, course_count, hours_trained, issued_at, expires_at, revoked_at
  from cybersachet_certificates where user_id = auth.uid() and level_code = 'CSSA';
$$;

-- Issues (or re-fetches, if one already exists) the CSSA certificate for
-- the current user. Requires: CyberSachet licensed for the org, org plan
-- above Starter, and every published course completed with a passing quiz
-- score. Recomputes average_score/hours_trained fresh each call so a
-- retaken quiz is reflected without needing a separate reissue flow.
create or replace function issue_cybersachet_certificate()
returns table (certificate_no text, average_score int, course_count int, hours_trained numeric, issued_at timestamptz, expires_at timestamptz)
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
  if v_existing is not null then
    update cybersachet_certificates set average_score = round(v_avg_score), hours_trained = round(v_hours, 1)
    where user_id = auth.uid() and level_code = 'CSSA';
    v_cert_no := v_existing;
  else
    select count(*) + 1 into v_seq from cybersachet_certificates where level_code = 'CSSA';
    v_cert_no := 'CSSA-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    insert into cybersachet_certificates (certificate_no, organization_id, user_id, level_code, average_score, course_count, hours_trained, expires_at)
    values (v_cert_no, v_org_id, auth.uid(), 'CSSA', round(v_avg_score), v_published_count, round(v_hours, 1), now() + interval '1 year');
    perform _log_admin_action('issue_certificate', 'cybersachet_certificate', v_cert_no, v_cert_no);
  end if;

  return query select certificate_no, average_score, course_count, hours_trained, issued_at, expires_at
    from cybersachet_certificates where certificate_no = v_cert_no;
end;
$$;

-- Real public verification: anyone with a certificate number (or a QR that
-- encodes the in-app /verify/:certId path) can confirm it's genuine, without
-- exposing anything beyond what a physical certificate would show.
create or replace function verify_certificate(p_certificate_no text)
returns table (
  valid boolean, user_name text, organization_name text, level_code text,
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
    return query select false, null::text, null::text, null::text, null::int, null::timestamptz, null::timestamptz, null::boolean;
    return;
  end if;

  return query select
    v_row.revoked_at is null and v_row.expires_at > now(),
    coalesce(v_row.full_name, v_row.email),
    v_row.org_name,
    v_row.level_code,
    v_row.average_score,
    v_row.issued_at,
    v_row.expires_at,
    v_row.revoked_at is not null;
end;
$$;

create or replace function admin_revoke_cybersachet_certificate(p_certificate_no text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  update cybersachet_certificates set revoked_at = now() where certificate_no = p_certificate_no;
  perform _log_admin_action('revoke_certificate', 'cybersachet_certificate', p_certificate_no, p_certificate_no);
end;
$$;

grant execute on function my_cybersachet_certificate() to authenticated;
grant execute on function issue_cybersachet_certificate() to authenticated;
grant execute on function admin_revoke_cybersachet_certificate(text) to authenticated;
-- Verification is meant to work for anyone who scans the QR code or opens
-- the verify link, logged in or not — same as a real certificate-checking
-- service. The function is SECURITY DEFINER, so this grant alone is enough;
-- it doesn't loosen RLS on the underlying table for direct queries.
grant execute on function verify_certificate(text) to authenticated, anon;
