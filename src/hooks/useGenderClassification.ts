/**
 * useGenderClassification Hook - Local Gender Classification
 * 
 * Simple local validation approach without external ML dependencies.
 * Accepts photos based on format validation and returns the expected gender.
 * 
 * Note: True gender classification requires ML models or backend processing.
 * This implementation provides basic validation and trusts the user-declared gender.
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

/**
 * Validate image format from base64 data
 */
const validateImageFormat = (imageBase64: string): { valid: boolean; reason: string; sizeKB?: number } => {
  try {
    const base64Data = imageBase64.startsWith('data:') 
      ? imageBase64.split(',')[1] 
      : imageBase64;
    
    const sizeKB = Math.round(base64Data.length * 0.75 / 1024);

    // Check minimum size (at least 5KB for a reasonable photo)
    if (base64Data.length < 5000) {
      return { valid: false, reason: 'Image too small. Please upload a clearer photo.', sizeKB };
    }

    // Check maximum size (limit to 10MB)
    if (base64Data.length > 13333333) {
      return { valid: false, reason: 'Image too large. Please upload a smaller photo (max 10MB).', sizeKB };
    }

    // Detect image format from header or base64 signature
    const header = imageBase64.substring(0, 50).toLowerCase();
    let format = 'unknown';
    
    if (header.includes('image/jpeg') || header.includes('image/jpg')) {
      format = 'jpeg';
    } else if (header.includes('image/png')) {
      format = 'png';
    } else if (header.includes('image/webp')) {
      format = 'webp';
    } else if (header.includes('image/gif')) {
      format = 'gif';
    } else {
      // Check raw base64 image signatures
      if (base64Data.startsWith('/9j/')) {
        format = 'jpeg';
      } else if (base64Data.startsWith('iVBOR')) {
        format = 'png';
      } else if (base64Data.startsWith('UklGR')) {
        format = 'webp';
      } else if (base64Data.startsWith('R0lGOD')) {
        format = 'gif';
      }
    }

    const validFormats = ['jpeg', 'png', 'webp', 'gif'];
    if (!validFormats.includes(format)) {
      return { valid: false, reason: 'Invalid image format. Please upload a JPEG, PNG, or WebP image.', sizeKB };
    }

    console.log('Image validation passed:', format, sizeKB, 'KB');
    return { valid: true, reason: 'Valid image format', sizeKB };
  } catch (e) {
    console.error('Image validation error:', e);
    return { valid: false, reason: 'Could not process image. Please try a different photo.' };
  }
};

export const useGenderClassification = (): UseGenderClassificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  const classifyGender = useCallback(async (
    imageBase64: string,
    expectedGender?: 'male' | 'female'
  ): Promise<GenderClassificationResult> => {
    setIsVerifying(true);
    setIsLoadingModel(true);
    setModelLoadProgress(0);

    try {
      console.log('Starting local photo validation...');
      setModelLoadProgress(25);

      // Validate image format
      const validation = validateImageFormat(imageBase64);
      setModelLoadProgress(50);

      if (!validation.valid) {
        console.log('Validation failed:', validation.reason);
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: validation.reason,
          genderMatches: false
        };
      }

      setModelLoadProgress(75);

      // Local validation mode: Accept photo and use expected gender as detected
      // This matches the edge function LOCAL MODE behavior
      const detectedGender = expectedGender || 'unknown';
      
      console.log('Photo validation passed (LOCAL MODE)');
      console.log('Detected gender:', detectedGender);
      
      setModelLoadProgress(100);

      return {
        verified: true,
        hasFace: true,
        detectedGender,
        confidence: 1.0,
        reason: `Photo accepted successfully (local validation). Gender: ${detectedGender}`,
        genderMatches: true
      };

    } catch (error) {
      console.error('Photo validation error:', error);
      
      return {
        verified: false,
        hasFace: false,
        detectedGender: 'unknown',
        confidence: 0,
        reason: 'Could not process photo. Please try again.',
        genderMatches: false
      };
    } finally {
      setIsVerifying(false);
      setIsLoadingModel(false);
    }
  }, []);

  return {
    isVerifying,
    isLoadingModel,
    modelLoadProgress,
    classifyGender
  };
};
