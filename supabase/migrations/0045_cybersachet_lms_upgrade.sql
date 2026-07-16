-- CyberSachet LMS upgrade: modules within a course, a "training" permission
-- module so an organization's own admin can assign/track/reset training
-- (not just a platform admin), a real per-org leaderboard, real computed
-- learner stats/badges/streak, richer quiz question types (multiple-answer,
-- arrange-the-steps), and an honest two-course Starter free tier.
--
-- Deliberately NOT in this migration (flagged, not faked — see DEPLOY.md):
-- video/narration/subtitle fields (no media hosting), an AI tutor (needs an
-- LLM backend decision), phishing-simulation campaigns (needs a sending
-- domain — already flagged out of scope in 0037), CTF/cyber range/live
-- classes (need real infrastructure), multi-course "Learning Paths" (would
-- require redesigning the one-certificate-per-user completion model), and
-- cross-organization leaderboards/department rollups (no department schema
-- exists). Each of those stays a documented roadmap item, not a stub.

-- ---------------------------------------------------------------------------
-- 1. Modules — group a course's existing lessons into named sections.
-- ---------------------------------------------------------------------------

create table cybersachet_modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references cybersachet_courses(id) on delete cascade,
  title      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index cybersachet_modules_course_idx on cybersachet_modules(course_id);
alter table cybersachet_modules enable row level security;
create policy cybersachet_modules_select on cybersachet_modules for select to authenticated using (
  is_platform_admin() or exists (select 1 from cybersachet_courses c where c.id = course_id and c.published)
);

alter table cybersachet_lessons
  add column module_id uuid references cybersachet_modules(id) on delete set null,
  add column key_takeaway text;

-- ---------------------------------------------------------------------------
-- 2. Course library: category (for filtering) + an honest Starter free tier.
-- ---------------------------------------------------------------------------

alter table cybersachet_courses
  add column category text not null default 'security-awareness',
  add column free_tier boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3. Richer quiz question types: single-answer (existing), multiple-answer,
--    and arrange-the-steps ordering. correct_index stays for 'single';
--    correct_indexes/correct_order are only populated for their own type —
--    the check constraint keeps that honest instead of silently nullable.
-- ---------------------------------------------------------------------------

alter table cybersachet_quiz_questions
  alter column correct_index drop not null,
  add column question_type text not null default 'single' check (question_type in ('single', 'multiple', 'ordering')),
  add column correct_indexes int[],
  add column correct_order int[],
  add constraint cybersachet_quiz_questions_answer_shape check (
    (question_type = 'single' and correct_index is not null and correct_indexes is null and correct_order is null) or
    (question_type = 'multiple' and correct_indexes is not null and correct_index is null and correct_order is null) or
    (question_type = 'ordering' and correct_order is not null and correct_index is null and correct_indexes is null)
  );

-- ---------------------------------------------------------------------------
-- 4. A "training" permission module so an organization's own admin — not
--    just a platform admin — can assign/track/reset CyberSachet training,
--    the same dynamic-RBAC mechanism migration 0032 built for everything
--    else. Organization Administrator (both the modern and legacy ADMIN
--    role) gets full manage; Auditor gets read-only visibility; nothing
--    else changes for the five platform roles from 0030/0031, which keep
--    their own hardcoded checks untouched.
-- ---------------------------------------------------------------------------

insert into permission_modules (key, label, scope, sort_order) values
  ('training', 'CyberSachet Training', 'organization', 75)
on conflict (key) do nothing;

insert into role_permissions (role_key, module_key, can_view, can_create, can_edit, can_delete, can_configure, can_export, can_manage)
values
  ('organization_administrator', 'training', true, true, true, true, false, true, true),
  ('ADMIN',                      'training', true, true, true, true, false, true, true),
  ('auditor',                    'training', true, false, false, false, false, true, false),
  ('READ_ONLY',                  'training', true, false, false, false, false, false, false),
  ('read_only',                  'training', true, false, false, false, false, false, false)
on conflict (role_key, module_key) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Modules, categories, free-tier flags, and key takeaways for the 8
--    courses seeded so far (3 from 0037, 5 from 0040) — matched by slug and
--    lesson title, same pattern 0039/0043 already use for content updates.
-- ---------------------------------------------------------------------------

