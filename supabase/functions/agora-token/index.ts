// Agora RTC token-server edge function.
//
// Mints short-lived (1 hour) RTC tokens so the Flutter / web client never
// has to ship the Agora app certificate. Channel name = call_id (or
// group room id). UID = 0 lets Agora auto-assign.
//
// Required secrets: AGORA_APP_ID, AGORA_APP_CERTIFICATE
// (Add via Lovable secrets — never commit them.)
//
// Endpoint: POST { channel: string, uid?: number, role?: 'publisher'|'subscriber' }
// Response: { token: string, app_id: string, channel: string, uid: number, expires_at: number }

import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { RtcTokenBuilder, RtcRole } from "https://esm.sh/agora-token@2.0.5";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  channel: z.string().min(1).max(64),
  uid: z.number().int().min(0).max(2_147_483_647).optional().default(0),
  role: z.enum(["publisher", "subscriber"]).optional().default("publisher"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: only signed-in users may mint tokens.
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return json({ error: "unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const appId = Deno.env.get("AGORA_APP_ID");
    const appCert = Deno.env.get("AGORA_APP_CERTIFICATE");
    if (!appId || !appCert) {
      return json({ error: "agora_not_configured" }, 500);
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { channel, uid, role } = parsed.data;

    const expireSec = 60 * 60; // 1 hour
    const privilegeExpireTs = Math.floor(Date.now() / 1000) + expireSec;
    const rtcRole = role === "publisher"
      ? RtcRole.PUBLISHER
      : RtcRole.SUBSCRIBER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCert,
      channel,
      uid,
      rtcRole,
      privilegeExpireTs,
      privilegeExpireTs,
    );

    return json({
      token,
      app_id: appId,
      channel,
      uid,
      expires_at: privilegeExpireTs,
    });
  } catch (e) {
    console.error("[agora-token] error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
