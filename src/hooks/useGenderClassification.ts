/**
 * useGenderClassification Hook
 * 
 * Stub implementation - auto-accepts photos.
 * Gender classification requires external API integration.
 */

import { useState, useCallback } from 'react';

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
  const [isLoadingModel] = useState(false);
  const [modelLoadProgress] = useState(100);

  const classifyGender = useCallback(async (
    _imageBase64: string,
    expectedGender?: 'male' | 'female'
  ): Promise<GenderClassificationResult> => {
    setIsVerifying(true);

    try {
      // Auto-accept - classification requires external API
      return {
        verified: true,
        hasFace: true,
        detectedGender: expectedGender || 'unknown',
        confidence: 1.0,
        reason: 'Photo accepted (classification unavailable)',
        genderMatches: true
      };
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    isVerifying,
    isLoadingModel,
    modelLoadProgress,
    classifyGender
  };
};
