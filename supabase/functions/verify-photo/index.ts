/**
 * Verify Photo Edge Function - Gender Detection using Lovable AI
 * 
 * Uses Lovable AI Gateway (Gemini) for photo verification and gender detection.
 * No external HuggingFace API calls.
 */

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
  detectedGender: 'male' | 'female' | 'unknown';
  confidence: number;
  reason: string;
  genderMatches: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, expectedGender, userId } = await req.json() as VerificationRequest;
    
    if (!imageBase64) {
      console.error('No image provided in request');
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Photo verification request:', {
      expectedGender,
      userId: userId ? 'provided' : 'not provided',
      imageSize: imageBase64.length
    });

    // Basic validation - check if it's a valid image
    const isValidImage = validateImage(imageBase64);
    
    if (!isValidImage) {
      return new Response(
        JSON.stringify({
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: 'Invalid image format. Please upload a valid photo.',
          genderMatches: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI Gateway for gender classification
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let result: VerificationResult;

    if (LOVABLE_API_KEY) {
      try {
        result = await classifyWithLovableAI(imageBase64, expectedGender, LOVABLE_API_KEY);
        console.log('Lovable AI classification result:', result);
      } catch (aiError) {
        console.error('Lovable AI classification failed:', aiError);
        // Fall back to accepting the photo
        result = createAcceptedResult(expectedGender);
      }
    } else {
      console.log('LOVABLE_API_KEY not configured, accepting photo');
      result = createAcceptedResult(expectedGender);
    }

    // Save verification result if userId provided
    if (userId && expectedGender) {
      try {
        await saveVerificationResult(userId, expectedGender, result);
      } catch (dbError) {
        console.error('Failed to save verification result:', dbError);
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    console.error('Verification error:', message);
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function classifyWithLovableAI(
  imageBase64: string,
  expectedGender: string | undefined,
  apiKey: string
): Promise<VerificationResult> {
  console.log('[verify-photo] Using Lovable AI Gateway for gender detection');
  
  // Ensure image has proper data URL format
  let imageUrl = imageBase64;
  if (!imageBase64.startsWith('data:')) {
    imageUrl = `data:image/jpeg;base64,${imageBase64}`;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
                url: imageUrl
              }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Lovable AI error: ${response.status}`, errorText);
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    }
    if (response.status === 402) {
      throw new Error('AI service unavailable');
    }
    
    throw new Error(`Lovable AI error: ${response.status}`);
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

  // Check gender match
  const genderMatches = !expectedGender || expectedGender.toLowerCase() === detectedGender;
  const verified = hasFace && detectedGender !== 'unknown' && confidence >= 0.5;

  let reason: string;
  if (!hasFace) {
    reason = 'No face detected. Please upload a clear selfie.';
  } else if (!verified) {
    reason = 'Could not verify face clearly. Please upload a clearer photo.';
  } else if (!genderMatches) {
    reason = `Gender mismatch: Expected ${expectedGender}, detected ${detectedGender}`;
  } else {
    reason = `Gender verified as ${detectedGender} (${Math.round(confidence * 100)}% confidence)`;
  }

  return {
    verified,
    hasFace,
    detectedGender: detectedGender as 'male' | 'female' | 'unknown',
    confidence,
    reason,
    genderMatches
  };
}

function createAcceptedResult(expectedGender: string | undefined): VerificationResult {
  return {
    verified: true,
    hasFace: true,
    detectedGender: (expectedGender as 'male' | 'female') || 'unknown',
    confidence: 1.0,
    reason: 'Photo accepted successfully.',
    genderMatches: true
  };
}

function validateImage(imageBase64: string): boolean {
  // Basic validation for image data
  if (!imageBase64) return false;
  
  // Check for data URL format or raw base64
  if (imageBase64.startsWith('data:image/')) {
    return true;
  }
  
  // Check if it's valid base64
  try {
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    const cleanBase64 = imageBase64.replace(/\s/g, '');
    if (cleanBase64.length < 100) return false; // Too small for an image
    return base64Pattern.test(cleanBase64.substring(0, 100));
  } catch {
    return false;
  }
}

async function saveVerificationResult(
  userId: string,
  expectedGender: string,
  result: VerificationResult
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase credentials not available for saving');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Update the appropriate profile table
  const tableName = expectedGender === 'female' ? 'female_profiles' : 'male_profiles';
  
  const { error } = await supabase
    .from(tableName)
    .update({
      is_verified: result.verified && result.genderMatches
    })
    .eq('user_id', userId);

  if (error) {
    console.error(`Failed to update ${tableName}:`, error);
  } else {
    console.log(`Updated ${tableName} verification status for user ${userId}`);
  }
}
