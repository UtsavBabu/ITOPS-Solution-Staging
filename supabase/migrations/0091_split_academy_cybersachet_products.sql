-- The real architectural gap: Academy and CyberSachet have always been
-- content TRACKS (cybersachet_courses.track) sharing one license flag —
-- every training RPC checks product_key = 'cybersachet' regardless of
-- which track the course being accessed actually belongs to (see
-- migration 0072's own comment: "one real per-org training license
-- unlocks both distinctly-branded catalogs"). That was a deliberate,
-- honestly-labeled shortcut at the time; this migration makes them
-- genuinely independent, separately-licensable products, matching the
-- existing 6-product catalog/toggle pattern in AdminCustomers.jsx exactly
-- (admin_list_org_products/admin_set_org_product already iterate the
-- `products` table generically — adding this row is enough for the
-- existing Platform Admin UI to offer it with zero frontend changes).
--
-- Deliberately NOT grandfathered: an org that only ever licensed
-- 'cybersachet' will no longer see Academy content until a platform
-- admin explicitly grants 'academy' too — that's the whole point of
-- "separate products, purchased separately." These migrations haven't
-- been deployed yet, so there's no live customer this actually affects.

insert into products (key, name, description, sort_order) values
  ('academy', 'Moonsav ITOps Academy', 'Cloud, DevOps, and infrastructure training — labs, interview prep, and certificates.', 6)
on conflict (key) do nothing;

create or replace function my_academy_license()
returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1
    from memberships m
    join organization_products op on op.organization_id = m.organization_id
    where m.user_id = auth.uid() and op.product_key = 'academy' and op.status = 'active'
  );
$$;
grant execute on function my_academy_license() to authenticated;

-- The one real per-course access gate, usable both by a member acting on
-- their own org (auth.uid()) and by a platform admin acting on an
-- arbitrary target org — checks the product matching the course's own
-- track, then plan tier, so "requires the Business package" can never be
-- shown for a course the org hasn't even licensed the product for.
create or replace function _org_course_allowed(p_org_id uuid, p_course_id uuid) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_track text;
  v_min_plan text;
  v_required_product text;
  v_plan text;
  v_rank constant text[] := array['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'];
begin
  select track, min_plan into v_track, v_min_plan from cybersachet_courses where id = p_course_id;
  if v_track is null then return false; end if;
  v_required_product := case when v_track = 'academy' then 'academy' else 'cybersachet' end;
  if not exists (select 1 from organization_products where organization_id = p_org_id and product_key = v_required_product and status = 'active') then
    return false;
  end if;
  if v_min_plan is null then return true; end if;
  select plan into v_plan from organizations where id = p_org_id;
  return array_position(v_rank, coalesce(v_plan, 'STARTER')) >= array_position(v_rank, v_min_plan);
end;
$$;
grant execute on function _org_course_allowed(uuid, uuid) to authenticated;

create or replace function _cybersachet_course_allowed(p_course_id uuid) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return false; end if;
  return _org_course_allowed(v_org_id, p_course_id);
end;
$$;

-- Distinguishes "you don't have this product licensed at all" from "you
-- have it licensed but need a higher plan" — the two now-separate real
-- failure reasons _org_course_allowed can return false for.
create or replace function _cybersachet_plan_required_message(p_course_id uuid) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_track text;
  v_min_plan text;
  v_required_product text;
  v_label text;
begin
  select track, min_plan into v_track, v_min_plan from cybersachet_courses where id = p_course_id;
  v_required_product := case when v_track = 'academy' then 'academy' else 'cybersachet' end;
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null or not exists (select 1 from organization_products where organization_id = v_org_id and product_key = v_required_product and status = 'active') then
    return case when v_required_product = 'academy'
      then 'Your organization does not have an active Moonsav ITOps Academy license. Contact your administrator.'
      else 'Your organization does not have an active CyberSachet license. Contact your administrator.'
    end;
  end if;
  v_label := case v_min_plan
    when 'ENTERPRISE' then 'Enterprise'
    when 'BUSINESS' then 'Business'
    else 'Professional'
  end;
  return format('This course requires the %s package or above.', v_label);
