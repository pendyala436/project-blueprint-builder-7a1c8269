/**
 * seed-sample-users Edge Function
 * Creates mock users with profiles per language for testing.
 * - 3 men and 3 women per language (400+ world languages)
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

// Complete 400+ world languages list (ISO 639-1 + Indian + NLLB-200 + Regional + Minority)
const ALL_LANGUAGES = [
  // ==================== MAJOR WORLD LANGUAGES ====================
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

  // ==================== SOUTH ASIAN LANGUAGES (60+) ====================
  // Indian Scheduled Languages (22)
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
  { code: "ks", name: "Kashmiri", country: "India" },
  { code: "sd", name: "Sindhi", country: "India" },
  { code: "kok", name: "Konkani", country: "India" },
  { code: "doi", name: "Dogri", country: "India" },
  { code: "mni", name: "Manipuri", country: "India" },
  { code: "sat", name: "Santali", country: "India" },
  { code: "brx", name: "Bodo", country: "India" },
  { code: "ne", name: "Nepali", country: "Nepal" },
  { code: "sa", name: "Sanskrit", country: "India" },
  
  // Indian Regional Languages (40+)
  { code: "bho", name: "Bhojpuri", country: "India" },
  { code: "raj", name: "Rajasthani", country: "India" },
  { code: "hne", name: "Chhattisgarhi", country: "India" },
  { code: "mag", name: "Magahi", country: "India" },
  { code: "awa", name: "Awadhi", country: "India" },
  { code: "bgc", name: "Haryanvi", country: "India" },
  { code: "mar", name: "Marwari", country: "India" },
  { code: "kfy", name: "Kumaoni", country: "India" },
  { code: "gbm", name: "Garhwali", country: "India" },
  { code: "tcy", name: "Tulu", country: "India" },
  { code: "gom", name: "Goan Konkani", country: "India" },
  { code: "lus", name: "Mizo", country: "India" },
  { code: "kha", name: "Khasi", country: "India" },
  { code: "grt", name: "Garo", country: "India" },
  { code: "njo", name: "Ao Naga", country: "India" },
  { code: "njz", name: "Angami Naga", country: "India" },
  { code: "lep", name: "Lepcha", country: "India" },
  { code: "new", name: "Newari", country: "Nepal" },
  { code: "sck", name: "Sadri", country: "India" },
  { code: "hoc", name: "Ho", country: "India" },
  { code: "kru", name: "Kurukh", country: "India" },
  { code: "mun", name: "Mundari", country: "India" },
  { code: "bhb", name: "Bhili", country: "India" },
  { code: "gon", name: "Gondi", country: "India" },
  { code: "kfb", name: "Kolami", country: "India" },
  { code: "nag", name: "Nagpuri", country: "India" },
  { code: "bfy", name: "Bagheli", country: "India" },
  { code: "bns", name: "Bundeli", country: "India" },
  { code: "hoj", name: "Hadothi", country: "India" },
  { code: "wbr", name: "Wagdi", country: "India" },
  { code: "rkt", name: "Rangpuri", country: "Bangladesh" },
  { code: "syl", name: "Sylheti", country: "Bangladesh" },
  { code: "ctg", name: "Chittagonian", country: "Bangladesh" },
  { code: "ccp", name: "Chakma", country: "Bangladesh" },
  { code: "rhg", name: "Rohingya", country: "Myanmar" },
  { code: "dcc", name: "Deccan", country: "India" },
  { code: "kok2", name: "Malvani", country: "India" },
  { code: "pnb", name: "Western Punjabi", country: "Pakistan" },
  { code: "skr", name: "Saraiki", country: "Pakistan" },
  { code: "hnd", name: "Hindko", country: "Pakistan" },
  { code: "bal", name: "Balochi", country: "Pakistan" },
  { code: "bra", name: "Brahui", country: "Pakistan" },
  
  // Other South Asian
  { code: "si", name: "Sinhala", country: "Sri Lanka" },
  { code: "dv", name: "Divehi", country: "Maldives" },
  { code: "dz", name: "Dzongkha", country: "Bhutan" },

  // ==================== EAST ASIAN LANGUAGES ====================
  { code: "zh", name: "Chinese (Mandarin)", country: "China" },
  { code: "yue", name: "Cantonese", country: "Hong Kong" },
  { code: "wuu", name: "Wu Chinese", country: "China" },
  { code: "nan", name: "Min Nan", country: "Taiwan" },
  { code: "hak", name: "Hakka", country: "China" },
  { code: "gan", name: "Gan Chinese", country: "China" },
  { code: "hsn", name: "Xiang Chinese", country: "China" },
  { code: "ja", name: "Japanese", country: "Japan" },
  { code: "ko", name: "Korean", country: "South Korea" },
  { code: "mn", name: "Mongolian", country: "Mongolia" },
  { code: "bo", name: "Tibetan", country: "China" },
  { code: "ug", name: "Uyghur", country: "China" },
  { code: "ii", name: "Yi", country: "China" },
  { code: "za", name: "Zhuang", country: "China" },
  { code: "lis", name: "Lisu", country: "China" },
  { code: "hni", name: "Hani", country: "China" },
  { code: "lhu", name: "Lahu", country: "China" },
  { code: "nxq", name: "Naxi", country: "China" },
  { code: "bai", name: "Bai", country: "China" },
  { code: "twh", name: "Tujia", country: "China" },
  { code: "mia", name: "Miao", country: "China" },
  { code: "zyj", name: "Zhuang (Yongnan)", country: "China" },

  // ==================== SOUTHEAST ASIAN LANGUAGES ====================
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
  { code: "hil", name: "Hiligaynon", country: "Philippines" },
  { code: "war", name: "Waray", country: "Philippines" },
  { code: "pam", name: "Kapampangan", country: "Philippines" },
  { code: "bcl", name: "Bikol", country: "Philippines" },
  { code: "pag", name: "Pangasinan", country: "Philippines" },
  { code: "mdh", name: "Maguindanao", country: "Philippines" },
  { code: "tsg", name: "Tausug", country: "Philippines" },
  { code: "jv", name: "Javanese", country: "Indonesia" },
  { code: "su", name: "Sundanese", country: "Indonesia" },
  { code: "ban", name: "Balinese", country: "Indonesia" },
  { code: "min", name: "Minangkabau", country: "Indonesia" },
  { code: "ace", name: "Acehnese", country: "Indonesia" },
  { code: "bjn", name: "Banjar", country: "Indonesia" },
  { code: "bug", name: "Buginese", country: "Indonesia" },
  { code: "mad", name: "Madurese", country: "Indonesia" },
  { code: "bbc", name: "Batak Toba", country: "Indonesia" },
  { code: "gor", name: "Gorontalo", country: "Indonesia" },
  { code: "mak", name: "Makassar", country: "Indonesia" },
  { code: "shn", name: "Shan", country: "Myanmar" },
  { code: "kac", name: "Kachin", country: "Myanmar" },
  { code: "kjg", name: "Khmu", country: "Laos" },
  { code: "tet", name: "Tetum", country: "Timor-Leste" },

  // ==================== AFRICAN LANGUAGES (100+) ====================
  // East African
  { code: "sw", name: "Swahili", country: "Kenya" },
  { code: "am", name: "Amharic", country: "Ethiopia" },
  { code: "om", name: "Oromo", country: "Ethiopia" },
  { code: "ti", name: "Tigrinya", country: "Eritrea" },
  { code: "so", name: "Somali", country: "Somalia" },
  { code: "rw", name: "Kinyarwanda", country: "Rwanda" },
  { code: "rn", name: "Kirundi", country: "Burundi" },
  { code: "lg", name: "Luganda", country: "Uganda" },
  { code: "nyn", name: "Nyankole", country: "Uganda" },
  { code: "luo", name: "Luo", country: "Kenya" },
  { code: "luy", name: "Luhya", country: "Kenya" },
  { code: "kam", name: "Kamba", country: "Kenya" },
  { code: "ki", name: "Kikuyu", country: "Kenya" },
  { code: "mer", name: "Meru", country: "Kenya" },
  { code: "guz", name: "Gusii", country: "Kenya" },
  { code: "suk", name: "Sukuma", country: "Tanzania" },
  { code: "nym", name: "Nyamwezi", country: "Tanzania" },
  { code: "haq", name: "Haya", country: "Tanzania" },
  { code: "cgg", name: "Chiga", country: "Uganda" },
  { code: "ach", name: "Acholi", country: "Uganda" },
  { code: "lug", name: "Ganda", country: "Uganda" },
  { code: "teo", name: "Teso", country: "Uganda" },
  
  // West African
  { code: "ha", name: "Hausa", country: "Nigeria" },
  { code: "yo", name: "Yoruba", country: "Nigeria" },
  { code: "ig", name: "Igbo", country: "Nigeria" },
  { code: "pcm", name: "Nigerian Pidgin", country: "Nigeria" },
  { code: "ful", name: "Fulani", country: "Nigeria" },
  { code: "efi", name: "Efik", country: "Nigeria" },
  { code: "ibb", name: "Ibibio", country: "Nigeria" },
  { code: "tiv", name: "Tiv", country: "Nigeria" },
  { code: "ijo", name: "Ijaw", country: "Nigeria" },
  { code: "edo", name: "Edo", country: "Nigeria" },
  { code: "bin", name: "Bini", country: "Nigeria" },
  { code: "ish", name: "Igede", country: "Nigeria" },
  { code: "ak", name: "Akan", country: "Ghana" },
  { code: "tw", name: "Twi", country: "Ghana" },
  { code: "fat", name: "Fanti", country: "Ghana" },
  { code: "ee", name: "Ewe", country: "Ghana" },
  { code: "gaa", name: "Ga", country: "Ghana" },
  { code: "dag", name: "Dagbani", country: "Ghana" },
  { code: "kbp", name: "Kabiyè", country: "Togo" },
  { code: "fon", name: "Fon", country: "Benin" },
  { code: "wo", name: "Wolof", country: "Senegal" },
  { code: "ff", name: "Fulah", country: "Senegal" },
  { code: "srr", name: "Serer", country: "Senegal" },
  { code: "jol", name: "Jola", country: "Senegal" },
  { code: "bm", name: "Bambara", country: "Mali" },
  { code: "dyu", name: "Dyula", country: "Ivory Coast" },
  { code: "mos", name: "Mossi", country: "Burkina Faso" },
  { code: "fuv", name: "Nigerian Fulfulde", country: "Nigeria" },
  { code: "kri", name: "Krio", country: "Sierra Leone" },
  { code: "men", name: "Mende", country: "Sierra Leone" },
  { code: "tem", name: "Temne", country: "Sierra Leone" },
  { code: "sus", name: "Susu", country: "Guinea" },
  { code: "mnk", name: "Mandinka", country: "Gambia" },
  
  // Southern African
  { code: "zu", name: "Zulu", country: "South Africa" },
  { code: "xh", name: "Xhosa", country: "South Africa" },
  { code: "af", name: "Afrikaans", country: "South Africa" },
  { code: "st", name: "Sotho", country: "South Africa" },
  { code: "nso", name: "Northern Sotho", country: "South Africa" },
  { code: "tn", name: "Tswana", country: "Botswana" },
  { code: "ts", name: "Tsonga", country: "South Africa" },
  { code: "ss", name: "Swazi", country: "Eswatini" },
  { code: "ve", name: "Venda", country: "South Africa" },
  { code: "nr", name: "Southern Ndebele", country: "South Africa" },
  { code: "sn", name: "Shona", country: "Zimbabwe" },
  { code: "nd", name: "Northern Ndebele", country: "Zimbabwe" },
  { code: "ny", name: "Chichewa", country: "Malawi" },
  { code: "tum", name: "Tumbuka", country: "Malawi" },
  { code: "tog", name: "Tonga", country: "Zambia" },
  { code: "bem", name: "Bemba", country: "Zambia" },
  { code: "lua", name: "Luba-Kasai", country: "Congo" },
  { code: "ln", name: "Lingala", country: "Congo" },
  { code: "kg", name: "Kongo", country: "Congo" },
  { code: "kmb", name: "Kimbundu", country: "Angola" },
  { code: "umb", name: "Umbundu", country: "Angola" },
  { code: "her", name: "Herero", country: "Namibia" },
  { code: "kwn", name: "Kwangali", country: "Namibia" },
  { code: "ndo", name: "Ndonga", country: "Namibia" },
  
  // North African
  { code: "ary", name: "Moroccan Arabic", country: "Morocco" },
  { code: "arq", name: "Algerian Arabic", country: "Algeria" },
  { code: "aeb", name: "Tunisian Arabic", country: "Tunisia" },
  { code: "ayl", name: "Libyan Arabic", country: "Libya" },
  { code: "arz", name: "Egyptian Arabic", country: "Egypt" },
  { code: "acm", name: "Iraqi Arabic", country: "Iraq" },
  { code: "apd", name: "Sudanese Arabic", country: "Sudan" },
  { code: "ber", name: "Berber", country: "Morocco" },
  { code: "tzm", name: "Central Atlas Tamazight", country: "Morocco" },
  { code: "shi", name: "Tachelhit", country: "Morocco" },
  { code: "rif", name: "Riffian", country: "Morocco" },
  { code: "kab", name: "Kabyle", country: "Algeria" },
  { code: "taq", name: "Tamasheq", country: "Mali" },
  
  // Central African
  { code: "sag", name: "Sango", country: "Central African Republic" },
  { code: "kea", name: "Kabuverdianu", country: "Cape Verde" },
  { code: "mg", name: "Malagasy", country: "Madagascar" },

  // ==================== EUROPEAN LANGUAGES ====================
  // Nordic
  { code: "sv", name: "Swedish", country: "Sweden" },
  { code: "no", name: "Norwegian", country: "Norway" },
  { code: "nb", name: "Norwegian Bokmål", country: "Norway" },
  { code: "nn", name: "Norwegian Nynorsk", country: "Norway" },
  { code: "da", name: "Danish", country: "Denmark" },
  { code: "fi", name: "Finnish", country: "Finland" },
  { code: "is", name: "Icelandic", country: "Iceland" },
  { code: "fo", name: "Faroese", country: "Faroe Islands" },
  { code: "se", name: "Northern Sami", country: "Norway" },
  { code: "smj", name: "Lule Sami", country: "Sweden" },
  { code: "sma", name: "Southern Sami", country: "Norway" },
  
  // Baltic
  { code: "lt", name: "Lithuanian", country: "Lithuania" },
  { code: "lv", name: "Latvian", country: "Latvia" },
  { code: "et", name: "Estonian", country: "Estonia" },
  
  // Celtic
  { code: "ga", name: "Irish", country: "Ireland" },
  { code: "gd", name: "Scottish Gaelic", country: "United Kingdom" },
  { code: "cy", name: "Welsh", country: "United Kingdom" },
  { code: "br", name: "Breton", country: "France" },
  { code: "kw", name: "Cornish", country: "United Kingdom" },
  { code: "gv", name: "Manx", country: "Isle of Man" },
  
  // Romance Regional
  { code: "eu", name: "Basque", country: "Spain" },
  { code: "ca", name: "Catalan", country: "Spain" },
  { code: "gl", name: "Galician", country: "Spain" },
  { code: "ast", name: "Asturian", country: "Spain" },
  { code: "an", name: "Aragonese", country: "Spain" },
  { code: "oc", name: "Occitan", country: "France" },
  { code: "co", name: "Corsican", country: "France" },
  { code: "sc", name: "Sardinian", country: "Italy" },
  { code: "fur", name: "Friulian", country: "Italy" },
  { code: "lij", name: "Ligurian", country: "Italy" },
  { code: "lmo", name: "Lombard", country: "Italy" },
  { code: "pms", name: "Piedmontese", country: "Italy" },
  { code: "vec", name: "Venetian", country: "Italy" },
  { code: "scn", name: "Sicilian", country: "Italy" },
  { code: "nap", name: "Neapolitan", country: "Italy" },
  { code: "rm", name: "Romansh", country: "Switzerland" },
  { code: "lb", name: "Luxembourgish", country: "Luxembourg" },
  { code: "wa", name: "Walloon", country: "Belgium" },
  { code: "fy", name: "West Frisian", country: "Netherlands" },
  { code: "li", name: "Limburgish", country: "Netherlands" },
  { code: "mt", name: "Maltese", country: "Malta" },
  
  // Slavic Regional
  { code: "be", name: "Belarusian", country: "Belarus" },
  { code: "rue", name: "Rusyn", country: "Ukraine" },
  { code: "csb", name: "Kashubian", country: "Poland" },
  { code: "szl", name: "Silesian", country: "Poland" },
  { code: "hsb", name: "Upper Sorbian", country: "Germany" },
  { code: "dsb", name: "Lower Sorbian", country: "Germany" },

  // ==================== CENTRAL ASIAN LANGUAGES ====================
  { code: "kk", name: "Kazakh", country: "Kazakhstan" },
  { code: "uz", name: "Uzbek", country: "Uzbekistan" },
  { code: "ky", name: "Kyrgyz", country: "Kyrgyzstan" },
  { code: "tg", name: "Tajik", country: "Tajikistan" },
  { code: "tk", name: "Turkmen", country: "Turkmenistan" },
  { code: "tt", name: "Tatar", country: "Russia" },
  { code: "ba", name: "Bashkir", country: "Russia" },
  { code: "cv", name: "Chuvash", country: "Russia" },
  { code: "sah", name: "Yakut", country: "Russia" },
  { code: "tyv", name: "Tuvan", country: "Russia" },
  { code: "alt", name: "Altai", country: "Russia" },
  { code: "kjh", name: "Khakas", country: "Russia" },
  { code: "krc", name: "Karachay-Balkar", country: "Russia" },
  { code: "kum", name: "Kumyk", country: "Russia" },
  { code: "nog", name: "Nogai", country: "Russia" },
  { code: "kaa", name: "Karakalpak", country: "Uzbekistan" },
  { code: "crh", name: "Crimean Tatar", country: "Ukraine" },
  
  // Caucasian Languages
  { code: "ce", name: "Chechen", country: "Russia" },
  { code: "inh", name: "Ingush", country: "Russia" },
  { code: "av", name: "Avar", country: "Russia" },
  { code: "lez", name: "Lezgin", country: "Russia" },
  { code: "dar", name: "Dargwa", country: "Russia" },
  { code: "lbe", name: "Lak", country: "Russia" },
  { code: "tab", name: "Tabassaran", country: "Russia" },
  { code: "ady", name: "Adyghe", country: "Russia" },
  { code: "kbd", name: "Kabardian", country: "Russia" },
  { code: "abk", name: "Abkhaz", country: "Georgia" },
  { code: "os", name: "Ossetian", country: "Russia" },

  // ==================== MIDDLE EASTERN LANGUAGES ====================
  { code: "apc", name: "Levantine Arabic", country: "Lebanon" },
  { code: "ajp", name: "South Levantine Arabic", country: "Jordan" },
  { code: "acq", name: "Ta'izzi-Adeni Arabic", country: "Yemen" },
  { code: "afb", name: "Gulf Arabic", country: "United Arab Emirates" },
  { code: "acw", name: "Hijazi Arabic", country: "Saudi Arabia" },
  { code: "ckb", name: "Central Kurdish", country: "Iraq" },
  { code: "kmr", name: "Northern Kurdish", country: "Turkey" },
  { code: "sdh", name: "Southern Kurdish", country: "Iran" },
  { code: "lrc", name: "Luri", country: "Iran" },
  { code: "glk", name: "Gilaki", country: "Iran" },
  { code: "mzn", name: "Mazanderani", country: "Iran" },
  { code: "tly", name: "Talysh", country: "Azerbaijan" },
  { code: "haz", name: "Hazaragi", country: "Afghanistan" },
  { code: "prs", name: "Dari", country: "Afghanistan" },

  // ==================== PACIFIC LANGUAGES ====================
  { code: "mi", name: "Maori", country: "New Zealand" },
  { code: "haw", name: "Hawaiian", country: "United States" },
  { code: "sm", name: "Samoan", country: "Samoa" },
  { code: "to", name: "Tongan", country: "Tonga" },
  { code: "fj", name: "Fijian", country: "Fiji" },
  { code: "ty", name: "Tahitian", country: "French Polynesia" },
  { code: "mh", name: "Marshallese", country: "Marshall Islands" },
  { code: "ch", name: "Chamorro", country: "Guam" },
  { code: "gil", name: "Gilbertese", country: "Kiribati" },
  { code: "tvl", name: "Tuvaluan", country: "Tuvalu" },
  { code: "niu", name: "Niuean", country: "Niue" },
  { code: "rar", name: "Cook Islands Maori", country: "Cook Islands" },
  { code: "tpi", name: "Tok Pisin", country: "Papua New Guinea" },
  { code: "bi", name: "Bislama", country: "Vanuatu" },
  { code: "ho", name: "Hiri Motu", country: "Papua New Guinea" },

  // ==================== AMERICAN LANGUAGES ====================
  { code: "qu", name: "Quechua", country: "Peru" },
  { code: "ay", name: "Aymara", country: "Bolivia" },
  { code: "gn", name: "Guarani", country: "Paraguay" },
  { code: "ht", name: "Haitian Creole", country: "Haiti" },
  { code: "nv", name: "Navajo", country: "United States" },
  { code: "chr", name: "Cherokee", country: "United States" },
  { code: "oj", name: "Ojibwe", country: "United States" },
  { code: "cr", name: "Cree", country: "Canada" },
  { code: "iu", name: "Inuktitut", country: "Canada" },
  { code: "ik", name: "Inupiaq", country: "United States" },
  { code: "kl", name: "Kalaallisut", country: "Greenland" },
  { code: "nah", name: "Nahuatl", country: "Mexico" },
  { code: "yua", name: "Yucatec Maya", country: "Mexico" },
  { code: "myn", name: "Mayan", country: "Guatemala" },
  { code: "tzh", name: "Tzotzil", country: "Mexico" },
  { code: "zap", name: "Zapotec", country: "Mexico" },
  { code: "mix", name: "Mixtec", country: "Mexico" },
  { code: "oto", name: "Otomi", country: "Mexico" },
  { code: "tar", name: "Tarahumara", country: "Mexico" },
  { code: "ppl", name: "Pipil", country: "El Salvador" },
  { code: "cab", name: "Garifuna", country: "Honduras" },
  { code: "mam", name: "Mam", country: "Guatemala" },
  { code: "kek", name: "Kekchi", country: "Guatemala" },
  { code: "cak", name: "Kaqchikel", country: "Guatemala" },
  { code: "quc", name: "K'iche'", country: "Guatemala" },
  { code: "map", name: "Mapudungun", country: "Chile" },
  { code: "arn", name: "Mapuche", country: "Chile" },

  // ==================== CREOLE & PIDGIN LANGUAGES ====================
  { code: "gcr", name: "Guianese Creole", country: "French Guiana" },
  { code: "lou", name: "Louisiana Creole", country: "United States" },
  { code: "pap", name: "Papiamento", country: "Aruba" },
  { code: "jam", name: "Jamaican Patois", country: "Jamaica" },
  { code: "srn", name: "Sranan Tongo", country: "Suriname" },
  { code: "djk", name: "Aukan", country: "Suriname" },
  { code: "mfe", name: "Mauritian Creole", country: "Mauritius" },
  { code: "rcf", name: "Réunion Creole", country: "Réunion" },
  { code: "crs", name: "Seychellois Creole", country: "Seychelles" },

  // ==================== SIGN LANGUAGES ====================
  { code: "ase", name: "American Sign Language", country: "United States" },
  { code: "bfi", name: "British Sign Language", country: "United Kingdom" },
  { code: "fsl", name: "French Sign Language", country: "France" },
  { code: "gsg", name: "German Sign Language", country: "Germany" },
  { code: "jsl", name: "Japanese Sign Language", country: "Japan" },
  { code: "csl", name: "Chinese Sign Language", country: "China" },
  { code: "ins", name: "Indian Sign Language", country: "India" },
  { code: "bzs", name: "Brazilian Sign Language", country: "Brazil" },
  { code: "mfs", name: "Mexican Sign Language", country: "Mexico" },
  { code: "asf", name: "Auslan", country: "Australia" },

  // ==================== CONSTRUCTED & AUXILIARY LANGUAGES ====================
  { code: "eo", name: "Esperanto", country: "International" },
  { code: "ia", name: "Interlingua", country: "International" },
  { code: "ie", name: "Interlingue", country: "International" },
  { code: "vo", name: "Volapük", country: "International" },
  { code: "io", name: "Ido", country: "International" },
  { code: "la", name: "Latin", country: "Vatican City" },
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
  pacific: ["Tane", "Manu", "Sione", "Tevita", "Jope", "Viliame", "Pita", "Isireli", "Josefa", "Timoci", "Vuki", "Ratu"],
  nordic: ["Erik", "Lars", "Sven", "Olaf", "Magnus", "Anders", "Henrik", "Bjorn", "Gunnar", "Leif", "Thor", "Ragnar"],
};

const FEMALE_NAMES = {
  indian: ["Priya", "Ananya", "Divya", "Sneha", "Kavitha", "Meera", "Lakshmi", "Pooja", "Nisha", "Anjali", "Deepika", "Sunita"],
  western: ["Emma", "Olivia", "Sophia", "Isabella", "Charlotte", "Amelia", "Mia", "Harper", "Evelyn", "Abigail", "Emily", "Grace"],
  asian: ["Sakura", "Mei", "Soo-Yeon", "Linh", "Ploy", "Yuki", "Hana", "Xiao", "Min", "Ji-Yeon", "Nguyet", "Mai"],
  middleeast: ["Fatima", "Zahra", "Aisha", "Nur", "Layla", "Mariam", "Sara", "Hana", "Yasmin", "Rania", "Noor", "Amira"],
  african: ["Amara", "Zuri", "Adaeze", "Nia", "Thandi", "Ayesha", "Halima", "Amina", "Khadija", "Chidinma", "Blessing", "Wanjiku"],
  latin: ["Maria", "Sofia", "Valentina", "Camila", "Lucia", "Isabella", "Gabriela", "Ana", "Elena", "Paula", "Carmen", "Rosa"],
  pacific: ["Mere", "Ana", "Sina", "Mele", "Salote", "Luisa", "Sera", "Adi", "Lupe", "Tui", "Moana", "Talia"],
  nordic: ["Ingrid", "Astrid", "Freya", "Sigrid", "Helga", "Greta", "Liv", "Elsa", "Signe", "Maja", "Eira", "Saga"],
};

function getRegion(country: string): string {
  const indianCountries = ["India", "Nepal", "Pakistan", "Sri Lanka", "Bangladesh", "Bhutan", "Maldives"];
  const asianCountries = ["China", "Japan", "South Korea", "North Korea", "Vietnam", "Thailand", "Indonesia", "Malaysia", "Philippines", "Cambodia", "Laos", "Myanmar", "Singapore", "Taiwan", "Mongolia", "Brunei", "Hong Kong", "Macau"];
  const middleeastCountries = ["Saudi Arabia", "Iran", "Iraq", "Israel", "Turkey", "Egypt", "Jordan", "Lebanon", "Syria", "Yemen", "Oman", "Kuwait", "Qatar", "Bahrain", "United Arab Emirates", "Afghanistan", "Azerbaijan", "Armenia", "Georgia"];
  const africanCountries = ["Kenya", "South Africa", "Nigeria", "Ethiopia", "Ghana", "Tanzania", "Uganda", "Rwanda", "Senegal", "Cameroon", "Ivory Coast", "Zimbabwe", "Zambia", "Morocco", "Algeria", "Tunisia", "Libya", "Sudan", "Congo", "Angola", "Mozambique", "Madagascar", "Mali", "Burkina Faso", "Niger", "Malawi", "Somalia", "Eritrea", "Botswana", "Namibia", "Central African Republic", "Benin", "Togo", "Sierra Leone", "Liberia", "Guinea", "Gambia", "Mauritania", "Cape Verde", "South Sudan", "Burundi", "Lesotho", "Eswatini"];
  const latinCountries = ["Mexico", "Brazil", "Argentina", "Colombia", "Peru", "Chile", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Cuba", "Dominican Republic", "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panama", "Puerto Rico", "Haiti", "French Guiana", "Suriname", "Guyana"];
  const pacificCountries = ["New Zealand", "Fiji", "Samoa", "Tonga", "Papua New Guinea", "Vanuatu", "Solomon Islands", "Kiribati", "Tuvalu", "Marshall Islands", "Palau", "Micronesia", "French Polynesia", "Guam", "Cook Islands", "Niue"];
  const nordicCountries = ["Sweden", "Norway", "Denmark", "Finland", "Iceland", "Faroe Islands", "Greenland"];
  
  if (indianCountries.includes(country)) return "indian";
  if (asianCountries.includes(country)) return "asian";
  if (middleeastCountries.includes(country)) return "middleeast";
  if (africanCountries.includes(country)) return "african";
  if (latinCountries.includes(country)) return "latin";
  if (pacificCountries.includes(country)) return "pacific";
  if (nordicCountries.includes(country)) return "nordic";
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
