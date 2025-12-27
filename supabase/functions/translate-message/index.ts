import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= LANGUAGE MAPPINGS =============

const languageNames: Record<string, string> = {
  // Indian Languages
  hindi: "Hindi", bengali: "Bengali", bangla: "Bengali", telugu: "Telugu",
  tamil: "Tamil", marathi: "Marathi", gujarati: "Gujarati", kannada: "Kannada",
  malayalam: "Malayalam", punjabi: "Punjabi", odia: "Odia", oriya: "Odia",
  assamese: "Assamese", nepali: "Nepali", urdu: "Urdu", konkani: "Konkani",
  maithili: "Maithili", santali: "Santali", bodo: "Bodo", dogri: "Dogri",
  kashmiri: "Kashmiri", sindhi: "Sindhi", manipuri: "Manipuri", sinhala: "Sinhala",
  bhojpuri: "Bhojpuri", magahi: "Magahi", chhattisgarhi: "Chhattisgarhi", awadhi: "Awadhi",
  
  // Major World Languages
  english: "English", spanish: "Spanish", french: "French", german: "German",
  portuguese: "Portuguese", italian: "Italian", dutch: "Dutch", russian: "Russian",
  polish: "Polish", ukrainian: "Ukrainian",
  
  // East Asian
  chinese: "Chinese (Simplified)", mandarin: "Chinese (Simplified)", 
  "simplified chinese": "Chinese (Simplified)", "traditional chinese": "Chinese (Traditional)",
  cantonese: "Cantonese", japanese: "Japanese", korean: "Korean",
  
  // Southeast Asian
  vietnamese: "Vietnamese", thai: "Thai", indonesian: "Indonesian", malay: "Malay",
  tagalog: "Tagalog", filipino: "Filipino", burmese: "Burmese", khmer: "Khmer",
  lao: "Lao", javanese: "Javanese", sundanese: "Sundanese", cebuano: "Cebuano",
  
  // Middle Eastern
  arabic: "Arabic", "standard arabic": "Arabic", "egyptian arabic": "Egyptian Arabic",
  persian: "Persian", farsi: "Persian", pashto: "Pashto", dari: "Dari",
  turkish: "Turkish", hebrew: "Hebrew", kurdish: "Kurdish",
  
  // African
  swahili: "Swahili", amharic: "Amharic", yoruba: "Yoruba", igbo: "Igbo",
  hausa: "Hausa", zulu: "Zulu", xhosa: "Xhosa", afrikaans: "Afrikaans",
  somali: "Somali", tigrinya: "Tigrinya", oromo: "Oromo", shona: "Shona",
  wolof: "Wolof", lingala: "Lingala", kinyarwanda: "Kinyarwanda",
  
  // European
  greek: "Greek", czech: "Czech", romanian: "Romanian", hungarian: "Hungarian",
  swedish: "Swedish", danish: "Danish", finnish: "Finnish", norwegian: "Norwegian",
  icelandic: "Icelandic", catalan: "Catalan", croatian: "Croatian", serbian: "Serbian",
  bosnian: "Bosnian", slovak: "Slovak", slovenian: "Slovenian", bulgarian: "Bulgarian",
  lithuanian: "Lithuanian", latvian: "Latvian", estonian: "Estonian", albanian: "Albanian",
  maltese: "Maltese", irish: "Irish", welsh: "Welsh", belarusian: "Belarusian",
  
  // Central Asian
  georgian: "Georgian", armenian: "Armenian", azerbaijani: "Azerbaijani", kazakh: "Kazakh",
  uzbek: "Uzbek", turkmen: "Turkmen", kyrgyz: "Kyrgyz", tajik: "Tajik",
  mongolian: "Mongolian", tibetan: "Tibetan", uyghur: "Uyghur",
  
  // Pacific & Others
  samoan: "Samoan", tongan: "Tongan", fijian: "Fijian", maori: "Maori",
  "haitian creole": "Haitian Creole", quechua: "Quechua", guarani: "Guarani",
  esperanto: "Esperanto", latin: "Latin", sanskrit: "Sanskrit",
};

// Script detection patterns
const scriptPatterns = [
  { regex: /[\u0900-\u097F]/, language: "hindi" },
  { regex: /[\u0980-\u09FF]/, language: "bengali" },
  { regex: /[\u0C00-\u0C7F]/, language: "telugu" },
  { regex: /[\u0B80-\u0BFF]/, language: "tamil" },
  { regex: /[\u0A80-\u0AFF]/, language: "gujarati" },
  { regex: /[\u0C80-\u0CFF]/, language: "kannada" },
  { regex: /[\u0D00-\u0D7F]/, language: "malayalam" },
  { regex: /[\u0A00-\u0A7F]/, language: "punjabi" },
  { regex: /[\u0B00-\u0B7F]/, language: "odia" },
  { regex: /[\u0D80-\u0DFF]/, language: "sinhala" },
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: "chinese" },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: "japanese" },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: "korean" },
  { regex: /[\u0E00-\u0E7F]/, language: "thai" },
  { regex: /[\u1000-\u109F]/, language: "burmese" },
  { regex: /[\u1780-\u17FF]/, language: "khmer" },
  { regex: /[\u0E80-\u0EFF]/, language: "lao" },
  { regex: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, language: "arabic" },
  { regex: /[\u0590-\u05FF\uFB1D-\uFB4F]/, language: "hebrew" },
  { regex: /[\u0400-\u04FF]/, language: "russian" },
  { regex: /[\u10A0-\u10FF]/, language: "georgian" },
  { regex: /[\u0530-\u058F]/, language: "armenian" },
  { regex: /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/, language: "amharic" },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, language: "greek" },
  { regex: /[\u0F00-\u0FFF]/, language: "tibetan" },
];

