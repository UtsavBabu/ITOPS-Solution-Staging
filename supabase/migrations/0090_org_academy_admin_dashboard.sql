-- Real data for a focused, org-scoped "Manage Academy" admin dashboard —
-- distinct from the platform-wide AdminAcademyDashboard.jsx (which is
-- platform-admin/instructor only, across every organization) and from the
-- general Users.jsx roster (which covers ops roles, billing, everything).
-- This is scoped to the calling org and to the 'academy' track only, since
-- CyberSachet's own security-course numbers already have their own real
-- reporting and shouldn't be blended into an Academy-specific view.

create or replace function org_academy_summary()
returns table (
  member_count bigint,
  active_course_count bigint,
  group_count bigint,
  avg_score numeric,
  recent_members jsonb
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return; end if;
  if not has_org_permission(v_org_id, 'training', 'view') then
    raise exception 'Not authorized — training visibility required';
  end if;

  return query
  select
    (select count(*) from memberships where organization_id = v_org_id),
    (select count(*) from cybersachet_courses c where c.track = 'academy' and c.published and _cybersachet_course_allowed(c.id)),
    (select count(*) from departments where organization_id = v_org_id and archived_at is null)
      + (select count(*) from teams t join departments d on d.id = t.department_id where d.organization_id = v_org_id and t.archived_at is null),
    (select round(avg(e.quiz_score), 1)
       from cybersachet_enrollments e
       join memberships m on m.user_id = e.user_id and m.organization_id = v_org_id
       join cybersachet_courses c on c.id = e.course_id and c.track = 'academy'
       where e.completed_at is not null),
    (select coalesce(jsonb_agg(jsonb_build_object('userId', m.user_id, 'email', u.email, 'joinedAt', m.joined_at) order by m.joined_at desc), '[]'::jsonb)
       from (select * from memberships where organization_id = v_org_id order by joined_at desc limit 5) m
       join auth.users u on u.id = m.user_id);
end;
$$;
grant execute on function org_academy_summary() to authenticated;

create or replace function org_academy_course_stats()
returns table (
  course_id uuid, title text, category text, level text, min_plan text,
  assigned_count bigint, completed_count bigint, completion_pct int, avg_score numeric
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return; end if;
  if not has_org_permission(v_org_id, 'training', 'view') then
    raise exception 'Not authorized — training visibility required';
  end if;

  return query
  select c.id, c.title, c.category, c.level, c.min_plan,
    coalesce(count(a.id), 0),
    coalesce(count(a.id) filter (where e.completed_at is not null), 0),
    case when count(a.id) = 0 then 0 else round(count(a.id) filter (where e.completed_at is not null)::numeric / count(a.id) * 100)::int end,
    round(avg(e.quiz_score) filter (where e.completed_at is not null), 1)
  from cybersachet_courses c
  left join cybersachet_assignments a on a.course_id = c.id and a.organization_id = v_org_id
  left join cybersachet_enrollments e on e.course_id = c.id and e.user_id = a.user_id
  where c.track = 'academy' and c.published and _cybersachet_course_allowed(c.id)
  group by c.id, c.title, c.category, c.level, c.min_plan, c.sort_order
  order by c.sort_order;
end;
$$;
grant execute on function org_academy_course_stats() to authenticated;
