-- Real "assign a course to a whole Department or Team at once" — reuses
-- the org's actual Department/Team structure (migrations 0049, 0063)
-- rather than inventing a separate "group" concept. Same authorization and
-- license checks as the existing per-person assign_cybersachet_course(),
-- just looping over every member of the given department/team instead of
-- one user_id.

create or replace function bulk_assign_cybersachet_course(p_course_id uuid, p_department_id uuid default null, p_team_id uuid default null, p_due_at timestamptz default null)
returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_course_title text;
  v_target_label text;
  v_count int := 0;
begin
  if p_department_id is null and p_team_id is null then
    raise exception 'Pick a department or a team to assign to';
  end if;

  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'training', 'manage') then
    raise exception 'Not authorized — training management access required';
  end if;
  if not exists (select 1 from organization_products where organization_id = v_org_id and product_key = 'cybersachet' and status = 'active') then
    raise exception 'Your organization does not have an active CyberSachet license';
  end if;

  select title into v_course_title from cybersachet_courses where id = p_course_id;
  if v_course_title is null then raise exception 'Course not found'; end if;

  if p_team_id is not null then
    if not exists (select 1 from teams where id = p_team_id and organization_id = v_org_id) then
      raise exception 'Team not found';
    end if;
    select name into v_target_label from teams where id = p_team_id;
  else
    if not exists (select 1 from departments where id = p_department_id and organization_id = v_org_id) then
      raise exception 'Department not found';
    end if;
    select name into v_target_label from departments where id = p_department_id;
  end if;

  insert into cybersachet_assignments (organization_id, user_id, course_id, assigned_by, due_at)
  select v_org_id, m.user_id, p_course_id, auth.uid(), p_due_at
  from memberships m
  where m.organization_id = v_org_id
    and (
      (p_team_id is not null and m.team_id = p_team_id)
      or (p_team_id is null and m.department_id = p_department_id)
    )
  on conflict (user_id, course_id) do update set due_at = excluded.due_at, assigned_by = excluded.assigned_by, assigned_at = now();
  get diagnostics v_count = row_count;

  perform _log_admin_action('bulk_assign_cybersachet_course', 'cybersachet_assignment', v_org_id::text,
    v_count::text || ' member(s) in ' || coalesce(v_target_label, 'group') || ' — ' || v_course_title);
  return v_count;
end;
$$;
grant execute on function bulk_assign_cybersachet_course(uuid, uuid, uuid, timestamptz) to authenticated;
