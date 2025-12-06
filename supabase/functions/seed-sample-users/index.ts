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
  gender: string;
  role: "user" | "admin";
  name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting sample users seeding...");

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
        email: `male${i}@meow-meow.com`,
        password,
        gender: "male",
        role: "user",
        name: `Test Male ${i}`,
      });
    }

    // Generate female users (female1 to female15)
    for (let i = 1; i <= 15; i++) {
      usersToCreate.push({
        email: `female${i}@meow-meow.com`,
        password,
        gender: "female",
        role: "user",
        name: `Test Female ${i}`,
      });
    }

    // Generate admin users (admin1 to admin15)
    for (let i = 1; i <= 15; i++) {
      usersToCreate.push({
        email: `admin${i}@meow-meow.com`,
        password,
        gender: i % 2 === 0 ? "female" : "male",
        role: "admin",
        name: `Admin User ${i}`,
      });
    }

    console.log(`Total users to create: ${usersToCreate.length}`);

    const results = {
      created: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    for (const user of usersToCreate) {
      try {
        // Check if user already exists by email
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u) => u.email === user.email);

        if (existingUser) {
          console.log(`Skipping existing user: ${user.email}`);
          results.skipped.push(user.email);
          continue;
        }

        console.log(`Creating user: ${user.email}`);

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm email
        });

        if (authError) {
          console.error(`Auth error for ${user.email}:`, authError.message);
          results.errors.push(`${user.email}: ${authError.message}`);
          continue;
        }

        const userId = authData.user.id;
        console.log(`Created auth user ${user.email} with ID: ${userId}`);

        // Create profile
        const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
          user_id: userId,
          full_name: user.name,
          gender: user.gender,
          age: 25 + Math.floor(Math.random() * 10),
          country: "IN",
          state: "Maharashtra",
          bio: `I am ${user.name}, a test user for development.`,
          verification_status: true,
          is_verified: true,
          profile_completeness: 100,
        });

        if (profileError) {
          console.error(`Profile error for ${user.email}:`, profileError.message);
        }

        // Create wallet with free balance (10000 INR - no recharge required)
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
          console.error(`Wallet error for ${user.email}:`, walletError.message);
        }

        // Add initial wallet transaction for the free credits
        if (walletData) {
          await supabaseAdmin.from("wallet_transactions").insert({
            wallet_id: walletData.id,
            user_id: userId,
            amount: 10000,
            type: "credit",
            status: "completed",
            description: "Test account - Free credits (no recharge required)",
          });
        }

        // Create user status
        await supabaseAdmin.from("user_status").upsert({
          user_id: userId,
          is_online: false,
          status_text: "Available",
        });

        // Create user settings
        await supabaseAdmin.from("user_settings").upsert({
          user_id: userId,
          theme: "system",
          language: "English",
          notification_messages: true,
          notification_matches: true,
        });

        // If admin, add admin role
        if (user.role === "admin") {
          const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
            user_id: userId,
            role: "admin",
          });

          if (roleError) {
            console.error(`Role error for ${user.email}:`, roleError.message);
          } else {
            console.log(`Added admin role for ${user.email}`);
          }
        }

        results.created.push(user.email);
        console.log(`Successfully created: ${user.email}`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error creating ${user.email}:`, errorMessage);
        results.errors.push(`${user.email}: ${errorMessage}`);
      }
    }

    console.log("Seeding completed. Summary:", {
      total: usersToCreate.length,
      created: results.created.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
    });

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
        credentials: {
          password: "Chinn@2589",
          walletBalance: "₹10,000 (free - no recharge required)",
          categories: [
            "male1-15@meow-meow.com",
            "female1-15@meow-meow.com",
            "admin1-15@meow-meow.com",
          ],
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
