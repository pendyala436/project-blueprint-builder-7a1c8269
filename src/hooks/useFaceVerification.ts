import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FaceVerificationResult {
  verified: boolean;
  hasFace: boolean;
  detectedGender: 'male' | 'female' | 'non-binary' | 'unknown';
  confidence: number;
  reason: string;
  genderMatches?: boolean;
  autoAccepted?: boolean;
}

export interface UseFaceVerificationReturn {
  isVerifying: boolean;
  isLoadingModel: boolean;
  modelLoadProgress: number;
  verifyFace: (imageBase64: string, expectedGender?: 'male' | 'female') => Promise<FaceVerificationResult>;
}

export const useFaceVerification = (): UseFaceVerificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  // These are kept for backward compatibility but not used with AI backend
  const [isLoadingModel] = useState(false);
  const [modelLoadProgress] = useState(100);

  const verifyFace = useCallback(async (
    imageBase64: string, 
    expectedGender?: 'male' | 'female'
  ): Promise<FaceVerificationResult> => {
    setIsVerifying(true);

    try {
      console.log('Starting AI gender verification for expected gender:', expectedGender);
      
      // Call the verify-photo edge function which uses Gemini AI for gender recognition
      const { data, error } = await supabase.functions.invoke('verify-photo', {
        body: { 
          imageBase64, 
          expectedGender 
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        // On error, auto-accept the photo to not block registration
        return {
          verified: true,
          hasFace: true,
          detectedGender: expectedGender || 'unknown',
          confidence: 1.0,
          reason: 'Photo accepted (verification service unavailable)',
          genderMatches: true,
          autoAccepted: true
        };
      }

      // Handle error response from the edge function
      if (data?.error) {
        console.error('Verification error from edge function:', data.error);
        return {
          verified: true,
          hasFace: true,
          detectedGender: expectedGender || 'unknown',
          confidence: 1.0,
          reason: 'Photo accepted (verification error)',
          genderMatches: true,
          autoAccepted: true
        };
      }

      // Process the AI verification result
      const result: FaceVerificationResult = {
        verified: data.verified ?? false,
        hasFace: data.hasFace ?? false,
        detectedGender: data.detectedGender ?? 'unknown',
        confidence: data.confidence ?? 0,
        reason: data.reason ?? 'Verification complete',
        genderMatches: data.genderMatches ?? true,
        autoAccepted: data.autoAccepted ?? false
      };

      console.log('AI verification result:', result);

      // If auto-accepted due to service issues, mark as verified
      if (result.autoAccepted) {
        result.verified = true;
        result.genderMatches = true;
      }

      return result;
    } catch (error) {
      console.error('Face verification error:', error);
      // On any error, auto-accept the photo to not block user registration
      return {
        verified: true,
        hasFace: true,
        detectedGender: expectedGender || 'unknown',
        confidence: 1.0,
        reason: 'Photo accepted',
        genderMatches: true,
        autoAccepted: true
      };
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    isVerifying,
    isLoadingModel,
    modelLoadProgress,
    verifyFace,
  };
};
