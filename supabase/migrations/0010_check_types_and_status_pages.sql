-- ITOps Monitor — advanced check types + public status pages
--
-- Expands monitoring from "is the HTTP endpoint up?" to genuine basic→advanced
-- endpoint/network monitoring, all built on primitives proven to work in the
-- Supabase Edge Runtime (fetch + DNS-over-HTTPS). Also adds real, shareable
-- per-organization public status pages.
--
-- Deliberately NOT included: agent-based server/VMware/K8s monitoring and raw
-- TCP/ICMP checks — those need software running inside customer infrastructure
-- (or raw sockets the edge runtime doesn't expose) and can't be shipped
-- honestly here.

-- ---------------------------------------------------------------------------
-- monitors: check type + per-type assertion columns
-- ---------------------------------------------------------------------------

alter table monitors
  add column if not exists check_type text not null default 'HTTP'
    check (check_type in ('HTTP', 'KEYWORD', 'STATUS_CODE', 'DNS')),
  add column if not exists expected_keyword text,
  add column if not exists keyword_match_mode text not null default 'CONTAINS'
    check (keyword_match_mode in ('CONTAINS', 'NOT_CONTAINS')),
  add column if not exists expected_status_code int,
  add column if not exists dns_record_type text not null default 'A'
    check (dns_record_type in ('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS')),
  add column if not exists dns_expected_value text;

-- ---------------------------------------------------------------------------
-- organizations: public status page settings
-- ---------------------------------------------------------------------------

alter table organizations
  add column if not exists status_page_enabled boolean not null default false,
  add column if not exists status_page_slug text unique,
  add column if not exists status_page_title text;

-- ---------------------------------------------------------------------------
-- create_monitor: accept check type + assertion params
-- (drop the old 3-arg version first to avoid overload ambiguity)
-- ---------------------------------------------------------------------------

drop function if exists create_monitor(text, text, text);

create function create_monitor(
  p_name text,
  p_url text,
  p_interval text default 'FIVE_MINUTES',
  p_check_type text default 'HTTP',
  p_expected_keyword text default null,
  p_keyword_match_mode text default 'CONTAINS',
  p_expected_status_code int default null,
  p_dns_record_type text default 'A',
  p_dns_expected_value text default null
)
returns monitors
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id     uuid;
  v_org_plan   text;
  v_max        int;
  v_current    int;
  v_asset      assets;
  v_monitor    monitors;
  v_asset_type text;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found for current user';
  end if;

  if p_check_type not in ('HTTP', 'KEYWORD', 'STATUS_CODE', 'DNS') then
    raise exception 'Invalid check type: %', p_check_type;
  end if;

  -- Enforce the org plan's monitor limit (preserved from migration 0004).
  select o.plan, pl.max_monitors into v_org_plan, v_max
  from organizations o join plan_limits pl on pl.plan = o.plan
  where o.id = v_org_id;

  select count(*) into v_current from monitors where organization_id = v_org_id;

  if v_current >= v_max then
    raise exception 'Plan limit reached: % plan allows up to % monitors. Upgrade to add more.', v_org_plan, v_max;
  end if;

  -- DNS monitors track a hostname rather than a website URL.
  v_asset_type := case when p_check_type = 'DNS' then 'OTHER' else 'WEBSITE' end;

  insert into assets (organization_id, type, name, identifier)
  values (v_org_id, v_asset_type, p_name, p_url)
  returning * into v_asset;

  insert into monitors (
    organization_id, asset_id, name, url, interval,
    check_type, expected_keyword, keyword_match_mode,
    expected_status_code, dns_record_type, dns_expected_value
  )
  values (
    v_org_id, v_asset.id, p_name, p_url, p_interval,
    p_check_type, p_expected_keyword, p_keyword_match_mode,
    p_expected_status_code, p_dns_record_type, p_dns_expected_value
  )
  returning * into v_monitor;

  return v_monitor;
end;
$$;

grant execute on function create_monitor(text, text, text, text, text, text, int, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Status page management (org admins) — writes the caller's own org row
-- ---------------------------------------------------------------------------

create function set_status_page(
  p_enabled boolean,
  p_slug text,
  p_title text
)
returns organizations
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_slug   text;
  v_org    organizations;
begin
  select organization_id into v_org_id
  from memberships where user_id = auth.uid() limit 1;

  if v_org_id is null or not is_org_member(v_org_id) then
    raise exception 'No organization membership found for current user';
  end if;

  -- Normalize + validate the slug: lowercase, url-safe, 3–40 chars,
  -- no leading/trailing hyphen.
  if p_enabled then
    v_slug := lower(trim(coalesce(p_slug, '')));
    if length(v_slug) < 3 or length(v_slug) > 40
       or v_slug !~ '^[a-z0-9-]+$'
       or v_slug ~ '^-' or v_slug ~ '-$' then
      raise exception 'Status page URL must be 3–40 characters: lowercase letters, numbers, and hyphens only (no leading or trailing hyphen).';
    end if;
    if exists (
      select 1 from organizations
      where status_page_slug = v_slug and id <> v_org_id
    ) then
      raise exception 'That status page URL is already taken. Please choose another.';
    end if;
  else
    v_slug := null;
  end if;

  update organizations
  set status_page_enabled = p_enabled,
      status_page_slug = v_slug,
      status_page_title = nullif(trim(coalesce(p_title, '')), '')
  where id = v_org_id
  returning * into v_org;

  return v_org;
end;
$$;

grant execute on function set_status_page(boolean, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Public status page read — anon-callable, exposes only what's intended:
-- the page title and each active monitor's friendly name + current status.
-- Internal URLs are deliberately NOT returned.
-- ---------------------------------------------------------------------------

create function get_public_status_page(p_slug text)
returns jsonb
language plpgsql security definer stable
set search_path = public, pg_temp as $$
declare
  v_org organizations;
  v_result jsonb;
begin
  select * into v_org
  from organizations
  where status_page_slug = lower(trim(p_slug)) and status_page_enabled = true;

  if v_org.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'organization_name', v_org.name,
    'title', coalesce(v_org.status_page_title, v_org.name || ' Status'),
    'generated_at', now(),
    'services', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', m.name,
            'check_type', m.check_type,
            'status', coalesce(m.last_status, 'UNKNOWN'),
            'last_checked_at', m.last_checked_at
          )
          order by m.name
        )
        from monitors m
        where m.organization_id = v_org.id and m.is_active = true
      ),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function get_public_status_page(text) to anon, authenticated;
