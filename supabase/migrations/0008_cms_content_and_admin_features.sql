-- Generic, database-driven content system backing the marketing site's
-- editable sections (features, modules, steps, leadership, FAQs, plan copy,
-- solutions, etc.) so a platform admin can edit copy without touching code.
-- One flexible table rather than a dozen bespoke ones — every section shape
-- so far fits {title, subtitle, body, status, href, metadata jsonb}.

create table content_items (
  id            uuid primary key default gen_random_uuid(),
  page_slug     text not null,
  section_key   text not null,
  item_key      text,
  sort_order    int not null default 0,
  title         text not null,
  subtitle      text,
  body          text,
  status        text,
  href          text,
  metadata      jsonb not null default '{}',
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index content_items_page_section_idx on content_items (page_slug, section_key, sort_order);

create trigger content_items_set_updated_at before update on content_items
  for each row execute function set_updated_at();

alter table content_items enable row level security;

create policy content_items_public_select on content_items
  for select to anon, authenticated
  using (is_published = true);

create policy content_items_admin_select on content_items
  for select using (is_platform_admin());

create policy content_items_admin_insert on content_items
  for insert with check (is_platform_admin());

create policy content_items_admin_update on content_items
  for update using (is_platform_admin()) with check (is_platform_admin());

create policy content_items_admin_delete on content_items
  for delete using (is_platform_admin());

-- ---------------------------------------------------------------------------
-- Seed: the content that's currently hardcoded in the React components,
-- moved here so nothing regresses when the pages switch to fetching it.
-- ---------------------------------------------------------------------------

insert into content_items (page_slug, section_key, item_key, sort_order, title, subtitle, body, status, href, metadata) values
-- Landing: six-service feature cards
('landing', 'features', null, 0, 'Uptime & Response Time', null, 'Checks every website and API endpoint on a schedule you pick, follows redirect chains, and tracks response time over time.', null, '/solutions/website-api-monitoring', '{}'),
('landing', 'features', null, 1, 'SSL Certificate Monitoring', null, 'Tracks issuer, protocol, and days until expiry across your fleet, so a certificate never lapses without warning.', null, '/solutions/security-monitoring', '{}'),
('landing', 'features', null, 2, 'Security Posture Scoring', null, 'Scores every endpoint against HSTS, CSP, X-Frame-Options and more — plus cookie-flag and version-leak checks.', null, '/solutions/security-monitoring', '{}'),
('landing', 'features', null, 3, 'Incident Tracking', null, 'Opens an incident after consecutive failures across servers or services and auto-resolves it on recovery.', null, '/platform', '{}'),
('landing', 'features', null, 4, 'Multi-Channel Alerting', null, 'Slack, generic webhooks, and email — configure once, get notified the moment infrastructure breaks.', null, '/platform', '{}'),
('landing', 'features', null, 5, 'Asset Inventory', null, 'Every monitored server, site, and service becomes an asset automatically across your cloud and data centers.', null, '/platform', '{}'),
-- Landing: platform preview pills
('landing', 'platform_preview', null, 0, 'Website & API Monitoring', null, null, 'live', null, '{}'),
('landing', 'platform_preview', null, 1, 'Security Monitoring', null, null, 'live', null, '{}'),
('landing', 'platform_preview', null, 2, 'Incident Management', null, null, 'live', null, '{}'),
('landing', 'platform_preview', null, 3, 'Infrastructure Monitoring', null, null, 'roadmap', null, '{}'),
('landing', 'platform_preview', null, 4, 'DevOps Monitoring', null, null, 'roadmap', null, '{}'),
('landing', 'platform_preview', null, 5, 'Cyber Awareness (CyberSachet)', null, null, 'roadmap', null, '{}'),
-- Landing / Platform: how it works steps
('landing', 'steps', null, 0, 'Connect Infrastructure', null, 'Add a server, site, or cloud endpoint and pick a check interval.', null, null, '{}'),
('landing', 'steps', null, 1, 'We Watch Everything', null, 'Uptime, SSL, and security posture are checked continuously, on schedule.', null, null, '{}'),
('landing', 'steps', null, 2, 'Get Alerted First', null, 'The moment something breaks or drifts out of policy, your team hears about it.', null, null, '{}'),
-- Platform: modules grid
('platform', 'modules', null, 0, 'Website & API Monitoring', null, 'Uptime, response time, redirect chains, and SLA history for every site and endpoint you run.', 'live', '/solutions/website-api-monitoring', '{}'),
('platform', 'modules', null, 1, 'Security Monitoring', null, 'SSL certificate expiry, security headers, cookie flags, and a real security score per endpoint.', 'live', '/solutions/security-monitoring', '{}'),
('platform', 'modules', null, 2, 'Incident Management', null, 'Automatic incident creation on repeated failures, with a full timeline and auto-resolution on recovery.', 'live', null, '{}'),
('platform', 'modules', null, 3, 'Multi-Channel Alerting', null, 'Slack, webhook, and email — configured once per organization, enforced per your plan.', 'live', null, '{}'),
('platform', 'modules', null, 4, 'Asset Inventory', null, 'Every monitored website becomes an asset automatically; track servers and other infrastructure manually today.', 'live', null, '{}'),
('platform', 'modules', null, 5, 'Enterprise Dashboard', null, 'One real-time view of every monitor, incident, and asset across your organization.', 'live', null, '{}'),
('platform', 'modules', null, 6, 'Infrastructure Monitoring', null, 'Linux, Windows, VMware, Hyper-V, network devices, and storage — CPU, memory, disk, and service health.', 'roadmap', '/solutions/infrastructure-monitor', '{}'),
('platform', 'modules', null, 7, 'DevOps Monitoring', null, 'Docker, Kubernetes, CI/CD pipelines, Terraform, and application deployments.', 'roadmap', '/solutions/devops-monitor', '{}'),
('platform', 'modules', null, 8, 'Cloud Monitoring', null, 'AWS, Azure, and GCP resource health alongside the rest of your infrastructure.', 'roadmap', null, '{}'),
('platform', 'modules', null, 9, 'Endpoint Monitoring', null, 'Laptops, desktops, and servers — patch status, firewall state, and disk encryption.', 'roadmap', null, '{}'),
('platform', 'modules', null, 10, 'Cyber Awareness Training', null, 'Phishing simulations and security learning for your whole team, via CyberSachet.', 'roadmap', '/cybersachet', '{}'),
('platform', 'modules', null, 11, 'Reporting & Analytics', null, 'Scheduled uptime, incident, and compliance reports across your organization.', 'roadmap', null, '{}'),
-- Company: leadership
('company', 'leadership', null, 0, 'Babu Khatri', 'CEO & Technical Lead', null, null, null, '{}'),
('company', 'leadership', null, 1, 'Pratik Chaudhary', 'Co-Founder & Developer', null, null, null, '{}'),
-- Company: mission/vision
('company', 'mission_vision', 'mission', 0, 'Mission', null, 'Give every organization, not just the ones who can afford five enterprise contracts, one honest, working view of whether their systems are up, secure, and healthy.', null, null, '{}'),
('company', 'mission_vision', 'vision', 1, 'Vision', null, 'One platform that grows from website monitoring into full infrastructure, DevOps, and security visibility — built module by module, shipped only when it''s real.', null, null, '{}'),
-- Support: FAQs
('support', 'faqs', null, 0, 'How often are my monitors checked?', null, 'You choose per monitor: every 30 seconds, 1 minute, 5 minutes, or 15 minutes. Our scheduler runs every minute, so the 30-second option currently checks at most once per minute in practice.', null, null, '{}'),
('support', 'faqs', null, 1, 'Why does my SSL panel say SSL monitoring isn''t available?', null, 'SSL certificate checks depend on an external certificate API being configured on our side. If it''s not yet enabled for your monitor, the panel tells you that directly instead of showing a fake result.', null, null, '{}'),
('support', 'faqs', null, 2, 'How do alerts get sent?', null, 'Configure Slack, webhook, or email channels under Alert Channels. Every channel fires when a monitor goes down, recovers, or an SSL certificate is close to expiring.', null, null, '{}'),
('support', 'faqs', null, 3, 'What happens when I hit my plan''s monitor limit?', null, 'Creating a new monitor beyond your plan''s limit is blocked with a clear error telling you the limit and your current plan. No silent failures.', null, null, '{}'),
('support', 'faqs', null, 4, 'Can I add servers or infrastructure, not just websites?', null, 'You can add them manually to your asset inventory today for record-keeping. Automated infrastructure monitoring (an installable agent) is on our roadmap — see the Platform page for status.', null, null, '{}'),
-- Support: channels
('support', 'channels', null, 0, 'Contact Form', null, 'Send us anything below — bugs, billing, questions.', 'Available', null, '{}'),
('support', 'channels', null, 1, 'Knowledge Base', null, 'Self-serve docs and installation guides.', 'Coming Soon', null, '{}'),
('support', 'channels', null, 2, 'Live Chat', null, 'Real-time chat with our team.', 'Coming Soon', null, '{}'),
-- CyberSachet: planned capabilities
('cybersachet', 'planned_capabilities', null, 0, 'Employee Awareness Training', null, 'Structured security learning paths for every role in your organization.', null, null, '{}'),
('cybersachet', 'planned_capabilities', null, 1, 'Phishing Simulations', null, 'Realistic, safe phishing campaigns to measure and improve real-world readiness.', null, null, '{}'),
('cybersachet', 'planned_capabilities', null, 2, 'Interactive Courses & Quizzes', null, 'Short, practical modules with knowledge checks, not hour-long videos.', null, null, '{}'),
('cybersachet', 'planned_capabilities', null, 3, 'Progress Tracking & Certificates', null, 'Per-employee completion tracking with issued certificates.', null, null, '{}'),
('cybersachet', 'planned_capabilities', null, 4, 'Compliance Reporting', null, 'Org-wide training compliance reports for audits and leadership.', null, null, '{}'),
('cybersachet', 'planned_capabilities', null, 5, 'Admin Dashboard', null, 'Assign training, launch simulations, and review results as an administrator.', null, null, '{}'),
-- Pricing: per-plan marketing copy (the numeric limits live in plan_limits)
('pricing', 'plan_copy', 'STARTER', 0, 'Solo Builders & Side Projects', 'For a single site you actually care about', null, null, null, '{}'),
('pricing', 'plan_copy', 'PROFESSIONAL', 1, 'Small Teams', 'For a small team monitoring production', null, null, null, '{}'),
('pricing', 'plan_copy', 'BUSINESS', 2, 'Growing Companies', 'For organizations running many services', null, null, null, '{}'),
('pricing', 'plan_copy', 'ENTERPRISE', 3, 'Enterprises', 'For platform-wide visibility at scale', null, null, null, '{}'),
-- Solutions: top-level catalog entries (nested capabilities live in metadata)
('solutions', 'solutions', 'website-api-monitoring', 0, 'Website & API Monitoring', 'Know the moment a site or endpoint goes down', 'Continuous HTTP/HTTPS checks against every website or API endpoint you add, with response time history, redirect-chain tracing, and automatic incident tracking — live today, not a demo.', 'live', null,
  '{"capabilities": [
    {"title": "HTTP & HTTPS uptime checks", "detail": "Checks on a schedule from 30 seconds to 15 minutes, per monitor.", "status": "live"},
    {"title": "Redirect chain tracing", "detail": "Follows up to 5 redirects and records the full chain for every check.", "status": "live"},
    {"title": "Response time history", "detail": "Every check is stored, powering the response-time chart on each monitor.", "status": "live"},
    {"title": "Automatic incident tracking", "detail": "Opens an incident after consecutive failures, auto-resolves on recovery.", "status": "live"},
    {"title": "Multi-channel alerting", "detail": "Slack, webhook, and email notifications the moment a monitor goes down.", "status": "live"},
    {"title": "DNS, TCP, UDP & ping checks", "detail": "Protocol-level checks beyond HTTP, for full network reachability.", "status": "roadmap"},
    {"title": "GraphQL-aware checks", "detail": "Query-based synthetic checks against GraphQL APIs.", "status": "roadmap"},
    {"title": "Regional & global checks", "detail": "Run checks from multiple regions to catch geography-specific outages.", "status": "roadmap"},
    {"title": "Public status pages", "detail": "A hosted status page you can share with customers.", "status": "roadmap"},
    {"title": "SLA reports", "detail": "Scheduled uptime & SLA compliance reports per monitor.", "status": "roadmap"}
  ]}'::jsonb),
