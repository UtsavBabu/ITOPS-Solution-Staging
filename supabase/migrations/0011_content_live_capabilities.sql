-- Reflects the newly-shipped check types + public status pages in the public
-- Solutions content. Keyword, status-code, and DNS checks plus public status
-- pages move from "roadmap" to "live"; TCP/UDP/ping stays on the roadmap
-- (DNS is now split out and live). Idempotent: replaces the whole capabilities
-- array for the Website & API Monitoring solution.

update content_items
set
  body = 'Continuous HTTP/HTTPS, keyword, status-code, and DNS checks against every website or API endpoint you add — with response-time history, redirect-chain tracing, automatic incident tracking, and shareable public status pages. Live today, not a demo.',
  metadata = '{"capabilities": [
    {"title": "HTTP & HTTPS uptime checks", "detail": "Checks on a schedule from 30 seconds to 15 minutes, per monitor.", "status": "live"},
    {"title": "Keyword & content checks", "detail": "Alerts when expected text is missing from a page, or when unexpected error text appears.", "status": "live"},
    {"title": "Exact status-code checks", "detail": "Assert an endpoint returns one specific HTTP code — ideal for APIs and auth-protected routes.", "status": "live"},
    {"title": "DNS record monitoring", "detail": "Watch A, AAAA, CNAME, MX, TXT, and NS records and get alerted when they stop resolving or change value.", "status": "live"},
    {"title": "Redirect chain tracing", "detail": "Follows up to 5 redirects and records the full chain for every check.", "status": "live"},
    {"title": "Response time history", "detail": "Every check is stored, powering the response-time chart on each monitor.", "status": "live"},
    {"title": "Automatic incident tracking", "detail": "Opens an incident after consecutive failures, auto-resolves on recovery.", "status": "live"},
    {"title": "Multi-channel alerting", "detail": "Slack, webhook, and email notifications the moment a monitor goes down.", "status": "live"},
    {"title": "Public status pages", "detail": "A shareable hosted status page showing the live status of your monitors.", "status": "live"},
    {"title": "TCP, UDP & ping checks", "detail": "Raw-socket and ICMP reachability checks beyond HTTP and DNS.", "status": "roadmap"},
    {"title": "GraphQL-aware checks", "detail": "Query-based synthetic checks against GraphQL APIs.", "status": "roadmap"},
    {"title": "Regional & global checks", "detail": "Run checks from multiple regions to catch geography-specific outages.", "status": "roadmap"},
    {"title": "SLA reports", "detail": "Scheduled uptime and SLA compliance reports per monitor.", "status": "roadmap"}
  ]}'::jsonb,
  updated_at = now()
where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'website-api-monitoring';
