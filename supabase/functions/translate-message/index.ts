/**
 * Translate Message Edge Function - DL-Translate Implementation
 * Complete support for ALL 200+ world languages
 * Inspired by: https://github.com/xhluca/dl-translate
 * 
 * Features:
 * 1. Auto-detect source language from text script
 * 2. Transliterate Latin input to native script
 * 3. Translate between any language pair
 * 4. English pivot for rare language pairs
 * 5. Same language optimization
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// COMPLETE LANGUAGE DATABASE - 200+ LANGUAGES
// ============================================================

interface LanguageInfo {
  name: string;
  code: string;
  nllbCode: string; // NLLB-200 code for best translation
  native: string;
  script: string;
  rtl?: boolean;
}

// Complete language database with 350+ languages
// Includes all NLLB-200 languages + Indian regional/tribal languages
const LANGUAGES: LanguageInfo[] = [
  // ================================================================
  // MAJOR WORLD LANGUAGES (Top 50 by speaker count)
  // ================================================================
  { name: 'english', code: 'en', nllbCode: 'eng_Latn', native: 'English', script: 'Latin' },
  { name: 'chinese', code: 'zh', nllbCode: 'zho_Hans', native: '中文', script: 'Han' },
  { name: 'mandarin', code: 'cmn', nllbCode: 'zho_Hans', native: '普通话', script: 'Han' },
  { name: 'spanish', code: 'es', nllbCode: 'spa_Latn', native: 'Español', script: 'Latin' },
  { name: 'arabic', code: 'ar', nllbCode: 'arb_Arab', native: 'العربية', script: 'Arabic', rtl: true },
  { name: 'french', code: 'fr', nllbCode: 'fra_Latn', native: 'Français', script: 'Latin' },
  { name: 'portuguese', code: 'pt', nllbCode: 'por_Latn', native: 'Português', script: 'Latin' },
  { name: 'russian', code: 'ru', nllbCode: 'rus_Cyrl', native: 'Русский', script: 'Cyrillic' },
  { name: 'japanese', code: 'ja', nllbCode: 'jpn_Jpan', native: '日本語', script: 'Japanese' },
  { name: 'german', code: 'de', nllbCode: 'deu_Latn', native: 'Deutsch', script: 'Latin' },
  { name: 'korean', code: 'ko', nllbCode: 'kor_Hang', native: '한국어', script: 'Hangul' },
  { name: 'italian', code: 'it', nllbCode: 'ita_Latn', native: 'Italiano', script: 'Latin' },
  { name: 'turkish', code: 'tr', nllbCode: 'tur_Latn', native: 'Türkçe', script: 'Latin' },
  { name: 'vietnamese', code: 'vi', nllbCode: 'vie_Latn', native: 'Tiếng Việt', script: 'Latin' },
  { name: 'polish', code: 'pl', nllbCode: 'pol_Latn', native: 'Polski', script: 'Latin' },
  { name: 'dutch', code: 'nl', nllbCode: 'nld_Latn', native: 'Nederlands', script: 'Latin' },
  { name: 'thai', code: 'th', nllbCode: 'tha_Thai', native: 'ไทย', script: 'Thai' },
  { name: 'indonesian', code: 'id', nllbCode: 'ind_Latn', native: 'Bahasa Indonesia', script: 'Latin' },
  { name: 'malay', code: 'ms', nllbCode: 'zsm_Latn', native: 'Bahasa Melayu', script: 'Latin' },
  { name: 'persian', code: 'fa', nllbCode: 'pes_Arab', native: 'فارسی', script: 'Arabic', rtl: true },
  { name: 'hebrew', code: 'he', nllbCode: 'heb_Hebr', native: 'עברית', script: 'Hebrew', rtl: true },
  { name: 'greek', code: 'el', nllbCode: 'ell_Grek', native: 'Ελληνικά', script: 'Greek' },
  { name: 'romanian', code: 'ro', nllbCode: 'ron_Latn', native: 'Română', script: 'Latin' },
  { name: 'czech', code: 'cs', nllbCode: 'ces_Latn', native: 'Čeština', script: 'Latin' },
  { name: 'hungarian', code: 'hu', nllbCode: 'hun_Latn', native: 'Magyar', script: 'Latin' },
  { name: 'swedish', code: 'sv', nllbCode: 'swe_Latn', native: 'Svenska', script: 'Latin' },
  { name: 'danish', code: 'da', nllbCode: 'dan_Latn', native: 'Dansk', script: 'Latin' },
  { name: 'finnish', code: 'fi', nllbCode: 'fin_Latn', native: 'Suomi', script: 'Latin' },
  { name: 'norwegian', code: 'no', nllbCode: 'nob_Latn', native: 'Norsk', script: 'Latin' },
  { name: 'ukrainian', code: 'uk', nllbCode: 'ukr_Cyrl', native: 'Українська', script: 'Cyrillic' },
  { name: 'bulgarian', code: 'bg', nllbCode: 'bul_Cyrl', native: 'Български', script: 'Cyrillic' },
  { name: 'croatian', code: 'hr', nllbCode: 'hrv_Latn', native: 'Hrvatski', script: 'Latin' },
  { name: 'serbian', code: 'sr', nllbCode: 'srp_Cyrl', native: 'Српски', script: 'Cyrillic' },
  { name: 'slovak', code: 'sk', nllbCode: 'slk_Latn', native: 'Slovenčina', script: 'Latin' },
  { name: 'slovenian', code: 'sl', nllbCode: 'slv_Latn', native: 'Slovenščina', script: 'Latin' },
  { name: 'lithuanian', code: 'lt', nllbCode: 'lit_Latn', native: 'Lietuvių', script: 'Latin' },
  { name: 'latvian', code: 'lv', nllbCode: 'lvs_Latn', native: 'Latviešu', script: 'Latin' },
  { name: 'estonian', code: 'et', nllbCode: 'est_Latn', native: 'Eesti', script: 'Latin' },
  
  // ================================================================
  // INDIAN OFFICIAL LANGUAGES (22 Eighth Schedule Languages)
  // ================================================================
  { name: 'hindi', code: 'hi', nllbCode: 'hin_Deva', native: 'हिंदी', script: 'Devanagari' },
  { name: 'bengali', code: 'bn', nllbCode: 'ben_Beng', native: 'বাংলা', script: 'Bengali' },
  { name: 'telugu', code: 'te', nllbCode: 'tel_Telu', native: 'తెలుగు', script: 'Telugu' },
  { name: 'marathi', code: 'mr', nllbCode: 'mar_Deva', native: 'मराठी', script: 'Devanagari' },
  { name: 'tamil', code: 'ta', nllbCode: 'tam_Taml', native: 'தமிழ்', script: 'Tamil' },
  { name: 'gujarati', code: 'gu', nllbCode: 'guj_Gujr', native: 'ગુજરાતી', script: 'Gujarati' },
  { name: 'kannada', code: 'kn', nllbCode: 'kan_Knda', native: 'ಕನ್ನಡ', script: 'Kannada' },
  { name: 'malayalam', code: 'ml', nllbCode: 'mal_Mlym', native: 'മലയാളം', script: 'Malayalam' },
  { name: 'punjabi', code: 'pa', nllbCode: 'pan_Guru', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { name: 'odia', code: 'or', nllbCode: 'ory_Orya', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  { name: 'oriya', code: 'ori', nllbCode: 'ory_Orya', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  { name: 'assamese', code: 'as', nllbCode: 'asm_Beng', native: 'অসমীয়া', script: 'Bengali' },
  { name: 'urdu', code: 'ur', nllbCode: 'urd_Arab', native: 'اردو', script: 'Arabic', rtl: true },
  { name: 'nepali', code: 'ne', nllbCode: 'npi_Deva', native: 'नेपाली', script: 'Devanagari' },
  { name: 'maithili', code: 'mai', nllbCode: 'mai_Deva', native: 'मैथिली', script: 'Devanagari' },
  { name: 'santali', code: 'sat', nllbCode: 'sat_Olck', native: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol_Chiki' },
  { name: 'kashmiri', code: 'ks', nllbCode: 'kas_Arab', native: 'کٲشُر', script: 'Arabic', rtl: true },
  { name: 'konkani', code: 'kok', nllbCode: 'kok_Deva', native: 'कोंकणी', script: 'Devanagari' },
  { name: 'sindhi', code: 'sd', nllbCode: 'snd_Arab', native: 'سنڌي', script: 'Arabic', rtl: true },
  { name: 'dogri', code: 'doi', nllbCode: 'doi_Deva', native: 'डोगरी', script: 'Devanagari' },
  { name: 'manipuri', code: 'mni', nllbCode: 'mni_Beng', native: 'মৈতৈলোন্', script: 'Bengali' },
  { name: 'meitei', code: 'meit', nllbCode: 'mni_Beng', native: 'মৈতৈলোন্', script: 'Bengali' },
  { name: 'bodo', code: 'brx', nllbCode: 'brx_Deva', native: 'बड़ो', script: 'Devanagari' },
  { name: 'sanskrit', code: 'sa', nllbCode: 'san_Deva', native: 'संस्कृतम्', script: 'Devanagari' },
  
  // ================================================================
  // INDIAN MAJOR REGIONAL LANGUAGES (30+)
  // ================================================================
  { name: 'bhojpuri', code: 'bho', nllbCode: 'bho_Deva', native: 'भोजपुरी', script: 'Devanagari' },
  { name: 'chhattisgarhi', code: 'hne', nllbCode: 'hin_Deva', native: 'छत्तीसगढ़ी', script: 'Devanagari' },
  { name: 'rajasthani', code: 'raj', nllbCode: 'hin_Deva', native: 'राजस्थानी', script: 'Devanagari' },
  { name: 'marwari', code: 'mwr', nllbCode: 'hin_Deva', native: 'मारवाड़ी', script: 'Devanagari' },
  { name: 'mewari', code: 'mtr', nllbCode: 'hin_Deva', native: 'मेवाड़ी', script: 'Devanagari' },
  { name: 'haryanvi', code: 'bgc', nllbCode: 'hin_Deva', native: 'हरियाणवी', script: 'Devanagari' },
  { name: 'magahi', code: 'mag', nllbCode: 'mag_Deva', native: 'मगही', script: 'Devanagari' },
  { name: 'angika', code: 'anp', nllbCode: 'hin_Deva', native: 'अंगिका', script: 'Devanagari' },
  { name: 'bajjika', code: 'bjj', nllbCode: 'hin_Deva', native: 'बज्जिका', script: 'Devanagari' },
  { name: 'awadhi', code: 'awa', nllbCode: 'awa_Deva', native: 'अवधी', script: 'Devanagari' },
  { name: 'bundeli', code: 'bns', nllbCode: 'hin_Deva', native: 'बुन्देली', script: 'Devanagari' },
  { name: 'bagheli', code: 'bfy', nllbCode: 'hin_Deva', native: 'बघेली', script: 'Devanagari' },
  { name: 'garhwali', code: 'gbm', nllbCode: 'hin_Deva', native: 'गढ़वाली', script: 'Devanagari' },
  { name: 'kumaoni', code: 'kfy', nllbCode: 'hin_Deva', native: 'कुमाऊँनी', script: 'Devanagari' },
  { name: 'pahari', code: 'him', nllbCode: 'hin_Deva', native: 'पहाड़ी', script: 'Devanagari' },
  { name: 'kanauji', code: 'bjj', nllbCode: 'hin_Deva', native: 'कनौजी', script: 'Devanagari' },
  { name: 'tulu', code: 'tcy', nllbCode: 'kan_Knda', native: 'ತುಳು', script: 'Kannada' },
  { name: 'kodava', code: 'kfa', nllbCode: 'kan_Knda', native: 'ಕೊಡವ', script: 'Kannada' },
  { name: 'bhili', code: 'bhb', nllbCode: 'hin_Deva', native: 'भीली', script: 'Devanagari' },
  { name: 'bhilodi', code: 'bhi', nllbCode: 'hin_Deva', native: 'भीलोडी', script: 'Devanagari' },
  { name: 'gondi', code: 'gon', nllbCode: 'hin_Deva', native: 'गोंडी', script: 'Devanagari' },
  { name: 'lambadi', code: 'lmn', nllbCode: 'hin_Deva', native: 'लम्बाडी', script: 'Devanagari' },
  { name: 'banjara', code: 'bns', nllbCode: 'hin_Deva', native: 'बंजारा', script: 'Devanagari' },
  { name: 'nagpuri', code: 'sck', nllbCode: 'hin_Deva', native: 'नागपुरी', script: 'Devanagari' },
  { name: 'sadri', code: 'sck', nllbCode: 'hin_Deva', native: 'सादरी', script: 'Devanagari' },
  { name: 'kurukh', code: 'kru', nllbCode: 'hin_Deva', native: 'कुड़ुख़', script: 'Devanagari' },
  { name: 'oraon', code: 'kru', nllbCode: 'hin_Deva', native: 'ओराँव', script: 'Devanagari' },
  { name: 'mundari', code: 'unr', nllbCode: 'hin_Deva', native: 'मुंडारी', script: 'Devanagari' },
  { name: 'ho', code: 'hoc', nllbCode: 'hin_Deva', native: 'हो', script: 'Devanagari' },
  { name: 'kharia', code: 'khr', nllbCode: 'hin_Deva', native: 'खड़िया', script: 'Devanagari' },
  { name: 'santhali', code: 'sat', nllbCode: 'sat_Olck', native: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol_Chiki' },
  
  // ================================================================
  // NORTHEAST INDIAN LANGUAGES (25+)
  // ================================================================
  { name: 'mizo', code: 'lus', nllbCode: 'lus_Latn', native: 'Mizo ṭawng', script: 'Latin' },
  { name: 'lushai', code: 'lus', nllbCode: 'lus_Latn', native: 'Lushai', script: 'Latin' },
  { name: 'khasi', code: 'kha', nllbCode: 'kha_Latn', native: 'Khasi', script: 'Latin' },
  { name: 'garo', code: 'grt', nllbCode: 'ben_Beng', native: 'A·chik', script: 'Latin' },
  { name: 'karbi', code: 'mjw', nllbCode: 'asm_Beng', native: 'কাৰ্বি', script: 'Latin' },
  { name: 'kokborok', code: 'trp', nllbCode: 'ben_Beng', native: 'Kókbórók', script: 'Latin' },
  { name: 'rabha', code: 'rah', nllbCode: 'asm_Beng', native: 'রাভা', script: 'Bengali' },
  { name: 'mishing', code: 'mrg', nllbCode: 'asm_Beng', native: 'মিচিং', script: 'Latin' },
  { name: 'nyishi', code: 'njz', nllbCode: 'asm_Beng', native: 'Nyishi', script: 'Latin' },
  { name: 'apatani', code: 'apt', nllbCode: 'asm_Beng', native: 'Apatani', script: 'Latin' },
  { name: 'adi', code: 'adi', nllbCode: 'asm_Beng', native: 'Adi', script: 'Latin' },
  { name: 'monpa', code: 'cmn', nllbCode: 'bod_Tibt', native: 'མོན་པ', script: 'Tibetan' },
  { name: 'lepcha', code: 'lep', nllbCode: 'npi_Deva', native: 'ᰛᰩᰵᰛᰧᰵ', script: 'Lepcha' },
  { name: 'bhutia', code: 'sip', nllbCode: 'bod_Tibt', native: 'འབྲས་ལྗོངས', script: 'Tibetan' },
  { name: 'sikkimese', code: 'sip', nllbCode: 'bod_Tibt', native: 'Sikkimese', script: 'Tibetan' },
  { name: 'limbu', code: 'lif', nllbCode: 'npi_Deva', native: 'ᤕᤠᤰᤌᤢᤱ', script: 'Limbu' },
  { name: 'ao', code: 'njo', nllbCode: 'asm_Beng', native: 'Ao', script: 'Latin' },
  { name: 'lotha', code: 'njh', nllbCode: 'asm_Beng', native: 'Lotha', script: 'Latin' },
  { name: 'sema', code: 'nsm', nllbCode: 'asm_Beng', native: 'Sema', script: 'Latin' },
  { name: 'sumi', code: 'nsm', nllbCode: 'asm_Beng', native: 'Sümi', script: 'Latin' },
  { name: 'angami', code: 'njm', nllbCode: 'asm_Beng', native: 'Angami', script: 'Latin' },
  { name: 'tangkhul', code: 'nmf', nllbCode: 'mni_Beng', native: 'Tangkhul', script: 'Latin' },
  { name: 'paite', code: 'pck', nllbCode: 'mni_Beng', native: 'Paite', script: 'Latin' },
  { name: 'thadou', code: 'tcz', nllbCode: 'mni_Beng', native: 'Thadou', script: 'Latin' },
  { name: 'rongmei', code: 'nbu', nllbCode: 'mni_Beng', native: 'Rongmei', script: 'Latin' },
  { name: 'tangsa', code: 'nst', nllbCode: 'asm_Beng', native: 'Tangsa', script: 'Latin' },
  { name: 'wancho', code: 'nnp', nllbCode: 'asm_Beng', native: 'Wancho', script: 'Latin' },
  { name: 'nocte', code: 'njb', nllbCode: 'asm_Beng', native: 'Nocte', script: 'Latin' },
  
  // ================================================================
  // SOUTH INDIAN TRIBAL LANGUAGES
  // ================================================================
  { name: 'toda', code: 'tcx', nllbCode: 'tam_Taml', native: 'தோடா', script: 'Tamil' },
  { name: 'badaga', code: 'bfq', nllbCode: 'kan_Knda', native: 'Badaga', script: 'Kannada' },
  { name: 'irula', code: 'iru', nllbCode: 'tam_Taml', native: 'இருளா', script: 'Tamil' },
  { name: 'kuruma', code: 'kfh', nllbCode: 'mal_Mlym', native: 'കുറുമ', script: 'Malayalam' },
  { name: 'warli', code: 'vav', nllbCode: 'mar_Deva', native: 'वारली', script: 'Devanagari' },
  { name: 'varli', code: 'vav', nllbCode: 'mar_Deva', native: 'वारली', script: 'Devanagari' },
  
  // ================================================================
  // OTHER SOUTH ASIAN LANGUAGES
  // ================================================================
  { name: 'sinhala', code: 'si', nllbCode: 'sin_Sinh', native: 'සිංහල', script: 'Sinhala' },
  { name: 'dhivehi', code: 'dv', nllbCode: 'div_Thaa', native: 'ދިވެހި', script: 'Thaana', rtl: true },
  { name: 'tibetan', code: 'bo', nllbCode: 'bod_Tibt', native: 'བོད་སྐད་', script: 'Tibetan' },
  { name: 'dzongkha', code: 'dz', nllbCode: 'dzo_Tibt', native: 'རྫོང་ཁ', script: 'Tibetan' },
  { name: 'pali', code: 'pi', nllbCode: 'san_Deva', native: 'पालि', script: 'Devanagari' },
  
  // ================================================================
  // ANDAMAN & NICOBAR LANGUAGES
  // ================================================================
  { name: 'nicobarese', code: 'caq', nllbCode: 'hin_Deva', native: 'Nicobarese', script: 'Latin' },
  
  // ================================================================
  // SOUTHEAST ASIAN LANGUAGES
  // ================================================================
  { name: 'burmese', code: 'my', nllbCode: 'mya_Mymr', native: 'မြန်မာ', script: 'Myanmar' },
  { name: 'khmer', code: 'km', nllbCode: 'khm_Khmr', native: 'ខ្មែរ', script: 'Khmer' },
  { name: 'lao', code: 'lo', nllbCode: 'lao_Laoo', native: 'ລາວ', script: 'Lao' },
  { name: 'tagalog', code: 'tl', nllbCode: 'tgl_Latn', native: 'Tagalog', script: 'Latin' },
  { name: 'filipino', code: 'fil', nllbCode: 'tgl_Latn', native: 'Filipino', script: 'Latin' },
  { name: 'javanese', code: 'jv', nllbCode: 'jav_Latn', native: 'Basa Jawa', script: 'Latin' },
  { name: 'sundanese', code: 'su', nllbCode: 'sun_Latn', native: 'Basa Sunda', script: 'Latin' },
  { name: 'cebuano', code: 'ceb', nllbCode: 'ceb_Latn', native: 'Cebuano', script: 'Latin' },
  { name: 'ilocano', code: 'ilo', nllbCode: 'ilo_Latn', native: 'Ilokano', script: 'Latin' },
  { name: 'minangkabau', code: 'min', nllbCode: 'min_Latn', native: 'Baso Minangkabau', script: 'Latin' },
  { name: 'acehnese', code: 'ace', nllbCode: 'ace_Latn', native: 'Bahsa Acèh', script: 'Latin' },
  { name: 'balinese', code: 'ban', nllbCode: 'ban_Latn', native: 'Basa Bali', script: 'Latin' },
  { name: 'banjar', code: 'bjn', nllbCode: 'bjn_Latn', native: 'Banjar', script: 'Latin' },
  
  // ================================================================
  // MIDDLE EASTERN & CENTRAL ASIAN LANGUAGES
  // ================================================================
  { name: 'kurdish', code: 'ku', nllbCode: 'kmr_Latn', native: 'Kurdî', script: 'Latin' },
  { name: 'pashto', code: 'ps', nllbCode: 'pbt_Arab', native: 'پښتو', script: 'Arabic', rtl: true },
  { name: 'dari', code: 'prs', nllbCode: 'prs_Arab', native: 'دری', script: 'Arabic', rtl: true },
  { name: 'azerbaijani', code: 'az', nllbCode: 'azj_Latn', native: 'Azərbaycan', script: 'Latin' },
  { name: 'uzbek', code: 'uz', nllbCode: 'uzn_Latn', native: 'Oʻzbek', script: 'Latin' },
  { name: 'kazakh', code: 'kk', nllbCode: 'kaz_Cyrl', native: 'Қазақ', script: 'Cyrillic' },
  { name: 'turkmen', code: 'tk', nllbCode: 'tuk_Latn', native: 'Türkmen', script: 'Latin' },
  { name: 'kyrgyz', code: 'ky', nllbCode: 'kir_Cyrl', native: 'Кыргыз', script: 'Cyrillic' },
  { name: 'tajik', code: 'tg', nllbCode: 'tgk_Cyrl', native: 'Тоҷикӣ', script: 'Cyrillic' },
  { name: 'uighur', code: 'ug', nllbCode: 'uig_Arab', native: 'ئۇيغۇرچە', script: 'Arabic', rtl: true },
  
  // ================================================================
  // EUROPEAN LANGUAGES
  // ================================================================
  { name: 'belarusian', code: 'be', nllbCode: 'bel_Cyrl', native: 'Беларуская', script: 'Cyrillic' },
  { name: 'bosnian', code: 'bs', nllbCode: 'bos_Latn', native: 'Bosanski', script: 'Latin' },
  { name: 'macedonian', code: 'mk', nllbCode: 'mkd_Cyrl', native: 'Македонски', script: 'Cyrillic' },
  { name: 'albanian', code: 'sq', nllbCode: 'als_Latn', native: 'Shqip', script: 'Latin' },
  { name: 'icelandic', code: 'is', nllbCode: 'isl_Latn', native: 'Íslenska', script: 'Latin' },
  { name: 'irish', code: 'ga', nllbCode: 'gle_Latn', native: 'Gaeilge', script: 'Latin' },
  { name: 'welsh', code: 'cy', nllbCode: 'cym_Latn', native: 'Cymraeg', script: 'Latin' },
  { name: 'scottish_gaelic', code: 'gd', nllbCode: 'gla_Latn', native: 'Gàidhlig', script: 'Latin' },
  { name: 'basque', code: 'eu', nllbCode: 'eus_Latn', native: 'Euskara', script: 'Latin' },
  { name: 'catalan', code: 'ca', nllbCode: 'cat_Latn', native: 'Català', script: 'Latin' },
  { name: 'galician', code: 'gl', nllbCode: 'glg_Latn', native: 'Galego', script: 'Latin' },
  { name: 'maltese', code: 'mt', nllbCode: 'mlt_Latn', native: 'Malti', script: 'Latin' },
  { name: 'luxembourgish', code: 'lb', nllbCode: 'ltz_Latn', native: 'Lëtzebuergesch', script: 'Latin' },
  { name: 'occitan', code: 'oc', nllbCode: 'oci_Latn', native: 'Occitan', script: 'Latin' },
  { name: 'breton', code: 'br', nllbCode: 'bre_Latn', native: 'Brezhoneg', script: 'Latin' },
  { name: 'frisian', code: 'fy', nllbCode: 'fry_Latn', native: 'Frysk', script: 'Latin' },
  { name: 'faroese', code: 'fo', nllbCode: 'fao_Latn', native: 'Føroyskt', script: 'Latin' },
  
  // ================================================================
  // CAUCASIAN LANGUAGES
  // ================================================================
  { name: 'georgian', code: 'ka', nllbCode: 'kat_Geor', native: 'ქართული', script: 'Georgian' },
  { name: 'armenian', code: 'hy', nllbCode: 'hye_Armn', native: 'Հdelays', script: 'Armenian' },
  { name: 'chechen', code: 'ce', nllbCode: 'che_Cyrl', native: 'Нохчийн', script: 'Cyrillic' },
  { name: 'avar', code: 'av', nllbCode: 'ava_Cyrl', native: 'Авар', script: 'Cyrillic' },
  
  // ================================================================
  // AFRICAN LANGUAGES
  // ================================================================
  { name: 'swahili', code: 'sw', nllbCode: 'swh_Latn', native: 'Kiswahili', script: 'Latin' },
  { name: 'amharic', code: 'am', nllbCode: 'amh_Ethi', native: 'አማርኛ', script: 'Ethiopic' },
  { name: 'yoruba', code: 'yo', nllbCode: 'yor_Latn', native: 'Yorùbá', script: 'Latin' },
  { name: 'igbo', code: 'ig', nllbCode: 'ibo_Latn', native: 'Igbo', script: 'Latin' },
  { name: 'hausa', code: 'ha', nllbCode: 'hau_Latn', native: 'Hausa', script: 'Latin' },
  { name: 'zulu', code: 'zu', nllbCode: 'zul_Latn', native: 'isiZulu', script: 'Latin' },
  { name: 'xhosa', code: 'xh', nllbCode: 'xho_Latn', native: 'isiXhosa', script: 'Latin' },
  { name: 'afrikaans', code: 'af', nllbCode: 'afr_Latn', native: 'Afrikaans', script: 'Latin' },
  { name: 'somali', code: 'so', nllbCode: 'som_Latn', native: 'Soomaali', script: 'Latin' },
  { name: 'oromo', code: 'om', nllbCode: 'gaz_Latn', native: 'Oromoo', script: 'Latin' },
  { name: 'tigrinya', code: 'ti', nllbCode: 'tir_Ethi', native: 'ትግርኛ', script: 'Ethiopic' },
  { name: 'shona', code: 'sn', nllbCode: 'sna_Latn', native: 'chiShona', script: 'Latin' },
  { name: 'setswana', code: 'tn', nllbCode: 'tsn_Latn', native: 'Setswana', script: 'Latin' },
  { name: 'sesotho', code: 'st', nllbCode: 'sot_Latn', native: 'Sesotho', script: 'Latin' },
  { name: 'kinyarwanda', code: 'rw', nllbCode: 'kin_Latn', native: 'Ikinyarwanda', script: 'Latin' },
  { name: 'kirundi', code: 'rn', nllbCode: 'run_Latn', native: 'Ikirundi', script: 'Latin' },
  { name: 'luganda', code: 'lg', nllbCode: 'lug_Latn', native: 'Luganda', script: 'Latin' },
  { name: 'chichewa', code: 'ny', nllbCode: 'nya_Latn', native: 'Chichewa', script: 'Latin' },
  { name: 'malagasy', code: 'mg', nllbCode: 'plt_Latn', native: 'Malagasy', script: 'Latin' },
  { name: 'wolof', code: 'wo', nllbCode: 'wol_Latn', native: 'Wolof', script: 'Latin' },
  { name: 'fulani', code: 'ff', nllbCode: 'fuv_Latn', native: 'Fulfulde', script: 'Latin' },
  { name: 'bambara', code: 'bm', nllbCode: 'bam_Latn', native: 'Bamanankan', script: 'Latin' },
  { name: 'lingala', code: 'ln', nllbCode: 'lin_Latn', native: 'Lingála', script: 'Latin' },
  { name: 'twi', code: 'tw', nllbCode: 'twi_Latn', native: 'Twi', script: 'Latin' },
  { name: 'ewe', code: 'ee', nllbCode: 'ewe_Latn', native: 'Eʋegbe', script: 'Latin' },
  { name: 'akan', code: 'ak', nllbCode: 'aka_Latn', native: 'Akan', script: 'Latin' },
  { name: 'fon', code: 'fon', nllbCode: 'fon_Latn', native: 'Fɔngbe', script: 'Latin' },
  { name: 'moore', code: 'mos', nllbCode: 'mos_Latn', native: 'Mòoré', script: 'Latin' },
  { name: 'kikuyu', code: 'ki', nllbCode: 'kik_Latn', native: 'Gĩkũyũ', script: 'Latin' },
  { name: 'luo', code: 'luo', nllbCode: 'luo_Latn', native: 'Dholuo', script: 'Latin' },
  { name: 'kanuri', code: 'kr', nllbCode: 'knc_Latn', native: 'Kanuri', script: 'Latin' },
  { name: 'ndebele', code: 'nd', nllbCode: 'nbl_Latn', native: 'isiNdebele', script: 'Latin' },
  { name: 'siswati', code: 'ss', nllbCode: 'ssw_Latn', native: 'SiSwati', script: 'Latin' },
  { name: 'venda', code: 've', nllbCode: 'ven_Latn', native: 'Tshivenḓa', script: 'Latin' },
  { name: 'tsonga', code: 'ts', nllbCode: 'tso_Latn', native: 'Xitsonga', script: 'Latin' },
  { name: 'sepedi', code: 'nso', nllbCode: 'nso_Latn', native: 'Sepedi', script: 'Latin' },
  { name: 'dinka', code: 'din', nllbCode: 'dik_Latn', native: 'Thuɔŋjäŋ', script: 'Latin' },
  { name: 'nuer', code: 'nus', nllbCode: 'nus_Latn', native: 'Naath', script: 'Latin' },
  { name: 'lozi', code: 'loz', nllbCode: 'loz_Latn', native: 'Silozi', script: 'Latin' },
  { name: 'tumbuka', code: 'tum', nllbCode: 'tum_Latn', native: 'ChiTumbuka', script: 'Latin' },
  { name: 'bemba', code: 'bem', nllbCode: 'bem_Latn', native: 'IciBemba', script: 'Latin' },
  { name: 'halbi', code: 'hlb', nllbCode: 'hin_Deva', native: 'हलबी', script: 'Devanagari' },
  
  // ================================================================
  // AMERICAN LANGUAGES
  // ================================================================
  { name: 'quechua', code: 'qu', nllbCode: 'quy_Latn', native: 'Runasimi', script: 'Latin' },
  { name: 'guarani', code: 'gn', nllbCode: 'grn_Latn', native: "Avañe'ẽ", script: 'Latin' },
  { name: 'aymara', code: 'ay', nllbCode: 'ayr_Latn', native: 'Aymar aru', script: 'Latin' },
  { name: 'haitian_creole', code: 'ht', nllbCode: 'hat_Latn', native: 'Kreyòl ayisyen', script: 'Latin' },
  { name: 'nahuatl', code: 'nah', nllbCode: 'nah_Latn', native: 'Nāhuatl', script: 'Latin' },
  { name: 'maya', code: 'yua', nllbCode: 'yua_Latn', native: 'Maayaʼ tʼàan', script: 'Latin' },
  { name: 'mapudungun', code: 'arn', nllbCode: 'arn_Latn', native: 'Mapudungun', script: 'Latin' },
  
  // ================================================================
  // PACIFIC LANGUAGES
  // ================================================================
  { name: 'hawaiian', code: 'haw', nllbCode: 'haw_Latn', native: 'ʻŌlelo Hawaiʻi', script: 'Latin' },
  { name: 'maori', code: 'mi', nllbCode: 'mri_Latn', native: 'Te Reo Māori', script: 'Latin' },
  { name: 'samoan', code: 'sm', nllbCode: 'smo_Latn', native: 'Gagana Samoa', script: 'Latin' },
  { name: 'tongan', code: 'to', nllbCode: 'ton_Latn', native: 'Lea faka-Tonga', script: 'Latin' },
  { name: 'fijian', code: 'fj', nllbCode: 'fij_Latn', native: 'Vosa Vakaviti', script: 'Latin' },
  { name: 'tahitian', code: 'ty', nllbCode: 'tah_Latn', native: 'Reo Tahiti', script: 'Latin' },
  { name: 'tok_pisin', code: 'tpi', nllbCode: 'tpi_Latn', native: 'Tok Pisin', script: 'Latin' },
  { name: 'bislama', code: 'bi', nllbCode: 'bis_Latn', native: 'Bislama', script: 'Latin' },
  
  // ================================================================
  // CHINESE DIALECTS
  // ================================================================
  { name: 'cantonese', code: 'yue', nllbCode: 'yue_Hant', native: '粵語', script: 'Han' },
  { name: 'wu_chinese', code: 'wuu', nllbCode: 'wuu_Hans', native: '吴语', script: 'Han' },
  { name: 'min_nan', code: 'nan', nllbCode: 'nan_Latn', native: '閩南語', script: 'Han' },
  { name: 'hakka', code: 'hak', nllbCode: 'hak_Hans', native: '客家話', script: 'Han' },
  { name: 'xiang', code: 'hsn', nllbCode: 'hsn_Hans', native: '湘语', script: 'Han' },
  { name: 'gan', code: 'gan', nllbCode: 'gan_Hans', native: '赣语', script: 'Han' },
  
  // ================================================================
  // ARABIC DIALECTS
  // ================================================================
  { name: 'egyptian_arabic', code: 'arz', nllbCode: 'arz_Arab', native: 'مصري', script: 'Arabic', rtl: true },
  { name: 'levantine_arabic', code: 'apc', nllbCode: 'apc_Arab', native: 'شامي', script: 'Arabic', rtl: true },
  { name: 'gulf_arabic', code: 'afb', nllbCode: 'acq_Arab', native: 'خليجي', script: 'Arabic', rtl: true },
  { name: 'maghrebi_arabic', code: 'ary', nllbCode: 'ary_Arab', native: 'مغربي', script: 'Arabic', rtl: true },
  { name: 'sudanese_arabic', code: 'apd', nllbCode: 'apd_Arab', native: 'سوداني', script: 'Arabic', rtl: true },
  
  // ================================================================
  // OTHER LANGUAGES
  // ================================================================
  { name: 'esperanto', code: 'eo', nllbCode: 'epo_Latn', native: 'Esperanto', script: 'Latin' },
  { name: 'yiddish', code: 'yi', nllbCode: 'ydd_Hebr', native: 'ייִדיש', script: 'Hebrew', rtl: true },
  { name: 'mongolian', code: 'mn', nllbCode: 'khk_Cyrl', native: 'Монгол', script: 'Cyrillic' },
  { name: 'latin', code: 'la', nllbCode: 'lat_Latn', native: 'Latina', script: 'Latin' },
  { name: 'romani', code: 'rom', nllbCode: 'rom_Latn', native: 'Romani', script: 'Latin' },
  { name: 'ladino', code: 'lad', nllbCode: 'lad_Latn', native: 'Ladino', script: 'Latin' },
  { name: 'aragonese', code: 'an', nllbCode: 'arg_Latn', native: 'Aragonés', script: 'Latin' },
  { name: 'asturian', code: 'ast', nllbCode: 'ast_Latn', native: 'Asturianu', script: 'Latin' },
  { name: 'corsican', code: 'co', nllbCode: 'cos_Latn', native: 'Corsu', script: 'Latin' },
  { name: 'sardinian', code: 'sc', nllbCode: 'srd_Latn', native: 'Sardu', script: 'Latin' },
  { name: 'friulian', code: 'fur', nllbCode: 'fur_Latn', native: 'Furlan', script: 'Latin' },
  { name: 'ligurian', code: 'lij', nllbCode: 'lij_Latn', native: 'Lìgure', script: 'Latin' },
  { name: 'lombard', code: 'lmo', nllbCode: 'lmo_Latn', native: 'Lumbaart', script: 'Latin' },
  { name: 'sicilian', code: 'scn', nllbCode: 'scn_Latn', native: 'Sicilianu', script: 'Latin' },
  { name: 'venetian', code: 'vec', nllbCode: 'vec_Latn', native: 'Vèneto', script: 'Latin' },
  { name: 'sorbian', code: 'hsb', nllbCode: 'hsb_Latn', native: 'Hornjoserbšćina', script: 'Latin' },
  { name: 'kashubian', code: 'csb', nllbCode: 'csb_Latn', native: 'Kaszëbsczi', script: 'Latin' },
  { name: 'silesian', code: 'szl', nllbCode: 'szl_Latn', native: 'Ślōnsko', script: 'Latin' },
  { name: 'rusyn', code: 'rue', nllbCode: 'rue_Cyrl', native: 'Русиньскый', script: 'Cyrillic' },
  { name: 'crimean_tatar', code: 'crh', nllbCode: 'crh_Latn', native: 'Qırımtatarca', script: 'Latin' },
  { name: 'tatar', code: 'tt', nllbCode: 'tat_Cyrl', native: 'Татар', script: 'Cyrillic' },
  { name: 'bashkir', code: 'ba', nllbCode: 'bak_Cyrl', native: 'Башҡорт', script: 'Cyrillic' },
  { name: 'chuvash', code: 'cv', nllbCode: 'chv_Cyrl', native: 'Чӑваш', script: 'Cyrillic' },
  { name: 'sakha', code: 'sah', nllbCode: 'sah_Cyrl', native: 'Саха', script: 'Cyrillic' },
  { name: 'buryat', code: 'bua', nllbCode: 'bua_Cyrl', native: 'Буряад', script: 'Cyrillic' },
  { name: 'kalmyk', code: 'xal', nllbCode: 'xal_Cyrl', native: 'Хальмг', script: 'Cyrillic' },
  { name: 'karakalpak', code: 'kaa', nllbCode: 'kaa_Cyrl', native: 'Qaraqalpaq', script: 'Latin' },
  { name: 'shan', code: 'shn', nllbCode: 'shn_Mymr', native: 'လိၵ်ႈတႆး', script: 'Myanmar' },
  { name: 'karen', code: 'kar', nllbCode: 'kar_Mymr', native: 'ကညီ', script: 'Myanmar' },
  { name: 'mon', code: 'mnw', nllbCode: 'mnw_Mymr', native: 'မန်', script: 'Myanmar' },
  { name: 'cham', code: 'cjm', nllbCode: 'cja_Cham', native: 'Chăm', script: 'Cham' },
  { name: 'hmong', code: 'hmn', nllbCode: 'hmn_Latn', native: 'Hmoob', script: 'Latin' },
  { name: 'zhuang', code: 'za', nllbCode: 'zha_Latn', native: 'Vahcuengh', script: 'Latin' },
  { name: 'yi', code: 'ii', nllbCode: 'iii_Yiii', native: 'ꆈꌠꉙ', script: 'Yi' },
  { name: 'naxi', code: 'nxq', nllbCode: 'nxq_Latn', native: 'Nakhi', script: 'Latin' },
  { name: 'bai', code: 'bca', nllbCode: 'bca_Latn', native: 'Baip', script: 'Latin' },
  { name: 'lisu', code: 'lis', nllbCode: 'lis_Lisu', native: 'ꓡꓲꓢꓳ', script: 'Lisu' },
  { name: 'newari', code: 'new', nllbCode: 'new_Deva', native: 'नेपाल भाषा', script: 'Devanagari' },
  { name: 'sherpa', code: 'xsr', nllbCode: 'bod_Tibt', native: 'ཤེར་པ', script: 'Tibetan' },
  { name: 'tamang', code: 'taj', nllbCode: 'npi_Deva', native: 'तामाङ', script: 'Devanagari' },
  { name: 'gurung', code: 'gvr', nllbCode: 'npi_Deva', native: 'तमु', script: 'Devanagari' },
  { name: 'magar', code: 'mgp', nllbCode: 'npi_Deva', native: 'मगर', script: 'Devanagari' },
  { name: 'tharu', code: 'the', nllbCode: 'npi_Deva', native: 'थारू', script: 'Devanagari' },
  { name: 'rai', code: 'rai', nllbCode: 'npi_Deva', native: 'किरात', script: 'Devanagari' },
  { name: 'balochi', code: 'bal', nllbCode: 'bal_Arab', native: 'بلوچی', script: 'Arabic', rtl: true },
  { name: 'brahui', code: 'brh', nllbCode: 'brh_Arab', native: 'براہوئی', script: 'Arabic', rtl: true },
  { name: 'saraiki', code: 'skr', nllbCode: 'skr_Arab', native: 'سرائیکی', script: 'Arabic', rtl: true },
  { name: 'hindko', code: 'hno', nllbCode: 'hno_Arab', native: 'ہندکو', script: 'Arabic', rtl: true },
  { name: 'shina', code: 'scl', nllbCode: 'scl_Arab', native: 'شینا', script: 'Arabic', rtl: true },
  { name: 'burushaski', code: 'bsk', nllbCode: 'bsk_Arab', native: 'بروشسکی', script: 'Arabic', rtl: true },
  { name: 'khowar', code: 'khw', nllbCode: 'khw_Arab', native: 'کھوار', script: 'Arabic', rtl: true },
  { name: 'kalasha', code: 'kls', nllbCode: 'kls_Arab', native: 'کالاشہ', script: 'Arabic', rtl: true },
  { name: 'chittagonian', code: 'ctg', nllbCode: 'ben_Beng', native: 'চাটগাঁইয়া', script: 'Bengali' },
  { name: 'sylheti', code: 'syl', nllbCode: 'ben_Beng', native: 'সিলটি', script: 'Bengali' },
  { name: 'rohingya', code: 'rhg', nllbCode: 'rhg_Arab', native: 'Ruáingga', script: 'Arabic', rtl: true },
  { name: 'chakma', code: 'ccp', nllbCode: 'ccp_Cakm', native: '𑄌𑄋𑄴𑄟𑄳', script: 'Chakma' },
];

// ============================================================
// LANGUAGE UTILITIES
// ============================================================

// Create lookup maps for fast access
const languageByName = new Map(LANGUAGES.map(l => [l.name.toLowerCase(), l]));
const languageByCode = new Map(LANGUAGES.map(l => [l.code.toLowerCase(), l]));

// Comprehensive language aliases for all variations
const languageAliases: Record<string, string> = {
  // Common aliases
  bangla: 'bengali',
  oriya: 'odia',
  farsi: 'persian',
  mandarin: 'chinese',
  taiwanese: 'chinese',
  brazilian: 'portuguese',
  mexican: 'spanish',
  flemish: 'dutch',
  
  // Indian language aliases
  meiteilon: 'manipuri',
  meithei: 'meitei',
  braj: 'hindi',
  khari_boli: 'hindi',
  deccani: 'urdu',
  shahmukhi: 'punjabi',
  gurmukhi: 'punjabi',
  konkani_goan: 'konkani',
  goan: 'konkani',
  kudmali: 'nagpuri',
  
  // Regional variations
  marwadi: 'marwari',
  bodo_boro: 'bodo',
  boro: 'bodo',
  santhali: 'santali',
  munda: 'mundari',
  
  // Script variations
  kashmiri_devanagari: 'kashmiri',
  kashmiri_arabic: 'kashmiri',
  sindhi_devanagari: 'sindhi',
  urdu_devanagari: 'hindi',
  
  // Arabic dialects
  masri: 'egyptian_arabic',
  shami: 'levantine_arabic',
  khaleeji: 'gulf_arabic',
  darija: 'maghrebi_arabic',
  
  // Chinese dialects
  yue: 'cantonese',
  shanghainese: 'wu_chinese',
  hokkien: 'min_nan',
  teochew: 'min_nan',
  
  // Other aliases
  filipino: 'tagalog',
  pilipino: 'tagalog',
  serbocroatian: 'serbian',
  montenegrin: 'serbian',
  bosniak: 'bosnian',
  moldovan: 'romanian',
  valencian: 'catalan',
  kirghiz: 'kyrgyz',
  uyghur: 'uighur',
  
  // Additional Indian tribal/regional
  rajbangsi: 'bengali',
  bishnupriya: 'manipuri',
  dimasa: 'bodo',
  tiwa: 'bodo',
  deori: 'bodo',
  rabha: 'assamese',
  missing: 'mishing',
  
  // Pakistani languages
  pothohari: 'punjabi',
  pahari_pothohari: 'punjabi',
  potohari: 'punjabi',
};

// Non-Latin script languages (need transliteration when typed in Latin)
const nonLatinScriptLanguages = new Set(
  LANGUAGES.filter(l => l.script !== 'Latin').map(l => l.name)
);

// Script detection patterns for all world scripts
const scriptPatterns: Array<{ regex: RegExp; script: string; language: string }> = [
  // South Asian scripts
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', language: 'hindi' },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', language: 'bengali' },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', language: 'tamil' },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', language: 'telugu' },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', language: 'kannada' },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', language: 'malayalam' },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', language: 'gujarati' },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', language: 'punjabi' },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', language: 'odia' },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', language: 'sinhala' },
  { regex: /[\u0F00-\u0FFF]/, script: 'Tibetan', language: 'tibetan' },
  { regex: /[\u1C50-\u1C7F]/, script: 'Ol_Chiki', language: 'santali' },

  // East Asian scripts
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', language: 'chinese' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', language: 'japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, script: 'Hangul', language: 'korean' },

  // Southeast Asian scripts
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', language: 'thai' },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', language: 'lao' },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', language: 'burmese' },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', language: 'khmer' },

  // Middle Eastern scripts
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, script: 'Arabic', language: 'arabic' },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', language: 'hebrew' },
  { regex: /[\u0780-\u07BF]/, script: 'Thaana', language: 'dhivehi' },

  // European scripts
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', language: 'russian' },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', language: 'greek' },

  // Caucasian scripts
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', language: 'georgian' },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', language: 'armenian' },

  // African scripts
  { regex: /[\u1200-\u137F\u1380-\u139F]/, script: 'Ethiopic', language: 'amharic' },
  { regex: /[\u2D30-\u2D7F]/, script: 'Tifinagh', language: 'berber' },
];

function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim().replace(/[_-]/g, '_');
  return languageAliases[normalized] || normalized;
}

function getLanguageInfo(language: string): LanguageInfo | undefined {
  const normalized = normalizeLanguage(language);
  return languageByName.get(normalized) || languageByCode.get(normalized);
}

// Map of language codes not supported by Google/MyMemory to their closest supported equivalent
const UNSUPPORTED_TO_SUPPORTED_FALLBACK: Record<string, string> = {
  // Indian regional/tribal languages without direct Google support
  'tcy': 'kn',    // Tulu → Kannada
  'kfa': 'kn',    // Kodava → Kannada
  'bfq': 'kn',    // Badaga → Kannada
  'tcx': 'ta',    // Toda → Tamil
  'iru': 'ta',    // Irula → Tamil
  'kfh': 'ml',    // Kuruma → Malayalam
  'bho': 'hi',    // Bhojpuri → Hindi
  'hne': 'hi',    // Chhattisgarhi → Hindi
  'raj': 'hi',    // Rajasthani → Hindi
  'mwr': 'hi',    // Marwari → Hindi
  'mtr': 'hi',    // Mewari → Hindi
  'bgc': 'hi',    // Haryanvi → Hindi
  'mag': 'hi',    // Magahi → Hindi
  'anp': 'hi',    // Angika → Hindi
  'bjj': 'hi',    // Bajjika/Kanauji → Hindi
  'awa': 'hi',    // Awadhi → Hindi
  'bns': 'hi',    // Bundeli/Banjara → Hindi
  'bfy': 'hi',    // Bagheli → Hindi
  'gbm': 'hi',    // Garhwali → Hindi
  'kfy': 'hi',    // Kumaoni → Hindi
  'him': 'hi',    // Pahari → Hindi
  'bhb': 'hi',    // Bhili → Hindi
  'bhi': 'hi',    // Bhilodi → Hindi
  'gon': 'hi',    // Gondi → Hindi
  'lmn': 'hi',    // Lambadi → Hindi
  'sck': 'hi',    // Nagpuri/Sadri → Hindi
  'kru': 'hi',    // Kurukh/Oraon → Hindi
  'unr': 'hi',    // Mundari → Hindi
  'hoc': 'hi',    // Ho → Hindi
  'khr': 'hi',    // Kharia → Hindi
  'vav': 'mr',    // Warli/Varli → Marathi
  'kok': 'mr',    // Konkani → Marathi (closest major)
  'wbq': 'te',    // Waddar → Telugu
  'kff': 'te',    // Koya → Telugu
  'kdu': 'te',    // Kadaru → Telugu
  'yed': 'te',    // Yerukala → Telugu
  'brx': 'hi',    // Bodo → Hindi
  'sat': 'hi',    // Santali → Hindi
  'lus': 'en',    // Mizo → English (no close major)
  'kha': 'en',    // Khasi → English
  'grt': 'bn',    // Garo → Bengali
  'mjw': 'as',    // Karbi → Assamese
  'trp': 'bn',    // Kokborok → Bengali
  'rah': 'as',    // Rabha → Assamese
  'mrg': 'as',    // Mishing → Assamese
  'njz': 'as',    // Nyishi → Assamese
  'apt': 'as',    // Apatani → Assamese
  'adi': 'as',    // Adi → Assamese
  'lep': 'ne',    // Lepcha → Nepali
  'sip': 'ne',    // Bhutia/Sikkimese → Nepali
  'lif': 'ne',    // Limbu → Nepali
  'njo': 'as',    // Ao → Assamese
  'njh': 'as',    // Lotha → Assamese
  'nsm': 'as',    // Sema/Sumi → Assamese
  'njm': 'as',    // Angami → Assamese
  'nmf': 'bn',    // Tangkhul → Bengali
  'pck': 'bn',    // Paite → Bengali
  'tcz': 'bn',    // Thadou → Bengali
  'nbu': 'bn',    // Rongmei → Bengali
  'nst': 'as',    // Tangsa → Assamese
  'nnp': 'as',    // Wancho → Assamese
  'njb': 'as',    // Nocte → Assamese
  'mni': 'bn',    // Manipuri/Meitei → Bengali
  'meit': 'bn',   // Meitei → Bengali
  'doi': 'hi',    // Dogri → Hindi
  'mai': 'hi',    // Maithili → Hindi (has direct support in some cases)
};

function getLibreCode(language: string): string {
  const info = getLanguageInfo(language);
  const originalCode = info?.code || 'en';
  
  // Check if this code needs to be mapped to a supported one
  const mappedCode = UNSUPPORTED_TO_SUPPORTED_FALLBACK[originalCode];
  if (mappedCode) {
    console.log(`[dl-translate] Mapping unsupported code ${originalCode} -> ${mappedCode}`);
    return mappedCode;
  }
  
  return originalCode;
}

function getNllbCode(language: string): string {
  const info = getLanguageInfo(language);
  return info?.nllbCode || 'eng_Latn';
}

function detectScriptFromText(text: string): { language: string; script: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: 'english', script: 'Latin', isLatin: true };

  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.language, script: pattern.script, isLatin: false };
    }
  }

  // Check if Latin script
  const latinChars = trimmed.match(/[a-zA-ZÀ-ÿĀ-žƀ-ɏ]/g) || [];
  const totalChars = trimmed.replace(/\s/g, '').length;
  const isLatin = totalChars > 0 && latinChars.length / totalChars > 0.5;

  return { language: 'english', script: 'Latin', isLatin };
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

function isNonLatinLanguage(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return nonLatinScriptLanguages.has(normalized);
}

// ============================================================
// TRANSLATION API IMPLEMENTATIONS
// ============================================================

// LibreTranslate mirrors (free, open-source)
const LIBRE_TRANSLATE_MIRRORS = [
  "https://libretranslate.com",
  "https://translate.argosopentech.com",
  "https://translate.terraprint.co",
];

// Translate using LibreTranslate
async function translateWithLibre(
  text: string,
  sourceCode: string,
  targetCode: string
): Promise<{ translatedText: string; success: boolean }> {
  for (const mirror of LIBRE_TRANSLATE_MIRRORS) {
    try {
      console.log(`[dl-translate] Trying LibreTranslate: ${mirror}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(`${mirror}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceCode === "auto" ? "auto" : sourceCode,
          target: targetCode,
          format: "text",
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const translated = data.translatedText?.trim();
        if (translated && translated !== text) {
          console.log(`[dl-translate] LibreTranslate success via ${mirror}`);
          return { translatedText: translated, success: true };
        }
      }
    } catch (error) {
      console.log(`[dl-translate] Mirror ${mirror} failed`);
    }
  }

  return { translatedText: text, success: false };
}

// Translate using MyMemory (fallback)
// FIXED: Split long messages into chunks to avoid URL length limits
async function translateWithMyMemory(
  text: string,
  sourceCode: string,
  targetCode: string
): Promise<{ translatedText: string; success: boolean }> {
  try {
    console.log('[dl-translate] Trying MyMemory fallback...');
    
    // MyMemory has a 500 character limit per request
    const MAX_CHUNK_SIZE = 450;
    
    if (text.length > MAX_CHUNK_SIZE) {
      console.log(`[dl-translate] Long message for MyMemory (${text.length} chars), splitting into chunks`);
      const chunks = splitTextIntoChunks(text, MAX_CHUNK_SIZE);
      const translatedChunks: string[] = [];
      
      for (const chunk of chunks) {
        const result = await translateChunkWithMyMemory(chunk, sourceCode, targetCode);
        if (result.success) {
          translatedChunks.push(result.translatedText);
        } else {
          return { translatedText: text, success: false };
        }
      }
      
      const fullTranslation = translatedChunks.join(' ').trim();
      console.log(`[dl-translate] MyMemory chunked success: ${chunks.length} chunks`);
      return { translatedText: fullTranslation, success: true };
    }
    
    return await translateChunkWithMyMemory(text, sourceCode, targetCode);
  } catch (error) {
    console.log('[dl-translate] MyMemory failed');
  }

  return { translatedText: text, success: false };
}

// Helper: Translate a single chunk with MyMemory
async function translateChunkWithMyMemory(
  text: string,
  sourceCode: string,
  targetCode: string
): Promise<{ translatedText: string; success: boolean }> {
  try {
    const langPair = `${sourceCode}|${targetCode}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const translated = data.responseData?.translatedText?.trim();
      if (translated && 
          translated !== text &&
          !translated.includes('MYMEMORY WARNING') &&
          translated.toLowerCase() !== text.toLowerCase()) {
        return { translatedText: translated, success: true };
      }
    }
  } catch (error) {
    console.log('[dl-translate] MyMemory chunk failed');
  }

  return { translatedText: text, success: false };
}

// Translate using Google Translate (unofficial free API)
// FIXED: Split long messages into chunks to avoid URL length limits
async function translateWithGoogle(
  text: string,
  sourceCode: string,
  targetCode: string
): Promise<{ translatedText: string; success: boolean }> {
  try {
    console.log('[dl-translate] Trying Google Translate fallback...');
    
    // URL length limit is ~2000 chars, but encoded text can be 3x longer
    // Split messages longer than 500 chars into chunks
    const MAX_CHUNK_SIZE = 500;
    
    if (text.length > MAX_CHUNK_SIZE) {
      console.log(`[dl-translate] Long message (${text.length} chars), splitting into chunks`);
      const chunks = splitTextIntoChunks(text, MAX_CHUNK_SIZE);
      const translatedChunks: string[] = [];
      
      for (const chunk of chunks) {
        const result = await translateChunkWithGoogle(chunk, sourceCode, targetCode);
        if (result.success) {
          translatedChunks.push(result.translatedText);
        } else {
          // If any chunk fails, return failure
          return { translatedText: text, success: false };
        }
      }
      
      const fullTranslation = translatedChunks.join(' ').trim();
      console.log(`[dl-translate] Google Translate chunked success: ${chunks.length} chunks`);
      return { translatedText: fullTranslation, success: true };
    }
    
    return await translateChunkWithGoogle(text, sourceCode, targetCode);
  } catch (error) {
    console.log('[dl-translate] Google Translate failed:', error);
  }

  return { translatedText: text, success: false };
}

// Helper: Split text into chunks at sentence/word boundaries
function splitTextIntoChunks(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxSize) {
      chunks.push(remaining);
      break;
    }
    
    // Try to split at sentence boundary
    let splitPoint = remaining.lastIndexOf('. ', maxSize);
    if (splitPoint === -1 || splitPoint < maxSize * 0.5) {
      splitPoint = remaining.lastIndexOf('। ', maxSize); // Hindi/Devanagari sentence end
    }
    if (splitPoint === -1 || splitPoint < maxSize * 0.5) {
      splitPoint = remaining.lastIndexOf('? ', maxSize);
    }
    if (splitPoint === -1 || splitPoint < maxSize * 0.5) {
      splitPoint = remaining.lastIndexOf('! ', maxSize);
    }
    if (splitPoint === -1 || splitPoint < maxSize * 0.5) {
      // Fall back to word boundary
      splitPoint = remaining.lastIndexOf(' ', maxSize);
    }
    if (splitPoint === -1 || splitPoint < maxSize * 0.3) {
      // Last resort: hard split
      splitPoint = maxSize;
    }
    
    chunks.push(remaining.substring(0, splitPoint + 1).trim());
    remaining = remaining.substring(splitPoint + 1).trim();
  }
  
  return chunks;
}

// Helper: Translate a single chunk with Google
async function translateChunkWithGoogle(
  text: string,
  sourceCode: string,
  targetCode: string
): Promise<{ translatedText: string; success: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for reliability
    
    // Using the free Google Translate API endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, { signal: controller.signal });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      // Google returns array format: [[["translated text","original text",null,null,10]],null,"en",null,null,null,null,[]]
      if (data && Array.isArray(data) && data[0]) {
        const translations = data[0];
        let translated = '';
        for (const t of translations) {
          if (t && t[0]) {
            translated += t[0];
          }
        }
        translated = translated.trim();
        if (translated && translated !== text && translated.toLowerCase() !== text.toLowerCase()) {
          return { translatedText: translated, success: true };
        }
      }
    }
  } catch (error) {
    console.log('[dl-translate] Google chunk translation failed:', error);
  }

  return { translatedText: text, success: false };
}

/**
 * Main translation function using English pivot for all language pairs
 * This ensures we can translate between ANY two languages even if direct translation isn't available
 */
