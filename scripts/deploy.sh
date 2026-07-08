#!/usr/bin/env bash
# One-shot deploy for the staged backend work:
#   - migrations 0010 (check types + status pages), 0011 (content), 0012 (Kada Nigrani)
#   - edge functions: run-due-checks (updated), ingest-metrics (new), admin-manage-users (new)
#
# Prereqs (get these from your Supabase project — nothing here is stored in the repo):
#   SUPABASE_ACCESS_TOKEN   from https://supabase.com/dashboard/account/tokens
#   SUPABASE_DB_PASSWORD    your project's database password
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_DB_PASSWORD='your-db-pass' ./scripts/deploy.sh
set -euo pipefail

PROJECT_REF="ayzsuxmmnbtsylqdenna"

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)}"
: "${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD (your project database password)}"

cd "$(dirname "$0")/.."

echo "==> Linking project $PROJECT_REF"
npx supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "==> Pushing database migrations (0010, 0011, 0012)"
npx supabase db push --password "$SUPABASE_DB_PASSWORD"

echo "==> Deploying edge functions"
npx supabase functions deploy run-due-checks
npx supabase functions deploy ingest-metrics
npx supabase functions deploy admin-manage-users
npx supabase functions deploy create-checkout
npx supabase functions deploy stripe-webhook

echo "==> Done. New check types, public status pages, Kada Nigrani host monitoring,"
echo "    admin add/remove users, and self-serve Stripe upgrades are now live."
