import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Content moderation patterns - multi-language sexual content blocking
const VIOLATION_PATTERNS = {
  sexual_content: [
    // English
    /\b(sex|nude[s]?|naked|porn|xxx|nsfw|erotic|orgasm|masturbat|blowjob|handjob|anal\s*sex|oral\s*sex|threesome|gangbang|fetish|bondage|bdsm|strip\s*tease|hookup|hook\s*up|booty\s*call|cum\s*shot|creampie|milf|dildo|vibrator|slutt?y?|whor[e]?)\b/gi,
    /\b(send\s*(me\s*)?(nudes?|pics?|photos?|body\s*pics?))\b/gi,
    /\b(show\s*(me\s*)?(your\s*)?(body|boobs?|tits?|ass|butt|privates?))\b/gi,
    /\b(let'?s?\s*(have\s*)?sex|wanna\s*(f[*]?ck|bang|smash|screw))\b/gi,
    /\b(horny|turned\s*on|get\s*laid|make\s*love|sleep\s*with\s*me)\b/gi,
    /\b(f[*\s]?u[*\s]?c[*\s]?k|d[*\s]?i[*\s]?c[*\s]?k|p[*\s]?u[*\s]?s[*\s]?s[*\s]?y|c[*\s]?o[*\s]?c[*\s]?k)\b/gi,
    // Hindi/Urdu (Romanized + Devanagari)
    /\b(chod|chud|lund|gaand|bhosdi|randi|chut|maderchod|behenchod|chudai|jhaant|muth|hilana)\b/gi,
    /\b(चोद|चूत|लंड|गांड|भोसडी|रंडी|चुदाई|मादरचोद|बहनचोद|मूठ|हिलाना)\b/g,
    // Tamil
    /\b(otha|thevdiya|pundai|sunni|oombu|koothi|myiru)\b/gi,
    /\b(ஓத்தா|தேவடியா|புண்டை|சுன்னி|ஊம்பு|கூதி)\b/g,
    // Telugu
    /\b(dengey|modda|gudda|lanja|pooku|sulli)\b/gi,
    /\b(దెంగేయ్|మొడ్డ|గుద్ద|లంజ|పూకు|సుల్లి)\b/g,
    // Bengali
    /\b(choda|baal|magir?|gud|dhon|magi|chudi)\b/gi,
    /\b(চোদা|বাল|মাগি|গুদ|ধোন|চুদি)\b/g,
    // Kannada
    /\b(tunne|tull|sule|bolimaga|ninge)\b/gi,
    /\b(ತುನ್ನೆ|ತುಳ್ಳ|ಸೂಳೆ|ಬೋಳಿಮಗ)\b/g,
    // Malayalam
    /\b(kunna|pooru|thendi|myiru|poorr)\b/gi,
    /\b(കുണ്ണ|പൂറ്|തെണ്ടി|മൈര്)\b/g,
    // Marathi
    /\b(zavadya|jhavla|madharchod|zhavne|randya)\b/gi,
    // Gujarati
    /\b(chodu|chodvu|gand|lodo|bhosad)\b/gi,
    // Punjabi
    /\b(lann|phuddi|kanjri|kutti)\b/gi,
    // Arabic
    /\b(kos|ayre|sharmouta|nikni|zobb|teezi|manyak|sharmoot)\b/gi,
    /\b(كس|زب|شرموطة|طيزي|منيك)\b/g,
    // Spanish
    /\b(puta|verga|coger|chingar|polla|follar|coño)\b/gi,
    // French
    /\b(putain|baise[r]?|salope|niquer|enculer|bite)\b/gi,
    // Portuguese
    /\b(foder|buceta|caralho|porra|safado)\b/gi,
    // Chinese
    /[操肏屌屄婊鸡巴逼骚淫荡]/g,
    // Korean
    /\b(씨발|존나|보지|자지|씹|좆)\b/g,
    // Indonesian
    /\b(kontol|memek|ngentot|pepek|jembut)\b/gi,
    // Turkish
    /\b(sik|amcık|orospu|götveren|sikis|yarrak)\b/gi,
    // Russian
    /\b(blyad|suka|huy|pizda|yebat|nahui)\b/gi,
    /\b(блядь|сука|хуй|пизда|ебать|нахуй)\b/g,
    // Thai
    /\b(เย็ด|หี|ควย)\b/g,
    // Vietnamese
    /\b(địt|lồn|cặc|đụ|đĩ)\b/gi,
    // German
    /\b(ficken|hurensohn|schlampe|schwanz|fotze|wichser)\b/gi,
    // Obfuscation
    /\b(s[3e]x|n[u0]d[3e]|p[o0]rn|fck|f[*#@]ck|d[!1]ck|p[*#@]ssy)\b/gi,
  ],
  harassment: [
    /\b(kill|die|hurt|harm|attack|threat)\s*(you|yourself|him|her|them)\b/gi,
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
