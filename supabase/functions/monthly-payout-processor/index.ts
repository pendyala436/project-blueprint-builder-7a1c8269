// Monthly Wallet & Payout Processor
// Runs daily via cron at 00:00 IST (= 18:30 UTC previous day).
// Only executes the monthly cycle if today (in IST) is the 1st.
// Spec: capture women payouts from KYC (single source of truth), reset wallets, generate men's carry-forward statements.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Parse request to allow ?force=true for manual admin triggers
    const url = new URL(req.url);
    const force =
      url.searchParams.get("force") === "true" ||
      (req.headers.get("x-force-run") === "true");

    // Compute today's date in IST
    const istNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    const istDay = istNow.getDate();

    if (!force && istDay !== 1) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: `Not the 1st of month in IST (today is ${istDay})`,
          ist_date: istNow.toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Run the canonical monthly payout RPC
    const { data, error } = await supabase.rpc("process_monthly_payout");

    if (error) {
      console.error("[monthly-payout-processor] RPC error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    console.log("[monthly-payout-processor] Success:", JSON.stringify(data));

    return new Response(
      JSON.stringify({ success: true, result: data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (e) {
    console.error("[monthly-payout-processor] Fatal error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : String(e),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
