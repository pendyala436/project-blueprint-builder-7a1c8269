import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FemaleProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  primary_language: string | null;
  approval_status: string;
  account_status: string;
  performance_score: number;
  last_active_at: string | null;
  total_chats_count: number;
  avg_response_time_seconds: number;
  ai_approved: boolean;
  created_at: string;
}

interface LanguageGroup {
  id: string;
  name: string;
  languages: string[];
  max_women_users: number;
  current_women_count: number;
}

// Language name to code mapping for flexible matching
const languageNameToCode: Record<string, string[]> = {
  'telugu': ['te', 'te-IN', 'Telugu'],
  'tamil': ['ta', 'ta-IN', 'Tamil'],
  'kannada': ['kn', 'kn-IN', 'Kannada'],
  'malayalam': ['ml', 'ml-IN', 'Malayalam'],
  'hindi': ['hi', 'hi-IN', 'Hindi'],
  'bengali': ['bn', 'bn-IN', 'Bengali'],
  'marathi': ['mr', 'mr-IN', 'Marathi'],
  'gujarati': ['gu', 'gu-IN', 'Gujarati'],
  'punjabi': ['pa', 'pa-IN', 'Punjabi'],
  'odia': ['or', 'or-IN', 'Odia', 'Oriya'],
  'urdu': ['ur', 'ur-IN', 'ur-PK', 'Urdu'],
  'english': ['en', 'en-IN', 'en-US', 'en-GB', 'English'],
  'arabic': ['ar', 'ar-SA', 'ar-EG', 'Arabic'],
  'spanish': ['es', 'es-ES', 'es-MX', 'Spanish'],
  'french': ['fr', 'fr-FR', 'French'],
  'german': ['de', 'de-DE', 'German'],
  'portuguese': ['pt', 'pt-BR', 'pt-PT', 'Portuguese'],
  'russian': ['ru', 'ru-RU', 'Russian'],
  'chinese': ['zh', 'zh-CN', 'zh-TW', 'Chinese'],
  'japanese': ['ja', 'ja-JP', 'Japanese'],
  'korean': ['ko', 'ko-KR', 'Korean'],
  'thai': ['th', 'th-TH', 'Thai'],
  'vietnamese': ['vi', 'vi-VN', 'Vietnamese'],
  'indonesian': ['id', 'id-ID', 'Indonesian'],
  'turkish': ['tr', 'tr-TR', 'Turkish'],
};

function getLanguageVariants(language: string | null): string[] {
  if (!language) return [];
  
  const lowerLang = language.toLowerCase().trim();
  
  // Check if it's a language name
  if (languageNameToCode[lowerLang]) {
    return languageNameToCode[lowerLang];
  }
  
  // Check if it's already a code, find all variants
  for (const [name, codes] of Object.entries(languageNameToCode)) {
    if (codes.some(c => c.toLowerCase() === lowerLang)) {
      return codes;
    }
  }
  
  // Return the original plus common variants
  return [language, language.toLowerCase(), language.toUpperCase()];
}

