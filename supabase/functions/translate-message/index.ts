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

// Script detection patterns for language detection
const scriptPatterns = [
  { regex: /[\u0900-\u097F]/, language: "hindi", native: "हिंदी" },
  { regex: /[\u0980-\u09FF]/, language: "bengali", native: "বাংলা" },
  { regex: /[\u0C00-\u0C7F]/, language: "telugu", native: "తెలుగు" },
  { regex: /[\u0B80-\u0BFF]/, language: "tamil", native: "தமிழ்" },
  { regex: /[\u0A80-\u0AFF]/, language: "gujarati", native: "ગુજરાતી" },
  { regex: /[\u0C80-\u0CFF]/, language: "kannada", native: "ಕನ್ನಡ" },
  { regex: /[\u0D00-\u0D7F]/, language: "malayalam", native: "മലയാളം" },
  { regex: /[\u0A00-\u0A7F]/, language: "punjabi", native: "ਪੰਜਾਬੀ" },
  { regex: /[\u0B00-\u0B7F]/, language: "odia", native: "ଓଡ଼ିଆ" },
  { regex: /[\u4E00-\u9FFF]/, language: "chinese", native: "中文" },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: "japanese", native: "日本語" },
  { regex: /[\uAC00-\uD7AF]/, language: "korean", native: "한국어" },
  { regex: /[\u0E00-\u0E7F]/, language: "thai", native: "ไทย" },
  { regex: /[\u0600-\u06FF]/, language: "arabic", native: "العربية" },
  { regex: /[\u0590-\u05FF]/, language: "hebrew", native: "עברית" },
  { regex: /[\u0400-\u04FF]/, language: "russian", native: "Русский" },
  { regex: /[\u0D80-\u0DFF]/, language: "sinhala", native: "සිංහල" },
  { regex: /[\u1000-\u109F]/, language: "burmese", native: "မြန်မာ" },
  { regex: /[\u1780-\u17FF]/, language: "khmer", native: "ខ្មែរ" },
  { regex: /[\u0370-\u03FF]/, language: "greek", native: "Ελληνικά" },
  { regex: /[\u10A0-\u10FF]/, language: "georgian", native: "ქართული" },
  { regex: /[\u0530-\u058F]/, language: "armenian", native: "Հայերdelays" },
  { regex: /[\u1200-\u137F]/, language: "amharic", native: "አማርኛ" },
];

function detectLanguageFromText(text: string): { language: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: "english", isLatin: true };

  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.language, isLatin: false };
    }
  }

  // Check if Latin script
  const latinChars = trimmed.match(/[a-zA-Z]/g) || [];
  const isLatin = latinChars.length / trimmed.replace(/\s/g, '').length > 0.5;

  return { language: "english", isLatin };
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  const normalize = (l: string) => l.toLowerCase().trim();
  const aliases: Record<string, string> = {
    bangla: "bengali",
    oriya: "odia",
    farsi: "persian",
    mandarin: "chinese",
  };
  const n1 = aliases[normalize(lang1)] || normalize(lang1);
  const n2 = aliases[normalize(lang2)] || normalize(lang2);
  return n1 === n2;
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
