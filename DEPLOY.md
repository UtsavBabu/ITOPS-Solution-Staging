# Deploying ITOps Solution

The platform has two halves:

| Half | Where it runs | State |
|---|---|---|
| **Backend** — Postgres, Auth, RLS, Edge Functions, Storage, cron checks | Supabase project `ayzsuxmmnbtsylqdenna` | **Already live.** Nothing to host yourself. |
| **Frontend** — React SPA (marketing site + customer dashboard + admin panel) | Any server or static host | Build & serve `frontend/dist` |

## Option A — Docker on any cloud server (recommended)

```bash
cd frontend
docker build -t itops-frontend \
  --build-arg VITE_SUPABASE_URL="https://ayzsuxmmnbtsylqdenna.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="<anon key from frontend/.env>" .
docker run -d --restart unless-stopped -p 80:80 --name itops itops-frontend
```

Put your domain in front (any reverse proxy / load balancer) and enable HTTPS
(e.g. Caddy, Traefik, or certbot + nginx on the host).

## Option B — Static hosting (Vercel / Netlify / S3+CloudFront / any nginx)

```bash
cd frontend && npm ci && npm run build   # produces dist/
```

Serve `dist/` with an SPA fallback (all unknown paths → `index.html`).
`frontend/nginx.conf` shows the exact rules, including keeping
`/kada-nigrani-agent.sh` downloadable — customer servers fetch the monitoring
agent from that path.

Set the two env vars at build time: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(the anon key is public by design; tenant isolation is enforced by RLS).

## Backend redeploys (only when backend code changes)

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

Pushes any new `supabase/migrations/*.sql` and redeploys the edge functions
(`run-due-checks`, `ingest-metrics`, `admin-manage-users`, `test-alert-channel`).

## Super-admin (platform owner)

Migration `0022_seed_superadmin.sql` seeds the platform owner on deploy:

- **email:** `babulearn57@gmail.com`
- **password:** `admin@123`  *(rotate after first login)*

On the **first deploy** it also wipes all test data (monitors, orgs, users) for a
clean slate; on **subsequent deploys** it never wipes — it only ensures the
platform-admin grant and ENTERPRISE package stay intact, so customer data is safe.

The owner can:

- Log in at `/admin/login` (verified as a platform admin).
- Resell / provision customers from **Customers** (`/admin/customers`) on any package.
- Manage users platform-wide from **All Users** (`/admin/users`).
- Change any org's package from the Customers table.

If your Supabase version rejects the raw `auth.users` insert in the migration,
seed manually instead (idempotent):

```bash
cd frontend
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ../scripts/seed-superadmin.mjs
```

## Admin roles (RBAC)

Migrations `0030_admin_roles.sql` and `0031_reseller_admin.sql` split
platform-admin access into five roles — apply both the same way as any
other backend change (0031 depends on 0030 and must run after it, which
`deploy.sh` already handles since migrations apply in filename order):

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

| Role | Can do |
|---|---|
| `super_admin` | Everything, including granting/revoking admin access |
| `support` | Customer/organization lifecycle (rename, archive, restore, delete), Leads & Messages, sees every customer |
| `billing` | Plan changes (per-customer and the global Plan Limits catalog), product licensing, sees every customer |
| `content_editor` | Content Manager, Site Visibility |
| `reseller` | Provision new customers and change *their own* customers' plan — nothing else, sees nobody else's customers |

Every admin who already exists (including the seeded super-admin above)
becomes `super_admin` automatically — nobody's access changes on deploy.
Only a `super_admin` can grant a role to someone else, from **All Users**.

**Reseller Admin** is the partner/sales role: someone selling the product to
their own book of customers. From **Customers** they provision a new
account exactly like support does — but the org gets stamped with
`created_by = <their user id>`, and every reseller-specific read/write
(the Customers list, plan changes) is filtered to `created_by = auth.uid()`
at the database level. A reseller literally cannot query, view, or modify a
customer they didn't provision — there's no frontend flag to bypass, RLS
rejects it outright. They can't rename, archive, or delete an organization
(support/super_admin only), can't grant admin access, and don't see
Organizations, All Users, Plan Limits, Content Manager, or Audit Log in the
nav. A user can hold `billing` or `support` *or* `reseller` — they're
separate role values, not stackable, so pick whichever matches how that
person actually works day to day.

Until these migrations are applied, the app behaves exactly as it did
before — the frontend calls a `platform_admin_role()` RPC that doesn't
exist yet on an un-migrated database, catches the failure, and falls back
to showing every admin the full nav (same as today). No downtime, no
broken state either side of the deploy.

## Dynamic Roles & Permissions (Google Workspace–style RBAC)

Migration `0032_dynamic_rbac.sql` replaces the fixed five-role list above
with a real, data-driven permission system — roles and their per-module
grants (View / Create / Edit / Delete / Configure / Export / Manage) live
in two tables (`roles`, `role_permissions`), editable from **Roles &
Permissions** (`/admin/roles`, super_admin and platform_administrator
only) with zero code deploys. Apply it the same way, after 0030/0031:

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

