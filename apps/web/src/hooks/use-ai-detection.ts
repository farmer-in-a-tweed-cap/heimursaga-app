'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AIContentDetector, AIDetectionResult } from '@/lib/ai-detection';

interface UseAIDetectionOptions {
  enabled?: boolean;
  checkPaste?: boolean;
  checkAIphrases?: boolean;
  debounceMs?: number;
}

interface UseAIDetectionReturn {
  result: AIDetectionResult | null;
  warnings: string[];
  trackPaste: () => void;
  analyzeText: (text: string) => void;
  clearWarnings: () => void;
  hasWarnings: boolean;
}

export const useAIDetection = (
  elementId: string,
  options: UseAIDetectionOptions = {}
): UseAIDetectionReturn => {
  const {
    enabled = true,
    checkPaste = true,
    checkAIphrases = true,
    debounceMs = 1000,
  } = options;

  const [result, setResult] = useState<AIDetectionResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const detectorRef = useRef(AIContentDetector.getInstance());
  const debounceRef = useRef<NodeJS.Timeout>();

  const trackPaste = useCallback(() => {
    if (!enabled) return;
    detectorRef.current.trackPasteEvent(elementId);
  }, [elementId, enabled]);

  const analyzeText = useCallback((text: string) => {
    if (!enabled || !text.trim()) {
      setResult(null);
      setWarnings([]);
      return;
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the analysis
    debounceRef.current = setTimeout(() => {
      const analysisResult = detectorRef.current.analyzeText(text, elementId, {
        checkPaste,
        checkAIphrases,
      });

      setResult(analysisResult);
      setWarnings(analysisResult.warnings);
    }, debounceMs);
  }, [elementId, enabled, checkPaste, checkAIphrases, debounceMs]);

  const clearWarnings = useCallback(() => {
    setWarnings([]);
    setResult(null);
    detectorRef.current.clearPasteTracking(elementId);
  }, [elementId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      detectorRef.current.clearPasteTracking(elementId);
    };
  }, [elementId]);

  return {
    result,
    warnings,
    trackPaste,
    analyzeText,
    clearWarnings,
    hasWarnings: warnings.length > 0,
  };
};