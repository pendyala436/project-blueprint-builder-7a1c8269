import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface BackupRequest {
  backup_type?: 'manual' | 'scheduled'
}

const BACKUP_TABLES = [
  'profiles', 'male_profiles', 'female_profiles', 'user_roles',
  'chat_messages', 'active_chat_sessions', 'matches',
  'ledger_transactions', 'gift_transactions', 'gifts',
  'chat_pricing', 'language_groups', 'language_limits',
  'admin_settings', 'app_settings', 'legal_documents',
  'moderation_reports', 'audit_logs', 'backup_logs',
  'notifications', 'women_kyc', 'withdrawal_requests',
  'golden_badge_subscriptions', 'attendance', 'absence_records',
  'private_groups', 'group_memberships', 'group_messages',
  'community_announcements', 'community_disputes',
  'admin_broadcast_messages', 'admin_user_messages',
  'monthly_statements', 'monthly_wallet_summary',
  'admin_revenue_transactions', 'chat_wait_queue',
  'language_community_messages', 'group_video_access',
  'platform_metrics', 'policy_violation_alerts',
  'user_status',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || supabaseServiceKey
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: BackupRequest = await req.json().catch(() => ({}))
    const backupType = body.backup_type || 'manual'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    console.log(`Starting ${backupType} backup triggered by ${user.id}`)

    // Create backup log entry
    const { data: backupLog, error: insertError } = await adminClient
      .from('backup_logs')
      .insert({
        backup_type: backupType,
        status: 'in_progress',
        triggered_by: user.id,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create backup log', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Respond immediately, then run backup in background
    const responsePromise = new Response(
      JSON.stringify({ success: true, message: 'Backup started', backup_id: backupLog.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    // Run backup in background using waitUntil pattern
    const backupPromise = (async () => {
      try {
        const backupData: Record<string, unknown[]> = {}
        const errors: string[] = []
        let totalRows = 0

        // Export each table (up to 10000 rows per table using service role)
        for (const table of BACKUP_TABLES) {
          try {
            const { data, error } = await adminClient
              .from(table)
              .select('*')
              .limit(10000)

            if (error) {
              errors.push(`${table}: ${error.message}`)
              console.warn(`Skipping table ${table}: ${error.message}`)
            } else if (data) {
              backupData[table] = data
              totalRows += data.length
            }
          } catch (e) {
            errors.push(`${table}: ${e instanceof Error ? e.message : 'unknown'}`)
          }
        }

        // Build the backup payload
        const backupPayload = {
          backup_id: backupLog.id,
          backup_type: backupType,
          created_at: new Date().toISOString(),
          triggered_by: user.id,
          supabase_project_url: supabaseUrl,
          tables_exported: Object.keys(backupData).length,
          tables_failed: errors.length,
          total_rows: totalRows,
          errors: errors.length > 0 ? errors : undefined,
          data: backupData,
        }

        const jsonStr = JSON.stringify(backupPayload)
        const sizeBytes = new TextEncoder().encode(jsonStr).length
        const storagePath = `backups/${timestamp}_${backupLog.id}.json`

        // Try to upload to Supabase Storage (bucket: backups)
        let uploadSuccess = false
        try {
          // Ensure bucket exists
          await adminClient.storage.createBucket('backups', {
            public: false,
            allowedMimeTypes: ['application/json'],
            fileSizeLimit: 500 * 1024 * 1024, // 500MB
          }).catch(() => {
            // Bucket may already exist, that's fine
          })

          const { error: uploadError } = await adminClient.storage
            .from('backups')
            .upload(storagePath, jsonStr, {
              contentType: 'application/json',
              upsert: true,
            })

          if (uploadError) {
            console.error('Storage upload failed:', uploadError.message)
          } else {
            uploadSuccess = true
          }
        } catch (storageErr) {
          console.error('Storage error:', storageErr)
        }

        // Update backup log as completed
        await adminClient
          .from('backup_logs')
          .update({
            status: 'completed',
            size_bytes: sizeBytes,
            storage_path: uploadSuccess ? storagePath : null,
            completed_at: new Date().toISOString(),
            error_message: errors.length > 0
              ? `${Object.keys(backupData).length} tables exported, ${errors.length} skipped`
              : null,
          })
          .eq('id', backupLog.id)

        console.log(`Backup ${backupLog.id} completed: ${Object.keys(backupData).length} tables, ${totalRows} rows, ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`)
      } catch (error) {
        console.error(`Backup ${backupLog.id} failed:`, error)
        await adminClient
          .from('backup_logs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', backupLog.id)
      }
    })()

    // Use EdgeRuntime waitUntil if available, otherwise fire-and-forget
    if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
      (globalThis as any).EdgeRuntime.waitUntil(backupPromise)
    }

    return responsePromise
  } catch (error) {
    console.error('Backup trigger error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
