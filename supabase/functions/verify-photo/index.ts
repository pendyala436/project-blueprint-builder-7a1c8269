import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationRequest {
  imageBase64: string;
  expectedGender?: string;
  userId?: string;
  verificationType?: 'registration' | 'profile';
}

interface VerificationResult {
  verified: boolean;
  hasFace: boolean;
  detectedGender: 'male' | 'female' | 'non-binary' | 'unknown';
  confidence: number;
  reason: string;
  genderMatches: boolean;
  autoAccepted?: boolean;
  faceCount?: number;
  faceQuality?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, expectedGender, userId, verificationType } = await req.json() as VerificationRequest;
    
    if (!imageBase64) {
      console.error('No image provided in request');
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

    console.log('Starting AI gender verification:', {
      expectedGender,
      userId: userId ? 'provided' : 'not provided',
      verificationType,
      imageSize: imageBase64.length
    });

    // Enhanced AI prompt for accurate gender classification
    const systemPrompt = `You are an advanced face verification and gender classification AI system. Your task is to analyze profile photos with high accuracy.

ANALYSIS STEPS:
1. FACE DETECTION: First, detect if there is a clear human face in the image
   - Check for presence of facial features (eyes, nose, mouth)
   - Assess if the face is clearly visible and not obscured
   - Count the number of faces detected

2. FACE QUALITY ASSESSMENT:
   - Evaluate lighting quality (good, moderate, poor)
   - Check if face is centered and properly framed
   - Assess image clarity/resolution

3. GENDER CLASSIFICATION:
   - Analyze facial structure and features
   - Consider multiple indicators: jawline, brow ridge, facial proportions
   - Classify as: male, female, or non-binary/ambiguous
   - Provide confidence score (0.0 to 1.0)

IMPORTANT RULES:
- Be accurate but not overly strict - this is for user verification
- If uncertain, lean towards the expected gender if face is clearly visible
- Consider that makeup, hairstyles, and lighting can affect appearance
- Flag photos that appear to be: cartoons, celebrities, AI-generated, or stock photos

Respond ONLY with valid JSON in this exact format:
{
  "hasFace": true/false,
  "faceCount": number,
  "faceQuality": "good" | "moderate" | "poor",
  "detectedGender": "male" | "female" | "non-binary",
  "confidence": 0.0-1.0,
  "isRealPhoto": true/false,
  "reason": "brief explanation of the analysis"
}`;

    const userPrompt = `Analyze this profile photo for face verification and gender classification.
${expectedGender ? `The user has indicated their gender as: ${expectedGender}` : 'No expected gender specified.'}

Please verify:
1. Is there a clear, real human face visible?
2. What is the detected gender based on facial features?
3. How confident are you in the gender classification?
4. Is this a genuine selfie/photo (not AI-generated, cartoon, or stock photo)?`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
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
      
      // Auto-accept on service errors to not block registration
      if (response.status === 402 || response.status === 429) {
        console.log('AI service unavailable (rate limit/credits), auto-accepting photo');
        const autoResult = createAutoAcceptResult(expectedGender, 'AI service temporarily unavailable');
        await saveVerificationResult(userId, expectedGender, autoResult);
        return new Response(JSON.stringify(autoResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const autoResult = createAutoAcceptResult(expectedGender, 'Verification service error');
      await saveVerificationResult(userId, expectedGender, autoResult);
      return new Response(JSON.stringify(autoResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI raw response:', content);

    let aiResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      aiResult = {
        hasFace: true,
        faceCount: 1,
        faceQuality: 'moderate',
        detectedGender: 'non-binary',
        confidence: 0.5,
        isRealPhoto: true,
        reason: 'Could not determine with certainty'
      };
    }

    // Build verification result
    const isVerified = aiResult.hasFace && aiResult.confidence >= 0.5 && aiResult.isRealPhoto !== false;
    
    // Gender matching logic - be lenient for non-binary/ambiguous cases
    let genderMatches = true;
    if (expectedGender) {
      if (aiResult.detectedGender === expectedGender) {
        genderMatches = true;
      } else if (aiResult.detectedGender === 'non-binary' && aiResult.confidence < 0.7) {
        // If AI is uncertain, accept the expected gender
        genderMatches = true;
      } else if (expectedGender === 'prefer-not-to-say' || expectedGender === 'non-binary') {
        genderMatches = true;
      } else {
        genderMatches = false;
      }
    }

    const result: VerificationResult = {
      verified: isVerified && genderMatches,
      hasFace: aiResult.hasFace,
      detectedGender: aiResult.detectedGender,
      confidence: aiResult.confidence,
      reason: buildReason(aiResult, expectedGender, genderMatches),
      genderMatches,
      faceCount: aiResult.faceCount,
      faceQuality: aiResult.faceQuality
    };

    console.log('Final verification result:', result);

    // Save verification result to database if userId is provided
    if (userId && expectedGender) {
      await saveVerificationResult(userId, expectedGender, result);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Verification error:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function createAutoAcceptResult(expectedGender?: string, reason?: string): VerificationResult {
  return {
    verified: true,
    hasFace: true,
    detectedGender: (expectedGender as any) || 'unknown',
    confidence: 1.0,
    reason: reason || 'Auto-accepted',
    genderMatches: true,
    autoAccepted: true
  };
}

function buildReason(aiResult: any, expectedGender?: string, genderMatches?: boolean): string {
  if (!aiResult.hasFace) {
    return 'No clear face detected. Please upload a photo with your face clearly visible.';
  }
  
  if (aiResult.isRealPhoto === false) {
    return 'Please upload a genuine selfie photo.';
  }
  
  if (!genderMatches && expectedGender) {
    return `Gender mismatch detected. Expected: ${expectedGender}, Detected: ${aiResult.detectedGender}. Please upload a photo that matches your profile.`;
  }
  
  if (aiResult.faceQuality === 'poor') {
    return 'Photo quality is low. Verified but consider uploading a clearer photo.';
  }
  
  return `Face verified successfully. Gender: ${aiResult.detectedGender} (${Math.round(aiResult.confidence * 100)}% confidence)`;
}

async function saveVerificationResult(
  userId: string | undefined,
  expectedGender: string | undefined,
  result: VerificationResult
): Promise<void> {
  if (!userId || !expectedGender) return;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase credentials not available, skipping DB update');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Determine which profile table to update based on gender
    const tableName = expectedGender === 'female' ? 'female_profiles' : 'male_profiles';
    
    // Update the gender-specific profile with verification status
    const { error } = await supabase
      .from(tableName)
      .update({
        is_verified: result.verified && result.genderMatches,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error(`Failed to update ${tableName}:`, error);
    } else {
      console.log(`Successfully updated ${tableName} verification status for user ${userId}`);
    }

    // Also update the main profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        verification_status: result.verified && result.genderMatches,
        is_verified: result.verified && result.genderMatches,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Failed to update profiles:', profileError);
    }

  } catch (err) {
    console.error('Error saving verification result:', err);
  }
}