async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ translatedText: string; success: boolean; pivotUsed: boolean }> {
  const sourceCode = getLibreCode(sourceLanguage);
  const targetCode = getLibreCode(targetLanguage);

  console.log(`[dl-translate] Translating: ${sourceCode} -> ${targetCode}`);

  // For non-English to non-English pairs, ALWAYS use English pivot for reliability
  // Direct translation between rare pairs often returns English instead of target language
  if (sourceCode !== 'en' && targetCode !== 'en') {
    console.log('[dl-translate] Non-English pair, using English pivot for reliability');
    
    // Step 1: Translate source -> English
    let pivotResult = await translateWithGoogle(text, sourceCode, 'en');
    if (!pivotResult.success) {
      pivotResult = await translateWithMyMemory(text, sourceCode, 'en');
    }
    if (!pivotResult.success) {
      pivotResult = await translateWithLibre(text, sourceCode, 'en');
    }

    if (pivotResult.success && pivotResult.translatedText.trim() !== text.trim()) {
      const englishText = pivotResult.translatedText.trim();
      console.log(`[dl-translate] Pivot step 1 (${sourceCode}->en): "${englishText.substring(0, 50)}..."`);
      
      // Step 2: Translate English -> target
      let finalResult = await translateWithGoogle(englishText, 'en', targetCode);
      if (!finalResult.success) {
        finalResult = await translateWithMyMemory(englishText, 'en', targetCode);
      }
      if (!finalResult.success) {
        finalResult = await translateWithLibre(englishText, 'en', targetCode);
      }

      if (finalResult.success) {
        console.log(`[dl-translate] Pivot step 2 (en->${targetCode}): "${finalResult.translatedText.substring(0, 50)}..."`);
        console.log('[dl-translate] English pivot translation success');
        return { translatedText: finalResult.translatedText.trim(), success: true, pivotUsed: true };
      } else {
        // Step 2 failed, return English text as fallback (better than original)
        console.log('[dl-translate] Pivot step 2 failed, returning English');
        return { translatedText: englishText, success: true, pivotUsed: true };
      }
    }
    
    // If pivot step 1 failed, fall through to direct translation attempts
    console.log('[dl-translate] Pivot step 1 failed, trying direct translation');
  }

  // Try direct translation (for English<->X pairs, or as fallback)
  let result = await translateWithGoogle(text, sourceCode, targetCode);
  if (result.success) {
    return { translatedText: result.translatedText.trim(), success: true, pivotUsed: false };
  }

  result = await translateWithMyMemory(text, sourceCode, targetCode);
  if (result.success) {
    return { translatedText: result.translatedText.trim(), success: true, pivotUsed: false };
  }

  result = await translateWithLibre(text, sourceCode, targetCode);
  if (result.success) {
    return { translatedText: result.translatedText.trim(), success: true, pivotUsed: false };
  }

  // All translation attempts failed
  console.log('[dl-translate] All translation attempts failed, returning original text');
  return { translatedText: text.trim(), success: false, pivotUsed: false };
}

