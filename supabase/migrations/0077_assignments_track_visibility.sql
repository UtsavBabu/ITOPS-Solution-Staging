-- Real gap found while auditing the Academy launch: an org admin (Users
-- page) and a platform admin (Customers page) both assign/review CyberSachet
-- courses, and now that cybersachet_courses spans two distinctly-branded
-- products (security vs academy), neither list told them which product a
-- course belonged to — no way to tell a security assignment from an Academy
-- one in the dropdown or the assignment table. Adds `track` to both
-- RPCs' return shape; byte-faithful otherwise.

create or replace function list_org_cybersachet_assignments()
returns table (
  user_id uuid, user_email text,
  course_id uuid, course_title text, track text,
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
  select a.user_id, u.email::text, a.course_id, c.title, c.track, a.assigned_at, a.due_at, e.completed_at, e.quiz_score
  from cybersachet_assignments a
  join auth.users u on u.id = a.user_id
  join cybersachet_courses c on c.id = a.course_id
  left join cybersachet_enrollments e on e.user_id = a.user_id and e.course_id = a.course_id
  where a.organization_id = v_org_id
  order by a.assigned_at desc;
end;
$$;
grant execute on function list_org_cybersachet_assignments() to authenticated;

create or replace function admin_list_cybersachet_assignments(p_organization_id uuid)
returns table (
  user_id uuid, user_email text,
  course_id uuid, course_title text, track text,
  assigned_at timestamptz, due_at timestamptz,
  completed_at timestamptz, quiz_score int
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select a.user_id, u.email::text, a.course_id, c.title, c.track, a.assigned_at, a.due_at, e.completed_at, e.quiz_score
  from cybersachet_assignments a
  join auth.users u on u.id = a.user_id
  join cybersachet_courses c on c.id = a.course_id
  left join cybersachet_enrollments e on e.user_id = a.user_id and e.course_id = a.course_id
  where a.organization_id = p_organization_id
  order by a.assigned_at desc;
end;
$$;
grant execute on function admin_list_cybersachet_assignments(uuid) to authenticated;
