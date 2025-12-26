import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Complete NLLB-200 language code mapping - ALL 200+ languages supported
const languageToNLLB: Record<string, string> = {
  // ========== INDIAN LANGUAGES ==========
  "hindi": "hin_Deva",
  "bengali": "ben_Beng",
  "bangla": "ben_Beng",
  "telugu": "tel_Telu",
  "tamil": "tam_Taml",
  "marathi": "mar_Deva",
  "gujarati": "guj_Gujr",
  "kannada": "kan_Knda",
  "malayalam": "mal_Mlym",
  "punjabi": "pan_Guru",
  "odia": "ory_Orya",
  "oriya": "ory_Orya",
  "assamese": "asm_Beng",
  "nepali": "npi_Deva",
  "urdu": "urd_Arab",
  "konkani": "gom_Deva",
  "maithili": "mai_Deva",
  "santali": "sat_Olck",
  "bodo": "brx_Deva",
  "dogri": "doi_Deva",
  "kashmiri": "kas_Arab",
  "sindhi": "snd_Arab",
  "manipuri": "mni_Beng",
  "sinhala": "sin_Sinh",
  "sinhalese": "sin_Sinh",
  "bhojpuri": "bho_Deva",
  "magahi": "mag_Deva",
  "chhattisgarhi": "hne_Deva",
  "awadhi": "awa_Deva",
  
  // ========== MAJOR WORLD LANGUAGES ==========
  "english": "eng_Latn",
  "spanish": "spa_Latn",
  "french": "fra_Latn",
  "german": "deu_Latn",
  "portuguese": "por_Latn",
  "italian": "ita_Latn",
  "dutch": "nld_Latn",
  "russian": "rus_Cyrl",
  "polish": "pol_Latn",
  "ukrainian": "ukr_Cyrl",
  
  // ========== EAST ASIAN LANGUAGES ==========
  "chinese": "zho_Hans",
  "mandarin": "zho_Hans",
  "simplified chinese": "zho_Hans",
  "traditional chinese": "zho_Hant",
  "cantonese": "yue_Hant",
  "japanese": "jpn_Jpan",
  "korean": "kor_Hang",
  
  // ========== SOUTHEAST ASIAN LANGUAGES ==========
  "vietnamese": "vie_Latn",
  "thai": "tha_Thai",
  "indonesian": "ind_Latn",
  "malay": "zsm_Latn",
  "tagalog": "tgl_Latn",
  "filipino": "tgl_Latn",
  "burmese": "mya_Mymr",
  "myanmar": "mya_Mymr",
  "khmer": "khm_Khmr",
  "cambodian": "khm_Khmr",
  "lao": "lao_Laoo",
  "laotian": "lao_Laoo",
  "javanese": "jav_Latn",
  "sundanese": "sun_Latn",
  "cebuano": "ceb_Latn",
  "ilocano": "ilo_Latn",
  "waray": "war_Latn",
  "pangasinan": "pag_Latn",
  "minangkabau": "min_Latn",
  "acehnese": "ace_Latn",
  "banjar": "bjn_Latn",
  "balinese": "ban_Latn",
  
  // ========== MIDDLE EASTERN LANGUAGES ==========
  "arabic": "arb_Arab",
  "standard arabic": "arb_Arab",
  "egyptian arabic": "arz_Arab",
  "moroccan arabic": "ary_Arab",
  "levantine arabic": "apc_Arab",
  "gulf arabic": "acq_Arab",
  "persian": "pes_Arab",
  "farsi": "pes_Arab",
  "pashto": "pbt_Arab",
  "dari": "prs_Arab",
  "turkish": "tur_Latn",
  "hebrew": "heb_Hebr",
  "kurdish": "ckb_Arab",
  "sorani": "ckb_Arab",
  "kurmanji": "kmr_Latn",
  
  // ========== AFRICAN LANGUAGES ==========
  "swahili": "swh_Latn",
  "kiswahili": "swh_Latn",
  "amharic": "amh_Ethi",
  "yoruba": "yor_Latn",
  "igbo": "ibo_Latn",
  "hausa": "hau_Latn",
  "zulu": "zul_Latn",
  "xhosa": "xho_Latn",
  "afrikaans": "afr_Latn",
  "somali": "som_Latn",
  "tigrinya": "tir_Ethi",
  "oromo": "gaz_Latn",
  "shona": "sna_Latn",
  "ndebele": "nde_Latn",
  "sesotho": "sot_Latn",
  "setswana": "tsn_Latn",
  "tswana": "tsn_Latn",
  "wolof": "wol_Latn",
  "fulani": "fuv_Latn",
  "fula": "fuv_Latn",
  "bambara": "bam_Latn",
  "lingala": "lin_Latn",
  "kongo": "kon_Latn",
  "kikongo": "kon_Latn",
  "luganda": "lug_Latn",
  "kinyarwanda": "kin_Latn",
  "kirundi": "run_Latn",
  "malagasy": "plt_Latn",
  "twi": "twi_Latn",
  "akan": "aka_Latn",
  "ewe": "ewe_Latn",
  "fon": "fon_Latn",
  "mossi": "mos_Latn",
  "moore": "mos_Latn",
  "kanuri": "knc_Latn",
  "tumbuka": "tum_Latn",
  "chichewa": "nya_Latn",
  "nyanja": "nya_Latn",
  "bemba": "bem_Latn",
  "lozi": "loz_Latn",
  "tsonga": "tso_Latn",
  "venda": "ven_Latn",
  "swati": "ssw_Latn",
  "siswati": "ssw_Latn",
  "dinka": "dik_Latn",
  "nuer": "nus_Latn",
  "luo": "luo_Latn",
  "acholi": "ach_Latn",
  
  // ========== EUROPEAN LANGUAGES ==========
  "greek": "ell_Grek",
  "czech": "ces_Latn",
  "romanian": "ron_Latn",
  "hungarian": "hun_Latn",
  "swedish": "swe_Latn",
  "danish": "dan_Latn",
  "finnish": "fin_Latn",
  "norwegian": "nob_Latn",
  "norwegian bokmal": "nob_Latn",
  "norwegian nynorsk": "nno_Latn",
  "icelandic": "isl_Latn",
  "catalan": "cat_Latn",
  "galician": "glg_Latn",
  "basque": "eus_Latn",
  "croatian": "hrv_Latn",
  "serbian": "srp_Cyrl",
  "bosnian": "bos_Latn",
  "slovak": "slk_Latn",
  "slovenian": "slv_Latn",
  "bulgarian": "bul_Cyrl",
  "macedonian": "mkd_Cyrl",
  "lithuanian": "lit_Latn",
  "latvian": "lvs_Latn",
  "estonian": "est_Latn",
  "albanian": "als_Latn",
  "maltese": "mlt_Latn",
  "irish": "gle_Latn",
  "gaelic": "gle_Latn",
  "scottish gaelic": "gla_Latn",
  "welsh": "cym_Latn",
  "breton": "bre_Latn",
  "luxembourgish": "ltz_Latn",
  "belarusian": "bel_Cyrl",
  "occitan": "oci_Latn",
  "corsican": "cos_Latn",
  "sardinian": "srd_Latn",
  "friulian": "fur_Latn",
  "romansh": "roh_Latn",
  "faroese": "fao_Latn",
  
  // ========== CENTRAL ASIAN LANGUAGES ==========
  "georgian": "kat_Geor",
  "armenian": "hye_Armn",
  "azerbaijani": "azj_Latn",
  "azeri": "azj_Latn",
  "kazakh": "kaz_Cyrl",
  "uzbek": "uzn_Latn",
  "turkmen": "tuk_Latn",
  "kyrgyz": "kir_Cyrl",
  "tajik": "tgk_Cyrl",
  "mongolian": "khk_Cyrl",
  "tibetan": "bod_Tibt",
  "uyghur": "uig_Arab",
  "tatar": "tat_Cyrl",
  "bashkir": "bak_Cyrl",
  "chuvash": "chv_Cyrl",
  
  // ========== SOUTH ASIAN REGIONAL ==========
  "dzongkha": "dzo_Tibt",
  "bhutanese": "dzo_Tibt",
  "maldivian": "div_Thaa",
  "dhivehi": "div_Thaa",
  
  // ========== PACIFIC & OCEANIC ==========
  "samoan": "smo_Latn",
  "tongan": "ton_Latn",
  "fijian": "fij_Latn",
  "hawaiian": "haw_Latn",
  "maori": "mri_Latn",
  "tahitian": "tah_Latn",
  
  // ========== CREOLES & PIDGINS ==========
  "haitian creole": "hat_Latn",
  "haitian": "hat_Latn",
  "jamaican patois": "jam_Latn",
  "tok pisin": "tpi_Latn",
  "papiamento": "pap_Latn",
  "cape verdean creole": "kea_Latn",
  "seychellois creole": "crs_Latn",
  "mauritian creole": "mfe_Latn",
  
  // ========== NATIVE AMERICAN ==========
  "quechua": "quy_Latn",
  "aymara": "ayr_Latn",
  "guarani": "grn_Latn",
  "nahuatl": "nah_Latn",
  "maya": "yua_Latn",
  "yucatec maya": "yua_Latn",
  "mapuche": "arn_Latn",
  "mapudungun": "arn_Latn",
  
  // ========== OTHER LANGUAGES ==========
  "esperanto": "epo_Latn",
  "latin": "lat_Latn",
  "sanskrit": "san_Deva",
  "pali": "pli_Deva",
  "classical chinese": "lzh_Hans",
  "literary chinese": "lzh_Hans",
  
  // ========== ADDITIONAL NLLB LANGUAGES ==========
  "asturian": "ast_Latn",
  "aragonese": "arg_Latn",
  "silesian": "szl_Latn",
  "kashubian": "csb_Latn",
  "sorbian": "hsb_Latn",
  "limburgish": "lim_Latn",
  "low german": "nds_Latn",
  "scots": "sco_Latn",
  "venetian": "vec_Latn",
  "neapolitan": "nap_Latn",
  "sicilian": "scn_Latn",
  "piedmontese": "pms_Latn",
  "lombard": "lmo_Latn",
  "ligurian": "lij_Latn",
  "emilian": "egl_Latn",
  "franco-provencal": "frp_Latn",
  "walloon": "wln_Latn",
  "aromanian": "rup_Latn",
  "istro-romanian": "ist_Latn",
  "mirandese": "mwl_Latn",
  "ladino": "lad_Latn",
  "chavacano": "cbk_Latn",
  "bikolano": "bik_Latn",
  "kapampangan": "pam_Latn",
  "hiligaynon": "hil_Latn",
  "tausug": "tsg_Latn",
  "maranao": "mrw_Latn",
  "maguindanao": "mdh_Latn",
  "tetum": "tet_Latn",
  "batak": "bbc_Latn",
  "buginese": "bug_Latn",
  "makassar": "mak_Latn",
  "gorontalo": "gor_Latn",
  "sasak": "sas_Latn",
  "rejang": "rej_Latn",
};

