-- Real package-based course access, replacing the binary free/paid gate.
--
-- Today a course is either free_tier=true (open on any plan) or not — every
-- non-free course is lumped into one undifferentiated tier, and the locked-
-- course UI hardcodes "Professional plan required" regardless of which
-- course it actually is. This adds a real ordinal min_plan on each course
-- (STARTER/PROFESSIONAL/BUSINESS/ENTERPRISE, same enum the rest of the
-- platform already bills on) so Business/Enterprise-only courses are
-- actually possible, and the required-plan label is always true.
--
-- free_tier stays as a real column (existing certificate-eligibility logic
-- and the admin course list already depend on its exact semantics) but is
-- now kept in lockstep with min_plan by the upsert RPC rather than being an
-- independently-set flag — min_plan is the single source of truth going
-- forward; free_tier = (min_plan = 'STARTER').

alter table cybersachet_courses
  add column if not exists min_plan text not null default 'PROFESSIONAL'
    check (min_plan in ('STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'));

update cybersachet_courses set min_plan = 'STARTER' where free_tier = true;

-- ---------------------------------------------------------------------------
-- Real tiered gate, replacing the binary "org is non-Starter OR course is
-- free" check. Ranks both sides on the same plan ladder used for billing.
-- ---------------------------------------------------------------------------

create or replace function _cybersachet_course_allowed(p_course_id uuid) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_plan text;
  v_min_plan text;
  v_rank constant text[] := array['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'];
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  select plan into v_plan from organizations where id = v_org_id;
  select min_plan into v_min_plan from cybersachet_courses where id = p_course_id;
  if v_min_plan is null then
    return true;
  end if;
  return array_position(v_rank, coalesce(v_plan, 'STARTER')) >= array_position(v_rank, v_min_plan);
end;
$$;

-- enroll_in_course / check_lesson_answer / submit_quiz all raised the same
-- hardcoded "requires the Professional package" text regardless of which
-- course or tier was actually gating it — now false for a Business- or
-- Enterprise-only course. Centralizing the real message here and pointing
-- all three call sites at it.
create or replace function _cybersachet_plan_required_message(p_course_id uuid) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_min_plan text;
  v_label text;
begin
  select min_plan into v_min_plan from cybersachet_courses where id = p_course_id;
  v_label := case v_min_plan
    when 'ENTERPRISE' then 'Enterprise'
    when 'BUSINESS' then 'Business'
    else 'Professional'
  end;
  return format('This course requires the %s package or above.', v_label);
end;
$$;

create or replace function enroll_in_course(p_course_id uuid)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_enrollment_id uuid;
begin
  if not my_cybersachet_license() then
    raise exception 'Your organization does not have an active CyberSachet license. Contact your administrator.';
  end if;
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

create or replace function check_lesson_answer(p_lesson_id uuid, p_choice_index int)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_course_id uuid;
  v_correct_index int;
  v_enrollment_id uuid;
  v_is_correct boolean;
begin
  select course_id, check_correct_index into v_course_id, v_correct_index from cybersachet_lessons where id = p_lesson_id;
  if v_course_id is null then raise exception 'Lesson not found'; end if;
  if not _cybersachet_course_allowed(v_course_id) then
    raise exception '%', _cybersachet_plan_required_message(v_course_id);
  end if;

  v_is_correct := v_correct_index is null or p_choice_index = v_correct_index;
  if not v_is_correct then
    return false;
  end if;

  select id into v_enrollment_id from cybersachet_enrollments where user_id = auth.uid() and course_id = v_course_id;
  if v_enrollment_id is null then
    v_enrollment_id := enroll_in_course(v_course_id);
  end if;

  insert into cybersachet_lesson_progress (enrollment_id, lesson_id)
  values (v_enrollment_id, p_lesson_id)
  on conflict (enrollment_id, lesson_id) do nothing;

  return true;
end;
$$;

create or replace function submit_quiz(p_course_id uuid, p_answers jsonb)
returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_enrollment_id uuid;
  v_total int;
  v_correct int := 0;
  v_score int;
  v_q record;
  v_given_single int;
  v_given_arr int[];
  v_correct_arr int[];
