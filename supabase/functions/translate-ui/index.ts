import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLanguage, sourceLanguage = 'English' } = await req.json();
    
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(JSON.stringify({ error: 'texts array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!targetLanguage) {
      return new Response(JSON.stringify({ error: 'targetLanguage is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If target language is same as source, return original texts
    if (targetLanguage.toLowerCase() === sourceLanguage.toLowerCase() || 
        targetLanguage.toLowerCase() === 'english') {
      return new Response(JSON.stringify({ translations: texts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI translation not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a numbered list of texts for batch translation
    const numberedTexts = texts.map((text, i) => `${i + 1}. ${text}`).join('\n');

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
            content: `You are a professional translator. Translate the following UI texts from ${sourceLanguage} to ${targetLanguage}. 
Keep the translations natural and appropriate for a mobile/web app interface.
Maintain the same meaning and tone.
Return ONLY the translations in the same numbered format, nothing else.
Do not add any explanations or notes.`
          },
          {
            role: "user",
            content: numberedTexts
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Translation failed" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const translatedContent = data.choices?.[0]?.message?.content || '';

    // Parse the numbered translations back into an array
    const lines = translatedContent.split('\n').filter((line: string) => line.trim());
    const translations: string[] = [];

    for (let i = 0; i < texts.length; i++) {
      const linePattern = new RegExp(`^${i + 1}\\.\\s*(.*)$`);
      const matchingLine = lines.find((line: string) => linePattern.test(line.trim()));
      
      if (matchingLine) {
        const match = matchingLine.trim().match(linePattern);
        translations.push(match ? match[1].trim() : texts[i]);
      } else if (lines[i]) {
        // Fallback: use line by index and remove any numbering
        const cleanLine = lines[i].replace(/^\d+\.\s*/, '').trim();
        translations.push(cleanLine || texts[i]);
      } else {
        translations.push(texts[i]);
      }
    }

    console.log(`Translated ${texts.length} texts to ${targetLanguage}`);

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error("Error in translate-ui function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
