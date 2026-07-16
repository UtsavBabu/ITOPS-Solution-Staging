-- The public /cybersachet page's "planned_capabilities" list still described
-- structured courses and quizzes as unbuilt, but migration 0037 shipped a
-- real courses/lessons/quizzes/enrollments schema and CyberSachetTraining.jsx
-- is a working, Supabase-backed feature gated by per-organization licensing.
-- The page component now has its own hardcoded "Live Today" section for
-- those two capabilities, so remove them here to avoid the same page
-- claiming a feature is both live and merely planned. The remaining items
-- (phishing simulations, compliance reporting) are genuinely not built.

delete from content_items
where page_slug = 'cybersachet' and section_key = 'planned_capabilities'
  and title in ('Employee Awareness Training', 'Interactive Courses & Quizzes');

update content_items set
  body = 'Per-employee lesson completion and quiz scores are already tracked; issuing a downloadable certificate on course completion is not built yet.',
  updated_at = now()
where page_slug = 'cybersachet' and section_key = 'planned_capabilities' and title = 'Progress Tracking & Certificates';

update content_items set
  body = 'Course and lesson authoring is already live in the admin portal. Launching phishing simulations and reviewing per-employee results is not built yet.',
  updated_at = now()
where page_slug = 'cybersachet' and section_key = 'planned_capabilities' and title = 'Admin Dashboard';

-- The homepage "One Platform" pill and the Platform page's module card both
-- called this "Roadmap" too, understating what's actually shipped.
update content_items set
  body = 'A security-awareness training platform for your team — structured courses and quizzes that build real awareness of the threats your organization actually faces, like phishing and password reuse. Course enrollment is live for licensed organizations; phishing simulation and compliance reporting are still on the roadmap.',
  status = 'live',
  href = '/cybersachet',
  updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Cyber Awareness (CyberSachet)';

-- Matched on href rather than title: an admin may have already renamed this
-- card via the CMS, but the route it links to is a stable identifier.
update content_items set
  body = 'Structured courses and quizzes are live today for licensed organizations, tracking completion and scores per employee. Phishing simulations and compliance reporting are next.',
  status = 'live',
  updated_at = now()
where page_slug = 'platform' and section_key = 'modules' and href = '/cybersachet';
