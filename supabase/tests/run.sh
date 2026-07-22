#!/bin/bash
# Real, repeatable regression suite for the RBAC/product-licensing core —
# the highest-risk area in this codebase (access control) and, until this
# suite existed, the one with zero automated coverage.
#
# Runs the ACTUAL migration files against a disposable Postgres container
# (not a reimplementation of the logic) plus a minimal fixture standing in
# for exactly the two tables (organizations, memberships) and the auth
# schema that predate everything under test. If a future migration change
# breaks a real security boundary — plan-tier enforcement, product
# licensing, self-removal, least-privilege role grants — this fails loudly
# instead of silently, the same class of bug this suite would have caught
# in migrations 0077 and 0082 before they ever reached production.
#
# Requires: podman or docker, psql. Safe to run repeatedly — the container
# is disposable and torn down at the end regardless of outcome.
set -uo pipefail

ENGINE=$(command -v podman || command -v docker)
if [ -z "$ENGINE" ]; then echo "Need podman or docker installed."; exit 1; fi

TESTDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGDIR="$TESTDIR/../migrations"
CONTAINER=itops-rbac-test-$$
CONN="postgresql://postgres:test@localhost:15499/postgres"

cleanup() { "$ENGINE" rm -f "$CONTAINER" >/dev/null 2>&1; }
trap cleanup EXIT

echo "Starting disposable Postgres..."
"$ENGINE" run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=test -p 15499:5432 postgres:16 >/dev/null
for i in $(seq 1 20); do
  "$ENGINE" exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

echo "Loading fixture..."
psql "$CONN" -v ON_ERROR_STOP=1 -f "$TESTDIR/fixture.sql" >/dev/null || { echo "Fixture failed to load"; exit 1; }

# The real migrations that define the RBAC/licensing/training engine under
# test, in dependency order. Not the full 91-file history — the rest
# (monitoring, DNS, SEO, etc.) don't touch access control and would only
# add unrelated stub work without adding coverage for what this suite
# checks.
MIGRATIONS=(
  0006_platform_admin.sql
  0028_audit_log.sql
  0029_products_and_subscriptions.sql
  0030_admin_roles.sql
  0032_dynamic_rbac.sql
  0037_cybersachet_training.sql
  0041_cybersachet_assignments.sql
  0042_cybersachet_lesson_checks.sql
  0044_cybersachet_certificates.sql
  0045_cybersachet_lms_upgrade.sql
  0046_cybersachet_course_certificates.sql
  0048_cybersachet_certificate_hash.sql
  0049_departments.sql
  0051_pgcrypto_search_path_fix.sql
  0054_cybersachet_content_license_gate.sql
  0063_teams_within_departments.sql
  0071_cybersachet_course_plan_tiers.sql
  0072_academy_track_and_dashboard.sql
  0077_assignments_track_visibility.sql
  0081_bulk_group_course_assignment.sql
  0082_academy_analytics_extended.sql
  0083_platform_instructor_role.sql
  0086_docker_course_expansion.sql
  0087_training_manager_role.sql
  0089_remove_organization_member.sql
  0090_org_academy_admin_dashboard.sql
  0091_split_academy_cybersachet_products.sql
)

for m in "${MIGRATIONS[@]}"; do
  # 0086 expands an existing "Docker & Container Fundamentals" course that
  # real migration 0078 (content-only, not RBAC-relevant, deliberately not
  # replayed here) originally created. Seed just enough of that real course
  # shape — the row and two named modules 0086 looks up by slug/title — so
  # its actual DML runs against real data instead of erroring on a missing
  # dependency this suite intentionally scoped out.
  if [ "$m" = "0086_docker_course_expansion.sql" ]; then
    psql "$CONN" -v ON_ERROR_STOP=1 -c "
      insert into cybersachet_courses (slug, title, track) values ('docker-and-container-fundamentals', 'Docker & Container Fundamentals', 'academy');
      insert into cybersachet_modules (course_id, title, sort_order)
        select id, 'Why Containers', 0 from cybersachet_courses where slug = 'docker-and-container-fundamentals';
      insert into cybersachet_modules (course_id, title, sort_order)
        select id, 'Working With Docker Day to Day', 1 from cybersachet_courses where slug = 'docker-and-container-fundamentals';
    " >/dev/null || { echo "Pre-0086 Docker course seed failed"; exit 1; }
  fi

  echo "Applying $m..."
  out=$(psql "$CONN" -v ON_ERROR_STOP=1 -f "$MIGDIR/$m" 2>&1)
  if [ $? -ne 0 ]; then
    echo "MIGRATION FAILED: $m"
    echo "$out" | tail -20
    exit 1
  fi
done

echo "Seeding test data..."
psql "$CONN" -v ON_ERROR_STOP=1 -f "$TESTDIR/seed.sql" >/dev/null || { echo "Seed failed"; exit 1; }

echo "Running assertions..."
psql "$CONN" -v ON_ERROR_STOP=1 -f "$TESTDIR/assertions.sql"
result=$?

if [ $result -eq 0 ]; then
  echo ""
  echo "ALL RBAC/LICENSING TESTS PASSED"
else
  echo ""
  echo "TEST FAILURE — see above"
fi
exit $result
