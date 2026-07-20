-- Content & SEO analysis for website/API monitors — real signal parsed from
-- the page's own HTML (title, meta description, headings, image alt text,
-- canonical/OG tags) plus robots.txt/sitemap.xml presence. Runs at most once
-- per 24h per monitor, same cadence as the existing SSL check, since this
-- content doesn't change every 30 seconds the way uptime does.

create table content_analysis (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations (id) on delete cascade,
  monitor_id            uuid not null unique references monitors (id) on delete cascade,
  title                 text,
  title_length          int,
  meta_description      text,
  meta_description_length int,
  h1_count              int,
  canonical_url         text,
  has_viewport_meta     boolean not null default false,
  has_og_title          boolean not null default false,
  has_og_description    boolean not null default false,
  has_og_image          boolean not null default false,
  image_count           int not null default 0,
  images_missing_alt    int not null default 0,
  has_robots_txt        boolean not null default false,
  has_sitemap_xml       boolean not null default false,
  error_message         text,
  checked_at            timestamptz not null default now()
);

create index content_analysis_monitor_idx on content_analysis (monitor_id);

alter table content_analysis enable row level security;

create policy content_analysis_select on content_analysis
  for select using (is_org_member(organization_id));
create policy content_analysis_admin_select on content_analysis
  for select using (is_platform_admin());

-- Written only by the trusted run-due-checks job via the service role, same
-- as ssl_info/security_snapshots — no direct client write policy.
