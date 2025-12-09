import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

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
  autoAccepted?: boolean;
  faceCount?: number;
  faceQuality?: string;
  rawPredictions?: Array<{ label: string; score: number }>;
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

    const HF_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!HF_TOKEN) {
      console.error('HUGGING_FACE_ACCESS_TOKEN not configured');
      // Fall back to auto-accept if no HF token
      const autoResult = createAutoAcceptResult(expectedGender, 'Gender verification service not configured');
      return new Response(JSON.stringify(autoResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting Hugging Face gender verification:', {
      expectedGender,
      userId: userId ? 'provided' : 'not provided',
      verificationType,
      imageSize: imageBase64.length
    });

    // Initialize Hugging Face Inference client
    const hf = new HfInference(HF_TOKEN);

    // Convert base64 to Blob for Hugging Face API
    let imageBlob: Blob;
    try {
      const base64Data = imageBase64.startsWith('data:') 
        ? imageBase64.split(',')[1] 
        : imageBase64;
      
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Detect image type from base64 header
      const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      imageBlob = new Blob([bytes], { type: mimeType });
      
      console.log('Image blob created:', { size: imageBlob.size, type: imageBlob.type });
    } catch (e) {
      console.error('Failed to convert base64 to blob:', e);
      const autoResult = createAutoAcceptResult(expectedGender, 'Failed to process image');
      await saveVerificationResult(userId, expectedGender, autoResult);
      return new Response(JSON.stringify(autoResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use NTQAI/pedestrian_gender_recognition model - trained specifically for gender classification
    let genderPredictions: Array<{ label: string; score: number }> = [];
    let detectedGender: 'male' | 'female' | 'unknown' = 'unknown';
    let confidence = 0;

    try {
      console.log('Calling Hugging Face gender classification model...');
      
      // Primary model: NTQAI/pedestrian_gender_recognition
      genderPredictions = await hf.imageClassification({
        data: imageBlob,
        model: 'NTQAI/pedestrian_gender_recognition',
      });
      
      console.log('Gender classification raw results:', genderPredictions);

      if (genderPredictions && genderPredictions.length > 0) {
        // Find the prediction with highest score
        const topPrediction = genderPredictions.reduce((prev, curr) => 
          curr.score > prev.score ? curr : prev
        );
        
        // Normalize label to male/female
        const label = topPrediction.label.toLowerCase();
        if (label.includes('male') && !label.includes('female')) {
          detectedGender = 'male';
        } else if (label.includes('female')) {
          detectedGender = 'female';
        } else if (label === 'man' || label === 'm') {
          detectedGender = 'male';
        } else if (label === 'woman' || label === 'f') {
          detectedGender = 'female';
        }
        
        confidence = topPrediction.score;
        console.log(`Detected gender: ${detectedGender} with confidence: ${confidence}`);
      }
    } catch (hfError) {
      console.error('Hugging Face classification error:', hfError);
      
      // Try fallback model: prithivMLmods/Realistic-Gender-Classification
      try {
        console.log('Trying fallback model...');
        genderPredictions = await hf.imageClassification({
          data: imageBlob,
          model: 'prithivMLmods/Realistic-Gender-Classification',
        });
        
        console.log('Fallback model results:', genderPredictions);
        
        if (genderPredictions && genderPredictions.length > 0) {
          const topPrediction = genderPredictions.reduce((prev, curr) => 
            curr.score > prev.score ? curr : prev
          );
          
          const label = topPrediction.label.toLowerCase();
          if (label.includes('male') && !label.includes('female')) {
            detectedGender = 'male';
          } else if (label.includes('female')) {
            detectedGender = 'female';
          }
          
          confidence = topPrediction.score;
        }
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError);
        // Continue with unknown detection
      }
    }

    // Determine if gender matches
    let genderMatches = true;
    const hasFace = confidence > 0.3; // If we got any prediction with reasonable confidence, there's a face
    
    if (expectedGender && expectedGender !== 'prefer-not-to-say' && expectedGender !== 'non-binary') {
      if (detectedGender === 'unknown') {
        // If we couldn't detect, be lenient
        genderMatches = confidence < 0.3; // Only accept if truly uncertain
        console.log(`Could not detect gender, confidence: ${confidence}, matches: ${genderMatches}`);
      } else {
        // Direct match required
        genderMatches = detectedGender === expectedGender;
        console.log(`Gender match check: expected=${expectedGender}, detected=${detectedGender}, matches=${genderMatches}`);
        
        if (!genderMatches) {
          console.log(`GENDER MISMATCH: Expected ${expectedGender}, detected ${detectedGender} with ${(confidence * 100).toFixed(1)}% confidence`);
        }
      }
    }

    const result: VerificationResult = {
      verified: hasFace && genderMatches,
      hasFace,
      detectedGender,
      confidence,
      reason: buildReason(hasFace, detectedGender, confidence, expectedGender, genderMatches),
      genderMatches,
      faceQuality: confidence > 0.8 ? 'good' : confidence > 0.5 ? 'moderate' : 'poor',
      rawPredictions: genderPredictions
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

function buildReason(
  hasFace: boolean, 
  detectedGender: string, 
  confidence: number, 
  expectedGender?: string, 
  genderMatches?: boolean
): string {
  if (!hasFace || confidence < 0.3) {
    return 'No clear face detected. Please upload a photo with your face clearly visible.';
  }
  
  if (!genderMatches && expectedGender) {
    return `Gender verification failed. Your profile indicates ${expectedGender}, but the photo appears to show a ${detectedGender} (${Math.round(confidence * 100)}% confidence). Please upload a photo that matches your profile.`;
  }
  
  if (confidence < 0.5) {
    return 'Photo quality is low. Verified but consider uploading a clearer photo.';
  }
  
  return `Face verified successfully. Gender: ${detectedGender} (${Math.round(confidence * 100)}% confidence)`;
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