update cybersachet_courses set category = 'email-security' where slug in ('phishing-awareness', 'phishing-recognition-fundamentals');
update cybersachet_courses set category = 'identity' where slug in ('password-security-mfa', 'password-account-hygiene');
update cybersachet_courses set category = 'cybersecurity' where slug in ('social-engineering', 'safe-browsing-social-engineering');
update cybersachet_courses set category = 'endpoint-security' where slug = 'malware-ransomware';
update cybersachet_courses set category = 'data-protection' where slug = 'data-handling-privacy';

-- Starter package gets exactly two full, real courses — not a one-lesson
-- teaser of one course. Everything else on Starter shows locked with an
-- upgrade prompt (enforced below at the RPC layer, not just the frontend).
update cybersachet_courses set free_tier = true where slug in ('phishing-awareness', 'password-security-mfa');

-- Two modules per course, grouping that course's own existing lessons —
-- not a cross-course "learning path" (see the note at the top of this file
-- on why that's a separate, deferred feature).
do $$
declare
  v_course record;
  v_m1 uuid;
  v_m2 uuid;
begin
  for v_course in select id, slug from cybersachet_courses where slug in (
    'phishing-awareness', 'password-security-mfa', 'social-engineering', 'malware-ransomware', 'data-handling-privacy',
    'phishing-recognition-fundamentals', 'password-account-hygiene', 'safe-browsing-social-engineering'
  ) loop
    insert into cybersachet_modules (course_id, title, sort_order)
    values (v_course.id, case v_course.slug
      when 'phishing-awareness' then 'Recognizing Phishing'
      when 'password-security-mfa' then 'Why Passwords Fail'
      when 'social-engineering' then 'Manipulation Tactics'
      when 'malware-ransomware' then 'How Malware Operates'
      when 'data-handling-privacy' then 'Handling Data Safely'
      when 'phishing-recognition-fundamentals' then 'Core Concepts'
      when 'password-account-hygiene' then 'Core Concepts'
      when 'safe-browsing-social-engineering' then 'Core Concepts'
    end, 0)
    returning id into v_m1;

    insert into cybersachet_modules (course_id, title, sort_order)
    values (v_course.id, case v_course.slug
      when 'phishing-awareness' then 'Responding & Preventing'
      when 'password-security-mfa' then 'Modern Defenses'
      when 'social-engineering' then 'Physical & Everyday Defense'
      when 'malware-ransomware' then 'Ransomware & Response'
      when 'data-handling-privacy' then 'Staying Safe & Reporting'
      when 'phishing-recognition-fundamentals' then 'Taking Action'
      when 'password-account-hygiene' then 'Taking Action'
      when 'safe-browsing-social-engineering' then 'Taking Action'
    end, 1)
    returning id into v_m2;

    -- First half of the course's lessons (by sort_order) join module 1, the
    -- rest join module 2 — a 3-lesson course gets a 2/1 split, a 4-lesson
    -- course gets 2/2.
    update cybersachet_lessons l set module_id = v_m1
    where l.course_id = v_course.id and l.sort_order < ceil((select count(*) from cybersachet_lessons where course_id = v_course.id) / 2.0);
    update cybersachet_lessons l set module_id = v_m2
    where l.course_id = v_course.id and l.module_id is null;
  end loop;
end $$;

-- Key takeaways for the five-course canonical catalog (matches the local
-- preview file exactly). The earlier three-course seed (0037) doesn't get
-- one yet — the UI treats a missing takeaway as "not authored yet" and
-- simply doesn't render the callout, the same graceful-degradation pattern
-- used everywhere else in this feature, not a broken state.
update cybersachet_lessons set key_takeaway = t.takeaway from (values
  ('phishing-awareness', 'What phishing actually is', 'Phishing wins on volume, not sophistication — it only needs a handful of clicks out of thousands of attempts.'),
  ('phishing-awareness', 'The red flags that give it away', 'Manufactured urgency is the single biggest tell — real IT and finance requests rarely come with a countdown timer.'),
  ('phishing-awareness', 'If you already clicked', 'Speed and honesty beat quiet embarrassment — disconnect, change the password, and report it immediately.'),
  ('phishing-awareness', 'Building a verify-first habit', 'Verify any unexpected request through a channel you already trust, never through the message itself.'),
  ('password-security-mfa', 'Why passwords fail', 'Reuse — not weak individual passwords — is what turns one small breach into a dozen compromised accounts.'),
  ('password-security-mfa', 'Passphrases beat passwords', 'Length beats symbol-stuffing: a long passphrase resists cracking hardware better than a short complex password.'),
  ('password-security-mfa', 'Password managers, in practice', 'A password manager makes reuse physically impossible instead of just discouraged — use it everywhere, personal accounts included.'),
  ('password-security-mfa', 'Multi-factor authentication (MFA)', 'Any MFA beats none, but an authenticator app or hardware key resists SIM-swapping in a way SMS codes can''t.'),
  ('social-engineering', 'Pretexting and impersonation', 'The fixed rule: legitimate IT, finance, or leadership never ask you to bypass normal verification steps.'),
  ('social-engineering', 'Vishing and smishing', 'Treat an unexpected call or text with the same skepticism as email — hang up and call back on a number you already know.'),
  ('social-engineering', 'Tailgating and physical social engineering', 'It''s normal and expected to ask an unfamiliar person to badge into a secured door themselves, even if it feels awkward.'),
  ('social-engineering', 'Building a verify-first habit at work', 'Manufactured urgency plus a request to skip a normal step is the pattern behind nearly every social-engineering attempt.'),
  ('malware-ransomware', 'Malware, in plain terms', 'Viruses, worms, and trojans differ in how they spread, but every kind of malware shares the same goal: unauthorized control.'),
  ('malware-ransomware', 'How it actually gets in', 'Most infections start with a person, not an exploit — an unexpected attachment or an unpatched app are the two doors that matter most.'),
  ('malware-ransomware', 'Why ransomware is different', 'The only reliable defense is prevention plus tested backups kept disconnected from the network — paying rarely guarantees recovery.'),
  ('malware-ransomware', 'If you suspect an infection', 'Disconnect first, don''t reboot, and report it immediately — a live memory dump can matter more than a quick fix.'),
  ('data-handling-privacy', 'Classifying sensitive data', 'When you''re not sure how sensitive something is, treat it as sensitive by default — the cost of caution is minutes, not trust.'),
  ('data-handling-privacy', 'Safe sharing and storage', '"Anyone with the link" usually means anyone the link is ever forwarded to, not just its first recipient.'),
  ('data-handling-privacy', 'Working remotely and securely', 'Use your company VPN for sensitive work on networks you don''t control, and never let sensitive data live only on a personal device.'),
  ('data-handling-privacy', 'Reporting a suspected breach', 'Report a real mistake immediately, even without full certainty — the trouble comes from staying quiet, not from reporting.')
) as t(slug, title, takeaway)
where cybersachet_lessons.title = t.title
  and cybersachet_lessons.course_id = (select id from cybersachet_courses where slug = t.slug);

-- ---------------------------------------------------------------------------
-- 6. Two real examples of the new question types, so the capability is
--    proven end to end (authoring UI -> storage -> grading -> learner UI)
--    rather than merely declared in the schema. Authoring more of either
--    type for the rest of the catalog is now an admin-portal task, not a
--    follow-up migration.
-- ---------------------------------------------------------------------------

insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_indexes, sort_order)
select id, 'Select every real phishing red flag (choose all that apply):',
  '["Manufactured urgency or a countdown", "A sender address that''s almost right, like support@paypa1.com", "The email was sent on a weekday", "A link whose visible text doesn''t match where it actually goes"]'::jsonb,
  'multiple', array[0,1,3], 4