end;
$$;

-- ---------------------------------------------------------------------------
-- Every RPC that previously gated on the blanket my_cybersachet_license()
-- or a literal product_key = 'cybersachet' check, regardless of the
-- course's actual track, now goes through the track-aware check above.
-- Signatures are unchanged throughout, so plain CREATE OR REPLACE is safe
-- everywhere — no drop-and-recreate needed.
-- ---------------------------------------------------------------------------

create or replace function enroll_in_course(p_course_id uuid)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_enrollment_id uuid;
begin
  if not exists (select 1 from cybersachet_courses where id = p_course_id and published) then
    raise exception 'Course not found';
  end if;
  if not _cybersachet_course_allowed(p_course_id) then
    raise exception '%', _cybersachet_plan_required_message(p_course_id);
  end if;

  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;

  insert into cybersachet_enrollments (organization_id, user_id, course_id)
  values (v_org_id, auth.uid(), p_course_id)
  on conflict (user_id, course_id) do update set user_id = excluded.user_id
  returning id into v_enrollment_id;

  return v_enrollment_id;
end;
$$;

create or replace function list_course_modules(p_course_id uuid)
returns table (id uuid, title text, sort_order int, interview_questions jsonb)
language sql security definer stable set search_path = public, pg_temp as $$
  select m.id, m.title, m.sort_order, m.interview_questions
  from cybersachet_modules m
  join cybersachet_courses c on c.id = m.course_id
  where m.course_id = p_course_id and c.published and _cybersachet_course_allowed(c.id)
  order by m.sort_order;
$$;

create or replace function list_course_lessons(p_course_id uuid)
returns table (id uuid, title text, body text, sort_order int, module_id uuid, key_takeaway text, check_question text, check_choices jsonb, lab jsonb)
language sql security definer stable set search_path = public, pg_temp as $$
  select l.id, l.title, l.body, l.sort_order, l.module_id, l.key_takeaway, l.check_question, l.check_choices, l.lab
  from cybersachet_lessons l
  join cybersachet_courses c on c.id = l.course_id
  where l.course_id = p_course_id and c.published and _cybersachet_course_allowed(c.id)
  order by l.sort_order;
$$;

create or replace function list_course_quiz(p_course_id uuid)
returns table (id uuid, question text, choices jsonb, question_type text, sort_order int)
language sql security definer stable set search_path = public, pg_temp as $$
  select q.id, q.question, q.choices, q.question_type, q.sort_order
  from cybersachet_quiz_questions q
  join cybersachet_courses c on c.id = q.course_id
  where q.course_id = p_course_id and c.published and _cybersachet_course_allowed(c.id)
  order by q.sort_order;
$$;

create or replace function assign_cybersachet_course(p_user_id uuid, p_course_id uuid, p_due_at timestamptz default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_user_email text;
  v_course_title text;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'training', 'manage') then
    raise exception 'Not authorized — training management access required';
  end if;
  if not _org_course_allowed(v_org_id, p_course_id) then
    raise exception '%', _cybersachet_plan_required_message(p_course_id);
  end if;
  if not exists (select 1 from memberships where organization_id = v_org_id and user_id = p_user_id) then
    raise exception 'That user is not a member of your organization';
  end if;

  select email into v_user_email from auth.users where id = p_user_id;
  select title into v_course_title from cybersachet_courses where id = p_course_id;
  if v_course_title is null then raise exception 'Course not found'; end if;

  insert into cybersachet_assignments (organization_id, user_id, course_id, assigned_by, due_at)
  values (v_org_id, p_user_id, p_course_id, auth.uid(), p_due_at)
  on conflict (user_id, course_id) do update set due_at = excluded.due_at, assigned_by = excluded.assigned_by, assigned_at = now();

  perform _log_admin_action('assign_cybersachet_course', 'cybersachet_assignment', v_org_id::text, coalesce(v_user_email, 'user') || ' — ' || v_course_title);
end;
$$;

create or replace function bulk_assign_cybersachet_course(p_course_id uuid, p_department_id uuid default null, p_team_id uuid default null, p_due_at timestamptz default null)
returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_course_title text;
  v_target_label text;
  v_count int := 0;
