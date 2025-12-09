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
    const { imageBase64, expectedGender } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting AI verification for gender:', expectedGender);

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
            content: `You are a photo verification assistant. Analyze the provided photo and determine:
1. Whether it contains a clear human face
2. The perceived gender presentation of the person (male, female, or non-binary/ambiguous)

Respond ONLY with valid JSON in this exact format:
{
  "hasFace": true/false,
  "detectedGender": "male" | "female" | "non-binary",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this profile photo. The user has indicated their gender as: ${expectedGender || 'not specified'}. Verify if there's a clear face visible and assess the gender presentation.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
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
      
      // For 402 (credits exhausted) or 429 (rate limit), auto-accept the photo
      if (response.status === 402 || response.status === 429) {
        console.log('AI service unavailable, auto-accepting photo');
        return new Response(
          JSON.stringify({
            verified: true,
            hasFace: true,
            detectedGender: expectedGender || 'unknown',
            confidence: 1.0,
            reason: 'Auto-accepted (AI service temporarily unavailable)',
            genderMatches: true,
            autoAccepted: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For other errors, also auto-accept to not block registration
      return new Response(
        JSON.stringify({
          verified: true,
          hasFace: true,
          detectedGender: expectedGender || 'unknown',
          confidence: 1.0,
          reason: 'Auto-accepted (verification service error)',
          genderMatches: true,
          autoAccepted: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    let result;
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = {
        hasFace: true,
        detectedGender: 'non-binary',
        confidence: 0.5,
        reason: 'Could not determine with certainty'
      };
    }

    // Determine verification status
    const isVerified = result.hasFace && result.confidence >= 0.6;
    const genderMatches = expectedGender 
      ? result.detectedGender === expectedGender || expectedGender === 'prefer-not-to-say' || expectedGender === 'non-binary'
      : true;

    console.log('Verification result:', { isVerified, genderMatches, result });

    return new Response(
      JSON.stringify({
        verified: isVerified && genderMatches,
        hasFace: result.hasFace,
        detectedGender: result.detectedGender,
        confidence: result.confidence,
        reason: result.reason,
        genderMatches
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Verification error:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
