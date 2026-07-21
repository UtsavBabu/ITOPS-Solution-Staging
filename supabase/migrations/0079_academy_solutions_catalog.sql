-- Moonsav ITOps Academy in the /solutions "Products" marketplace grid —
-- same real content_items row every other product there has, so it's
-- discoverable from the Products catalog too, not just the footer and
-- homepage. Links straight to the dedicated /academy page (set via href,
-- which Solutions.jsx now prefers over the generic /solutions/:slug detail
-- route) rather than duplicating that richer page into the generic
-- SolutionDetail template.

insert into content_items (page_slug, section_key, item_key, sort_order, title, subtitle, body, status, href, metadata)
select 'solutions', 'solutions', 'academy', 7,
  'Moonsav ITOps Academy',
  'Cloud, DevOps & Infrastructure training',
  'Real courses, real graded quizzes, and real verifiable certificates for Cloud, DevOps, and Infrastructure skills — a separate, distinctly branded product from CyberSachet, running on the same licensed training engine.',
  'live', '/academy',
  '{
    "capabilities": [
      {"title": "Structured Courses", "status": "live"},
      {"title": "Quizzes & Real Certificates", "status": "live"},
      {"title": "Tiered Plan Access", "status": "live"},
      {"title": "Per-Organization Licensing", "status": "live"},
      {"title": "Cloud Lab Environments", "status": "roadmap"},
      {"title": "Instructor-Led Cohorts", "status": "roadmap"},
      {"title": "AI Learning Assistant", "status": "roadmap"}
    ]
  }'::jsonb
where not exists (
  select 1 from content_items
  where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'academy'
);
