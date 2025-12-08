import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// All NLLB-200 supported languages for sample women
const ALL_NLLB200_LANGUAGES = [
  // Indian Languages (22)
  { code: "hin_Deva", name: "Hindi", country: "India", region: "india" },
  { code: "ben_Beng", name: "Bengali", country: "India", region: "india" },
  { code: "tel_Telu", name: "Telugu", country: "India", region: "india" },
  { code: "tam_Taml", name: "Tamil", country: "India", region: "india" },
  { code: "mar_Deva", name: "Marathi", country: "India", region: "india" },
  { code: "guj_Gujr", name: "Gujarati", country: "India", region: "india" },
  { code: "kan_Knda", name: "Kannada", country: "India", region: "india" },
  { code: "mal_Mlym", name: "Malayalam", country: "India", region: "india" },
  { code: "pan_Guru", name: "Punjabi", country: "India", region: "india" },
  { code: "ory_Orya", name: "Odia", country: "India", region: "india" },
  { code: "asm_Beng", name: "Assamese", country: "India", region: "india" },
  { code: "npi_Deva", name: "Nepali", country: "Nepal", region: "india" },
  { code: "urd_Arab", name: "Urdu", country: "India", region: "india" },
  { code: "gom_Deva", name: "Konkani", country: "India", region: "india" },
  { code: "mai_Deva", name: "Maithili", country: "India", region: "india" },
  { code: "sat_Olck", name: "Santali", country: "India", region: "india" },
  { code: "brx_Deva", name: "Bodo", country: "India", region: "india" },
  { code: "doi_Deva", name: "Dogri", country: "India", region: "india" },
  { code: "kas_Arab", name: "Kashmiri", country: "India", region: "india" },
  { code: "snd_Arab", name: "Sindhi", country: "India", region: "india" },
  { code: "mni_Beng", name: "Manipuri", country: "India", region: "india" },
  { code: "sin_Sinh", name: "Sinhala", country: "Sri Lanka", region: "india" },
  
  // Major World Languages
  { code: "eng_Latn", name: "English", country: "USA", region: "americas" },
  { code: "spa_Latn", name: "Spanish", country: "Spain", region: "europe" },
  { code: "fra_Latn", name: "French", country: "France", region: "europe" },
  { code: "deu_Latn", name: "German", country: "Germany", region: "europe" },
  { code: "por_Latn", name: "Portuguese", country: "Portugal", region: "europe" },
  { code: "ita_Latn", name: "Italian", country: "Italy", region: "europe" },
  { code: "nld_Latn", name: "Dutch", country: "Netherlands", region: "europe" },
  { code: "rus_Cyrl", name: "Russian", country: "Russia", region: "europe" },
  { code: "pol_Latn", name: "Polish", country: "Poland", region: "europe" },
  { code: "ukr_Cyrl", name: "Ukrainian", country: "Ukraine", region: "europe" },
  
  // East Asian Languages
  { code: "zho_Hans", name: "Chinese (Simplified)", country: "China", region: "asia" },
  { code: "zho_Hant", name: "Chinese (Traditional)", country: "Taiwan", region: "asia" },
  { code: "jpn_Jpan", name: "Japanese", country: "Japan", region: "asia" },
  { code: "kor_Hang", name: "Korean", country: "South Korea", region: "asia" },
  { code: "vie_Latn", name: "Vietnamese", country: "Vietnam", region: "asia" },
  
  // Southeast Asian Languages
  { code: "tha_Thai", name: "Thai", country: "Thailand", region: "asia" },
  { code: "ind_Latn", name: "Indonesian", country: "Indonesia", region: "asia" },
  { code: "zsm_Latn", name: "Malay", country: "Malaysia", region: "asia" },
  { code: "tgl_Latn", name: "Tagalog", country: "Philippines", region: "asia" },
  { code: "ceb_Latn", name: "Cebuano", country: "Philippines", region: "asia" },
  { code: "mya_Mymr", name: "Burmese", country: "Myanmar", region: "asia" },
  { code: "khm_Khmr", name: "Khmer", country: "Cambodia", region: "asia" },
  { code: "lao_Laoo", name: "Lao", country: "Laos", region: "asia" },
  { code: "jav_Latn", name: "Javanese", country: "Indonesia", region: "asia" },
  
  // Middle Eastern Languages
  { code: "arb_Arab", name: "Arabic", country: "UAE", region: "middleEast" },
  { code: "arz_Arab", name: "Egyptian Arabic", country: "Egypt", region: "middleEast" },
  { code: "pes_Arab", name: "Persian", country: "Iran", region: "middleEast" },
  { code: "tur_Latn", name: "Turkish", country: "Turkey", region: "middleEast" },
  { code: "heb_Hebr", name: "Hebrew", country: "Israel", region: "middleEast" },
  { code: "kur_Arab", name: "Kurdish (Sorani)", country: "Iraq", region: "middleEast" },
  { code: "pbt_Arab", name: "Pashto", country: "Afghanistan", region: "middleEast" },
  { code: "azj_Latn", name: "Azerbaijani", country: "Azerbaijan", region: "middleEast" },
  
  // African Languages
  { code: "swh_Latn", name: "Swahili", country: "Kenya", region: "africa" },
  { code: "amh_Ethi", name: "Amharic", country: "Ethiopia", region: "africa" },
  { code: "yor_Latn", name: "Yoruba", country: "Nigeria", region: "africa" },
  { code: "ibo_Latn", name: "Igbo", country: "Nigeria", region: "africa" },
  { code: "hau_Latn", name: "Hausa", country: "Nigeria", region: "africa" },
  { code: "zul_Latn", name: "Zulu", country: "South Africa", region: "africa" },
  { code: "xho_Latn", name: "Xhosa", country: "South Africa", region: "africa" },
  { code: "afr_Latn", name: "Afrikaans", country: "South Africa", region: "africa" },
  { code: "som_Latn", name: "Somali", country: "Somalia", region: "africa" },
  { code: "orm_Latn", name: "Oromo", country: "Ethiopia", region: "africa" },
  
  // European Languages
  { code: "ell_Grek", name: "Greek", country: "Greece", region: "europe" },
  { code: "ces_Latn", name: "Czech", country: "Czech Republic", region: "europe" },
  { code: "ron_Latn", name: "Romanian", country: "Romania", region: "europe" },
  { code: "hun_Latn", name: "Hungarian", country: "Hungary", region: "europe" },
  { code: "swe_Latn", name: "Swedish", country: "Sweden", region: "europe" },
  { code: "dan_Latn", name: "Danish", country: "Denmark", region: "europe" },
  { code: "fin_Latn", name: "Finnish", country: "Finland", region: "europe" },
  { code: "nob_Latn", name: "Norwegian", country: "Norway", region: "europe" },
  { code: "cat_Latn", name: "Catalan", country: "Spain", region: "europe" },
  { code: "hrv_Latn", name: "Croatian", country: "Croatia", region: "europe" },
  { code: "srp_Cyrl", name: "Serbian", country: "Serbia", region: "europe" },
  { code: "slk_Latn", name: "Slovak", country: "Slovakia", region: "europe" },
  { code: "slv_Latn", name: "Slovenian", country: "Slovenia", region: "europe" },
  { code: "bul_Cyrl", name: "Bulgarian", country: "Bulgaria", region: "europe" },
  { code: "lit_Latn", name: "Lithuanian", country: "Lithuania", region: "europe" },
  { code: "lvs_Latn", name: "Latvian", country: "Latvia", region: "europe" },
  { code: "est_Latn", name: "Estonian", country: "Estonia", region: "europe" },
  { code: "als_Latn", name: "Albanian", country: "Albania", region: "europe" },
  
  // Central Asian Languages
  { code: "kat_Geor", name: "Georgian", country: "Georgia", region: "europe" },
  { code: "hye_Armn", name: "Armenian", country: "Armenia", region: "europe" },
  { code: "kaz_Cyrl", name: "Kazakh", country: "Kazakhstan", region: "asia" },
  { code: "uzn_Latn", name: "Uzbek", country: "Uzbekistan", region: "asia" },
  { code: "kir_Cyrl", name: "Kyrgyz", country: "Kyrgyzstan", region: "asia" },
  { code: "tgk_Cyrl", name: "Tajik", country: "Tajikistan", region: "asia" },
  { code: "tuk_Latn", name: "Turkmen", country: "Turkmenistan", region: "asia" },
  { code: "khk_Cyrl", name: "Mongolian", country: "Mongolia", region: "asia" },
  
  // Pacific Languages
  { code: "mri_Latn", name: "Maori", country: "New Zealand", region: "asia" },
  { code: "smo_Latn", name: "Samoan", country: "Samoa", region: "asia" },
  { code: "ton_Latn", name: "Tongan", country: "Tonga", region: "asia" },
  { code: "fij_Latn", name: "Fijian", country: "Fiji", region: "asia" },
  
  // Americas
  { code: "hat_Latn", name: "Haitian Creole", country: "Haiti", region: "americas" },
  { code: "ayr_Latn", name: "Aymara", country: "Bolivia", region: "americas" },
  { code: "quy_Latn", name: "Quechua", country: "Peru", region: "americas" },
  { code: "grn_Latn", name: "Guarani", country: "Paraguay", region: "americas" },
];

