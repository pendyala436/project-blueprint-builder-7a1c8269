import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// All supported languages for sample users
const ALL_LANGUAGES = [
  // Indian Languages (NLLB-200 Supported)
  { code: "hi", name: "Hindi", country: "India" },
  { code: "bn", name: "Bengali", country: "India" },
  { code: "ta", name: "Tamil", country: "India" },
  { code: "te", name: "Telugu", country: "India" },
  { code: "mr", name: "Marathi", country: "India" },
  { code: "gu", name: "Gujarati", country: "India" },
  { code: "kn", name: "Kannada", country: "India" },
  { code: "ml", name: "Malayalam", country: "India" },
  { code: "pa", name: "Punjabi", country: "India" },
  { code: "or", name: "Odia", country: "India" },
  { code: "as", name: "Assamese", country: "India" },
  { code: "ur", name: "Urdu", country: "India" },
  
  // Major World Languages (NLLB-200 Supported)
  { code: "en", name: "English", country: "USA" },
  { code: "es", name: "Spanish", country: "Spain" },
  { code: "fr", name: "French", country: "France" },
  { code: "de", name: "German", country: "Germany" },
  { code: "pt", name: "Portuguese", country: "Portugal" },
  { code: "it", name: "Italian", country: "Italy" },
  { code: "ru", name: "Russian", country: "Russia" },
  { code: "ar", name: "Arabic", country: "UAE" },
  { code: "zh", name: "Chinese", country: "China" },
  { code: "ja", name: "Japanese", country: "Japan" },
  { code: "ko", name: "Korean", country: "South Korea" },
  { code: "tr", name: "Turkish", country: "Turkey" },
  { code: "vi", name: "Vietnamese", country: "Vietnam" },
  { code: "th", name: "Thai", country: "Thailand" },
  { code: "id", name: "Indonesian", country: "Indonesia" },
  { code: "ms", name: "Malay", country: "Malaysia" },
  { code: "fil", name: "Filipino", country: "Philippines" },
  { code: "nl", name: "Dutch", country: "Netherlands" },
  { code: "pl", name: "Polish", country: "Poland" },
  { code: "uk", name: "Ukrainian", country: "Ukraine" },
  { code: "sv", name: "Swedish", country: "Sweden" },
  { code: "el", name: "Greek", country: "Greece" },
  { code: "he", name: "Hebrew", country: "Israel" },
  { code: "fa", name: "Persian", country: "Iran" },
  { code: "sw", name: "Swahili", country: "Kenya" },
  { code: "am", name: "Amharic", country: "Ethiopia" },
  { code: "ne", name: "Nepali", country: "Nepal" },
  { code: "si", name: "Sinhala", country: "Sri Lanka" },
  { code: "my", name: "Burmese", country: "Myanmar" },
  { code: "km", name: "Khmer", country: "Cambodia" },
];

// All supported countries
const ALL_COUNTRIES = [...new Set(ALL_LANGUAGES.map((l) => l.country))];

