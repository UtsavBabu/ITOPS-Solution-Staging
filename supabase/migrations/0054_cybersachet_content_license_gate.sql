-- Package-enforcement audit finding: enroll_in_course(), check_lesson_answer(),
-- and submit_quiz() all correctly call _cybersachet_course_allowed() (the
-- real license + Starter-free-tier check) before doing anything — but the
-- three READ functions backing the lesson/quiz UI never did. They only
-- checked `c.published`, meaning any authenticated user (unlicensed org, or
-- a licensed Starter org reading a course that isn't one of its two free
-- ones) could read full lesson bodies and quiz questions directly via RPC,
-- bypassing the frontend's local-preview-vs-real switch entirely — the
-- same "don't just hide it in the UI" standard already applied everywhere
-- else in this feature (verify_certificate, enroll_in_course, etc.).
--
-- list_cybersachet_courses() itself is deliberately left open: the catalog
-- (title/description/lesson count) is meant to be visible pre-license so a
-- Starter org can see what upgrading unlocks — that's the existing
-- LockedCourseCard UX, not a leak.

create or replace function list_course_modules(p_course_id uuid)
returns table (id uuid, title text, sort_order int)
language sql security definer stable set search_path = public, pg_temp as $$
  select m.id, m.title, m.sort_order
  from cybersachet_modules m
  join cybersachet_courses c on c.id = m.course_id
  where m.course_id = p_course_id and c.published
    and my_cybersachet_license() and _cybersachet_course_allowed(c.id)
  order by m.sort_order;
$$;

create or replace function list_course_lessons(p_course_id uuid)
returns table (id uuid, title text, body text, sort_order int, module_id uuid, key_takeaway text, check_question text, check_choices jsonb)
language sql security definer stable set search_path = public, pg_temp as $$
  select l.id, l.title, l.body, l.sort_order, l.module_id, l.key_takeaway, l.check_question, l.check_choices
  from cybersachet_lessons l
  join cybersachet_courses c on c.id = l.course_id
  where l.course_id = p_course_id and c.published
    and my_cybersachet_license() and _cybersachet_course_allowed(c.id)
  order by l.sort_order;
$$;

create or replace function list_course_quiz(p_course_id uuid)
returns table (id uuid, question text, choices jsonb, question_type text, sort_order int)
language sql security definer stable set search_path = public, pg_temp as $$
  select q.id, q.question, q.choices, q.question_type, q.sort_order
  from cybersachet_quiz_questions q
  join cybersachet_courses c on c.id = q.course_id
  where q.course_id = p_course_id and c.published
    and my_cybersachet_license() and _cybersachet_course_allowed(c.id)
  order by q.sort_order;
$$;
