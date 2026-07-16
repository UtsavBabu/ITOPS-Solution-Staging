-- CyberSachet: real security-awareness training platform, v1 scope.
--
-- Reuses the existing per-organization product licensing
-- (organization_products from 0029) instead of a separate login system —
-- an org must have the 'cybersachet' product active for its members to
-- enroll. Course content itself is a platform-wide catalog (authored once
-- by platform admins, consumed by every licensed organization), the same
-- shape as how the marketing Content Manager works, just a dedicated
-- structured schema instead of the generic content_items table since
-- courses/lessons/quizzes have real relational shape.
--
-- Deliberately out of scope for v1 (flagged, not faked): phishing
-- simulation campaigns and the risk-audit questionnaire — both need their
-- own design pass (a sending domain + transactional email provider for
-- simulated phishing; a scoring rubric for the audit). This ships the
-- training-content half: courses -> lessons -> quiz, with real completion
-- tracking per user.

-- ---------------------------------------------------------------------------
-- 0. Add CyberSachet to the product catalog
-- ---------------------------------------------------------------------------

insert into products (key, name, description, sort_order) values
  ('cybersachet', 'CyberSachet — Security Awareness Training', 'Security-awareness training courses with quizzes and per-user completion tracking.', 5)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 1. Course catalog (platform-wide, authored by platform admins)
-- ---------------------------------------------------------------------------

create table cybersachet_courses (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  description       text,
  level             text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  estimated_minutes int not null default 15,
  published         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table cybersachet_courses enable row level security;

create table cybersachet_lessons (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references cybersachet_courses(id) on delete cascade,
  title      text not null,
  body       text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index cybersachet_lessons_course_idx on cybersachet_lessons(course_id);
alter table cybersachet_lessons enable row level security;

create table cybersachet_quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references cybersachet_courses(id) on delete cascade,
  question      text not null,
  choices       jsonb not null,
  correct_index int not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index cybersachet_quiz_questions_course_idx on cybersachet_quiz_questions(course_id);
alter table cybersachet_quiz_questions enable row level security;

-- Direct reads: published courses/lessons are visible to any authenticated
-- user (browsing the catalog isn't sensitive — enrollment is what's gated).
-- Quiz questions are NOT directly readable by non-admins: correct_index
-- would leak answers. Clients get questions (without answers) via
-- list_course_quiz() below.
create policy cybersachet_courses_select on cybersachet_courses for select to authenticated using (published or is_platform_admin());
create policy cybersachet_lessons_select on cybersachet_lessons for select to authenticated using (
  is_platform_admin() or exists (select 1 from cybersachet_courses c where c.id = course_id and c.published)
);
create policy cybersachet_quiz_questions_select on cybersachet_quiz_questions for select to authenticated using (is_platform_admin());

-- ---------------------------------------------------------------------------
-- 2. Per-user enrollment + progress
-- ---------------------------------------------------------------------------

create table cybersachet_enrollments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  course_id       uuid not null references cybersachet_courses(id) on delete cascade,
  enrolled_at     timestamptz not null default now(),
  completed_at    timestamptz,
  quiz_score      int,
  unique (user_id, course_id)
);
create index cybersachet_enrollments_org_idx on cybersachet_enrollments(organization_id);
alter table cybersachet_enrollments enable row level security;

create policy cybersachet_enrollments_select on cybersachet_enrollments for select to authenticated using (
  user_id = auth.uid() or is_org_member(organization_id) or is_platform_admin()
);

create table cybersachet_lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references cybersachet_enrollments(id) on delete cascade,
  lesson_id     uuid not null references cybersachet_lessons(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (enrollment_id, lesson_id)
);
alter table cybersachet_lesson_progress enable row level security;

create policy cybersachet_lesson_progress_select on cybersachet_lesson_progress for select to authenticated using (
  exists (select 1 from cybersachet_enrollments e where e.id = enrollment_id and (e.user_id = auth.uid() or is_org_member(e.organization_id) or is_platform_admin()))
);

-- ---------------------------------------------------------------------------
-- 3. Customer-facing RPCs
-- ---------------------------------------------------------------------------

create or replace function my_cybersachet_license()
returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1
    from memberships m
    join organization_products op on op.organization_id = m.organization_id
    where m.user_id = auth.uid() and op.product_key = 'cybersachet' and op.status = 'active'
  );
$$;

