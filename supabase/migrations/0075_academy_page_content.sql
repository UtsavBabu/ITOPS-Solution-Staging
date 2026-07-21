-- Waitlist signups for the new /academy page ("notify me when cloud labs
-- ship") need 'academy' allowed alongside the existing products.
alter table waitlist_signups
  drop constraint if exists waitlist_signups_product_check;
alter table waitlist_signups
  add constraint waitlist_signups_product_check
  check (product in ('cybersachet','infrastructure-monitor','devops-monitor','moonsav-edr','academy','upgrade-request','newsletter'));

-- Roadmap content for the new public /academy marketing page — same
-- CMS-driven pattern as /cybersachet's 'planned_capabilities' section
-- (page_slug/section_key on content_items), so these stay real and
-- admin-editable rather than hardcoded strings in the page component. The
-- page's own "Live Today" list stays hardcoded JS (like CyberSachet's),
-- since those are code-verified facts about what's actually built, not
-- marketing copy an admin should be able to freely rewrite.

insert into content_items (page_slug, section_key, item_key, sort_order, title, body, status)
select 'academy', 'planned_capabilities', 'cloud-labs', 1, 'Cloud Lab Environments',
  'Hands-on, sandboxed cloud environments to practice what each course teaches — not just watch it. Needs real cloud infrastructure and a billing model behind it, so it is not built yet.', 'roadmap'
where not exists (select 1 from content_items where page_slug = 'academy' and section_key = 'planned_capabilities' and item_key = 'cloud-labs');

insert into content_items (page_slug, section_key, item_key, sort_order, title, body, status)
select 'academy', 'planned_capabilities', 'instructor-cohorts', 2, 'Instructor-Led Cohorts',
  'Scheduled, live cohort classes with a real instructor — alongside the self-paced courses that are already live today.', 'roadmap'
where not exists (select 1 from content_items where page_slug = 'academy' and section_key = 'planned_capabilities' and item_key = 'instructor-cohorts');

insert into content_items (page_slug, section_key, item_key, sort_order, title, body, status)
select 'academy', 'planned_capabilities', 'ai-assistant', 3, 'AI Learning Assistant',
  'A course-aware assistant to answer questions while you work through a lesson. Not built yet — it needs an LLM provider decision first.', 'roadmap'
where not exists (select 1 from content_items where page_slug = 'academy' and section_key = 'planned_capabilities' and item_key = 'ai-assistant');

-- Homepage "One Platform" pill row and the /platform module grid both need
-- Academy alongside the products already listed there — same real,
-- admin-editable rows as every other module, not a hardcoded page link.
insert into content_items (page_slug, section_key, item_key, sort_order, title, subtitle, body, status, href, metadata)
select 'landing', 'platform_preview', 'academy', 6, 'Moonsav ITOps Academy', null, null, 'live', '/academy', '{}'
where not exists (select 1 from content_items where page_slug = 'landing' and section_key = 'platform_preview' and item_key = 'academy');

insert into content_items (page_slug, section_key, item_key, sort_order, title, subtitle, body, status, href, metadata)
select 'platform', 'modules', 'academy', 12, 'Moonsav ITOps Academy', null,
  'Cloud, DevOps, and Infrastructure courses with real graded quizzes and verifiable certificates — a separate, distinctly branded catalog from CyberSachet on the same licensed engine.', 'live', '/academy', '{}'
where not exists (select 1 from content_items where page_slug = 'platform' and section_key = 'modules' and item_key = 'academy');
