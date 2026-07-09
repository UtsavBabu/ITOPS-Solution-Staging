-- Platform admin audit log — the first real "Administration" module beyond
-- Customers/Organizations/Users. Logs every organization-lifecycle and
-- platform-admin-grant action from the functions that already perform them,
-- so the trail is real from the moment this ships (not backfilled/fake).
--
-- NOTE: user create/delete (the admin-manage-users edge function) is NOT
-- logged yet — that requires redeploying the edge function, which needs a
-- Supabase access token this session doesn't have. Documented honestly in
-- the admin UI rather than silently omitted.

create table audit_log (
  id              uuid primary key default gen_random_uuid(),
  actor_user_id   uuid references auth.users (id) on delete set null,
  actor_email     text,
  action          text not null,
  target_type     text not null,
  target_id       text,
  target_label    text,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index audit_log_created_at_idx on audit_log (created_at desc);

alter table audit_log enable row level security;

create policy "Platform admins can view audit log"
  on audit_log for select
  using (is_platform_admin());

-- Internal helper: every mutating admin RPC calls this instead of writing
-- its own INSERT, so the logging shape stays consistent.
create or replace function _log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_target_label text,
  p_metadata jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into audit_log (actor_user_id, actor_email, action, target_type, target_id, target_label, metadata)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), p_action, p_target_type, p_target_id, p_target_label, p_metadata);
end;
$$;

create or replace function admin_list_audit_log(p_limit int default 50, p_offset int default 0, p_search text default null)
returns table (
  id            uuid,
  actor_email   text,
  action        text,
  target_type   text,
  target_id     text,
  target_label  text,
  metadata      jsonb,
  created_at    timestamptz,
  total_count   bigint
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select a.id, a.actor_email, a.action, a.target_type, a.target_id, a.target_label, a.metadata, a.created_at,
    count(*) over () as total_count
  from audit_log a
  where p_search is null or p_search = '' or
    a.actor_email ilike '%' || p_search || '%' or
    a.action ilike '%' || p_search || '%' or
    a.target_label ilike '%' || p_search || '%'
  order by a.created_at desc
  limit p_limit offset p_offset;
end;
$$;

grant execute on function admin_list_audit_log(int, int, text) to authenticated;

-- Re-wire existing mutating RPCs to log. Each is create-or-replace, so this
-- redeploys them with one added _log_admin_action() call.

create or replace function admin_update_organization_plan(p_organization_id uuid, p_plan text)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
  v_old_plan text;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select plan into v_old_plan from organizations where id = p_organization_id;

  update organizations set plan = p_plan where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  perform _log_admin_action('update_plan', 'organization', v_org.id::text, v_org.name, jsonb_build_object('from', v_old_plan, 'to', p_plan));
  return v_org;
end;
$$;

create or replace function admin_rename_organization(p_organization_id uuid, p_name text)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
  v_old_name text;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if trim(p_name) = '' then
    raise exception 'Name cannot be empty';
  end if;

  select name into v_old_name from organizations where id = p_organization_id;

  update organizations set name = trim(p_name) where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  perform _log_admin_action('rename', 'organization', v_org.id::text, v_org.name, jsonb_build_object('from', v_old_name, 'to', v_org.name));
  return v_org;
end;
$$;

create or replace function admin_archive_organization(p_organization_id uuid)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  update organizations set status = 'archived' where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  perform _log_admin_action('archive', 'organization', v_org.id::text, v_org.name);
  return v_org;
end;
$$;

create or replace function admin_restore_organization(p_organization_id uuid)
returns organizations
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org organizations;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  update organizations set status = 'active' where id = p_organization_id
  returning * into v_org;

  if v_org.id is null then
    raise exception 'Organization not found';
  end if;

  perform _log_admin_action('restore', 'organization', v_org.id::text, v_org.name);
  return v_org;
end;
$$;

create or replace function admin_delete_organization(p_organization_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select name into v_name from organizations where id = p_organization_id;
  if v_name is null then
    raise exception 'Organization not found';
  end if;

  delete from organizations where id = p_organization_id;

  perform _log_admin_action('delete', 'organization', p_organization_id::text, v_name);
end;
$$;

create or replace function admin_set_platform_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_email text;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select email into v_email from auth.users where id = p_user_id;

  if p_is_admin then
    insert into platform_admins (user_id) values (p_user_id) on conflict (user_id) do nothing;
  else
    delete from platform_admins where user_id = p_user_id;
  end if;

  perform _log_admin_action(case when p_is_admin then 'grant_admin' else 'revoke_admin' end, 'user', p_user_id::text, v_email);
end;
$$;

grant execute on function admin_update_organization_plan(uuid, text) to authenticated;
grant execute on function admin_rename_organization(uuid, text) to authenticated;
grant execute on function admin_archive_organization(uuid) to authenticated;
grant execute on function admin_restore_organization(uuid) to authenticated;
grant execute on function admin_delete_organization(uuid) to authenticated;
grant execute on function admin_set_platform_admin(uuid, boolean) to authenticated;
