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
    const { message, sourceLanguage, targetLanguage } = await req.json();

    if (!message || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Message and target language are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If source and target are the same, return original
    if (sourceLanguage === targetLanguage) {
      return new Response(
        JSON.stringify({ translatedMessage: message, isTranslated: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ translatedMessage: message, isTranslated: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI for translation (NLLB-200 style translation via Lovable AI)
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
            content: `You are a precise translator. Translate the user's message from ${sourceLanguage || "auto-detect"} to ${targetLanguage}. 
            Only respond with the translated text, nothing else. Keep the same tone and meaning.
            If the text cannot be translated or is already in the target language, return the original text.`
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log("Rate limited, returning original message");
        return new Response(
          JSON.stringify({ translatedMessage: message, isTranslated: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Translation API error:", response.status);
      return new Response(
        JSON.stringify({ translatedMessage: message, isTranslated: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const translatedMessage = data.choices?.[0]?.message?.content?.trim() || message;

    console.log(`Translated "${message}" to "${translatedMessage}"`);

    return new Response(
      JSON.stringify({ 
        translatedMessage, 
        isTranslated: translatedMessage !== message 
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