/**
 * Clean and normalize text output
 * Removes extra whitespace, tabs, newlines from translation results
 */
function cleanTextOutput(text: string): string {
  if (!text) return text;
  return text
    .replace(/[\t\n\r]+/g, ' ')  // Replace tabs/newlines with spaces
    .replace(/\s+/g, ' ')         // Collapse multiple spaces
    .trim();                       // Trim leading/trailing
}

/**
 * Transliterate Latin text to native script
 * Converts romanized input like "bagunnava" to native script "బాగున్నావా"
 */
async function transliterateToNative(
  latinText: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean }> {
  const targetCode = getLibreCode(targetLanguage);
  
  console.log(`[dl-translate] Transliterating to ${targetLanguage} (${targetCode})`);
  
  // Use translation from English to target language for transliteration
  let result = await translateWithLibre(latinText, 'en', targetCode);
  
  if (!result.success) {
    result = await translateWithMyMemory(latinText, 'en', targetCode);
  }
  
  // Check if the result is in native script (not Latin)
  if (result.success) {
    const cleanedResult = cleanTextOutput(result.translatedText);
    const detected = detectScriptFromText(cleanedResult);
    if (!detected.isLatin && cleanedResult.length > 0) {
      console.log(`[dl-translate] Transliteration success: "${latinText}" -> "${cleanedResult}"`);
      return { text: cleanedResult, success: true };
    }
  }
  
  console.log(`[dl-translate] Transliteration failed, keeping original`);
  return { text: latinText.trim(), success: false };
}

