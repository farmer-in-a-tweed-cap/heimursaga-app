import { JSDOM } from 'jsdom';
import { Transform } from 'class-transformer';

// Use require for DOMPurify to avoid module resolution issues
const createDOMPurify = require('dompurify');

// Create a JSDOM window for server-side sanitization
const window = new JSDOM('').window;
const purify = createDOMPurify(window);

// Configure DOMPurify to be very restrictive but preserve text formatting
purify.setConfig({
  ALLOWED_TAGS: [], // No HTML tags allowed - preserve pure text content
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe', 'a', 'img'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'href', 'src'],
});

/**
 * Sanitize user content while preserving proper paragraph formatting
 * This removes malicious HTML/scripts and normalizes line breaks
 * @param input - Raw user content
 * @returns Sanitized content with proper paragraph formatting
 */
export function sanitizeUserContent(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // First sanitize to remove any HTML/scripts
  const sanitized = purify.sanitize(input);
  
  // Preserve line breaks and paragraph formatting
  return sanitized
    .trim()
    // Normalize carriage returns to newlines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Clean up excessive spacing while preserving single and double newlines
    .replace(/[ \t]+/g, ' ')  // Convert multiple spaces/tabs to single space
    .replace(/\n[ \t]+/g, '\n')  // Remove spaces after newlines
    .replace(/[ \t]+\n/g, '\n'); // Remove spaces before newlines
}

/**
 * Sanitize plain text fields (names, titles) - no HTML allowed
 * @param input - Raw text input  
 * @returns Sanitized plain text
 */
export function sanitizeUserText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // For plain text fields, just remove HTML and trim
  return purify.sanitize(input.trim());
}

/**
 * Class-transformer decorator for sanitizing content that may contain newlines
 * Use for: post content, bio, descriptions
 */
export const SanitizeContent = () => {
  return Transform(({ value }) => {
    return sanitizeUserContent(value);
  });
};

/**
 * Class-transformer decorator for sanitizing plain text
 * Use for: names, titles, short text fields
 */
export const SanitizeText = () => {
  return Transform(({ value }) => {
    return sanitizeUserText(value);
  });
};