function matchesLanguageGroup(userLanguage: string | null, groupLanguages: string[]): boolean {
  if (!userLanguage) return false;
  
  const variants = getLanguageVariants(userLanguage);
  
  // Check if any variant matches any group language
  return variants.some(variant => 
    groupLanguages.some(gl => 
      gl.toLowerCase() === variant.toLowerCase() ||
      gl.toLowerCase().startsWith(variant.toLowerCase()) ||
      variant.toLowerCase().startsWith(gl.toLowerCase())
    )
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for action type
    let action = "auto_approve"; // default action
    let userId: string | null = null;
    
    try {
      const body = await req.json();
      action = body.action || "auto_approve";
      userId = body.user_id || null;
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`AI Women Approval - Action: ${action}`);

    // Handle different actions
    if (action === "request_reapproval" && userId) {
      return await handleReapprovalRequest(supabase, userId);
    }

    // Default: Run auto-approval process
    return await runAutoApproval(supabase);

  } catch (error: any) {
    console.error("AI Women Approval error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Handle re-approval request from inactive users (30+ days inactive)
 * Allows them to get back into the active users list
 */
async function handleReapprovalRequest(supabase: any, userId: string) {
  console.log(`Processing re-approval request for user: ${userId}`);

  try {
    // Check if user exists and is disapproved/inactive
    const { data: profile, error: profileError } = await supabase
      .from("female_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      // Check profiles table
      const { data: mainProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .eq("gender", "female")
        .maybeSingle();

      if (!mainProfile) {
        return new Response(
          JSON.stringify({ success: false, error: "User not found or not a female user" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if the user was disapproved due to inactivity
    const isDisapproved = profile?.approval_status === "disapproved" || 
                          profile?.ai_disapproval_reason?.includes("Inactive");

    if (!isDisapproved && profile?.approval_status === "approved") {
      return new Response(
        JSON.stringify({ success: false, error: "User is already approved" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set user status to pending for re-approval
    const updateData = {
      approval_status: "pending",
      ai_approved: false,
      ai_disapproval_reason: null,
      account_status: "active",
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update female_profiles
    if (profile) {
      await supabase
        .from("female_profiles")
        .update(updateData)
        .eq("user_id", userId);
    }

    // Update profiles table
    await supabase
      .from("profiles")
      .update({
        approval_status: "pending",
        ai_approved: false,
        ai_disapproval_reason: null,
        account_status: "active",
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    console.log(`✓ User ${userId} set to pending for re-approval`);

    // Immediately run approval for this user
    await approveSpecificUser(supabase, userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Re-approval request processed successfully. You are now approved.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Re-approval request error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Failed to process re-approval" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Approve a specific user immediately
 */
async function approveSpecificUser(supabase: any, userId: string) {
  const approvalData = {
    approval_status: "approved",
    ai_approved: true,
    auto_approved: true,
    ai_disapproval_reason: null,
    performance_score: 100, // Reset performance score
    last_active_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Update female_profiles
  await supabase
    .from("female_profiles")
    .update(approvalData)
    .eq("user_id", userId);

  // Update profiles
  await supabase
    .from("profiles")
    .update({
      approval_status: "approved",
      ai_approved: true,
      ai_disapproval_reason: null,
      performance_score: 100,
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Ensure women_availability entry exists
  await supabase
    .from("women_availability")
    .upsert({
      user_id: userId,
      is_available: false,
      is_available_for_calls: false,
      current_chat_count: 0,
      current_call_count: 0,
      max_concurrent_chats: 3,
      max_concurrent_calls: 1,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  console.log(`✓ User ${userId} approved successfully`);
}

/**
 * Run the automatic approval process for all pending women
 * This runs every 5 minutes via cron job
 */
async function runAutoApproval(supabase: any) {
  console.log("Starting AI Women Auto-Approval Process...");

  const results = {
    approved: 0,
    disapproved: 0,
    retained: 0,
    rotatedOut: 0,
    reactivated: 0,
    noLanguageGroupApproved: 0,
    errors: [] as string[],
  };

  // STEP 1: Get all pending female profiles from female_profiles table
  const { data: pendingFemales, error: pfError } = await supabase
    .from("female_profiles")
    .select("*")
    .eq("approval_status", "pending")
    .eq("account_status", "active");

  if (pfError) {
    console.error("Error fetching pending female profiles:", pfError);
    results.errors.push(`Error fetching pending female profiles: ${pfError.message}`);
  }

  console.log(`Found ${pendingFemales?.length || 0} pending female profiles in female_profiles table`);

  // STEP 2: Get all language groups
  const { data: languageGroups, error: lgError } = await supabase
    .from("language_groups")
    .select("*")
    .eq("is_active", true);

  if (lgError) {
    console.error("Error fetching language groups:", lgError);
  }

  console.log(`Found ${languageGroups?.length || 0} active language groups`);

  // STEP 3: Auto-approve ALL pending females (no restrictions)
  for (const woman of (pendingFemales || []) as FemaleProfile[]) {
    console.log(`Processing pending user: ${woman.full_name || woman.user_id}, language: ${woman.primary_language}`);

    // Find matching language group (optional, for tracking)
    let matchedGroup: LanguageGroup | null = null;
    
    for (const group of (languageGroups || []) as LanguageGroup[]) {
      if (matchesLanguageGroup(woman.primary_language, group.languages)) {
        matchedGroup = group;
        break;
      }
    }

    // Auto-approve the user - NO RESTRICTIONS
    const approvalData = {
      approval_status: "approved",
      ai_approved: true,
      auto_approved: true,
      ai_disapproval_reason: null,
      performance_score: 100,
      updated_at: new Date().toISOString(),
    };

    // Update female_profiles table
    const { error: updateError } = await supabase
      .from("female_profiles")
      .update(approvalData)
      .eq("id", woman.id);

    if (updateError) {
      console.error(`Error approving user ${woman.full_name}:`, updateError);
      results.errors.push(`Error approving ${woman.full_name}: ${updateError.message}`);
      continue;
    }

    // Also update profiles table if exists
    await supabase
      .from("profiles")
      .update({
        approval_status: "approved",
        ai_approved: true,
        ai_disapproval_reason: null,
        performance_score: 100,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", woman.user_id);

    // Insert into women_availability table for the approved woman
    const { error: availError } = await supabase
      .from("women_availability")
      .upsert({
        user_id: woman.user_id,
        is_available: false,
        is_available_for_calls: false,
        current_chat_count: 0,
        current_call_count: 0,
        max_concurrent_chats: 3,
        max_concurrent_calls: 1,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (availError) {
      console.error(`Error creating women_availability for ${woman.full_name}:`, availError);
    } else {
      console.log(`✓ Created women_availability entry for ${woman.full_name}`);
    }

    if (matchedGroup) {
      // Increment group count
      await supabase
        .from("language_groups")
        .update({ 
          current_women_count: matchedGroup.current_women_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchedGroup.id);

      console.log(`✓ AI approved ${woman.full_name} for language group: ${matchedGroup.name}`);
    } else {
      results.noLanguageGroupApproved++;
      console.log(`✓ AI approved ${woman.full_name} (no specific language group, using global)`);
    }

    results.approved++;
  }

  // STEP 4: Also check profiles table for female users with pending status
  const { data: pendingProfileFemales, error: ppfError } = await supabase
    .from("profiles")
    .select("*")
    .eq("gender", "female")
    .eq("approval_status", "pending")
    .eq("account_status", "active");

  if (!ppfError && pendingProfileFemales) {
    console.log(`Found ${pendingProfileFemales.length} additional pending females in profiles table`);

    for (const woman of pendingProfileFemales) {
      // Check if already approved in female_profiles
      const { data: existingFp } = await supabase
        .from("female_profiles")
        .select("id, approval_status")
        .eq("user_id", woman.user_id)
        .maybeSingle();

      if (existingFp?.approval_status === "approved") {
        // Sync the status
        await supabase
          .from("profiles")
          .update({
            approval_status: "approved",
            ai_approved: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", woman.id);
        continue;
      }

      // Find matching language group
      let matchedGroup: LanguageGroup | null = null;
      
      for (const group of (languageGroups || []) as LanguageGroup[]) {
        if (matchesLanguageGroup(woman.primary_language, group.languages)) {
          matchedGroup = group;
          break;
        }
      }

      // Auto-approve - NO RESTRICTIONS
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          approval_status: "approved",
          ai_approved: true,
          ai_disapproval_reason: null,
          performance_score: 100,
          updated_at: new Date().toISOString(),
        })
        .eq("id", woman.id);

      if (updateError) {
        console.error(`Error approving profile ${woman.full_name}:`, updateError);
        continue;
      }

      // Also update female_profiles if exists
      if (existingFp) {
        await supabase
          .from("female_profiles")
          .update({
            approval_status: "approved",
            ai_approved: true,
            auto_approved: true,
            ai_disapproval_reason: null,
            performance_score: 100,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingFp.id);
      }

      // Insert into women_availability table
      const { error: availError } = await supabase
        .from("women_availability")
        .upsert({
          user_id: woman.user_id,
          is_available: false,
          is_available_for_calls: false,
          current_chat_count: 0,
          current_call_count: 0,
          max_concurrent_chats: 3,
          max_concurrent_calls: 1,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (availError) {
        console.error(`Error creating women_availability for profile ${woman.full_name}:`, availError);
      } else {
        console.log(`✓ Created women_availability entry for profile ${woman.full_name}`);
      }

      if (matchedGroup) {
        await supabase
          .from("language_groups")
          .update({ 
            current_women_count: matchedGroup.current_women_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchedGroup.id);
      }

      results.approved++;
      console.log(`✓ AI approved (from profiles) ${woman.full_name}`);
    }
  }

  // STEP 5: Process existing approved women for rotation (30-day inactivity check)
  await processApprovedWomenRotation(supabase, languageGroups || [], results);

  // STEP 6: Auto-reactivate users who were inactive but are now active again
  await processInactiveReactivation(supabase, results);

  console.log("AI Women Auto-Approval Process completed:", results);

  return new Response(
    JSON.stringify({
      success: true,
      message: "AI Women Auto-Approval process completed",
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Check and rotate out women who have been inactive for 30+ days
 */
async function processApprovedWomenRotation(supabase: any, languageGroups: LanguageGroup[], results: any) {
  try {
    // Get all approved women
    const { data: approvedWomen } = await supabase
      .from("female_profiles")
      .select("*")
      .eq("approval_status", "approved")
      .eq("account_status", "active");

    if (!approvedWomen) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const woman of approvedWomen as FemaleProfile[]) {
      const lastActive = woman.last_active_at ? new Date(woman.last_active_at) : null;
      
      // Mark as inactive if offline for more than 30 days
      // They can request re-approval to come back
      if (lastActive && lastActive < thirtyDaysAgo) {
        await supabase
          .from("female_profiles")
          .update({
            approval_status: "inactive",
            ai_approved: false,
            ai_disapproval_reason: "Inactive for more than 30 days. Request re-approval to continue.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", woman.id);

        // Sync to profiles
        await supabase
          .from("profiles")
          .update({
            approval_status: "inactive",
            ai_approved: false,
            ai_disapproval_reason: "Inactive for more than 30 days. Request re-approval to continue.",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", woman.user_id);

        results.rotatedOut++;
        console.log(`Marked ${woman.full_name} as inactive - 30+ days without activity`);
        continue;
      }

      // Performance check is now more lenient - only warn, don't disapprove
      if (woman.performance_score < 30) {
        console.log(`Warning: ${woman.full_name} has low performance: ${woman.performance_score}/100`);
        // Just log warning, don't disapprove
      }

      results.retained++;
    }
  } catch (error) {
    console.error("Error in rotation process:", error);
    results.errors.push(`Rotation error: ${error}`);
  }
}

/**
 * Automatically reactivate users who were marked inactive but have shown recent activity
 */
async function processInactiveReactivation(supabase: any, results: any) {
  try {
    // Get all inactive women
    const { data: inactiveWomen } = await supabase
      .from("female_profiles")
      .select("*")
      .eq("approval_status", "inactive")
      .eq("account_status", "active");

    if (!inactiveWomen || inactiveWomen.length === 0) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const woman of inactiveWomen as FemaleProfile[]) {
      const lastActive = woman.last_active_at ? new Date(woman.last_active_at) : null;
      
      // If they've been active in the last 7 days, auto-reactivate them
      if (lastActive && lastActive > sevenDaysAgo) {
        await supabase
          .from("female_profiles")
          .update({
            approval_status: "approved",
            ai_approved: true,
            ai_disapproval_reason: null,
            performance_score: Math.max(woman.performance_score, 70), // Restore to at least 70
            updated_at: new Date().toISOString(),
          })
          .eq("id", woman.id);

        await supabase
          .from("profiles")
          .update({
            approval_status: "approved",
            ai_approved: true,
            ai_disapproval_reason: null,
            performance_score: Math.max(woman.performance_score, 70),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", woman.user_id);

        // Ensure women_availability exists
        await supabase
          .from("women_availability")
          .upsert({
            user_id: woman.user_id,
            is_available: false,
            is_available_for_calls: false,
            current_chat_count: 0,
            current_call_count: 0,
            max_concurrent_chats: 3,
            max_concurrent_calls: 1,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        results.reactivated++;
        console.log(`✓ Auto-reactivated ${woman.full_name} - recent activity detected`);
      }
    }
  } catch (error) {
    console.error("Error in reactivation process:", error);
    results.errors.push(`Reactivation error: ${error}`);
  }
}