create or replace function list_cybersachet_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, sort_order int,
  lesson_count bigint, quiz_question_count bigint
)
language sql security definer stable set search_path = public, pg_temp as $$
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.sort_order,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_quiz_questions q where q.course_id = c.id)
  from cybersachet_courses c
  where c.published
  order by c.sort_order;
$$;

create or replace function list_course_lessons(p_course_id uuid)
returns table (id uuid, title text, body text, sort_order int)
language sql security definer stable set search_path = public, pg_temp as $$
  select l.id, l.title, l.body, l.sort_order
  from cybersachet_lessons l
  join cybersachet_courses c on c.id = l.course_id
  where l.course_id = p_course_id and c.published
  order by l.sort_order;
$$;

create or replace function list_course_quiz(p_course_id uuid)
returns table (id uuid, question text, choices jsonb, sort_order int)
language sql security definer stable set search_path = public, pg_temp as $$
  select q.id, q.question, q.choices, q.sort_order
  from cybersachet_quiz_questions q
  join cybersachet_courses c on c.id = q.course_id
  where q.course_id = p_course_id and c.published
  order by q.sort_order;
$$;

create or replace function my_cybersachet_enrollments()
returns table (
  enrollment_id uuid, course_id uuid, course_title text, course_slug text,
  level text, estimated_minutes int, enrolled_at timestamptz, completed_at timestamptz,
  quiz_score int, lesson_count bigint, completed_lesson_count bigint
)
language sql security definer stable set search_path = public, pg_temp as $$
  select e.id, c.id, c.title, c.slug, c.level, c.estimated_minutes, e.enrolled_at, e.completed_at, e.quiz_score,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_lesson_progress p where p.enrollment_id = e.id)
  from cybersachet_enrollments e
  join cybersachet_courses c on c.id = e.course_id
  where e.user_id = auth.uid()
  order by e.enrolled_at desc;
$$;

create or replace function my_lesson_progress(p_course_id uuid)
returns table (lesson_id uuid)
language sql security definer stable set search_path = public, pg_temp as $$
  select p.lesson_id
  from cybersachet_lesson_progress p
  join cybersachet_enrollments e on e.id = p.enrollment_id
  where e.user_id = auth.uid() and e.course_id = p_course_id;
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

  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;

  insert into cybersachet_enrollments (organization_id, user_id, course_id)
  values (v_org_id, auth.uid(), p_course_id)
  on conflict (user_id, course_id) do update set user_id = excluded.user_id
  returning id into v_enrollment_id;

  return v_enrollment_id;
end;
$$;

