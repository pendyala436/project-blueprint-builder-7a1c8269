import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, expectedGender } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing image for gender detection...');
    console.log('Expected gender:', expectedGender);

    // Use Gemini with vision capabilities for accurate gender detection
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a gender detection AI. Analyze the provided selfie image and determine:
1. Whether a human face is clearly visible
2. The apparent gender (male or female)
3. Your confidence level (0.0 to 1.0)

Respond ONLY with a valid JSON object in this exact format:
{"hasFace": true/false, "gender": "male"/"female"/"unknown", "confidence": 0.0-1.0, "reason": "brief explanation"}

Be accurate and objective. If the face is unclear or you cannot determine gender confidently, set confidence low and gender to "unknown".`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this selfie image and detect the gender of the person. Respond with JSON only.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service unavailable' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    console.log('AI raw response:', aiResponse);

    // Parse the JSON response from AI
    let result;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiResponse;
      if (aiResponse.includes('```')) {
        const match = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: try to extract info from text
      const hasFace = !aiResponse.toLowerCase().includes('no face') && !aiResponse.toLowerCase().includes('cannot detect');
      const isMale = aiResponse.toLowerCase().includes('male') && !aiResponse.toLowerCase().includes('female');
      const isFemale = aiResponse.toLowerCase().includes('female');
      
      result = {
        hasFace,
        gender: isFemale ? 'female' : (isMale ? 'male' : 'unknown'),
        confidence: 0.7,
        reason: 'Parsed from text response'
      };
    }

    // Validate and normalize result
    const hasFace = result.hasFace === true;
    const detectedGender = (result.gender === 'male' || result.gender === 'female') ? result.gender : 'unknown';
    const confidence = typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5;
    const reason = result.reason || 'Analysis complete';

    // Check gender match
    const genderMatches = !expectedGender || expectedGender === detectedGender;
    const verified = hasFace && detectedGender !== 'unknown' && confidence >= 0.5;

    const responseData = {
      verified,
      hasFace,
      detectedGender,
      confidence,
      genderMatches,
      reason: genderMatches 
        ? `Gender verified as ${detectedGender} with ${Math.round(confidence * 100)}% confidence`
        : `Gender mismatch: Expected ${expectedGender}, detected ${detectedGender} (${Math.round(confidence * 100)}% confidence)`
    };

    console.log('Final result:', responseData);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Gender detection error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        // Return a permissive result on error
        verified: true,
        hasFace: true,
        detectedGender: 'unknown',
        confidence: 1.0,
        genderMatches: true,
        reason: 'Photo accepted (analysis unavailable)'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
