import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { action, email, phone, newPassword } = await req.json();

    if (action === "verify") {
      // Verify email + phone combination exists
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("phone", phone);

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        return new Response(
          JSON.stringify({ verified: false, message: "Error looking up profile" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      if (!profiles || profiles.length === 0) {
        return new Response(
          JSON.stringify({ verified: false, message: "No account found with this phone number" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Check if any of these user_ids have matching email
      for (const profile of profiles) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
          profile.user_id
        );

        if (!userError && userData?.user?.email?.toLowerCase() === email.toLowerCase()) {
          return new Response(
            JSON.stringify({ verified: true, message: "Identity verified" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      }

      return new Response(
        JSON.stringify({ verified: false, message: "Email and phone number do not match" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "reset") {
      // First verify the email + phone combination again
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("phone", phone);

      if (profileError || !profiles || profiles.length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: "Verification failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Find the user with matching email
      let targetUserId: string | null = null;

      for (const profile of profiles) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
          profile.user_id
        );

        if (!userError && userData?.user?.email?.toLowerCase() === email.toLowerCase()) {
          targetUserId = profile.user_id;
          break;
        }
      }

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ success: false, message: "Email and phone number do not match" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Update the user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password update error:", updateError);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to update password" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Password reset successful" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
