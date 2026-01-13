import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language } = await req.json();
    
    if (!text || !language) {
      return new Response(
        JSON.stringify({ error: "Missing text or language" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip spell check for very short text or non-Latin
    if (text.length < 3 || !/^[a-zA-Z\s]+$/.test(text)) {
      return new Response(
        JSON.stringify({ corrected: text, wasChanged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ corrected: text, wasChanged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a phonetic spell checker for ${language} language.
The user types in Latin/English letters which will be transliterated to ${language} script.
Your job is to correct common phonetic spelling mistakes.

Rules:
1. Only fix obvious typos (missing letters, swapped letters, double letters)
2. Preserve the phonetic intent - don't change the meaning
3. Return ONLY the corrected text, nothing else
4. If no correction needed, return the original text exactly
5. Keep spaces and punctuation as-is
6. Don't add any explanation or quotes

Examples for Hindi:
- "namste" → "namaste"
- "kaise ho" → "kaise ho" (already correct)
- "mera nam" → "mera naam"
- "bahut acha" → "bahut accha"

Examples for Telugu:
- "ela unnav" → "ela unnav" (correct)
- "bagunnava" → "bagunnava" (correct)
- "nenu" → "nenu" (correct)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        max_tokens: 100,
        temperature: 0.1, // Low temperature for consistent corrections
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ corrected: text, wasChanged: false, error: "Rate limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ corrected: text, wasChanged: false, error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ corrected: text, wasChanged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content?.trim() || text;
    
    // Validate the correction - should be similar length and only Latin chars
    const isValid = corrected.length > 0 && 
                    corrected.length < text.length * 2 &&
                    /^[a-zA-Z\s.,!?'"()\-:;]+$/.test(corrected);
    
    const finalCorrected = isValid ? corrected : text;
    const wasChanged = finalCorrected.toLowerCase() !== text.toLowerCase();

    console.log(`[spell-check] "${text}" → "${finalCorrected}" (changed: ${wasChanged})`);

    return new Response(
      JSON.stringify({ 
        corrected: finalCorrected, 
        wasChanged,
        original: text 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Spell check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