begin
  if not _cybersachet_course_allowed(p_course_id) then
    raise exception '%', _cybersachet_plan_required_message(p_course_id);
  end if;

  select id into v_enrollment_id from cybersachet_enrollments where user_id = auth.uid() and course_id = p_course_id;
  if v_enrollment_id is null then
    v_enrollment_id := enroll_in_course(p_course_id);
  end if;

  select count(*) into v_total from cybersachet_quiz_questions where course_id = p_course_id;
  if v_total = 0 then raise exception 'This course has no quiz'; end if;

  for v_q in select id, question_type, correct_index, correct_indexes, correct_order from cybersachet_quiz_questions where course_id = p_course_id loop
    if v_q.question_type = 'single' then
      v_given_single := (p_answers ->> v_q.id::text)::int;
      if v_given_single = v_q.correct_index then v_correct := v_correct + 1; end if;
    elsif v_q.question_type = 'multiple' then
      select array_agg(elem::int order by elem::int) into v_given_arr
      from jsonb_array_elements_text(coalesce(p_answers -> v_q.id::text, '[]'::jsonb)) as elem;
      select array_agg(x order by x) into v_correct_arr from unnest(v_q.correct_indexes) x;
      if v_given_arr is not distinct from v_correct_arr then v_correct := v_correct + 1; end if;
    elsif v_q.question_type = 'ordering' then
      -- WITH ORDINALITY guarantees the learner's submitted sequence survives
      -- in order — array_agg alone never guarantees row order without it.
      select array_agg(elem::int order by ord) into v_given_arr
      from jsonb_array_elements_text(coalesce(p_answers -> v_q.id::text, '[]'::jsonb)) with ordinality as t(elem, ord);
      if v_given_arr is not distinct from v_q.correct_order then v_correct := v_correct + 1; end if;
    end if;
  end loop;

  v_score := round(v_correct::numeric / v_total * 100);

  update cybersachet_enrollments
  set quiz_score = v_score, completed_at = case when v_score >= 70 then now() else completed_at end
  where id = v_enrollment_id;

  return v_score;
end;
$$;

-- ---------------------------------------------------------------------------
-- Read RPCs — add min_plan to the returned shape.
-- ---------------------------------------------------------------------------

drop function if exists list_cybersachet_courses();
create or replace function list_cybersachet_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, sort_order int, category text, free_tier boolean, min_plan text,
  lesson_count bigint, quiz_question_count bigint
)
language sql security definer stable set search_path = public, pg_temp as $$
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.sort_order, c.category, c.free_tier, c.min_plan,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_quiz_questions q where q.course_id = c.id)
  from cybersachet_courses c
  where c.published
  order by c.sort_order;
$$;
grant execute on function list_cybersachet_courses() to authenticated;

drop function if exists admin_list_cybersachet_courses();
create or replace function admin_list_cybersachet_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, published boolean, sort_order int, category text, free_tier boolean, min_plan text,
  lesson_count bigint, quiz_question_count bigint, enrollment_count bigint
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.published, c.sort_order, c.category, c.free_tier, c.min_plan,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_quiz_questions q where q.course_id = c.id),
    (select count(*) from cybersachet_enrollments e where e.course_id = c.id)
  from cybersachet_courses c
  order by c.sort_order;
end;
$$;
grant execute on function admin_list_cybersachet_courses() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_upsert_cybersachet_course — accepts min_plan, derives free_tier from
-- it so every existing consumer of free_tier stays correct automatically.
-- ---------------------------------------------------------------------------

drop function if exists admin_upsert_cybersachet_course(uuid, text, text, text, text, int, boolean, int, text, boolean);
create or replace function admin_upsert_cybersachet_course(
  p_id uuid, p_slug text, p_title text, p_description text, p_level text,
  p_estimated_minutes int, p_published boolean, p_sort_order int,
  p_category text default 'security-awareness', p_min_plan text default 'PROFESSIONAL'
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_free_tier boolean;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_min_plan not in ('STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE') then
    raise exception 'Invalid plan tier: %', p_min_plan;
  end if;
  v_free_tier := (p_min_plan = 'STARTER');

  if p_id is null then
    insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order, category, min_plan, free_tier)
    values (p_slug, p_title, p_description, p_level, p_estimated_minutes, p_published, p_sort_order, p_category, p_min_plan, v_free_tier)
    returning id into v_id;
  else
    update cybersachet_courses set
      slug = p_slug, title = p_title, description = p_description, level = p_level,
      estimated_minutes = p_estimated_minutes, published = p_published, sort_order = p_sort_order,
      category = p_category, min_plan = p_min_plan, free_tier = v_free_tier, updated_at = now()
    where id = p_id
    returning id into v_id;
  end if;

  perform _log_admin_action(case when p_id is null then 'create_course' else 'update_course' end, 'cybersachet_course', v_id::text, p_title);
  return v_id;
end;
$$;
grant execute on function admin_upsert_cybersachet_course(uuid, text, text, text, text, int, boolean, int, text, text) to authenticated;