// Unicode script detection patterns - comprehensive global coverage
const scriptPatterns: { regex: RegExp; language: string; nllbCode: string }[] = [
  // ========== INDIAN SCRIPTS ==========
  { regex: /[\u0900-\u097F]/, language: "hindi", nllbCode: "hin_Deva" }, // Devanagari (Hindi, Marathi, Sanskrit, Nepali)
  { regex: /[\u0980-\u09FF]/, language: "bengali", nllbCode: "ben_Beng" }, // Bengali
  { regex: /[\u0C00-\u0C7F]/, language: "telugu", nllbCode: "tel_Telu" }, // Telugu
  { regex: /[\u0B80-\u0BFF]/, language: "tamil", nllbCode: "tam_Taml" }, // Tamil
  { regex: /[\u0A80-\u0AFF]/, language: "gujarati", nllbCode: "guj_Gujr" }, // Gujarati
  { regex: /[\u0C80-\u0CFF]/, language: "kannada", nllbCode: "kan_Knda" }, // Kannada
  { regex: /[\u0D00-\u0D7F]/, language: "malayalam", nllbCode: "mal_Mlym" }, // Malayalam
  { regex: /[\u0A00-\u0A7F]/, language: "punjabi", nllbCode: "pan_Guru" }, // Gurmukhi (Punjabi)
  { regex: /[\u0B00-\u0B7F]/, language: "odia", nllbCode: "ory_Orya" }, // Odia/Oriya
  { regex: /[\u0D80-\u0DFF]/, language: "sinhala", nllbCode: "sin_Sinh" }, // Sinhala
  { regex: /[\u1C50-\u1C7F]/, language: "manipuri", nllbCode: "mni_Mtei" }, // Ol Chiki (Santali)
  { regex: /[\u1C00-\u1C4F]/, language: "manipuri", nllbCode: "mni_Beng" }, // Lepcha
  
  // ========== EAST ASIAN SCRIPTS ==========
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: "chinese", nllbCode: "zho_Hans" }, // CJK Unified Ideographs
  { regex: /[\u3040-\u309F]/, language: "japanese", nllbCode: "jpn_Jpan" }, // Hiragana
  { regex: /[\u30A0-\u30FF]/, language: "japanese", nllbCode: "jpn_Jpan" }, // Katakana
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: "korean", nllbCode: "kor_Hang" }, // Hangul
  { regex: /[\u31F0-\u31FF]/, language: "japanese", nllbCode: "jpn_Jpan" }, // Katakana Phonetic Extensions
  
  // ========== SOUTHEAST ASIAN SCRIPTS ==========
  { regex: /[\u0E00-\u0E7F]/, language: "thai", nllbCode: "tha_Thai" }, // Thai
  { regex: /[\u1000-\u109F]/, language: "burmese", nllbCode: "mya_Mymr" }, // Myanmar/Burmese
  { regex: /[\u1780-\u17FF]/, language: "khmer", nllbCode: "khm_Khmr" }, // Khmer
  { regex: /[\u0E80-\u0EFF]/, language: "lao", nllbCode: "lao_Laoo" }, // Lao
  { regex: /[\uA980-\uA9DF]/, language: "javanese", nllbCode: "jav_Java" }, // Javanese
  { regex: /[\u1B80-\u1BBF]/, language: "sundanese", nllbCode: "sun_Sund" }, // Sundanese
  { regex: /[\u1700-\u171F]/, language: "tagalog", nllbCode: "tgl_Tglg" }, // Baybayin/Tagalog
  { regex: /[\u1720-\u173F]/, language: "hanunoo", nllbCode: "hnn_Hano" }, // Hanunoo
  { regex: /[\u1740-\u175F]/, language: "buhid", nllbCode: "bku_Buhd" }, // Buhid
  { regex: /[\u1760-\u177F]/, language: "tagbanwa", nllbCode: "tbw_Tagb" }, // Tagbanwa
  { regex: /[\u1A00-\u1A1F]/, language: "buginese", nllbCode: "bug_Bugi" }, // Buginese/Lontara
  { regex: /[\u1B00-\u1B7F]/, language: "balinese", nllbCode: "ban_Bali" }, // Balinese
  { regex: /[\uA930-\uA97F]/, language: "rejang", nllbCode: "rej_Rjng" }, // Rejang
  { regex: /[\u1CC0-\u1CCF]/, language: "sundanese", nllbCode: "sun_Sund" }, // Sundanese Supplement
  
  // ========== MIDDLE EASTERN SCRIPTS ==========
  { regex: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, language: "arabic", nllbCode: "arb_Arab" }, // Arabic
  { regex: /[\u0590-\u05FF\uFB1D-\uFB4F]/, language: "hebrew", nllbCode: "heb_Hebr" }, // Hebrew
  { regex: /[\u0700-\u074F]/, language: "syriac", nllbCode: "syr_Syrc" }, // Syriac
  { regex: /[\u0780-\u07BF]/, language: "dhivehi", nllbCode: "div_Thaa" }, // Thaana (Dhivehi/Maldivian)
  { regex: /[\u0840-\u085F]/, language: "mandaic", nllbCode: "mid_Mand" }, // Mandaic
  { regex: /[\u0860-\u086F]/, language: "syriac", nllbCode: "syr_Syre" }, // Syriac Supplement
  
  // ========== CYRILLIC SCRIPTS ==========
  { regex: /[\u0400-\u04FF]/, language: "russian", nllbCode: "rus_Cyrl" }, // Cyrillic (Russian, Ukrainian, etc.)
  { regex: /[\u0500-\u052F]/, language: "russian", nllbCode: "rus_Cyrl" }, // Cyrillic Supplement
  { regex: /[\u2DE0-\u2DFF]/, language: "russian", nllbCode: "rus_Cyrl" }, // Cyrillic Extended-A
  { regex: /[\uA640-\uA69F]/, language: "russian", nllbCode: "rus_Cyrl" }, // Cyrillic Extended-B
  
  // ========== CAUCASIAN SCRIPTS ==========
  { regex: /[\u10A0-\u10FF]/, language: "georgian", nllbCode: "kat_Geor" }, // Georgian
  { regex: /[\u2D00-\u2D2F]/, language: "georgian", nllbCode: "kat_Geor" }, // Georgian Supplement
  { regex: /[\u0530-\u058F]/, language: "armenian", nllbCode: "hye_Armn" }, // Armenian
  { regex: /[\uFB00-\uFB4F]/, language: "armenian", nllbCode: "hye_Armn" }, // Alphabetic Presentation Forms
  
  // ========== AFRICAN SCRIPTS ==========
  { regex: /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/, language: "amharic", nllbCode: "amh_Ethi" }, // Ethiopic
  { regex: /[\u2C80-\u2CFF]/, language: "coptic", nllbCode: "cop_Copt" }, // Coptic
  { regex: /[\uA6A0-\uA6FF]/, language: "bamum", nllbCode: "bax_Bamu" }, // Bamum
  { regex: /[\u07C0-\u07FF]/, language: "nko", nllbCode: "nqo_Nkoo" }, // N'Ko (Manding languages)
  { regex: /[\uA500-\uA63F]/, language: "vai", nllbCode: "vai_Vaii" }, // Vai
  { regex: /[\uA840-\uA87F]/, language: "phags-pa", nllbCode: "phk_Phag" }, // Phags-pa
  { regex: /[\u2D30-\u2D7F]/, language: "berber", nllbCode: "tzm_Tfng" }, // Tifinagh (Berber)
  { regex: /[\uAB00-\uAB2F]/, language: "ethiopic", nllbCode: "gez_Ethi" }, // Ethiopic Extended-A
  { regex: /[\u1E00-\u1EFF]/, language: "vietnamese", nllbCode: "vie_Latn" }, // Latin Extended Additional (Vietnamese)
  
  // ========== CENTRAL ASIAN SCRIPTS ==========
  { regex: /[\u0F00-\u0FFF]/, language: "tibetan", nllbCode: "bod_Tibt" }, // Tibetan
  { regex: /[\u1800-\u18AF]/, language: "mongolian", nllbCode: "mon_Mong" }, // Traditional Mongolian
  { regex: /[\u11660-\u1167F]/, language: "mongolian", nllbCode: "mon_Mong" }, // Mongolian Supplement
  
  // ========== GREEK SCRIPT ==========
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, language: "greek", nllbCode: "ell_Grek" }, // Greek
  
  // ========== INDIC EXTENSIONS ==========
  { regex: /[\u11000-\u1107F]/, language: "brahmi", nllbCode: "pra_Brah" }, // Brahmi
  { regex: /[\u11080-\u110CF]/, language: "kaithi", nllbCode: "kfy_Kthi" }, // Kaithi
  { regex: /[\u110D0-\u110FF]/, language: "sora", nllbCode: "srb_Sora" }, // Sora Sompeng
  { regex: /[\u11100-\u1114F]/, language: "chakma", nllbCode: "ccp_Cakm" }, // Chakma
  { regex: /[\u11150-\u1117F]/, language: "mahajani", nllbCode: "mah_Mahj" }, // Mahajani
  { regex: /[\u11180-\u111DF]/, language: "sharada", nllbCode: "saz_Shrd" }, // Sharada
  { regex: /[\u11200-\u1124F]/, language: "khojki", nllbCode: "khj_Khoj" }, // Khojki
  { regex: /[\u112B0-\u112FF]/, language: "khudawadi", nllbCode: "snd_Sind" }, // Khudawadi (Sindhi)
  { regex: /[\u11300-\u1137F]/, language: "grantha", nllbCode: "san_Gran" }, // Grantha
  { regex: /[\u11400-\u1147F]/, language: "newa", nllbCode: "new_Newa" }, // Newa (Newari)
  { regex: /[\u11480-\u114DF]/, language: "tirhuta", nllbCode: "mai_Tirh" }, // Tirhuta (Maithili)
  { regex: /[\u11580-\u115FF]/, language: "siddham", nllbCode: "san_Sidd" }, // Siddham
  { regex: /[\u11600-\u1165F]/, language: "modi", nllbCode: "mar_Modi" }, // Modi
  { regex: /[\u11680-\u116CF]/, language: "takri", nllbCode: "doi_Takr" }, // Takri
  { regex: /[\u11700-\u1173F]/, language: "ahom", nllbCode: "aho_Ahom" }, // Ahom
  { regex: /[\u11800-\u1184F]/, language: "dogra", nllbCode: "doi_Dogr" }, // Dogra
  { regex: /[\u11A00-\u11A4F]/, language: "zanabazar", nllbCode: "xwo_Zanb" }, // Zanabazar Square
  { regex: /[\u11A50-\u11AAF]/, language: "soyombo", nllbCode: "xwo_Soyo" }, // Soyombo
  { regex: /[\u11C00-\u11C6F]/, language: "bhaiksuki", nllbCode: "san_Bhks" }, // Bhaiksuki
  { regex: /[\u11C70-\u11CBF]/, language: "marchen", nllbCode: "bod_Marc" }, // Marchen
  { regex: /[\u11D00-\u11D5F]/, language: "masaram", nllbCode: "gon_Gonm" }, // Masaram Gondi
  { regex: /[\u11D60-\u11DAF]/, language: "gunjala", nllbCode: "gon_Gong" }, // Gunjala Gondi
  { regex: /[\u11EE0-\u11EFF]/, language: "makasar", nllbCode: "mak_Maka" }, // Makasar
  { regex: /[\u11FB0-\u11FBF]/, language: "lisu", nllbCode: "lis_Lisu" }, // Lisu Supplement
  { regex: /[\u11FC0-\u11FFF]/, language: "tamil", nllbCode: "tam_Taml" }, // Tamil Supplement
  
  // ========== CANADIAN ABORIGINAL ==========
  { regex: /[\u1400-\u167F]/, language: "cree", nllbCode: "cre_Cans" }, // Unified Canadian Aboriginal Syllabics
  { regex: /[\u18B0-\u18FF]/, language: "cree", nllbCode: "cre_Cans" }, // UCAS Extended
  
  // ========== RUNIC & HISTORIC ==========
  { regex: /[\u16A0-\u16FF]/, language: "runic", nllbCode: "non_Runr" }, // Runic
  { regex: /[\u10300-\u1032F]/, language: "gothic", nllbCode: "got_Goth" }, // Gothic
  { regex: /[\u10330-\u1034F]/, language: "gothic", nllbCode: "got_Goth" }, // Gothic
  
  // ========== SOUTHEAST ASIAN EXTENDED ==========
  { regex: /[\u1980-\u19DF]/, language: "tai lue", nllbCode: "khb_Talu" }, // New Tai Lue
  { regex: /[\u1A20-\u1AAF]/, language: "tai tham", nllbCode: "nod_Lana" }, // Tai Tham (Lanna)
  { regex: /[\uAA60-\uAA7F]/, language: "myanmar", nllbCode: "mya_Mymr" }, // Myanmar Extended-A
  { regex: /[\uA9E0-\uA9FF]/, language: "myanmar", nllbCode: "mya_Mymr" }, // Myanmar Extended-B
  { regex: /[\uAA00-\uAA5F]/, language: "cham", nllbCode: "cja_Cham" }, // Cham
  { regex: /[\uAA80-\uAADF]/, language: "tai viet", nllbCode: "tdd_Tavt" }, // Tai Viet
  
  // ========== YI SCRIPT ==========
  { regex: /[\uA000-\uA48F\uA490-\uA4CF]/, language: "yi", nllbCode: "iii_Yiii" }, // Yi
  
  // ========== LISU & MIAO ==========
  { regex: /[\uA4D0-\uA4FF]/, language: "lisu", nllbCode: "lis_Lisu" }, // Lisu
  { regex: /[\u16F00-\u16F9F]/, language: "miao", nllbCode: "hmd_Plrd" }, // Miao (Pollard)
];

