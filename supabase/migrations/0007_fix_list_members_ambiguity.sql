-- Fixes "column reference user_id is ambiguous" (42702): the function's
-- own RETURNS TABLE output column named user_id created an implicit
-- PL/pgSQL variable that collided with the bare `user_id` column reference
-- in the initial lookup query. Fully qualifying every column fixes it.
create or replace function list_organization_members()
returns table (
  user_id    uuid,
  email      text,
  role       text,
  joined_at  timestamptz
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
    select m.user_id, u.email::text, m.role, m.created_at
    from memberships m
    join auth.users u on u.id = m.user_id
    where m.organization_id = v_org_id
    order by m.created_at asc;
end;
$$;
