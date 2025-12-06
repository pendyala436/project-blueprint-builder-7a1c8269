import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (resets on function cold start)
// For production, consider using Redis or database-based rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count, resetIn: entry.resetAt - now };
}

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Input validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 255 && emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-]{8,20}$/;
  return typeof phone === 'string' && phoneRegex.test(phone);
}

function validatePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

// Generic error response to prevent enumeration
const GENERIC_VERIFY_RESPONSE = { verified: false, message: "Unable to verify identity" };
const GENERIC_RESET_RESPONSE = { success: false, message: "Unable to reset password" };

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    const { action, email, phone, newPassword } = body;

    // Validate action
    if (!action || !['verify', 'reset', 'get-email-by-phone'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // For get-email-by-phone, only phone is required
    if (action === 'get-email-by-phone') {
      if (!phone || !validatePhone(phone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    } else {
      // Validate inputs for verify and reset
      if (!email || !validateEmail(email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!phone || !validatePhone(phone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    // Rate limit by IP + email combination
    const rateLimitKey = `${clientIP}:${email.toLowerCase()}`;
    const rateCheck = checkRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      console.log(`Rate limit exceeded for ${rateLimitKey}`);
      return new Response(
        JSON.stringify({ 
          error: "Too many attempts. Please try again later.",
          retryAfter: Math.ceil(rateCheck.resetIn / 1000)
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000))
          }, 
          status: 429 
        }
      );
    }

    // Handle get-email-by-phone action for phone login
    if (action === "get-email-by-phone") {
      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("phone", phone);

      if (profileError || !profiles || profiles.length === 0) {
        return new Response(
          JSON.stringify({ error: "Account not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Get the first matching profile's email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
        profiles[0].user_id
      );

      if (userError || !userData?.user?.email) {
        return new Response(
          JSON.stringify({ error: "Could not retrieve account information" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ email: userData.user.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "verify") {
      // Add artificial delay to prevent timing attacks (200-400ms random)
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));

      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("phone", phone);

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        // Return generic error to prevent enumeration
        return new Response(
          JSON.stringify(GENERIC_VERIFY_RESPONSE),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      if (!profiles || profiles.length === 0) {
        // Return same response as email mismatch to prevent enumeration
        return new Response(
          JSON.stringify(GENERIC_VERIFY_RESPONSE),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Check if any of these user_ids have matching email
      for (const profile of profiles) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
          profile.user_id
        );

        if (!userError && userData?.user?.email) {
          // Use constant-time comparison
          if (constantTimeCompare(userData.user.email.toLowerCase(), email.toLowerCase())) {
            return new Response(
              JSON.stringify({ verified: true, message: "Identity verified" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          }
        }
      }

      return new Response(
        JSON.stringify(GENERIC_VERIFY_RESPONSE),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "reset") {
      // Validate password
      if (!newPassword || !validatePassword(newPassword)) {
        return new Response(
          JSON.stringify({ error: "Password must be between 8 and 128 characters" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));

      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("phone", phone);

      if (profileError || !profiles || profiles.length === 0) {
        return new Response(
          JSON.stringify(GENERIC_RESET_RESPONSE),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Find the user with matching email
      let targetUserId: string | null = null;

      for (const profile of profiles) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
          profile.user_id
        );

        if (!userError && userData?.user?.email) {
          if (constantTimeCompare(userData.user.email.toLowerCase(), email.toLowerCase())) {
            targetUserId = profile.user_id;
            break;
          }
        }
      }

      if (!targetUserId) {
        return new Response(
          JSON.stringify(GENERIC_RESET_RESPONSE),
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
          JSON.stringify(GENERIC_RESET_RESPONSE),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      console.log(`Password reset successful for user ${targetUserId}`);
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
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});