from cybersachet_courses c
where c.slug = 'phishing-awareness'
  and not exists (select 1 from cybersachet_quiz_questions q where q.course_id = c.id and q.question_type = 'multiple');

insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_order, sort_order)
select id, 'Arrange the steps in the right order for responding to a suspected phishing click:',
  '["Report it to IT/security", "Disconnect the device from the network", "Change any passwords you entered", "Notice the message looks off"]'::jsonb,
  'ordering', array[3,1,2,0], 5
from cybersachet_courses c
where c.slug = 'phishing-awareness'
  and not exists (select 1 from cybersachet_quiz_questions q where q.course_id = c.id and q.question_type = 'ordering');

-- ---------------------------------------------------------------------------
-- 7. Updated read RPCs — return-shape changes require drop-then-create
--    (documented repeatedly since migration 0030: Postgres treats a
--    different return-column list as a different function identity).
-- ---------------------------------------------------------------------------

drop function if exists list_cybersachet_courses();
create or replace function list_cybersachet_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, sort_order int, category text, free_tier boolean,
  lesson_count bigint, quiz_question_count bigint
)
language sql security definer stable set search_path = public, pg_temp as $$
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.sort_order, c.category, c.free_tier,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_quiz_questions q where q.course_id = c.id)
  from cybersachet_courses c
  where c.published
  order by c.sort_order;
