-- Teams within Departments — explicitly deferred at the end of migration
-- 0049's own comment ("groups/teams/projects as a layer distinct from
-- departments... separate, substantial work in its own right"). Built now
-- as that separate slice: a team always belongs to one department
-- (Engineering > Backend/Frontend/DevOps), has its own lead distinct from
-- the department's manager, and training/monitoring compliance can be
-- reported per team the same real way it already is per department.
-- Mirrors 0049's exact pattern — same RBAC boundary (team:manage to
-- mutate, any org member to read), same archive-not-delete lifecycle.

create table teams (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  department_id     uuid not null references departments(id) on delete cascade,
  name              text not null,
  lead_user_id      uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  archived_at       timestamptz
);
create index teams_org_idx on teams(organization_id);
create index teams_department_idx on teams(department_id);
create unique index teams_department_name_uidx on teams(department_id, name) where archived_at is null;
alter table teams enable row level security;
create policy teams_select on teams for select to authenticated using (
  is_org_member(organization_id) or is_platform_admin()
);

alter table memberships add column team_id uuid references teams(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Reads — any org member, same visibility level as departments.
-- ---------------------------------------------------------------------------

create or replace function list_teams(p_department_id uuid default null)
returns table (id uuid, department_id uuid, department_name text, name text, lead_user_id uuid, lead_email text, member_count bigint, archived boolean)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return; end if;

  return query
  select t.id, t.department_id, d.name, t.name, t.lead_user_id, lu.email::text,
    (select count(*) from memberships m where m.team_id = t.id),
    t.archived_at is not null
  from teams t
  join departments d on d.id = t.department_id
  left join auth.users lu on lu.id = t.lead_user_id
  where t.organization_id = v_org_id and (p_department_id is null or t.department_id = p_department_id)
  order by t.archived_at is not null, d.name, t.name;
end;
$$;
grant execute on function list_teams(uuid) to authenticated;

-- Real per-team training compliance, same computation as
-- department_training_report() grouped one level deeper. "Unassigned"
-- covers members in a department but not (yet) in any team within it.
create or replace function team_training_report()
returns table (team_id uuid, team_name text, department_name text, member_count bigint, assigned_count bigint, completed_count bigint, completion_pct int, avg_score numeric)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then return; end if;

  return query
  with tm as (
    select t.id, t.name, d.name as dept_name from teams t
      join departments d on d.id = t.department_id
      where t.organization_id = v_org_id and t.archived_at is null
  ),
  member_counts as (
    select m.team_id, count(*) as member_count
    from memberships m where m.organization_id = v_org_id and m.team_id is not null
    group by m.team_id
  ),
  assignment_stats as (
    select m.team_id,
      count(*) as assigned_count,
      count(*) filter (where e.completed_at is not null) as completed_count,
      avg(e.quiz_score) filter (where e.completed_at is not null) as avg_score
    from cybersachet_assignments a
    join memberships m on m.user_id = a.user_id and m.organization_id = a.organization_id
    left join cybersachet_enrollments e on e.user_id = a.user_id and e.course_id = a.course_id
    where a.organization_id = v_org_id and m.team_id is not null
    group by m.team_id
  )
  select tm.id, tm.name, tm.dept_name,
    coalesce(mc.member_count, 0),
    coalesce(ast.assigned_count, 0),
    coalesce(ast.completed_count, 0),
    case when coalesce(ast.assigned_count, 0) = 0 then 0 else round(ast.completed_count::numeric / ast.assigned_count * 100)::int end,
    round(ast.avg_score, 1)
  from tm
  left join member_counts mc on mc.team_id = tm.id
  left join assignment_stats ast on ast.team_id = tm.id
  order by tm.dept_name, tm.name;
end;
$$;
grant execute on function team_training_report() to authenticated;

-- ---------------------------------------------------------------------------
-- Mutations — has_org_permission(v_org_id, 'team', 'manage'), same boundary
-- departments already use.
-- ---------------------------------------------------------------------------

create or replace function create_team(p_department_id uuid, p_name text)
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
  if p_name is null or btrim(p_name) = '' then raise exception 'Team name is required'; end if;
  if not exists (select 1 from departments where id = p_department_id and organization_id = v_org_id) then
    raise exception 'Department not found';
  end if;

  insert into teams (organization_id, department_id, name) values (v_org_id, p_department_id, btrim(p_name)) returning id into v_id;
  perform _log_admin_action('create_team', 'team', v_id::text, p_name);
  return v_id;
end;
$$;
grant execute on function create_team(uuid, text) to authenticated;

create or replace function rename_team(p_team_id uuid, p_name text)
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
  if p_name is null or btrim(p_name) = '' then raise exception 'Team name is required'; end if;
  if not exists (select 1 from teams where id = p_team_id and organization_id = v_org_id) then
    raise exception 'Team not found';
  end if;

  update teams set name = btrim(p_name) where id = p_team_id;
  perform _log_admin_action('rename_team', 'team', p_team_id::text, p_name);
end;
$$;
grant execute on function rename_team(uuid, text) to authenticated;

create or replace function archive_team(p_team_id uuid)
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
  if not exists (select 1 from teams where id = p_team_id and organization_id = v_org_id) then
    raise exception 'Team not found';
  end if;

  update teams set archived_at = now() where id = p_team_id;
  perform _log_admin_action('archive_team', 'team', p_team_id::text, null);
end;
$$;
grant execute on function archive_team(uuid) to authenticated;

create or replace function restore_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_department_id uuid;
  v_name text;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  select department_id, name into v_department_id, v_name from teams where id = p_team_id and organization_id = v_org_id;
  if v_department_id is null then raise exception 'Team not found'; end if;
  if exists (select 1 from teams where department_id = v_department_id and archived_at is null and name = v_name) then
    raise exception 'An active team with this name already exists in this department';
  end if;

  update teams set archived_at = null where id = p_team_id;
  perform _log_admin_action('restore_team', 'team', p_team_id::text, null);
end;
$$;
grant execute on function restore_team(uuid) to authenticated;

create or replace function delete_team(p_team_id uuid)
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

  select name into v_name from teams where id = p_team_id and organization_id = v_org_id;
  if v_name is null then raise exception 'Team not found'; end if;

  delete from teams where id = p_team_id;
  perform _log_admin_action('delete_team', 'team', p_team_id::text, v_name);
end;
$$;
grant execute on function delete_team(uuid) to authenticated;

create or replace function assign_team_lead(p_team_id uuid, p_user_id uuid)
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
  if not exists (select 1 from teams where id = p_team_id and organization_id = v_org_id) then
    raise exception 'Team not found';
  end if;
  if p_user_id is not null and not exists (select 1 from memberships where organization_id = v_org_id and user_id = p_user_id) then
    raise exception 'That user is not a member of your organization';
  end if;

  update teams set lead_user_id = p_user_id where id = p_team_id;
  perform _log_admin_action('assign_team_lead', 'team', p_team_id::text, p_user_id::text);
end;
$$;
grant execute on function assign_team_lead(uuid, uuid) to authenticated;

-- Assigning a member to a team also sets their department to that team's
-- department — a team member is a department member by definition, and
-- letting the two drift apart (team in Engineering, department in Sales)
-- would be a real, confusing data inconsistency, not a feature.
create or replace function assign_member_team(p_user_id uuid, p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_department_id uuid;
begin
  select organization_id into v_org_id from memberships where user_id = auth.uid() limit 1;
  if v_org_id is null then raise exception 'No organization membership found for current user'; end if;
  if not has_org_permission(v_org_id, 'team', 'manage') then
    raise exception 'Not authorized — team management access required';
  end if;
  if not exists (select 1 from memberships where organization_id = v_org_id and user_id = p_user_id) then
    raise exception 'That user is not a member of your organization';
  end if;

  if p_team_id is null then
    update memberships set team_id = null where organization_id = v_org_id and user_id = p_user_id;
  else
    select department_id into v_department_id from teams where id = p_team_id and organization_id = v_org_id;
    if v_department_id is null then raise exception 'Team not found'; end if;
    update memberships set team_id = p_team_id, department_id = v_department_id where organization_id = v_org_id and user_id = p_user_id;
  end if;
  perform _log_admin_action('assign_member_team', 'team', coalesce(p_team_id::text, 'none'), p_user_id::text);
end;
$$;
grant execute on function assign_member_team(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_organization_members() gains team_id/team_name — shape change.
-- ---------------------------------------------------------------------------

drop function if exists list_organization_members();
create or replace function list_organization_members()
returns table (
  user_id         uuid,
  email           text,
  role            text,
  joined_at       timestamptz,
  department_id   uuid,
  department_name text,
  team_id         uuid,
  team_name       text
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
    select m.user_id, u.email::text, m.role, m.created_at, m.department_id, d.name, m.team_id, t.name
    from memberships m
    join auth.users u on u.id = m.user_id
    left join departments d on d.id = m.department_id
    left join teams t on t.id = m.team_id
    where m.organization_id = v_org_id
    order by m.created_at asc;
end;
$$;
grant execute on function list_organization_members() to authenticated;
