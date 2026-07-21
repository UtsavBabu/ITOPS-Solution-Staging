-- Same class of regression as migration 0074's CSSA certificate fix: the
-- 'completionist' badge in my_cybersachet_stats() compared completed
-- enrollments against every published course regardless of track, so once
-- Academy (Cloud/DevOps) courses exist, a user who finishes every
-- CyberSachet security course would never earn 'completionist' unless they
-- also finished the unrelated Academy catalog. The badge's own name and
-- history ("completed every published course") only ever meant the
-- security catalog — scope it there. The rest of the function (overall
-- completed/in-progress/avg-score/hours/streak) intentionally stays a
-- combined total across both products, since those are a holistic "how
-- much training have I done" view, not a completion gate — only
-- 'completionist' needs its own scoped count. Byte-faithful copy of the
-- 0045 body otherwise.

create or replace function my_cybersachet_stats()
returns table (completed_courses int, in_progress_courses int, avg_score numeric, hours_trained numeric, streak_days int, badges text[])
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_completed int;
  v_in_progress int;
  v_avg numeric;
  v_hours numeric;
  v_published int;
  v_completed_security int;
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

  select count(*) into v_published from cybersachet_courses where published and track = 'security';
  select count(*) into v_completed_security
    from cybersachet_enrollments e join cybersachet_courses c on c.id = e.course_id
    where e.user_id = auth.uid() and e.completed_at is not null and c.track = 'security';

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
  if v_published > 0 and coalesce(v_completed_security, 0) >= v_published then v_badges := v_badges || 'completionist'; end if;
  if v_has_cert then v_badges := v_badges || 'certified'; end if;
  if v_streak >= 3 then v_badges := v_badges || 'streak_3'; end if;
  if v_streak >= 7 then v_badges := v_badges || 'streak_7'; end if;

  return query select coalesce(v_completed, 0), coalesce(v_in_progress, 0), v_avg, coalesce(v_hours, 0), v_streak, v_badges;
end;
$$;
grant execute on function my_cybersachet_stats() to authenticated;
