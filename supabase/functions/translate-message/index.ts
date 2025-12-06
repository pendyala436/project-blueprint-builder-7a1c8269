import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, targetLanguage } = await req.json();

    if (!message || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Message and target language are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          detectedLanguage: "unknown"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI for auto-detection and translation (NLLB-200 style)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a NLLB-200 style multilingual translator. Your task:
1. Auto-detect the source language of the input message
2. Translate it to ${targetLanguage}
3. Return ONLY a JSON object with this exact format (no markdown, no code blocks):
{"detectedLanguage": "detected language name", "translatedMessage": "translated text"}

Important rules:
- If the message is already in ${targetLanguage}, return the original message as translatedMessage
- Keep emojis, names, and special characters intact
- Preserve the tone and meaning
- Common language names: English, Hindi, Spanish, French, German, Chinese, Japanese, Arabic, Bengali, Portuguese, Russian, Telugu, Tamil, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu`
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.2,
        max_tokens: 600
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log("Rate limited, returning original message");
        return new Response(
          JSON.stringify({ 
            translatedMessage: message, 
            isTranslated: false,
            detectedLanguage: "unknown"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.log("Payment required, returning original message");
        return new Response(
          JSON.stringify({ 
            translatedMessage: message, 
            isTranslated: false,
            detectedLanguage: "unknown"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Translation API error:", response.status);
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          detectedLanguage: "unknown"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    console.log("AI Response:", content);

    // Parse the JSON response
    let result = {
      translatedMessage: message,
      detectedLanguage: "unknown",
      isTranslated: false
    };

    try {
      // Clean the response - remove any markdown code blocks if present
      let cleanContent = content;
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/```json?\n?/g, "").replace(/```/g, "");
      }
      cleanContent = cleanContent.trim();

      const parsed = JSON.parse(cleanContent);
      result.translatedMessage = parsed.translatedMessage || message;
      result.detectedLanguage = parsed.detectedLanguage || "unknown";
      
      // Check if translation actually happened (different from source or target language differs)
      result.isTranslated = result.detectedLanguage.toLowerCase() !== targetLanguage.toLowerCase() &&
                           result.translatedMessage !== message;
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // If parsing fails, use the raw content as translation
      result.translatedMessage = content || message;
    }

    console.log(`Detected: ${result.detectedLanguage}, Translated to ${targetLanguage}: "${result.translatedMessage}"`);

    return new Response(
      JSON.stringify(result),
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