('solutions', 'solutions', 'security-monitoring', 1, 'Security Monitoring', 'A real security score for every endpoint', 'SSL certificate and HTTP security-header analysis run automatically alongside your uptime checks, scoring every site out of 100 and flagging exactly what''s missing.', 'live', null,
  '{"capabilities": [
    {"title": "SSL certificate expiry tracking", "detail": "Issuer, protocol, and days-remaining, checked daily per monitor.", "status": "live"},
    {"title": "Security header scoring", "detail": "HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.", "status": "live"},
    {"title": "Cookie security analysis", "detail": "Flags cookies missing Secure, HttpOnly, or SameSite attributes.", "status": "live"},
    {"title": "Server version leak detection", "detail": "Flags a server header that discloses a specific software version.", "status": "live"},
    {"title": "Expiry alerts", "detail": "Automatic alerts when a certificate is within 14 days of expiring, or already expired.", "status": "live"},
    {"title": "Certificate chain analysis", "detail": "Full chain validation against trusted root authorities.", "status": "roadmap"},
    {"title": "Weak cipher & TLS grade", "detail": "A/B/C/D/F grading based on supported protocols and cipher suites.", "status": "roadmap"},
    {"title": "Open port detection", "detail": "Flag unexpected internet-facing ports.", "status": "roadmap"},
    {"title": "Compliance benchmarking", "detail": "Benchmark security posture against CIS and industry baselines.", "status": "roadmap"},
    {"title": "Endpoint configuration drift", "detail": "Detect endpoint security settings drifting out of policy.", "status": "roadmap"}
  ]}'::jsonb),
