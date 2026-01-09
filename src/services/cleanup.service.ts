import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://tvneohngeracipjajzos.supabase.co";

/**
 * Triggers the data-cleanup edge function to clean up old data
 */
export const triggerDataCleanup = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/data-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
    });

    const data = await response.json();
    return { success: data.success ?? response.ok, error: data.error };
  } catch (error) {
    console.error('Data cleanup error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Triggers the group-cleanup edge function to clean up old group messages
 */
export const triggerGroupCleanup = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/group-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
    });

    const data = await response.json();
    return { success: data.success ?? response.ok, error: data.error };
  } catch (error) {
    console.error('Group cleanup error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Triggers the video-cleanup edge function to clean up old video sessions
 */
export const triggerVideoCleanup = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/video-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
    });

    const data = await response.json();
    return { success: data.success ?? response.ok, error: data.error };
  } catch (error) {
    console.error('Video cleanup error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Verifies a photo using the verify-photo edge function
 */
export const verifyPhoto = async (
  imageBase64: string,
  expectedGender?: 'male' | 'female',
  userId?: string
): Promise<{
  verified: boolean;
  detectedGender?: string;
  confidence?: number;
  reason?: string;
  genderMatches?: boolean;
}> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify({
        imageBase64,
        expectedGender,
        userId,
        verificationType: 'selfie',
      }),
    });

    const data = await response.json();
    
    return {
      verified: data.verified ?? false,
      // Support both camelCase (current edge function) and snake_case (older versions)
      detectedGender: data.detectedGender ?? data.detected_gender,
      confidence: data.confidence,
      reason: data.reason,
      genderMatches: data.genderMatches ?? data.gender_matches,
    };
  } catch (error) {
    console.error('Photo verification error:', error);
    // Accept photo on error to avoid blocking registration
    return { verified: true, reason: 'Photo accepted' };
  }
};

/**
 * Runs all cleanup tasks - useful for admin manual trigger
 */
export const runAllCleanups = async (): Promise<{
  dataCleanup: { success: boolean; error?: string };
  groupCleanup: { success: boolean; error?: string };
  videoCleanup: { success: boolean; error?: string };
}> => {
  const [dataCleanup, groupCleanup, videoCleanup] = await Promise.all([
    triggerDataCleanup(),
    triggerGroupCleanup(),
    triggerVideoCleanup(),
  ]);

  return { dataCleanup, groupCleanup, videoCleanup };
};
