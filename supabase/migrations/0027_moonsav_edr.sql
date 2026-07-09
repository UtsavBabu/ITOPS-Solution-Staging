-- MoonSAV-EDR: a new product page, honestly labeled as roadmap.
--
-- The requested capability set (rootkit/ransomware behavior detection,
-- registry monitoring, CIS benchmark scoring, ...) describes a real endpoint
-- agent + detection engine — a multi-month security engineering effort, not
-- something buildable in a single pass. Rather than fabricate "live" badges
-- for capability that doesn't exist, this ships the full product vision as
-- an honest roadmap page (same pattern already used for DevOps Monitor),
-- with a working waitlist so real interest is captured for prioritization.

alter table waitlist_signups
  drop constraint if exists waitlist_signups_product_check;
alter table waitlist_signups
  add constraint waitlist_signups_product_check
  check (product in ('cybersachet','infrastructure-monitor','devops-monitor','moonsav-edr','upgrade-request','newsletter'));

insert into content_items (page_slug, section_key, item_key, sort_order, title, subtitle, body, status, href, metadata)
select
  'solutions', 'solutions', 'moonsav-edr', 6,
  'MoonSAV-EDR',
  'Endpoint Detection & Response for Windows, Linux, and macOS',
  'A single agent and dashboard for endpoint visibility and security — asset and software inventory, vulnerability and patch status, security configuration assessment, file integrity and malware/ransomware detection, and audited one-click remediation. Everything below is the honest product roadmap, not a shipped feature — nothing on this page is live yet.',
  'roadmap', null,
  '{
    "waitlistProduct": "moonsav-edr",
    "whoFor": [
      "Security teams who need one place to see every endpoint''s health and risk, not five different tools",
      "IT admins tracking software inventory, patch status, and end-of-life risk across the fleet",
      "MSPs proving endpoint security posture to clients with real compliance scoring",
      "Compliance teams needing CIS benchmark and configuration evidence, not a spreadsheet"
    ],
    "workflow": [
      {"title": "Deploy the agent", "detail": "One lightweight agent for Windows, Linux, or macOS endpoints — no infrastructure changes required."},
      {"title": "Continuous telemetry", "detail": "Process, file, registry, network, and configuration data streams to your dashboard in near real time."},
      {"title": "Detection & scoring", "detail": "Behavioral rules and compliance benchmarks turn raw telemetry into a risk score, vulnerability list, and prioritized alerts."},
      {"title": "Automated response", "detail": "Approved remediation actions run through the same audited, allowlisted runbook model already live on Kada Nigrani."}
    ],
    "tech": ["Windows", "Linux", "macOS", "Docker", "Kubernetes"],
    "capabilities": [
      {"title": "Endpoint health & risk scoring", "detail": "A single risk score per device from resource usage (CPU, memory, disk, network) plus every signal below.", "status": "roadmap"},
      {"title": "Asset & software inventory", "detail": "Automatic discovery, OS inventory, and full installed-software inventory across every endpoint.", "status": "roadmap"},
      {"title": "Patch & vulnerability management", "detail": "Missing security patches, software version validation, and unsupported/end-of-life software detection.", "status": "roadmap"},
      {"title": "Security configuration assessment", "detail": "CIS benchmark compliance, weak configuration detection, and firewall/antivirus/disk-encryption/Secure Boot/TPM status (BitLocker, FileVault, LUKS).", "status": "roadmap"},
      {"title": "File integrity monitoring", "detail": "Real-time detection of unauthorized changes to critical files and directories.", "status": "roadmap"},
      {"title": "Malware & ransomware detection", "detail": "Malware detection, ransomware behavior detection, and rootkit detection.", "status": "roadmap"},
      {"title": "Process, service & driver monitoring", "detail": "Running processes, services, drivers, and startup programs — with anomaly flagging.", "status": "roadmap"},
      {"title": "Windows registry & scheduled task monitoring", "detail": "Tracks registry changes and scheduled tasks for persistence and tampering attempts.", "status": "roadmap"},
      {"title": "USB & removable device monitoring", "detail": "Visibility into removable storage connected to any monitored endpoint.", "status": "roadmap"},
      {"title": "User & login activity", "detail": "Login monitoring, failed-login detection, and local user / administrator account tracking.", "status": "roadmap"},
      {"title": "Container & Kubernetes monitoring", "detail": "Docker runtime monitoring and Kubernetes node-level visibility.", "status": "roadmap"},
      {"title": "Automated remediation runbooks", "detail": "Restart agent, trigger malware scan, isolate endpoint from network, restart security service, force inventory scan, initiate patch deployment, generate forensic package, run compliance assessment — all audited and approval-gated.", "status": "roadmap"},
      {"title": "Identity & directory integrations", "detail": "Active Directory, Microsoft Entra ID, and LDAP for device and user context.", "status": "roadmap"},
      {"title": "SIEM & alerting integrations", "detail": "Syslog, SIEM, email, Slack, Microsoft Teams, and generic webhooks.", "status": "roadmap"},
      {"title": "Endpoint dashboards", "detail": "Health score, critical vulnerabilities, missing patches, threat timeline, device inventory, compliance score, device groups, and risk score in one view.", "status": "roadmap"}
    ]
  }'::jsonb
where not exists (
  select 1 from content_items
  where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'moonsav-edr'
);