create or replace function complete_lesson(p_lesson_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_course_id uuid;
  v_enrollment_id uuid;
begin
  select course_id into v_course_id from cybersachet_lessons where id = p_lesson_id;
  if v_course_id is null then raise exception 'Lesson not found'; end if;

  select id into v_enrollment_id from cybersachet_enrollments where user_id = auth.uid() and course_id = v_course_id;
  if v_enrollment_id is null then
    v_enrollment_id := enroll_in_course(v_course_id);
  end if;

  insert into cybersachet_lesson_progress (enrollment_id, lesson_id)
  values (v_enrollment_id, p_lesson_id)
  on conflict (enrollment_id, lesson_id) do nothing;
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
  v_given int;
begin
  select id into v_enrollment_id from cybersachet_enrollments where user_id = auth.uid() and course_id = p_course_id;
  if v_enrollment_id is null then
    v_enrollment_id := enroll_in_course(p_course_id);
  end if;

  select count(*) into v_total from cybersachet_quiz_questions where course_id = p_course_id;
  if v_total = 0 then raise exception 'This course has no quiz'; end if;

  for v_q in select id, correct_index from cybersachet_quiz_questions where course_id = p_course_id loop
    v_given := (p_answers ->> v_q.id::text)::int;
    if v_given = v_q.correct_index then
      v_correct := v_correct + 1;
    end if;
  end loop;

  v_score := round(v_correct::numeric / v_total * 100);

  update cybersachet_enrollments
  set quiz_score = v_score, completed_at = case when v_score >= 70 then now() else completed_at end
  where id = v_enrollment_id;

  return v_score;
end;
$$;

grant execute on function my_cybersachet_license() to authenticated;
grant execute on function list_cybersachet_courses() to authenticated;
grant execute on function list_course_lessons(uuid) to authenticated;
grant execute on function list_course_quiz(uuid) to authenticated;
grant execute on function my_cybersachet_enrollments() to authenticated;
grant execute on function my_lesson_progress(uuid) to authenticated;
grant execute on function enroll_in_course(uuid) to authenticated;
grant execute on function complete_lesson(uuid) to authenticated;
grant execute on function submit_quiz(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Admin authoring RPCs
-- ---------------------------------------------------------------------------

create or replace function admin_list_cybersachet_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, published boolean, sort_order int,
  lesson_count bigint, quiz_question_count bigint, enrollment_count bigint
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.published, c.sort_order,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_quiz_questions q where q.course_id = c.id),
    (select count(*) from cybersachet_enrollments e where e.course_id = c.id)
  from cybersachet_courses c
  order by c.sort_order;
end;
$$;

create or replace function admin_upsert_cybersachet_course(
  p_id uuid, p_slug text, p_title text, p_description text, p_level text,
  p_estimated_minutes int, p_published boolean, p_sort_order int
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;

  if p_id is null then
    insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order)
    values (p_slug, p_title, p_description, p_level, p_estimated_minutes, p_published, p_sort_order)
    returning id into v_id;
  else
    update cybersachet_courses set
      slug = p_slug, title = p_title, description = p_description, level = p_level,
      estimated_minutes = p_estimated_minutes, published = p_published, sort_order = p_sort_order,
      updated_at = now()
    where id = p_id
    returning id into v_id;
  end if;

  perform _log_admin_action(case when p_id is null then 'create_course' else 'update_course' end, 'cybersachet_course', v_id::text, p_title);
  return v_id;
end;
$$;

create or replace function admin_delete_cybersachet_course(p_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_title text;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  select title into v_title from cybersachet_courses where id = p_id;
  delete from cybersachet_courses where id = p_id;
  perform _log_admin_action('delete_course', 'cybersachet_course', p_id::text, v_title);
end;
$$;

create or replace function admin_list_cybersachet_lessons(p_course_id uuid)
returns table (id uuid, course_id uuid, title text, body text, sort_order int)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query select l.id, l.course_id, l.title, l.body, l.sort_order from cybersachet_lessons l where l.course_id = p_course_id order by l.sort_order;
end;
$$;

create or replace function admin_upsert_cybersachet_lesson(p_id uuid, p_course_id uuid, p_title text, p_body text, p_sort_order int)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_id is null then
    insert into cybersachet_lessons (course_id, title, body, sort_order)
    values (p_course_id, p_title, p_body, p_sort_order)
    returning id into v_id;
  else
    update cybersachet_lessons set title = p_title, body = p_body, sort_order = p_sort_order where id = p_id
    returning id into v_id;
  end if;
  perform _log_admin_action(case when p_id is null then 'create_lesson' else 'update_lesson' end, 'cybersachet_lesson', v_id::text, p_title);
  return v_id;
end;
$$;

create or replace function admin_delete_cybersachet_lesson(p_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  delete from cybersachet_lessons where id = p_id;
  perform _log_admin_action('delete_lesson', 'cybersachet_lesson', p_id::text, null);
end;
$$;

create or replace function admin_list_cybersachet_quiz_questions(p_course_id uuid)
returns table (id uuid, course_id uuid, question text, choices jsonb, correct_index int, sort_order int)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query select q.id, q.course_id, q.question, q.choices, q.correct_index, q.sort_order from cybersachet_quiz_questions q where q.course_id = p_course_id order by q.sort_order;
end;
$$;

create or replace function admin_upsert_cybersachet_quiz_question(
  p_id uuid, p_course_id uuid, p_question text, p_choices jsonb, p_correct_index int, p_sort_order int
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_id is null then
    insert into cybersachet_quiz_questions (course_id, question, choices, correct_index, sort_order)
    values (p_course_id, p_question, p_choices, p_correct_index, p_sort_order)
    returning id into v_id;
  else
    update cybersachet_quiz_questions set question = p_question, choices = p_choices, correct_index = p_correct_index, sort_order = p_sort_order where id = p_id
    returning id into v_id;
  end if;
  perform _log_admin_action(case when p_id is null then 'create_quiz_question' else 'update_quiz_question' end, 'cybersachet_quiz_question', v_id::text, p_question);
  return v_id;
end;
$$;

create or replace function admin_delete_cybersachet_quiz_question(p_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  delete from cybersachet_quiz_questions where id = p_id;
  perform _log_admin_action('delete_quiz_question', 'cybersachet_quiz_question', p_id::text, null);
end;
$$;

grant execute on function admin_list_cybersachet_courses() to authenticated;
grant execute on function admin_upsert_cybersachet_course(uuid, text, text, text, text, int, boolean, int) to authenticated;
grant execute on function admin_delete_cybersachet_course(uuid) to authenticated;
grant execute on function admin_list_cybersachet_lessons(uuid) to authenticated;
grant execute on function admin_upsert_cybersachet_lesson(uuid, uuid, text, text, int) to authenticated;
grant execute on function admin_delete_cybersachet_lesson(uuid) to authenticated;
grant execute on function admin_list_cybersachet_quiz_questions(uuid) to authenticated;
grant execute on function admin_upsert_cybersachet_quiz_question(uuid, uuid, text, jsonb, int, int) to authenticated;
grant execute on function admin_delete_cybersachet_quiz_question(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Seed real starter content — three short, genuinely useful courses.
-- ---------------------------------------------------------------------------

do $$
declare
  c1 uuid; c2 uuid; c3 uuid;
begin
  insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order)
  values ('phishing-recognition-fundamentals', 'Phishing Recognition Fundamentals', 'Spot the phishing techniques attackers actually use today, and know exactly what to do when you find one.', 'beginner', 20, true, 0)
  returning id into c1;

  insert into cybersachet_lessons (course_id, title, body, sort_order) values
  (c1, 'What Phishing Looks Like Today',
   E'Phishing has moved well past the obvious "Nigerian prince" email. Modern phishing impersonates people and services you actually deal with: a message that looks like it is from your CEO asking for a quick favor, a "shared document" notification from what looks like Google or Microsoft, a delivery notice from a courier you were already expecting a package from, or an urgent invoice from a vendor you recognize.\n\nAttackers research their targets. A convincing phishing email may reference your real company name, a real coworker''s name, or a project you are actually working on — pulled from LinkedIn, your company website, or a previous data breach. The goal is always the same: get you to click a link, open an attachment, or reply with information or money before you stop to think.\n\nThe most common outcomes attackers want are: your login credentials (via a fake login page), a wire transfer or gift card purchase (via a fake urgent request from "leadership"), or a foothold on your device (via a malicious attachment or link).', 0),
  (c1, 'Red Flags in Emails and Links',
   E'A few reliable signals, in order of how often they actually show up:\n\n1. Urgency and pressure. "Your account will be suspended in 24 hours," "Wire this today before the bank closes," "Reply now or lose access." Urgency is designed to short-circuit careful thinking.\n\n2. A mismatch between the display name and the real address. "Microsoft Support" might actually be sent from a random Gmail address or a lookalike domain like "micros0ft-support.com". Always check the actual sender address, not just the friendly name.\n\n3. Links that do not go where they claim to. Hover over a link (or long-press on mobile) before clicking — the actual destination shown at the bottom of your screen or in a tooltip should match the text and the organization it claims to be from.\n\n4. Requests that skip your normal process. A "CEO" asking you to buy gift cards, a "vendor" asking you to change their bank details over email, a "coworker" asking for login details — all of these skip whatever verification process your organization normally uses for that kind of request, because the attacker cannot pass it.\n\n5. Generic greetings combined with specific-sounding details. "Dear Customer" paired with a very specific dollar amount or invoice number is a common way to sound both official and urgent at once.', 1),
  (c1, 'What To Do When You Spot One',
   E'Do not click, reply, forward, or download anything in the message.\n\nVerify through a second channel. If it claims to be from a coworker or vendor, contact them directly using a phone number or method you already know is real — not one provided in the suspicious message itself.\n\nReport it. Use your organization''s reporting process (usually forwarding to IT/security or a "Report phishing" button in your email client) so the same message can be blocked for everyone else who receives it.\n\nIf you already clicked a link or entered credentials, do not panic — but act immediately: change the password for that account right away, enable multi-factor authentication if it is not already on, and report it to IT/security so they can check for further compromise. Acting fast meaningfully reduces the damage; staying quiet out of embarrassment is what turns a close call into a real incident.', 2);

  insert into cybersachet_quiz_questions (course_id, question, choices, correct_index, sort_order) values
  (c1, 'Which of these is the strongest phishing red flag?', '["A generic greeting like \"Dear Customer\"", "An urgent request to act within a short deadline, skipping normal process", "A company logo in the email", "The email arriving outside business hours"]', 1, 0),
  (c1, 'You receive an email that looks like it is from your CEO asking you to urgently buy gift cards. What should you do first?', '["Buy the gift cards to avoid delay, then confirm afterward", "Reply directly to the email asking for confirmation", "Verify the request through a separate, known-good channel like a phone call", "Forward it to a coworker to decide"]', 2, 1),
  (c1, 'The safest way to check where a link actually goes before clicking is to:', '["Click it in a private/incognito window", "Hover over it and check the real destination shown by your browser or email client", "Check if the email looks professionally formatted", "Look at how many other people received the same email"]', 1, 2),
  (c1, 'You already clicked a phishing link and entered your password. What is the most important immediate step?', '["Delete the email and move on", "Change the password for that account and report it to IT/security immediately", "Wait to see if anything unusual happens first", "Only mention it if asked"]', 1, 3),
  (c1, 'Why do modern phishing emails often reference real coworker names or real projects?', '["It is required by email spam filters", "Attackers research targets using public info (LinkedIn, company sites, breaches) to appear legitimate", "It is a coincidence caused by autocomplete", "Email providers insert this automatically"]', 1, 4);

  insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order)
  values ('password-account-hygiene', 'Password & Account Hygiene', 'Why reused passwords are the single biggest account-takeover risk, and the two habits that fix it.', 'beginner', 15, true, 1)
  returning id into c2;

  insert into cybersachet_lessons (course_id, title, body, sort_order) values
  (c2, 'Why Reused Passwords Are the #1 Risk',
   E'When one website or service you use gets breached, attackers do not just try that password on that one site — they run it, along with your email address, against hundreds of other popular services automatically. This is called "credential stuffing," and it is the reason a breach at a service you barely remember using can lead to your email or banking account being compromised years later.\n\nIf you reuse the same password (or small variations of it) across multiple accounts, a single breach anywhere effectively breaches all of them. The strength of an individual password barely matters if it is reused — a long, complex password used on five different sites is riskier than a simpler password used on only one.\n\nThe fix is not "remember more passwords." It is using a different, unique password for every account, which in practice means using a tool to manage them for you.', 0),
  (c2, 'Password Managers and Passphrases',
   E'A password manager generates and stores a unique, random password for every account, and auto-fills it for you — you only need to remember one strong master password to unlock the manager itself. This single change eliminates the reused-password problem entirely, and is the single highest-impact security habit an individual can adopt.\n\nFor passwords you do need to remember yourself (like the master password), a long passphrase beats a short complex one. "correct-horse-battery-staple" (four random unrelated words) is both easier to remember and harder to crack than "P@ssw0rd1!" — length matters more than complexity for resisting automated guessing.\n\nAvoid patterns attackers already expect: appending "1", "!", or the current year to an old password; using a pet or family member''s name; reusing a slightly-modified version of a password from another account. These are the first things automated cracking tools try.', 1),
  (c2, 'Multi-Factor Authentication, Explained',
   E'Multi-factor authentication (MFA) means proving who you are with two different things: something you know (your password) and something you have (a code from an app, a hardware key, or a push notification to your phone). Even if an attacker steals your password, they cannot get in without also having your second factor.\n\nAn authenticator app (like Google Authenticator, Authy, or the one built into most password managers) is meaningfully more secure than SMS text codes, which can be intercepted through SIM-swapping attacks. Where available, use an authenticator app or a hardware security key over SMS.\n\nEnable MFA on your most important accounts first: your primary email (since it can reset passwords for everything else), your password manager, and any work accounts. A few minutes of setup on these three accounts closes off the most common path attackers use to take over everything else you own.', 2);

  insert into cybersachet_quiz_questions (course_id, question, choices, correct_index, sort_order) values
  (c2, 'Why is password reuse considered the biggest single account-security risk?', '["Reused passwords are always shorter", "A breach at any one reused site can be used to break into all your other accounts (credential stuffing)", "Password managers cannot handle reused passwords", "It only affects social media accounts"]', 1, 0),
  (c2, 'Which is generally the strongest, most memorable type of password?', '["An 8-character password with numbers and symbols, like P@ss1!", "A long passphrase of several unrelated words", "Your pet''s name plus the current year", "A short password reused across a few trusted sites"]', 1, 1),
  (c2, 'What does a password manager primarily solve?', '["It makes your internet connection more private", "It lets you use a unique, strong password for every account without memorizing them", "It blocks phishing emails automatically", "It replaces the need for MFA"]', 1, 2),
  (c2, 'Why is an authenticator app generally preferred over SMS text codes for MFA?', '["SMS codes expire too quickly to be useful", "SMS can be intercepted via SIM-swapping attacks; authenticator apps cannot be redirected that way", "Authenticator apps are free and SMS is not", "There is no real difference in security"]', 1, 3),
  (c2, 'If you can only enable MFA on a few accounts right now, which should you prioritize first?', '["Any account you rarely use", "Your primary email, since it can reset passwords for most other accounts", "Only work accounts", "Only social media accounts"]', 1, 4);

  insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order)
  values ('safe-browsing-social-engineering', 'Safe Browsing & Social Engineering', 'Recognize manipulation tactics that do not rely on malware at all, and build habits that hold up under pressure.', 'intermediate', 20, true, 2)
  returning id into c3;

  insert into cybersachet_lessons (course_id, title, body, sort_order) values
  (c3, 'Recognizing Social Engineering Tactics',
   E'Social engineering is manipulation, not hacking — attackers exploit trust, authority, and urgency instead of technical vulnerabilities. A few patterns show up again and again:\n\nPretexting: the attacker invents a believable scenario ("I''m from IT, we need to verify your login for a system migration") to get you to reveal information or take an action you otherwise would not.\n\nAuthority impersonation: posing as a boss, executive, auditor, or law enforcement to pressure quick compliance without normal questioning. People are conditioned not to push back on authority, which is exactly what attackers count on.\n\nTailgating: physically following an authorized person through a secured door without their own badge, often while carrying something (like a box) that makes it awkward for someone to stop and question them.\n\nQuid pro quo: offering something desirable — a prize, a free gift, "tech support" — in exchange for information or access.\n\nThe common thread across all of these is that they bypass technology entirely and target a person''s willingness to help, defer to authority, or avoid an awkward confrontation.', 0),
  (c3, 'Safe Link and Attachment Habits',
   E'Unexpected attachments — especially ones with extensions like .exe, .scr, .js, or macro-enabled Office documents (.docm, .xlsm) — are one of the most common ways malware gets onto a device. If you were not expecting a file from someone, verify with them directly before opening it, even if the email looks like it is from a real coworker or vendor.\n\nFor links, get in the habit of typing known important addresses (your bank, your company''s login portal) directly into the browser rather than clicking a link in an email, especially for anything involving credentials or payment.\n\nBrowser warnings about an insecure or suspicious site are not just noise — pay attention to them rather than clicking through automatically. Similarly, be cautious of URL shorteners in unsolicited messages, since they hide the real destination until you click.\n\nKeep your browser and operating system updated. Many real-world compromises exploit known vulnerabilities that a routine update would have already patched — attackers specifically target people running outdated software because it is easier.', 1),
  (c3, 'Reporting Suspicious Activity',
   E'A fast report is far more valuable than a perfect one. If something feels off — an odd request, an unfamiliar person in a secured area, a link that did not go where expected — report it to IT/security right away rather than waiting until you are fully certain.\n\nReporting early does two things: it protects you (organizations overwhelmingly want reports, not blame, because catching an attempt early prevents real damage) and it protects everyone else, since the same attempt is often sent to many people at once.\n\nThere is no such thing as a "dumb" report. Security teams would always rather investigate ten false alarms than miss the one real attempt because someone stayed quiet out of embarrassment or fear of wasting anyone''s time.', 2);

  insert into cybersachet_quiz_questions (course_id, question, choices, correct_index, sort_order) values
  (c3, 'What is the defining characteristic of social engineering attacks?', '["They always involve malware", "They exploit trust, authority, and urgency rather than technical vulnerabilities", "They only happen over the phone", "They require physical access to succeed"]', 1, 0),
  (c3, 'Someone you do not recognize is following closely behind you through a badge-secured door while carrying a box. This is an example of:', '["Pretexting", "Tailgating", "Quid pro quo", "Credential stuffing"]', 1, 1),
  (c3, 'What is the safest way to visit your bank or company login portal?', '["Click the link in the most recent email from them", "Search for it and click the first result", "Type the known address directly into your browser", "Use whatever link a coworker last shared"]', 2, 2),
  (c3, 'Why do attackers specifically target people running outdated software?', '["Outdated software is always slower", "Known vulnerabilities in outdated software are easier to exploit than finding new ones", "It is a coincidence with no real pattern", "Updated software is more expensive to attack"]', 1, 3),
  (c3, 'What is the best response when something feels slightly suspicious but you are not fully sure?', '["Wait until you are certain before saying anything", "Report it to IT/security promptly, even if it turns out to be nothing", "Handle it yourself quietly", "Only report it if it happens more than once"]', 1, 4);
end $$;
