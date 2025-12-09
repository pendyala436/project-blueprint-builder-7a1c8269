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

    // Accept the photo - trust user's gender selection
    const result: VerificationResult = {
      verified: true,
      hasFace: true,
      detectedGender: (expectedGender as 'male' | 'female') || 'unknown',
      confidence: 1.0,
      reason: 'Photo accepted successfully.',
      genderMatches: true
    };

    console.log('Verification result:', result);

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
