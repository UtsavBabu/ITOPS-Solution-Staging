-- Lets an existing platform admin grant/revoke admin access for other users
-- from the Users page. platform_admins previously only had SELECT policies.
create or replace function admin_set_platform_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  if p_is_admin then
    insert into platform_admins (user_id) values (p_user_id)
    on conflict (user_id) do nothing;
  else
    delete from platform_admins where user_id = p_user_id;
  end if;
end;
$$;

grant execute on function admin_set_platform_admin(uuid, boolean) to authenticated;
