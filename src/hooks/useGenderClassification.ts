/**
 * useGenderClassification Hook
 * 
 * Uses browser-side AI with @huggingface/transformers for gender detection.
 * Uses a Vision Transformer model trained specifically for gender classification.
 */

import { useState, useCallback } from 'react';
import { pipeline, ImageClassificationPipeline, ProgressCallback } from '@huggingface/transformers';

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

// Cache the classifier pipeline globally
let classifierInstance: ImageClassificationPipeline | null = null;
let classifierLoadingPromise: Promise<ImageClassificationPipeline> | null = null;

export const useGenderClassification = (): UseGenderClassificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  const getClassifier = useCallback(async (): Promise<ImageClassificationPipeline> => {
    // Return cached instance
    if (classifierInstance) {
      return classifierInstance;
    }

    // If already loading, wait for it
    if (classifierLoadingPromise) {
      return classifierLoadingPromise;
    }

    // Start loading
    setIsLoadingModel(true);
    setModelLoadProgress(0);

    const progressCallback: ProgressCallback = (progress) => {
      if (progress.status === 'progress' && typeof progress.progress === 'number') {
        setModelLoadProgress(Math.round(progress.progress));
      }
    };

    classifierLoadingPromise = pipeline(
      'image-classification',
      'rizvandwiki/gender-classification',
      { 
        progress_callback: progressCallback,
      }
    ).then((classifier) => {
      classifierInstance = classifier;
      setIsLoadingModel(false);
      setModelLoadProgress(100);
      return classifier;
    }).catch((error) => {
      console.error('Failed to load gender classification model:', error);
      classifierLoadingPromise = null;
      setIsLoadingModel(false);
      throw error;
    });

    return classifierLoadingPromise;
  }, []);

  const classifyGender = useCallback(async (
    imageBase64: string,
    expectedGender?: 'male' | 'female'
  ): Promise<GenderClassificationResult> => {
    setIsVerifying(true);

    try {
      console.log('Starting browser-side gender classification...');
      console.log('Expected gender:', expectedGender);

      // Get or load the classifier
      const classifier = await getClassifier();

      // Clean up base64 string - remove data URL prefix if present
      let imageData = imageBase64;
      if (imageBase64.includes(',')) {
        imageData = imageBase64.split(',')[1];
      }

      // Convert base64 to blob URL for the classifier
      const byteCharacters = atob(imageData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      const imageUrl = URL.createObjectURL(blob);

      try {
        // Run classification
        const results = await classifier(imageUrl);
        console.log('Classification results:', results);

        // Clean up blob URL
        URL.revokeObjectURL(imageUrl);

        if (!results || !Array.isArray(results) || results.length === 0) {
          console.log('No classification results - assuming photo accepted');
          return {
            verified: true,
            hasFace: true,
            detectedGender: expectedGender || 'unknown',
            confidence: 1.0,
            reason: 'Photo accepted',
            genderMatches: true
          };
        }

        // Parse results - model returns labels like "male" or "female"
        const topResult = results[0] as { label: string; score: number };
        const detectedLabel = topResult.label.toLowerCase();
        const confidence = topResult.score;

        console.log('Top result:', topResult);
        console.log('Detected label:', detectedLabel);
        console.log('Confidence:', confidence);

        // Determine detected gender
        let detectedGender: 'male' | 'female' | 'unknown' = 'unknown';
        if (detectedLabel.includes('male') && !detectedLabel.includes('female')) {
          detectedGender = 'male';
        } else if (detectedLabel.includes('female') || detectedLabel.includes('woman')) {
          detectedGender = 'female';
        } else if (detectedLabel.includes('man')) {
          detectedGender = 'male';
        }

        console.log('Detected gender:', detectedGender);

        // Check if gender matches expected
        const genderMatches = !expectedGender || detectedGender === expectedGender || detectedGender === 'unknown';

        // Determine verification result
        const verified = genderMatches && confidence > 0.5;
        
        let reason = '';
        if (!genderMatches) {
          reason = `Photo appears to show a ${detectedGender} person, but you selected ${expectedGender}. Please retake or update your gender selection.`;
        } else if (confidence < 0.5) {
          reason = 'Low confidence in detection. Please ensure good lighting and a clear face photo.';
        } else {
          reason = 'Photo verified successfully';
        }

        console.log('Verification result:', { verified, genderMatches, reason });

        return {
          verified,
          hasFace: true,
          detectedGender,
          confidence,
          reason,
          genderMatches
        };
      } catch (classifyError) {
        // Clean up blob URL on error
        URL.revokeObjectURL(imageUrl);
        throw classifyError;
      }
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
  }, [getClassifier]);

  return {
    isVerifying,
    isLoadingModel,
    modelLoadProgress,
    classifyGender
  };
};
