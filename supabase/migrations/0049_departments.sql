-- Departments — a real, bounded slice of "customer training management":
-- an organization can group its own members into departments (IT,
-- Security, Finance, ...), assign a manager, and see real per-department
-- CyberSachet training progress and compliance. Reuses the existing
-- memberships/cybersachet_assignments/cybersachet_enrollments tables and
-- the dynamic RBAC engine's existing `team` module permission (the same
-- one that already gates member-role editing on Team & Plan) — not a new
-- permission module, not a parallel reporting system.
--
-- Deliberately not in this migration: groups/teams/projects as a layer
-- distinct from departments, bulk CSV import, bulk reminder emails, and a
-- customer-facing course builder — each is separate, substantial work in
-- its own right (see DEPLOY.md).

create table departments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  name              text not null,
  manager_user_id   uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  archived_at       timestamptz
);
create index departments_org_idx on departments(organization_id);
-- Two departments can't share a name while both active; an archived one
-- doesn't block reusing its name for a new department.
create unique index departments_org_name_uidx on departments(organization_id, name) where archived_at is null;
alter table departments enable row level security;
create policy departments_select on departments for select to authenticated using (
  is_org_member(organization_id) or is_platform_admin()
);

alter table memberships add column department_id uuid references departments(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Reads — any org member can see the department list and the compliance
-- report (informational, same visibility level the CyberSachet leaderboard
-- already has); only has_org_permission(org,'team','manage') can mutate.
-- ---------------------------------------------------------------------------

create or replace function list_departments()
returns table (id uuid, name text, manager_user_id uuid, manager_email text, member_count bigint, archived boolean)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return; end if;

  return query
  select d.id, d.name, d.manager_user_id, mu.email::text,
    (select count(*) from memberships m where m.department_id = d.id),
    d.archived_at is not null
  from departments d
  left join auth.users mu on mu.id = d.manager_user_id
  where d.organization_id = v_org_id
  order by d.archived_at is not null, d.name;
end;
$$;
grant execute on function list_departments() to authenticated;

-- Real department-level training progress and compliance — completion
-- rate and average score computed from real cybersachet_assignments /
-- cybersachet_enrollments joined through memberships.department_id.
-- "Unassigned" (department_id is null) is included as its own row so the
-- numbers always add up to the organization total.
create or replace function department_training_report()
returns table (department_id uuid, department_name text, member_count bigint, assigned_count bigint, completed_count bigint, completion_pct int, avg_score numeric)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return; end if;

  return query
  with dept as (
    select d.id, d.name from departments d where d.organization_id = v_org_id and d.archived_at is null
    union all
    select null::uuid, 'Unassigned'
  ),
  member_counts as (
    select m.department_id, count(*) as member_count
    from memberships m where m.organization_id = v_org_id
    group by m.department_id
  ),
  assignment_stats as (
    select m.department_id,
      count(*) as assigned_count,
      count(*) filter (where e.completed_at is not null) as completed_count,
      avg(e.quiz_score) filter (where e.completed_at is not null) as avg_score
    from cybersachet_assignments a
    join memberships m on m.user_id = a.user_id and m.organization_id = a.organization_id
    left join cybersachet_enrollments e on e.user_id = a.user_id and e.course_id = a.course_id
    where a.organization_id = v_org_id
    group by m.department_id
  )
  select dept.id, dept.name,
    coalesce(mc.member_count, 0),
    coalesce(ast.assigned_count, 0),
    coalesce(ast.completed_count, 0),
    case when coalesce(ast.assigned_count, 0) = 0 then 0 else round(ast.completed_count::numeric / ast.assigned_count * 100)::int end,
    round(ast.avg_score, 1)
  from dept
  left join member_counts mc on mc.department_id is not distinct from dept.id
  left join assignment_stats ast on ast.department_id is not distinct from dept.id
  order by dept.id is null, dept.name;
end;
$$;
grant execute on function department_training_report() to authenticated;

-- ---------------------------------------------------------------------------
-- Mutations — gated by has_org_permission(v_org_id, 'team', 'manage'), the
-- same check Team & Plan already uses for member-role editing.
-- ---------------------------------------------------------------------------

create or replace function create_department(p_name text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'Department name is required'; end if;

  insert into departments (organization_id, name) values (v_org_id, btrim(p_name)) returning id into v_id;
  perform _log_admin_action('create_department', 'department', v_id::text, p_name);
  return v_id;
end;
$$;
grant execute on function create_department(text) to authenticated;

create or replace function rename_department(p_department_id uuid, p_name text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'Department name is required'; end if;
  if not exists (select 1 from departments where id = p_department_id and organization_id = v_org_id) then
    raise exception 'Department not found';
  end if;

  update departments set name = btrim(p_name) where id = p_department_id;
  perform _log_admin_action('rename_department', 'department', p_department_id::text, p_name);
end;
$$;
grant execute on function rename_department(uuid, text) to authenticated;

create or replace function archive_department(p_department_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  if not exists (select 1 from departments where id = p_department_id and organization_id = v_org_id) then
    raise exception 'Department not found';
  end if;

  update departments set archived_at = now() where id = p_department_id;
  perform _log_admin_action('archive_department', 'department', p_department_id::text, null);
end;
$$;
grant execute on function archive_department(uuid) to authenticated;

create or replace function restore_department(p_department_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  if not exists (select 1 from departments where id = p_department_id and organization_id = v_org_id) then
    raise exception 'Department not found';
  end if;
  if exists (select 1 from departments where organization_id = v_org_id and archived_at is null and name = (select name from departments where id = p_department_id)) then
    raise exception 'An active department with this name already exists';
  end if;

  update departments set archived_at = null where id = p_department_id;
  perform _log_admin_action('restore_department', 'department', p_department_id::text, null);
end;
$$;
grant execute on function restore_department(uuid) to authenticated;

create or replace function delete_department(p_department_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_name text;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;

  select name into v_name from departments where id = p_department_id and organization_id = v_org_id;
  if v_name is null then raise exception 'Department not found'; end if;

  -- Members keep their account; they just become unassigned (department_id
  -- on their membership row is set null by the column's own FK action).
  delete from departments where id = p_department_id;
  perform _log_admin_action('delete_department', 'department', p_department_id::text, v_name);
end;
$$;
grant execute on function delete_department(uuid) to authenticated;

create or replace function assign_department_manager(p_department_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  if not exists (select 1 from departments where id = p_department_id and organization_id = v_org_id) then
    raise exception 'Department not found';
  end if;
  if p_user_id is not null and not exists (select 1 from memberships where organization_id = v_org_id and user_id = p_user_id) then
    raise exception 'That user is not a member of your organization';
  end if;

  update departments set manager_user_id = p_user_id where id = p_department_id;
  perform _log_admin_action('assign_department_manager', 'department', p_department_id::text, p_user_id::text);
end;
$$;
grant execute on function assign_department_manager(uuid, uuid) to authenticated;

create or replace function assign_member_department(p_user_id uuid, p_department_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  if not exists (select 1 from memberships where organization_id = v_org_id and user_id = p_user_id) then
    raise exception 'That user is not a member of your organization';
  end if;
  if p_department_id is not null and not exists (select 1 from departments where id = p_department_id and organization_id = v_org_id) then
    raise exception 'Department not found';
  end if;

  update memberships set department_id = p_department_id where organization_id = v_org_id and user_id = p_user_id;
  perform _log_admin_action('assign_member_department', 'department', coalesce(p_department_id::text, 'none'), p_user_id::text);
end;
$$;
grant execute on function assign_member_department(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_organization_members() gains department_id/department_name —
-- return-shape change, so drop-then-create (the same rule as everywhere
-- else in this codebase).
-- ---------------------------------------------------------------------------

drop function if exists list_organization_members();
create or replace function list_organization_members()
returns table (
  user_id         uuid,
  email           text,
  role            text,
  joined_at       timestamptz,
  department_id   uuid,
  department_name text
)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select m.organization_id into v_org_id from memberships m where m.user_id = auth.uid() limit 1;
  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  return query
    select m.user_id, u.email::text, m.role, m.created_at, m.department_id, d.name
    from memberships m
    join auth.users u on u.id = m.user_id
    left join departments d on d.id = m.department_id
    where m.organization_id = v_org_id
    order by m.created_at asc;
end;
$$;
grant execute on function list_organization_members() to authenticated;
