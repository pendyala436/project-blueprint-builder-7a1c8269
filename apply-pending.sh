#!/bin/bash
# =============================================================================
# Apply pending Supabase migrations locally
# Run: bash apply-pending.sh YOUR_DB_PASSWORD
# OR:  SUPABASE_DB_PASSWORD=xxx bash apply-pending.sh
# =============================================================================

DB_PASS="${1:-$SUPABASE_DB_PASSWORD}"
PROJECT_REF="tvneohngeraciplajzos"

if [ -z "$DB_PASS" ]; then
  echo "Usage: bash apply-pending.sh YOUR_DB_PASSWORD"
  echo "  DB password is at: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
  exit 1
fi

DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASS}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

echo "Applying 3 pending migrations..."

for f in \
  "supabase/migrations/20260313000001_wallet_only_half_rule_validation.sql" \
  "supabase/migrations/20260313100000_fix_transactions_statements_billing.sql" \
  "supabase/migrations/20260314000000_consistency_fix.sql"; do
  echo ""
  echo "→ Applying: $(basename $f)"
  psql "$DB_URL" -f "$f" 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ Done"
  else
    echo "❌ Failed — check error above"
    exit 1
  fi
done

echo ""
echo "✅ All 3 migrations applied successfully"
