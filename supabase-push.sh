#!/bin/bash
# Push migrations using Supabase CLI
# Prerequisites: npm install -g supabase  OR  brew install supabase/tap/supabase

SUPABASE_ACCESS_TOKEN="YOUR_SUPABASE_ACCESS_TOKEN"  # Get from supabase.com/dashboard/account/tokens
PROJECT_REF="tvneohngeracipjajzos"

echo "Linking project..."
supabase login --token "$SUPABASE_ACCESS_TOKEN"
supabase link --project-ref "$PROJECT_REF"

echo "Pushing migrations..."
supabase db push

echo "Done!"
