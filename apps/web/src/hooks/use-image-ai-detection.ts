'use client';

import { useCallback, useState } from 'react';
import { AIContentDetector } from '@/lib/ai-detection';

interface ImageAIDetectionResult {
  hasEXIF: boolean;
  hasCameraInfo: boolean;
  warnings: string[];
  file: File;
}

interface UseImageAIDetectionReturn {
  results: Map<string, ImageAIDetectionResult>;
  analyzeImage: (file: File) => Promise<void>;
  clearResult: (fileName: string) => void;
  clearAllResults: () => void;
  getWarningsForFile: (fileName: string) => string[];
  hasWarningsForFile: (fileName: string) => boolean;
}

export const useImageAIDetection = (): UseImageAIDetectionReturn => {
  const [results, setResults] = useState<Map<string, ImageAIDetectionResult>>(new Map());

  const analyzeImage = useCallback(async (file: File) => {
    try {
      const exifResult = await AIContentDetector.checkImageEXIF(file);
      
      const result: ImageAIDetectionResult = {
        hasEXIF: exifResult.hasEXIF,
        hasCameraInfo: exifResult.hasCameraInfo,
        warnings: exifResult.warnings,
        file,
      };

      setResults(prev => {
        const newResults = new Map(prev);
        newResults.set(file.name, result);
        return newResults;
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      // Add error warning
      const result: ImageAIDetectionResult = {
        hasEXIF: false,
        hasCameraInfo: false,
        warnings: ['Unable to analyze image metadata. Please verify this is an original photo.'],
        file,
      };

      setResults(prev => {
        const newResults = new Map(prev);
        newResults.set(file.name, result);
        return newResults;
      });
    }
  }, []);

  const clearResult = useCallback((fileName: string) => {
    setResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(fileName);
      return newResults;
    });
  }, []);

  const clearAllResults = useCallback(() => {
    setResults(new Map());
  }, []);

  const getWarningsForFile = useCallback((fileName: string): string[] => {
    const result = results.get(fileName);
    return result?.warnings || [];
  }, [results]);

  const hasWarningsForFile = useCallback((fileName: string): boolean => {
    const warnings = getWarningsForFile(fileName);
    return warnings.length > 0;
  }, [getWarningsForFile]);

  return {
    results,
    analyzeImage,
    clearResult,
    clearAllResults,
    getWarningsForFile,
    hasWarningsForFile,
  };
};