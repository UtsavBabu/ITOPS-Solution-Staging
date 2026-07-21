-- Real regression fix: migration 0072 added Academy-track (Cloud/DevOps)
-- courses into the same cybersachet_courses table CSSA eligibility counts
-- against. issue_cybersachet_certificate() counted every published course
-- regardless of track, so a security-training customer would now have to
-- also finish unrelated Cloud/DevOps Academy courses before their CSSA
-- (CyberSachet Security Awareness) certificate could be issued. CSSA has
-- only ever meant "finished the CyberSachet security-awareness catalog" —
-- scope both counts back to track = 'security'. Byte-faithful copy of the
-- 0051 body otherwise (same signature, same hashing, same flow).

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

  select count(*) into v_published_count from cybersachet_courses where published and track = 'security';
  select count(*), avg(quiz_score), sum(estimated_minutes) / 60.0
    into v_completed_count, v_avg_score, v_hours
    from cybersachet_enrollments e join cybersachet_courses c on c.id = e.course_id
    where e.user_id = auth.uid() and e.completed_at is not null and c.track = 'security';

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
grant execute on function issue_cybersachet_certificate() to authenticated;
