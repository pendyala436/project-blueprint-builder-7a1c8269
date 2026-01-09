/**
 * useFaceVerification Hook
 * 
 * Stub implementation - auto-accepts photos.
 * Face verification requires external API integration.
 */

import { useState, useCallback } from 'react';

export interface FaceVerificationResult {
  verified: boolean;
  hasFace: boolean;
  detectedGender: 'male' | 'female' | 'unknown';
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
  const [isLoadingModel] = useState(false);
  const [modelLoadProgress] = useState(100);

  const verifyFace = useCallback(async (
    _imageBase64: string,
    expectedGender?: 'male' | 'female'
  ): Promise<FaceVerificationResult> => {
    setIsVerifying(true);

    try {
      // Auto-accept all photos - verification requires external API
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
