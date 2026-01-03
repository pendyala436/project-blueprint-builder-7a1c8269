/**
 * DL-Translate Edge Function - Lovable AI Translation
 * 
 * Uses Lovable AI Gateway (Gemini) for high-quality neural translation.
 * No external HuggingFace dependency - all local/Lovable AI.
 * 
 * Supports 200+ languages with automatic language detection.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Language name normalization
const LANGUAGE_ALIASES: Record<string, string> = {
  bangla: 'bengali', oriya: 'odia', farsi: 'persian', mandarin: 'chinese',
  en: 'english', hi: 'hindi', te: 'telugu', ta: 'tamil', bn: 'bengali',
  mr: 'marathi', gu: 'gujarati', kn: 'kannada', ml: 'malayalam', pa: 'punjabi',
  or: 'odia', ur: 'urdu', zh: 'chinese', ja: 'japanese', ko: 'korean',
  ar: 'arabic', fa: 'persian', ru: 'russian', es: 'spanish', fr: 'french',
  de: 'german', it: 'italian', pt: 'portuguese', nl: 'dutch', pl: 'polish',
  tr: 'turkish', sv: 'swedish', da: 'danish', no: 'norwegian', fi: 'finnish',
  cs: 'czech', ro: 'romanian', hu: 'hungarian', bg: 'bulgarian', hr: 'croatian',
  sr: 'serbian', sk: 'slovak', sl: 'slovenian', lt: 'lithuanian', lv: 'latvian',
  et: 'estonian', ka: 'georgian', hy: 'armenian', sw: 'swahili', am: 'amharic',
  th: 'thai', vi: 'vietnamese', id: 'indonesian', ms: 'malay', tl: 'tagalog',
  my: 'burmese', km: 'khmer', lo: 'lao', ne: 'nepali', si: 'sinhala',
  as: 'assamese', el: 'greek', uk: 'ukrainian', he: 'hebrew',
};

function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

// Translate using Lovable AI Gateway
async function translateWithLovableAI(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<string | null> {
  console.log(`[dl-translate] Using Lovable AI: ${sourceLang} -> ${targetLang}`);
  
  try {
    const systemPrompt = `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. 
Rules:
1. Provide ONLY the translated text, nothing else
2. Preserve the original meaning, tone, and style
3. Use natural, fluent ${targetLang}
4. Do not add explanations, notes, or alternatives
5. If the text contains names or proper nouns, keep them as-is or transliterate appropriately
6. Maintain any formatting (line breaks, punctuation) from the original`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[dl-translate] Lovable AI error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        console.log("[dl-translate] Rate limited, returning original text");
        return null;
      }
      if (response.status === 402) {
        console.log("[dl-translate] Payment required");
        return null;
      }
      
      return null;
    }

    const result = await response.json();
    const translatedText = result.choices?.[0]?.message?.content?.trim();
    
    if (translatedText) {
      console.log(`[dl-translate] Lovable AI success: "${translatedText.slice(0, 50)}..."`);
      return translatedText;
    }
    
    return null;
  } catch (error) {
    console.error("[dl-translate] Lovable AI exception:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLanguage, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: text, targetLanguage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[dl-translate] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Translation service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceLang = normalizeLanguage(sourceLanguage || 'english');
    const targetLang = normalizeLanguage(targetLanguage);
    
    console.log(`[dl-translate] Request: "${text.slice(0, 50)}..." from ${sourceLang} to ${targetLang}`);

    // Same language - no translation needed
    if (sourceLang === targetLang) {
      console.log("[dl-translate] Same language, returning original");
      return new Response(
        JSON.stringify({
          translatedText: text,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          isTranslated: false,
          mode: 'same_language',
          model: null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Translate using Lovable AI
    const translatedText = await translateWithLovableAI(text, sourceLang, targetLang, LOVABLE_API_KEY);

    if (!translatedText) {
      console.error("[dl-translate] Translation failed");
      return new Response(
        JSON.stringify({
          translatedText: text,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          isTranslated: false,
          mode: 'failed',
          model: null,
          error: 'Translation failed'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[dl-translate] Final result: "${translatedText.slice(0, 50)}..."`);

    return new Response(
      JSON.stringify({
        translatedText,
        originalText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        isTranslated: translatedText !== text,
        mode: 'translate',
        model: 'lovable-ai'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[dl-translate] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Translation failed",
        translatedText: null
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
