-- Certificate Center — the real gap in an already-thorough certificate
-- system (real QR codes, real SHA-256 document hashes, a public /verify
-- portal, revocation support already in the schema since 0044): there was
-- no aggregate view. An org admin could only ever see their OWN
-- certificate (my_cybersachet_certificate / my_course_certificate) — never
-- every certificate issued across their team in one place, and no way to
-- revoke one (e.g. someone leaves, or a credential was issued in error)
-- without hand-editing the database. Adds exactly that, reusing the real
-- cybersachet_certificates table and certificate_hash/QR infrastructure
-- that already exists — no new "Instructor" or "Digital Signature" fields
-- invented, since neither concept exists in this LMS (courses aren't
-- taught by a named instructor, and certificate_hash already is the real,
-- honestly-scoped integrity check, not a fabricated PKI signature).

create or replace function list_organization_certificates()
returns table (
  certificate_no  text,
  user_id         uuid,
  holder_email    text,
  holder_name     text,
  level_code      text,
  course_title    text,
  average_score   int,
  hours_trained   numeric,
  issued_at       timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  certificate_hash text
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return; end if;

  return query
  select c.certificate_no, c.user_id, u.email::text, u.raw_user_meta_data ->> 'full_name',
    c.level_code, c.course_title, c.average_score, c.hours_trained, c.issued_at, c.expires_at, c.revoked_at, c.certificate_hash
  from cybersachet_certificates c
  join auth.users u on u.id = c.user_id
  where c.organization_id = v_org_id
  order by c.issued_at desc;
end;
$$;
grant execute on function list_organization_certificates() to authenticated;

create or replace function revoke_certificate(p_certificate_no text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_cert_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'training', 'manage') then
    raise exception 'Not authorized — training management access required';
  end if;

  select organization_id into v_cert_org_id from cybersachet_certificates where certificate_no = p_certificate_no;
  if v_cert_org_id is null then raise exception 'Certificate not found'; end if;
  if v_cert_org_id != v_org_id then raise exception 'That certificate does not belong to your organization'; end if;

  update cybersachet_certificates set revoked_at = now() where certificate_no = p_certificate_no;
  perform _log_admin_action('revoke_certificate', 'cybersachet_certificate', p_certificate_no, p_certificate_no);
end;
$$;
grant execute on function revoke_certificate(text) to authenticated;

create or replace function restore_certificate(p_certificate_no text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_cert_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'training', 'manage') then
    raise exception 'Not authorized — training management access required';
  end if;

  select organization_id into v_cert_org_id from cybersachet_certificates where certificate_no = p_certificate_no;
  if v_cert_org_id is null then raise exception 'Certificate not found'; end if;
  if v_cert_org_id != v_org_id then raise exception 'That certificate does not belong to your organization'; end if;

  update cybersachet_certificates set revoked_at = null where certificate_no = p_certificate_no;
  perform _log_admin_action('restore_certificate', 'cybersachet_certificate', p_certificate_no, p_certificate_no);
end;
$$;
grant execute on function restore_certificate(text) to authenticated;
