-- "Moonsav ITOps Academy" — a second, distinctly-branded training track
-- (Cloud/DevOps/Infrastructure) alongside the existing CyberSachet security-
-- awareness track, both running on the one real course/enrollment/
-- certificate engine built in migrations 0037-0071. Not a separate product
-- rebuild: same tables, same RLS, same license check (organization_products
-- 'cybersachet') — just a real `track` column so the two can be filtered,
-- managed, and presented as genuinely distinct storefronts.

alter table cybersachet_courses
  add column if not exists track text not null default 'security'
    check (track in ('security', 'academy'));

-- ---------------------------------------------------------------------------
-- Read RPCs — add track to the returned shape, and let callers filter by it.
-- ---------------------------------------------------------------------------

drop function if exists list_cybersachet_courses();
create or replace function list_cybersachet_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, sort_order int, category text, free_tier boolean, min_plan text, track text,
  lesson_count bigint, quiz_question_count bigint
)
language sql security definer stable set search_path = public, pg_temp as $$
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.sort_order, c.category, c.free_tier, c.min_plan, c.track,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_quiz_questions q where q.course_id = c.id)
  from cybersachet_courses c
  where c.published
  order by c.sort_order;
$$;
grant execute on function list_cybersachet_courses() to authenticated;

-- Public preview for the marketing page — title/description/level/duration
-- only, no lesson/quiz internals, and no license required to browse (same
-- boundary as list_cybersachet_courses' own published-only visibility, just
-- reachable from the anon-accessible marketing site too).
drop function if exists list_academy_preview_courses();
create or replace function list_academy_preview_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, category text, min_plan text
)
language sql stable set search_path = public, pg_temp as $$
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.category, c.min_plan
  from cybersachet_courses c
  where c.published and c.track = 'academy'
  order by c.sort_order;
$$;
grant execute on function list_academy_preview_courses() to anon, authenticated;

drop function if exists admin_list_cybersachet_courses();
create or replace function admin_list_cybersachet_courses()
returns table (
  id uuid, slug text, title text, description text, level text,
  estimated_minutes int, published boolean, sort_order int, category text, free_tier boolean, min_plan text, track text,
  lesson_count bigint, quiz_question_count bigint, enrollment_count bigint
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select c.id, c.slug, c.title, c.description, c.level, c.estimated_minutes, c.published, c.sort_order, c.category, c.free_tier, c.min_plan, c.track,
    (select count(*) from cybersachet_lessons l where l.course_id = c.id),
    (select count(*) from cybersachet_quiz_questions q where q.course_id = c.id),
    (select count(*) from cybersachet_enrollments e where e.course_id = c.id)
  from cybersachet_courses c
  order by c.sort_order;
end;
$$;
grant execute on function admin_list_cybersachet_courses() to authenticated;

drop function if exists admin_upsert_cybersachet_course(uuid, text, text, text, text, int, boolean, int, text, text);
create or replace function admin_upsert_cybersachet_course(
  p_id uuid, p_slug text, p_title text, p_description text, p_level text,
  p_estimated_minutes int, p_published boolean, p_sort_order int,
  p_category text default 'security-awareness', p_min_plan text default 'PROFESSIONAL',
  p_track text default 'security'
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
  if p_track not in ('security', 'academy') then
    raise exception 'Invalid track: %', p_track;
  end if;
  v_free_tier := (p_min_plan = 'STARTER');

  if p_id is null then
    insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order, category, min_plan, free_tier, track)
    values (p_slug, p_title, p_description, p_level, p_estimated_minutes, p_published, p_sort_order, p_category, p_min_plan, v_free_tier, p_track)
    returning id into v_id;
  else
    update cybersachet_courses set
      slug = p_slug, title = p_title, description = p_description, level = p_level,
      estimated_minutes = p_estimated_minutes, published = p_published, sort_order = p_sort_order,
      category = p_category, min_plan = p_min_plan, free_tier = v_free_tier, track = p_track, updated_at = now()
    where id = p_id
    returning id into v_id;
  end if;

  perform _log_admin_action(case when p_id is null then 'create_course' else 'update_course' end, 'cybersachet_course', v_id::text, p_title);
  return v_id;
end;
$$;
grant execute on function admin_upsert_cybersachet_course(uuid, text, text, text, text, int, boolean, int, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Real operational dashboard for Platform Admin — every number is a live
-- aggregate over the same tables the rest of CyberSachet/Academy already
-- uses, nothing precomputed or cached into a fake "analytics" table.
-- ---------------------------------------------------------------------------

create or replace function admin_academy_dashboard_stats()
returns table (
  total_students bigint,
  total_organizations bigint,
  active_courses bigint,
  academy_courses bigint,
  security_courses bigint,
  certificates_issued bigint,
  completed_enrollments bigint,
  total_enrollments bigint,
  avg_quiz_score numeric,
  total_training_hours numeric
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select
    (select count(distinct user_id) from cybersachet_enrollments),
    (select count(distinct organization_id) from cybersachet_enrollments),
    (select count(*) from cybersachet_courses where published),
    (select count(*) from cybersachet_courses where published and track = 'academy'),
    (select count(*) from cybersachet_courses where published and track = 'security'),
    (select count(*) from cybersachet_certificates where revoked_at is null),
    (select count(*) from cybersachet_enrollments where completed_at is not null),
    (select count(*) from cybersachet_enrollments),
    (select round(avg(quiz_score), 1) from cybersachet_enrollments where quiz_score is not null),
    (select round(coalesce(sum(c.estimated_minutes), 0) / 60.0, 1)
       from cybersachet_enrollments e join cybersachet_courses c on c.id = e.course_id
       where e.completed_at is not null);
end;
$$;
grant execute on function admin_academy_dashboard_stats() to authenticated;

-- Per-course popularity/completion, for the dashboard's "Popular Courses"
-- and "Completion Rate" lists — real counts, ranked by real enrollment.
create or replace function admin_academy_course_stats()
returns table (
  course_id uuid, title text, track text,
  enrollment_count bigint, completed_count bigint, avg_score numeric
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select c.id, c.title, c.track,
    count(e.id),
    count(e.id) filter (where e.completed_at is not null),
    round(avg(e.quiz_score) filter (where e.quiz_score is not null), 1)
  from cybersachet_courses c
  left join cybersachet_enrollments e on e.course_id = c.id
  where c.published
  group by c.id, c.title, c.track
  order by count(e.id) desc, c.title;
end;
$$;
grant execute on function admin_academy_course_stats() to authenticated;

-- Recent certificates across every organization — real rows, each linking
-- to the same public /verify/:certificateNo page anyone else uses, so
-- "click a certificate" actually opens the real verification record.
create or replace function admin_recent_academy_certificates(p_limit int default 15)
returns table (
  certificate_no text, organization_name text, user_email text,
  course_title text, level_code text, issued_at timestamptz, revoked_at timestamptz
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select c.certificate_no, o.name, u.email::text, c.course_title, c.level_code, c.issued_at, c.revoked_at
  from cybersachet_certificates c
  join organizations o on o.id = c.organization_id
  join auth.users u on u.id = c.user_id
  order by c.issued_at desc
  limit least(greatest(p_limit, 1), 50);
end;
$$;
grant execute on function admin_recent_academy_certificates(int) to authenticated;
