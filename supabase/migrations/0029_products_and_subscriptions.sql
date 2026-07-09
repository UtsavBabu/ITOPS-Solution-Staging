-- Product catalog + per-organization subscriptions — the real foundation
-- for "organizations subscribe only to products they purchase."
--
-- Deliberately scoped: this is ADDITIVE only. It does NOT touch the
-- existing plan-tier feature gates in the frontend (Dashboard.tsx's
-- PLAN_FEATURES, monitor/host limits, etc.) — ripping those out and
-- rewiring every page's access control to read from subscriptions instead
-- is a separate, larger, riskier change that needs its own careful pass
-- once this foundation is proven. Today this ships:
--   1. A real products catalog (matches the live items in the public
--      Solutions catalog — no fake entries for roadmap products, since
--      you can't license something that doesn't exist yet).
--   2. organization_products: which products each org is subscribed to.
--   3. The real org (seeded from today's actual usage — Moonsav already
--      uses all 5 live products unconditionally) gets all 5 marked active,
--      so nothing regresses for the one real customer.
--   4. Admin RPCs to grant/revoke a product per org — the first real
--      "License Management" capability.

create table products (
  key          text primary key,
  name         text not null,
  description  text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

insert into products (key, name, description, sort_order) values
  ('website-api-monitoring', 'Website & API Monitoring', 'Uptime, response time, keyword, status-code, and DNS checks.', 0),
  ('security-monitoring', 'Security Monitoring', 'SSL certificate tracking and security-header posture scoring.', 1),
  ('kada-nigrani', 'Kada Nigrani — Server & Device Monitoring', 'Linux host agent: CPU, memory, disk, load, and remediation runbooks.', 2),
  ('infrastructure-monitor', 'Network & Device Monitoring', 'TCP-connect and DNS-record checks for routers, switches, and firewalls.', 3),
  ('alerting-incident-response', 'Alerting & Incident Response', 'Automatic incident lifecycle, root-cause analysis, and multi-channel alerts.', 4)
on conflict (key) do nothing;

create table organization_products (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  product_key     text not null references products (key) on delete cascade,
  status          text not null default 'active' check (status in ('active', 'trial', 'revoked')),
  granted_at      timestamptz not null default now(),
  granted_by      uuid references auth.users (id),
  unique (organization_id, product_key)
);

alter table organization_products enable row level security;

create policy "Org members can view their own subscriptions"
  on organization_products for select
  using (is_org_member(organization_id) or is_platform_admin());

-- Grandfather every existing organization into all 5 live products —
-- this matches what they already use today unconditionally, so nothing
-- regresses. Every organization that already exists is treated as fully
-- subscribed; the gating layer (built separately, later) will read from
-- this table going forward for *new* access-control decisions only.
insert into organization_products (organization_id, product_key, status)
select o.id, p.key, 'active'
from organizations o
cross join products p
on conflict (organization_id, product_key) do nothing;

create or replace function admin_list_products()
returns setof products
language sql security definer stable set search_path = public, pg_temp as $$
  select * from products order by sort_order;
$$;

create or replace function admin_list_org_products(p_organization_id uuid)
returns table (product_key text, product_name text, status text, granted_at timestamptz)
language plpgsql security definer stable set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select p.key, p.name, coalesce(op.status, 'revoked'), op.granted_at
  from products p
  left join organization_products op on op.product_key = p.key and op.organization_id = p_organization_id
  order by p.sort_order;
end;
$$;

create or replace function admin_set_org_product(p_organization_id uuid, p_product_key text, p_active boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_name text;
  v_product_name text;
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select name into v_org_name from organizations where id = p_organization_id;
  select name into v_product_name from products where key = p_product_key;
  if v_org_name is null then raise exception 'Organization not found'; end if;
  if v_product_name is null then raise exception 'Product not found'; end if;

  if p_active then
    insert into organization_products (organization_id, product_key, status, granted_by)
    values (p_organization_id, p_product_key, 'active', auth.uid())
    on conflict (organization_id, product_key) do update set status = 'active', granted_at = now(), granted_by = auth.uid();
  else
    update organization_products set status = 'revoked' where organization_id = p_organization_id and product_key = p_product_key;
  end if;

  perform _log_admin_action(
    case when p_active then 'grant_product' else 'revoke_product' end,
    'organization_product',
    p_organization_id::text,
    v_org_name || ' — ' || v_product_name
  );
end;
$$;

grant execute on function admin_list_products() to authenticated;
grant execute on function admin_list_org_products(uuid) to authenticated;
grant execute on function admin_set_org_product(uuid, text, boolean) to authenticated;
