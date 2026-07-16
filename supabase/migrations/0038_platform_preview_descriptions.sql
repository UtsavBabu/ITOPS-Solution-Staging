-- The homepage "One Platform, Growing Module by Module" pills (and the
-- infrastructure topology diagram that reads the same content) only ever
-- had a title and a live/roadmap status — no body copy, so the hover card
-- built on top of them had nothing real to show and fell back to a generic
-- placeholder sentence. Filling in an honest, specific description and a
-- real link for each one, matching the tone already used in the
-- landing/features section (migration 0008) — live products described by
-- what they actually do today, roadmap products described as not built yet
-- rather than oversold.

update content_items set
  body = 'Continuous uptime, keyword, and status-code checks across every website and API endpoint you run, with full response-time history and redirect-chain tracing.',
  href = '/solutions/website-api-monitoring',
  updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Website & API Monitoring';

update content_items set
  body = 'SSL certificate expiry tracking and HTTP security-header scoring for every endpoint, so a lapsed certificate or a missing security header never goes unnoticed.',
  href = '/solutions/security-monitoring',
  updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Security Monitoring';

update content_items set
  body = 'A lightweight agent installed on any Linux server streams CPU, memory, disk, and load into the same dashboard as your websites, with remediation runbooks your team can trigger directly.',
  href = '/solutions/kada-nigrani',
  updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Server Monitoring (Kada Nigrani)';

update content_items set
  body = 'Agentless TCP-connect and DNS-record checks for routers, switches, firewalls, and any network device with a reachable port — real infrastructure visibility without installing anything on the device itself.',
  href = '/solutions/infrastructure-monitor',
  updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Network & Device Monitoring';

update content_items set
  body = 'Automatic incident creation the moment a check fails repeatedly, with the real cause attached, Slack/webhook/email alerts, and auto-resolution the instant the service recovers.',
  href = '/solutions/alerting-incident-response',
  updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Incident Management';

update content_items set
  body = 'Planned: visibility into CI/CD pipelines, container health, and deployment status alongside your infrastructure monitoring. Not built yet — shown here honestly as what''s next, not a finished feature.',
  href = '/solutions/devops-monitor',
  updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'DevOps Monitoring';

update content_items set
  body = 'A security-awareness training platform for your team — structured courses and quizzes that build real awareness of the threats your organization actually faces, like phishing and password reuse. Course enrollment is live for licensed organizations; phishing simulation and compliance reporting are still on the roadmap.',
  href = '/cybersachet',
  updated_at = now()
where page_slug = 'landing' and section_key = 'platform_preview' and title = 'Cyber Awareness (CyberSachet)';