begin
  if p_department_id is null and p_team_id is null then
    raise exception 'Pick a department or a team to assign to';
  end if;

  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'training', 'manage') then
    raise exception 'Not authorized — training management access required';
  end if;
  if not _org_course_allowed(v_org_id, p_course_id) then
    raise exception '%', _cybersachet_plan_required_message(p_course_id);
  end if;

  select title into v_course_title from cybersachet_courses where id = p_course_id;
  if v_course_title is null then raise exception 'Course not found'; end if;

  if p_team_id is not null then
    if not exists (select 1 from teams where id = p_team_id and organization_id = v_org_id) then
      raise exception 'Team not found';
    end if;
    select name into v_target_label from teams where id = p_team_id;
  else
    if not exists (select 1 from departments where id = p_department_id and organization_id = v_org_id) then
      raise exception 'Department not found';
    end if;
    select name into v_target_label from departments where id = p_department_id;
  end if;

  insert into cybersachet_assignments (organization_id, user_id, course_id, assigned_by, due_at)
  select v_org_id, m.user_id, p_course_id, auth.uid(), p_due_at
  from memberships m
  where m.organization_id = v_org_id
    and (
      (p_team_id is not null and m.team_id = p_team_id)
      or (p_team_id is null and m.department_id = p_department_id)
    )
  on conflict (user_id, course_id) do update set due_at = excluded.due_at, assigned_by = excluded.assigned_by, assigned_at = now();
  get diagnostics v_count = row_count;

  perform _log_admin_action('bulk_assign_cybersachet_course', 'cybersachet_assignment', v_org_id::text,
    v_count::text || ' member(s) in ' || coalesce(v_target_label, 'group') || ' — ' || v_course_title);
  return v_count;
end;
$$;

create or replace function admin_assign_cybersachet_course(p_organization_id uuid, p_user_id uuid, p_course_id uuid, p_due_at timestamptz default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_name text;
  v_user_email text;
  v_course_title text;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if not _org_course_allowed(p_organization_id, p_course_id) then
    raise exception '%', _cybersachet_plan_required_message(p_course_id);
  end if;
  if not exists (select 1 from memberships where organization_id = p_organization_id and user_id = p_user_id) then
    raise exception 'That user is not a member of this organization';
  end if;

  select name into v_org_name from organizations where id = p_organization_id;
  select email into v_user_email from auth.users where id = p_user_id;
  select title into v_course_title from cybersachet_courses where id = p_course_id;
  if v_course_title is null then raise exception 'Course not found'; end if;

  insert into cybersachet_assignments (organization_id, user_id, course_id, assigned_by, due_at)
  values (p_organization_id, p_user_id, p_course_id, auth.uid(), p_due_at)
  on conflict (user_id, course_id) do update set due_at = excluded.due_at, assigned_by = excluded.assigned_by, assigned_at = now();

  perform _log_admin_action('assign_cybersachet_course', 'cybersachet_assignment', p_organization_id::text, v_org_name || ' — ' || coalesce(v_user_email, 'user') || ' — ' || v_course_title);
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
  if not _cybersachet_course_allowed(p_course_id) then
    raise exception '%', _cybersachet_plan_required_message(p_course_id);
  end if;

  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  select title, estimated_minutes into v_course_title, v_estimated_minutes from cybersachet_courses where id = p_course_id and published;
  if v_course_title is null then raise exception 'Course not found'; end if;

  select quiz_score, completed_at into v_score, v_completed_at
    from cybersachet_enrollments where user_id = auth.uid() and course_id = p_course_id;
  if v_completed_at is null then
    raise exception 'Complete this course''s quiz with a passing score before a certificate can be issued.';
  end if;

  select cc.certificate_no into v_existing from cybersachet_certificates cc where cc.user_id = auth.uid() and cc.course_id = p_course_id;
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

  return query select cc.certificate_no, cc.course_title, cc.average_score, cc.hours_trained, cc.issued_at, cc.expires_at, cc.certificate_hash
    from cybersachet_certificates cc where cc.certificate_no = v_cert_no;
end;
$$;
