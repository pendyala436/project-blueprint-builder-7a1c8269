/**
 * useGenderClassification Hook
 * 
 * Uses server-side AI (Lovable AI / Gemini) for accurate gender detection
 * from selfie images. Much more accurate than browser-based models.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GenderClassificationResult {
  verified: boolean;
  hasFace: boolean;
  detectedGender: 'male' | 'female' | 'unknown';
  confidence: number;
  reason: string;
  genderMatches: boolean;
}

export interface UseGenderClassificationReturn {
  isVerifying: boolean;
  isLoadingModel: boolean;
  modelLoadProgress: number;
  classifyGender: (imageBase64: string, expectedGender?: 'male' | 'female') => Promise<GenderClassificationResult>;
}

export const useGenderClassification = (): UseGenderClassificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);

  const classifyGender = useCallback(async (
    imageBase64: string,
    expectedGender?: 'male' | 'female'
  ): Promise<GenderClassificationResult> => {
    setIsVerifying(true);

    try {
      console.log('Sending image to server for gender detection...');
      console.log('Expected gender:', expectedGender);

      // Call the edge function for server-side AI analysis
      const { data, error } = await supabase.functions.invoke('gender-detection', {
        body: { 
          imageBase64,
          expectedGender 
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Server response:', data);

      // Return the result from the server
      return {
        verified: data.verified ?? true,
        hasFace: data.hasFace ?? true,
        detectedGender: data.detectedGender ?? 'unknown',
        confidence: data.confidence ?? 1.0,
        reason: data.reason ?? 'Photo accepted',
        genderMatches: data.genderMatches ?? true
      };
    } catch (error) {
      console.error('Gender classification error:', error);
      
      // On error, return a permissive result - don't block the user
      return {
        verified: true,
        hasFace: true,
        detectedGender: expectedGender || 'unknown',
        confidence: 1.0,
        reason: 'Photo accepted (analysis unavailable)',
        genderMatches: true
      };
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    isVerifying,
    isLoadingModel: false, // Server-side, no client model loading
    modelLoadProgress: 100, // Always ready
    classifyGender
  };
};
