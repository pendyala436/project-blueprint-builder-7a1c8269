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

// Add native names to lookup
const languageByNative = new Map(LANGUAGES.map(l => [l.native.toLowerCase(), l]));

// Comprehensive language aliases for all 1000+ language variations
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
  
  // Indian language aliases (complete coverage for profile languages)
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
  
  // Additional aliases for 1000+ language support
  // African languages
  afar: 'amharic',
  tigre: 'tigrinya',
  saho: 'amharic',
  beja: 'arabic',
  nubian: 'arabic',
  fur: 'arabic',
  masalit: 'arabic',
  zaghawa: 'arabic',
  
  // European minorities
  sorb: 'sorbian',
  wendish: 'sorbian',
  kashub: 'kashubian',
  szlonzok: 'silesian',
  ruthenian: 'rusyn',
  carpatho_rusyn: 'rusyn',
  
  // Central Asian
  hazara: 'dari',
  aimaq: 'dari',
  pamiri: 'tajik',
  wakhi: 'tajik',
  shughni: 'tajik',
  
  // Southeast Asian
  shan_state: 'shan',
  kayah: 'karen',
  kayin: 'karen',
  pa_o: 'karen',
  moken: 'burmese',
  
  // Pacific/Oceanian
  fijian_hindi: 'hindi',
  fiji_hindi: 'hindi',
  rotuman: 'fijian',
  
  // South Asian regional
  khandeshi: 'marathi',
  ahirani: 'marathi',
  varhadi: 'marathi',
  kolhapuri: 'marathi',
  malvani: 'konkani',
  kutchi: 'gujarati',
  kutchhi: 'gujarati',
  mewati: 'hindi',
  nimadi: 'hindi',
  malvi: 'hindi',
  harauti: 'hindi',
  wagdi: 'gujarati',
  dungri: 'gujarati',
  gamit: 'gujarati',
  vasavi: 'gujarati',
  pardhi: 'marathi',
  powari: 'marathi',
  bhatri: 'odia',
  desia: 'odia',
  sambalpuri: 'odia',
  kui: 'odia',
  kuvi: 'telugu',
  savara: 'odia',
  juang: 'odia',
  parji: 'telugu',
  gadaba: 'telugu',
  kolami: 'telugu',
  naiki: 'telugu',
  yerukula: 'telugu',
  sugali: 'telugu',
  
  // Northeast Indian
  hajong: 'bengali',
  koch: 'bengali',
  rajbanshi: 'bengali',
  rangpuri: 'bengali',
  tipra: 'bengali',
  reang: 'bengali',
  halam: 'bengali',
  jamatia: 'bengali',
  noatia: 'bengali',
  riang: 'bengali',
};

// Non-Latin script languages (need transliteration when typed in Latin)
const nonLatinScriptLanguages = new Set(
  LANGUAGES.filter(l => l.script !== 'Latin').map(l => l.name)
);

// Script-based fallback map for unknown languages
const SCRIPT_TO_FALLBACK_LANGUAGE: Record<string, string> = {
  'Devanagari': 'hindi',
  'Bengali': 'bengali',
  'Tamil': 'tamil',
  'Telugu': 'telugu',
  'Kannada': 'kannada',
  'Malayalam': 'malayalam',
  'Gujarati': 'gujarati',
  'Gurmukhi': 'punjabi',
  'Odia': 'odia',
  'Arabic': 'arabic',
  'Cyrillic': 'russian',
  'Greek': 'greek',
  'Hebrew': 'hebrew',
  'Thai': 'thai',
  'Han': 'chinese',
  'Japanese': 'japanese',
  'Hangul': 'korean',
  'Georgian': 'georgian',
  'Armenian': 'armenian',
  'Ethiopic': 'amharic',
  'Myanmar': 'burmese',
  'Khmer': 'khmer',
  'Lao': 'lao',
  'Sinhala': 'sinhala',
  'Tibetan': 'tibetan',
  'Latin': 'english',
};

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
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim().replace(/[_\-\s]+/g, '_').replace(/[()]/g, '');
  return languageAliases[normalized] || normalized;
}

function getLanguageInfo(language: string): LanguageInfo | undefined {
  const normalized = normalizeLanguage(language);
  
  // Try exact matches first
  let info = languageByName.get(normalized) || languageByCode.get(normalized);
  if (info) return info;
  
  // Try native name
  info = languageByNative.get(normalized);
  if (info) return info;
  
  // Try partial match (for names like "Chinese (Mandarin)" → "chinese")
  const baseName = normalized.split('_')[0];
  info = languageByName.get(baseName) || languageByCode.get(baseName);
  if (info) return info;
  
  // Try without numbers/special chars
  const cleaned = normalized.replace(/[0-9]/g, '').trim();
  info = languageByName.get(cleaned) || languageByCode.get(cleaned);
  if (info) return info;
  
  return undefined;
}

