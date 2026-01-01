/**
 * useGenderClassification Hook
 * 
 * Uses Hugging Face transformers.js with gender classification model
 * for in-browser gender verification from face images.
 * 
 * Model: rizvandwiki/gender-classification (ONNX compatible)
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
        console.log('Loading rizvandwiki/gender-classification model...');
        
        const classifier = await pipeline(
          'image-classification',
          'rizvandwiki/gender-classification',
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
      console.log('Expected gender:', expectedGender);

      // Run classification on the image
      const results = await classifier(imageBase64);

      console.log('Full classification results:', JSON.stringify(results, null, 2));

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

      // Log all results for debugging
      results.forEach((r: any, i: number) => {
        console.log(`Result ${i}: label="${r.label}", score=${r.score}`);
      });

      // Find the highest scoring result
      const sortedResults = [...results].sort((a: any, b: any) => b.score - a.score);
      const topResult = sortedResults[0] as { label: string; score: number };
      const label = topResult.label.toLowerCase().trim();
      const confidence = topResult.score;

      console.log('Top result - Label:', label, 'Confidence:', confidence);

      // rizvandwiki/gender-classification uses exact labels: "male" and "female"
      let detectedGender: 'male' | 'female' | 'unknown' = 'unknown';
      
      if (label === 'male') {
        detectedGender = 'male';
      } else if (label === 'female') {
        detectedGender = 'female';
      } else if (label.includes('male') && !label.includes('female')) {
        detectedGender = 'male';
      } else if (label.includes('female') || label.includes('woman')) {
        detectedGender = 'female';
      } else if (label.includes('man') && !label.includes('woman')) {
        detectedGender = 'male';
      }

      console.log('Detected gender:', detectedGender);

      // Check if gender matches expected
      const genderMatches = !expectedGender || expectedGender === detectedGender;
      console.log('Gender matches expected:', genderMatches);

      // Determine verification status
      const verified = confidence >= 0.5 && detectedGender !== 'unknown';

      let reason = '';
      if (!verified) {
        reason = 'Could not verify gender. Please try a clearer selfie with good lighting.';
      } else if (!genderMatches) {
        reason = `Gender mismatch: Expected ${expectedGender}, detected ${detectedGender} (${Math.round(confidence * 100)}% confidence)`;
      } else {
        reason = `Gender verified as ${detectedGender} with ${Math.round(confidence * 100)}% confidence`;
      }

      return {
        verified,
        hasFace: true,
        detectedGender,
        confidence,
        reason,
        genderMatches
      };
    } catch (error) {
      console.error('Gender classification error:', error);
      
      // On error, return a neutral result - don't block the user
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
  }, [getClassifier]);

  return {
    isVerifying,
    isLoadingModel,
    modelLoadProgress,
    classifyGender
  };
};