**What it adds:**

- A **6th platform role, `platform_administrator`** — broad day-to-day
  operational access (organizations, users, product licensing, leads,
  audit log) without the two things reserved for `super_admin`: granting
  admin access to others, and Plan Limits (pricing/billing policy).
- **Nine organization-level roles** — Organization Administrator, IT
  Manager, Network Engineer, Security Analyst, System Administrator,
  Helpdesk, Billing Manager, Auditor, Read Only — assignable per member
  from **Team → Team Members** (anyone with `team:manage`, i.e. Organization
  Administrator or the legacy `ADMIN` role, gets a role dropdown next to
  every other member; the existing `ADMIN`/`MEMBER`/`READ_ONLY` legacy roles
  keep working unchanged, now as three more rows in the same table).
- **Custom roles** — the "New role" button in Roles & Permissions clones
  any existing role's grid into a new one, at either scope.
- `has_platform_permission()` / `has_org_permission()` / `my_permissions()`
  — SECURITY DEFINER functions any new backend check or frontend nav item
  can call instead of hardcoding a role name.

**Scoped to what's real today, on purpose.** Several of the requested
org-level roles reference product capabilities that don't exist yet in
this codebase — MoonSAV EDR (threat detection, device isolation), a
Training module, Quotes, and a per-organization billing portal. Rather
than fabricate permissions for features that aren't built, each affected
role's grid only covers what the product actually does now (e.g. Security
Analyst gets `dashboard`/`monitors`/`incidents` view access today — the
EDR-specific rows land in a follow-up migration once EDR ships). This is
documented per-role in each role's `description` and in the migration's
own comments — nothing in the grid claims a permission the UI can't back up.

**What this pass does *not* do:** the five platform roles from migrations
0030/0031 (`super_admin`/`support`/`billing`/`content_editor`/`reseller`)
keep their existing hardcoded RLS/RPC checks untouched — tested, live code
paths weren't rewritten to route through the new dynamic checks. And the
existing resource tables a regular organization member touches day to day
— `monitors`, `hosts`, `assets`, `alert_channels` create/edit/delete — are
**not yet retrofitted** with `has_org_permission()` checks; their RLS
today only requires org membership, with no role differentiation (a gap
that predates this migration — every org member, regardless of role, can
already create/edit/delete these). The Roles & Permissions UI reflects
what each org role is *meant* to grant on these modules, and the
frontend's own nav/action gating already respects it, but the database
itself doesn't reject a `read_only` member's direct RPC call yet. Retrofitting
those specific, multiply-evolved functions is a separate, higher-risk pass.

The frontend degrades the same way as 0030/0031: `my_permissions()`,
`fetchOrgRoles()`, and the Roles & Permissions page all catch a missing
function/table on an un-migrated database and fall back to "show
everything" (nav) or "read-only badge, no dropdown" (Team member roles) —
no broken state either side of the deploy.

## Reseller pipeline & role-grant fix (migration 0033)

