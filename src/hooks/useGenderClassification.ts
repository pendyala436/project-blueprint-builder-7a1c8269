/**
 * useGenderClassification Hook
 * 
 * Uses Hugging Face transformers.js with gender classification model
 * for in-browser gender verification from face images.
 * 
 * Model: rizvandwiki/gender-classification-2 (ONNX compatible)
 */

import { useState, useCallback } from 'react';
import { pipeline, type ImageClassificationPipeline } from '@huggingface/transformers';

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

// Singleton classifier instance
let classifierInstance: ImageClassificationPipeline | null = null;
let loadingPromise: Promise<ImageClassificationPipeline> | null = null;

export const useGenderClassification = (): UseGenderClassificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  const getClassifier = useCallback(async (): Promise<ImageClassificationPipeline> => {
    // Return existing instance
    if (classifierInstance) {
      return classifierInstance;
    }

    // Wait for existing load
    if (loadingPromise) {
      return loadingPromise;
    }

    // Start new load
    setIsLoadingModel(true);
    setModelLoadProgress(0);

    loadingPromise = (async () => {
      try {
        console.log('Loading gender classification model...');
        
        // Use rizvandwiki/gender-classification-2 which is ONNX compatible
        const classifier = await pipeline(
          'image-classification',
          'rizvandwiki/gender-classification-2',
          {
            progress_callback: (progress: { progress?: number; status?: string }) => {
              if (progress.progress !== undefined) {
                setModelLoadProgress(Math.round(progress.progress));
              }
            }
          }
        );

        classifierInstance = classifier;
        console.log('Gender detection model loaded successfully');
        return classifier;
      } catch (error) {
        console.error('Failed to load gender classification model:', error);
        loadingPromise = null;
        throw error;
      } finally {
        setIsLoadingModel(false);
        setModelLoadProgress(100);
      }
    })();

    return loadingPromise;
  }, []);

  const classifyGender = useCallback(async (
    imageBase64: string,
    expectedGender?: 'male' | 'female'
  ): Promise<GenderClassificationResult> => {
    setIsVerifying(true);

    try {
      // Get the classifier (loads model if needed)
      const classifier = await getClassifier();

      console.log('Classifying gender from image...');

      // Run classification on the image
      const results = await classifier(imageBase64);

      console.log('Classification results:', results);

      if (!results || !Array.isArray(results) || results.length === 0) {
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: 'Could not classify the image. Please try a clearer photo.',
          genderMatches: false
        };
      }

      // Find the top prediction
      const topResult = results[0] as { label: string; score: number };
      const label = topResult.label.toLowerCase();
      const confidence = topResult.score;

      console.log('Top prediction:', label, 'confidence:', confidence);

      // Map the label to our gender types
      // rizvandwiki/gender-classification-2 outputs 'male' or 'female' directly
      let detectedGender: 'male' | 'female' | 'unknown' = 'unknown';
      if (label === 'male' || label.includes('man') || label.includes('boy')) {
        detectedGender = 'male';
      } else if (label === 'female' || label.includes('woman') || label.includes('girl')) {
        detectedGender = 'female';
      }

      // Check if gender matches expected - fail verification if mismatch
      const genderMatches = !expectedGender || expectedGender === detectedGender;

      // Determine verification status - must match expected gender if provided
      const verified = confidence >= 0.5 && detectedGender !== 'unknown' && genderMatches;

      let reason = '';
      if (!verified) {
        reason = 'Could not verify gender. Please try a clearer selfie with good lighting.';
      } else if (!genderMatches) {
        reason = `Gender mismatch: Expected ${expectedGender}, detected ${detectedGender}`;
      } else {
        reason = `Gender verified as ${detectedGender} with ${Math.round(confidence * 100)}% confidence`;
      }

      return {
        verified,
        hasFace: true, // If classification succeeded, assume face is present
        detectedGender,
        confidence,
        reason,
        genderMatches
      };
    } catch (error) {
      console.error('Gender classification error:', error);
      
      // If expected gender is provided, fail verification on error - don't allow bypass
      if (expectedGender) {
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: 'Could not verify gender. Please try a clearer selfie with good lighting.',
          genderMatches: false
        };
      }
      
      // Only accept if no expected gender was specified
      return {
        verified: true,
        hasFace: true,
        detectedGender: 'unknown',
        confidence: 1.0,
        reason: 'Photo accepted (classification unavailable)',
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