// Map of language codes not supported by Google/MyMemory to their closest supported equivalent
// This covers ALL 1000+ languages from the profile database
const UNSUPPORTED_TO_SUPPORTED_FALLBACK: Record<string, string> = {
  // ================================================================
  // SOUTH INDIAN REGIONAL LANGUAGES → NEAREST MAJOR LANGUAGE
  // ================================================================
  'tcy': 'kn',    // Tulu → Kannada (Coastal Karnataka)
  'kfa': 'kn',    // Kodava → Kannada (Coorg)
  'bfq': 'kn',    // Badaga → Kannada (Nilgiris)
  'tcx': 'ta',    // Toda → Tamil (Nilgiris)
  'iru': 'ta',    // Irula → Tamil (Tamil Nadu)
  'kfh': 'ml',    // Kuruma → Malayalam (Kerala)
  'abl': 'hi',    // Abujmaria → Hindi
  'wbq': 'te',    // Waddar → Telugu
  'kff': 'te',    // Koya → Telugu
  'kdu': 'te',    // Kadaru → Telugu
  'yed': 'te',    // Yerukala → Telugu
  'sou': 'or',    // Soura → Odia
  'kxv': 'or',    // Kuvi → Odia
  
  // ================================================================
  // HINDI BELT REGIONAL LANGUAGES → HINDI
  // ================================================================
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
  'kan': 'hi',    // Kanauji → Hindi
  'bhb': 'hi',    // Bhili → Hindi
  'bhi': 'hi',    // Bhilodi → Hindi
  'gon': 'hi',    // Gondi → Hindi
  'lmn': 'hi',    // Lambadi → Hindi
  'sck': 'hi',    // Nagpuri/Sadri → Hindi
  'kru': 'hi',    // Kurukh/Oraon → Hindi
  'unr': 'hi',    // Mundari → Hindi
  'hoc': 'hi',    // Ho → Hindi
  'khr': 'hi',    // Kharia → Hindi
  'hlb': 'hi',    // Halbi → Hindi
  'khn': 'hi',    // Khandeshi → Hindi
  'dcc': 'hi',    // Deccan → Hindi
  'wbr': 'hi',    // Wagdi → Hindi
  'bhd': 'hi',    // Bhadrawahi → Hindi
  'mup': 'hi',    // Malvi → Hindi
  'hoj': 'hi',    // Hadothi → Hindi
  'dgo': 'hi',    // Dhundhari → Hindi
  'sjo': 'hi',    // Surgujia → Hindi
  'mby': 'hi',    // Nimadi → Hindi
  'bra': 'hi',    // Braj → Hindi
  'kfk': 'hi',    // Kinnauri → Hindi
  'psu': 'hi',    // Sauraseni → Hindi
  'pgg': 'hi',    // Pangwali → Hindi
  'xnr': 'hi',    // Kangri → Hindi
  'srx': 'hi',    // Sirmauri → Hindi
  'jml': 'ne',    // Jumli → Nepali
  'dty': 'ne',    // Doteli → Nepali
  'thl': 'hi',    // Tharu → Hindi
  'bap': 'ne',    // Bantawa → Nepali
  
  // ================================================================
  // MARATHI/KONKANI BELT → MARATHI
  // ================================================================
  'vav': 'mr',    // Warli/Varli → Marathi
  'kok': 'mr',    // Konkani → Marathi
  'gok': 'mr',    // Gowli → Marathi
  
  // ================================================================
  // NORTHEAST INDIAN LANGUAGES
  // ================================================================
  'lus': 'en',    // Mizo → English (Latin script)
  'kha': 'en',    // Khasi → English (Latin script)
  'grt': 'bn',    // Garo → Bengali
  'mjw': 'as',    // Karbi → Assamese
  'trp': 'bn',    // Kokborok → Bengali
  'rah': 'as',    // Rabha → Assamese
  'mrg': 'as',    // Mishing → Assamese
  'njz': 'en',    // Nyishi → English (Latin)
  'apt': 'en',    // Apatani → English (Latin)
  'adi': 'en',    // Adi → English (Latin)
  'lep': 'ne',    // Lepcha → Nepali
  'sip': 'ne',    // Bhutia/Sikkimese → Nepali
  'lif': 'ne',    // Limbu → Nepali
  'njo': 'en',    // Ao → English (Latin)
  'njh': 'en',    // Lotha → English (Latin)
  'nsm': 'en',    // Sema/Sumi → English (Latin)
  'njm': 'en',    // Angami → English (Latin)
  'nmf': 'en',    // Tangkhul → English (Latin)
  'pck': 'en',    // Paite → English (Latin)
  'tcz': 'en',    // Thadou → English (Latin)
  'nbu': 'en',    // Rongmei → English (Latin)
  'nst': 'en',    // Tangsa → English (Latin)
  'nnp': 'en',    // Wancho → English (Latin)
  'njb': 'en',    // Nocte → English (Latin)
  'nag': 'en',    // Nagamese → English (Latin)
  
  // ================================================================
  // MANIPURI/MEITEI BELT → BENGALI
  // ================================================================
  'mni': 'bn',    // Manipuri/Meitei → Bengali
  'meit': 'bn',   // Meitei → Bengali
  
  // ================================================================
  // OTHER INDIAN LANGUAGES
  // ================================================================
  'brx': 'hi',    // Bodo → Hindi
  'sat': 'hi',    // Santali → Hindi (Ol Chiki script, fallback)
  'doi': 'hi',    // Dogri → Hindi
  'mai': 'hi',    // Maithili → Hindi
  'saz': 'hi',    // Saurashtra → Hindi
  
  // ================================================================
  // BENGALI BELT LANGUAGES → BENGALI
  // ================================================================
  'hajong': 'bn',
  'koch': 'bn',
  'rajbanshi': 'bn',
  'rangpuri': 'bn',
  'tipra': 'bn',
  'reang': 'bn',
  'halam': 'bn',
  'jamatia': 'bn',
  'noatia': 'bn',
  'riang': 'bn',
  'rnp': 'bn',    // Rangpuri → Bengali
  'rkt': 'bn',    // Rangpuri → Bengali
  
  // ================================================================
  // MYANMAR/TIBETAN BORDER LANGUAGES
  // ================================================================
  'kht': 'my',    // Khamti → Burmese
  'phk': 'my',    // Phake → Burmese
  'aio': 'my',    // Aiton → Burmese
  'sgt': 'en',    // Singpho → English (Latin)
  'cmn': 'zh',    // Monpa (uses Tibetan, but fallback to Chinese)
  
  // ================================================================
  // SOUTHEAST ASIAN REGIONAL LANGUAGES
  // ================================================================
  'bug': 'id',    // Buginese → Indonesian
  'mak': 'id',    // Makassarese → Indonesian
  'mad': 'id',    // Madurese → Indonesian
  'bew': 'id',    // Betawi → Indonesian
  'sas': 'id',    // Sasak → Indonesian
  'gor': 'id',    // Gorontalo → Indonesian
  'tsg': 'tl',    // Tausug → Tagalog
  'mbb': 'tl',    // Maranao → Tagalog
  'mdh': 'tl',    // Maguindanaon → Tagalog
  'hil': 'tl',    // Hiligaynon → Tagalog
  'war': 'tl',    // Waray → Tagalog
  'pam': 'tl',    // Kapampangan → Tagalog
  'bik': 'tl',    // Bikol → Tagalog
  'pag': 'tl',    // Pangasinan → Tagalog
  'iba': 'ms',    // Iban → Malay
  'dtp': 'ms',    // Kadazan Dusun → Malay
  
  // ================================================================
  // AFRICAN LANGUAGES
  // ================================================================
  'luo': 'sw',    // Luo → Swahili
  'luy': 'sw',    // Luhya → Swahili
  'kam': 'sw',    // Kamba → Swahili
  'kik': 'sw',    // Kikuyu → Swahili
  'mer': 'sw',    // Meru → Swahili
  'mas': 'sw',    // Maasai → Swahili
  'kal': 'sw',    // Kalenjin → Swahili
  'nus': 'ar',    // Nuer → Arabic
  'din': 'ar',    // Dinka → Arabic
  'shi': 'ar',    // Shilha → Arabic
  'ber': 'ar',    // Berber → Arabic
  'kab': 'ar',    // Kabyle → Arabic
  'tzm': 'ar',    // Tamazight → Arabic
  'rif': 'ar',    // Tarifit → Arabic
  'twi': 'en',    // Twi → English
  'ak': 'en',     // Akan → English
  'ee': 'en',     // Ewe → English
  'gaa': 'en',    // Ga → English
  'dag': 'en',    // Dagbani → English
  'mos': 'fr',    // Mossi → French
  'bm': 'fr',     // Bambara → French
  'ff': 'fr',     // Fulah → French
  'wo': 'fr',     // Wolof → French
  'sn': 'en',     // Shona → English
  'nd': 'en',     // Northern Ndebele → English
  'nso': 'en',    // Northern Sotho → English
  'st': 'en',     // Southern Sotho → English
  'tn': 'en',     // Tswana → English
  'ts': 'en',     // Tsonga → English
  've': 'en',     // Venda → English
  'ss': 'en',     // Swati → English
  'rw': 'fr',     // Kinyarwanda → French
  'rn': 'fr',     // Kirundi → French
  'lg': 'sw',     // Luganda → Swahili
  'ln': 'fr',     // Lingala → French
  'kg': 'fr',     // Kongo → French
  'om': 'am',     // Oromo → Amharic
  'ti': 'am',     // Tigrinya → Amharic
  'so': 'ar',     // Somali → Arabic
  
  // ================================================================
  // EUROPEAN REGIONAL LANGUAGES
  // ================================================================
  'oc': 'fr',     // Occitan → French
  'br': 'fr',     // Breton → French
  'co': 'it',     // Corsican → Italian
  'sc': 'it',     // Sardinian → Italian
  'fur': 'it',    // Friulian → Italian
  'lmo': 'it',    // Lombard → Italian
  'vec': 'it',    // Venetian → Italian
  'scn': 'it',    // Sicilian → Italian
  'nap': 'it',    // Neapolitan → Italian
  'lij': 'it',    // Ligurian → Italian
  'pms': 'it',    // Piedmontese → Italian
  'eml': 'it',    // Emilian-Romagnol → Italian
  'frp': 'fr',    // Arpitan → French
  'wa': 'fr',     // Walloon → French
  'an': 'es',     // Aragonese → Spanish
  'ast': 'es',    // Asturian → Spanish
  'ext': 'es',    // Extremaduran → Spanish
  'mwl': 'pt',    // Mirandese → Portuguese
  'gl': 'pt',     // Galician → Portuguese
  'eu': 'es',     // Basque → Spanish (no close relation, but regional)
  'ca': 'es',     // Catalan → Spanish
  'fy': 'nl',     // Frisian → Dutch
  'li': 'nl',     // Limburgish → Dutch
  'lb': 'de',     // Luxembourgish → German
  'gsw': 'de',    // Swiss German → German
  'bar': 'de',    // Bavarian → German
  'sxu': 'de',    // Saxon → German
  'pfl': 'de',    // Palatinate German → German
  'ksh': 'de',    // Ripuarian → German
  'nds': 'de',    // Low German → German
  'hsb': 'de',    // Upper Sorbian → German
  'dsb': 'de',    // Lower Sorbian → German
  'szl': 'pl',    // Silesian → Polish
  'csb': 'pl',    // Kashubian → Polish
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

// Self-hosted translation services (PRIMARY)
// Only IndicTrans2 and DL-Translate are used (both on port 8000)
const SELF_HOSTED_INDICTRANS = "http://194.163.175.245:8000";     // IndicTrans2 + DL-Translate

// ============================================================
// ENGINE LANGUAGE SUPPORT DEFINITIONS
// ============================================================

/**
 * IndicTrans2 Supported Languages (22 Indian languages + English)
 * Uses NLLB-style codes like 'eng_Latn', 'hin_Deva', 'tel_Telu'
 * Best quality for Indian language translations
 */
const INDICTRANS2_SUPPORTED_LANGUAGES = new Set([
  'english', 'hindi', 'bengali', 'telugu', 'marathi', 'tamil', 'gujarati',
  'kannada', 'malayalam', 'punjabi', 'odia', 'oriya', 'assamese', 'urdu',
  'nepali', 'maithili', 'santali', 'kashmiri', 'konkani', 'sindhi', 'dogri',
  'manipuri', 'meitei', 'bodo', 'sanskrit', 'bhojpuri', 'awadhi', 'magahi',
  'sinhala', 'chhattisgarhi', 'rajasthani', 'marwari'
]);

/**
 * DL-Translate Supported Languages (mBART50 model - ~50 languages)
 * Uses full language names like 'English', 'Hindi', 'Telugu'
 * Good for broader language support including world languages
 */
/**
 * DL-Translate Supported Languages (M2M-100 model)
 * Based on official M2M-100 language list from user reference
 * Uses ISO 639-1/639-2 codes (af, am, ar, ast, az, ba, be, bg, bn, etc.)
 * 
 * IMPORTANT: Indian languages ARE supported by M2M-100 (hi, bn, te, ta, gu, kn, ml, pa, ur, ne, or, as, si)
 * but we route them to IndicTrans2 for better quality. 
 * Only non-Indic languages are listed here.
 */
const DLTRANSLATE_SUPPORTED_LANGUAGES = new Set([
  // Major world languages
  'english', 'chinese', 'mandarin', 'spanish', 'arabic', 'french', 'portuguese',
  'russian', 'japanese', 'german', 'korean', 'italian', 'turkish', 'vietnamese',
  'polish', 'dutch', 'thai', 'indonesian', 'malay',
  
  // European languages
  'czech', 'romanian', 'greek', 'hungarian', 'swedish', 'danish', 'finnish', 'norwegian',
  'ukrainian', 'hebrew', 'persian', 'farsi',
  'lithuanian', 'latvian', 'estonian', 'slovenian', 'croatian', 'serbian', 'slovak',
  'bulgarian', 'macedonian', 'albanian', 'bosnian', 'icelandic',
  'catalan', 'galician', 'basque', 'welsh', 'irish', 'scottish_gaelic',
  'belarusian', 'luxembourgish', 'maltese',
  
  // African languages
  'swahili', 'afrikaans', 'amharic', 'hausa', 'yoruba', 'zulu', 'xhosa', 'somali',
  
  // Central Asian languages
  'kazakh', 'uzbek', 'azerbaijani', 'turkmen', 'tajik', 'kyrgyz', 'mongolian', 'pashto',
  
  // Southeast Asian (non-Indic)
  'burmese', 'khmer', 'lao', 'tagalog', 'filipino', 'javanese', 'sundanese', 'cebuano',
  
  // Caucasus
  'georgian', 'armenian'
  
  // NOTE: Indian languages (hindi, bengali, telugu, tamil, etc.) are EXCLUDED
  // They are routed through IndicTrans2 for better quality
]);

// LibreTranslate REMOVED - only using IndicTrans2 and DL-Translate

/**
 * Determine which engine to use based on source and target languages
 * 
 * ENGINE PRIORITY (only IndicTrans2 and DL-Translate):
 * 
 * 1. IndicTrans2 (Port 8000): BEST QUALITY for Indian languages + English
 * 2. DL-Translate (Port 8000): BROAD coverage for world languages
 * 
 * @returns 'indictrans' | 'dltranslate'
 */
function selectBestEngine(sourceLanguage: string, targetLanguage: string): 'indictrans' | 'dltranslate' {
  const srcNorm = normalizeLanguage(sourceLanguage);
  const tgtNorm = normalizeLanguage(targetLanguage);
  
  const srcIsIndic = INDICTRANS2_SUPPORTED_LANGUAGES.has(srcNorm);
  const tgtIsIndic = INDICTRANS2_SUPPORTED_LANGUAGES.has(tgtNorm);
  const srcIsDL = DLTRANSLATE_SUPPORTED_LANGUAGES.has(srcNorm);
  const tgtIsDL = DLTRANSLATE_SUPPORTED_LANGUAGES.has(tgtNorm);
  const srcIsEnglish = srcNorm === 'english';
  const tgtIsEnglish = tgtNorm === 'english';
  
  console.log(`[engine-select] ${srcNorm}→${tgtNorm}: srcIndic=${srcIsIndic}, tgtIndic=${tgtIsIndic}, srcDL=${srcIsDL}, tgtDL=${tgtIsDL}`);
  
  // RULE 1: Indian ↔ Indian or English ↔ Indian - use IndicTrans2
  if (srcIsIndic && tgtIsIndic) {
    console.log(`[engine-select] SELECTED: indictrans (Indian ↔ Indian)`);
    return 'indictrans';
  }
  
  // RULE 2: English ↔ Indian - use IndicTrans2
  if ((srcIsEnglish && tgtIsIndic) || (srcIsIndic && tgtIsEnglish)) {
    console.log(`[engine-select] SELECTED: indictrans (English ↔ Indic)`);
    return 'indictrans';
  }
  
  // RULE 3: One language is Indian (needs pivot) - use IndicTrans2
  if (srcIsIndic || tgtIsIndic) {
    console.log(`[engine-select] SELECTED: indictrans (one is Indic, will use pivot)`);
    return 'indictrans';
  }
  
  // RULE 4: Both supported by DL-Translate - use DL-Translate
  if (srcIsDL && tgtIsDL) {
    console.log(`[engine-select] SELECTED: dltranslate (both in DL-Translate)`);
    return 'dltranslate';
  }
  
  // RULE 5: One is English and other is DL-Translate supported
  if ((srcIsEnglish && tgtIsDL) || (srcIsDL && tgtIsEnglish)) {
    console.log(`[engine-select] SELECTED: dltranslate (English ↔ DL-supported)`);
    return 'dltranslate';
  }
  
  // RULE 6: Default fallback to DL-Translate
  console.log(`[engine-select] SELECTED: dltranslate (fallback)`);
  return 'dltranslate';
}

/**
 * Check if a language pair can be translated directly (without pivot)
 */
function canTranslateDirectly(sourceLanguage: string, targetLanguage: string): boolean {
  const engine = selectBestEngine(sourceLanguage, targetLanguage);
  const srcNorm = normalizeLanguage(sourceLanguage);
  const tgtNorm = normalizeLanguage(targetLanguage);
  
  switch (engine) {
    case 'indictrans':
      return INDICTRANS2_SUPPORTED_LANGUAGES.has(srcNorm) && INDICTRANS2_SUPPORTED_LANGUAGES.has(tgtNorm);
    case 'dltranslate':
      return DLTRANSLATE_SUPPORTED_LANGUAGES.has(srcNorm) && DLTRANSLATE_SUPPORTED_LANGUAGES.has(tgtNorm);
    default:
      return false;
  }
}

// LibreTranslate REMOVED - only using IndicTrans2 and DL-Translate





/**
 * DL-Translate Language Mapping
 * 
 * IMPORTANT: The dl-translate library supports multiple model backends:
 * - m2m100 (default): Uses ISO 639-1 codes (en, hi, te, ta, etc.)
 * - mbart50: Uses full language names (English, Hindi, Telugu, etc.)
 * - nllb200: Uses NLLB codes (eng_Latn, hin_Deva, etc.)
 * 
 * Based on the server error "Your target='Telugu' is not valid", 
 * the server appears to be using m2m100 which requires ISO codes.
 * 
 * M2M100 supported languages (100 languages):
 * https://huggingface.co/facebook/m2m100_1.2B
 */

/**
 * M2M-100 Language Codes (Official Reference)
 * Source: https://huggingface.co/facebook/m2m100_1.2B
 * Documentation: https://github.com/xhluca/dl-translate
 * 
 * These are the EXACT codes accepted by the M2M-100 model.
 * All 100 languages supported by M2M-100.
 */
const M2M100_LANGUAGE_CODES: Record<string, string> = {
  // Major world languages
  'english': 'en',
  'chinese': 'zh',
  'mandarin': 'zh',
  'spanish': 'es',
  'arabic': 'ar',
  'french': 'fr',
  'portuguese': 'pt',
  'russian': 'ru',
  'japanese': 'ja',
  'german': 'de',
  'korean': 'ko',
  'italian': 'it',
  'turkish': 'tr',
  'vietnamese': 'vi',
  'polish': 'pl',
  'dutch': 'nl',
  'flemish': 'nl',
  'thai': 'th',
  'indonesian': 'id',
  'czech': 'cs',
  'romanian': 'ro',
  'moldavian': 'ro',
  'moldovan': 'ro',
  'greek': 'el',
  'hungarian': 'hu',
  'swedish': 'sv',
  'danish': 'da',
  'finnish': 'fi',
  'norwegian': 'no',
  'ukrainian': 'uk',
  'hebrew': 'he',
  'persian': 'fa',
  'farsi': 'fa',
  
  // Indian languages (M2M-100 supported)
  'hindi': 'hi',
  'bengali': 'bn',
  'telugu': 'te',
  'marathi': 'mr',
  'tamil': 'ta',
  'gujarati': 'gu',
  'kannada': 'kn',
  'malayalam': 'ml',
  'punjabi': 'pa',
  'panjabi': 'pa',
  'urdu': 'ur',
  'nepali': 'ne',
  'odia': 'or',
  'oriya': 'or',
  'assamese': 'as',
  'sinhala': 'si',
  'sinhalese': 'si',
  'sindhi': 'sd',
  
  // Southeast Asian
  'burmese': 'my',
  'khmer': 'km',
  'central_khmer': 'km',
  'lao': 'lo',
  'tagalog': 'tl',
  'filipino': 'tl',
  'malay': 'ms',
  'javanese': 'jv',
  'sundanese': 'su',
  'cebuano': 'ceb',
  'ilocano': 'ilo',
  'iloko': 'ilo',
  
  // African
  'swahili': 'sw',
  'afrikaans': 'af',
  'amharic': 'am',
  'hausa': 'ha',
  'yoruba': 'yo',
  'zulu': 'zu',
  'xhosa': 'xh',
  'somali': 'so',
  'igbo': 'ig',
  'fulah': 'ff',
  'fula': 'ff',
  'ganda': 'lg',
  'lingala': 'ln',
  'wolof': 'wo',
  'tswana': 'tn',
  
  // European
  'lithuanian': 'lt',
  'latvian': 'lv',
  'estonian': 'et',
  'slovenian': 'sl',
  'slovene': 'sl',
  'croatian': 'hr',
  'serbian': 'sr',
  'slovak': 'sk',
  'bulgarian': 'bg',
  'macedonian': 'mk',
  'albanian': 'sq',
  'bosnian': 'bs',
  'icelandic': 'is',
  'catalan': 'ca',
  'valencian': 'ca',
  'galician': 'gl',
  'basque': 'eu',
  'welsh': 'cy',
  'irish': 'ga',
  'gaelic': 'gd',
  'scottish_gaelic': 'gd',
  'breton': 'br',
  'western_frisian': 'fy',
  'frisian': 'fy',
  'occitan': 'oc',
  'asturian': 'ast',
  'belarusian': 'be',
  
  // Central Asian
  'kazakh': 'kk',
  'uzbek': 'uz',
  'azerbaijani': 'az',
  'turkmen': 'tk',
  'tajik': 'tg',
  'kyrgyz': 'ky',
  'mongolian': 'mn',
  'pashto': 'ps',
  'pushto': 'ps',
  'bashkir': 'ba',
  
  // Caucasus & Eastern Europe
  'georgian': 'ka',
  'armenian': 'hy',
  'maltese': 'mt',
  'luxembourgish': 'lb',
  'letzeburgesch': 'lb',
  
  // Other
  'haitian': 'ht',
  'haitian_creole': 'ht',
  'yiddish': 'yi',
  'esperanto': 'eo',
  'latin': 'la',
};

/**
 * mBART50 Language Codes (Official Reference)
 * Source: https://huggingface.co/facebook/mbart-large-50
 * Documentation: https://github.com/xhluca/dl-translate
 * 
 * mBART50 uses LANGUAGE_CODE format (e.g., ar_AR, cs_CZ)
 * These are the EXACT codes from the official documentation.
 */
const MBART50_LANGUAGE_CODES: Record<string, string> = {
  'arabic': 'ar_AR',
  'czech': 'cs_CZ',
  'german': 'de_DE',
  'english': 'en_XX',
  'spanish': 'es_XX',
  'estonian': 'et_EE',
  'finnish': 'fi_FI',
  'french': 'fr_XX',
  'gujarati': 'gu_IN',
  'hindi': 'hi_IN',
  'italian': 'it_IT',
  'japanese': 'ja_XX',
  'kazakh': 'kk_KZ',
  'korean': 'ko_KR',
  'lithuanian': 'lt_LT',
  'latvian': 'lv_LV',
  'burmese': 'my_MM',
  'nepali': 'ne_NP',
  'dutch': 'nl_XX',
  'romanian': 'ro_RO',
  'russian': 'ru_RU',
  'sinhala': 'si_LK',
  'sinhalese': 'si_LK',
  'turkish': 'tr_TR',
  'vietnamese': 'vi_VN',
  'chinese': 'zh_CN',
  'mandarin': 'zh_CN',
  'afrikaans': 'af_ZA',
  'azerbaijani': 'az_AZ',
  'bengali': 'bn_IN',
  'persian': 'fa_IR',
  'farsi': 'fa_IR',
  'hebrew': 'he_IL',
  'croatian': 'hr_HR',
  'indonesian': 'id_ID',
  'georgian': 'ka_GE',
  'khmer': 'km_KH',
  'central_khmer': 'km_KH',
  'macedonian': 'mk_MK',
  'malayalam': 'ml_IN',
  'mongolian': 'mn_MN',
  'marathi': 'mr_IN',
  'polish': 'pl_PL',
  'pashto': 'ps_AF',
  'pushto': 'ps_AF',
  'portuguese': 'pt_XX',
  'swedish': 'sv_SE',
  'swahili': 'sw_KE',
  'tamil': 'ta_IN',
  'telugu': 'te_IN',
  'thai': 'th_TH',
  'tagalog': 'tl_XX',
  'filipino': 'tl_XX',
  'ukrainian': 'uk_UA',
  'urdu': 'ur_PK',
  'xhosa': 'xh_ZA',
  'galician': 'gl_ES',
  'slovenian': 'sl_SI',
  'slovene': 'sl_SI',
};

// Legacy mBART50 names (for backward compatibility with servers using full names)
const MBART50_LANGUAGE_NAMES: Record<string, string> = {
  'english': 'English',
  'chinese': 'Chinese',
  'spanish': 'Spanish',
  'arabic': 'Arabic',
  'french': 'French',
  'portuguese': 'Portuguese',
  'russian': 'Russian',
  'japanese': 'Japanese',
  'german': 'German',
  'korean': 'Korean',
  'italian': 'Italian',
  'turkish': 'Turkish',
  'vietnamese': 'Vietnamese',
  'polish': 'Polish',
  'dutch': 'Dutch',
  'thai': 'Thai',
  'indonesian': 'Indonesian',
  'czech': 'Czech',
  'romanian': 'Romanian',
  'greek': 'Greek',
  'hungarian': 'Hungarian',
  'swedish': 'Swedish',
  'danish': 'Danish',
  'finnish': 'Finnish',
  'ukrainian': 'Ukrainian',
  'hebrew': 'Hebrew',
  'persian': 'Persian',
  'hindi': 'Hindi',
  'bengali': 'Bengali',
  'telugu': 'Telugu',
  'marathi': 'Marathi',
  'tamil': 'Tamil',
  'gujarati': 'Gujarati',
  'kannada': 'Kannada',
  'malayalam': 'Malayalam',
  'urdu': 'Urdu',
  'nepali': 'Nepali',
  'burmese': 'Burmese',
  'khmer': 'Khmer',
  'swahili': 'Swahili',
  'afrikaans': 'Afrikaans',
  'lithuanian': 'Lithuanian',
  'latvian': 'Latvian',
  'estonian': 'Estonian',
  'slovenian': 'Slovenian',
  'croatian': 'Croatian',
  'kazakh': 'Kazakh',
  'mongolian': 'Mongolian',
  'galician': 'Galician',
  'catalan': 'Catalan',
  'sinhala': 'Sinhala',
  'pashto': 'Pashto',
  'tagalog': 'Tagalog',
  'georgian': 'Georgian',
  'macedonian': 'Macedonian',
};

/**
 * NLLB-200 Language Codes (Official Reference)
 * Source: https://github.com/facebookresearch/fairseq/tree/nllb
 * 
 * These are the EXACT codes used by NLLB-200 model.
 * Format: language_script (e.g., eng_Latn, hin_Deva)
 * All 200+ languages supported by NLLB-200.
 * 
 * NOTE: IndicTrans2 uses a subset of these codes for Indian languages.
 * This mapping enables broader NLLB-200 model usage if needed.
 */
const NLLB200_LANGUAGE_CODES: Record<string, string> = {
  // ================================================================
  // MAJOR WORLD LANGUAGES
  // ================================================================
  'english': 'eng_Latn',
  'chinese': 'zho_Hans',
  'chinese_simplified': 'zho_Hans',
  'chinese_traditional': 'zho_Hant',
  'mandarin': 'zho_Hans',
  'cantonese': 'yue_Hant',
  'spanish': 'spa_Latn',
  'french': 'fra_Latn',
  'german': 'deu_Latn',
  'portuguese': 'por_Latn',
  'russian': 'rus_Cyrl',
  'japanese': 'jpn_Jpan',
  'korean': 'kor_Hang',
  'italian': 'ita_Latn',
  'dutch': 'nld_Latn',
  'flemish': 'nld_Latn',
  'polish': 'pol_Latn',
  'turkish': 'tur_Latn',
  'vietnamese': 'vie_Latn',
  'thai': 'tha_Thai',
  'indonesian': 'ind_Latn',
  'greek': 'ell_Grek',
  'czech': 'ces_Latn',
  'romanian': 'ron_Latn',
  'moldavian': 'ron_Latn',
  'hungarian': 'hun_Latn',
  'swedish': 'swe_Latn',
  'danish': 'dan_Latn',
  'finnish': 'fin_Latn',
  'norwegian': 'nob_Latn',
  'norwegian_bokmal': 'nob_Latn',
  'norwegian_nynorsk': 'nno_Latn',
  'ukrainian': 'ukr_Cyrl',
  'hebrew': 'heb_Hebr',
  
  // ================================================================
  // ARABIC VARIETIES
  // ================================================================
  'arabic': 'arb_Arab',
  'modern_standard_arabic': 'arb_Arab',
  'arabic_romanized': 'arb_Latn',
  'egyptian_arabic': 'arz_Arab',
  'moroccan_arabic': 'ary_Arab',
  'north_levantine_arabic': 'apc_Arab',
  'south_levantine_arabic': 'ajp_Arab',
  'najdi_arabic': 'ars_Arab',
  'tunisian_arabic': 'aeb_Arab',
  'mesopotamian_arabic': 'acm_Arab',
  'taizzi_adeni_arabic': 'acq_Arab',
  
  // ================================================================
  // PERSIAN / IRANIAN
  // ================================================================
  'persian': 'pes_Arab',
  'farsi': 'pes_Arab',
  'western_persian': 'pes_Arab',
  'dari': 'prs_Arab',
  'pashto': 'pbt_Arab',
  'southern_pashto': 'pbt_Arab',
  'pushto': 'pbt_Arab',
  
  // ================================================================
  // SOUTH ASIAN - INDIAN OFFICIAL LANGUAGES
  // ================================================================
  'hindi': 'hin_Deva',
  'bengali': 'ben_Beng',
  'bangla': 'ben_Beng',
  'telugu': 'tel_Telu',
  'marathi': 'mar_Deva',
  'tamil': 'tam_Taml',
  'gujarati': 'guj_Gujr',
  'kannada': 'kan_Knda',
  'malayalam': 'mal_Mlym',
  'punjabi': 'pan_Guru',
  'eastern_punjabi': 'pan_Guru',
  'odia': 'ory_Orya',
  'oriya': 'ory_Orya',
  'assamese': 'asm_Beng',
  'urdu': 'urd_Arab',
  'nepali': 'npi_Deva',
  'maithili': 'mai_Deva',
  'santali': 'sat_Olck',
  'kashmiri': 'kas_Arab',
  'kashmiri_devanagari': 'kas_Deva',
  'konkani': 'kok_Deva',
  'sindhi': 'snd_Arab',
  'dogri': 'doi_Deva',
  'manipuri': 'mni_Beng',
  'meitei': 'mni_Beng',
  'bodo': 'brx_Deva',
  'sanskrit': 'san_Deva',
  
  // ================================================================
  // SOUTH ASIAN - REGIONAL INDIAN LANGUAGES
  // ================================================================
  'bhojpuri': 'bho_Deva',
  'awadhi': 'awa_Deva',
  'magahi': 'mag_Deva',
  'chhattisgarhi': 'hne_Deva',
  'sinhala': 'sin_Sinh',
  'sinhalese': 'sin_Sinh',
  
  // ================================================================
  // SOUTHEAST ASIAN
  // ================================================================
  'burmese': 'mya_Mymr',
  'khmer': 'khm_Khmr',
  'central_khmer': 'khm_Khmr',
  'lao': 'lao_Laoo',
  'tagalog': 'tgl_Latn',
  'filipino': 'tgl_Latn',
  'javanese': 'jav_Latn',
  'sundanese': 'sun_Latn',
  'cebuano': 'ceb_Latn',
  'ilocano': 'ilo_Latn',
  'malay': 'zsm_Latn',
  'standard_malay': 'zsm_Latn',
  'minangkabau': 'min_Latn',
  'minangkabau_arabic': 'min_Arab',
  'acehnese': 'ace_Latn',
  'acehnese_arabic': 'ace_Arab',
  'balinese': 'ban_Latn',
  'banjar': 'bjn_Latn',
  'banjar_arabic': 'bjn_Arab',
  'buginese': 'bug_Latn',
  'shan': 'shn_Mymr',
  'waray': 'war_Latn',
  'pangasinan': 'pag_Latn',
  
  // ================================================================
  // EAST ASIAN
  // ================================================================
  'tibetan': 'bod_Tibt',
  'standard_tibetan': 'bod_Tibt',
  
  // ================================================================
  // EUROPEAN LANGUAGES
  // ================================================================
  'lithuanian': 'lit_Latn',
  'latvian': 'lvs_Latn',
  'standard_latvian': 'lvs_Latn',
  'estonian': 'est_Latn',
  'slovenian': 'slv_Latn',
  'croatian': 'hrv_Latn',
  'serbian': 'srp_Cyrl',
  'slovak': 'slk_Latn',
  'bulgarian': 'bul_Cyrl',
  'macedonian': 'mkd_Cyrl',
  'albanian': 'als_Latn',
  'tosk_albanian': 'als_Latn',
  'bosnian': 'bos_Latn',
  'icelandic': 'isl_Latn',
  'faroese': 'fao_Latn',
  'catalan': 'cat_Latn',
  'valencian': 'cat_Latn',
  'galician': 'glg_Latn',
  'basque': 'eus_Latn',
  'welsh': 'cym_Latn',
  'irish': 'gle_Latn',
  'scottish_gaelic': 'gla_Latn',
  'breton': 'bre_Latn',
  'occitan': 'oci_Latn',
  'asturian': 'ast_Latn',
  'maltese': 'mlt_Latn',
  'belarusian': 'bel_Cyrl',
  'luxembourgish': 'ltz_Latn',
  'letzeburgesch': 'ltz_Latn',
  'friulian': 'fur_Latn',
  'sardinian': 'srd_Latn',
  'sicilian': 'scn_Latn',
  'ligurian': 'lij_Latn',
  'lombard': 'lmo_Latn',
  'venetian': 'vec_Latn',
  'latgalian': 'ltg_Latn',
  'limburgish': 'lim_Latn',
  'silesian': 'szl_Latn',
  'esperanto': 'epo_Latn',
  'crimean_tatar': 'crh_Latn',
  
  // ================================================================
  // CENTRAL ASIAN / TURKIC
  // ================================================================
  'kazakh': 'kaz_Cyrl',
  'uzbek': 'uzn_Latn',
  'northern_uzbek': 'uzn_Latn',
  'azerbaijani': 'azj_Latn',
  'north_azerbaijani': 'azj_Latn',
  'south_azerbaijani': 'azb_Arab',
  'turkmen': 'tuk_Latn',
  'tajik': 'tgk_Cyrl',
  'kyrgyz': 'kir_Cyrl',
  'bashkir': 'bak_Cyrl',
  'tatar': 'tat_Cyrl',
  'uighur': 'uig_Arab',
  'uyghur': 'uig_Arab',
  
  // ================================================================
  // CAUCASIAN
  // ================================================================
  'georgian': 'kat_Geor',
  'armenian': 'hye_Armn',
  
  // ================================================================
  // MONGOLIAN
  // ================================================================
  'mongolian': 'khk_Cyrl',
  'halh_mongolian': 'khk_Cyrl',
  
  // ================================================================
  // AFRICAN LANGUAGES
  // ================================================================
  'swahili': 'swh_Latn',
  'afrikaans': 'afr_Latn',
  'amharic': 'amh_Ethi',
  'tigrinya': 'tir_Ethi',
  'hausa': 'hau_Latn',
  'yoruba': 'yor_Latn',
  'igbo': 'ibo_Latn',
  'zulu': 'zul_Latn',
  'xhosa': 'xho_Latn',
  'somali': 'som_Latn',
  'oromo': 'gaz_Latn',
  'west_central_oromo': 'gaz_Latn',
  'wolof': 'wol_Latn',
  'fulah': 'fuv_Latn',
  'nigerian_fulfulde': 'fuv_Latn',
  'fula': 'fuv_Latn',
  'bambara': 'bam_Latn',
  'lingala': 'lin_Latn',
  'kongo': 'kon_Latn',
  'kikongo': 'kon_Latn',
  'luganda': 'lug_Latn',
  'ganda': 'lug_Latn',
  'kinyarwanda': 'kin_Latn',
  'kirundi': 'run_Latn',
  'rundi': 'run_Latn',
  'shona': 'sna_Latn',
  'nyanja': 'nya_Latn',
  'chichewa': 'nya_Latn',
  'tswana': 'tsn_Latn',
  'tsonga': 'tso_Latn',
  'swati': 'ssw_Latn',
  'southern_sotho': 'sot_Latn',
  'sesotho': 'sot_Latn',
  'northern_sotho': 'nso_Latn',
  'akan': 'aka_Latn',
  'twi': 'twi_Latn',
  'ewe': 'ewe_Latn',
  'fon': 'fon_Latn',
  'mossi': 'mos_Latn',
  'dyula': 'dyu_Latn',
  'bemba': 'bem_Latn',
  'luo': 'luo_Latn',
  'kikuyu': 'kik_Latn',
  'kamba': 'kam_Latn',
  'tumbuka': 'tum_Latn',
  'umbundu': 'umb_Latn',
  'kimbundu': 'kmb_Latn',
  'sango': 'sag_Latn',
  'chokwe': 'cjk_Latn',
  'southwestern_dinka': 'dik_Latn',
  'dinka': 'dik_Latn',
  'nuer': 'nus_Latn',
  'luba_kasai': 'lua_Latn',
  'plateau_malagasy': 'plt_Latn',
  'malagasy': 'plt_Latn',
  'fijian': 'fij_Latn',
  'samoan': 'smo_Latn',
  'tok_pisin': 'tpi_Latn',
  
  // ================================================================
  // BERBER / TAMAZIGHT
  // ================================================================
  'central_atlas_tamazight': 'tzm_Tfng',
  'tamazight': 'tzm_Tfng',
  'tamasheq': 'taq_Latn',
  'tamasheq_tifinagh': 'taq_Tfng',
  'kabyle': 'kab_Latn',
  
  // ================================================================
  // KURDISH VARIETIES
  // ================================================================
  'northern_kurdish': 'kmr_Latn',
  'kurmanji': 'kmr_Latn',
  'central_kurdish': 'ckb_Arab',
  'sorani': 'ckb_Arab',
  'kurdish': 'kmr_Latn',
  
  // ================================================================
  // OTHER LANGUAGES
  // ================================================================
  'haitian': 'hat_Latn',
  'haitian_creole': 'hat_Latn',
  'eastern_yiddish': 'ydd_Hebr',
  'yiddish': 'ydd_Hebr',
  'guarani': 'grn_Latn',
  'quechua': 'quy_Latn',
  'ayacucho_quechua': 'quy_Latn',
  'papiamento': 'pap_Latn',
  'dzongkha': 'dzo_Tibt',
  'jingpho': 'kac_Latn',
  'kachin': 'kac_Latn',
  'mizo': 'lus_Latn',
  'lushai': 'lus_Latn',
  'kanuri': 'knc_Latn',
  'central_kanuri': 'knc_Latn',
  'central_kanuri_arabic': 'knc_Arab',
  'kabiye': 'kbp_Latn',
  'kabuverdianu': 'kea_Latn',
};

/**
 * Get NLLB-200 language code for DL-Translate nllb200 model
 * Returns codes like 'eng_Latn', 'hin_Deva', 'zho_Hans'
 */
function getNllb200LanguageCode(language: string): string | null {
  const normalized = normalizeLanguage(language);
  return NLLB200_LANGUAGE_CODES[normalized] || null;
}

/**
 * Get DL-Translate language code/name based on model type
 * 
 * Model priority for DL-Translate:
 * 1. NLLB-200 codes (best quality, 200+ languages) - format: eng_Latn, hin_Deva
 * 2. M2M-100 ISO codes (fallback, 100 languages) - format: en, hi, te
 * 3. mBART50 codes (legacy fallback, 50 languages) - format: en_XX, hi_IN
 */
function getDLTranslateLanguageCode(language: string, model: 'nllb200' | 'm2m100' | 'mbart50' = 'm2m100'): string {
  const normalized = normalizeLanguage(language);
  
  // For NLLB-200 model, use NLLB codes (eng_Latn format)
  if (model === 'nllb200') {
    const nllbCode = NLLB200_LANGUAGE_CODES[normalized];
    if (nllbCode) return nllbCode;
  }
  
  // For M2M-100 model, use ISO 639-1 codes (en, hi, te format)
  if (model === 'm2m100') {
    const m2mCode = M2M100_LANGUAGE_CODES[normalized];
    if (m2mCode) return m2mCode;
  }
  
  // For mBART50 model, use locale codes first (en_XX, hi_IN format)
  if (model === 'mbart50') {
    const mbartCode = MBART50_LANGUAGE_CODES[normalized];
    if (mbartCode) return mbartCode;
    // Fallback to full names if server expects them
    const mbartName = MBART50_LANGUAGE_NAMES[normalized];
    if (mbartName) return mbartName;
  }
  
  // Try from language info code
  const info = getLanguageInfo(language);
  if (info?.code) {
    return info.code;
  }
  
  // Fallback based on model type
  switch (model) {
    case 'nllb200': return 'eng_Latn';
    case 'm2m100': return 'en';
    case 'mbart50': return 'en_XX';
  }
}

/**
 * Check if a language is supported by M2M-100
 */
function isM2m100Supported(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return M2M100_LANGUAGE_CODES[normalized] !== undefined;
}

/**
 * Check if a language is supported by mBART50
 */
function isMbart50Supported(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return MBART50_LANGUAGE_CODES[normalized] !== undefined || MBART50_LANGUAGE_NAMES[normalized] !== undefined;
}

/**
 * Check if a language is supported by NLLB-200
 */
function isNllb200Supported(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return NLLB200_LANGUAGE_CODES[normalized] !== undefined;
}

/**
 * Get mBART50-style full language name (legacy fallback)
 */
function getMbart50LanguageName(language: string): string {
  const normalized = normalizeLanguage(language);
  
  // First try the proper code format
  if (MBART50_LANGUAGE_CODES[normalized]) {
    return MBART50_LANGUAGE_CODES[normalized];
  }
  
  // Then try full names
  if (MBART50_LANGUAGE_NAMES[normalized]) {
    return MBART50_LANGUAGE_NAMES[normalized];
  }
  
  // Fallback: capitalize first letter
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Translate using DL-Translate engine (self-hosted at 194.163.175.245:8000)
 * 
 * The server supports different model backends:
 * - nllb200: Uses NLLB codes (eng_Latn, hin_Deva) - BEST QUALITY, 200+ languages
 * - m2m100: Uses ISO 639-1 codes (en, hi, te) - 100 languages
 * - mbart50: Uses full language names (English, Hindi, Telugu) - 50 languages
 * 
 * Priority: NLLB-200 → M2M-100 → mBART50
 * 
 * NOTE: Reduced timeout and retries for faster fallback
 */
type DLTranslateModel = 'nllb200' | 'm2m100' | 'mbart50';

async function translateWithDLTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  retryCount = 0,
  model: DLTranslateModel = 'nllb200'
): Promise<{ translatedText: string; success: boolean }> {
  const maxRetries = 1;

  // Hard guard: ONLY call dltranslate for languages we explicitly know the backend supports.
  // This prevents 400 validation errors like: "Your target=Telugu is not valid".
  const srcInfo = getLanguageInfo(sourceLanguage);
  const tgtInfo = getLanguageInfo(targetLanguage);
  const srcName = srcInfo?.name || normalizeLanguage(sourceLanguage);
  const tgtName = tgtInfo?.name || normalizeLanguage(targetLanguage);
  
  // Check model-specific support and fallback accordingly
  switch (model) {
    case 'nllb200':
      if (!isNllb200Supported(srcName) || !isNllb200Supported(tgtName)) {
        console.log(`[translate] Language not in NLLB-200 (src=${srcName}, tgt=${tgtName}), falling back to m2m100`);
        return translateWithDLTranslate(text, sourceLanguage, targetLanguage, 0, 'm2m100');
      }
      break;
    case 'm2m100':
      if (!isM2m100Supported(srcName) || !isM2m100Supported(tgtName)) {
        console.log(`[translate] Language not in M2M-100 (src=${srcName}, tgt=${tgtName}), falling back to mbart50`);
        return translateWithDLTranslate(text, sourceLanguage, targetLanguage, 0, 'mbart50');
      }
      break;
    case 'mbart50':
      if (!isMbart50Supported(srcName) || !isMbart50Supported(tgtName)) {
        console.log(`[translate] Language not in mBART50 (src=${srcName}, tgt=${tgtName}), giving up on DL-Translate`);
        return { translatedText: text, success: false };
      }
      break;
  }
  
  try {
    // Get language codes based on model
    let srcLang: string;
    let tgtLang: string;
    
    switch (model) {
      case 'nllb200':
        srcLang = getDLTranslateLanguageCode(sourceLanguage, 'nllb200');
        tgtLang = getDLTranslateLanguageCode(targetLanguage, 'nllb200');
        break;
      case 'm2m100':
        srcLang = getDLTranslateLanguageCode(sourceLanguage, 'm2m100');
        tgtLang = getDLTranslateLanguageCode(targetLanguage, 'm2m100');
        break;
      case 'mbart50':
        srcLang = getMbart50LanguageName(sourceLanguage);
        tgtLang = getMbart50LanguageName(targetLanguage);
        break;
    }
    
    console.log(`[translate] Trying DL-Translate (${model}): ${srcLang} -> ${tgtLang} (attempt ${retryCount + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    const response = await fetch(`${SELF_HOSTED_INDICTRANS}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        src_lang: srcLang,
        tgt_lang: tgtLang,
        engine: "dltranslate",
        model: model, // Specify which model backend to use
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const translated = data.translation?.trim() || data.translatedText?.trim() || data.text?.trim();
      if (translated && translated !== text && translated.length > 0) {
        console.log(`[translate] DL-Translate (${model}) success: "${text.substring(0, 30)}..." -> "${translated.substring(0, 30)}..."`);
        return { translatedText: translated, success: true };
      }
    } else {
      // If model failed with 400, try next model in priority
      if (response.status === 400) {
        if (model === 'nllb200') {
          console.log(`[translate] DL-Translate NLLB-200 failed, trying m2m100...`);
          return translateWithDLTranslate(text, sourceLanguage, targetLanguage, 0, 'm2m100');
        } else if (model === 'm2m100') {
          console.log(`[translate] DL-Translate m2m100 failed, trying mbart50...`);
          return translateWithDLTranslate(text, sourceLanguage, targetLanguage, 0, 'mbart50');
        }
      }
    }
    
    // Retry if we haven't exhausted retries
    if (retryCount < maxRetries) {
      console.log(`[translate] DL-Translate returned unchanged, retrying...`);
      await new Promise(r => setTimeout(r, 200));
      return translateWithDLTranslate(text, sourceLanguage, targetLanguage, retryCount + 1, model);
    }
    
    // If current model exhausted retries, try next model
    if (model === 'nllb200') {
      console.log(`[translate] DL-Translate NLLB-200 exhausted, trying m2m100...`);
      return translateWithDLTranslate(text, sourceLanguage, targetLanguage, 0, 'm2m100');
    } else if (model === 'm2m100') {
      console.log(`[translate] DL-Translate m2m100 exhausted, trying mbart50...`);
      return translateWithDLTranslate(text, sourceLanguage, targetLanguage, 0, 'mbart50');
    }
  } catch (error) {
    console.log(`[translate] DL-Translate (${model}) failed: ${error}`);
    
    // Retry on timeout/error
    if (retryCount < maxRetries) {
      await new Promise(r => setTimeout(r, 200));
      return translateWithDLTranslate(text, sourceLanguage, targetLanguage, retryCount + 1, model);
    }
    
    // If current model exhausted, try next model in priority
    if (model === 'nllb200') {
      console.log(`[translate] DL-Translate NLLB-200 errored, trying m2m100...`);
      return translateWithDLTranslate(text, sourceLanguage, targetLanguage, 0, 'm2m100');
    } else if (model === 'm2m100') {
      console.log(`[translate] DL-Translate m2m100 errored, trying mbart50...`);
      return translateWithDLTranslate(text, sourceLanguage, targetLanguage, 0, 'mbart50');
    }
  }
  
  return { translatedText: text, success: false };
}

/**
 * Translate using IndicTrans2 (self-hosted at 194.163.175.245:8000)
 * PRIMARY engine for Indian languages and pivot-based translations
 * Supports 22 Indian languages + English
 * Uses NLLB codes like 'eng_Latn', 'hin_Deva', 'tel_Telu'
 * 
 * NOTE: Reduced timeout (8s) and retries (1) for faster fallback
 */
async function translateWithIndicTrans(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  retryCount = 0
): Promise<{ translatedText: string; success: boolean }> {
  const maxRetries = 1; // Reduced from 2 for faster fallback
  
  try {
    const srcCode = getNllbCode(sourceLanguage);
    const tgtCode = getNllbCode(targetLanguage);
    
    console.log(`[translate] Trying IndicTrans2: ${sourceLanguage}(${srcCode}) -> ${targetLanguage}(${tgtCode}) (attempt ${retryCount + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
    
    const response = await fetch(`${SELF_HOSTED_INDICTRANS}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        src_lang: srcCode,
        tgt_lang: tgtCode,
        engine: "indictrans",
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const translated = data.translation?.trim() || data.translatedText?.trim() || data.text?.trim();
      if (translated && translated !== text && translated.length > 0) {
        console.log(`[translate] IndicTrans2 success: "${text.substring(0, 30)}..." -> "${translated.substring(0, 30)}..."`);
        return { translatedText: translated, success: true };
      }
      
      // Try retry if unchanged
      if (retryCount < maxRetries) {
        console.log(`[translate] IndicTrans2 returned unchanged, retrying...`);
        await new Promise(r => setTimeout(r, 200)); // Reduced delay
        return translateWithIndicTrans(text, sourceLanguage, targetLanguage, retryCount + 1);
      }
    }
    
    // Don't call DL-Translate here - let the caller handle fallback
    return { translatedText: text, success: false };
    
  } catch (error) {
    console.log(`[translate] IndicTrans2 failed: ${error}`);
    
    // Retry on timeout/error if we haven't exhausted retries
    if (retryCount < maxRetries) {
      await new Promise(r => setTimeout(r, 200));
      return translateWithIndicTrans(text, sourceLanguage, targetLanguage, retryCount + 1);
    }
    
    // Don't call DL-Translate here - let the caller handle fallback
    return { translatedText: text, success: false };
  }
}

// LibreTranslate REMOVED - only using IndicTrans2 and DL-Translate

/**
 * Main translation function with SMART ENGINE AUTO-SELECTION
 * 
 * ENGINE ROUTING (only IndicTrans2 and DL-Translate):
 * 
 * IndicTrans2 (Port 8000):
 *   - Best for: 22+ Indian languages + English
 *   - Priority: Indian ↔ Indian, English ↔ Indian
 *   - Codes: NLLB format (eng_Latn, hin_Deva, tel_Telu)
 * 
 * DL-Translate (Port 8000, engine: dltranslate):
 *   - Best for: ~50 world languages
 *   - Fallback for broader coverage
 *   - Names: Full names (English, Hindi, Telugu)
 * 
 * TRANSLATION MODES:
 * 1. DIRECT: Both languages supported by same engine → translate directly
 * 2. PIVOT: Languages need English bridge → Source→English→Target
 */
async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ translatedText: string; success: boolean; pivotUsed: boolean }> {
  const sourceCode = getLibreCode(sourceLanguage);
  const targetCode = getLibreCode(targetLanguage);
  const sourceIsEnglish = sourceCode === 'en';
  const targetIsEnglish = targetCode === 'en';

  // Normalized language flags (used to prevent invalid engine fallbacks)
  const srcNorm = normalizeLanguage(sourceLanguage);
  const tgtNorm = normalizeLanguage(targetLanguage);
  const srcIsIndic = INDICTRANS2_SUPPORTED_LANGUAGES.has(srcNorm);
  const tgtIsIndic = INDICTRANS2_SUPPORTED_LANGUAGES.has(tgtNorm);
  const srcIsDL = DLTRANSLATE_SUPPORTED_LANGUAGES.has(srcNorm);
  const tgtIsDL = DLTRANSLATE_SUPPORTED_LANGUAGES.has(tgtNorm);

  // Smart engine selection based on language support
  const selectedEngine = selectBestEngine(sourceLanguage, targetLanguage);
  const canDirect = canTranslateDirectly(sourceLanguage, targetLanguage);
  
  console.log(`[translate] Routing: ${sourceLanguage}(${sourceCode}) -> ${targetLanguage}(${targetCode})`);
  console.log(`[translate] Engine: ${selectedEngine}, Direct: ${canDirect}`);

  // ================================================================
  // DIRECT TRANSLATION PATH
  // When both languages are supported by the same engine
  // ================================================================
  if (canDirect || sourceIsEnglish || targetIsEnglish) {
    console.log(`[translate] DIRECT: Using ${selectedEngine}`);
    
    let result: { translatedText: string; success: boolean };
    
    // Try selected engine first
    switch (selectedEngine) {
      case 'indictrans':
        result = await translateWithIndicTrans(text, sourceLanguage, targetLanguage);
        if (result.success) {
          return { translatedText: result.translatedText, success: true, pivotUsed: false };
        }
        // Fallback to DL-Translate when IndicTrans fails
        // Allow fallback if target is NOT Indic (non-English) OR if both are in DL-Translate
        const shouldTryDLFallback = (!tgtIsIndic || targetIsEnglish) && (srcIsDL || sourceIsEnglish) && (tgtIsDL || targetIsEnglish);
        if (shouldTryDLFallback) {
          console.log(`[translate] IndicTrans failed, trying DL-Translate fallback`);
          result = await translateWithDLTranslate(text, sourceLanguage, targetLanguage);
          if (result.success) {
            return { translatedText: result.translatedText, success: true, pivotUsed: false };
          }
        }
        break;
        
      case 'dltranslate':
        result = await translateWithDLTranslate(text, sourceLanguage, targetLanguage);
        if (result.success) {
          return { translatedText: result.translatedText, success: true, pivotUsed: false };
        }
        // Fallback to IndicTrans2
        result = await translateWithIndicTrans(text, sourceLanguage, targetLanguage);
        if (result.success) {
          return { translatedText: result.translatedText, success: true, pivotUsed: false };
        }
        break;
    }
    
    // If all direct attempts fail, try pivot if not already English involved
    if (!sourceIsEnglish && !targetIsEnglish) {
      console.log('[translate] DIRECT failed, attempting PIVOT...');
    } else {
      return { translatedText: text, success: false, pivotUsed: false };
    }
  }

  // ================================================================
  // PIVOT TRANSLATION PATH
  // When languages need English as an intermediary bridge
  // Source → English → Target
  // ================================================================
  console.log('[translate] PIVOT: Using English bridge');
  
  // Determine best engine for Source → English
  const srcToEngEngine = selectBestEngine(sourceLanguage, 'english');
  console.log(`[translate] PIVOT Step 1: ${sourceLanguage}→English via ${srcToEngEngine}`);
  
  // Step 1: Source → English
  let pivotResult: { translatedText: string; success: boolean };
  
  switch (srcToEngEngine) {
    case 'indictrans':
      pivotResult = await translateWithIndicTrans(text, sourceLanguage, 'english');
      // Only try DL-Translate if the SOURCE language is explicitly supported by DL-Translate
      if (!pivotResult.success && srcIsDL) {
        pivotResult = await translateWithDLTranslate(text, sourceLanguage, 'english');
      }
      break;
    case 'dltranslate':
      pivotResult = { translatedText: text, success: false };
      if (srcIsDL) {
        pivotResult = await translateWithDLTranslate(text, sourceLanguage, 'english');
      }
      if (!pivotResult.success) {
        pivotResult = await translateWithIndicTrans(text, sourceLanguage, 'english');
      }
      break;
    default:
      pivotResult = { translatedText: text, success: false };
      if (srcIsDL) {
        pivotResult = await translateWithDLTranslate(text, sourceLanguage, 'english');
      }
      if (!pivotResult.success) {
        pivotResult = await translateWithIndicTrans(text, sourceLanguage, 'english');
      }
      break;
  }

  if (!pivotResult.success || pivotResult.translatedText === text) {
    console.log('[translate] PIVOT step 1 failed, returning original');
    return { translatedText: text, success: false, pivotUsed: false };
  }

  const englishText = pivotResult.translatedText.trim();
  console.log(`[translate] PIVOT step 1 success: "${text.substring(0, 30)}..." -> English: "${englishText.substring(0, 30)}..."`);

  // Determine best engine for English → Target
  const engToTgtEngine = selectBestEngine('english', targetLanguage);
  console.log(`[translate] PIVOT Step 2: English→${targetLanguage} via ${engToTgtEngine}`);

  // Step 2: English → Target
  let finalResult: { translatedText: string; success: boolean };
  
  switch (engToTgtEngine) {
    case 'indictrans':
      finalResult = await translateWithIndicTrans(englishText, 'english', targetLanguage);
      // Only try DL-Translate if the TARGET language is explicitly supported by DL-Translate
      if (!finalResult.success && tgtIsDL) {
        finalResult = await translateWithDLTranslate(englishText, 'english', targetLanguage);
      }
      break;
    case 'dltranslate':
      finalResult = { translatedText: englishText, success: false };
      if (tgtIsDL) {
        finalResult = await translateWithDLTranslate(englishText, 'english', targetLanguage);
      }
      if (!finalResult.success) {
        finalResult = await translateWithIndicTrans(englishText, 'english', targetLanguage);
      }
      break;
    default:
      finalResult = { translatedText: englishText, success: false };
      if (tgtIsDL) {
        finalResult = await translateWithDLTranslate(englishText, 'english', targetLanguage);
      }
      if (!finalResult.success) {
        finalResult = await translateWithIndicTrans(englishText, 'english', targetLanguage);
      }
      break;
  }

  if (finalResult.success) {
    console.log(`[translate] PIVOT step 2 success: English -> "${finalResult.translatedText.substring(0, 30)}..."`);
    return { translatedText: finalResult.translatedText, success: true, pivotUsed: true };
  }

  // If step 2 fails, return English as better-than-nothing fallback
  console.log('[translate] PIVOT step 2 failed, returning English');
  return { translatedText: englishText, success: true, pivotUsed: true };
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
 * Uses SMART ENGINE SELECTION based on target language
 * Only uses IndicTrans2 and DL-Translate
 */
async function transliterateToNative(
  latinText: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean }> {
  const targetCode = getLibreCode(targetLanguage);
  const tgtNorm = normalizeLanguage(targetLanguage);
  
  // Select best engine for English → Target
  const bestEngine = selectBestEngine('english', targetLanguage);
  
  console.log(`[transliterate] "${latinText}" to ${targetLanguage} (${targetCode}) via ${bestEngine}`);
  
  // Helper to check if result is valid native script
  const isValidNativeResult = (result: string): boolean => {
    const cleanedResult = cleanTextOutput(result);
    const detected = detectScriptFromText(cleanedResult);
    return !detected.isLatin && cleanedResult.length > 0 && cleanedResult !== latinText;
  };
  
  // Try engines in priority order based on selection (only IndicTrans2 and DL-Translate)
  const engineOrder: ('indictrans' | 'dltranslate')[] = 
    bestEngine === 'indictrans' ? ['indictrans', 'dltranslate'] : ['dltranslate', 'indictrans'];
  
  for (const engine of engineOrder) {
    // Avoid invalid dltranslate requests for languages that backend doesn't advertise
    if (engine === 'dltranslate' && !DLTRANSLATE_SUPPORTED_LANGUAGES.has(tgtNorm)) {
      continue;
    }
    try {
      let result: { translatedText: string; success: boolean };
      
      switch (engine) {
        case 'indictrans':
          result = await translateWithIndicTrans(latinText, 'english', targetLanguage);
          break;
        case 'dltranslate':
          result = await translateWithDLTranslate(latinText, 'english', targetLanguage);
          break;
      }
      
      if (result.success && isValidNativeResult(result.translatedText)) {
        const cleanedResult = cleanTextOutput(result.translatedText);
        console.log(`[transliterate] ${engine} success: "${latinText}" -> "${cleanedResult}"`);
        return { text: cleanedResult, success: true };
      }
    } catch (e) {
      console.log(`[transliterate] ${engine} failed: ${e}`);
    }
  }
  
  console.log(`[transliterate] All methods failed, keeping original`);
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
    // FULL SUPPORT for 1000+ language combinations
    // ================================================================
    if (mode === "bidirectional") {
      const langA = effectiveSourceParam || "english";
      const langB = effectiveTargetParam || "english";
      
      console.log(`[dl-translate] Bidirectional chat: sender=${langA}, receiver=${langB}, input="${inputText.substring(0, 50)}..."`);
      
      // Detect if input is Latin script
      const inputDetected = detectScriptFromText(inputText);
      const inputIsLatinText = inputDetected.isLatin;
      
      // Check if sender/receiver use Latin script (based on profile languages)
      const senderIsNonLatin = isNonLatinLanguage(langA);
      const receiverIsNonLatin = isNonLatinLanguage(langB);
      const senderIsEnglish = isSameLanguage(langA, 'english');
      const receiverIsEnglish = isSameLanguage(langB, 'english');
      const sameLanguage = isSameLanguage(langA, langB);
      
      console.log(`[dl-translate] Analysis: inputIsLatin=${inputIsLatinText}, senderIsNonLatin=${senderIsNonLatin}, receiverIsNonLatin=${receiverIsNonLatin}, senderIsEnglish=${senderIsEnglish}, receiverIsEnglish=${receiverIsEnglish}`);
      
      // ===================================
      // STEP 1: Process sender's input to get:
      //   - senderNativeText (in sender's native script - ALWAYS mother tongue)
      //   - englishCore (semantic meaning in English)
      // ===================================
      let englishCore = inputText;
      let senderNativeText = inputText;
      let wasTransliterated = false;
      
      // Helper: Check if Latin text looks like actual English (vs romanized native)
      const looksLikeEnglish = (text: string): boolean => {
        const lowered = text.toLowerCase().trim();
        const englishWords = ['hello', 'hi', 'how', 'are', 'you', 'what', 'where', 'when', 'why', 'who', 
          'the', 'is', 'a', 'an', 'to', 'for', 'in', 'on', 'with', 'good', 'morning', 'evening', 'night',
          'yes', 'no', 'ok', 'okay', 'thank', 'thanks', 'please', 'sorry', 'bye', 'love', 'like', 'want',
          'need', 'can', 'will', 'have', 'do', 'did', 'does', 'am', 'was', 'were', 'been', 'being',
          'my', 'your', 'our', 'their', 'his', 'her', 'its', 'this', 'that', 'these', 'those',
          'and', 'or', 'but', 'if', 'then', 'because', 'so', 'very', 'really', 'just', 'now', 'today',
          'tomorrow', 'yesterday', 'always', 'never', 'sometimes', 'often', 'here', 'there', 'where'];
        const words = lowered.split(/\s+/);
        const englishWordCount = words.filter(w => englishWords.includes(w)).length;
        // If more than 30% of words are common English words, it's likely English
        return words.length > 0 && (englishWordCount / words.length) >= 0.3;
      };
      
      if (senderIsEnglish) {
        // Sender speaks English - input IS the English core
        englishCore = inputText;
        senderNativeText = inputText;
        console.log(`[dl-translate] Sender is English speaker, input IS English core`);
      } else if (inputIsLatinText && senderIsNonLatin) {
        // Sender typed Latin text but speaks non-Latin language (e.g., Telugu, Hindi)
        // Two cases: 1) Actual English text 2) Romanized native (e.g., "bagunnava" for Telugu)
        
        const isActualEnglish = looksLikeEnglish(inputText);
        console.log(`[dl-translate] Latin input from non-Latin speaker, isActualEnglish=${isActualEnglish}`);
        
        if (isActualEnglish) {
          // CASE 1: User typed actual English (e.g., "how are you")
          // English IS the semantic core
          // TRANSLATE to sender's mother tongue for preview (in native script)
          englishCore = inputText;
          
          // Translate English → Sender's mother tongue (native script)
          // CRITICAL: Try ALL engines to ensure we get native text
          let toSenderNative = await translateText(inputText, 'english', langA);
          
          // If primary translation fails, try IndicTrans2 as fallback
          if (!toSenderNative.success || toSenderNative.translatedText === inputText) {
            console.log(`[dl-translate] Primary English→${langA} failed, trying IndicTrans2 fallback`);
            const indicResult = await translateWithIndicTrans(inputText, 'english', langA);
            if (indicResult.success && indicResult.translatedText !== inputText) {
              toSenderNative = { ...indicResult, pivotUsed: false };
            }
          }
          
          if (toSenderNative.success && toSenderNative.translatedText !== inputText) {
            senderNativeText = toSenderNative.translatedText;
            console.log(`[dl-translate] English→${langA} for sender native: "${senderNativeText.substring(0, 50)}"`);
          } else {
            // Fallback: keep English if ALL translation attempts fail
            senderNativeText = inputText;
            console.log(`[dl-translate] ALL English→${langA} attempts failed, keeping English for sender`);
          }
        } else {
          // CASE 2: User typed romanized native text (e.g., "bagunnava" for Telugu)
          // TRANSLITERATE to sender's native script + Get English meaning
          const senderNative = await transliterateToNative(inputText, langA);
          if (senderNative.success && senderNative.text !== inputText) {
            senderNativeText = senderNative.text;
            wasTransliterated = true;
            console.log(`[dl-translate] Sender transliteration success: "${inputText}" → "${senderNativeText}"`);
            
            // Get English meaning from native text (more accurate than from romanized)
            const toEnglish = await translateText(senderNativeText, langA, 'english');
            if (toEnglish.success && toEnglish.translatedText !== senderNativeText) {
              englishCore = toEnglish.translatedText;
              console.log(`[dl-translate] English core from native: "${englishCore.substring(0, 50)}..."`);
            }
          } else {
            // Transliteration failed - try to get English meaning from romanized input
            const toEnglish = await translateText(inputText, langA, 'english');
            if (toEnglish.success && toEnglish.translatedText !== inputText) {
              englishCore = toEnglish.translatedText;
              // Also try to translate back to sender's native
              const backToNative = await translateText(englishCore, 'english', langA);
              if (backToNative.success && backToNative.translatedText !== englishCore) {
                senderNativeText = backToNative.translatedText;
                console.log(`[dl-translate] Via English pivot, sender native: "${senderNativeText.substring(0, 50)}"`);
              }
            }
            console.log(`[dl-translate] Transliteration failed, English core: "${englishCore.substring(0, 50)}..."`);
          }
        }
      } else if (!inputIsLatinText) {
        // Sender typed in native script directly (Gboard, IME, etc.)
        senderNativeText = inputText;
        
        // Get English semantic meaning
        const toEnglish = await translateText(inputText, langA, 'english');
        if (toEnglish.success && toEnglish.translatedText !== inputText) {
          englishCore = toEnglish.translatedText;
          console.log(`[dl-translate] Native input, English core: "${englishCore.substring(0, 50)}..."`);
        }
      } else {
        // Sender speaks Latin-script language (Spanish, French, etc.) and typed in that script
        // Get English meaning directly
        const toEnglish = await translateText(inputText, langA, 'english');
        if (toEnglish.success && toEnglish.translatedText !== inputText) {
          englishCore = toEnglish.translatedText;
          console.log(`[dl-translate] Latin-script sender, English core: "${englishCore.substring(0, 50)}..."`);
        }
      }
      
      // ===================================
      // STEP 2: Translate to receiver's language
      // ROUTING LOGIC:
      //   - Native→Native: English pivot (Telugu→English→Tamil)
      //   - Latin→Native (romanized): English pivot (Bagunnava→English→Hindi)
      //   - Native→Latin: English pivot (Telugu→English→Spanish)
      //   - Latin→Latin: DIRECT translation (Spanish→French)
      //   - English→Native: DIRECT translation (English→Telugu)
      //   - Native→English: DIRECT (already have englishCore)
      //   - Latin→English: DIRECT (already have englishCore)
      //   - English→Latin: DIRECT translation (English→Spanish)
      // ===================================
      let receiverText = inputText;
      
      // Determine if we need English pivot or direct translation
      const needsEnglishPivot = (
        // Native → Native (both non-Latin, neither is English)
        (senderIsNonLatin && receiverIsNonLatin && !senderIsEnglish && !receiverIsEnglish) ||
        // Latin → Native (romanized input to non-Latin receiver, sender is non-Latin speaker)
        (inputIsLatinText && senderIsNonLatin && receiverIsNonLatin && !receiverIsEnglish) ||
        // Native → Latin (non-Latin sender to Latin-script receiver, neither is English)
        (!inputIsLatinText && senderIsNonLatin && !receiverIsNonLatin && !senderIsEnglish && !receiverIsEnglish)
      );
      
      console.log(`[dl-translate] Translation routing: needsEnglishPivot=${needsEnglishPivot}`);
      
      if (sameLanguage) {
        // Same language - receiver sees sender's native text
        receiverText = senderNativeText;
        console.log(`[dl-translate] Same language, no translation needed`);
      } else if (receiverIsEnglish) {
        // Receiver speaks English - they see the English core (DIRECT)
        receiverText = englishCore;
        console.log(`[dl-translate] DIRECT: Receiver is English speaker, using English core`);
      } else if (senderIsEnglish) {
        // Sender speaks English - DIRECT translation to receiver's language
        const directToReceiver = await translateText(inputText, 'english', langB);
        if (directToReceiver.success && directToReceiver.translatedText !== inputText) {
          receiverText = directToReceiver.translatedText;
          console.log(`[dl-translate] DIRECT: English→${langB}: "${receiverText.substring(0, 50)}..."`);
        }
      } else if (!senderIsNonLatin && !receiverIsNonLatin) {
        // Latin → Latin (e.g., Spanish → French) - DIRECT translation
        const directLatinToLatin = await translateText(senderNativeText || inputText, langA, langB);
        if (directLatinToLatin.success && directLatinToLatin.translatedText !== senderNativeText) {
          receiverText = directLatinToLatin.translatedText;
          console.log(`[dl-translate] DIRECT Latin→Latin: ${langA}→${langB}: "${receiverText.substring(0, 50)}..."`);
        }
      } else if (needsEnglishPivot) {
        // Use English as bidirectional pivot for Native↔Native, Latin→Native, Native→Latin
        console.log(`[dl-translate] PIVOT: Using English as bridge (${langA}→English→${langB})`);
        const toReceiver = await translateText(englishCore, 'english', langB);
        if (toReceiver.success && toReceiver.translatedText !== englishCore) {
          receiverText = toReceiver.translatedText;
          console.log(`[dl-translate] PIVOT: English→${langB}: "${receiverText.substring(0, 50)}..."`);
        } else {
          // Fallback: Try direct translation if English pivot failed
          const directTranslate = await translateText(senderNativeText || inputText, langA, langB);
          if (directTranslate.success && directTranslate.translatedText !== senderNativeText) {
            receiverText = directTranslate.translatedText;
            console.log(`[dl-translate] PIVOT FALLBACK: Direct ${langA}→${langB}: "${receiverText.substring(0, 50)}..."`);
          }
        }
      } else {
        // Default: Direct translation for any other case
        const directTranslate = await translateText(senderNativeText || inputText, langA, langB);
        if (directTranslate.success && directTranslate.translatedText !== senderNativeText) {
          receiverText = directTranslate.translatedText;
          console.log(`[dl-translate] DIRECT: ${langA}→${langB}: "${receiverText.substring(0, 50)}..."`);
        }
      }
      
      // Clean all outputs
      const cleanSenderView = cleanTextOutput(senderNativeText);
      const cleanReceiverView = cleanTextOutput(receiverText);
      const cleanEnglishCore = cleanTextOutput(englishCore);
      
      console.log(`[dl-translate] FINAL:
        senderView: "${cleanSenderView.substring(0, 30)}..."
        receiverView: "${cleanReceiverView.substring(0, 30)}..."
        englishCore: "${cleanEnglishCore.substring(0, 30)}..."`);
      
      return new Response(
        JSON.stringify({
          // Sender's view (their native language/script)
          senderView: cleanSenderView,
          // Receiver's view (their native language/script)  
          receiverView: cleanReceiverView,
          // English semantic core for reference
          englishCore: cleanEnglishCore,
          // Original input (what was typed)
          originalText: inputText,
          // Metadata
          senderLanguage: langA,
          receiverLanguage: langB,
          wasTransliterated: wasTransliterated,
          wasTranslated: !sameLanguage && cleanReceiverView !== inputText,
          inputWasLatin: inputIsLatinText,
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
