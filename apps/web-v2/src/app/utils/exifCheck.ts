/**
 * EXIF metadata checking for AI-generated image detection
 */

export interface ExifResult {
  hasExif: boolean;
  hasCameraInfo: boolean;
  hasGps: boolean;
  hasDateTime: boolean;
  cameraMake?: string;
  cameraModel?: string;
  software?: string;
  isSuspicious: boolean;
  suspiciousReasons: string[];
}

// Known AI tool signatures in metadata
const AI_SOFTWARE_SIGNATURES = [
  'dall-e',
  'midjourney',
  'stable diffusion',
  'novelai',
  'adobe firefly',
  'bing image creator',
  'openai',
  'stability.ai',
  'runway',
  'leonardo.ai',
  'ideogram',
  'playground ai',
];

/**
 * Read EXIF data from an image file
 */
export async function checkImageExif(file: File): Promise<ExifResult> {
  const result: ExifResult = {
    hasExif: false,
    hasCameraInfo: false,
    hasGps: false,
    hasDateTime: false,
    isSuspicious: false,
    suspiciousReasons: [],
  };

  // Only check JPEG and TIFF files (formats that typically have EXIF)
  const supportsExif = file.type === 'image/jpeg' || file.type === 'image/tiff';

  if (!supportsExif) {
    // PNG, WebP, GIF typically don't have EXIF - not necessarily suspicious
    // but worth noting
    if (file.type === 'image/png' || file.type === 'image/webp') {
      result.suspiciousReasons.push('Image format typically lacks camera metadata');
      result.isSuspicious = true;
    }
    return result;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // Check for JPEG SOI marker
    if (dataView.getUint16(0) !== 0xFFD8) {
      return result;
    }

    // Find EXIF data (APP1 marker)
    let offset = 2;
    while (offset < dataView.byteLength - 4) {
      const marker = dataView.getUint16(offset);

      if (marker === 0xFFE1) {
        // APP1 marker - EXIF data
        const length = dataView.getUint16(offset + 2);
        const exifData = new Uint8Array(arrayBuffer, offset + 4, length - 2);

        // Check for "Exif" identifier
        const exifString = String.fromCharCode(...exifData.slice(0, 4));
        if (exifString === 'Exif') {
          result.hasExif = true;

          // Parse EXIF tags (simplified - checking for common tags)
          const exifText = new TextDecoder('utf-8', { fatal: false }).decode(exifData);
          const exifLower = exifText.toLowerCase();

          // Check for camera make/model indicators
          if (exifLower.includes('canon') || exifLower.includes('nikon') ||
              exifLower.includes('sony') || exifLower.includes('fuji') ||
              exifLower.includes('olympus') || exifLower.includes('panasonic') ||
              exifLower.includes('apple') || exifLower.includes('samsung') ||
              exifLower.includes('google') || exifLower.includes('huawei') ||
              exifLower.includes('xiaomi') || exifLower.includes('oneplus') ||
              exifLower.includes('leica') || exifLower.includes('hasselblad') ||
              exifLower.includes('gopro') || exifLower.includes('dji')) {
            result.hasCameraInfo = true;
            // Extract make/model if possible
            const makeMatch = exifText.match(/(Canon|Nikon|Sony|Fuji|Apple|Samsung|Google|HUAWEI|Xiaomi|OnePlus|LEICA|GoPro|DJI)/i);
            if (makeMatch) {
              result.cameraMake = makeMatch[1];
            }
          }

          // Check for GPS data indicators
          if (exifLower.includes('gps') || exifText.includes('GPSLatitude') ||
              exifText.includes('GPSLongitude')) {
            result.hasGps = true;
          }

          // Check for DateTime
          if (exifLower.includes('datetime') || exifText.includes('DateTimeOriginal')) {
            result.hasDateTime = true;
          }

          // Check for software field and AI signatures
          const softwareMatch = exifText.match(/Software[^\x00]*?([\x20-\x7E]+)/i);
          if (softwareMatch) {
            result.software = softwareMatch[1].trim();
            const softwareLower = result.software.toLowerCase();

            for (const sig of AI_SOFTWARE_SIGNATURES) {
              if (softwareLower.includes(sig)) {
                result.isSuspicious = true;
                result.suspiciousReasons.push(`AI tool signature detected: ${result.software}`);
                break;
              }
            }
          }
        }
        break;
      }

      // Move to next marker
      if ((marker & 0xFF00) !== 0xFF00) break;
      const segmentLength = dataView.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }

    // Determine if suspicious based on lack of expected metadata
    if (!result.hasExif) {
      result.isSuspicious = true;
      result.suspiciousReasons.push('No EXIF metadata found');
    } else if (!result.hasCameraInfo && !result.hasDateTime) {
      result.isSuspicious = true;
      result.suspiciousReasons.push('Missing camera and timestamp information');
    }

  } catch (_err) {
    // On error, don't flag as suspicious - could be parsing issue
  }

  return result;
}

/**
 * Check if image metadata suggests AI generation
 */
export function isLikelyAiGenerated(exifResult: ExifResult): boolean {
  return exifResult.isSuspicious;
}