// Regional female name pools
const FEMALE_NAMES: Record<string, string[]> = {
  india: ["Aadhya", "Ananya", "Diya", "Isha", "Kavya", "Myra", "Navya", "Priya", "Riya", "Saanvi", "Tanvi", "Zara", "Aisha", "Kiara", "Meera", "Nisha", "Pooja", "Shreya", "Tara", "Vanya", "Aarushi", "Avni", "Bhavna", "Chitra", "Deepa", "Esha", "Falguni", "Gauri", "Hema", "Ishita"],
  asia: ["Mei", "Sakura", "Yuki", "Aoi", "Min-ji", "Soo-yeon", "Linh", "Mai", "Ploy", "Siti", "Fatima", "Afsaneh", "Hanako", "Yuna", "Lin", "Hua", "Hana", "Mika", "Priti", "Anita", "Akiko", "Chika", "Emi", "Fumiko", "Hiroko", "Keiko", "Mariko", "Noriko", "Reiko", "Yoko"],
  middleEast: ["Fatima", "Aisha", "Mariam", "Layla", "Noor", "Sara", "Huda", "Zainab", "Rania", "Yasmin", "Amira", "Dalia", "Farida", "Leila", "Nadira", "Reem", "Salma", "Samira", "Zahra", "Jana", "Hala", "Lama", "Maya", "Nadia", "Rana", "Ruba", "Sawsan", "Taghreed", "Wafa", "Yara"],
  europe: ["Emma", "Olivia", "Sophie", "Charlotte", "Isabella", "Amelia", "Mia", "Harper", "Evelyn", "Ella", "Marie", "Anna", "Elena", "Laura", "Sofia", "Clara", "Lena", "Nina", "Vera", "Ingrid", "Astrid", "Birgit", "Camilla", "Dagny", "Elsa", "Freja", "Greta", "Helga", "Ida", "Julia"],
  africa: ["Amara", "Nia", "Zola", "Asha", "Nyah", "Imani", "Kaya", "Thandiwe", "Makena", "Ayana", "Desta", "Ebele", "Femi", "Halima", "Jamila", "Kefilwe", "Lulu", "Malaika", "Nala", "Sekai", "Adaeze", "Busara", "Chiamaka", "Dumisani", "Eshe", "Folake", "Gimbiya", "Hasina", "Ife", "Jendayi"],
  americas: ["Emily", "Madison", "Chloe", "Grace", "Lily", "Natalie", "Hannah", "Samantha", "Abigail", "Victoria", "Maria", "Ana", "Isabella", "Valentina", "Camila", "Lucia", "Carmen", "Rosa", "Patricia", "Sandra", "Alejandra", "Beatriz", "Catalina", "Daniela", "Elena", "Fernanda", "Gabriela", "Jimena", "Karla", "Lorena"],
};

