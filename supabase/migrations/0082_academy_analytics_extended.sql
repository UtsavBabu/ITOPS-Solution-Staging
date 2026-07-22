-- Real analytics extension for the Academy admin dashboard: average
-- time-to-completion per course (a genuine "bottleneck" signal — a course
-- that takes learners 3x longer than its estimated_minutes suggests is
-- worth a look) and a platform-wide quiz score distribution. Both computed
-- live from cybersachet_enrollments, nothing precomputed or cached.

-- Postgres can't change a function's return shape via CREATE OR REPLACE
-- (adding avg_days_to_complete here) — must drop first.
drop function if exists admin_academy_course_stats();

create or replace function admin_academy_course_stats()
returns table (
  course_id uuid, title text, track text,
  enrollment_count bigint, completed_count bigint, avg_score numeric,
  avg_days_to_complete numeric
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select c.id, c.title, c.track,
    count(e.id),
    count(e.id) filter (where e.completed_at is not null),
    round(avg(e.quiz_score) filter (where e.quiz_score is not null), 1),
    round(avg(extract(epoch from (e.completed_at - e.enrolled_at)) / 86400) filter (where e.completed_at is not null), 1)
  from cybersachet_courses c
  left join cybersachet_enrollments e on e.course_id = c.id
  where c.published
  group by c.id, c.title, c.track
  order by count(e.id) desc, c.title;
end;
$$;
grant execute on function admin_academy_course_stats() to authenticated;

-- Platform-wide quiz score distribution, bucketed — a real histogram, not
-- just a single average, so an admin can see whether scores cluster near
-- passing (worth reviewing course difficulty) or spread evenly.
create or replace function admin_academy_score_distribution()
returns table (bucket text, sort_order int, count bigint)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select
    case
      when e.quiz_score < 60 then '0-59'
      when e.quiz_score < 70 then '60-69'
      when e.quiz_score < 80 then '70-79'
      when e.quiz_score < 90 then '80-89'
      else '90-100'
    end,
    case
      when e.quiz_score < 60 then 0
      when e.quiz_score < 70 then 1
      when e.quiz_score < 80 then 2
      when e.quiz_score < 90 then 3
      else 4
    end,
    count(*)
  from cybersachet_enrollments e
  where e.quiz_score is not null
  group by 1, 2
  order by 2;
end;
$$;
grant execute on function admin_academy_score_distribution() to authenticated;
