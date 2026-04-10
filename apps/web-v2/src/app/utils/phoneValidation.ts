/**
 * Phone number validation helpers for guide contact fields.
 *
 * Kept in sync with the API DTO regex (`apps/api/src/modules/explorer/explorer.dto.ts`):
 *   - allowed characters: `+`, digits, spaces, parentheses, dots, hyphens
 *   - max length: 30 characters
 *
 * On top of that, we require an E.164-style format on the client: a leading
 * `+` country code and a total of 7–15 digits.
 */

const ALLOWED_CHARS_RE = /[^+0-9\s().-]/g;

/**
 * Strips any character the API would reject. Use this in `onChange` so the
 * input field never accepts invalid characters in the first place.
 */
export function normalizePhoneInput(value: string): string {
  return value.replace(ALLOWED_CHARS_RE, '');
}

/**
 * Returns a validation error message, or `null` if the phone number is valid.
 * An empty string is treated as valid (use a separate required check).
 */
export function getPhoneValidationError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith('+')) {
    return 'Phone number must start with a country code (e.g. +1).';
  }

  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (digitCount < 7) {
    return 'Phone number is too short.';
  }
  if (digitCount > 15) {
    return 'Phone number is too long.';
  }

  return null;
}

/**
 * Convenience wrapper — true when the value is either empty or passes validation.
 */
export function isValidPhoneNumber(value: string): boolean {
  return getPhoneValidationError(value) === null;
}
