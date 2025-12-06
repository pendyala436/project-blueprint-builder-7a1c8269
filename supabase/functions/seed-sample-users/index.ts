/**
 * seed-sample-users Edge Function
 * Creates sample auth users with profiles, wallets, and roles.
 * - male1-15, female1-15, admin1-15
 * - Password: Chinn@2589
 * - Wallets with free balance (no recharge required)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserToCreate {
  email: string;
  password: string;
  gender: "male" | "female";
  role: "user" | "admin";
  name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const password = "Chinn@2589";
    const usersToCreate: UserToCreate[] = [];

    // Generate male users (male1 to male15)
    for (let i = 1; i <= 15; i++) {
      usersToCreate.push({
        email: `male${i}@sample.meow.app`,
        password,
        gender: "male",
        role: "user",
        name: `Sample Male ${i}`,
      });
    }

    // Generate female users (female1 to female15)
    for (let i = 1; i <= 15; i++) {
      usersToCreate.push({
        email: `female${i}@sample.meow.app`,
        password,
        gender: "female",
        role: "user",
        name: `Sample Female ${i}`,
      });
    }

    // Generate admin users (admin1 to admin15)
    for (let i = 1; i <= 15; i++) {
      usersToCreate.push({
        email: `admin${i}@sample.meow.app`,
        password,
        gender: i % 2 === 0 ? "female" : "male",
        role: "admin",
        name: `Admin User ${i}`,
      });
    }

    const results = {
      created: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    for (const user of usersToCreate) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u) => u.email === user.email);

        if (existingUser) {
          results.skipped.push(user.email);
          continue;
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm email
        });

        if (authError) {
          results.errors.push(`${user.email}: ${authError.message}`);
          continue;
        }

        const userId = authData.user.id;

        // Create profile
        const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
          user_id: userId,
          full_name: user.name,
          gender: user.gender,
          age: 25 + Math.floor(Math.random() * 10),
          country: "IN",
          state: "Maharashtra",
          bio: `I am ${user.name}, a sample user for testing.`,
          verification_status: true,
          is_verified: true,
          profile_completeness: 100,
        });

        if (profileError) {
          console.error(`Profile error for ${user.email}:`, profileError);
        }

        // Create wallet with free balance (10000 INR)
        const { data: walletData, error: walletError } = await supabaseAdmin
          .from("wallets")
          .upsert({
            user_id: userId,
            balance: 10000,
            currency: "INR",
          })
          .select()
          .single();

        if (walletError) {
          console.error(`Wallet error for ${user.email}:`, walletError);
        }

        // Add initial wallet transaction for the free credits
        if (walletData) {
          await supabaseAdmin.from("wallet_transactions").insert({
            wallet_id: walletData.id,
            user_id: userId,
            amount: 10000,
            type: "credit",
            status: "completed",
            description: "Sample user initial credits - No recharge required",
          });
        }

        // Create user status
        await supabaseAdmin.from("user_status").upsert({
          user_id: userId,
          is_online: false,
          status_text: "Available",
        });

        // If admin, add admin role
        if (user.role === "admin") {
          const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
            user_id: userId,
            role: "admin",
          });

          if (roleError) {
            console.error(`Role error for ${user.email}:`, roleError);
          }
        }

        results.created.push(user.email);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`${user.email}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sample users seeding completed",
        results,
        summary: {
          total: usersToCreate.length,
          created: results.created.length,
          skipped: results.skipped.length,
          errors: results.errors.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Seed error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
