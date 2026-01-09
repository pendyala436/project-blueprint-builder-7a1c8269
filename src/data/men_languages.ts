// Men Profile Languages - All 382+ Languages
// Complete language list for men user profiles

export interface MenLanguage {
  code: string;
  name: string;
  nativeName: string;
  script?: string;
  rtl?: boolean;
}

export const menLanguages: MenLanguage[] = [
  // ================================================================
  // TOP 65 WORLD LANGUAGES BY NUMBER OF SPEAKERS
  // ================================================================
  { code: "en", name: "English", nativeName: "English", script: "Latin" },
  { code: "zh", name: "Chinese (Mandarin)", nativeName: "中文", script: "Han" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी", script: "Devanagari" },
  { code: "es", name: "Spanish", nativeName: "Español", script: "Latin" },
  { code: "ar", name: "Arabic", nativeName: "العربية", script: "Arabic", rtl: true },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", script: "Bengali" },
  { code: "pt", name: "Portuguese", nativeName: "Português", script: "Latin" },
  { code: "ru", name: "Russian", nativeName: "Русский", script: "Cyrillic" },
  { code: "ja", name: "Japanese", nativeName: "日本語", script: "Japanese" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", script: "Gurmukhi" },
  { code: "de", name: "German", nativeName: "Deutsch", script: "Latin" },
  { code: "jv", name: "Javanese", nativeName: "Basa Jawa", script: "Latin" },
  { code: "ko", name: "Korean", nativeName: "한국어", script: "Hangul" },
  { code: "fr", name: "French", nativeName: "Français", script: "Latin" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", script: "Telugu" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", script: "Devanagari" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", script: "Latin" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", script: "Tamil" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", script: "Latin" },
  { code: "ur", name: "Urdu", nativeName: "اردو", script: "Arabic", rtl: true },
  { code: "it", name: "Italian", nativeName: "Italiano", script: "Latin" },
  { code: "th", name: "Thai", nativeName: "ไทย", script: "Thai" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", script: "Gujarati" },
  { code: "fa", name: "Persian", nativeName: "فارسی", script: "Arabic", rtl: true },
  { code: "pl", name: "Polish", nativeName: "Polski", script: "Latin" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", script: "Cyrillic" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", script: "Malayalam" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", script: "Kannada" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", script: "Odia" },
  { code: "my", name: "Burmese", nativeName: "မြန်မာ", script: "Myanmar" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", script: "Latin" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbek", script: "Latin" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي", script: "Arabic", rtl: true },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", script: "Ethiopic" },
  { code: "ha", name: "Hausa", nativeName: "Hausa", script: "Latin" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá", script: "Latin" },
  { code: "ig", name: "Igbo", nativeName: "Igbo", script: "Latin" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", script: "Devanagari" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", script: "Latin" },
  { code: "ro", name: "Romanian", nativeName: "Română", script: "Latin" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", script: "Greek" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", script: "Latin" },
  { code: "cs", name: "Czech", nativeName: "Čeština", script: "Latin" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", script: "Latin" },
  { code: "he", name: "Hebrew", nativeName: "עברית", script: "Hebrew", rtl: true },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan", script: "Latin" },
  { code: "kk", name: "Kazakh", nativeName: "Қазақ", script: "Cyrillic" },
  { code: "be", name: "Belarusian", nativeName: "Беларуская", script: "Cyrillic" },
  { code: "sr", name: "Serbian", nativeName: "Српски", script: "Cyrillic" },
  { code: "bg", name: "Bulgarian", nativeName: "Български", script: "Cyrillic" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina", script: "Latin" },
  { code: "da", name: "Danish", nativeName: "Dansk", script: "Latin" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", script: "Latin" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", script: "Latin" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", script: "Latin" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", script: "Latin" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", script: "Latin" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog", script: "Latin" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu", script: "Latin" },
  { code: "xh", name: "Xhosa", nativeName: "isiXhosa", script: "Latin" },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans", script: "Latin" },
  { code: "km", name: "Khmer", nativeName: "ខ្មែរ", script: "Khmer" },
  { code: "lo", name: "Lao", nativeName: "ລາວ", script: "Lao" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල", script: "Sinhala" },
  { code: "ka", name: "Georgian", nativeName: "ქართული", script: "Georgian" },

  // ================================================================
  // ADDITIONAL INDIAN OFFICIAL LANGUAGES (22 Eighth Schedule)
  // ================================================================
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", script: "Bengali" },
  { code: "mai", name: "Maithili", nativeName: "मैथिली", script: "Devanagari" },
  { code: "sat", name: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", script: "Ol_Chiki" },
  { code: "ks", name: "Kashmiri", nativeName: "کٲشُر", script: "Arabic", rtl: true },
  { code: "kok", name: "Konkani", nativeName: "कोंकणी", script: "Devanagari" },
  { code: "doi", name: "Dogri", nativeName: "डोगरी", script: "Devanagari" },
  { code: "mni", name: "Manipuri", nativeName: "মৈতৈলোন্", script: "Bengali" },
  { code: "brx", name: "Bodo", nativeName: "बड़ो", script: "Devanagari" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्", script: "Devanagari" },

  // ================================================================
  // INDIAN MAJOR REGIONAL LANGUAGES (30+)
  // ================================================================
  { code: "bho", name: "Bhojpuri", nativeName: "भोजपुरी", script: "Devanagari" },
  { code: "hne", name: "Chhattisgarhi", nativeName: "छत्तीसगढ़ी", script: "Devanagari" },
  { code: "raj", name: "Rajasthani", nativeName: "राजस्थानी", script: "Devanagari" },
  { code: "mwr", name: "Marwari", nativeName: "मारवाड़ी", script: "Devanagari" },
  { code: "mtr", name: "Mewari", nativeName: "मेवाड़ी", script: "Devanagari" },
  { code: "bgc", name: "Haryanvi", nativeName: "हरियाणवी", script: "Devanagari" },
  { code: "mag", name: "Magahi", nativeName: "मगही", script: "Devanagari" },
  { code: "anp", name: "Angika", nativeName: "अंगिका", script: "Devanagari" },
  { code: "bjj", name: "Bajjika", nativeName: "बज्जिका", script: "Devanagari" },
  { code: "awa", name: "Awadhi", nativeName: "अवधी", script: "Devanagari" },
  { code: "bns", name: "Bundeli", nativeName: "बुन्देली", script: "Devanagari" },
  { code: "bfy", name: "Bagheli", nativeName: "बघेली", script: "Devanagari" },
  { code: "gbm", name: "Garhwali", nativeName: "गढ़वाली", script: "Devanagari" },
  { code: "kfy", name: "Kumaoni", nativeName: "कुमाऊँनी", script: "Devanagari" },
  { code: "him", name: "Pahari", nativeName: "पहाड़ी", script: "Devanagari" },
  { code: "kan", name: "Kanauji", nativeName: "कनौजी", script: "Devanagari" },
  { code: "tcy", name: "Tulu", nativeName: "ತುಳು", script: "Kannada" },
  { code: "kfa", name: "Kodava", nativeName: "ಕೊಡವ", script: "Kannada" },
  { code: "bhb", name: "Bhili", nativeName: "भीली", script: "Devanagari" },
  { code: "gon", name: "Gondi", nativeName: "गोंडी", script: "Devanagari" },
  { code: "lmn", name: "Lambadi", nativeName: "लम्बाडी", script: "Devanagari" },
  { code: "sck", name: "Nagpuri", nativeName: "नागपुरी", script: "Devanagari" },
  { code: "kru", name: "Kurukh", nativeName: "कुड़ुख़", script: "Devanagari" },
  { code: "unr", name: "Mundari", nativeName: "मुंडारी", script: "Devanagari" },
  { code: "hoc", name: "Ho", nativeName: "हो", script: "Devanagari" },
  { code: "khr", name: "Kharia", nativeName: "खड़िया", script: "Devanagari" },
  { code: "hlb", name: "Halbi", nativeName: "हलबी", script: "Devanagari" },

  // ================================================================
  // NORTHEAST INDIAN LANGUAGES (25+)
  // ================================================================
  { code: "lus", name: "Mizo", nativeName: "Mizo ṭawng", script: "Latin" },
  { code: "kha", name: "Khasi", nativeName: "Khasi", script: "Latin" },
  { code: "grt", name: "Garo", nativeName: "A·chik", script: "Latin" },
  { code: "mjw", name: "Karbi", nativeName: "কাৰ্বি", script: "Latin" },
  { code: "trp", name: "Kokborok", nativeName: "Kókbórók", script: "Latin" },
  { code: "rah", name: "Rabha", nativeName: "রাভা", script: "Bengali" },
  { code: "mrg", name: "Mishing", nativeName: "মিচিং", script: "Latin" },
  { code: "njz", name: "Nyishi", nativeName: "Nyishi", script: "Latin" },
  { code: "apt", name: "Apatani", nativeName: "Apatani", script: "Latin" },
  { code: "adi", name: "Adi", nativeName: "Adi", script: "Latin" },
  { code: "lep", name: "Lepcha", nativeName: "ᰛᰩᰵᰛᰧᰵ", script: "Lepcha" },
  { code: "sip", name: "Bhutia", nativeName: "འབྲས་ལྗོངས", script: "Tibetan" },
  { code: "lif", name: "Limbu", nativeName: "ᤕᤠᤰᤌᤢᤱ", script: "Limbu" },
  { code: "njo", name: "Ao", nativeName: "Ao", script: "Latin" },
  { code: "njh", name: "Lotha", nativeName: "Lotha", script: "Latin" },
  { code: "nsm", name: "Sumi", nativeName: "Sümi", script: "Latin" },
  { code: "njm", name: "Angami", nativeName: "Angami", script: "Latin" },
  { code: "nmf", name: "Tangkhul", nativeName: "Tangkhul", script: "Latin" },
  { code: "pck", name: "Paite", nativeName: "Paite", script: "Latin" },
  { code: "tcz", name: "Thadou", nativeName: "Thadou", script: "Latin" },
  { code: "nbu", name: "Rongmei", nativeName: "Rongmei", script: "Latin" },
  { code: "nst", name: "Tangsa", nativeName: "Tangsa", script: "Latin" },
  { code: "nnp", name: "Wancho", nativeName: "Wancho", script: "Latin" },
  { code: "njb", name: "Nocte", nativeName: "Nocte", script: "Latin" },
  { code: "nag", name: "Nagamese", nativeName: "Nagamese", script: "Latin" },
  { code: "cmn", name: "Monpa", nativeName: "མོན་པ", script: "Tibetan" },

  // ================================================================
  // SOUTH INDIAN TRIBAL LANGUAGES
  // ================================================================
  { code: "tcx", name: "Toda", nativeName: "தோடா", script: "Tamil" },
  { code: "bfq", name: "Badaga", nativeName: "Badaga", script: "Kannada" },
  { code: "iru", name: "Irula", nativeName: "இருளா", script: "Tamil" },
  { code: "kfh", name: "Kuruma", nativeName: "കുറുമ", script: "Malayalam" },
  { code: "vav", name: "Warli", nativeName: "वारली", script: "Devanagari" },

  // ================================================================
  // OTHER SOUTH ASIAN LANGUAGES
  // ================================================================
  { code: "dv", name: "Dhivehi", nativeName: "ދިވެހި", script: "Thaana", rtl: true },
  { code: "bo", name: "Tibetan", nativeName: "བོད་སྐད་", script: "Tibetan" },
  { code: "dz", name: "Dzongkha", nativeName: "རྫོང་ཁ", script: "Tibetan" },
  { code: "pi", name: "Pali", nativeName: "पालि", script: "Devanagari" },
  { code: "caq", name: "Nicobarese", nativeName: "Nicobarese", script: "Latin" },

  // ================================================================
  // SOUTHEAST ASIAN LANGUAGES (Extended)
  // ================================================================
  { code: "su", name: "Sundanese", nativeName: "Basa Sunda", script: "Latin" },
  { code: "ceb", name: "Cebuano", nativeName: "Cebuano", script: "Latin" },
  { code: "ilo", name: "Ilocano", nativeName: "Ilokano", script: "Latin" },
  { code: "min", name: "Minangkabau", nativeName: "Baso Minangkabau", script: "Latin" },
  { code: "ace", name: "Acehnese", nativeName: "Bahsa Acèh", script: "Latin" },
  { code: "ban", name: "Balinese", nativeName: "Basa Bali", script: "Latin" },
  { code: "bjn", name: "Banjar", nativeName: "Banjar", script: "Latin" },

  // ================================================================
  // MIDDLE EASTERN & CENTRAL ASIAN LANGUAGES
  // ================================================================
  { code: "ku", name: "Kurdish", nativeName: "Kurdî", script: "Latin" },
  { code: "ps", name: "Pashto", nativeName: "پښتو", script: "Arabic", rtl: true },
  { code: "prs", name: "Dari", nativeName: "دری", script: "Arabic", rtl: true },
  { code: "tk", name: "Turkmen", nativeName: "Türkmen", script: "Latin" },
  { code: "ky", name: "Kyrgyz", nativeName: "Кыргыз", script: "Cyrillic" },
  { code: "tg", name: "Tajik", nativeName: "Тоҷикӣ", script: "Cyrillic" },
  { code: "ug", name: "Uighur", nativeName: "ئۇيغۇرچە", script: "Arabic", rtl: true },

  // ================================================================
  // EUROPEAN LANGUAGES (Extended)
  // ================================================================
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina", script: "Latin" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių", script: "Latin" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu", script: "Latin" },
  { code: "et", name: "Estonian", nativeName: "Eesti", script: "Latin" },
  { code: "bs", name: "Bosnian", nativeName: "Bosanski", script: "Latin" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски", script: "Cyrillic" },
  { code: "sq", name: "Albanian", nativeName: "Shqip", script: "Latin" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska", script: "Latin" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge", script: "Latin" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg", script: "Latin" },
  { code: "gd", name: "Scottish Gaelic", nativeName: "Gàidhlig", script: "Latin" },
  { code: "eu", name: "Basque", nativeName: "Euskara", script: "Latin" },
  { code: "ca", name: "Catalan", nativeName: "Català", script: "Latin" },
  { code: "gl", name: "Galician", nativeName: "Galego", script: "Latin" },
  { code: "mt", name: "Maltese", nativeName: "Malti", script: "Latin" },
  { code: "lb", name: "Luxembourgish", nativeName: "Lëtzebuergesch", script: "Latin" },
  { code: "oc", name: "Occitan", nativeName: "Occitan", script: "Latin" },
  { code: "br", name: "Breton", nativeName: "Brezhoneg", script: "Latin" },
  { code: "fy", name: "Frisian", nativeName: "Frysk", script: "Latin" },
  { code: "fo", name: "Faroese", nativeName: "Føroyskt", script: "Latin" },
  { code: "an", name: "Aragonese", nativeName: "Aragonés", script: "Latin" },
  { code: "ast", name: "Asturian", nativeName: "Asturianu", script: "Latin" },
  { code: "co", name: "Corsican", nativeName: "Corsu", script: "Latin" },
  { code: "sc", name: "Sardinian", nativeName: "Sardu", script: "Latin" },
  { code: "fur", name: "Friulian", nativeName: "Furlan", script: "Latin" },
  { code: "lij", name: "Ligurian", nativeName: "Lìgure", script: "Latin" },
  { code: "lmo", name: "Lombard", nativeName: "Lumbaart", script: "Latin" },
  { code: "scn", name: "Sicilian", nativeName: "Sicilianu", script: "Latin" },
  { code: "vec", name: "Venetian", nativeName: "Vèneto", script: "Latin" },
  { code: "hsb", name: "Sorbian", nativeName: "Hornjoserbšćina", script: "Latin" },
  { code: "csb", name: "Kashubian", nativeName: "Kaszëbsczi", script: "Latin" },
  { code: "szl", name: "Silesian", nativeName: "Ślōnsko", script: "Latin" },
  { code: "rue", name: "Rusyn", nativeName: "Русиньскый", script: "Cyrillic" },

  // ================================================================
  // CAUCASIAN LANGUAGES
  // ================================================================
  { code: "hy", name: "Armenian", nativeName: "Հdelays", script: "Armenian" },
  { code: "ce", name: "Chechen", nativeName: "Нохчийн", script: "Cyrillic" },
  { code: "av", name: "Avar", nativeName: "Авар", script: "Cyrillic" },

  // ================================================================
  // AFRICAN LANGUAGES (Extended)
  // ================================================================
  { code: "so", name: "Somali", nativeName: "Soomaali", script: "Latin" },
  { code: "om", name: "Oromo", nativeName: "Oromoo", script: "Latin" },
  { code: "ti", name: "Tigrinya", nativeName: "ትግርኛ", script: "Ethiopic" },
  { code: "sn", name: "Shona", nativeName: "chiShona", script: "Latin" },
  { code: "tn", name: "Setswana", nativeName: "Setswana", script: "Latin" },
  { code: "st", name: "Sesotho", nativeName: "Sesotho", script: "Latin" },
  { code: "rw", name: "Kinyarwanda", nativeName: "Ikinyarwanda", script: "Latin" },
  { code: "rn", name: "Kirundi", nativeName: "Ikirundi", script: "Latin" },
  { code: "lg", name: "Luganda", nativeName: "Luganda", script: "Latin" },
  { code: "ny", name: "Chichewa", nativeName: "Chichewa", script: "Latin" },
  { code: "mg", name: "Malagasy", nativeName: "Malagasy", script: "Latin" },
  { code: "wo", name: "Wolof", nativeName: "Wolof", script: "Latin" },
  { code: "ff", name: "Fulani", nativeName: "Fulfulde", script: "Latin" },
  { code: "bm", name: "Bambara", nativeName: "Bamanankan", script: "Latin" },
  { code: "ln", name: "Lingala", nativeName: "Lingála", script: "Latin" },
  { code: "tw", name: "Twi", nativeName: "Twi", script: "Latin" },
  { code: "ee", name: "Ewe", nativeName: "Eʋegbe", script: "Latin" },
  { code: "ak", name: "Akan", nativeName: "Akan", script: "Latin" },
  { code: "fon", name: "Fon", nativeName: "Fɔngbe", script: "Latin" },
  { code: "mos", name: "Moore", nativeName: "Mòoré", script: "Latin" },
  { code: "ki", name: "Kikuyu", nativeName: "Gĩkũyũ", script: "Latin" },
  { code: "luo", name: "Luo", nativeName: "Dholuo", script: "Latin" },
  { code: "kr", name: "Kanuri", nativeName: "Kanuri", script: "Latin" },
  { code: "nd", name: "Ndebele", nativeName: "isiNdebele", script: "Latin" },
  { code: "ss", name: "Siswati", nativeName: "SiSwati", script: "Latin" },
  { code: "ve", name: "Venda", nativeName: "Tshivenḓa", script: "Latin" },
  { code: "ts", name: "Tsonga", nativeName: "Xitsonga", script: "Latin" },
  { code: "nso", name: "Sepedi", nativeName: "Sepedi", script: "Latin" },
  { code: "din", name: "Dinka", nativeName: "Thuɔŋjäŋ", script: "Latin" },
  { code: "nus", name: "Nuer", nativeName: "Naath", script: "Latin" },
  { code: "loz", name: "Lozi", nativeName: "Silozi", script: "Latin" },
  { code: "tum", name: "Tumbuka", nativeName: "ChiTumbuka", script: "Latin" },
  { code: "bem", name: "Bemba", nativeName: "IciBemba", script: "Latin" },

  // ================================================================
  // AMERICAN LANGUAGES
  // ================================================================
  { code: "qu", name: "Quechua", nativeName: "Runasimi", script: "Latin" },
  { code: "gn", name: "Guarani", nativeName: "Avañe'ẽ", script: "Latin" },
  { code: "ay", name: "Aymara", nativeName: "Aymar aru", script: "Latin" },
  { code: "ht", name: "Haitian Creole", nativeName: "Kreyòl ayisyen", script: "Latin" },
  { code: "nah", name: "Nahuatl", nativeName: "Nāhuatl", script: "Latin" },
  { code: "yua", name: "Maya", nativeName: "Maayaʼ tʼàan", script: "Latin" },
  { code: "arn", name: "Mapudungun", nativeName: "Mapudungun", script: "Latin" },

  // ================================================================
  // PACIFIC LANGUAGES
  // ================================================================
  { code: "haw", name: "Hawaiian", nativeName: "ʻŌlelo Hawaiʻi", script: "Latin" },
  { code: "mi", name: "Maori", nativeName: "Te Reo Māori", script: "Latin" },
  { code: "sm", name: "Samoan", nativeName: "Gagana Samoa", script: "Latin" },
  { code: "to", name: "Tongan", nativeName: "Lea faka-Tonga", script: "Latin" },
  { code: "fj", name: "Fijian", nativeName: "Vosa Vakaviti", script: "Latin" },
  { code: "ty", name: "Tahitian", nativeName: "Reo Tahiti", script: "Latin" },
  { code: "tpi", name: "Tok Pisin", nativeName: "Tok Pisin", script: "Latin" },
  { code: "bi", name: "Bislama", nativeName: "Bislama", script: "Latin" },

  // ================================================================
  // CHINESE DIALECTS
  // ================================================================
  { code: "yue", name: "Cantonese", nativeName: "粵語", script: "Han" },
  { code: "wuu", name: "Wu Chinese", nativeName: "吴语", script: "Han" },
  { code: "nan", name: "Min Nan", nativeName: "閩南語", script: "Han" },
  { code: "hak", name: "Hakka", nativeName: "客家話", script: "Han" },
  { code: "hsn", name: "Xiang", nativeName: "湘语", script: "Han" },
  { code: "gan", name: "Gan", nativeName: "赣语", script: "Han" },

  // ================================================================
  // ARABIC DIALECTS
  // ================================================================
  { code: "arz", name: "Egyptian Arabic", nativeName: "مصري", script: "Arabic", rtl: true },
  { code: "apc", name: "Levantine Arabic", nativeName: "شامي", script: "Arabic", rtl: true },
  { code: "afb", name: "Gulf Arabic", nativeName: "خليجي", script: "Arabic", rtl: true },
  { code: "ary", name: "Maghrebi Arabic", nativeName: "مغربي", script: "Arabic", rtl: true },
  { code: "apd", name: "Sudanese Arabic", nativeName: "سوداني", script: "Arabic", rtl: true },

  // ================================================================
  // TURKIC & SLAVIC MINORITY LANGUAGES
  // ================================================================
  { code: "crh", name: "Crimean Tatar", nativeName: "Qırımtatarca", script: "Latin" },
  { code: "tt", name: "Tatar", nativeName: "Татар", script: "Cyrillic" },
  { code: "ba", name: "Bashkir", nativeName: "Башҡорт", script: "Cyrillic" },
  { code: "cv", name: "Chuvash", nativeName: "Чӑваш", script: "Cyrillic" },
  { code: "sah", name: "Sakha", nativeName: "Саха", script: "Cyrillic" },
  { code: "bua", name: "Buryat", nativeName: "Буряад", script: "Cyrillic" },
  { code: "xal", name: "Kalmyk", nativeName: "Хальмг", script: "Cyrillic" },
  { code: "kaa", name: "Karakalpak", nativeName: "Qaraqalpaq", script: "Latin" },

  // ================================================================
  // SOUTHEAST ASIAN MINORITY LANGUAGES
  // ================================================================
  { code: "shn", name: "Shan", nativeName: "လိၵ်ႈတႆး", script: "Myanmar" },
  { code: "kar", name: "Karen", nativeName: "ကညီ", script: "Myanmar" },
  { code: "mnw", name: "Mon", nativeName: "မန်", script: "Myanmar" },
  { code: "cjm", name: "Cham", nativeName: "Chăm", script: "Cham" },
  { code: "hmn", name: "Hmong", nativeName: "Hmoob", script: "Latin" },
  { code: "za", name: "Zhuang", nativeName: "Vahcuengh", script: "Latin" },
  { code: "ii", name: "Yi", nativeName: "ꆈꌠꉙ", script: "Yi" },
  { code: "nxq", name: "Naxi", nativeName: "Nakhi", script: "Latin" },
  { code: "bca", name: "Bai", nativeName: "Baip", script: "Latin" },
  { code: "lis", name: "Lisu", nativeName: "ꓡꓲꓢꓳ", script: "Lisu" },

  // ================================================================
  // HIMALAYAN & NEPAL LANGUAGES
  // ================================================================
  { code: "new", name: "Newari", nativeName: "नेपाल भाषा", script: "Devanagari" },
  { code: "xsr", name: "Sherpa", nativeName: "ཤེར་པ", script: "Tibetan" },
  { code: "taj", name: "Tamang", nativeName: "तामाङ", script: "Devanagari" },
  { code: "gvr", name: "Gurung", nativeName: "तमु", script: "Devanagari" },
  { code: "mgp", name: "Magar", nativeName: "मगर", script: "Devanagari" },
  { code: "the", name: "Tharu", nativeName: "थारू", script: "Devanagari" },
  { code: "rai", name: "Rai", nativeName: "किरात", script: "Devanagari" },

  // ================================================================
  // PAKISTANI & BANGLADESH LANGUAGES
  // ================================================================
  { code: "bal", name: "Balochi", nativeName: "بلوچی", script: "Arabic", rtl: true },
  { code: "brh", name: "Brahui", nativeName: "براہوئی", script: "Arabic", rtl: true },
  { code: "skr", name: "Saraiki", nativeName: "سرائیکی", script: "Arabic", rtl: true },
  { code: "hno", name: "Hindko", nativeName: "ہندکو", script: "Arabic", rtl: true },
  { code: "scl", name: "Shina", nativeName: "شینا", script: "Arabic", rtl: true },
  { code: "bsk", name: "Burushaski", nativeName: "بروشسکی", script: "Arabic", rtl: true },
  { code: "khw", name: "Khowar", nativeName: "کھوار", script: "Arabic", rtl: true },
  { code: "kls", name: "Kalasha", nativeName: "کالاشہ", script: "Arabic", rtl: true },
  { code: "ctg", name: "Chittagonian", nativeName: "চাটগাঁইয়া", script: "Bengali" },
  { code: "syl", name: "Sylheti", nativeName: "সিলটি", script: "Bengali" },
  { code: "rhg", name: "Rohingya", nativeName: "Ruáingga", script: "Arabic", rtl: true },
  { code: "ccp", name: "Chakma", nativeName: "𑄌𑄋𑄴𑄟𑄳", script: "Chakma" },

  // ================================================================
  // OTHER LANGUAGES
  // ================================================================
  { code: "eo", name: "Esperanto", nativeName: "Esperanto", script: "Latin" },
  { code: "yi", name: "Yiddish", nativeName: "ייִדיש", script: "Hebrew", rtl: true },
  { code: "mn", name: "Mongolian", nativeName: "Монгол", script: "Cyrillic" },
  { code: "la", name: "Latin", nativeName: "Latina", script: "Latin" },
  { code: "rom", name: "Romani", nativeName: "Romani", script: "Latin" },
  { code: "lad", name: "Ladino", nativeName: "Ladino", script: "Latin" },
];

// Helper functions for men profile language operations
export const getMenLanguageByCode = (code: string): MenLanguage | undefined => {
  return menLanguages.find(lang => lang.code === code);
};

export const getMenLanguageByName = (name: string): MenLanguage | undefined => {
  return menLanguages.find(lang => 
    lang.name.toLowerCase() === name.toLowerCase() ||
    lang.nativeName.toLowerCase() === name.toLowerCase()
  );
};

export const getMenLanguagesByScript = (script: string): MenLanguage[] => {
  return menLanguages.filter(lang => lang.script === script);
};

export const getMenRTLLanguages = (): MenLanguage[] => {
  return menLanguages.filter(lang => lang.rtl === true);
};

export const searchMenLanguages = (query: string): MenLanguage[] => {
  const lowerQuery = query.toLowerCase();
  return menLanguages.filter(lang =>
    lang.name.toLowerCase().includes(lowerQuery) ||
    lang.nativeName.toLowerCase().includes(lowerQuery) ||
    lang.code.toLowerCase().includes(lowerQuery)
  );
};

// Get language name by code
export const getMenLanguageName = (code: string): string => {
  const language = menLanguages.find(lang => lang.code === code);
  return language?.name || code;
};

// Get native name by code
export const getMenLanguageNativeName = (code: string): string => {
  const language = menLanguages.find(lang => lang.code === code);
  return language?.nativeName || code;
};

// Total count of available languages for men profiles
export const MEN_LANGUAGE_COUNT = menLanguages.length;
