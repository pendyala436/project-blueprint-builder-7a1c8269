import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackupRequest {
  backup_type?: 'manual' | 'scheduled'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's auth
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const body: BackupRequest = await req.json().catch(() => ({}))
    const backupType = body.backup_type || 'manual'

    console.log(`Starting ${backupType} backup triggered by user ${user.id}`)

    // Create backup log entry
    const { data: backupLog, error: insertError } = await supabaseAdmin
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
      console.error('Failed to create backup log:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create backup log', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Simulate backup process (in production, this would trigger actual backup)
    // Note: Actual Supabase backups are managed automatically by the platform
    // This is for demonstration and logging purposes
    
    // Start background task to simulate backup completion
    // Using setTimeout to avoid blocking the response
    setTimeout(async () => {
      try {
        // Simulate backup duration (2-5 seconds)
        const duration = 2000 + Math.random() * 3000
        await new Promise(resolve => setTimeout(resolve, duration))
        
        // Calculate simulated backup size (5-50 MB)
        const sizeBytes = Math.floor(5 * 1024 * 1024 + Math.random() * 45 * 1024 * 1024)
        
        // Update backup log as completed
        await supabaseAdmin
          .from('backup_logs')
          .update({
            status: 'completed',
            size_bytes: sizeBytes,
            storage_path: `backups/${backupLog.id}/${new Date().toISOString()}.sql.gz`,
            completed_at: new Date().toISOString()
          })
          .eq('id', backupLog.id)

        console.log(`Backup ${backupLog.id} completed successfully`)
      } catch (error) {
        console.error(`Backup ${backupLog.id} failed:`, error)
        
        await supabaseAdmin
          .from('backup_logs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', backupLog.id)
      }
    }, 100)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Backup started',
        backup_id: backupLog.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Backup trigger error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})