/**
 * seed-sample-users Edge Function
 * Creates mock users with profiles per language for testing.
 * - 3 men and 3 women per language (all world languages)
 * - All users are online
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

// Complete world languages list (ISO 639-1 + Indian + NLLB-200)
const ALL_LANGUAGES = [
  // Major World Languages
  { code: "en", name: "English", country: "United States" },
  { code: "es", name: "Spanish", country: "Spain" },
  { code: "fr", name: "French", country: "France" },
  { code: "de", name: "German", country: "Germany" },
  { code: "pt", name: "Portuguese", country: "Brazil" },
  { code: "it", name: "Italian", country: "Italy" },
  { code: "nl", name: "Dutch", country: "Netherlands" },
  { code: "ru", name: "Russian", country: "Russia" },
  { code: "pl", name: "Polish", country: "Poland" },
  { code: "uk", name: "Ukrainian", country: "Ukraine" },
  { code: "cs", name: "Czech", country: "Czechia" },
  { code: "sk", name: "Slovak", country: "Slovakia" },
  { code: "hu", name: "Hungarian", country: "Hungary" },
  { code: "ro", name: "Romanian", country: "Romania" },
  { code: "bg", name: "Bulgarian", country: "Bulgaria" },
  { code: "hr", name: "Croatian", country: "Croatia" },
  { code: "sr", name: "Serbian", country: "Serbia" },
  { code: "sl", name: "Slovenian", country: "Slovenia" },
  { code: "bs", name: "Bosnian", country: "Bosnia and Herzegovina" },
  { code: "mk", name: "Macedonian", country: "North Macedonia" },
  { code: "sq", name: "Albanian", country: "Albania" },
  { code: "el", name: "Greek", country: "Greece" },
  { code: "tr", name: "Turkish", country: "Turkey" },
  { code: "az", name: "Azerbaijani", country: "Azerbaijan" },
  { code: "ka", name: "Georgian", country: "Georgia" },
  { code: "hy", name: "Armenian", country: "Armenia" },
  { code: "he", name: "Hebrew", country: "Israel" },
  { code: "ar", name: "Arabic", country: "Saudi Arabia" },
  { code: "fa", name: "Persian", country: "Iran" },
  { code: "ur", name: "Urdu", country: "Pakistan" },
  { code: "ps", name: "Pashto", country: "Afghanistan" },
  { code: "ku", name: "Kurdish", country: "Iraq" },
  
  // Indian Languages (All 22 Scheduled + Regional)
  { code: "hi", name: "Hindi", country: "India" },
  { code: "bn", name: "Bengali", country: "India" },
  { code: "te", name: "Telugu", country: "India" },
  { code: "mr", name: "Marathi", country: "India" },
  { code: "ta", name: "Tamil", country: "India" },
  { code: "gu", name: "Gujarati", country: "India" },
  { code: "kn", name: "Kannada", country: "India" },
  { code: "ml", name: "Malayalam", country: "India" },
  { code: "pa", name: "Punjabi", country: "India" },
  { code: "or", name: "Odia", country: "India" },
  { code: "as", name: "Assamese", country: "India" },
  { code: "mai", name: "Maithili", country: "India" },
  { code: "bho", name: "Bhojpuri", country: "India" },
  { code: "raj", name: "Rajasthani", country: "India" },
  { code: "ks", name: "Kashmiri", country: "India" },
  { code: "sd", name: "Sindhi", country: "India" },
  { code: "kok", name: "Konkani", country: "India" },
  { code: "doi", name: "Dogri", country: "India" },
  { code: "mni", name: "Manipuri", country: "India" },
  { code: "sat", name: "Santali", country: "India" },
  { code: "brx", name: "Bodo", country: "India" },
  { code: "ne", name: "Nepali", country: "Nepal" },
  { code: "si", name: "Sinhala", country: "Sri Lanka" },
  { code: "dv", name: "Divehi", country: "Maldives" },
  { code: "tcy", name: "Tulu", country: "India" },
  { code: "gom", name: "Goan Konkani", country: "India" },
  { code: "hne", name: "Chhattisgarhi", country: "India" },
  { code: "mag", name: "Magahi", country: "India" },
  { code: "awa", name: "Awadhi", country: "India" },
  { code: "bgc", name: "Haryanvi", country: "India" },
  { code: "mar", name: "Marwari", country: "India" },
  
  // East Asian Languages
  { code: "zh", name: "Chinese", country: "China" },
  { code: "ja", name: "Japanese", country: "Japan" },
  { code: "ko", name: "Korean", country: "South Korea" },
  { code: "mn", name: "Mongolian", country: "Mongolia" },
  { code: "bo", name: "Tibetan", country: "China" },
  
  // Southeast Asian Languages
  { code: "vi", name: "Vietnamese", country: "Vietnam" },
  { code: "th", name: "Thai", country: "Thailand" },
  { code: "lo", name: "Lao", country: "Laos" },
  { code: "my", name: "Burmese", country: "Myanmar" },
  { code: "km", name: "Khmer", country: "Cambodia" },
  { code: "id", name: "Indonesian", country: "Indonesia" },
  { code: "ms", name: "Malay", country: "Malaysia" },
  { code: "tl", name: "Tagalog", country: "Philippines" },
  { code: "ceb", name: "Cebuano", country: "Philippines" },
  { code: "ilo", name: "Ilocano", country: "Philippines" },
  { code: "jv", name: "Javanese", country: "Indonesia" },
  { code: "su", name: "Sundanese", country: "Indonesia" },
  { code: "ban", name: "Balinese", country: "Indonesia" },
  { code: "min", name: "Minangkabau", country: "Indonesia" },
  
  // African Languages
  { code: "sw", name: "Swahili", country: "Kenya" },
  { code: "am", name: "Amharic", country: "Ethiopia" },
  { code: "ha", name: "Hausa", country: "Nigeria" },
  { code: "yo", name: "Yoruba", country: "Nigeria" },
  { code: "ig", name: "Igbo", country: "Nigeria" },
  { code: "zu", name: "Zulu", country: "South Africa" },
  { code: "xh", name: "Xhosa", country: "South Africa" },
  { code: "af", name: "Afrikaans", country: "South Africa" },
  { code: "st", name: "Sotho", country: "South Africa" },
  { code: "tn", name: "Tswana", country: "Botswana" },
  { code: "sn", name: "Shona", country: "Zimbabwe" },
  { code: "rw", name: "Kinyarwanda", country: "Rwanda" },
  { code: "rn", name: "Kirundi", country: "Burundi" },
  { code: "lg", name: "Luganda", country: "Uganda" },
  { code: "om", name: "Oromo", country: "Ethiopia" },
  { code: "ti", name: "Tigrinya", country: "Eritrea" },
  { code: "so", name: "Somali", country: "Somalia" },
  { code: "mg", name: "Malagasy", country: "Madagascar" },
  { code: "wo", name: "Wolof", country: "Senegal" },
  { code: "ff", name: "Fulah", country: "Nigeria" },
  { code: "bm", name: "Bambara", country: "Mali" },
  { code: "ak", name: "Akan", country: "Ghana" },
  { code: "tw", name: "Twi", country: "Ghana" },
  { code: "ee", name: "Ewe", country: "Ghana" },
  { code: "ki", name: "Kikuyu", country: "Kenya" },
  { code: "ln", name: "Lingala", country: "Congo" },
  { code: "kg", name: "Kongo", country: "Congo" },
  { code: "ny", name: "Chichewa", country: "Malawi" },
  
  // Nordic Languages
  { code: "sv", name: "Swedish", country: "Sweden" },
  { code: "no", name: "Norwegian", country: "Norway" },
  { code: "da", name: "Danish", country: "Denmark" },
  { code: "fi", name: "Finnish", country: "Finland" },
  { code: "is", name: "Icelandic", country: "Iceland" },
  { code: "fo", name: "Faroese", country: "Faroe Islands" },
  
  // Baltic Languages
  { code: "lt", name: "Lithuanian", country: "Lithuania" },
  { code: "lv", name: "Latvian", country: "Latvia" },
  { code: "et", name: "Estonian", country: "Estonia" },
  
  // Celtic Languages
  { code: "ga", name: "Irish", country: "Ireland" },
  { code: "gd", name: "Scottish Gaelic", country: "United Kingdom" },
  { code: "cy", name: "Welsh", country: "United Kingdom" },
  { code: "br", name: "Breton", country: "France" },
  
  // Central Asian Languages
  { code: "kk", name: "Kazakh", country: "Kazakhstan" },
  { code: "uz", name: "Uzbek", country: "Uzbekistan" },
  { code: "ky", name: "Kyrgyz", country: "Kyrgyzstan" },
  { code: "tg", name: "Tajik", country: "Tajikistan" },
  { code: "tk", name: "Turkmen", country: "Turkmenistan" },
  { code: "tt", name: "Tatar", country: "Russia" },
  { code: "ba", name: "Bashkir", country: "Russia" },
  
  // Pacific Languages
  { code: "mi", name: "Maori", country: "New Zealand" },
  { code: "haw", name: "Hawaiian", country: "United States" },
  { code: "sm", name: "Samoan", country: "Samoa" },
  { code: "to", name: "Tongan", country: "Tonga" },
  { code: "fj", name: "Fijian", country: "Fiji" },
  
  // American Languages
  { code: "qu", name: "Quechua", country: "Peru" },
  { code: "ay", name: "Aymara", country: "Bolivia" },
  { code: "gn", name: "Guarani", country: "Paraguay" },
  { code: "ht", name: "Haitian Creole", country: "Haiti" },
  { code: "nv", name: "Navajo", country: "United States" },
  
  // Additional European Languages
  { code: "eu", name: "Basque", country: "Spain" },
  { code: "ca", name: "Catalan", country: "Spain" },
  { code: "gl", name: "Galician", country: "Spain" },
  { code: "oc", name: "Occitan", country: "France" },
  { code: "co", name: "Corsican", country: "France" },
  { code: "sc", name: "Sardinian", country: "Italy" },
  { code: "lb", name: "Luxembourgish", country: "Luxembourg" },
  { code: "mt", name: "Maltese", country: "Malta" },
  { code: "be", name: "Belarusian", country: "Belarus" },
  
  // Arabic Dialects
  { code: "arz", name: "Egyptian Arabic", country: "Egypt" },
  { code: "ary", name: "Moroccan Arabic", country: "Morocco" },
  { code: "aeb", name: "Tunisian Arabic", country: "Tunisia" },
  { code: "arq", name: "Algerian Arabic", country: "Algeria" },
  { code: "acm", name: "Iraqi Arabic", country: "Iraq" },
  { code: "apc", name: "Levantine Arabic", country: "Lebanon" },
  { code: "apd", name: "Sudanese Arabic", country: "Sudan" },
  
  // More Asian Languages
  { code: "ug", name: "Uyghur", country: "China" },
  { code: "ii", name: "Yi", country: "China" },
  { code: "za", name: "Zhuang", country: "China" },
];

// All world countries
const ALL_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czechia", "Denmark", "Djibouti", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
  "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran",
  "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
  "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Samoa", "San Marino", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// Male and female names per region
const MALE_NAMES = {
  indian: ["Raj", "Arjun", "Vikram", "Aditya", "Rohan", "Karthik", "Sanjay", "Deepak", "Amit", "Ravi", "Suresh", "Mahesh"],
  western: ["James", "Michael", "David", "Robert", "John", "William", "Richard", "Thomas", "Charles", "Daniel", "Matthew", "Andrew"],
  asian: ["Wei", "Takeshi", "Min-Jun", "Nguyen", "Somchai", "Kenji", "Hiroshi", "Chen", "Li", "Park", "Kim", "Tran"],
  middleeast: ["Ahmad", "Mohammad", "Ali", "Hassan", "Omar", "Ibrahim", "Yusuf", "Khalid", "Tariq", "Mustafa", "Rashid", "Faisal"],
  african: ["Kwame", "Sipho", "Oluwaseun", "Kofi", "Nkosi", "Juma", "Abdul", "Malik", "Chidi", "Emeka", "Tunde", "Sekou"],
  latin: ["Carlos", "Miguel", "José", "Juan", "Pedro", "Luis", "Diego", "Rafael", "Antonio", "Fernando", "Ricardo", "Pablo"],
};

const FEMALE_NAMES = {
  indian: ["Priya", "Ananya", "Divya", "Sneha", "Kavitha", "Meera", "Lakshmi", "Pooja", "Nisha", "Anjali", "Deepika", "Sunita"],
  western: ["Emma", "Olivia", "Sophia", "Isabella", "Charlotte", "Amelia", "Mia", "Harper", "Evelyn", "Abigail", "Emily", "Grace"],
  asian: ["Sakura", "Mei", "Soo-Yeon", "Linh", "Ploy", "Yuki", "Hana", "Xiao", "Min", "Ji-Yeon", "Nguyet", "Mai"],
  middleeast: ["Fatima", "Zahra", "Aisha", "Nur", "Layla", "Mariam", "Sara", "Hana", "Yasmin", "Rania", "Noor", "Amira"],
  african: ["Amara", "Zuri", "Adaeze", "Nia", "Thandi", "Ayesha", "Halima", "Amina", "Khadija", "Chidinma", "Blessing", "Wanjiku"],
  latin: ["Maria", "Sofia", "Valentina", "Camila", "Lucia", "Isabella", "Gabriela", "Ana", "Elena", "Paula", "Carmen", "Rosa"],
};

function getRegion(country: string): string {
  const indianCountries = ["India", "Nepal", "Pakistan", "Sri Lanka", "Bangladesh", "Bhutan", "Maldives"];
  const asianCountries = ["China", "Japan", "South Korea", "North Korea", "Vietnam", "Thailand", "Indonesia", "Malaysia", "Philippines", "Cambodia", "Laos", "Myanmar", "Singapore", "Taiwan", "Mongolia", "Brunei"];
  const middleeastCountries = ["Saudi Arabia", "Iran", "Iraq", "Israel", "Turkey", "Egypt", "Jordan", "Lebanon", "Syria", "Yemen", "Oman", "Kuwait", "Qatar", "Bahrain", "United Arab Emirates", "Afghanistan", "Azerbaijan", "Armenia", "Georgia"];
  const africanCountries = ["Kenya", "South Africa", "Nigeria", "Ethiopia", "Ghana", "Tanzania", "Uganda", "Rwanda", "Senegal", "Cameroon", "Ivory Coast", "Zimbabwe", "Zambia", "Morocco", "Algeria", "Tunisia", "Libya", "Sudan", "Congo", "Angola", "Mozambique", "Madagascar", "Mali", "Burkina Faso", "Niger", "Malawi", "Somalia", "Eritrea", "Botswana", "Namibia"];
  const latinCountries = ["Mexico", "Brazil", "Argentina", "Colombia", "Peru", "Chile", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Cuba", "Dominican Republic", "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panama", "Puerto Rico", "Haiti"];
  
  if (indianCountries.includes(country)) return "indian";
  if (asianCountries.includes(country)) return "asian";
  if (middleeastCountries.includes(country)) return "middleeast";
  if (africanCountries.includes(country)) return "african";
  if (latinCountries.includes(country)) return "latin";
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
          countryCount: ALL_COUNTRIES.length,
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
      errors: [] as string[],
      languages: 0,
    };

    // First, clear existing sample users
    await supabaseAdmin
      .from("sample_users")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Batch insert for better performance
    const usersToInsert: any[] = [];

    // Create mock users for each language
    for (const lang of ALL_LANGUAGES) {
      const region = getRegion(lang.country);
      
      // Create 3 men per language
      for (let i = 0; i < 3; i++) {
        const name = getRandomName("male", region, i);
        const age = 25 + Math.floor(Math.random() * 15);
        
        usersToInsert.push({
          name: `${name} ${lang.name.substring(0, 3)}${i + 1}`,
          age,
          gender: "male",
          language: lang.name,
          country: lang.country,
          bio: `Hi, I'm a ${lang.name} speaker from ${lang.country}. Looking for meaningful connections!`,
          is_active: true,
          is_online: true,
        });
      }

      // Create 3 women per language
      for (let i = 0; i < 3; i++) {
        const name = getRandomName("female", region, i);
        const age = 22 + Math.floor(Math.random() * 12);
        
        usersToInsert.push({
          name: `${name} ${lang.name.substring(0, 3)}${i + 1}`,
          age,
          gender: "female",
          language: lang.name,
          country: lang.country,
          bio: `Hello! I speak ${lang.name} and I'm from ${lang.country}. Let's chat!`,
          is_active: true,
          is_online: true,
        });
      }

      results.languages++;
    }

    // Insert in batches of 100 for better performance
    const batchSize = 100;
    for (let i = 0; i < usersToInsert.length; i += batchSize) {
      const batch = usersToInsert.slice(i, i + batchSize);
      const { error } = await supabaseAdmin.from("sample_users").insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
        results.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        results.created += batch.length;
      }
    }

    console.log(`Seeding completed. Created ${results.created} users for ${results.languages} languages`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${results.created} mock users for ${results.languages} languages`,
        results: {
          created: results.created,
          languages: results.languages,
          countries: ALL_COUNTRIES.length,
          errors: results.errors.length,
          menPerLanguage: 3,
          womenPerLanguage: 3,
          allOnline: true,
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