('solutions', 'solutions', 'infrastructure-monitor', 2, 'ITOps Infrastructure Monitor', 'One view across every server you run', 'A lightweight agent for Linux and Windows servers, VMware, and Hyper-V — reporting CPU, memory, disk, processes, and service health into the same dashboard as your website monitors. This is on our roadmap, not shipped yet.', 'roadmap', null,
  '{"waitlistProduct": "infrastructure-monitor", "capabilities": [
    {"title": "Linux & Windows servers", "detail": "Agent-based monitoring for physical and virtual servers.", "status": "roadmap"},
    {"title": "VMware & Hyper-V", "detail": "Hypervisor-level visibility across your virtualization estate.", "status": "roadmap"},
    {"title": "Network devices & storage", "detail": "Switches, routers, and storage arrays via SNMP.", "status": "roadmap"},
    {"title": "Cloud infrastructure", "detail": "AWS, Azure, and GCP compute resources alongside on-prem servers.", "status": "roadmap"},
    {"title": "CPU, memory & disk", "detail": "Real-time resource utilization with historical trends.", "status": "roadmap"},
    {"title": "Processes & services", "detail": "Track critical services and flag unexpected process behavior.", "status": "roadmap"},
    {"title": "Performance & availability", "detail": "The same incident and alerting engine that powers website monitoring today.", "status": "roadmap"}
  ]}'::jsonb),
