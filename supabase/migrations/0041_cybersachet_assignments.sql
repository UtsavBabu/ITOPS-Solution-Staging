-- Per-user CyberSachet course assignment.
--
-- Today (0037), licensing CyberSachet for an organization opens the whole
-- course catalog to every member — there's no way to require a specific
-- person complete a specific course, or see who has and hasn't. This adds
-- that layer without changing the existing open-catalog behavior: an
-- assignment is a requirement + tracking record (shows as "Assigned to
-- you" and feeds admin reporting), not an access restriction — every
-- licensed member can still browse and take any course. If stricter
-- access-gating (assigned-only visibility) turns out to be what's actually
-- wanted, that's a follow-up change to the RLS policy on
-- cybersachet_courses_select, not this migration.

create table cybersachet_assignments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  course_id       uuid not null references cybersachet_courses(id) on delete cascade,
  assigned_by     uuid references auth.users(id),
  assigned_at     timestamptz not null default now(),
  due_at          timestamptz,
  unique (user_id, course_id)
);
create index cybersachet_assignments_org_idx on cybersachet_assignments(organization_id);
alter table cybersachet_assignments enable row level security;

create policy cybersachet_assignments_select on cybersachet_assignments for select to authenticated using (
  user_id = auth.uid() or is_org_member(organization_id) or is_platform_admin()
);

-- ---------------------------------------------------------------------------
-- Customer-facing: what's assigned to me
-- ---------------------------------------------------------------------------

create or replace function my_cybersachet_assignments()
returns table (course_id uuid, assigned_at timestamptz, due_at timestamptz)
language sql security definer stable set search_path = public, pg_temp as $$
  select course_id, assigned_at, due_at
  from cybersachet_assignments
  where user_id = auth.uid();
$$;
grant execute on function my_cybersachet_assignments() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: assign / unassign / list, mirroring admin_set_org_product's shape
-- ---------------------------------------------------------------------------

create or replace function admin_assign_cybersachet_course(p_organization_id uuid, p_user_id uuid, p_course_id uuid, p_due_at timestamptz default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_name text;
  v_user_email text;
  v_course_title text;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from organization_products where organization_id = p_organization_id and product_key = 'cybersachet' and status = 'active') then
    raise exception 'Organization does not have an active CyberSachet license';
  end if;
  if not exists (select 1 from memberships where organization_id = p_organization_id and user_id = p_user_id) then
    raise exception 'That user is not a member of this organization';
  end if;

  select name into v_org_name from organizations where id = p_organization_id;
  select email into v_user_email from auth.users where id = p_user_id;
  select title into v_course_title from cybersachet_courses where id = p_course_id;
  if v_course_title is null then raise exception 'Course not found'; end if;

  insert into cybersachet_assignments (organization_id, user_id, course_id, assigned_by, due_at)
  values (p_organization_id, p_user_id, p_course_id, auth.uid(), p_due_at)
  on conflict (user_id, course_id) do update set due_at = excluded.due_at, assigned_by = excluded.assigned_by, assigned_at = now();

  perform _log_admin_action('assign_cybersachet_course', 'cybersachet_assignment', p_organization_id::text, v_org_name || ' — ' || coalesce(v_user_email, 'user') || ' — ' || v_course_title);
end;
$$;

create or replace function admin_unassign_cybersachet_course(p_organization_id uuid, p_user_id uuid, p_course_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_name text;
  v_user_email text;
  v_course_title text;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select name into v_org_name from organizations where id = p_organization_id;
  select email into v_user_email from auth.users where id = p_user_id;
  select title into v_course_title from cybersachet_courses where id = p_course_id;

  delete from cybersachet_assignments where organization_id = p_organization_id and user_id = p_user_id and course_id = p_course_id;

  perform _log_admin_action('unassign_cybersachet_course', 'cybersachet_assignment', p_organization_id::text, v_org_name || ' — ' || coalesce(v_user_email, 'user') || ' — ' || coalesce(v_course_title, 'course'));
end;
$$;

-- One row per (user, course) already assigned, plus every course's
-- completion status for that user where an enrollment exists — enough for
-- the admin panel to render a member x course matrix in one round trip.
create or replace function admin_list_cybersachet_assignments(p_organization_id uuid)
returns table (
  user_id uuid, user_email text,
  course_id uuid, course_title text,
  assigned_at timestamptz, due_at timestamptz,
  completed_at timestamptz, quiz_score int
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select a.user_id, u.email::text, a.course_id, c.title, a.assigned_at, a.due_at, e.completed_at, e.quiz_score
  from cybersachet_assignments a
  join auth.users u on u.id = a.user_id
  join cybersachet_courses c on c.id = a.course_id
  left join cybersachet_enrollments e on e.user_id = a.user_id and e.course_id = a.course_id
  where a.organization_id = p_organization_id
  order by a.assigned_at desc;
end;
$$;

grant execute on function admin_assign_cybersachet_course(uuid, uuid, uuid, timestamptz) to authenticated;
grant execute on function admin_unassign_cybersachet_course(uuid, uuid, uuid) to authenticated;
grant execute on function admin_list_cybersachet_assignments(uuid) to authenticated;