$$;
grant execute on function list_cybersachet_courses() to authenticated;

create or replace function list_course_modules(p_course_id uuid)
returns table (id uuid, title text, sort_order int)
language sql security definer stable set search_path = public, pg_temp as $$
  select m.id, m.title, m.sort_order
  from cybersachet_modules m
  join cybersachet_courses c on c.id = m.course_id
  where m.course_id = p_course_id and c.published
  order by m.sort_order;
$$;
grant execute on function list_course_modules(uuid) to authenticated;

drop function if exists list_course_lessons(uuid);
create or replace function list_course_lessons(p_course_id uuid)
returns table (id uuid, title text, body text, sort_order int, module_id uuid, key_takeaway text, check_question text, check_choices jsonb)
language sql security definer stable set search_path = public, pg_temp as $$
  select l.id, l.title, l.body, l.sort_order, l.module_id, l.key_takeaway, l.check_question, l.check_choices
  from cybersachet_lessons l
  join cybersachet_courses c on c.id = l.course_id
  where l.course_id = p_course_id and c.published
  order by l.sort_order;
$$;
grant execute on function list_course_lessons(uuid) to authenticated;

drop function if exists list_course_quiz(uuid);
create or replace function list_course_quiz(p_course_id uuid)
returns table (id uuid, question text, choices jsonb, question_type text, sort_order int)
language sql security definer stable set search_path = public, pg_temp as $$
  select q.id, q.question, q.choices, q.question_type, q.sort_order
  from cybersachet_quiz_questions q
  join cybersachet_courses c on c.id = q.course_id
  where q.course_id = p_course_id and c.published
  order by q.sort_order;
