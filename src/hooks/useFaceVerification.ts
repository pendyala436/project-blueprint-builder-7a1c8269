/**
 * useFaceVerification Hook
 * 
 * Uses face-api.js for client-side face detection and gender classification.
 * Models are loaded from the public/models directory.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';

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

// Model loading state - shared across instances
let modelsLoaded = false;
let modelsLoading = false;
let modelLoadPromise: Promise<void> | null = null;

// Use jsDelivr CDN which has the correct model files
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

export const useFaceVerification = (): UseFaceVerificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(!modelsLoaded);
  const [modelLoadProgress, setModelLoadProgress] = useState(modelsLoaded ? 100 : 0);
  const loadAttempted = useRef(false);

  // Load face-api.js models on mount
  useEffect(() => {
    const loadModels = async () => {
      if (modelsLoaded) {
        setIsLoadingModel(false);
        setModelLoadProgress(100);
        return;
      }

      if (modelsLoading && modelLoadPromise) {
        await modelLoadPromise;
        setIsLoadingModel(false);
        setModelLoadProgress(100);
        return;
      }

      if (loadAttempted.current) return;
      loadAttempted.current = true;

      modelsLoading = true;
      setIsLoadingModel(true);

      modelLoadPromise = (async () => {
        try {
          console.log('[FaceAPI] Loading models from:', MODEL_URL);
          setModelLoadProgress(10);

          // Load TinyFaceDetector for fast face detection
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          console.log('[FaceAPI] TinyFaceDetector loaded');
          setModelLoadProgress(40);

          // Load AgeGenderNet for gender detection
          await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
          console.log('[FaceAPI] AgeGenderNet loaded');
          setModelLoadProgress(80);

          // Load face landmarks for better detection
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
          console.log('[FaceAPI] FaceLandmark68Net loaded');
          setModelLoadProgress(100);

          modelsLoaded = true;
          console.log('[FaceAPI] All models loaded successfully');
        } catch (error) {
          console.error('[FaceAPI] Error loading models:', error);
          // Reset state so we can try again
          modelsLoading = false;
          loadAttempted.current = false;
          throw error;
        } finally {
          modelsLoading = false;
        }
      })();

      try {
        await modelLoadPromise;
      } catch (error) {
        console.error('[FaceAPI] Model loading failed:', error);
      }
      
      setIsLoadingModel(false);
    };

    loadModels();
  }, []);

  const verifyFace = useCallback(async (
    imageBase64: string,
    expectedGender?: 'male' | 'female'
  ): Promise<FaceVerificationResult> => {
    setIsVerifying(true);

    try {
      // Wait for models if still loading
      if (!modelsLoaded && modelLoadPromise) {
        console.log('[FaceAPI] Waiting for models to load...');
        await modelLoadPromise;
      }

      if (!modelsLoaded) {
        console.warn('[FaceAPI] Models not loaded, auto-accepting');
        return {
          verified: true,
          hasFace: true,
          detectedGender: expectedGender || 'unknown',
          confidence: 0.5,
          reason: 'Models not available, photo accepted',
          genderMatches: true,
          autoAccepted: true
        };
      }

      // Create image element from base64
      const img = await createImageFromBase64(imageBase64);
      console.log('[FaceAPI] Image loaded, detecting faces...');

      // Detect faces with age and gender
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withAgeAndGender();

      console.log('[FaceAPI] Detections:', detections.length);

      if (detections.length === 0) {
        return {
          verified: false,
          hasFace: false,
          detectedGender: 'unknown',
          confidence: 0,
          reason: 'No face detected in the image',
          genderMatches: false
        };
      }

      // Use the first (or largest) face
      const detection = detections.reduce((prev, curr) => 
        curr.detection.box.area > prev.detection.box.area ? curr : prev
      );

      const detectedGender = detection.gender as 'male' | 'female';
      const genderProbability = detection.genderProbability;
      
      console.log('[FaceAPI] Detected gender:', detectedGender, 'probability:', genderProbability);

      // Check if gender matches expected
      const genderMatches = !expectedGender || detectedGender === expectedGender;

      return {
        verified: true,
        hasFace: true,
        detectedGender,
        confidence: genderProbability,
        reason: genderMatches 
          ? `Face verified as ${detectedGender}` 
          : `Detected ${detectedGender}, updating gender`,
        genderMatches
      };
    } catch (error) {
      console.error('[FaceAPI] Verification error:', error);
      // On error, auto-accept to not block the user
      return {
        verified: true,
        hasFace: true,
        detectedGender: expectedGender || 'unknown',
        confidence: 0.5,
        reason: 'Verification error, photo accepted',
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

// Helper function to create an image element from base64
async function createImageFromBase64(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    
    // Handle both with and without data URI prefix
    if (base64.startsWith('data:')) {
      img.src = base64;
    } else {
      img.src = `data:image/jpeg;base64,${base64}`;
    }
  });
}