function getNLLBCode(language: string): string | null {
  if (!language) return null;
  const normalizedLang = language.toLowerCase().trim();
  return languageToNLLB[normalizedLang] || null;
}

function isIndianLanguage(language: string): boolean {
  const indianLanguages = [
    "hindi", "bengali", "bangla", "telugu", "tamil", "marathi", "gujarati",
    "kannada", "malayalam", "punjabi", "odia", "oriya", "assamese", "nepali",
    "urdu", "konkani", "maithili", "santali", "bodo", "dogri", "kashmiri",
    "sindhi", "manipuri", "sinhala", "bhojpuri", "magahi", "chhattisgarhi", "awadhi"
  ];
  return indianLanguages.includes(language.toLowerCase().trim());
}

// Comprehensive language detection from Unicode script patterns
function detectLanguageFromText(text: string): { language: string; nllbCode: string } {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return { language: "english", nllbCode: "eng_Latn" };
  }

  // Check each script pattern
  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmedText)) {
      console.log(`[NLLB-200] Detected script: ${pattern.language} from Unicode pattern`);
      return { language: pattern.language, nllbCode: pattern.nllbCode };
    }
  }

  // Check for extended Latin with diacritics (various European languages)
  if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(trimmedText)) {
    // Try to distinguish between European languages by common patterns
    if (/[ñ¿¡]/i.test(trimmedText)) return { language: "spanish", nllbCode: "spa_Latn" };
    if (/[ç]/i.test(trimmedText) && /[ã|õ]/i.test(trimmedText)) return { language: "portuguese", nllbCode: "por_Latn" };
    if (/[éèêë]/i.test(trimmedText) && /[çà]/i.test(trimmedText)) return { language: "french", nllbCode: "fra_Latn" };
    if (/[äöüß]/i.test(trimmedText)) return { language: "german", nllbCode: "deu_Latn" };
    if (/[ăîâșț]/i.test(trimmedText)) return { language: "romanian", nllbCode: "ron_Latn" };
    if (/[ąćęłńóśźż]/i.test(trimmedText)) return { language: "polish", nllbCode: "pol_Latn" };
    if (/[čďěňřšťůž]/i.test(trimmedText)) return { language: "czech", nllbCode: "ces_Latn" };
    if (/[őű]/i.test(trimmedText)) return { language: "hungarian", nllbCode: "hun_Latn" };
    if (/[åäö]/i.test(trimmedText)) return { language: "swedish", nllbCode: "swe_Latn" };
    if (/[æøå]/i.test(trimmedText)) return { language: "norwegian", nllbCode: "nob_Latn" };
  }

  // Check for Vietnamese diacritics specifically
  if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(trimmedText)) {
    return { language: "vietnamese", nllbCode: "vie_Latn" };
  }

  // Default to English for basic Latin script
  return { language: "english", nllbCode: "eng_Latn" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sourceLanguage, targetLanguage } = await req.json();

    console.log(`[NLLB-200] Translation request: source="${sourceLanguage}", target="${targetLanguage}"`);

    if (!message || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Message and target language are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HF_TOKEN) {
      console.error("HUGGING_FACE_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          detectedLanguage: "unknown",
          error: "Translation service not configured"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target NLLB code
    const targetNLLBCode = getNLLBCode(targetLanguage);
    if (!targetNLLBCode) {
      console.error(`Unsupported target language: ${targetLanguage}`);
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          detectedLanguage: "unknown",
          error: `Unsupported language: ${targetLanguage}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect or use provided source language
    let sourceNLLBCode: string;
    let detectedLanguage: string;
    
    if (sourceLanguage) {
      sourceNLLBCode = getNLLBCode(sourceLanguage) || "eng_Latn";
      detectedLanguage = sourceLanguage;
    } else {
      // Auto-detect from text script patterns
      const detected = detectLanguageFromText(message);
      sourceNLLBCode = detected.nllbCode;
      detectedLanguage = detected.language;
      console.log(`[NLLB-200] Auto-detected language from text: ${detectedLanguage} (${sourceNLLBCode})`);
    }

    // ============= SAME LANGUAGE CHECK =============
    const sourceLower = (sourceLanguage || detectedLanguage).toLowerCase().trim();
    const targetLower = targetLanguage.toLowerCase().trim();
    
    if (sourceNLLBCode === targetNLLBCode || sourceLower === targetLower) {
      console.log(`[NLLB-200] ✓ Same language detected (${detectedLanguage} == ${targetLanguage}), NO TRANSLATION needed`);
      return new Response(
        JSON.stringify({
          translatedMessage: message,
          isTranslated: false,
          detectedLanguage,
          sourceLanguageCode: sourceNLLBCode,
          targetLanguageCode: targetNLLBCode,
          reason: "same_language"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // ============= DIFFERENT LANGUAGES - TRANSLATE =============
    console.log(`[NLLB-200] ✓ Different languages (${detectedLanguage} != ${targetLanguage}), TRANSLATION enabled`);
    console.log(`Translating from ${detectedLanguage} (${sourceNLLBCode}) to ${targetLanguage} (${targetNLLBCode}): "${message.substring(0, 50)}..."`);

    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/nllb-200-distilled-600M",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: message,
          parameters: {
            src_lang: sourceNLLBCode,
            tgt_lang: targetNLLBCode,
            max_length: 512,
          },
          options: {
            wait_for_model: true,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error:", response.status, errorText);
      
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ 
            translatedMessage: message, 
            isTranslated: false,
            detectedLanguage,
            error: "Translation model is loading, please try again in a few seconds"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          detectedLanguage,
          error: "Translation failed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("NLLB-200 Response:", JSON.stringify(data).substring(0, 200));

    let translatedText = message;
    
    if (Array.isArray(data) && data.length > 0) {
      translatedText = data[0].translation_text || data[0].generated_text || message;
    } else if (data.translation_text) {
      translatedText = data.translation_text;
    } else if (data.generated_text) {
      translatedText = data.generated_text;
    }

    const isTranslated = translatedText !== message;

    console.log(`Translation result: "${translatedText.substring(0, 50)}..." (translated: ${isTranslated})`);

    return new Response(
      JSON.stringify({
        translatedMessage: translatedText,
        isTranslated,
        detectedLanguage,
        sourceLanguageCode: sourceNLLBCode,
        targetLanguageCode: targetNLLBCode,
        isIndianSource: isIndianLanguage(detectedLanguage),
        isIndianTarget: isIndianLanguage(targetLanguage),
        model: "nllb-200-distilled-600M",
        translationPair: `${detectedLanguage} → ${targetLanguage}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Translation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
