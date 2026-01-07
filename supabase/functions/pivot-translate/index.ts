import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Argos Translate API endpoint (open-source, no API key required)
const ARGOS_API_URL = "https://translate.argosopentech.com/translate";

// All 70 supported languages with Argos language codes
// Format: { code: argosCode } - Argos uses ISO 639-1 codes
const LANGUAGE_CODES: Record<string, string> = {
  // 12 Indian Languages
  'hi': 'hi',  // Hindi
  'bn': 'bn',  // Bengali
  'te': 'te',  // Telugu (fallback to hi if not supported)
  'mr': 'mr',  // Marathi (fallback to hi if not supported)
  'ta': 'ta',  // Tamil
  'ur': 'ur',  // Urdu
  'gu': 'gu',  // Gujarati
  'kn': 'kn',  // Kannada
  'or': 'or',  // Odia
  'pa': 'pa',  // Punjabi
  'ml': 'ml',  // Malayalam
  'as': 'as',  // Assamese
  
  // World Languages (most commonly supported by Argos)
  'en': 'en',  // English
  'zh': 'zh',  // Chinese
  'es': 'es',  // Spanish
  'pt': 'pt',  // Portuguese
  'ru': 'ru',  // Russian
  'ja': 'ja',  // Japanese
  'vi': 'vi',  // Vietnamese
  'tr': 'tr',  // Turkish
  'ko': 'ko',  // Korean
  'fr': 'fr',  // French
  'de': 'de',  // German
  'it': 'it',  // Italian
  'ar': 'ar',  // Arabic
  'fa': 'fa',  // Persian
  'pl': 'pl',  // Polish
  'uk': 'uk',  // Ukrainian
  'ro': 'ro',  // Romanian
  'nl': 'nl',  // Dutch
  'th': 'th',  // Thai
  'id': 'id',  // Indonesian
  'ms': 'ms',  // Malay
  'tl': 'tl',  // Filipino/Tagalog
  'sw': 'sw',  // Swahili
  'am': 'am',  // Amharic
  'ha': 'ha',  // Hausa
  'yo': 'yo',  // Yoruba
  'ig': 'ig',  // Igbo
  'zu': 'zu',  // Zulu
  'xh': 'xh',  // Xhosa
  'af': 'af',  // Afrikaans
  'he': 'he',  // Hebrew
  'el': 'el',  // Greek
  'hu': 'hu',  // Hungarian
  'cs': 'cs',  // Czech
  'sk': 'sk',  // Slovak
  'bg': 'bg',  // Bulgarian
  'sr': 'sr',  // Serbian
  'hr': 'hr',  // Croatian
  'sl': 'sl',  // Slovenian
  'mk': 'mk',  // Macedonian
  'sq': 'sq',  // Albanian
  'bs': 'bs',  // Bosnian
  'et': 'et',  // Estonian
  'lv': 'lv',  // Latvian
  'lt': 'lt',  // Lithuanian
  'fi': 'fi',  // Finnish
  'sv': 'sv',  // Swedish
  'no': 'no',  // Norwegian
  'da': 'da',  // Danish
  'is': 'is',  // Icelandic
  'ga': 'ga',  // Irish
  'cy': 'cy',  // Welsh
  'eu': 'eu',  // Basque
  'ca': 'ca',  // Catalan
  'gl': 'gl',  // Galician
  'my': 'my',  // Burmese
  'km': 'km',  // Khmer
  'lo': 'lo',  // Lao
};

// Get Argos language code
function getArgosCode(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_CODES[normalized] || normalized;
}

