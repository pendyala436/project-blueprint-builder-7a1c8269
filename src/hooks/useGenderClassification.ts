/**
 * useGenderClassification Hook - Age & Gender Prediction
 *
 * Uses Hugging Face model: abhilash88/age-gender-prediction
 * Validates face exists and classifies gender.
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

let classifierInstance: any = null;
let loadingPromise: Promise<any> | null = null;

const getClassifier = async (onProgress: (progress: number) => void): Promise<any> => {
  if (classifierInstance) return classifierInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      console.log('Loading abhilash88/age-gender-prediction model...');
      const classifier = await pipeline(
        'image-classification',
        'abhilash88/age-gender-prediction',
        {
          progress_callback: (p: any) => {
            if (p && typeof p.progress === 'number') {
              onProgress(Math.round(p.progress));
            }
          },
        }
      );
      classifierInstance = classifier;
      console.log('Model loaded successfully');
      return classifier;
    } catch (err) {
      console.error('Failed to load model:', err);
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
};

export const useGenderClassification = (): UseGenderClassificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  const classifyGender = useCallback(
    async (imageBase64: string, expectedGender?: 'male' | 'female'): Promise<GenderClassificationResult> => {
      setIsVerifying(true);
      setIsLoadingModel(true);
      setModelLoadProgress(0);

      try {
        // Load model
        const classifier = await getClassifier((p) => setModelLoadProgress(Math.round(p * 0.8)));
        setModelLoadProgress(85);

        // Run classification
        console.log('Running gender classification...');
        const results = await classifier(imageBase64);
        setModelLoadProgress(95);
        console.log('Classification results:', results);

        if (!results || !Array.isArray(results) || results.length === 0) {
          return {
            verified: false,
            hasFace: false,
            detectedGender: 'unknown',
            confidence: 0,
            reason: 'No face detected. Please take a clear selfie.',
            genderMatches: false,
          };
        }

        // Find gender labels (male/female) from results
        let maleScore = 0;
        let femaleScore = 0;

        for (const result of results) {
          const label = (result.label || '').toLowerCase();
          const score = result.score || 0;
          
          if (label.includes('male') && !label.includes('female')) {
            maleScore = Math.max(maleScore, score);
          } else if (label.includes('female') || label.includes('woman')) {
            femaleScore = Math.max(femaleScore, score);
          }
        }

        const detectedGender: 'male' | 'female' | 'unknown' = 
          maleScore > femaleScore ? 'male' : 
          femaleScore > maleScore ? 'female' : 'unknown';
        
        const confidence = Math.max(maleScore, femaleScore);

        // Minimum confidence threshold
        if (confidence < 0.4) {
          return {
            verified: false,
            hasFace: false,
            detectedGender: 'unknown',
            confidence,
            reason: 'Could not detect face clearly. Please try a better lit selfie.',
            genderMatches: false,
          };
        }

        const genderMatches = !expectedGender || detectedGender === expectedGender;
        setModelLoadProgress(100);

        if (!genderMatches) {
          return {
            verified: false,
            hasFace: true,
            detectedGender,
            confidence,
            reason: `Gender mismatch: Expected ${expectedGender}, detected ${detectedGender}`,
            genderMatches: false,
          };
        }

        return {
          verified: true,
          hasFace: true,
          detectedGender,
          confidence,
          reason: `Verified as ${detectedGender} (${Math.round(confidence * 100)}% confidence)`,
          genderMatches: true,
        };
      } catch (error) {
        console.error('Classification error:', error);
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: 'Could not process image. Please try again.',
          genderMatches: false,
        };
      } finally {
        setIsVerifying(false);
        setIsLoadingModel(false);
      }
    },
    []
  );

  return { isVerifying, isLoadingModel, modelLoadProgress, classifyGender };
};


