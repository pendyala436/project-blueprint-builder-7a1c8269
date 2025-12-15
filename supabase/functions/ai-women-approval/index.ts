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

    console.log("Starting AI Women Approval Process...");

    const results = {
      approved: 0,
      disapproved: 0,
      retained: 0,
      rotatedOut: 0,
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
      throw lgError;
    }

    console.log(`Found ${languageGroups?.length || 0} active language groups`);

    // STEP 3: Auto-approve pending females
    for (const woman of (pendingFemales || []) as FemaleProfile[]) {
      console.log(`Processing pending user: ${woman.full_name || woman.user_id}, language: ${woman.primary_language}`);

      // Find matching language group
      let matchedGroup: LanguageGroup | null = null;
      
      for (const group of (languageGroups || []) as LanguageGroup[]) {
        if (matchesLanguageGroup(woman.primary_language, group.languages)) {
          // Check if group has available slots
          if (group.current_women_count < group.max_women_users) {
            matchedGroup = group;
            break;
          }
        }
      }

      // Auto-approve the user
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

      if (matchedGroup) {
        // Increment group count
        await supabase
          .from("language_groups")
          .update({ 
            current_women_count: matchedGroup.current_women_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchedGroup.id);

        results.approved++;
        console.log(`✓ AI approved ${woman.full_name} for language group: ${matchedGroup.name}`);
      } else {
        results.noLanguageGroupApproved++;
        console.log(`✓ AI approved ${woman.full_name} (no specific language group, using global)`);
      }
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
            if (group.current_women_count < group.max_women_users) {
              matchedGroup = group;
              break;
            }
          }
        }

        // Auto-approve
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

    // STEP 5: Process existing approved women for rotation (performance checks)
    await processApprovedWomenRotation(supabase, languageGroups || [], results);

    console.log("AI Women Approval Process completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "AI Women Approval process completed",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("AI Women Approval error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
      
      // Disapprove if offline for more than 30 days
      if (lastActive && lastActive < thirtyDaysAgo) {
        await supabase
          .from("female_profiles")
          .update({
            approval_status: "disapproved",
            ai_approved: false,
            ai_disapproval_reason: "Inactive for more than 30 days",
            updated_at: new Date().toISOString(),
          })
          .eq("id", woman.id);

        // Sync to profiles
        await supabase
          .from("profiles")
          .update({
            approval_status: "disapproved",
            ai_approved: false,
            ai_disapproval_reason: "Inactive for more than 30 days",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", woman.user_id);

        results.rotatedOut++;
        console.log(`Rotated out ${woman.full_name} - inactive for 30+ days`);
        continue;
      }

      // Check performance score
      if (woman.performance_score < 30) {
        await supabase
          .from("female_profiles")
          .update({
            approval_status: "disapproved",
            ai_approved: false,
            ai_disapproval_reason: `Poor performance score: ${woman.performance_score}/100`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", woman.id);

        await supabase
          .from("profiles")
          .update({
            approval_status: "disapproved",
            ai_approved: false,
            ai_disapproval_reason: `Poor performance score: ${woman.performance_score}/100`,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", woman.user_id);

        results.disapproved++;
        console.log(`Disapproved ${woman.full_name} - poor performance: ${woman.performance_score}`);
        continue;
      }

      results.retained++;
    }
  } catch (error) {
    console.error("Error in rotation process:", error);
    results.errors.push(`Rotation error: ${error}`);
  }
}
