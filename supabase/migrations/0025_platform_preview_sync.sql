-- Sync the homepage "One Platform, Growing Module by Module" pills
-- (landing/platform_preview) with what's actually live. Migration 0024
-- promoted the infrastructure-monitor product page to live and shipped
-- RCA/remediation on Kada Nigrani, but this separate content_items section
-- was never updated to match — the homepage still showed "Infrastructure
-- Monitoring · Roadmap" and had no pill at all for Kada Nigrani (server
-- monitoring), even though both are real, live products today.

update content_items set
  title = 'Network & Device Monitoring',
  status = 'live',
  sort_order = 4,
  updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Infrastructure Monitoring';

update content_items set sort_order = 5, updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'DevOps Monitoring';

update content_items set sort_order = 6, updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Cyber Awareness (CyberSachet)';

update content_items set sort_order = 3, updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Incident Management';

insert into content_items (page_slug, section_key, sort_order, title, status)
select 'landing', 'platform_preview', 2, 'Server Monitoring (Kada Nigrani)', 'live'
where not exists (
  select 1 from content_items
  where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Server Monitoring (Kada Nigrani)'
);