// Translate using Argos Translate API
async function translateWithArgos(
  text: string,
  sourceCode: string,
  targetCode: string
): Promise<{ translatedText: string; success: boolean; error?: string }> {
  try {
    console.log(`[Argos] Translating: "${text.substring(0, 50)}..." from ${sourceCode} to ${targetCode}`);
    
    const response = await fetch(ARGOS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceCode,
        target: targetCode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Argos] API error: ${response.status} - ${errorText}`);
      return { translatedText: text, success: false, error: `API error: ${response.status}` };
    }

    const result = await response.json();
    console.log(`[Argos] Translation result:`, result);
    
    if (result.translatedText) {
      return { translatedText: result.translatedText, success: true };
    }
    
    return { translatedText: text, success: false, error: 'No translation returned' };
  } catch (error) {
    console.error(`[Argos] Translation error:`, error);
    return { translatedText: text, success: false, error: String(error) };
  }
}

// Pivot translation: Source → English → Target (bidirectional)
async function pivotTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{
  translatedText: string;
  englishIntermediate?: string;
  sourceToEnglishSuccess: boolean;
  englishToTargetSuccess: boolean;
  method: 'direct' | 'pivot';
}> {
  const sourceCode = getArgosCode(sourceLang);
  const targetCode = getArgosCode(targetLang);
  
  console.log(`[Pivot] Translating from ${sourceCode} to ${targetCode}`);
  
  // If source is English, translate directly to target
  if (sourceCode === 'en') {
    const result = await translateWithArgos(text, 'en', targetCode);
    return {
      translatedText: result.translatedText,
      sourceToEnglishSuccess: true,
      englishToTargetSuccess: result.success,
      method: 'direct',
    };
  }
  
  // If target is English, translate directly from source
  if (targetCode === 'en') {
    const result = await translateWithArgos(text, sourceCode, 'en');
    return {
      translatedText: result.translatedText,
      englishIntermediate: result.translatedText,
      sourceToEnglishSuccess: result.success,
      englishToTargetSuccess: true,
      method: 'direct',
    };
  }
  
  // Pivot translation: Source → English → Target
  // Step 1: Source to English
  const toEnglishResult = await translateWithArgos(text, sourceCode, 'en');
  
  if (!toEnglishResult.success) {
    console.log(`[Pivot] Source to English failed, returning original`);
    return {
      translatedText: text,
      sourceToEnglishSuccess: false,
      englishToTargetSuccess: false,
      method: 'pivot',
    };
  }
  
  const englishText = toEnglishResult.translatedText;
  console.log(`[Pivot] English intermediate: "${englishText.substring(0, 50)}..."`);
  
  // Step 2: English to Target
  const toTargetResult = await translateWithArgos(englishText, 'en', targetCode);
  
  return {
    translatedText: toTargetResult.translatedText,
    englishIntermediate: englishText,
    sourceToEnglishSuccess: true,
    englishToTargetSuccess: toTargetResult.success,
    method: 'pivot',
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      text, 
      sourceLang, 
      targetLang,
      // Bidirectional support
      direction = 'forward' // 'forward' = source→target, 'reverse' = target→source
    } = await req.json();

    // Validate input
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required', translatedText: '' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: 'Source and target languages are required', translatedText: text }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine actual source and target based on direction
    const actualSource = direction === 'reverse' ? targetLang : sourceLang;
    const actualTarget = direction === 'reverse' ? sourceLang : targetLang;

    console.log(`[Request] Direction: ${direction}, Source: ${actualSource}, Target: ${actualTarget}`);
    console.log(`[Request] Text: "${text.substring(0, 100)}..."`);

    // Same language - no translation needed
    if (getArgosCode(actualSource) === getArgosCode(actualTarget)) {
      return new Response(
        JSON.stringify({
          translatedText: text,
          originalText: text,
          sourceLang: actualSource,
          targetLang: actualTarget,
          direction,
          method: 'same_language',
          isTranslated: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform pivot translation
    const result = await pivotTranslate(text, actualSource, actualTarget);

    return new Response(
      JSON.stringify({
        translatedText: result.translatedText,
        originalText: text,
        sourceLang: actualSource,
        targetLang: actualTarget,
        direction,
        englishIntermediate: result.englishIntermediate,
        method: result.method,
        sourceToEnglishSuccess: result.sourceToEnglishSuccess,
        englishToTargetSuccess: result.englishToTargetSuccess,
        isTranslated: result.sourceToEnglishSuccess && result.englishToTargetSuccess,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Error]', error);
    return new Response(
      JSON.stringify({ 
        error: String(error), 
        translatedText: '',
        isTranslated: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
