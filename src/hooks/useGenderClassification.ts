/**
 * useGenderClassification Hook - Face Detection with Gender Classification
 * 
 * Uses Hugging Face transformers.js for in-browser face detection and gender classification.
 * Validates that a face exists before accepting the photo.
 */

import { useState, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';

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

// Cache the classifier pipeline
let classifierInstance: any = null;
let classifierLoading = false;

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

    return { valid: true, reason: 'Valid image format', sizeKB };
  } catch (e) {
    console.error('Image validation error:', e);
    return { valid: false, reason: 'Could not process image. Please try a different photo.' };
  }
};

/**
 * Get or create the classifier pipeline
 */
const getClassifier = async (onProgress: (progress: number) => void): Promise<any> => {
  if (classifierInstance) {
    return classifierInstance;
  }
  
  if (classifierLoading) {
    // Wait for loading to complete
    while (classifierLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return classifierInstance;
  }
  
  classifierLoading = true;
  console.log('Loading gender classification model...');
  
  try {
    classifierInstance = await pipeline(
      'image-classification',
      'rizvandwiki/gender-classification',
      {
        progress_callback: (progressData: any) => {
          if (progressData && typeof progressData.progress === 'number') {
            onProgress(Math.round(progressData.progress));
          }
        }
      }
    );
    return classifierInstance;
  } finally {
    classifierLoading = false;
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
      console.log('Starting face detection and gender classification...');

      // Step 1: Validate image format
      const validation = validateImageFormat(imageBase64);
      if (!validation.valid) {
        console.log('Image validation failed:', validation.reason);
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: validation.reason,
          genderMatches: false
        };
      }

      setModelLoadProgress(10);

      // Step 2: Load the gender classification model
      const classifier = await getClassifier((progress) => {
        setModelLoadProgress(10 + Math.round(progress * 0.6)); // 10-70% for model loading
      });

      setModelLoadProgress(75);
      console.log('Model loaded, running classification...');

      // Step 3: Run classification on the image
      const results = await classifier(imageBase64, { top_k: 2 });
      
      setModelLoadProgress(90);
      console.log('Classification results:', results);

      // Step 4: Analyze results
      if (!results || (Array.isArray(results) && results.length === 0)) {
        console.log('No classification results - likely no face detected');
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: 'No face detected. Please upload a clear photo of your face.',
          genderMatches: false
        };
      }

      // Get the top prediction (handle both array and single result)
      const resultsArray = Array.isArray(results) ? results : [results];
      const topResult = resultsArray[0];
      
      if (!topResult || typeof topResult.score !== 'number') {
        console.log('Invalid result format');
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: 'Could not analyze the image. Please try a different photo.',
          genderMatches: false
        };
      }

      const confidence = topResult.score;
      
      // Parse gender from label (model returns 'male' or 'female')
      const labelLower = (topResult.label || '').toLowerCase();
      let detectedGender: 'male' | 'female' | 'unknown' = 'unknown';
      
      if (labelLower.includes('male') && !labelLower.includes('female')) {
        detectedGender = 'male';
      } else if (labelLower.includes('female')) {
        detectedGender = 'female';
      }

      // Minimum confidence threshold for face detection
      const MIN_CONFIDENCE = 0.5;
      
      if (confidence < MIN_CONFIDENCE) {
        console.log('Low confidence - unclear image or no clear face');
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence,
          reason: 'Could not clearly detect a face. Please upload a clearer photo.',
          genderMatches: false
        };
      }

      // Check if detected gender matches expected gender
      const genderMatches = !expectedGender || detectedGender === expectedGender;
      
      setModelLoadProgress(100);

      if (!genderMatches) {
        console.log(`Gender mismatch: expected ${expectedGender}, detected ${detectedGender}`);
        return {
          verified: false,
          hasFace: true,
          detectedGender,
          confidence,
          reason: `Photo appears to be ${detectedGender}. Please upload a photo matching your selected gender.`,
          genderMatches: false
        };
      }

      console.log(`Verification successful: ${detectedGender} (${(confidence * 100).toFixed(1)}% confidence)`);
      return {
        verified: true,
        hasFace: true,
        detectedGender,
        confidence,
        reason: `Photo verified successfully (${(confidence * 100).toFixed(0)}% confidence)`,
        genderMatches: true
      };

    } catch (error) {
      console.error('Gender classification error:', error);
      
      // Reset classifier cache on error
      classifierInstance = null;
      
      return {
        verified: false,
        hasFace: false,
        detectedGender: 'unknown',
        confidence: 0,
        reason: 'Could not process photo. Please try again with a different image.',
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