// ============= UTILITY FUNCTIONS =============

function getLanguageName(language: string): string {
  if (!language) return "English";
  return languageNames[language.toLowerCase().trim()] || language;
}

function detectLanguageFromText(text: string): { language: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: "english", isLatin: true };

  // Check script patterns
  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.language, isLatin: false };
    }
  }

  // Check Vietnamese diacritics
  if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(trimmed)) {
    return { language: "vietnamese", isLatin: true };
  }

  // Check European diacritics
  if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(trimmed)) {
    if (/[ñ¿¡]/i.test(trimmed)) return { language: "spanish", isLatin: true };
    if (/[ç]/i.test(trimmed) && /[ã|õ]/i.test(trimmed)) return { language: "portuguese", isLatin: true };
    if (/[éèêë]/i.test(trimmed) && /[çà]/i.test(trimmed)) return { language: "french", isLatin: true };
    if (/[äöüß]/i.test(trimmed)) return { language: "german", isLatin: true };
  }

  return { language: "english", isLatin: true };
}

function isLatinScript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const latinChars = trimmed.match(/[a-zA-Z]/g);
  const totalChars = trimmed.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  if (!latinChars || !totalChars.length) return true;
  return (latinChars.length / totalChars.length) > 0.8;
}

// ============= OPENAI TRANSLATION ENGINE =============

async function translateWithOpenAI(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string,
  mode: string = "translate"
): Promise<{ translatedText: string; success: boolean }> {
  try {
    const sourceDisplay = getLanguageName(sourceLang);
    const targetDisplay = getLanguageName(targetLang);
    
    let systemPrompt: string;
    let userPrompt: string;
    
    if (mode === "convert") {
      // Romanized text to native script conversion
      systemPrompt = `You are a transliteration expert. Convert romanized/Latin text to the native script of ${targetDisplay}. 
Only output the converted text in native script. Do not translate the meaning, just convert the script.
For example: "namaste" → "नमस्ते" (if target is Hindi), "bagunnava" → "బాగున్నావా" (if target is Telugu).`;
      userPrompt = `Convert this romanized text to ${targetDisplay} native script: "${text}"`;
    } else {
      // Full translation
      systemPrompt = `You are a professional translator. Translate text from ${sourceDisplay} to ${targetDisplay}.
- Output ONLY the translation, nothing else
- Preserve the meaning and tone
- Use native script for the target language (e.g., देवनागरी for Hindi, తెలుగు for Telugu)
- If input is romanized (Latin script) but represents a non-Latin language, understand the meaning and translate appropriately`;
      userPrompt = `Translate to ${targetDisplay}: "${text}"`;
    }

    console.log(`[OpenAI] ${mode}: ${sourceLang} → ${targetLang}: "${text.substring(0, 50)}..."`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OpenAI] API error:", response.status, errorText);
      return { translatedText: text, success: false };
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();
    
    if (!translatedText) {
      console.error("[OpenAI] Empty response");
      return { translatedText: text, success: false };
    }

    console.log(`[OpenAI] Success: "${translatedText.substring(0, 50)}..."`);
    return { translatedText, success: true };
  } catch (error) {
    console.error("[OpenAI] Error:", error);
    return { translatedText: text, success: false };
  }
}

// ============= HTTP SERVER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sourceLanguage, targetLanguage, mode = "translate" } = await req.json();

    console.log(`[REQUEST] source="${sourceLanguage}", target="${targetLanguage}", mode="${mode}"`);

    if (!message || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Message and target language are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("[ERROR] OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          error: "Translation service not configured (missing OPENAI_API_KEY)"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const detected = detectLanguageFromText(message);
    const effectiveSource = sourceLanguage || detected.language;

    // Same language check
    if (effectiveSource.toLowerCase() === targetLanguage.toLowerCase()) {
      return new Response(
        JSON.stringify({
          translatedMessage: message,
          originalMessage: message,
          isTranslated: false,
          model: "none",
          sourceLanguage: effectiveSource,
          targetLanguage,
          usedPivot: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= CONVERSION MODE =============
    if (mode === "convert") {
      const result = await translateWithOpenAI(message, "english", targetLanguage, OPENAI_API_KEY, "convert");
      
      return new Response(
        JSON.stringify({
          translatedMessage: result.translatedText,
          convertedMessage: result.translatedText,
          originalMessage: message,
          isTranslated: result.success,
          isConverted: result.success && result.translatedText !== message,
          detectedLanguage: "english",
          model: "gpt-4o-mini",
          usedPivot: false,
          mode: "convert",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= TRANSLATION MODE =============
    const result = await translateWithOpenAI(message, effectiveSource, targetLanguage, OPENAI_API_KEY, "translate");
    
    return new Response(
      JSON.stringify({
        translatedMessage: result.translatedText,
        originalMessage: message,
        isTranslated: result.success,
        isConverted: false,
        detectedLanguage: detected.language,
        sourceLanguage: effectiveSource,
        targetLanguage,
        model: "gpt-4o-mini",
        usedPivot: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : "Translation failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