('solutions', 'solutions', 'devops-monitor', 3, 'DevOps Monitor', 'Visibility into your deployment pipeline', 'Monitoring for the tools your engineering team actually runs — containers, orchestration, CI/CD, and infrastructure-as-code. This is on our roadmap, not shipped yet.', 'roadmap', null,
  '{"waitlistProduct": "devops-monitor", "capabilities": [
    {"title": "Docker & Kubernetes", "detail": "Container, pod, and cluster health in one place.", "status": "roadmap"},
    {"title": "CI/CD pipelines", "detail": "GitHub Actions, GitLab CI/CD, and Jenkins build & deploy status.", "status": "roadmap"},
    {"title": "Infrastructure as code", "detail": "Terraform and Ansible run status and drift detection.", "status": "roadmap"},
    {"title": "Observability integrations", "detail": "Pull metrics from Prometheus and Grafana into the same dashboard.", "status": "roadmap"},
    {"title": "Deployment tracking", "detail": "Correlate incidents with recent deployments.", "status": "roadmap"},
    {"title": "Application health & logs", "detail": "Centralized application health signals and log access.", "status": "roadmap"}
  ]}'::jsonb);

-- ---------------------------------------------------------------------------
-- Additional admin capabilities
-- ---------------------------------------------------------------------------

-- Platform-wide user directory (every user, across every organization).
create or replace function admin_list_all_users()
returns table (
  user_id            uuid,
  email              text,
  organization_name  text,
  role               text,
  is_platform_admin  boolean,
  created_at         timestamptz
)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  return query
    select
      u.id,
      u.email::text,
      o.name,
      m.role,
      exists (select 1 from platform_admins pa where pa.user_id = u.id),
      u.created_at
    from auth.users u
    left join memberships m on m.user_id = u.id
    left join organizations o on o.id = m.organization_id
    order by u.created_at desc;
end;
$$;

grant execute on function admin_list_all_users() to authenticated;

-- Platform admins can edit plan limits directly (previously read-only).
create policy plan_limits_admin_update on plan_limits
  for update using (is_platform_admin()) with check (is_platform_admin());