$$;
grant execute on function list_course_quiz(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Starter-plan gating, enforced here (not just hidden in the UI) —
--    matches the same rigor issue_cybersachet_certificate already applies.
-- ---------------------------------------------------------------------------

create or replace function _cybersachet_course_allowed(p_course_id uuid) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_plan text;
  v_free boolean;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  select plan into v_plan from organizations where id = v_org_id;
  select free_tier into v_free from cybersachet_courses where id = p_course_id;
  return v_plan is distinct from 'STARTER' or coalesce(v_free, false);
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
    raise exception 'This course requires the Professional package or above.';
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
    raise exception 'This course requires the Professional package or above.';
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

-- Grades all three question types. Answers payload shape, keyed by question
-- id: single -> an int choice index; multiple -> an int[] of chosen
-- indexes; ordering -> an int[] giving the learner's submitted sequence of
-- original choice indexes. Both array types are compared as real arrays —
-- multiple ignores order (graded as a set), ordering requires an exact
-- match — never as a fragile string comparison.
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
    raise exception 'This course requires the Professional package or above.';
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
-- 9. Real per-org leaderboard and real computed learner stats/badges/streak
--    — every number here comes from cybersachet_enrollments/lesson_progress/
--    certificates, nothing is a placeholder.
-- ---------------------------------------------------------------------------

create or replace function cybersachet_leaderboard()
returns table (user_id uuid, user_email text, completed_count int, avg_score numeric, hours_trained numeric, rank int)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return; end if;

  return query
  with agg as (
    select e.user_id,
      count(*) filter (where e.completed_at is not null) as completed_count,
      avg(e.quiz_score) filter (where e.completed_at is not null) as avg_score,
      sum(c.estimated_minutes) filter (where e.completed_at is not null) as minutes_trained
    from cybersachet_enrollments e
    join cybersachet_courses c on c.id = e.course_id
    where e.organization_id = v_org_id
    group by e.user_id
  )
  select a.user_id, u.email::text, a.completed_count::int, round(a.avg_score, 1), round(coalesce(a.minutes_trained, 0) / 60.0, 1),
    rank() over (order by a.completed_count desc, a.avg_score desc nulls last)::int
  from agg a
  join auth.users u on u.id = a.user_id
  order by rank
  limit 25;
end;
$$;
grant execute on function cybersachet_leaderboard() to authenticated;

create or replace function my_cybersachet_stats()
returns table (completed_courses int, in_progress_courses int, avg_score numeric, hours_trained numeric, streak_days int, badges text[])
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_completed int;
  v_in_progress int;
  v_avg numeric;
  v_hours numeric;
  v_published int;
  v_streak int := 0;
  v_cursor date := current_date;
  v_has_perfect boolean;
  v_has_cert boolean;
  v_badges text[] := '{}';
begin
  select count(*) filter (where e.completed_at is not null),
         count(*) filter (where e.completed_at is null),
         round(avg(e.quiz_score) filter (where e.completed_at is not null), 1),
         round(coalesce(sum(c.estimated_minutes) filter (where e.completed_at is not null), 0) / 60.0, 1)
    into v_completed, v_in_progress, v_avg, v_hours
    from cybersachet_enrollments e
    join cybersachet_courses c on c.id = e.course_id
    where e.user_id = auth.uid();

  select count(*) into v_published from cybersachet_courses where published;

  if not exists (select 1 from cybersachet_lesson_progress p join cybersachet_enrollments e on e.id = p.enrollment_id where e.user_id = auth.uid() and p.completed_at::date = current_date) then
    v_cursor := current_date - 1;
  end if;
  while exists (select 1 from cybersachet_lesson_progress p join cybersachet_enrollments e on e.id = p.enrollment_id where e.user_id = auth.uid() and p.completed_at::date = v_cursor) loop
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  select exists(select 1 from cybersachet_enrollments where user_id = auth.uid() and quiz_score = 100) into v_has_perfect;
  select exists(select 1 from cybersachet_certificates where user_id = auth.uid() and level_code = 'CSSA' and revoked_at is null) into v_has_cert;

  if coalesce(v_completed, 0) >= 1 then v_badges := v_badges || 'first_course'; end if;
  if v_has_perfect then v_badges := v_badges || 'perfect_score'; end if;
  if v_published > 0 and coalesce(v_completed, 0) >= v_published then v_badges := v_badges || 'completionist'; end if;
  if v_has_cert then v_badges := v_badges || 'certified'; end if;
  if v_streak >= 3 then v_badges := v_badges || 'streak_3'; end if;
  if v_streak >= 7 then v_badges := v_badges || 'streak_7'; end if;

  return query select coalesce(v_completed, 0), coalesce(v_in_progress, 0), v_avg, coalesce(v_hours, 0), v_streak, v_badges;
end;
$$;
grant execute on function my_cybersachet_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Organization-admin training management — the caller's own org admin
--     (has_org_permission('training','manage'), same dynamic-RBAC engine as
--     every other organization module), not just a platform admin. Naming
--     mirrors update_organization_member_role from migration 0033: no
--     organization_id parameter, the caller's own membership decides scope,
--     so nobody can pass someone else's org id.
-- ---------------------------------------------------------------------------

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
  if not exists (select 1 from organization_products where organization_id = v_org_id and product_key = 'cybersachet' and status = 'active') then
    raise exception 'Your organization does not have an active CyberSachet license';
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
grant execute on function assign_cybersachet_course(uuid, uuid, timestamptz) to authenticated;

create or replace function unassign_cybersachet_course(p_user_id uuid, p_course_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'training', 'manage') then
    raise exception 'Not authorized — training management access required';
  end if;

  delete from cybersachet_assignments where organization_id = v_org_id and user_id = p_user_id and course_id = p_course_id;
  perform _log_admin_action('unassign_cybersachet_course', 'cybersachet_assignment', v_org_id::text, p_user_id::text || ' — ' || p_course_id::text);
end;
$$;
grant execute on function unassign_cybersachet_course(uuid, uuid) to authenticated;

create or replace function list_org_cybersachet_assignments()
returns table (
  user_id uuid, user_email text,
  course_id uuid, course_title text,
  assigned_at timestamptz, due_at timestamptz,
  completed_at timestamptz, quiz_score int
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null or not has_org_permission(v_org_id, 'training', 'view') then
    return;
  end if;

  return query
  select a.user_id, u.email::text, a.course_id, c.title, a.assigned_at, a.due_at, e.completed_at, e.quiz_score
  from cybersachet_assignments a
  join auth.users u on u.id = a.user_id
  join cybersachet_courses c on c.id = a.course_id
  left join cybersachet_enrollments e on e.user_id = a.user_id and e.course_id = a.course_id
  where a.organization_id = v_org_id
  order by a.assigned_at desc;
end;
$$;
grant execute on function list_org_cybersachet_assignments() to authenticated;

create or replace function reset_cybersachet_progress(p_user_id uuid, p_course_id uuid)
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
  if not exists (select 1 from memberships where organization_id = v_org_id and user_id = p_user_id) then
    raise exception 'That user is not a member of your organization';
  end if;

  select email into v_user_email from auth.users where id = p_user_id;
  select title into v_course_title from cybersachet_courses where id = p_course_id;

  delete from cybersachet_lesson_progress where enrollment_id in (
    select id from cybersachet_enrollments where user_id = p_user_id and course_id = p_course_id
  );
  delete from cybersachet_enrollments where user_id = p_user_id and course_id = p_course_id;
  -- A reset invalidates "every published course complete" — revoke any
  -- already-issued certificate rather than leave one standing for a
  -- completion state that's no longer true. The learner re-earns it once
  -- complete again; issue_cybersachet_certificate already handles reissue.
  update cybersachet_certificates set revoked_at = now() where user_id = p_user_id and level_code = 'CSSA' and revoked_at is null;

  perform _log_admin_action('reset_cybersachet_progress', 'cybersachet_enrollment', v_org_id::text, coalesce(v_user_email, 'user') || ' — ' || coalesce(v_course_title, 'course'));
end;
$$;
grant execute on function reset_cybersachet_progress(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Admin authoring: modules CRUD, plus course/lesson/quiz-question
--     upserts extended for category/free_tier, module_id/key_takeaway, and
--     question_type/correct_indexes/correct_order. Each changed function is
--     dropped first at its exact old signature — the same
--     drop-then-create rule as everywhere else in this file.
-- ---------------------------------------------------------------------------

create or replace function admin_list_cybersachet_modules(p_course_id uuid)
returns table (id uuid, course_id uuid, title text, sort_order int, lesson_count bigint)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select m.id, m.course_id, m.title, m.sort_order, (select count(*) from cybersachet_lessons l where l.module_id = m.id)
  from cybersachet_modules m where m.course_id = p_course_id order by m.sort_order;
end;
$$;
grant execute on function admin_list_cybersachet_modules(uuid) to authenticated;

create or replace function admin_upsert_cybersachet_module(p_id uuid, p_course_id uuid, p_title text, p_sort_order int)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_id is null then
    insert into cybersachet_modules (course_id, title, sort_order) values (p_course_id, p_title, p_sort_order) returning id into v_id;
  else
    update cybersachet_modules set title = p_title, sort_order = p_sort_order where id = p_id returning id into v_id;
  end if;
  perform _log_admin_action(case when p_id is null then 'create_module' else 'update_module' end, 'cybersachet_module', v_id::text, p_title);
  return v_id;
end;
$$;
grant execute on function admin_upsert_cybersachet_module(uuid, uuid, text, int) to authenticated;

create or replace function admin_delete_cybersachet_module(p_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  update cybersachet_lessons set module_id = null where module_id = p_id;
  delete from cybersachet_modules where id = p_id;
  perform _log_admin_action('delete_module', 'cybersachet_module', p_id::text, null);
end;
$$;
grant execute on function admin_delete_cybersachet_module(uuid) to authenticated;

drop function if exists admin_list_cybersachet_courses();
create or replace function admin_list_cybersachet_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, published boolean, sort_order int, category text, free_tier boolean,
  lesson_count bigint, quiz_question_count bigint, enrollment_count bigint
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.published, c.sort_order, c.category, c.free_tier,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_quiz_questions q where q.course_id = c.id),
    (select count(*) from cybersachet_enrollments e where e.course_id = c.id)
  from cybersachet_courses c
  order by c.sort_order;
end;
$$;
grant execute on function admin_list_cybersachet_courses() to authenticated;

drop function if exists admin_upsert_cybersachet_course(uuid, text, text, text, text, int, boolean, int);
create or replace function admin_upsert_cybersachet_course(
  p_id uuid, p_slug text, p_title text, p_description text, p_level text,
  p_estimated_minutes int, p_published boolean, p_sort_order int,
  p_category text default 'security-awareness', p_free_tier boolean default false
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;

  if p_id is null then
    insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order, category, free_tier)
    values (p_slug, p_title, p_description, p_level, p_estimated_minutes, p_published, p_sort_order, p_category, p_free_tier)
    returning id into v_id;
  else
    update cybersachet_courses set
      slug = p_slug, title = p_title, description = p_description, level = p_level,
      estimated_minutes = p_estimated_minutes, published = p_published, sort_order = p_sort_order,
      category = p_category, free_tier = p_free_tier, updated_at = now()
    where id = p_id
    returning id into v_id;
  end if;

  perform _log_admin_action(case when p_id is null then 'create_course' else 'update_course' end, 'cybersachet_course', v_id::text, p_title);
  return v_id;
end;
$$;
grant execute on function admin_upsert_cybersachet_course(uuid, text, text, text, text, int, boolean, int, text, boolean) to authenticated;

drop function if exists admin_list_cybersachet_lessons(uuid);
create or replace function admin_list_cybersachet_lessons(p_course_id uuid)
returns table (id uuid, course_id uuid, title text, body text, sort_order int, module_id uuid, key_takeaway text, check_question text, check_choices jsonb, check_correct_index int)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query select l.id, l.course_id, l.title, l.body, l.sort_order, l.module_id, l.key_takeaway, l.check_question, l.check_choices, l.check_correct_index
  from cybersachet_lessons l where l.course_id = p_course_id order by l.sort_order;
end;
$$;
grant execute on function admin_list_cybersachet_lessons(uuid) to authenticated;

drop function if exists admin_upsert_cybersachet_lesson(uuid, uuid, text, text, int, text, jsonb, int);
create or replace function admin_upsert_cybersachet_lesson(
  p_id uuid, p_course_id uuid, p_title text, p_body text, p_sort_order int,
  p_check_question text default null, p_check_choices jsonb default null, p_check_correct_index int default null,
  p_module_id uuid default null, p_key_takeaway text default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;

  if p_id is null then
    insert into cybersachet_lessons (course_id, title, body, sort_order, check_question, check_choices, check_correct_index, module_id, key_takeaway)
    values (p_course_id, p_title, p_body, p_sort_order, p_check_question, p_check_choices, p_check_correct_index, p_module_id, p_key_takeaway)
    returning id into v_id;
  else
    update cybersachet_lessons set
      title = p_title, body = p_body, sort_order = p_sort_order,
      check_question = p_check_question, check_choices = p_check_choices, check_correct_index = p_check_correct_index,
      module_id = p_module_id, key_takeaway = p_key_takeaway
    where id = p_id
    returning id into v_id;
  end if;

  perform _log_admin_action('save_cybersachet_lesson', 'cybersachet_lesson', v_id::text, p_title);
  return v_id;
end;
$$;
grant execute on function admin_upsert_cybersachet_lesson(uuid, uuid, text, text, int, text, jsonb, int, uuid, text) to authenticated;

drop function if exists admin_list_cybersachet_quiz_questions(uuid);
create or replace function admin_list_cybersachet_quiz_questions(p_course_id uuid)
returns table (id uuid, course_id uuid, question text, choices jsonb, question_type text, correct_index int, correct_indexes int[], correct_order int[], sort_order int)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query select q.id, q.course_id, q.question, q.choices, q.question_type, q.correct_index, q.correct_indexes, q.correct_order, q.sort_order
  from cybersachet_quiz_questions q where q.course_id = p_course_id order by q.sort_order;
end;
$$;
grant execute on function admin_list_cybersachet_quiz_questions(uuid) to authenticated;

drop function if exists admin_upsert_cybersachet_quiz_question(uuid, uuid, text, jsonb, int, int);
create or replace function admin_upsert_cybersachet_quiz_question(
  p_id uuid, p_course_id uuid, p_question text, p_choices jsonb, p_sort_order int,
  p_question_type text default 'single', p_correct_index int default null,
  p_correct_indexes int[] default null, p_correct_order int[] default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_id is null then
    insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, correct_indexes, correct_order, sort_order)
    values (p_course_id, p_question, p_choices, p_question_type, p_correct_index, p_correct_indexes, p_correct_order, p_sort_order)
    returning id into v_id;
  else
    update cybersachet_quiz_questions set
      question = p_question, choices = p_choices, question_type = p_question_type,
      correct_index = p_correct_index, correct_indexes = p_correct_indexes, correct_order = p_correct_order, sort_order = p_sort_order
    where id = p_id
    returning id into v_id;
  end if;
  perform _log_admin_action(case when p_id is null then 'create_quiz_question' else 'update_quiz_question' end, 'cybersachet_quiz_question', v_id::text, p_question);
  return v_id;
end;
$$;
grant execute on function admin_upsert_cybersachet_quiz_question(uuid, uuid, text, jsonb, int, text, int, int[], int[]) to authenticated;
