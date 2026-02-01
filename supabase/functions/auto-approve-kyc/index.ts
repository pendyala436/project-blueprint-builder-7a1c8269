/**
 * Auto Approve KYC Edge Function
 * 
 * Automatically approves pending KYC submissions every 5 minutes.
 * This runs as a scheduled cron job.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KYCRecord {
  id: string;
  user_id: string;
  full_name_as_per_bank: string | null;
  verification_status: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[Auto-Approve-KYC] Starting automatic KYC approval process...");

    // Fetch all pending KYC records
    const { data: pendingKYCs, error: fetchError } = await supabase
      .from("women_kyc")
      .select("id, user_id, full_name_as_per_bank, verification_status")
      .eq("verification_status", "pending");

    if (fetchError) {
      console.error("[Auto-Approve-KYC] Error fetching pending KYCs:", fetchError);
      throw fetchError;
    }

    if (!pendingKYCs || pendingKYCs.length === 0) {
      console.log("[Auto-Approve-KYC] No pending KYC records found.");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending KYC records to approve",
          approved_count: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Auto-Approve-KYC] Found ${pendingKYCs.length} pending KYC records.`);

    // Approve all pending KYC records
    const kycIds = pendingKYCs.map((kyc: KYCRecord) => kyc.id);
    const userIds = pendingKYCs.map((kyc: KYCRecord) => kyc.user_id);

    const { error: updateError } = await supabase
      .from("women_kyc")
      .update({
        verification_status: "approved",
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", kycIds);

    if (updateError) {
      console.error("[Auto-Approve-KYC] Error updating KYC records:", updateError);
      throw updateError;
    }

    // Also update the profiles to mark women as verified
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .in("user_id", userIds);

    if (profileError) {
      console.error("[Auto-Approve-KYC] Error updating profiles:", profileError);
      // Non-critical, continue
    }

    // Update female_profiles as well
    const { error: femaleProfileError } = await supabase
      .from("female_profiles")
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .in("user_id", userIds);

    if (femaleProfileError) {
      console.error("[Auto-Approve-KYC] Error updating female_profiles:", femaleProfileError);
      // Non-critical, continue
    }

    // Log approved users
    const approvedNames = pendingKYCs
      .map((kyc: KYCRecord) => kyc.full_name_as_per_bank || "Unknown")
      .join(", ");

    console.log(`[Auto-Approve-KYC] Successfully approved ${pendingKYCs.length} KYC records: ${approvedNames}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully approved ${pendingKYCs.length} KYC records`,
        approved_count: pendingKYCs.length,
        approved_user_ids: userIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Auto-Approve-KYC] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
