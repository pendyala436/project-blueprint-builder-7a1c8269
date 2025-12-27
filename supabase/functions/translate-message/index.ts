/**
 * Translate Message Edge Function
 * Fallback translation service - primary translation now happens in browser
 * Using @huggingface/transformers locally (FREE, no API calls)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  { regex: /[\u4E00-\u9FFF]/, language: "chinese" },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: "japanese" },
  { regex: /[\uAC00-\uD7AF]/, language: "korean" },
  { regex: /[\u0E00-\u0E7F]/, language: "thai" },
  { regex: /[\u0600-\u06FF]/, language: "arabic" },
  { regex: /[\u0590-\u05FF]/, language: "hebrew" },
  { regex: /[\u0400-\u04FF]/, language: "russian" },
];

function detectLanguageFromText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "english";

  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return pattern.language;
    }
  }

  return "english";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sourceLanguage, targetLanguage, mode = "translate" } = await req.json();

    console.log(`[translate-message] Mode: ${mode}, Source: ${sourceLanguage}, Target: ${targetLanguage}`);

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const detected = detectLanguageFromText(message);
    const effectiveSource = sourceLanguage || detected;
    const effectiveTarget = targetLanguage || "english";

    // Same language check
    if (effectiveSource.toLowerCase() === effectiveTarget.toLowerCase()) {
      return new Response(
        JSON.stringify({
          translatedMessage: message,
          convertedMessage: message,
          originalMessage: message,
          isTranslated: false,
          isConverted: false,
          detectedLanguage: detected,
          model: "same_language",
          usedPivot: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // NOTE: Translation now happens in browser using @huggingface/transformers (FREE)
    // This edge function is kept for backward compatibility but returns original text
    // Frontend handles actual translation with browser-based NLLB-200 model
    
    console.log('[translate-message] Browser-based translation active - returning passthrough');

    return new Response(
      JSON.stringify({
        translatedMessage: message,
        convertedMessage: message,
        originalMessage: message,
        isTranslated: false,
        isConverted: false,
        detectedLanguage: detected,
        sourceLanguage: effectiveSource,
        targetLanguage: effectiveTarget,
        model: "browser-nllb-200",
        usedPivot: false,
        note: "Translation handled by browser (FREE, no API costs)"
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