Testing the actual "grant someone reseller access" flow surfaced a real bug:
`admin_set_platform_admin`'s role check was still the hardcoded list from
migration 0030 and never actually included `reseller` (migration 0031's own
comment claimed it did — it didn't) or `platform_administrator` (0032).
Granting either role has raised "Invalid role" from a fresh deploy onward.
Migration `0033_reseller_pipeline_and_role_fixes.sql` fixes this by
validating against the real `roles` table instead of a list that has to be
kept in sync by hand — apply it after 0030-0032, same command as always.

It also adds the piece that didn't exist before: a public entry point.
There was no way to *become* a reseller short of a super_admin already
knowing to grant it manually.

- **`/partners`** — a public "Become a Reseller" application form (company,
  contact, email, phone, message). Anyone can submit one; it does not grant
  any access by itself.
- **`/admin/resellers`** (Resellers, in the admin nav) — super_admin,
  platform_administrator, and support can all see and triage applications;
  only a super_admin can actually approve one (unchanged privilege boundary
  from `admin_set_platform_admin`). Approving either grants the role to a
  matching existing account by email, or — if no account exists yet — creates
  one on the spot (admin sets the password, same as "+ Add user") and grants
  reseller access in the same action. Rejecting just marks the application
  closed.
- **All Users** now has an editable org-role dropdown per row too (not just
  the Platform Admin column) — a super_admin/support/platform_administrator
  can fix a customer's organization role directly via the new
  `admin_update_member_role()` RPC, without needing that customer's own Team
  page. Falls back to read-only text on an un-migrated database.

## Platform Command Center (migration 0034)

Platform Overview (`/admin`) is a real operational dashboard now, not just a
totals grid — every number and panel is backed by a table this platform
already writes to; nothing is a placeholder or synthetic metric. Apply the
same way as any other migration:

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

- **Stat grid** grows from 6 to 8 tiles: Organizations, Licensed (orgs with
  at least one active product), Users, Monitors Up, Monitors Down, Open
  Incidents, Agents Online/Total (`host_agents.last_seen_at` within 5
  minutes), SSL Expiring (`ssl_info.days_remaining <= 14`).
- **Product adoption** panel — real per-product license counts from
  `organization_products`, not a guess.
- **Security — SSL expiring soon** panel — actual certificates by name and
  organization from `ssl_info`, not a generic "security score."
- **Recent activity** panel — the last 6 rows of the existing audit log,
  surfaced here instead of requiring a click into Audit Log.
- **Quick actions row** — Create organization, Reseller applications (live
  pending-count badge once 0033 is applied), Invite admin — promoted above
  the stat grid instead of buried in the link list below.

`admin_platform_stats()`'s return shape changed (more columns), so this is a
drop-then-create like `admin_list_all_users` was in 0030 — same reasoning,
same pattern. Deliberately **not** included: literal infrastructure metrics
like API/database/queue health, background job status, or MoonSAV EDR agent
counts — none of that is tracked by this platform today, and fabricating a
"System Health: 99.98%" tile would be exactly the kind of dead UI this
project has avoided everywhere else. If any of those become real (e.g. a
background job table gets built), add them here the same way.

Also folded `/admin/organizations` into `/admin/customers` — Organizations
was a strict subset (same rename/archive/restore/delete/plan-change actions
on the same table, none of the provisioning or license-detail view) and had
drifted out of sync as a maintenance burden. Old links redirect automatically.

## Cross-org list pages, user editing, host provider tags (migration 0035)

Three real gaps closed at once, all in one migration since they're small and
independent — apply the same way as always:

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

- **The Command Center's 4 non-obvious stat tiles now click through**
  somewhere real: Monitors Up/Down → `/admin/monitors`, Open Incidents →
  `/admin/incidents`, Agents Online → `/admin/agents`, SSL Expiring →
  `/admin/ssl`. All four are genuine platform-wide list views (search +
  filter), not just the tile's own number restated. New "Monitoring" nav
  group links to all four directly too. Reseller is excluded from all four —
  same reasoning as `admin_security_highlights` in 0034, named data
  belonging to organizations they didn't provision isn't theirs to see.
- **All Users has a real Edit now**, not just role/password controls — a
  pencil icon next to each email lets you set their full name (new `update`
  action on the `admin-manage-users` edge function; requires redeploying
  edge functions, which `deploy.sh` already does). Combined with the
  existing role dropdown, password reset, and delete, that's full CRUD.
- **Server Agents (Kada Nigrani hosts) can be tagged AWS/Azure/GCP/On-Prem/
  Other** — optional, cosmetic only, doesn't change how the agent is
  monitored. Shows as a badge on the host card and in the new admin Server
  Agents list.
- Also split **Website & Network** into two separate dashboards — `/monitors`
  (Website & API) and `/network` (Network Devices) — and added named device
  presets (Home Router, GPON/Fiber ONT, Switch, Firewall, Printer, NAS) to
  the network check form so it's obvious the existing TCP check already
  covers a home router or ISP fiber terminal, not just generic "devices."

All three RPC/function-signature changes in this migration
(`admin_list_all_users`, `list_host_agents`, `create_host_agent`) use the
drop-then-create pattern — same `CREATE OR REPLACE` gotcha documented in
0030 and 0034: Postgres treats a different parameter or return-column list
as a different function identity, not a replacement.

## CyberSachet Training & Certification (migrations 0037, 0040–0044)

Turns the CyberSachet product page from a roadmap into a real, licensed
security-awareness training platform — courses with lessons and a quiz,
per-user completion tracking, admin-assigned coursework, and a verifiable
completion certificate. Apply them the same way as always, in order
(0038/0039 in between are small content-accuracy fixes to the public
`/cybersachet` page and don't need their own section):

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

- **Licensing-gated, not a separate login.** An organization needs the
  `cybersachet` product active (`organization_products`, same mechanism as
  every other product) for its members to see `/training` as a real,
  database-backed catalog. Course content itself is authored once by
  platform admins from **CyberSachet Courses** (`/admin/cybersachet-courses`)
  and shared by every licensed organization — courses → lessons → a
  multiple-choice quiz, same relational shape a real LMS would use rather
  than the generic marketing `content_items` table.
- **Before licensing (or before the migration is applied), `/training`
  isn't blank** — it shows the exact same real curriculum from a
  `localStorage`-backed preview (`frontend/src/data/cybersachetCourses.js`),
  so a prospect can actually try the product before buying it. Once an org
  is licensed and 0037 is applied, the page switches to the real Supabase
  RPCs automatically — nothing in the frontend needs to change either side
  of that switch.
- **Starter-plan orgs get a locked preview, not the full catalog:** the
  first lesson of the first course, full course list shown but locked with
  an upgrade prompt. CyberSachet (courses, assignments, certificates) is a
  Professional-and-above feature, enforced at the RPC layer
  (`issue_cybersachet_certificate` rejects `STARTER` orgs outright), not
  just hidden in the UI.
- **Admin-assigned, not self-serve enrollment.** A licensed employee only
  sees courses actually assigned to them (`cybersachet_assignments`,
  migration 0041) — assigning is done per-organization from the
  **Customers** admin page (organization detail → CyberSachet tab), not
  from the Courses catalog page, since that's where an admin already sees
  that org's member list. Assigning still just marks a requirement; any
  licensed member could already browse and take any published course
  before an assignment existed, and still can — an assignment adds "shows
  as assigned + admin can see who has/hasn't finished," not an access
  restriction.
- **Lesson completion requires actually answering a question**, not a
  single unguarded "mark done" click (`complete_lesson()` from 0037 is
  gone — 0042 replaced it with `check_lesson_answer()`, which verifies the
  answer server-side before recording progress, mirroring the existing
  quiz boundary where choices are readable but the correct index isn't).
  0043 seeds the actual comprehension-check question and content, matching
  what shipped in the local preview.
- **Certificates are real and level-gated to what's actually built.**
  Completing every published course unlocks a **CSSA** (CyberSachet
  Security Awareness) certificate — the only level with course content
  behind it. `CyberSachetCertificate.jsx`'s `CERT_LEVELS` documents four
  more levels (CSUP/CSSC/CSA/CSEM) as a named, honest roadmap with
  `active: false` — there's no migration for them because issuing a
  credential with no course content behind it would be fabricating one.
  The certificate itself embeds a real QR code (the `qrcode` package,
  added to `frontend/package.json`) pointing at `/verify/:certificateNo`.
- **`/verify` and `/verify/:certificateNo` are public, no auth required** —
  same pattern as the org status pages. `verify_certificate()` is granted
  to `anon` as well as `authenticated` (it's `SECURITY DEFINER`, so this
  doesn't loosen RLS on the underlying table for direct queries) and
  returns only what a physical certificate would show: name, org, level,
  score, issue/expiry dates, and valid/expired/revoked status. A
  super_admin can revoke a certificate (`admin_revoke_cybersachet_certificate`);
  nothing else can.
- `frontend/src/pages/_DevCertPreview.jsx` (`/_dev-cert-preview`) is a
  no-auth, hardcoded-data scratch page used to eyeball the certificate and
  certification-path visuals while building them — not linked from any nav,
  safe to leave in place or delete.

## CyberSachet LMS upgrade (migration 0045)

Turns the training feature above into a real LMS, not just a course list.
Apply the same way as always:

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

- **Modules.** Each course's lessons are grouped into two named modules
  (e.g. "Recognizing Phishing" / "Responding & Preventing") with their own
  progress bar and a sticky in-page jump nav — a real grouping of that
  course's own existing lessons, not a cross-course "Learning Path" (see
  "Deliberately deferred" below for why those are a separate feature).
- **Categories.** Courses carry a `category` (Email Security, Identity,
  Cybersecurity, Endpoint Security, Data Protection today) and the library
  only ever renders a filter chip for a category with a real published
  course behind it — never an empty shelf.
- **An honest Starter free tier.** Starter no longer gets a one-lesson
  teaser of a single course — it gets two full, real courses (Phishing
  Awareness, Password Security & MFA) marked `free_tier`, completely free
  on every package. Every other course shows as a locked "Professional
  plan required" card instead of disappearing, so Starter sees what
  upgrading actually unlocks. Enforced at the RPC layer
  (`enroll_in_course`/`check_lesson_answer`/`submit_quiz` all reject a
  non-free course for a Starter org), not just hidden in the UI.
- **Richer quizzes.** Beyond single-choice, questions can be `multiple`
  (select every correct answer, graded as a set) or `ordering` (arrange
  steps into the right sequence, graded exactly) — `submit_quiz()` grades
  all three server-side. One real example of each new type ships on
  Phishing Awareness; authoring more for the rest of the catalog is now an
  **admin → CyberSachet Courses** task, not a follow-up migration.
- **Organization admins can now assign/track/reset training themselves** —
  not just a platform admin. A new `training` module in the dynamic RBAC
  grid (migration 0032) grants Organization Administrator (and the legacy
  `ADMIN` role) full manage, and Auditor read-only visibility. Shows up as
  a **CyberSachet Training** panel on **Team & Plan** once the org is
  licensed — assign a course to a member, see completion/score/overdue,
  reset a member's progress on one course (which also revokes their
  certificate, since "every course complete" would no longer be true).
  The existing platform-admin path (Customers → org → CyberSachet
  assignments) is untouched; this is an additional, org-scoped entry point
  using the same `has_org_permission()` engine everything else in the
  dynamic RBAC system uses.
- **Real per-org leaderboard and learner stats.** `/training` shows each
  learner's average score, learning hours, and current streak (consecutive
  days with real lesson/quiz activity — not a placeholder counter), plus
  earned badges (First Course, Perfect Score, Completionist, Certified,
  3-/7-Day Streak) computed from actual enrollment/certificate data. A
  compact team leaderboard ranks real completion counts and average
  scores within the caller's own organization — there's no cross-org
  leaderboard (see below).
- **Notes and bookmarks are per-device**, not a new database table — a
  personal scratchpad (`localStorage`) for a lesson, not shared training
  records. If cross-device notes turn out to matter, that's a real
  follow-up migration, not a guess baked in now.
- **Local preview mode gets an honest certificate teaser.** Completing
  every course in the browser-only preview shows a "you'd earn a
  certificate here" card instead of a real one — there's no database
  record behind it in preview mode, so generating a real-looking
  certificate there would be fabricating a credential the same way an
  unearned CSSA cert would be.

**Deliberately deferred (flagged, not faked) — not stubbed with dead UI:**
video/narration/subtitles/transcripts (no media hosting or asset pipeline
exists), an AI tutor (needs a real LLM-backend and cost decision, not a
chat box that doesn't call anything), phishing-simulation campaigns (needs
a sending domain — already flagged out of scope in migration 0037),
CTF/cyber range/live classes/virtual labs (need real sandboxed
infrastructure this platform doesn't run), multi-course "Learning Paths"
(would require redesigning the one-certificate-per-user completion model
certificates already depend on), a compliance/audit-export dashboard and
department/manager rollups (no department schema exists yet), and
drag-and-drop/image-hotspot question types (the "arrange steps" type above
covers the same learning goal without needing new image assets). Each of
these is a real, scoped follow-up — not represented anywhere in the
current UI as if it already existed.

## Per-course certificates (migration 0046)

Every course now issues its own completion certificate, not just the CSSA
certificate for finishing the entire catalog — Coursera-style: a
certificate per course, plus one for finishing everything. Reuses the
existing `cybersachet_certificates` table (a course certificate is just
another row, `level_code = 'COURSE'` with `course_id` set) rather than a
parallel system, so verification, PDF/print, and the public `/verify` page
all work identically for both kinds. Apply the same way as always:

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

- Shown directly on the course page, right after passing its quiz — not
  buried in a separate dashboard section. "Claim your certificate" appears
  the moment a course is passed; claiming issues a real cert with its own
  number (`CRS-YYYY-NNNNNN`), QR code, and verification URL.
- **Not gated by plan tier beyond what enrollment itself already
  enforces** — a Starter org's two `free_tier` courses earn a real
  certificate too. A Starter learner simply can never complete (and so
  never certificate) a non-free course, since `enroll_in_course`/
  `submit_quiz` already refuse those (migration 0045).
- Local preview mode shows an honest teaser ("you'd earn a real
  certificate once your organization licenses CyberSachet") instead of a
  fake one, same pattern as the overall CSSA certificate.
- `verify_certificate()` and `/verify/:certificateNo` show the specific
  course name for a course certificate, or the existing "CyberSachet
  Security Awareness (CSSA)" label for the overall one.

**Also fixed in this pass, not new schema:** local preview's progress
(`cybersachet-local-progress` in `localStorage`) was stored under one
global key with no per-user scoping — on a shared browser, switching
accounts showed the previous account's local "achievements" (streak,
badges, completions) under the new one. It's now namespaced per user id
(`cybersachet-local-progress:<user id>`), same for per-lesson notes and
bookmarks. Separately, `AuthContext.jsx`'s `logout()` now clears the React
Query cache on sign-out and on any detected change of user id — the query
client is a single tab-lifetime singleton, and none of its query keys were
scoped by user, so a live (database-backed) account's cached training
stats could briefly render under a different account signed into the same
tab. Both were real cross-account bleed bugs, not features.

**Important standing note:** as of this writing, the `cybersachet` product
row from migration 0037 has never actually been inserted into this
project's live database — check **Admin → Customers → (any org) →
Licensed Products**; if there's no CyberSachet toggle there, none of
migrations 0037–0046 have been applied yet. Every CyberSachet screenshot
taken against this environment so far has been the **local preview**
fallback, not real per-org licensed data — which is a good sign the
preview faithfully mirrors the real experience, but means Starter-tier
enforcement, the per-org leaderboard, real assignment workflows, and real
certificates haven't been exercised against the database yet. Apply
0037–0046 and license a test org for CyberSachet before relying on any of
the "smoke test" steps below for this feature.

## CyberSachet catalog growth + Starter fix + quiz redesign (migration 0047)

- **Two new courses** — Mobile & Device Security and Physical Security &
  Workplace Awareness — real content, real modules, real lesson checks and
  quizzes, matching the local preview file exactly. Apply the same way:

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

- **Fixed a real Starter-tier bypass**: local preview mode (used whenever
  an org isn't licensed yet) never applied the Starter free-tier lock at
  all — it showed every course as fully open, which is a misleading
  preview of a real pricing restriction. Starter now sees exactly the two
  `free_tier` courses open, and everything else locked, identically in
  local preview and live licensed mode.
- **The local-preview certificate is now a real visual preview**, not a
  text blurb — the actual certificate design, real name/org/course/score/
  hours/dates, with a diagonal "Preview · Not Issued" watermark and no QR
  code (there's nothing real yet for a QR to point to). Applies to both
  the per-course certificate and the overall CSSA-equivalent preview.
- **Redesigned the quiz and lesson-check interaction** — native
  radio/checkbox inputs behind a `<label>` replaced with a fully custom,
  full-card clickable choice component (`ChoiceOption`) with its own
  animated selection indicator, addressing reports that answer selection
  "wasn't working" (it was — a native `accent-color` radio dot rendering
  faintly enough to look broken is a real, recurring cross-browser
  problem) and that the quiz felt congested (more vertical spacing,
  per-question answered/unanswered state on the number badge, larger tap
  targets throughout).

## Certificate document hash (migration 0048)

Every certificate — overall CSSA and per-course — now carries a real
SHA-256 hash computed server-side (`pgcrypto`, already enabled since
migration 0001) over its own certificate number, holder, course/level, and
score. Change any of those and the hash changes; it's recomputed whenever
the underlying record is (a retaken quiz, a re-issued certificate), never
at mere fetch time. Shown truncated on the certificate itself and in full
on the public `/verify` page, so a printed certificate's hash can be
compared against what verification shows right now. Deliberately **not**
labeled "blockchain" — there's no blockchain behind it, and calling a
plain hash "blockchain-ready" would be exactly the kind of decoration this
feature has avoided everywhere else. Apply the same way:

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

Also added real "Share to LinkedIn" and "Copy verification link" actions
on every issued (non-preview) certificate — LinkedIn's share-offsite
endpoint needs no API key or backend, and copy-link puts the real public
verification URL on the clipboard. Both are hidden in local preview mode,
where there's no real verification URL yet to share.

**Deliberately not built, from the same request this migration came
from**: a full department/group/team hierarchy, bulk CSV user import and
bulk course assignment, a customer-facing course builder (internal
courses/policies/SCORM/video upload), and a 4-tier feature-gating matrix
spanning every product. Each is real, substantial, standalone work — not
an extension of an evening's session — and several (SCORM, video hosting,
SSO/SCIM, a phishing-simulation sending domain) need infrastructure this
platform doesn't have yet. Building a fraction of a department/bulk-import
system and calling it done would be worse than not starting it.

## Departments (migration 0049)

The first real, bounded slice of that deferred customer-training-management
work: an organization can group its own members into departments (IT,
Security, Finance, ...), assign each a manager, and see real per-department
CyberSachet training compliance — completion rate and average score, joined
live from `cybersachet_assignments`/`cybersachet_enrollments` through
`memberships.department_id`, not sample data. Apply the same way:

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
```

- **Team & Plan** gains a Departments panel (create, rename, archive/
  restore, delete) and a per-member department dropdown, both gated by the
  same `has_org_permission(org, 'team', 'manage')` check that already
  guards member-role editing — no new permission module.
- **Training Management** panel gains a compliance card: one bar per
  department showing completed/assigned and completion %, plus a synthetic
  "Unassigned" row so the numbers always add up to the organization total.
  It renders nothing if the org has no assignments yet, rather than an
  empty chart.
- Deleting a department doesn't delete its members — `department_id` on
  their membership just reverts to null (`on delete set null`).
- Archiving keeps history (and reports) intact instead of deleting;
  restoring blocks on an active-name collision instead of silently merging
  two departments.

**Still deliberately deferred**, unchanged from migration 0048's list:
groups/teams as a layer distinct from departments, bulk CSV import, bulk
course assignment, a customer-facing course builder, and the 4-tier
feature-gating matrix. Departments alone doesn't need any of the missing
infrastructure (SCORM, video hosting, SSO/SCIM, a sending domain) those
depend on, which is why it was the first slice built.

## Real team invites (migration 0050 + `send-org-invite` edge function)

Team & Plan's "Multi-user team invites are on the roadmap" placeholder is
gone — an org admin (`has_org_permission(org, 'team', 'manage')`, same gate
as member-role editing and Departments) can now invite a specific email to
join as a specific role, and the invited person creates their own real
account and lands directly in that organization. Apply the migration the
same way as always, then deploy the new edge function once:

```bash
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD='<db password>' ./scripts/deploy.sh
npx supabase functions deploy send-org-invite
```

- **New "Invite a team member" panel** on Team & Plan: email + role →
  "+ Send invite" creates a real `org_invites` row with a random token and
  a 7-day expiry, then lists every invite (pending/accepted/expired/
  revoked) with **Email**, **Copy link**, and **Revoke** actions.
- **`send-org-invite`** sends the actual email via Resend, reusing the same
  `RESEND_API_KEY`/`ALERT_EMAIL_FROM` secrets already used for alert
  emails — if `RESEND_API_KEY` isn't set, it doesn't pretend to have sent
  anything: it returns the invite link and the UI copies it to the
  clipboard instead, exactly like `sendEmailAlert()` already degrades.
- **`handle_new_user()` is now invite-aware**: an email/password signup
  carrying a valid, unexpired, unaccepted invite token whose email matches
  the account being created joins that invite's organization with its
  role, instead of getting the fresh organization every other signup gets.
  The invite-accept page (`/invite/:token`, public) locks the email field
  to the invited address so this can't be redeemed by a different account
  than the one invited.
- **Google sign-in works too**, via a different mechanism: OAuth signups
  never carry the `options.data` payload the trigger reads a token from, so
  `/invite/:token`'s "Continue with Google" button stashes the token in
  `sessionStorage` before the redirect, and `loadProfile()`
  (`AuthContext.jsx`) redeems it right after a real session exists —
  covers both a brand-new Google signup (leaves the default org
  `handle_new_user()` just created) and an existing account signing in with
  Google to accept an invite.
- **An already-registered account can accept an invite by switching
  organizations**, not by joining a second one. Real simultaneous multi-org
  membership isn't built anywhere in this codebase — every org-scoped RPC
  resolves "my organization" as `memberships ... limit 1` — so
  `switch_organization_via_invite()` leaves whatever organization(s) the
  caller is currently in and joins the invited one instead (the old
  organization and its data are left intact, just with one fewer member;
  nothing is deleted). `/invite/:token` offers this as an explicit,
  confirmed "Switch to `<org>`?" action when the signed-in account's email
  matches the invite; if the emails don't match, it still shows a clear
  "log out and use that email" message rather than guessing.
- **Deliberately not built**: true multi-org membership (belonging to more
  than one organization at the same time) with an org switcher. That would
  mean retrofitting the "my organization" resolution in every org-scoped
  RPC across the codebase (monitors, hosts, assets, team, training,
  departments, invites, ...) plus a switcher UI — real, substantial,
  higher-regression-risk work on a live product, not something to fold
  into this pass.

## Google sign-in & CAPTCHA

Both ship wired up on the frontend and **need one-time setup on your side**
to actually activate:

**Google sign-in** (Login + Register, customer-facing only — the admin
portal stays password-only):
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
   create an OAuth 2.0 Client ID (Web application). Authorized redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`.
2. Supabase dashboard → Authentication → Providers → Google → paste the
   Client ID and Client Secret, enable the provider.

Nothing to change in this repo — `loginWithGoogle()` in `AuthContext.jsx`
just calls `supabase.auth.signInWithOAuth({ provider: "google" })`. Until
the provider is enabled, clicking the button shows a clear "Google sign-in
isn't set up yet" toast instead of failing silently.

**CAPTCHA**: every auth form (Login, Register, Admin Login, Forgot Password)
already has a working bot deterrent today — a honeypot field + a minimum-fill-time
check, paired with a visible "Verify you're human" challenge — no setup
required, no third-party account needed. It's a real client-side layer, but
it's not independently server-verified the way hCaptcha is.

To upgrade to real, server-verified hCaptcha:
1. Free site key + secret at [hcaptcha.com](https://www.hcaptcha.com).
2. Supabase dashboard → Authentication → Attack Protection → enable
   hCaptcha, paste the **secret** key.
3. Set `VITE_HCAPTCHA_SITE_KEY=<site key>` at frontend build time (see
   `frontend/.env.example`).

The real hCaptcha widget then replaces the built-in challenge automatically
— no code changes needed, `CaptchaChallenge.jsx` picks it up from the env var.

## Post-deploy smoke test

1. `https://<your-domain>/` — homepage loads, tech logos animate.
2. Register a Starter account → dashboard (plan defaults to **STARTER**, feature-gated).
3. Add a monitor:
   - **Website** tab — HTTP / Keyword / Status-Code checks.
   - **Network Devices** tab — TCP (routers, switches, firewalls, printers) and DNS.
   - First check lands within ~1 min (cron runs every minute).
4. `/admin/login` — super-admin (`babulearn57@gmail.com`) can manage customers, content, photos.
5. `curl https://<your-domain>/kada-nigrani-agent.sh | head` — agent downloadable.
6. **Self-serve upgrade (if Stripe is configured):** Pricing or Team → Professional/Business →
   "Upgrade with Card" redirects to Stripe Checkout; returning applies the plan automatically.
7. **Forgot password:** Login → "Forgot password?" → enter an email → check inbox for the reset
   link → set a new password → lands on the dashboard.
8. **Admin roles (after applying migration 0030):** grant a test account the `content_editor`
   role from All Users → log in as them → sidebar should show only Platform Overview, Content
   Manager, Site Visibility, and Audit Log.
9. **Reseller admin (after applying migration 0031):** grant a test account the `reseller` role →
   log in as them → sidebar shows only Platform Overview and Customers → provision a customer →
   it appears in their list with a working plan-change dropdown, but no Rename/Archive/Delete
   buttons → log back in as super-admin → confirm that same customer is visible in the full
   Customers list with `created_by` set to the reseller's user id.
10. **Dynamic RBAC (after applying migration 0032):** `/admin/roles` → confirm all 6 platform +
    9 org-system roles + 3 legacy roles list, and the grid for `platform_administrator` shows no
    Plan Limits access → clone a role, edit a couple of checkboxes, save, reopen it to confirm the
    grid persisted → in a test organization, Team → Team Members shows a role dropdown next to a
    non-self member (as the org's Organization Administrator) → change their role → confirm it
    saves and the badge updates → log in as that member → sidebar nav reflects only the modules
    their new role grants view access to.
11. **Reseller pipeline (after applying migration 0033):** submit a test application from `/partners`
    → log in as super-admin → `/admin/resellers` shows it as Pending → click "Create Account &
    Grant Access", set a password → confirm the application flips to Approved, the applicant now
    appears in All Users with a Reseller Admin badge, and they can log in with the password you set
    → back on All Users, confirm the org-role dropdown next to a different (non-reseller) user saves
    correctly.
12. **Command Center (after applying migration 0034):** `/admin` shows 8 stat tiles with real
    non-zero numbers where you have live data (e.g. Monitors Up/Down should match your actual
    monitors) → Product adoption bars reflect real licensing → if any test monitor has an SSL cert
    expiring within 14 days it appears under Security; otherwise "Nothing expiring soon" — either
    is correct, it's the same real query.
13. **CyberSachet Training & Certification (after applying migrations 0037, 0040–0044):** license
    a test org for CyberSachet (Customers → that org → products) → as a super-admin, assign a
    course to a member from that org's Customers detail page → log in as that member → `/training`
    shows it as "Assigned to you" → open it, answer each lesson's comprehension check correctly,
    then pass the end-of-course quiz → repeat for every published course → a "Claim your
    certificate" card appears → claim it → the certificate renders with a real QR code → scan it
    (or open `/verify/<certificate-no>` directly) → confirms VALID with the right name, org, and
    score.
14. **CyberSachet LMS upgrade (after applying migration 0045):** open a course as a licensed
    member → confirm lessons are grouped into two modules with their own progress bars and the
    sticky jump nav works → on the Phishing Awareness course, confirm the quiz includes a
    "select all that apply" question and an "arrange the steps" question, and that submitting
    grades them correctly → `/training`'s header shows real avg score/learning hours/streak/badge
    tiles → downgrade a test org to Starter → confirm it can fully complete Phishing Awareness and
    Password Security & MFA, and every other course shows a locked "Professional plan required"
    card → as that org's own Organization Administrator (not a platform admin), open **Team &
    Plan** → a **CyberSachet Training** panel appears → assign a course to a member, confirm it
    shows up on their `/training`, then reset that member's progress and confirm it clears →
    with two members having completed courses, confirm the team leaderboard on `/training` ranks
    them correctly.

## Self-serve payments (Stripe Checkout)

Paid upgrades (Professional, Business) are purchased by card through Stripe Checkout.
The plan is applied by a webhook, not trusted to the browser.

Set the secrets (values are never committed):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set STRIPE_PRICE_PROFESSIONAL=price_xxx
supabase secrets set STRIPE_PRICE_BUSINESS=price_xxx
supabase secrets set APP_URL=https://<your-domain>
```

Then register the webhook in the Stripe dashboard pointing at:

```
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

Events to send: `checkout.session.completed`.

If Stripe secrets are absent, the buttons degrade gracefully to a "contact sales" message,
so the app still works without payments configured. ENTERPRISE remains sales-led.

## Remediation runbooks (Kada Nigrani agent)

The agent can run a **fixed allowlist** of safe, named actions an org admin
requests from the Hosts page — never arbitrary shell.

**How it works**
1. In the app: **Hosts → a host → Runbooks → choose an action → Run.** This
   inserts an `approved` row in `host_commands` (via the `request_host_command`
   RPC, which checks org membership). Nothing runs yet.
2. On the server, the agent (started with `AGENT_ALLOW_ACTIONS=1`) polls the
   `agent-commands` edge function each cycle, authenticated by its per-host
   ingest key, and receives its approved actions.
3. The agent maps each `action_key` to a **hardcoded** command (the database
   never stores a raw command), runs it, and posts back the exit code + output.
4. The Runbooks panel shows the result live with a full audit trail.

**Allowlisted actions:** `ping`, `clear_temp` (safe) · `reload_nginx`,
`reload_apache`, `renew_ssl_certbot` (low) · `restart_service`,
`restart_docker_container` (medium).

**SSL renewal** (migration 0036) runs `certbot renew --quiet` on that host —
it renews certs already due and no-ops otherwise. This is deliberately the
only "SSL renewal" this platform offers: monitoring (`ssl_info`, the SSL
Certificates admin page) checks certs it has no domain-control access to
renew, since it's watching customer sites remotely. The agent already runs
on the customer's own server, so triggering their own already-installed
certbot is the honest, real integration point — it doesn't install or
configure certbot for them.

**Enable on a server** (opt-in — the default agent only reports metrics):
```bash
INGEST_URL=".../functions/v1/ingest-metrics" \
COMMANDS_URL=".../functions/v1/agent-commands" \
ANON_KEY="<anon>" AGENT_KEY="<host ingest key>" \
AGENT_ALLOW_ACTIONS=1 \
AGENT_ALLOWED_SERVICES="nginx apache2 docker" \   # only these may be restarted
/opt/kada-nigrani-agent.sh
```
Run it as a user with permission for the actions you enable (e.g. root or a
sudo-scoped service account). Omit `AGENT_ALLOW_ACTIONS` and the agent will
refuse all remediation and only stream metrics.
