import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResultItem {
  email: string
  status: string
  userId?: string
}

interface ErrorItem {
  email: string
  error: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const password = 'Chinn@2589'
    const results: { females: ResultItem[], males: ResultItem[], admins: ResultItem[], errors: ErrorItem[] } = { 
      females: [], 
      males: [], 
      admins: [], 
      errors: [] 
    }

    // Create female super users (1-15)
    for (let i = 1; i <= 15; i++) {
      const email = `female${i}@meow-meow.com`
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: `Female User ${i}`, gender: 'female' }
        })

        if (authError) {
          if (authError.message.includes('already been registered')) {
            results.females.push({ email, status: 'already exists' })
          } else {
            results.errors.push({ email, error: authError.message })
          }
          continue
        }

        const userId = authData.user.id

        // Create profile
        await supabase.from('profiles').upsert({
          user_id: userId,
          full_name: `Female User ${i}`,
          gender: 'female',
          country: 'India',
          primary_language: 'Hindi',
          preferred_language: 'hin_Deva',
          approval_status: 'approved',
          ai_approved: true,
          account_status: 'active',
          is_verified: true
        }, { onConflict: 'user_id' })

        // Create wallet with unlimited balance (999999999)
        await supabase.from('wallets').upsert({
          user_id: userId,
          balance: 999999999,
          currency: 'INR'
        }, { onConflict: 'user_id' })

        results.females.push({ email, status: 'created', userId })
      } catch (err) {
        results.errors.push({ email, error: String(err) })
      }
    }

    // Create male super users (1-15)
    for (let i = 1; i <= 15; i++) {
      const email = `male${i}@meow-meow.com`
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: `Male User ${i}`, gender: 'male' }
        })

        if (authError) {
          if (authError.message.includes('already been registered')) {
            results.males.push({ email, status: 'already exists' })
          } else {
            results.errors.push({ email, error: authError.message })
          }
          continue
        }

        const userId = authData.user.id

        await supabase.from('profiles').upsert({
          user_id: userId,
          full_name: `Male User ${i}`,
          gender: 'male',
          country: 'India',
          primary_language: 'Hindi',
          preferred_language: 'hin_Deva',
          approval_status: 'approved',
          ai_approved: true,
          account_status: 'active',
          is_verified: true
        }, { onConflict: 'user_id' })

        await supabase.from('wallets').upsert({
          user_id: userId,
          balance: 999999999,
          currency: 'INR'
        }, { onConflict: 'user_id' })

        results.males.push({ email, status: 'created', userId })
      } catch (err) {
        results.errors.push({ email, error: String(err) })
      }
    }

    // Create admin super users (1-15)
    for (let i = 1; i <= 15; i++) {
      const email = `admin${i}@meow-meow.com`
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: `Admin User ${i}`, gender: 'male' }
        })

        if (authError) {
          if (authError.message.includes('already been registered')) {
            results.admins.push({ email, status: 'already exists' })
          } else {
            results.errors.push({ email, error: authError.message })
          }
          continue
        }

        const userId = authData.user.id

        await supabase.from('profiles').upsert({
          user_id: userId,
          full_name: `Admin User ${i}`,
          gender: 'male',
          country: 'India',
          primary_language: 'English',
          preferred_language: 'eng_Latn',
          approval_status: 'approved',
          ai_approved: true,
          account_status: 'active',
          is_verified: true
        }, { onConflict: 'user_id' })

        await supabase.from('wallets').upsert({
          user_id: userId,
          balance: 999999999,
          currency: 'INR'
        }, { onConflict: 'user_id' })

        // Add admin role
        await supabase.from('user_roles').upsert({
          user_id: userId,
          role: 'admin'
        }, { onConflict: 'user_id,role' })

        results.admins.push({ email, status: 'created', userId })
      } catch (err) {
        results.errors.push({ email, error: String(err) })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Super users seeded successfully',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
