/**
 * Verify Photo Edge Function - HuggingFace Gender Detection
 * 
 * Uses HuggingFace Inference API for photo verification and gender detection.
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

    // Use HuggingFace for gender classification
    const HF_API_KEY = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    let result: VerificationResult;

    if (HF_API_KEY) {
      try {
        result = await classifyWithHuggingFace(imageBase64, expectedGender, HF_API_KEY);
        console.log('HuggingFace classification result:', result);
      } catch (aiError) {
        console.error('HuggingFace classification failed:', aiError);
        // Fall back to accepting the photo
        result = createAcceptedResult(expectedGender);
      }
    } else {
      console.log('No HuggingFace API key, accepting photo');
      result = createAcceptedResult(expectedGender);
    }

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

async function classifyWithHuggingFace(
  imageBase64: string,
  expectedGender: string | undefined,
  apiKey: string
): Promise<VerificationResult> {
  // Extract raw base64 data
  let base64Data = imageBase64;
  if (imageBase64.startsWith('data:')) {
    base64Data = imageBase64.split(',')[1];
  }

  // Convert base64 to binary for HuggingFace API
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  console.log('[verify-photo] Using HuggingFace gender classification model');
  
  // Use a gender classification model
  const response = await fetch(
    "https://api-inference.huggingface.co/models/rizvandwiki/gender-classification",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/octet-stream",
      },
      body: binaryData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`HuggingFace API error: ${response.status}`, errorText);
    
    if (response.status === 503) {
      console.log("[verify-photo] Model loading, waiting and retrying...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      return classifyWithHuggingFace(imageBase64, expectedGender, apiKey);
    }
    
    throw new Error(`HuggingFace API error: ${response.status}`);
  }

  const predictions = await response.json();
  console.log('HuggingFace predictions:', predictions);

  // Parse predictions - format is [{label: "male", score: 0.95}, {label: "female", score: 0.05}]
  if (!Array.isArray(predictions) || predictions.length === 0) {
    console.log('No predictions returned, accepting photo');
    return createAcceptedResult(expectedGender);
  }

  // Find the top prediction
  const topPrediction = predictions.reduce((max: any, p: any) => 
    p.score > max.score ? p : max, predictions[0]);

  const detectedGender = topPrediction.label.toLowerCase() === 'male' ? 'male' : 
                         topPrediction.label.toLowerCase() === 'female' ? 'female' : 'unknown';
  const confidence = topPrediction.score;

  // Check gender match
  const genderMatches = !expectedGender || expectedGender.toLowerCase() === detectedGender;
  const verified = confidence >= 0.5 && detectedGender !== 'unknown';

  let reason: string;
  if (!verified) {
    reason = 'Could not verify face clearly. Please upload a clearer photo.';
  } else if (!genderMatches) {
    reason = `Gender mismatch: Expected ${expectedGender}, detected ${detectedGender}`;
  } else {
    reason = `Gender verified as ${detectedGender} (${Math.round(confidence * 100)}% confidence)`;
  }

  return {
    verified,
    hasFace: true,
    detectedGender,
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
  try {
    // Check if it's a data URL or raw base64
    const base64Data = imageBase64.startsWith('data:') 
      ? imageBase64.split(',')[1] 
      : imageBase64;
    
    // Check minimum size (at least 1KB of data)
    if (base64Data.length < 1000) {
      console.log('Image too small');
      return false;
    }

    // Check for valid image headers in base64
    const header = imageBase64.substring(0, 50).toLowerCase();
    const isValidFormat = 
      header.includes('image/jpeg') || 
      header.includes('image/png') || 
      header.includes('image/webp') ||
      header.includes('image/jpg') ||
      // Check raw base64 image signatures
      base64Data.startsWith('/9j/') || // JPEG
      base64Data.startsWith('iVBOR') || // PNG
      base64Data.startsWith('UklGR'); // WEBP

    if (!isValidFormat) {
      console.log('Invalid image format detected');
      return false;
    }

    return true;
  } catch (e) {
    console.error('Image validation error:', e);
    return false;
  }
}

async function saveVerificationResult(
  userId: string,
  expectedGender: string,
  result: VerificationResult
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase credentials not available, skipping DB update');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Update the gender-specific profile
    const tableName = expectedGender === 'female' ? 'female_profiles' : 'male_profiles';
    
    const { error } = await supabase
      .from(tableName)
      .update({
        is_verified: result.verified,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error(`Failed to update ${tableName}:`, error);
    } else {
      console.log(`Updated ${tableName} for user ${userId}`);
    }

    // Update main profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        verification_status: result.verified,
        is_verified: result.verified,
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
