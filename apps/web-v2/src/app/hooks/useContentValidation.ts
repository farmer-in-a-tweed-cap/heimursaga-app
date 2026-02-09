'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Content validation hook for AI content detection
 * Tracks paste events and detects common AI phrases
 */

// Common AI-generated text phrases and patterns
const AI_PHRASES = [
  'as an ai',
  'i cannot and will not',
  'i\'m an ai',
  'i am an ai',
  'delve into',
  'delving into',
  'it\'s important to note',
  'it is important to note',
  'it\'s worth noting',
  'in conclusion,',
  'in summary,',
  'to summarize,',
  'i hope this helps',
  'let me know if you',
  'feel free to ask',
  'dive into',
  'dive deep into',
  'comprehensive guide',
  'step-by-step guide',
  'embark on',
  'embarking on',
  'tapestry of',
  'rich tapestry',
  'multifaceted',
  'nuanced approach',
  'holistic approach',
  'paradigm shift',
  'leverage the power',
  'harness the power',
  'unlock the potential',
  'game-changer',
  'cutting-edge',
  'groundbreaking',
  'revolutionize',
  'seamlessly integrate',
  'robust framework',
  'synergy',
  'optimize your',
  'maximize your',
  'supercharge your',
];

// Threshold for paste ratio warning (0-1)
const PASTE_RATIO_THRESHOLD = 0.7;

// Minimum content length to trigger paste detection
const MIN_CONTENT_LENGTH_FOR_PASTE_CHECK = 100;

// Minimum AI phrase matches to trigger warning
const AI_PHRASE_THRESHOLD = 3;

export interface ContentValidationState {
  // Paste tracking
  totalTypedChars: number;
  totalPastedChars: number;
  pasteRatio: number;
  hasPasteWarning: boolean;
  pasteAcknowledged: boolean;

  // AI phrase detection
  aiPhraseMatches: string[];
  hasAiPhraseWarning: boolean;
  aiPhraseAcknowledged: boolean;

  // Overall
  hasWarnings: boolean;
  allAcknowledged: boolean;
}

export interface ContentValidationActions {
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  handleInput: (e: React.FormEvent<HTMLTextAreaElement>) => void;
  checkAiPhrases: (content: string) => void;
  acknowledgePaste: () => void;
  acknowledgeAiPhrases: () => void;
  reset: () => void;
}

export function useContentValidation(): [ContentValidationState, ContentValidationActions] {
  const [totalTypedChars, setTotalTypedChars] = useState(0);
  const [totalPastedChars, setTotalPastedChars] = useState(0);
  const [pasteAcknowledged, setPasteAcknowledged] = useState(false);
  const [aiPhraseMatches, setAiPhraseMatches] = useState<string[]>([]);
  const [aiPhraseAcknowledged, setAiPhraseAcknowledged] = useState(false);

  const lastContentLengthRef = useRef(0);

  // Calculate paste ratio
  const totalChars = totalTypedChars + totalPastedChars;
  const pasteRatio = totalChars > 0 ? totalPastedChars / totalChars : 0;
  const hasPasteWarning = totalChars >= MIN_CONTENT_LENGTH_FOR_PASTE_CHECK && pasteRatio >= PASTE_RATIO_THRESHOLD;
  const hasAiPhraseWarning = aiPhraseMatches.length >= AI_PHRASE_THRESHOLD;

  const hasWarnings = hasPasteWarning || hasAiPhraseWarning;
  const allAcknowledged = (!hasPasteWarning || pasteAcknowledged) && (!hasAiPhraseWarning || aiPhraseAcknowledged);

  // Handle paste event
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length > 0) {
      setTotalPastedChars(prev => prev + pastedText.length);
      // Reset acknowledgment when new paste detected
      if (pastedText.length >= 50) {
        setPasteAcknowledged(false);
      }
    }
  }, []);

  // Handle regular input (typing)
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const currentLength = e.currentTarget.value.length;
    const diff = currentLength - lastContentLengthRef.current;

    // If content increased by 1-2 chars, it's likely typing
    // Larger increases are likely paste (caught by handlePaste) or autocomplete
    if (diff > 0 && diff <= 2) {
      setTotalTypedChars(prev => prev + diff);
    }

    lastContentLengthRef.current = currentLength;
  }, []);

  // Check content for AI phrases
  const checkAiPhrases = useCallback((content: string) => {
    const lowerContent = content.toLowerCase();
    const matches: string[] = [];

    for (const phrase of AI_PHRASES) {
      if (lowerContent.includes(phrase)) {
        matches.push(phrase);
      }
    }

    setAiPhraseMatches(matches);

    // Reset acknowledgment if new phrases detected
    if (matches.length >= AI_PHRASE_THRESHOLD) {
      setAiPhraseAcknowledged(false);
    }
  }, []);

  // Acknowledgment actions
  const acknowledgePaste = useCallback(() => {
    setPasteAcknowledged(true);
  }, []);

  const acknowledgeAiPhrases = useCallback(() => {
    setAiPhraseAcknowledged(true);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setTotalTypedChars(0);
    setTotalPastedChars(0);
    setPasteAcknowledged(false);
    setAiPhraseMatches([]);
    setAiPhraseAcknowledged(false);
    lastContentLengthRef.current = 0;
  }, []);

  const state: ContentValidationState = {
    totalTypedChars,
    totalPastedChars,
    pasteRatio,
    hasPasteWarning,
    pasteAcknowledged,
    aiPhraseMatches,
    hasAiPhraseWarning,
    aiPhraseAcknowledged,
    hasWarnings,
    allAcknowledged,
  };

  const actions: ContentValidationActions = {
    handlePaste,
    handleInput,
    checkAiPhrases,
    acknowledgePaste,
    acknowledgeAiPhrases,
    reset,
  };

  return [state, actions];
}
