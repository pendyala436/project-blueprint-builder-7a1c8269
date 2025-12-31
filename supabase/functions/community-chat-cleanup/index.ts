import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: groups } = await supabase
      .from("private_groups")
      .select("id")
      .like("name", "language_community_%");

    if (!groups || groups.length === 0) {
      return new Response(
        JSON.stringify({ message: "No community groups found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groupIds = groups.map(g => g.id);
    
    const { data: deletedMessages } = await supabase
      .from("group_messages")
      .delete()
      .in("group_id", groupIds)
      .lt("created_at", twoDaysAgo.toISOString())
      .select("id");

    return new Response(
      JSON.stringify({ success: true, deletedCount: deletedMessages?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