// Get a female name based on region and index
function getFemaleName(region: string, index: number): string {
  const names = FEMALE_NAMES[region] || FEMALE_NAMES.europe;
  return names[index % names.length];
}

serve(async (req) => {
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
          languageCount: ALL_NLLB200_LANGUAGES.length,
          expectedWomen: ALL_NLLB200_LANGUAGES.length * 3,
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

    // Handle seed action - Generate 3 women per NLLB-200 language
    console.log(`Seeding ${ALL_NLLB200_LANGUAGES.length} languages × 3 women = ${ALL_NLLB200_LANGUAGES.length * 3} sample women...`);
    
    const results = {
      womenCreated: 0,
      errors: [] as string[],
      languages: 0,
    };

    // First, clear existing sample women
    await supabaseAdmin.from("sample_women").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Generate women for all NLLB-200 languages
    const womenToInsert: any[] = [];

    for (const lang of ALL_NLLB200_LANGUAGES) {
      // Create 3 women per language
      for (let i = 0; i < 3; i++) {
        const name = getFemaleName(lang.region, i + (results.languages * 3));
        const age = 21 + Math.floor(Math.random() * 10); // 21-30
        
        womenToInsert.push({
          name: `${name} ${lang.name.substring(0, 3)}${i + 1}`,
          age,
          language: lang.name,
          country: lang.country,
          bio: `Hello! I speak ${lang.name} and I'm from ${lang.country}. Looking forward to chatting!`,
          is_active: true,
          is_online: true,
        });
      }
      results.languages++;
    }

    // Insert women in batches of 100
    const batchSize = 100;
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

    console.log(`Seeding completed. Created ${results.womenCreated} women for ${results.languages} NLLB-200 languages`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${results.womenCreated} sample women for ${results.languages} NLLB-200 languages (3 per language)`,
        results: {
          womenCreated: results.womenCreated,
          languages: results.languages,
          womenPerLanguage: 3,
          allOnline: true,
          errors: results.errors.length,
        },
        languageList: ALL_NLLB200_LANGUAGES.map(l => l.name),
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
