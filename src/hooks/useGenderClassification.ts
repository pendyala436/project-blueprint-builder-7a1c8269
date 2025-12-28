/**
 * useGenderClassification Hook - Gender Detection
 *
 * Uses BlazeFace for face detection + ONNX model for gender prediction
 * Model file should be placed at: public/models/model.onnx
 */

import { useState, useCallback, useRef } from 'react';
import * as ort from 'onnxruntime-web';
import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs';

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

let blazefaceModel: blazeface.BlazeFaceModel | null = null;
let onnxSession: ort.InferenceSession | null = null;
let loadingPromise: Promise<void> | null = null;

const loadModels = async (onProgress: (progress: number) => void): Promise<void> => {
  if (blazefaceModel && onnxSession) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Load BlazeFace model
      onProgress(10);
      console.log('Loading BlazeFace model...');
      blazefaceModel = await blazeface.load();
      onProgress(50);
      console.log('BlazeFace model loaded');

      // Load ONNX model
      console.log('Loading ONNX gender model...');
      onProgress(60);
      onnxSession = await ort.InferenceSession.create('/models/model.onnx');
      onProgress(100);
      console.log('ONNX model loaded');
    } catch (err) {
      console.error('Failed to load models:', err);
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
        // Load models
        await loadModels((p) => setModelLoadProgress(p));
        
        if (!blazefaceModel || !onnxSession) {
          throw new Error('Models not loaded');
        }

        // Create image element from base64
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
        });

        // Detect faces using BlazeFace
        console.log('Detecting faces...');
        const predictions = await blazefaceModel.estimateFaces(img, false);

        if (predictions.length === 0) {
          return {
            verified: false,
            hasFace: false,
            detectedGender: 'unknown',
            confidence: 0,
            reason: 'No face detected. Please take a clear selfie showing your face.',
            genderMatches: false,
          };
        }

        // Use the first detected face
        const face = predictions[0];
        const topLeft = face.topLeft as number[];
        const bottomRight = face.bottomRight as number[];
        const x1 = topLeft[0];
        const y1 = topLeft[1];
        const x2 = bottomRight[0];
        const y2 = bottomRight[1];
        const width = x2 - x1;
        const height = y2 - y1;

        // Add padding to face crop
        const padding = 0.2;
        const paddedX1 = Math.max(0, x1 - width * padding);
        const paddedY1 = Math.max(0, y1 - height * padding);
        const paddedWidth = Math.min(img.width - paddedX1, width * (1 + 2 * padding));
        const paddedHeight = Math.min(img.height - paddedY1, height * (1 + 2 * padding));

        // Crop and resize face to 224x224
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        ctx.drawImage(img, paddedX1, paddedY1, paddedWidth, paddedHeight, 0, 0, 224, 224);

        const imageData = ctx.getImageData(0, 0, 224, 224);
        const data = imageData.data;

        // Preprocess to float32 tensor (CHW format)
        const input = new Float32Array(1 * 3 * 224 * 224);
        for (let i = 0; i < 224 * 224; i++) {
          input[i] = data[i * 4] / 255; // R
          input[i + 224 * 224] = data[i * 4 + 1] / 255; // G
          input[i + 224 * 224 * 2] = data[i * 4 + 2] / 255; // B
        }

        // Run ONNX inference
        console.log('Running gender prediction...');
        
        // Get the input name from the model
        const inputNames = onnxSession.inputNames;
        const outputNames = onnxSession.outputNames;
        console.log('Model input names:', inputNames);
        console.log('Model output names:', outputNames);
        
        const inputName = inputNames[0] || 'input';
        const feeds: Record<string, ort.Tensor> = {
          [inputName]: new ort.Tensor('float32', input, [1, 3, 224, 224])
        };

        const results = await onnxSession.run(feeds);
        
        // Get the gender output - try different possible output names
        let genderProb: number;
        const genderOutputName = outputNames.find(name => 
          name.toLowerCase().includes('gender') || 
          name.toLowerCase().includes('output')
        ) || outputNames[0];
        
        console.log('Using output name:', genderOutputName);
        
        if (!results[genderOutputName]) {
          console.error('Available outputs:', Object.keys(results));
          throw new Error(`Output '${genderOutputName}' not found in model results`);
        }
        
        const outputData = results[genderOutputName].data as Float32Array;
        console.log('Output data:', outputData);
        
        // Handle different output formats
        if (outputData.length === 1) {
          // Single probability output (0 = male, 1 = female)
          genderProb = outputData[0];
        } else if (outputData.length === 2) {
          // Two-class output [male_prob, female_prob]
          genderProb = outputData[1]; // female probability
        } else {
          console.log('Unexpected output length:', outputData.length);
          genderProb = outputData[0];
        }
        
        const detectedGender: 'male' | 'female' = genderProb >= 0.5 ? 'female' : 'male';
        const confidence = Math.max(genderProb, 1 - genderProb);

        console.log(`Detected gender: ${detectedGender}, confidence: ${(confidence * 100).toFixed(1)}%`);

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

        return {
          verified: true,
          hasFace: true,
          detectedGender,
          confidence,
          reason: `Verified as ${detectedGender} (${Math.round(confidence * 100)}% confidence)`,
          genderMatches: true,
        };

      } catch (error) {
        console.error('Gender classification error:', error);
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