// Regional name pools for more realistic names
const MALE_NAMES: Record<string, string[]> = {
  india: ["Aarav", "Vihaan", "Aditya", "Arjun", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Shaurya", "Atharv", "Rudra", "Kabir", "Sai", "Dhruv", "Vivaan", "Rohan", "Aryan", "Advait", "Vikram", "Rahul"],
  asia: ["Wei", "Li", "Hiroshi", "Takeshi", "Min-jun", "Seung", "Nguyen", "Thanh", "Somchai", "Budi", "Ahmad", "Reza", "Kenji", "Yuki", "Jin", "Tao", "Hiro", "Ken", "Raj", "Dev"],
  middleEast: ["Ahmed", "Mohammed", "Ali", "Omar", "Hassan", "Youssef", "Ibrahim", "Khalid", "Samir", "Tariq", "Faisal", "Rashid", "Karim", "Nasser", "Walid", "Bilal", "Imran", "Zayed", "Mansour", "Sultan"],
  europe: ["James", "William", "Alexander", "Benjamin", "Lucas", "Oliver", "Henry", "Sebastian", "Theodore", "Felix", "Pierre", "Hans", "Marco", "Carlos", "Andreas", "Erik", "Dmitri", "Pavel", "Andrei", "Stefan"],
  africa: ["Kwame", "Kofi", "Amara", "Jabari", "Tendai", "Themba", "Oluwaseun", "Chidi", "Adebayo", "Mwangi", "Abebe", "Desta", "Haile", "Kibwe", "Zuberi", "Tau", "Simba", "Jelani", "Kato", "Oba"],
  americas: ["Michael", "David", "John", "Robert", "Christopher", "Matthew", "Daniel", "Andrew", "Joshua", "Ryan", "Carlos", "Diego", "Fernando", "Ricardo", "Jorge", "Miguel", "Juan", "Pedro", "Luis", "Antonio"],
};

const FEMALE_NAMES: Record<string, string[]> = {
  india: ["Aadhya", "Ananya", "Diya", "Isha", "Kavya", "Myra", "Navya", "Priya", "Riya", "Saanvi", "Tanvi", "Zara", "Aisha", "Kiara", "Meera", "Nisha", "Pooja", "Shreya", "Tara", "Vanya"],
  asia: ["Mei", "Sakura", "Yuki", "Aoi", "Min-ji", "Soo-yeon", "Linh", "Mai", "Ploy", "Siti", "Fatima", "Afsaneh", "Hanako", "Yuna", "Lin", "Hua", "Hana", "Mika", "Priti", "Anita"],
  middleEast: ["Fatima", "Aisha", "Mariam", "Layla", "Noor", "Sara", "Huda", "Zainab", "Rania", "Yasmin", "Amira", "Dalia", "Farida", "Leila", "Nadira", "Reem", "Salma", "Samira", "Zahra", "Jana"],
  europe: ["Emma", "Olivia", "Sophie", "Charlotte", "Isabella", "Amelia", "Mia", "Harper", "Evelyn", "Ella", "Marie", "Anna", "Elena", "Laura", "Sofia", "Clara", "Lena", "Nina", "Vera", "Ingrid"],
  africa: ["Amara", "Nia", "Zola", "Asha", "Nyah", "Imani", "Kaya", "Thandiwe", "Makena", "Ayana", "Desta", "Ebele", "Femi", "Halima", "Jamila", "Kefilwe", "Lulu", "Malaika", "Nala", "Sekai"],
  americas: ["Emily", "Madison", "Chloe", "Grace", "Lily", "Natalie", "Hannah", "Samantha", "Abigail", "Victoria", "Maria", "Ana", "Isabella", "Valentina", "Camila", "Lucia", "Carmen", "Rosa", "Patricia", "Sandra"],
};

// Get region for a country
function getRegion(country: string): string {
  const regions: Record<string, string> = {
    India: "india",
    China: "asia", Japan: "asia", "South Korea": "asia", Vietnam: "asia",
    Thailand: "asia", Indonesia: "asia", Malaysia: "asia", Philippines: "asia",
    Myanmar: "asia", Cambodia: "asia", Nepal: "asia", "Sri Lanka": "asia",
    UAE: "middleEast", Turkey: "middleEast", Iran: "middleEast", Israel: "middleEast",
    USA: "americas", Spain: "europe", France: "europe", Germany: "europe",
    Portugal: "europe", Italy: "europe", Russia: "europe", Netherlands: "europe",
    Poland: "europe", Ukraine: "europe", Sweden: "europe", Greece: "europe",
    Kenya: "africa", Ethiopia: "africa",
  };
  return regions[country] || "europe";
}

// Get a random name based on gender, region, and index
function getRandomName(gender: "male" | "female", region: string, index: number): string {
  const names = gender === "male" ? MALE_NAMES : FEMALE_NAMES;
  const regionNames = names[region] || names.europe;
  return regionNames[index % regionNames.length];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = "seed" } = await req.json().catch(() => ({}));
    console.log(`Sample users action: ${action}`);

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
      const [menResult, womenResult] = await Promise.all([
        supabaseAdmin.from("sample_men").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("sample_women").select("*", { count: "exact", head: true })
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          menCount: menResult.count || 0,
          womenCount: womenResult.count || 0,
          totalCount: (menResult.count || 0) + (womenResult.count || 0),
          enabled: ((menResult.count || 0) + (womenResult.count || 0)) > 0,
          languageCount: ALL_LANGUAGES.length,
          countryCount: ALL_COUNTRIES.length,
          expectedMen: ALL_LANGUAGES.length * 10,
          expectedWomen: ALL_LANGUAGES.length * 10,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle clear action
    if (action === "clear") {
      console.log("Clearing all sample users from both tables...");
      
      const [menResult, womenResult] = await Promise.all([
        supabaseAdmin.from("sample_men").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabaseAdmin.from("sample_women").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      ]);

      if (menResult.error) throw menResult.error;
      if (womenResult.error) throw womenResult.error;

      console.log("All sample users cleared from both tables");
      return new Response(
        JSON.stringify({
          success: true,
          message: "All sample users have been deleted from both tables",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle seed action
    console.log(`Seeding sample users for ${ALL_LANGUAGES.length} languages into separate tables...`);
    
    const results = {
      menCreated: 0,
      womenCreated: 0,
      errors: [] as string[],
      languages: 0,
    };

    // First, clear existing sample users from both tables
    await Promise.all([
      supabaseAdmin.from("sample_men").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabaseAdmin.from("sample_women").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    ]);

    // Batch insert for better performance
    const menToInsert: any[] = [];
    const womenToInsert: any[] = [];

    // Create sample users for each language (10 men + 10 women per language)
    for (const lang of ALL_LANGUAGES) {
      const region = getRegion(lang.country);
      
      // Create 10 men per language
      for (let i = 0; i < 10; i++) {
        const name = getRandomName("male", region, i);
        const age = 24 + Math.floor(Math.random() * 12); // 24-35
        
        menToInsert.push({
          name: `${name} ${lang.name.substring(0, 2)}${i + 1}`,
          age,
          language: lang.name,
          country: lang.country,
          bio: `Hi, I'm a ${lang.name} speaker from ${lang.country}. Looking for meaningful connections!`,
          is_active: true,
          is_online: true,
        });
      }

      // Create 10 women per language
      for (let i = 0; i < 10; i++) {
        const name = getRandomName("female", region, i);
        const age = 21 + Math.floor(Math.random() * 10); // 21-30
        
        womenToInsert.push({
          name: `${name} ${lang.name.substring(0, 2)}${i + 1}`,
          age,
          language: lang.name,
          country: lang.country,
          bio: `Hello! I speak ${lang.name} and I'm from ${lang.country}. Let's chat!`,
          is_active: true,
          is_online: true,
        });
      }

      results.languages++;
    }

    // Insert men in batches of 100
    const batchSize = 100;
    for (let i = 0; i < menToInsert.length; i += batchSize) {
      const batch = menToInsert.slice(i, i + batchSize);
      const { error } = await supabaseAdmin.from("sample_men").insert(batch);
      
      if (error) {
        console.error(`Error inserting men batch ${i / batchSize + 1}:`, error.message);
        results.errors.push(`Men batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        results.menCreated += batch.length;
      }
    }

    // Insert women in batches of 100
    for (let i = 0; i < womenToInsert.length; i += batchSize) {
      const batch = womenToInsert.slice(i, i + batchSize);
      const { error } = await supabaseAdmin.from("sample_women").insert(batch);
      
      if (error) {
        console.error(`Error inserting women batch ${i / batchSize + 1}:`, error.message);
        results.errors.push(`Women batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        results.womenCreated += batch.length;
      }
    }

    console.log(`Seeding completed. Created ${results.menCreated} men and ${results.womenCreated} women for ${results.languages} languages`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${results.menCreated} men and ${results.womenCreated} women for ${results.languages} languages`,
        results: {
          created: results.menCreated + results.womenCreated,
          menCreated: results.menCreated,
          womenCreated: results.womenCreated,
          languages: results.languages,
          countries: ALL_COUNTRIES.length,
          errors: results.errors.length,
          menPerLanguage: 10,
          womenPerLanguage: 10,
          allOnline: true,
        },
        languageList: ALL_LANGUAGES.map(l => l.name),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Sample users error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
