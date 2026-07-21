-- A real, lightweight "Instructor" platform role — deliberately NOT built
-- on the existing platform_admins/roles system, for a specific safety
-- reason: is_platform_admin() returns true for ANY row in platform_admins
-- regardless of its `role` column (see migration 0006), and the large
-- majority of admin RPCs across this codebase gate on that blanket check,
-- not on the fine-grained role_permissions grid. Adding "instructor" as a
-- platform_admins role would silently grant full admin access to every one
-- of those RPCs (customers, billing, users, content, roles...) unless every
-- single one were individually audited and re-gated — a large, risky
-- undertaking, and the opposite of "without giving them full platform-admin
-- privileges."
--
-- Instead: a separate, narrow platform_instructors table and an
-- is_platform_instructor() check that ONLY the specific academy-analytics
-- RPCs below opt into. Every other admin RPC is completely unaffected —
-- an instructor has zero access to them, by construction, not by audit.

create table platform_instructors (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  granted_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table platform_instructors enable row level security;
create policy platform_instructors_select on platform_instructors
  for select to authenticated using (is_platform_admin() or user_id = auth.uid());

create or replace function is_platform_instructor() returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select is_platform_admin() or exists (select 1 from platform_instructors where user_id = auth.uid());
$$;
grant execute on function is_platform_instructor() to authenticated;

-- Granting/revoking is itself admin-only (any platform admin role, not just
-- super_admin — this is a narrow, reversible, non-billing action).
create or replace function admin_set_platform_instructor(p_user_id uuid, p_is_instructor boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_email text;
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  select email into v_email from auth.users where id = p_user_id;
  if v_email is null then raise exception 'User not found'; end if;

  if p_is_instructor then
    insert into platform_instructors (user_id, granted_by) values (p_user_id, auth.uid())
    on conflict (user_id) do nothing;
  else
    delete from platform_instructors where user_id = p_user_id;
  end if;

  perform _log_admin_action(case when p_is_instructor then 'grant_instructor' else 'revoke_instructor' end, 'user', p_user_id::text, v_email);
end;
$$;
grant execute on function admin_set_platform_instructor(uuid, boolean) to authenticated;

create or replace function admin_list_platform_instructors()
returns table (user_id uuid, email text, granted_by_email text, created_at timestamptz)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  return query
  select pi.user_id, u.email::text, g.email::text, pi.created_at
  from platform_instructors pi
  join auth.users u on u.id = pi.user_id
  left join auth.users g on g.id = pi.granted_by
  order by pi.created_at desc;
end;
$$;
grant execute on function admin_list_platform_instructors() to authenticated;

-- Widen exactly three read-only analytics RPCs from is_platform_admin() to
-- is_platform_instructor() (which already includes is_platform_admin(), so
-- this only ever adds access, never removes it from existing admins).
-- Course authoring (admin_upsert_cybersachet_course and friends) and every
-- other admin RPC are untouched — an instructor cannot edit course content,
-- see customers, manage users, or touch billing.

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
  if not is_platform_instructor() then raise exception 'Not authorized'; end if;
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

create or replace function admin_academy_course_stats()
returns table (
  course_id uuid, title text, track text,
  enrollment_count bigint, completed_count bigint, avg_score numeric,
  avg_days_to_complete numeric
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_instructor() then raise exception 'Not authorized'; end if;
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

create or replace function admin_recent_academy_certificates(p_limit int default 15)
returns table (
  certificate_no text, organization_name text, user_email text,
  course_title text, level_code text, issued_at timestamptz, revoked_at timestamptz
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_instructor() then raise exception 'Not authorized'; end if;
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

create or replace function admin_academy_score_distribution()
returns table (bucket text, sort_order int, count bigint)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_instructor() then raise exception 'Not authorized'; end if;
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