// ============================================================
// MAIN REQUEST HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      text, 
      message,
      sourceLanguage,
      source,  // Alternative parameter name
      targetLanguage,
      target,  // Alternative parameter name  
      senderLanguage,
      receiverLanguage,
      mode = "translate" 
    } = body;

    // Support both 'source/target' and 'sourceLanguage/targetLanguage' params
    const effectiveSourceParam = sourceLanguage || source || senderLanguage;
    const effectiveTargetParam = targetLanguage || target || receiverLanguage;

    const inputText = text || message;
    console.log(`[dl-translate] Mode: ${mode}, Input: "${inputText?.substring(0, 50)}..."`);
    console.log(`[dl-translate] Params: source=${effectiveSourceParam}, target=${effectiveTargetParam}`);

    // ================================================================
    // MODE: bidirectional - Translate both directions in one call
    // Source → English → Target AND Target → English → Source
    // ================================================================
    if (mode === "bidirectional") {
      const langA = effectiveSourceParam || "english";
      const langB = effectiveTargetParam || "english";
      
      console.log(`[dl-translate] Bidirectional: ${langA} ↔ ${langB}`);
      
      // Forward: A → English → B
      const forward = await translateText(inputText, langA, langB);
      
      // Reverse: B → English → A (translate the forward result back)
      const reverse = await translateText(forward.translatedText, langB, langA);
      
      return new Response(
        JSON.stringify({
          forward: {
            translatedText: cleanTextOutput(forward.translatedText),
            originalText: inputText,
            sourceLanguage: langA,
            targetLanguage: langB,
            isTranslated: forward.success,
            pivotUsed: forward.pivotUsed,
          },
          reverse: {
            translatedText: cleanTextOutput(reverse.translatedText),
            originalText: forward.translatedText,
            sourceLanguage: langB,
            targetLanguage: langA,
            isTranslated: reverse.success,
            pivotUsed: reverse.pivotUsed,
          },
          mode: "bidirectional",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // MODE: test - Test translation for a specific language pair
    // ================================================================
    if (mode === "test") {
      const testSource = effectiveSourceParam || "telugu";
      const testTarget = effectiveTargetParam || "english";
      const testText = inputText || "bagunnava";
      
      console.log(`[dl-translate] Testing: "${testText}" from ${testSource} to ${testTarget}`);
      
      const result = await translateText(testText, testSource, testTarget);
      
      return new Response(
        JSON.stringify({
          test: true,
          input: testText,
          output: cleanTextOutput(result.translatedText),
          sourceLanguage: testSource,
          targetLanguage: testTarget,
          success: result.success,
          pivotUsed: result.pivotUsed,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // MODE: languages - Return list of supported 65 languages
    // ================================================================
    if (mode === "languages") {
      const supportedLanguages = LANGUAGES.slice(0, 65).map(l => ({
        name: l.name,
        code: l.code,
        nllbCode: l.nllbCode,
        native: l.native,
        script: l.script,
        rtl: l.rtl || false,
      }));
      
      return new Response(
        JSON.stringify({
          count: supportedLanguages.length,
          languages: supportedLanguages,
          totalCombinations: 65 * 64, // 4160 pairs
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!inputText) {
      return new Response(
        JSON.stringify({ error: "Text or message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect source script
    const detected = detectScriptFromText(inputText);
    const effectiveSource = effectiveSourceParam || detected.language;
    const effectiveTarget = effectiveTargetParam || "english";
    const inputIsLatin = detected.isLatin;

    console.log(`[dl-translate] Detected: ${detected.language} (${detected.script}), isLatin: ${inputIsLatin}`);
    console.log(`[dl-translate] Effective: ${effectiveSource} -> ${effectiveTarget}`);

    // ================================================================
    // CASE 1: Latin input for non-Latin source language
    // User typed romanized text (e.g., "bagunnava" for Telugu)
    // Need to: 1) Transliterate to source script 2) Translate to target
    // ================================================================
    if (inputIsLatin && isNonLatinLanguage(effectiveSource) && !isSameLanguage(effectiveSource, effectiveTarget)) {
      console.log(`[dl-translate] Romanized input detected for ${effectiveSource}`);
      
      // Step 1: Transliterate Latin to source language native script
      const transliterated = await transliterateToNative(inputText, effectiveSource);
      
      if (transliterated.success) {
        console.log(`[dl-translate] Transliterated: "${inputText}" -> "${transliterated.text}"`);
        
        // Step 2: Translate from source native script to target language
        const translated = await translateText(transliterated.text, effectiveSource, effectiveTarget);
        const cleanedTranslation = cleanTextOutput(translated.translatedText);

        // Step 3: Get English translation if target is not English
        let englishText = "";
        if (!isSameLanguage(effectiveTarget, "english")) {
          const englishTranslation = await translateText(transliterated.text, effectiveSource, "english");
          englishText = cleanTextOutput(englishTranslation.translatedText);
        } else {
          englishText = cleanedTranslation; // Target is already English
        }

        return new Response(
          JSON.stringify({
            translatedText: cleanedTranslation,
            translatedMessage: cleanedTranslation,
            originalText: inputText,
            nativeScriptText: transliterated.text,
            englishText: englishText,
            isTranslated: translated.success,
            wasTransliterated: true,
            pivotUsed: translated.pivotUsed,
            detectedLanguage: effectiveSource,
            sourceLanguage: effectiveSource,
            targetLanguage: effectiveTarget,
            isSourceLatin: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Transliteration failed, fall through to direct translation
      console.log(`[dl-translate] Transliteration failed, trying direct translation`);
    }

    // ================================================================
    // CASE 2: Same language - only script conversion needed
    // ================================================================
    if (isSameLanguage(effectiveSource, effectiveTarget)) {
      // If input is Latin but target is non-Latin, convert to native script
      if (inputIsLatin && isNonLatinLanguage(effectiveTarget)) {
        console.log(`[dl-translate] Same language, converting to native script`);
        const converted = await transliterateToNative(inputText, effectiveTarget);
        const cleanedText = cleanTextOutput(converted.success ? converted.text : inputText);
        
        // Get English translation for non-English languages
        let englishText = "";
        if (!isSameLanguage(effectiveTarget, "english")) {
          const englishTranslation = await translateText(cleanedText, effectiveTarget, "english");
          englishText = cleanTextOutput(englishTranslation.translatedText);
        }
        
        return new Response(
          JSON.stringify({
            translatedText: cleanedText,
            translatedMessage: cleanedText,
            originalText: inputText,
            englishText: englishText,
            isTranslated: false,
            wasTransliterated: converted.success,
            detectedLanguage: detected.language,
            sourceLanguage: effectiveSource,
            targetLanguage: effectiveTarget,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Same language, same script - no conversion needed
      console.log('[dl-translate] Same language, skipping translation');
      return new Response(
        JSON.stringify({
          translatedText: cleanTextOutput(inputText),
          translatedMessage: cleanTextOutput(inputText),
          originalText: inputText,
          isTranslated: false,
          detectedLanguage: detected.language,
          sourceLanguage: effectiveSource,
          targetLanguage: effectiveTarget,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // CASE 3: Standard translation between different languages
    // This is the main translation path: English -> Telugu, Hindi -> English, etc.
    // ================================================================
    
    // Determine effective source for translation
    // CRITICAL: Only default to English if NO source language was explicitly provided
    // If user passed sourceLanguage/source (e.g., 'german'), respect it even for Latin script
    const wasSourceExplicitlyProvided = !!effectiveSourceParam;
    const translateFrom = wasSourceExplicitlyProvided 
      ? effectiveSource 
      : (inputIsLatin ? 'english' : effectiveSource);
    
    console.log(`[dl-translate] Standard translation: ${translateFrom} -> ${effectiveTarget}`);
    console.log(`[dl-translate] Source explicit: ${wasSourceExplicitlyProvided}, Input: "${inputText.substring(0, 50)}"`);
    
    const result = await translateText(inputText, translateFrom, effectiveTarget);

    const cleanedResult = cleanTextOutput(result.translatedText);
    
    // Check if translation actually changed the text
    const wasActuallyTranslated = result.success && 
                                   cleanedResult.toLowerCase().trim() !== inputText.toLowerCase().trim();
    
    // Get English translation if neither source nor target is English
    let englishText = "";
    if (!isSameLanguage(translateFrom, "english") && !isSameLanguage(effectiveTarget, "english")) {
      const englishTranslation = await translateText(inputText, translateFrom, "english");
      englishText = cleanTextOutput(englishTranslation.translatedText);
    } else if (isSameLanguage(translateFrom, "english")) {
      englishText = inputText; // Source is English
    } else if (isSameLanguage(effectiveTarget, "english")) {
      englishText = cleanedResult; // Target is English
    }
    
    console.log(`[dl-translate] Translation result: "${cleanedResult.substring(0, 100)}..."`);
    console.log(`[dl-translate] Was translated: ${wasActuallyTranslated}, pivot: ${result.pivotUsed}`);

    return new Response(
      JSON.stringify({
        translatedText: cleanedResult,
        translatedMessage: cleanedResult,
        originalText: inputText,
        englishText: englishText,
        isTranslated: wasActuallyTranslated,
        pivotUsed: result.pivotUsed,
        detectedLanguage: detected.language,
        sourceLanguage: translateFrom,
        targetLanguage: effectiveTarget,
        isSourceLatin: inputIsLatin,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[dl-translate] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
