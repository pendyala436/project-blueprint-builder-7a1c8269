/**
 * useGenderClassification Hook (yesterday version + blank/empty guard)
 *
 * Uses Hugging Face transformers.js for in-browser gender classification.
 * Adds a lightweight “blank image” heuristic so empty/solid images don’t get mislabeled as male/female.
 *
 * Model: onnx-community/gender-classification-ONNX
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

const validateImageFormat = (
  imageBase64: string
): { valid: boolean; reason: string; sizeKB?: number } => {
  try {
    const base64Data = imageBase64.startsWith('data:') ? imageBase64.split(',')[1] : imageBase64;
    const sizeKB = Math.round((base64Data.length * 0.75) / 1024);

    if (base64Data.length < 5000) {
      return { valid: false, reason: 'Image too small. Please upload a clearer photo.', sizeKB };
    }

    if (base64Data.length > 13333333) {
      return { valid: false, reason: 'Image too large. Please upload a smaller photo (max 10MB).', sizeKB };
    }

    const header = imageBase64.substring(0, 50).toLowerCase();
    let format = 'unknown';

    if (header.includes('image/jpeg') || header.includes('image/jpg')) format = 'jpeg';
    else if (header.includes('image/png')) format = 'png';
    else if (header.includes('image/webp')) format = 'webp';
    else if (header.includes('image/gif')) format = 'gif';
    else {
      if (base64Data.startsWith('/9j/')) format = 'jpeg';
      else if (base64Data.startsWith('iVBOR')) format = 'png';
      else if (base64Data.startsWith('UklGR')) format = 'webp';
      else if (base64Data.startsWith('R0lGOD')) format = 'gif';
    }

    if (!['jpeg', 'png', 'webp', 'gif'].includes(format)) {
      return { valid: false, reason: 'Invalid image format. Please upload a JPEG, PNG, or WebP image.', sizeKB };
    }

    return { valid: true, reason: 'Valid image format', sizeKB };
  } catch (e) {
    console.error('Image validation error:', e);
    return { valid: false, reason: 'Could not process image. Please try a different photo.' };
  }
};

const getClassifier = async (onProgress: (progress: number) => void): Promise<any> => {
  if (classifierInstance) return classifierInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      console.log('Loading Hugging Face gender classification model...');
      const classifier = await pipeline('image-classification', 'onnx-community/gender-classification-ONNX', {
        progress_callback: (p: any) => {
          if (p && typeof p.progress === 'number') onProgress(Math.round(p.progress));
        },
      });
      classifierInstance = classifier;
      return classifier;
    } finally {
      // keep instance cached; allow new load if this failed
      loadingPromise = null;
    }
  })();

  return loadingPromise;
};

const loadImageFromBase64 = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

// Heuristic: downscale to small canvas and measure luminance standard deviation.
// Solid/blank images have very low variance.
const getLumaStdDev = async (imageBase64: string): Promise<number> => {
  const img = await loadImageFromBase64(imageBase64);
  const w = 64;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let sum = 0;
  let sumSq = 0;
  const n = w * h;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luma;
    sumSq += luma * luma;
  }

  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  return Math.sqrt(variance);
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
        const validation = validateImageFormat(imageBase64);
        if (!validation.valid) {
          return {
            verified: false,
            hasFace: false,
            detectedGender: 'unknown',
            confidence: 0,
            reason: validation.reason,
            genderMatches: false,
          };
        }

        // Reject "empty/blank" images early
        const std = await getLumaStdDev(imageBase64);
        const BLANK_STD_THRESHOLD = 6; // tuned to reject near-solid screens
        if (std < BLANK_STD_THRESHOLD) {
          return {
            verified: false,
            hasFace: false,
            detectedGender: 'unknown',
            confidence: 0,
            reason: 'No face detected. Please take a clear selfie (not a blank/empty image).',
            genderMatches: false,
          };
        }

        setModelLoadProgress(10);

        const classifier = await getClassifier((p) => setModelLoadProgress(10 + Math.round(p * 0.9)));
        setModelLoadProgress(95);

        const results = await classifier(imageBase64);
        if (!results || !Array.isArray(results) || results.length === 0) {
          return {
            verified: false,
            hasFace: false,
            detectedGender: 'unknown',
            confidence: 0,
            reason: 'Could not analyze the image. Please try a clearer photo.',
            genderMatches: false,
          };
        }

        const top = results[0] as { label: string; score: number };
        const confidence = typeof top?.score === 'number' ? top.score : 0;
        const label = (top?.label || '').toLowerCase();

        let detectedGender: 'male' | 'female' | 'unknown' = 'unknown';
        if (label.includes('male') && !label.includes('female')) detectedGender = 'male';
        else if (label.includes('female') || label.includes('woman')) detectedGender = 'female';
        else if (label.includes('man')) detectedGender = 'male';

        const MIN_CONFIDENCE = 0.55;
        const hasFace = confidence >= MIN_CONFIDENCE && detectedGender !== 'unknown';

        if (!hasFace) {
          return {
            verified: false,
            hasFace: false,
            detectedGender: 'unknown',
            confidence,
            reason: 'No face detected. Please take a clearer selfie with good lighting.',
            genderMatches: false,
          };
        }

        const genderMatches = !expectedGender || detectedGender === expectedGender;
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

        setModelLoadProgress(100);
        return {
          verified: true,
          hasFace: true,
          detectedGender,
          confidence,
          reason: `Gender verified as ${detectedGender} (${Math.round(confidence * 100)}% confidence)`,
          genderMatches: true,
        };
      } catch (error) {
        console.error('Gender classification error:', error);
        // Don’t auto-accept on error (prevents empty images showing "male")
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: 'Could not verify photo. Please try again with a clearer selfie.',
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

