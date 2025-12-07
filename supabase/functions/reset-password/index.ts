import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const TOKEN_EXPIRY_MINUTES = 30;

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

// Generate secure random token
async function generateSecureToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Input validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 255 && emailRegex.test(email);
}

function validatePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

// Send email via Mailjet
async function sendResetEmail(
  email: string, 
  resetLink: string, 
  expiryMinutes: number
): Promise<boolean> {
  const mailjetApiKey = Deno.env.get("MAILJET_API_KEY");
  const mailjetSecretKey = Deno.env.get("MAILJET_SECRET_KEY");

  if (!mailjetApiKey || !mailjetSecretKey) {
    console.error("Mailjet credentials not configured");
    return false;
  }

  const credentials = base64Encode(`${mailjetApiKey}:${mailjetSecretKey}`);

  const emailData = {
    Messages: [
      {
        From: {
          Email: "noreply@meowchat.app",
          Name: "Meow Chat"
        },
        To: [
          {
            Email: email
          }
        ],
        Subject: "Reset Your Password - Meow Chat",
        HTMLPart: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 0;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); border-radius: 12px 12px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🐱 Meow Chat</h1>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Password Reset Request</h2>
                        <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                          We received a request to reset your password. Click the button below to create a new password:
                        </p>
                        <table role="presentation" style="margin: 30px 0;">
                          <tr>
                            <td style="background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); border-radius: 8px;">
                              <a href="${resetLink}" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                                Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 0 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                          <strong>⏰ This link expires in ${expiryMinutes} minutes.</strong>
                        </p>
                        <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                          If you can't click the button, copy and paste this link into your browser:
                        </p>
                        <p style="margin: 0 0 20px; color: #ec4899; font-size: 12px; word-break: break-all;">
                          ${resetLink}
                        </p>
                        <!-- Security Note -->
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>🔒 Security Note:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                          </p>
                        </div>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 40px; background-color: #f8f8f8; border-radius: 0 0 12px 12px; text-align: center;">
                        <p style="margin: 0 0 10px; color: #999999; font-size: 12px;">
                          Need help? Contact us at <a href="mailto:support@meowchat.app" style="color: #ec4899;">support@meowchat.app</a>
                        </p>
                        <p style="margin: 0; color: #999999; font-size: 12px;">
                          © ${new Date().getFullYear()} Meow Chat. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
        TextPart: `
          Password Reset Request - Meow Chat
          
          We received a request to reset your password. 
          
          Click this link to reset your password: ${resetLink}
          
          ⏰ This link expires in ${expiryMinutes} minutes.
          
          🔒 Security Note: If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          
          Need help? Contact us at support@meowchat.app
        `
      }
    ]
  };

  try {
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${credentials}`
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("Mailjet error:", result);
      return false;
    }

    console.log("Email sent successfully:", result);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    const { action, email, token, newPassword, redirectUrl } = body;

    // Validate action
    const validActions = ['request-reset', 'validate-token', 'reset-password', 'check-email-exists'];
    if (!action || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // ==========================================
    // ACTION: Check if email exists
    // ==========================================
    if (action === "check-email-exists") {
      if (!email || !validateEmail(email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

      const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

      if (usersError) {
        console.error("Error listing users:", usersError);
        return new Response(
          JSON.stringify({ exists: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const emailExists = users.users.some(
        (user) => user.email?.toLowerCase() === email.toLowerCase()
      );

      return new Response(
        JSON.stringify({ exists: emailExists }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ==========================================
    // ACTION: Request password reset link
    // ==========================================
    if (action === "request-reset") {
      if (!email || !validateEmail(email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Rate limit
      const rateLimitKey = `${clientIP}:${email.toLowerCase()}`;
      const rateCheck = checkRateLimit(rateLimitKey);

      if (!rateCheck.allowed) {
        return new Response(
          JSON.stringify({ 
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

      // Check if email exists (but don't reveal this to the user)
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      // Always return success to prevent email enumeration
      const successResponse = {
        success: true,
        message: "If an account exists with this email, a password reset link has been sent."
      };

      if (!user) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return new Response(
          JSON.stringify(successResponse),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Invalidate any existing tokens for this user
      await supabaseAdmin
        .from("password_reset_tokens")
        .update({ used: true })
        .eq("user_id", user.id)
        .eq("used", false);

      // Generate new token
      const plainToken = await generateSecureToken();
      const tokenHash = await hashToken(plainToken);
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

      // Store token in database
      const { error: insertError } = await supabaseAdmin
        .from("password_reset_tokens")
        .insert({
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          ip_address: clientIP,
          user_agent: userAgent
        });

      if (insertError) {
        console.error("Error storing reset token:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate reset link" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      // Build reset link
      const baseUrl = redirectUrl || "https://tvneohngeracipjajzos.lovableproject.com";
      const resetLink = `${baseUrl}/password-reset?token=${plainToken}`;

      // Send email
      const emailSent = await sendResetEmail(email, resetLink, TOKEN_EXPIRY_MINUTES);

      if (!emailSent) {
        console.error("Failed to send reset email to:", email);
        // Still return success to prevent enumeration
      } else {
        console.log(`Password reset email sent to: ${email}`);
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ==========================================
    // ACTION: Validate reset token
    // ==========================================
    if (action === "validate-token") {
      if (!token || typeof token !== 'string' || token.length !== 64) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid token format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const tokenHash = await hashToken(token);

      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from("password_reset_tokens")
        .select("*")
        .eq("token_hash", tokenHash)
        .eq("used", false)
        .maybeSingle();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid or expired token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Check expiry
      if (new Date(tokenData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, error: "Token has expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      return new Response(
        JSON.stringify({ valid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ==========================================
    // ACTION: Reset password with token
    // ==========================================
    if (action === "reset-password") {
      if (!token || typeof token !== 'string' || token.length !== 64) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid token format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!newPassword || !validatePassword(newPassword)) {
        return new Response(
          JSON.stringify({ success: false, error: "Password must be between 8 and 128 characters" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const tokenHash = await hashToken(token);

      // Get and validate token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from("password_reset_tokens")
        .select("*")
        .eq("token_hash", tokenHash)
        .eq("used", false)
        .maybeSingle();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid or expired token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Check expiry
      if (new Date(tokenData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Token has expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        tokenData.user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password update error:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update password" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      // Mark token as used
      await supabaseAdmin
        .from("password_reset_tokens")
        .update({ used: true })
        .eq("id", tokenData.id);

      // Invalidate all other tokens for this user
      await supabaseAdmin
        .from("password_reset_tokens")
        .update({ used: true })
        .eq("user_id", tokenData.user_id)
        .eq("used", false);

      console.log(`Password reset successful for user: ${tokenData.user_id}`);

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
