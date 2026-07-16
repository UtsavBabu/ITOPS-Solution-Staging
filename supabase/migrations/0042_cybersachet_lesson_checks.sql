-- Fixes a real integrity gap: `complete_lesson()` (0037) let anyone mark a
-- lesson "done" with a single unguarded RPC call — nothing verified they'd
-- read anything. Adds a one-question comprehension check per lesson;
-- completing a lesson now requires answering it correctly. Mirrors the
-- existing quiz security boundary: choices are readable, the correct
-- answer isn't — verification happens server-side in check_lesson_answer().

alter table cybersachet_lessons
  add column check_question text,
  add column check_choices jsonb,
  add column check_correct_index int;

-- Replaces list_course_lessons() to also expose the check question/choices
-- (never check_correct_index — same boundary list_course_quiz() already
-- enforces for the end-of-course quiz).
drop function if exists list_course_lessons(uuid);
create or replace function list_course_lessons(p_course_id uuid)
returns table (id uuid, title text, body text, sort_order int, check_question text, check_choices jsonb)
language sql security definer stable set search_path = public, pg_temp as $$
  select l.id, l.title, l.body, l.sort_order, l.check_question, l.check_choices
  from cybersachet_lessons l
  join cybersachet_courses c on c.id = l.course_id
  where l.course_id = p_course_id and c.published
  order by l.sort_order;
$$;

-- Replaces the old self-report complete_lesson(uuid) — takes the learner's
-- chosen answer, verifies it server-side, and only records progress (and
-- auto-enrolls, same as before) when it's actually correct.
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

  -- A lesson with no check configured (shouldn't happen once seeded, but
  -- don't hard-block progress on an authoring gap) counts as answered.
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

-- Admin authoring: lesson upsert now also accepts the check fields. Drop the
-- old 5-arg overload first — `create or replace` with a different parameter
-- list creates a second overload instead of replacing it, which would leave
-- an ambiguous duplicate for any 5-arg call.
drop function if exists admin_upsert_cybersachet_lesson(uuid, uuid, text, text, int);

create or replace function admin_upsert_cybersachet_lesson(
  p_id uuid, p_course_id uuid, p_title text, p_body text, p_sort_order int,
  p_check_question text default null, p_check_choices jsonb default null, p_check_correct_index int default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;

  if p_id is null then
    insert into cybersachet_lessons (course_id, title, body, sort_order, check_question, check_choices, check_correct_index)
    values (p_course_id, p_title, p_body, p_sort_order, p_check_question, p_check_choices, p_check_correct_index)
    returning id into v_id;
  else
    update cybersachet_lessons set
      title = p_title, body = p_body, sort_order = p_sort_order,
      check_question = p_check_question, check_choices = p_check_choices, check_correct_index = p_check_correct_index
    where id = p_id
    returning id into v_id;
  end if;

  perform _log_admin_action('save_cybersachet_lesson', 'cybersachet_lesson', v_id::text, p_title);
  return v_id;
end;
$$;

grant execute on function check_lesson_answer(uuid, int) to authenticated;
grant execute on function admin_upsert_cybersachet_lesson(uuid, uuid, text, text, int, text, jsonb, int) to authenticated;

-- The old self-report RPC is superseded — drop it so nothing can bypass the
-- check by calling the old name directly.
drop function if exists complete_lesson(uuid);
