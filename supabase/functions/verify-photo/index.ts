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

    // Enhanced AI prompt for STRICT and UNBIASED gender classification
    const systemPrompt = `You are an advanced face verification and gender classification AI system. Your task is to ACCURATELY detect the biological/physical gender presentation in photos WITHOUT any bias.

CRITICAL: DO NOT let the "expected gender" influence your analysis. You MUST detect what you actually see in the photo, not what the user claims to be.

ANALYSIS STEPS:
1. FACE DETECTION: 
   - Detect if there is a clear human face in the image
   - Check for presence of facial features (eyes, nose, mouth, chin)
   - Count the number of faces detected

2. GENDER CLASSIFICATION (UNBIASED - ignore expected gender):
   Analyze these physical characteristics to determine gender:
   
   MALE INDICATORS:
   - Broader, more angular jaw
   - More prominent brow ridge
   - Larger nose relative to face
   - Adam's apple visible (if neck shown)
   - Facial hair or stubble shadow
   - Wider face structure
   - More angular cheekbones
   
   FEMALE INDICATORS:
   - Softer, rounder jaw
   - Less prominent brow ridge
   - Smaller nose relative to face
   - Smoother neck area
   - Fuller lips relative to face
   - Narrower face structure
   - Higher cheekbones with softer angles

3. CONFIDENCE SCORING:
   - High confidence (0.8-1.0): Clear gender indicators present
   - Medium confidence (0.6-0.8): Some indicators present
   - Low confidence (0.4-0.6): Ambiguous features
   - Very low (below 0.4): Cannot determine

RULES:
- BE HONEST AND ACCURATE - this is for fraud prevention
- DO NOT assume the expected gender is correct
- If you see a male face, report "male" even if expected is "female"
- Makeup does NOT change biological gender classification
- Report exactly what physical features indicate

Respond ONLY with valid JSON:
{
  "hasFace": true/false,
  "faceCount": number,
  "faceQuality": "good" | "moderate" | "poor",
  "detectedGender": "male" | "female" | "non-binary",
  "confidence": 0.0-1.0,
  "isRealPhoto": true/false,
  "genderIndicators": ["list", "of", "observed", "indicators"],
  "reason": "brief explanation with specific features observed"
}`;

    const userPrompt = `Analyze this profile photo for STRICT gender verification.

IMPORTANT: The user claims to be ${expectedGender || 'unspecified'}, but you MUST verify this independently. Do NOT trust their claim - analyze the actual facial features.

Detect:
1. Is there a clear human face?
2. Based on PHYSICAL FACIAL FEATURES, is this person male or female?
3. List the specific indicators you observed (jaw shape, brow, etc.)
4. If the detected gender does NOT match "${expectedGender}", explicitly state this mismatch.`;

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
    
    // STRICT Gender matching logic - no leniency for mismatches
    let genderMatches = true;
    if (expectedGender && expectedGender !== 'prefer-not-to-say' && expectedGender !== 'non-binary') {
      // Direct match required for male/female profiles
      if (aiResult.detectedGender === expectedGender) {
        genderMatches = true;
      } else if (aiResult.detectedGender === 'non-binary' && aiResult.confidence < 0.5) {
        // Only accept non-binary if AI confidence is very low (truly uncertain)
        genderMatches = true;
      } else {
        // MISMATCH: detected gender does not match expected
        genderMatches = false;
        console.log(`GENDER MISMATCH DETECTED: Expected ${expectedGender}, Got ${aiResult.detectedGender} (confidence: ${aiResult.confidence})`);
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
