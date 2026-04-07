/**
 * payout-snapshot Edge Function
 * Called by pg_cron or admin to capture women's payout snapshots.
 * Supports: capture snapshot, reset wallets after snapshot
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: allow service role (cron) or admin user
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const isCron = token === serviceKey || token === anonKey;

    if (!isCron) {
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await authClient.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: role } = await supabase.from("user_roles")
        .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!role) {
        return new Response(JSON.stringify({ success: false, error: "Admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { action, snapshot_type } = body;

    // Action: reset wallets after snapshot
    if (action === "reset_wallets") {
      const { data, error } = await supabase.rpc("reset_women_wallets_after_snapshot");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, result: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Determine IST date
    const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const istDay = istNow.getDate();
    const istMonth = istNow.getMonth();
    const istYear = istNow.getFullYear();

    let snapshotType = snapshot_type;
    if (!snapshotType) {
      const lastDayOfMonth = new Date(istYear, istMonth + 1, 0).getDate();
      if (istDay === 15) snapshotType = "mid_month";
      else if (istDay === lastDayOfMonth) snapshotType = "end_month";
      else {
        return new Response(JSON.stringify({
          success: false, error: "Not a snapshot day",
          ist_day: istDay, hint: "Only runs on 15th or last day of month IST",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data, error } = await supabase.rpc("capture_payout_snapshot", {
      p_snapshot_type: snapshotType,
    });
    if (error) throw error;

    console.log(`[PAYOUT-SNAPSHOT] ${snapshotType}: ${JSON.stringify(data)}`);
    return new Response(JSON.stringify({ success: true, result: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PAYOUT-SNAPSHOT] Error:", message);
    return new Response(JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
