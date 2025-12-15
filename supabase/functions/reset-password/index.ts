import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
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

// Input validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 255 && emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
  return typeof phone === 'string' && phoneRegex.test(phone);
}

function validatePassword(password: string): boolean {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return false;
  }
  // Check for uppercase, lowercase, number, and symbol
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return hasUppercase && hasLowercase && hasNumber && hasSymbol;
}

// Normalize phone number for comparison
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { action, email, phone, userId, newPassword } = body;

    // Validate action
    const validActions = ['verify-account', 'direct-reset'];
    if (!action || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // ==========================================
    // ACTION: Verify account by email + phone
    // ==========================================
    if (action === "verify-account") {
      console.log("Verify account request received:", { email, phone });
      
      if (!email || !validateEmail(email)) {
        console.log("Invalid email format:", email);
        return new Response(
          JSON.stringify({ verified: false, error: "Invalid email format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!phone || !validatePhone(phone)) {
        console.log("Invalid phone format:", phone);
        return new Response(
          JSON.stringify({ verified: false, error: "Invalid phone format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Rate limit
      const rateLimitKey = `verify:${clientIP}:${email.toLowerCase()}`;
      const rateCheck = checkRateLimit(rateLimitKey);

      if (!rateCheck.allowed) {
        return new Response(
          JSON.stringify({ 
            verified: false,
            error: "Too many attempts. Please try again later.",
            retryAfter: Math.ceil(rateCheck.resetIn / 1000)
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 429 
          }
        );
      }

      // Add delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));

      // First, look up the user in profiles table by email to get user_id
      const { data: profileByEmail, error: profileLookupError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, phone, email")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      
      if (profileLookupError) {
        console.error("Error looking up profile by email:", profileLookupError);
        return new Response(
          JSON.stringify({ verified: false, error: "Failed to verify account" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      // If not found in profiles, check auth.users by listing with pagination
      let userId: string | null = profileByEmail?.user_id || null;
      let storedPhone: string | null = profileByEmail?.phone || null;
      
      if (!userId) {
        // Search through auth users with pagination
        let page = 1;
        let found = false;
        while (!found && page <= 20) { // Max 20 pages = 1000 users
          const { data: usersPage, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
            page: page,
            perPage: 50
          });
          
          if (usersError) {
            console.error("Error listing users:", usersError);
            break;
          }
          
          const user = usersPage?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (user) {
            userId = user.id;
            found = true;
            console.log("User found in auth.users:", { id: user.id, email: user.email });
            
            // Get phone from profiles
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("phone")
              .eq("user_id", user.id)
              .maybeSingle();
            storedPhone = profile?.phone || null;
          }
          
          if (!usersPage?.users?.length || usersPage.users.length < 50) break;
          page++;
        }
      } else {
        console.log("User found in profiles table:", { user_id: userId, email: profileByEmail?.email });
      }

      if (!userId) {
        console.log("No user found with email:", email);
        return new Response(
          JSON.stringify({ verified: false, error: "No account found with this email" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Compare normalized phone numbers
      const normalizedInputPhone = normalizePhone(phone);
      const normalizedStoredPhone = storedPhone ? normalizePhone(storedPhone) : '';

      console.log("Phone comparison:", { 
        input: normalizedInputPhone, 
        stored: normalizedStoredPhone,
        match: normalizedInputPhone === normalizedStoredPhone 
      });

      if (!normalizedStoredPhone) {
        return new Response(
          JSON.stringify({ verified: false, error: "No phone number on file for this account" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      if (normalizedInputPhone !== normalizedStoredPhone) {
        return new Response(
          JSON.stringify({ verified: false, error: "Email and phone number do not match" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Account verified
      console.log(`Account verified for user: ${userId}`);
      
      return new Response(
        JSON.stringify({ 
          verified: true, 
          userId: userId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ==========================================
    // ACTION: Direct password reset
    // ==========================================
    if (action === "direct-reset") {
      if (!userId || typeof userId !== 'string') {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid user ID" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!newPassword || !validatePassword(newPassword)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Password must be 8+ characters with uppercase, lowercase, number, and symbol" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Rate limit
      const rateLimitKey = `reset:${clientIP}:${userId}`;
      const rateCheck = checkRateLimit(rateLimitKey);

      if (!rateCheck.allowed) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Too many attempts. Please try again later.",
            retryAfter: Math.ceil(rateCheck.resetIn / 1000)
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 429 
          }
        );
      }

      // Verify user exists
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (userError || !userData?.user) {
        console.error("User not found:", userError);
        return new Response(
          JSON.stringify({ success: false, error: "Invalid user" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password update error:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update password" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log(`Password reset successful for user: ${userId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("Reset password error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
