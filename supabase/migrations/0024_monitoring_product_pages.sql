-- Monitoring product-page portfolio update.
--
-- Rather than adding thin, mostly-roadmap marketing pages for every category
-- in the Nagios/Zabbix-style brief (Network Monitoring, Network Device
-- Monitoring, Alert Management, Dashboards & Reports, ...), this migration:
--   1. Promotes "infrastructure-monitor" to reality: it now describes the TCP
--      connect + DNS record checks that ship today (Nagios check_tcp-style
--      network device monitoring), with SNMP/agent hardware telemetry kept
--      honestly on the roadmap.
--   2. Adds the RCA + remediation-runbook capabilities to Kada Nigrani, since
--      those shipped and aren't reflected in its product page yet.
--   3. Adds one new, substantial, fully-real product page: Alerting &
--      Incident Response — covering multi-channel alerts, automatic incident
--      lifecycle, root-cause analysis, and the MTTR dashboard.
-- This avoids the "no placeholder cards" problem: every capability listed
-- below is either shipped today or explicitly marked roadmap.

update content_items set
  title = 'Network & Device Monitoring',
  subtitle = 'Watch every router, switch, firewall, and network service — not just websites',
  body = 'Agentless checks against any network device with a reachable port — routers, switches, firewalls, printers, DNS servers — the same TCP-connect model Nagios'' check_tcp uses, plus DNS record monitoring. Live today for connectivity and latency; SNMP-based hardware telemetry (CPU, memory, temperature, interface counters) is next on the roadmap.',
  status = 'live',
  metadata = metadata || '{
    "workflow": [
      {"title": "Add a device", "detail": "Point a TCP check at any router, switch, firewall, or service port — or a DNS check at any record."},
      {"title": "Checks run continuously", "detail": "Connects to the port (or resolves the record) from every 30 seconds and measures real latency."},
      {"title": "Failures open incidents", "detail": "Consecutive failures open an incident with the exact connection error attached."},
      {"title": "RCA diagnoses the cause", "detail": "Root Cause Analysis reads the failure and tells you whether it looks like a firewall block, a dead service, or a DNS problem."}
    ],
    "capabilities": [
      {"title": "TCP device connectivity checks", "detail": "Nagios check_tcp-style: connects to any port on any device and measures latency. Works for routers, switches, firewalls, printers, and any TCP service.", "status": "live"},
      {"title": "DNS record monitoring", "detail": "Watches A, AAAA, CNAME, MX, TXT, and NS records and alerts when they stop resolving or change.", "status": "live"},
      {"title": "Common port presets", "detail": "One-click presets for HTTPS, HTTP, SSH, DNS, RDP, MySQL, and more.", "status": "live"},
      {"title": "Root cause analysis on failure", "detail": "Evidence-based diagnosis from the actual connection error — refused, timed out, or unreachable.", "status": "live"},
      {"title": "Multi-channel alerts", "detail": "Email, Slack, and webhook alerts fire the moment a device stops responding.", "status": "live"},
      {"title": "SNMP polling", "detail": "CPU, memory, temperature, and interface counters via SNMP v2/v3.", "status": "roadmap"},
      {"title": "Interface & bandwidth monitoring", "detail": "Per-interface traffic, errors, and utilization graphs.", "status": "roadmap"},
      {"title": "Routing protocol monitoring", "detail": "BGP/OSPF neighbor and route-flap tracking.", "status": "roadmap"},
      {"title": "UPS & power monitoring", "detail": "Battery, runtime, and input/output voltage via SNMP.", "status": "roadmap"}
    ]
  }'::jsonb,
  updated_at = now()
where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'infrastructure-monitor';

update content_items set
  metadata = jsonb_set(
    metadata,
    '{capabilities}',
    (metadata->'capabilities') || '[
      {"title": "Root cause analysis", "detail": "Evidence-based diagnosis of host issues from real check and metric telemetry.", "status": "live"},
      {"title": "Safe remediation runbooks", "detail": "Run an admin-approved, allowlisted action (reload web server, restart a service, clear temp files) with a full audit trail. Opt-in per host.", "status": "live"}
    ]'::jsonb
  ),
  updated_at = now()
where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'kada-nigrani';

insert into content_items (page_slug, section_key, item_key, sort_order, title, subtitle, body, status, href, metadata)
select
  'solutions', 'solutions', 'alerting-incident-response', 5,
  'Alerting & Incident Response',
  'From detection to diagnosis to recovery — automatically',
  'Every monitor — website, server, or network device — feeds one incident engine. Consecutive failures open an incident automatically, Root Cause Analysis reads the real telemetry to explain why, your alert channels fire immediately, and recovery closes the loop on its own. A live MTTR dashboard tracks how the whole team is actually doing.',
  'live', null,
  '{
    "whoFor": [
      "On-call engineers who need the real cause, not just a red dot",
      "IT managers who need MTTR and incident volume, not raw logs",
      "MSPs proving response times to clients with a real dashboard",
      "Teams who want alerts to stop the moment things recover"
    ],
    "workflow": [
      {"title": "A check fails", "detail": "Consecutive failures across any monitor type cross the threshold."},
      {"title": "Incident opens", "detail": "Automatically, with the precise failure — status code, timeout, or DNS/TCP error — attached as the cause."},
      {"title": "RCA diagnoses it", "detail": "Root Cause Analysis reads the telemetry and produces a primary diagnosis with severity, evidence, and prioritized remediation steps."},
      {"title": "Alerts fire", "detail": "Configured email, Slack, and webhook channels are notified within seconds."},
      {"title": "Recovery closes it", "detail": "The next passing check auto-resolves the incident and notifies recovery — no manual close needed."}
    ],
    "capabilities": [
      {"title": "Automatic incident lifecycle", "detail": "Opens on consecutive failure, auto-resolves on recovery — no manual triage step required.", "status": "live"},
      {"title": "Root cause analysis engine", "detail": "Evidence-based diagnosis (DNS, SSL, TCP, HTTP, response-time trend) with severity and confidence.", "status": "live"},
      {"title": "Prioritized remediation guidance", "detail": "Action, estimated time, risk, and whether approval is required — for every diagnosed issue.", "status": "live"},
      {"title": "Incident lifecycle timeline", "detail": "Detected → root cause identified → alerts dispatched → recovery verified → closed, with real timestamps.", "status": "live"},
      {"title": "MTTR / open / resolved dashboard", "detail": "Mean time to repair and incident counts computed from your real incident history.", "status": "live"},
      {"title": "Multi-channel alert routing", "detail": "Email, Slack, and generic webhooks, configurable per organization.", "status": "live"},
      {"title": "Public status pages", "detail": "A shareable, honest status page reflecting live monitor state.", "status": "live"},
      {"title": "Escalation policies", "detail": "Multi-tier on-call escalation if the first responder doesn''t acknowledge.", "status": "roadmap"},
      {"title": "Maintenance windows", "detail": "Suppress alerts during planned maintenance without disabling monitors.", "status": "roadmap"},
      {"title": "SMS & Microsoft Teams alerts", "detail": "Additional alert channel types beyond email/Slack/webhook.", "status": "roadmap"}
    ]
  }'::jsonb
where not exists (
  select 1 from content_items
  where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'alerting-incident-response'
);
