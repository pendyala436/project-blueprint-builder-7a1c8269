import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Content moderation patterns
const VIOLATION_PATTERNS = {
  sexual_content: [
    /\b(sex|nude|naked|porn|xxx|nsfw|erotic|intimate|hookup)\b/gi,
    /\b(send\s*(me\s*)?(nudes?|pics?|photos?))\b/gi,
    /\b(whatsapp|telegram|signal)\s*number/gi,
  ],
  harassment: [
    /\b(kill|die|hurt|harm|attack|threat)\s*(you|yourself|him|her|them)\b/gi,
    /\b(stupid|idiot|moron|dumb|retard)\b/gi,
  ],
  hate_speech: [
    /\b(hate|racist|sexist)\b/gi,
  ],
  spam: [
    /\b(buy\s*now|click\s*here|free\s*money|earn\s*\$|bitcoin|crypto\s*investment)\b/gi,
    /(https?:\/\/[^\s]+){3,}/gi,
  ],
  scam: [
    /\b(send\s*money|wire\s*transfer|western\s*union|gift\s*card|pay\s*me)\b/gi,
    /\b(bank\s*account|credit\s*card\s*number|ssn|social\s*security)\b/gi,
  ],
  contact_sharing: [
    /\b(\+?\d{10,15})\b/g,
    /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi,
    /\b(instagram|snapchat|tiktok|facebook|whatsapp|telegram)[\s:@]*[\w.-]+\b/gi,
  ],
};

interface ModerationResult {
  isViolation: boolean;
  violations: Array<{
    type: string;
    severity: string;
    matchedContent: string;
  }>;
}

function moderateContent(content: string): ModerationResult {
  const violations: ModerationResult["violations"] = [];
  
  for (const [violationType, patterns] of Object.entries(VIOLATION_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        let severity = "medium";
        if (violationType === "sexual_content" || violationType === "harassment") {
          severity = "high";
        } else if (violationType === "hate_speech") {
          severity = "critical";
        } else if (violationType === "contact_sharing") {
          severity = "low";
        }
        
        violations.push({
          type: violationType,
          severity,
          matchedContent: matches.slice(0, 3).join(", "),
        });
        break; // Only one match per violation type
      }
    }
  }

  return {
    isViolation: violations.length > 0,
    violations,
  };
}

// Helper to verify authenticated user
async function verifyAuth(req: Request, supabase: any): Promise<{ isValid: boolean; error?: string; userId?: string; isAdmin?: boolean }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { isValid: false, error: 'Invalid or expired token' };
  }

  // Check if user has admin role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  return { isValid: true, userId: user.id, isAdmin: !!roleData };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Verify caller is authenticated
    const authResult = await verifyAuth(req, supabase);
    if (!authResult.isValid) {
      console.log(`[SECURITY] Unauthorized access to content-moderation: ${authResult.error}`);
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, messageId, chatId, content, userId } = await req.json();
    
    // For batch scan, require admin role
    if (action === "scan_recent_messages" && !authResult.isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin role required for batch scan" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AUDIT] User ${authResult.userId} called content-moderation action: ${action}`);

    if (action === "moderate_message") {
      // Moderate a single message
      const result = moderateContent(content || "");

      if (result.isViolation) {
        // Create alerts for each violation
        for (const violation of result.violations) {
          await supabase.from("policy_violation_alerts").insert({
            user_id: userId,
            violation_type: violation.type,
            severity: violation.severity,
            content: content?.substring(0, 500),
            source_message_id: messageId,
            source_chat_id: chatId,
            detected_by: "auto_moderation",
          });
        }

        // Flag the message
        if (messageId) {
          await supabase
            .from("chat_messages")
            .update({
              flagged: true,
              flag_reason: result.violations.map(v => v.type).join(", "),
              flagged_at: new Date().toISOString(),
              moderation_status: "flagged",
            })
            .eq("id", messageId);
        }

        console.log(`Message flagged for violations: ${result.violations.map(v => v.type).join(", ")}`);
      }

      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "scan_recent_messages") {
      // Scan recent messages for violations
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("id, message, sender_id, chat_id, created_at")
        .eq("flagged", false)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      let flaggedCount = 0;
      for (const msg of messages || []) {
        const result = moderateContent(msg.message || "");
        
        if (result.isViolation) {
          for (const violation of result.violations) {
            await supabase.from("policy_violation_alerts").insert({
              user_id: msg.sender_id,
              violation_type: violation.type,
              severity: violation.severity,
              content: msg.message?.substring(0, 500),
              source_message_id: msg.id,
              source_chat_id: msg.chat_id,
              detected_by: "batch_scan",
            });
          }

          await supabase
            .from("chat_messages")
            .update({
              flagged: true,
              flag_reason: result.violations.map(v => v.type).join(", "),
              flagged_at: new Date().toISOString(),
              moderation_status: "flagged",
            })
            .eq("id", msg.id);

          flaggedCount++;
        }
      }

      console.log(`Batch scan complete: ${flaggedCount} messages flagged out of ${messages?.length || 0}`);

      return new Response(
        JSON.stringify({ success: true, scanned: messages?.length || 0, flagged: flaggedCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Content moderation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
