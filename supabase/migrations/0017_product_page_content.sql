-- Deep product-page content: who it's for, workflow, and technologies for each
-- product in the catalog. Stored in content_items.metadata so the admin CMS
-- remains the single source of truth. jsonb concatenation preserves existing
-- keys (capabilities, waitlistProduct).

update content_items set metadata = metadata || '{
  "whoFor": [
    "SRE and DevOps teams who need to know before customers tweet it",
    "Agencies operating dozens of client websites under SLA",
    "SaaS teams exposing public APIs their customers depend on",
    "IT departments responsible for intranets and public sites"
  ],
  "workflow": [
    {"title": "Add a monitor", "detail": "Point it at any URL, hostname, or API endpoint and pick a check type — uptime, keyword, status code, or DNS."},
    {"title": "Checks run continuously", "detail": "From every 30 seconds, with response time, status, and redirect chain recorded on every run."},
    {"title": "Failures open incidents", "detail": "Consecutive failures open an incident with the precise cause attached, and every alert channel fires."},
    {"title": "Recovery closes the loop", "detail": "When checks pass again the incident auto-resolves, recovery alerts go out, and your status page updates itself."}
  ],
  "tech": ["Nginx", "Apache", "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes"]
}'::jsonb, updated_at = now()
where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'website-api-monitoring';

update content_items set metadata = metadata || '{
  "whoFor": [
    "Security engineers who want continuous posture checks, not annual audits",
    "Compliance-minded teams proving HTTPS hygiene to auditors",
    "Developers who ship fast and want misconfigurations caught automatically",
    "MSPs adding a security layer to every client site they manage"
  ],
  "workflow": [
    {"title": "Runs with every uptime check", "detail": "No extra setup — every HTTPS monitor is scored automatically alongside its availability checks."},
    {"title": "Headers and cookies graded", "detail": "HSTS, CSP, frame and content-type protections, cookie flags, and server version leaks — scored out of 100."},
    {"title": "Certificates tracked", "detail": "Issuer, protocol, and days-to-expiry per certificate, refreshed daily."},
    {"title": "Alerts before expiry", "detail": "Expiring certificates alert your channels early — a lapsed cert never takes you down silently."}
  ],
  "tech": ["Nginx", "Apache", "AWS", "Azure", "Google Cloud"]
}'::jsonb, updated_at = now()
where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'security-monitoring';

update content_items set metadata = metadata || '{
  "whoFor": [
    "Sysadmins running fleets of Linux servers, on-prem or cloud",
    "MSPs who need per-client host visibility with isolated tenants",
    "Self-hosters and startups without budget for heavyweight agents",
    "Ops teams consolidating server and website monitoring in one place"
  ],
  "workflow": [
    {"title": "Register a host", "detail": "One click creates the host and issues its private, rotatable ingest key."},
    {"title": "Install with one line", "detail": "The agent is plain bash + curl — no runtime dependencies, works on any Linux distribution."},
    {"title": "Metrics stream in", "detail": "CPU, memory, disk, load, uptime, and process count report every minute over HTTPS."},
    {"title": "Watch it live", "detail": "The Hosts dashboard shows online/offline state and live gauges, updating in real time."}
  ],
  "tech": ["Linux", "Docker", "AWS", "Azure", "Google Cloud"]
}'::jsonb, updated_at = now()
where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'kada-nigrani';

update content_items set metadata = metadata || '{
  "whoFor": [
    "Enterprises with VMware or Hyper-V estates needing one view",
    "Network teams monitoring switches, routers, and storage over SNMP",
    "Windows-heavy organizations waiting on our Windows agent"
  ],
  "tech": ["Windows", "Linux", "AWS", "Azure", "Google Cloud"]
}'::jsonb, updated_at = now()
where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'infrastructure-monitor';

update content_items set metadata = metadata || '{
  "whoFor": [
    "Platform teams running Docker and Kubernetes in production",
    "DevOps engineers who want CI/CD and deploy health beside uptime",
    "Teams correlating incidents with the release that caused them"
  ],
  "tech": ["Docker", "Kubernetes", "GitHub Actions", "Terraform", "Prometheus", "Grafana"]
}'::jsonb, updated_at = now()
where page_slug = 'solutions' and section_key = 'solutions' and item_key = 'devops-monitor';
