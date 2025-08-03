// AI Content Detection Utilities

// Common AI-generated text phrases to flag
const AI_PHRASES = [
  'as an ai',
  'i hope this helps',
  'here are some',
  'it is important to note',
  'please note that',
  'keep in mind that',
  'in conclusion',
  'to summarize',
  'overall,',
  'furthermore,',
  'additionally,',
  'however, it is worth noting',
  'it should be noted',
  'in summary',
  'as mentioned earlier',
  'as previously discussed',
  'it is worth mentioning',
  'on the other hand',
  'in other words',
  'that being said',
  'with that said',
  'in essence',
  'essentially',
  'ultimately',
  'in general',
  'generally speaking',
  'broadly speaking',
  'in most cases',
  'typically',
  'more often than not',
  'it depends on',
  'varies depending on',
  'it is crucial to',
  'it is essential to',
  'it is vital to',
  'it is recommended',
  'you should consider',
  'you might want to',
  'you could also',
  'another option is',
  'alternatively',
  'here\'s what you need to know',
  'here\'s the thing',
  'the bottom line is',
];

export interface AIDetectionResult {
  isPasted: boolean;
  hasAIphrases: boolean;
  aiPhrases: string[];
  confidence: number;
  warnings: string[];
}

export interface AIDetectionOptions {
  checkPaste?: boolean;
  checkAIphrases?: boolean;
}

export class AIContentDetector {
  private static instance: AIContentDetector;
  private pasteEvents: Map<string, number> = new Map();
  
  static getInstance(): AIContentDetector {
    if (!AIContentDetector.instance) {
      AIContentDetector.instance = new AIContentDetector();
    }
    return AIContentDetector.instance;
  }

  // Track paste events for a given text element
  trackPasteEvent(elementId: string): void {
    this.pasteEvents.set(elementId, Date.now());
  }

  // Check if text was recently pasted
  isPasted(elementId: string, windowMs: number = 5000): boolean {
    const pasteTime = this.pasteEvents.get(elementId);
    if (!pasteTime) return false;
    
    return Date.now() - pasteTime < windowMs;
  }

  // Clear paste tracking for an element
  clearPasteTracking(elementId: string): void {
    this.pasteEvents.delete(elementId);
  }

  // Check for common AI phrases
  detectAIphrases(text: string): { phrases: string[]; count: number } {
    const lowerText = text.toLowerCase();
    const foundPhrases: string[] = [];
    
    AI_PHRASES.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        foundPhrases.push(phrase);
      }
    });
    
    return {
      phrases: foundPhrases,
      count: foundPhrases.length
    };
  }

  // Main detection function
  analyzeText(
    text: string, 
    elementId: string, 
    options: AIDetectionOptions = {}
  ): AIDetectionResult {
    const { checkPaste = true, checkAIphrases = true } = options;
    
    const isPasted = checkPaste ? this.isPasted(elementId) : false;
    const aiPhrasesResult = checkAIphrases ? this.detectAIphrases(text) : { phrases: [], count: 0 };
    
    const warnings: string[] = [];
    let confidence = 0;
    
    if (isPasted) {
      warnings.push('This content appears to have been pasted from another source. If you wrote this elsewhere, that\'s fine - just confirming it\'s your original work.');
      confidence += 0.3;
    }
    
    if (aiPhrasesResult.count > 0) {
      warnings.push(`This content contains ${aiPhrasesResult.count} phrase${aiPhrasesResult.count > 1 ? 's' : ''} commonly found in AI-generated text. Please ensure this is your original writing.`);
      confidence += Math.min(aiPhrasesResult.count * 0.2, 0.7);
    }
    
    return {
      isPasted,
      hasAIphrases: aiPhrasesResult.count > 0,
      aiPhrases: aiPhrasesResult.phrases,
      confidence: Math.min(confidence, 1.0),
      warnings
    };
  }

  // Check image EXIF data
  static async checkImageEXIF(file: File): Promise<{
    hasEXIF: boolean;
    hasCameraInfo: boolean;
    warnings: string[];
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const dataView = new DataView(arrayBuffer);
        
        // Check for EXIF marker (0xFFE1)
        let hasEXIF = false;
        let hasCameraInfo = false;
        const warnings: string[] = [];
        
        try {
          // Look for JPEG EXIF marker
          if (dataView.getUint16(0) === 0xFFD8) { // JPEG file
            let offset = 2;
            while (offset < dataView.byteLength - 4) {
              const marker = dataView.getUint16(offset);
              if (marker === 0xFFE1) { // EXIF marker
                hasEXIF = true;
                // Simple check for camera-related strings
                const exifData = new Uint8Array(arrayBuffer, offset, Math.min(1000, dataView.byteLength - offset));
                const exifString = String.fromCharCode.apply(null, Array.from(exifData));
                
                if (exifString.includes('Camera') || 
                    exifString.includes('Canon') || 
                    exifString.includes('Nikon') || 
                    exifString.includes('Sony') ||
                    exifString.includes('iPhone') ||
                    exifString.includes('Samsung')) {
                  hasCameraInfo = true;
                }
                break;
              }
              offset += 2;
            }
          }
        } catch (error) {
          // Silent fail - treat as no EXIF
        }
        
        if (!hasEXIF) {
          warnings.push('This image lacks metadata typically found in photos taken with cameras or phones. Please verify it\'s an original photo.');
        } else if (!hasCameraInfo) {
          warnings.push('This image has limited camera information in its metadata. Please verify it\'s an original photo.');
        }
        
        resolve({
          hasEXIF,
          hasCameraInfo,
          warnings
        });
      };
      
      reader.onerror = () => {
        resolve({
          hasEXIF: false,
          hasCameraInfo: false,
          warnings: ['Unable to analyze image metadata. Please verify this is an original photo.']
        });
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
}