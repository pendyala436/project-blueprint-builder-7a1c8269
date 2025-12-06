/**
 * seed-sample-users Edge Function
 * Creates mock users with profiles per language for testing.
 * - 3 men and 3 women per NLLB-200 language
 * - Password: Chinn@2589
 * - Wallets with free balance (no recharge required)
 * 
 * Supports:
 * - action: "seed" - Creates mock users for all languages
 * - action: "clear" - Deletes all mock users
 * - action: "status" - Returns current mock user count
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All NLLB-200 languages for mock user generation
const INDIAN_LANGUAGES = [
  { code: "hin_Deva", name: "Hindi", country: "India" },
  { code: "ben_Beng", name: "Bengali", country: "India" },
  { code: "tel_Telu", name: "Telugu", country: "India" },
  { code: "tam_Taml", name: "Tamil", country: "India" },
  { code: "mar_Deva", name: "Marathi", country: "India" },
  { code: "guj_Gujr", name: "Gujarati", country: "India" },
  { code: "kan_Knda", name: "Kannada", country: "India" },
  { code: "mal_Mlym", name: "Malayalam", country: "India" },
  { code: "pan_Guru", name: "Punjabi", country: "India" },
  { code: "ory_Orya", name: "Odia", country: "India" },
  { code: "asm_Beng", name: "Assamese", country: "India" },
  { code: "npi_Deva", name: "Nepali", country: "Nepal" },
  { code: "urd_Arab", name: "Urdu", country: "Pakistan" },
  { code: "gom_Deva", name: "Konkani", country: "India" },
  { code: "mai_Deva", name: "Maithili", country: "India" },
  { code: "sat_Olck", name: "Santali", country: "India" },
  { code: "brx_Deva", name: "Bodo", country: "India" },
  { code: "doi_Deva", name: "Dogri", country: "India" },
  { code: "kas_Arab", name: "Kashmiri", country: "India" },
  { code: "snd_Arab", name: "Sindhi", country: "Pakistan" },
  { code: "mni_Beng", name: "Manipuri", country: "India" },
  { code: "sin_Sinh", name: "Sinhala", country: "Sri Lanka" },
];

const NON_INDIAN_LANGUAGES = [
  { code: "eng_Latn", name: "English", country: "United States" },
  { code: "spa_Latn", name: "Spanish", country: "Spain" },
  { code: "fra_Latn", name: "French", country: "France" },
  { code: "deu_Latn", name: "German", country: "Germany" },
  { code: "por_Latn", name: "Portuguese", country: "Brazil" },
  { code: "ita_Latn", name: "Italian", country: "Italy" },
  { code: "nld_Latn", name: "Dutch", country: "Netherlands" },
  { code: "rus_Cyrl", name: "Russian", country: "Russia" },
  { code: "pol_Latn", name: "Polish", country: "Poland" },
  { code: "ukr_Cyrl", name: "Ukrainian", country: "Ukraine" },
  { code: "zho_Hans", name: "Chinese", country: "China" },
  { code: "jpn_Jpan", name: "Japanese", country: "Japan" },
  { code: "kor_Hang", name: "Korean", country: "South Korea" },
  { code: "vie_Latn", name: "Vietnamese", country: "Vietnam" },
  { code: "tha_Thai", name: "Thai", country: "Thailand" },
  { code: "ind_Latn", name: "Indonesian", country: "Indonesia" },
  { code: "zsm_Latn", name: "Malay", country: "Malaysia" },
  { code: "tgl_Latn", name: "Tagalog", country: "Philippines" },
  { code: "arb_Arab", name: "Arabic", country: "Saudi Arabia" },
  { code: "pes_Arab", name: "Persian", country: "Iran" },
  { code: "tur_Latn", name: "Turkish", country: "Turkey" },
  { code: "heb_Hebr", name: "Hebrew", country: "Israel" },
  { code: "swh_Latn", name: "Swahili", country: "Kenya" },
  { code: "afr_Latn", name: "Afrikaans", country: "South Africa" },
];

const ALL_LANGUAGES = [...INDIAN_LANGUAGES, ...NON_INDIAN_LANGUAGES];

// Male and female names per region
const MALE_NAMES = {
  indian: ["Raj", "Arjun", "Vikram", "Aditya", "Rohan", "Karthik", "Sanjay", "Deepak", "Amit", "Ravi"],
  western: ["James", "Michael", "David", "Robert", "John", "William", "Richard", "Thomas", "Charles", "Daniel"],
  asian: ["Wei", "Takeshi", "Min-Jun", "Nguyen", "Somchai", "Ahmad", "Mohammad", "Ali", "Hassan", "Omar"],
  african: ["Kwame", "Sipho", "Oluwaseun", "Ibrahim", "Kofi", "Nkosi", "Juma", "Abdul", "Malik", "Tariq"],
};

const FEMALE_NAMES = {
  indian: ["Priya", "Ananya", "Divya", "Sneha", "Kavitha", "Meera", "Lakshmi", "Pooja", "Nisha", "Anjali"],
  western: ["Emma", "Olivia", "Sophia", "Isabella", "Charlotte", "Amelia", "Mia", "Harper", "Evelyn", "Abigail"],
  asian: ["Sakura", "Mei", "Soo-Yeon", "Linh", "Ploy", "Fatima", "Zahra", "Aisha", "Nur", "Layla"],
  african: ["Amara", "Zuri", "Adaeze", "Aisha", "Nia", "Thandi", "Ayesha", "Halima", "Amina", "Khadija"],
};

function getRegion(country: string): string {
  const indianCountries = ["India", "Nepal", "Pakistan", "Sri Lanka", "Bangladesh"];
  const asianCountries = ["China", "Japan", "South Korea", "Vietnam", "Thailand", "Indonesia", "Malaysia", "Philippines", "Saudi Arabia", "Iran", "Turkey", "Israel"];
  const africanCountries = ["Kenya", "South Africa", "Nigeria", "Egypt"];
  
  if (indianCountries.includes(country)) return "indian";
  if (asianCountries.includes(country)) return "asian";
  if (africanCountries.includes(country)) return "african";
  return "western";
}

function getRandomName(gender: "male" | "female", region: string, index: number): string {
  const names = gender === "male" ? MALE_NAMES : FEMALE_NAMES;
  const regionNames = names[region as keyof typeof names] || names.western;
  return regionNames[index % regionNames.length];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = "seed" } = await req.json().catch(() => ({ action: "seed" }));
    
    console.log(`Mock users action: ${action}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Handle status check
    if (action === "status") {
      const { count: mockCount } = await supabaseAdmin
        .from("sample_users")
        .select("*", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          success: true,
          count: mockCount || 0,
          enabled: (mockCount || 0) > 0,
          languageCount: ALL_LANGUAGES.length,
          expectedCount: ALL_LANGUAGES.length * 6, // 3 men + 3 women per language
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle clear action
    if (action === "clear") {
      console.log("Clearing all mock users...");
      
      const { error } = await supabaseAdmin
        .from("sample_users")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) throw error;

      console.log("All mock users cleared");
      return new Response(
        JSON.stringify({
          success: true,
          message: "All mock users have been deleted",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle seed action
    console.log(`Seeding mock users for ${ALL_LANGUAGES.length} languages...`);
    
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
      languages: 0,
    };

    // First, clear existing sample users
    await supabaseAdmin
      .from("sample_users")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Create mock users for each language
    for (const lang of ALL_LANGUAGES) {
      const region = getRegion(lang.country);
      
      // Create 3 men per language
      for (let i = 0; i < 3; i++) {
        const name = getRandomName("male", region, i);
        const age = 25 + Math.floor(Math.random() * 15);
        
        const { error } = await supabaseAdmin.from("sample_users").insert({
          name: `${name} ${lang.name.substring(0, 2)}${i + 1}`,
          age,
          gender: "male",
          language: lang.name,
          country: lang.country,
          bio: `Hi, I'm a ${lang.name} speaker from ${lang.country}. Looking for meaningful connections!`,
          is_active: true,
          is_online: true,
        });

        if (error) {
          console.error(`Error creating male user for ${lang.name}:`, error.message);
          results.errors.push(`${lang.name} male ${i + 1}: ${error.message}`);
        } else {
          results.created++;
        }
      }

      // Create 3 women per language
      for (let i = 0; i < 3; i++) {
        const name = getRandomName("female", region, i);
        const age = 22 + Math.floor(Math.random() * 12);
        
        const { error } = await supabaseAdmin.from("sample_users").insert({
          name: `${name} ${lang.name.substring(0, 2)}${i + 1}`,
          age,
          gender: "female",
          language: lang.name,
          country: lang.country,
          bio: `Hello! I speak ${lang.name} and I'm from ${lang.country}. Let's chat!`,
          is_active: true,
          is_online: true,
        });

        if (error) {
          console.error(`Error creating female user for ${lang.name}:`, error.message);
          results.errors.push(`${lang.name} female ${i + 1}: ${error.message}`);
        } else {
          results.created++;
        }
      }

      results.languages++;
    }

    console.log(`Seeding completed. Created ${results.created} users for ${results.languages} languages`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${results.created} mock users for ${results.languages} languages`,
        results: {
          created: results.created,
          languages: results.languages,
          errors: results.errors.length,
          menPerLanguage: 3,
          womenPerLanguage: 3,
        },
        languageList: ALL_LANGUAGES.map(l => l.name),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Mock users error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
