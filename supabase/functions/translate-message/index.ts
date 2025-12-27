/**
 * Translate Message Edge Function
 * Uses Lovable AI for translation between any languages
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Complete script detection for ALL world languages
const scriptPatterns = [
  // South Asian
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
  // East Asian
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: "chinese" },
  { regex: /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/, language: "japanese" },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: "korean" },
  // Southeast Asian
  { regex: /[\u0E00-\u0E7F]/, language: "thai" },
  { regex: /[\u0E80-\u0EFF]/, language: "lao" },
  { regex: /[\u1000-\u109F]/, language: "burmese" },
  { regex: /[\u1780-\u17FF]/, language: "khmer" },
  { regex: /[\u1A00-\u1A1F]/, language: "buginese" },
  { regex: /[\u1B00-\u1B7F]/, language: "balinese" },
  { regex: /[\u1980-\u19DF]/, language: "tai_lue" },
  { regex: /[\uA980-\uA9DF]/, language: "javanese" },
  // Middle Eastern
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, language: "arabic" },
  { regex: /[\u0590-\u05FF]/, language: "hebrew" },
  { regex: /[\u0700-\u074F]/, language: "syriac" },
  // Cyrillic (Eastern European)
  { regex: /[\u0400-\u04FF]/, language: "russian" },
  // Greek
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, language: "greek" },
  // Caucasian
  { regex: /[\u10A0-\u10FF]/, language: "georgian" },
  { regex: /[\u0530-\u058F]/, language: "armenian" },
  // African
  { regex: /[\u1200-\u137F\u1380-\u139F]/, language: "amharic" },
  { regex: /[\u2D30-\u2D7F]/, language: "tifinagh" },
  { regex: /[\uA6A0-\uA6FF]/, language: "bamum" },
  { regex: /[\u07C0-\u07FF]/, language: "nko" },
  // Indic Extended
  { regex: /[\u0F00-\u0FFF]/, language: "tibetan" },
  { regex: /[\u1900-\u194F]/, language: "limbu" },
  { regex: /[\u11800-\u1184F]/, language: "dogra" },
  { regex: /[\uA800-\uA82F]/, language: "syloti_nagri" },
  { regex: /[\u1C00-\u1C4F]/, language: "lepcha" },
  { regex: /[\u1C50-\u1C7F]/, language: "ol_chiki" },
  { regex: /[\uABC0-\uABFF]/, language: "meetei_mayek" },
  // Canadian Aboriginal
  { regex: /[\u1400-\u167F]/, language: "canadian_aboriginal" },
  // Cherokee
  { regex: /[\u13A0-\u13FF]/, language: "cherokee" },
  // Mongolian
  { regex: /[\u1800-\u18AF]/, language: "mongolian" },
];

// Language aliases for normalization
const languageAliases: Record<string, string> = {
  bangla: "bengali",
  oriya: "odia",
  farsi: "persian",
  mandarin: "chinese",
  cantonese: "chinese",
  taiwanese: "chinese",
  simplified_chinese: "chinese",
  traditional_chinese: "chinese",
  brazilian: "portuguese",
  mexican: "spanish",
  argentinian: "spanish",
  castilian: "spanish",
  flemish: "dutch",
  ukrainian: "russian",
  belarusian: "russian",
  serbian: "russian",
  bulgarian: "russian",
};

function detectLanguageFromText(text: string): { language: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: "english", isLatin: true };

  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.language, isLatin: false };
    }
  }

  // Check if Latin script (covers most European languages)
  const latinChars = trimmed.match(/[a-zA-ZÀ-ÿĀ-žƀ-ɏ]/g) || [];
  const totalChars = trimmed.replace(/\s/g, '').length;
  const isLatin = totalChars > 0 && latinChars.length / totalChars > 0.5;

  return { language: "english", isLatin };
}

function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim().replace(/[_-]/g, '_');
  return languageAliases[normalized] || normalized;
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      text, 
      message, // backward compatibility
      sourceLanguage, 
      targetLanguage,
      senderLanguage,
      receiverLanguage,
      mode = "translate" 
    } = body;

    const inputText = text || message;
    console.log(`[translate-message] Mode: ${mode}, Input length: ${inputText?.length}`);

    if (!inputText) {
      return new Response(
        JSON.stringify({ error: "Text or message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect source language
    const detected = detectLanguageFromText(inputText);
    const effectiveSource = sourceLanguage || senderLanguage || detected.language;
    const effectiveTarget = targetLanguage || receiverLanguage || "english";

    console.log(`[translate-message] Detected: ${detected.language}, Source: ${effectiveSource}, Target: ${effectiveTarget}`);

    // Same language - no translation needed
    if (isSameLanguage(effectiveSource, effectiveTarget)) {
      console.log('[translate-message] Same language, skipping translation');
      return new Response(
        JSON.stringify({
          translatedText: inputText,
          translatedMessage: inputText,
          originalText: inputText,
          isTranslated: false,
          detectedLanguage: detected.language,
          sourceLanguage: effectiveSource,
          targetLanguage: effectiveTarget,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI for translation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error('[translate-message] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({
          translatedText: inputText,
          translatedMessage: inputText,
          originalText: inputText,
          isTranslated: false,
          error: "Translation service not configured",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a professional translator. Translate the given text accurately while preserving the original meaning, tone, and context. 
- If the source is Latin/English text and target is a non-Latin language, provide the translation in the native script.
- Maintain proper grammar and natural phrasing in the target language.
- Do not add explanations, just provide the translation.`;

    const userPrompt = `Translate the following text from ${effectiveSource} to ${effectiveTarget}:

"${inputText}"

Provide only the translated text in ${effectiveTarget}, nothing else.`;

    console.log('[translate-message] Calling Lovable AI for translation...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[translate-message] AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({
          translatedText: inputText,
          translatedMessage: inputText,
          originalText: inputText,
          isTranslated: false,
          error: "Translation failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const translatedText = aiResponse.choices?.[0]?.message?.content?.trim() || inputText;

    console.log(`[translate-message] Translation complete: "${inputText.substring(0, 30)}..." -> "${translatedText.substring(0, 30)}..."`);

    return new Response(
      JSON.stringify({
        translatedText,
        translatedMessage: translatedText,
        originalText: inputText,
        isTranslated: translatedText !== inputText,
        detectedLanguage: detected.language,
        sourceLanguage: effectiveSource,
        targetLanguage: effectiveTarget,
        isSourceLatin: detected.isLatin,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[translate-message] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
