/**
 * Truncates text to a maximum length, breaking at a natural point:
 * 1. End of a sentence (. ! ?) within the last 40% of the limit
 * 2. A clause break (, ; — :) within the last 30% of the limit
 * 3. A word boundary (last space before the limit)
 *
 * Strips HTML tags and always appends "...".
 */
export function truncateExcerpt(text: string, maxLength = 200): string {
  if (!text) return '';

  // Strip HTML tags before truncating
  const plain = text.replace(/<[^>]*>/g, '').trim();
  if (!plain) return '';
  if (plain.length <= maxLength) return plain + '...';

  const chunk = plain.substring(0, maxLength);

  // Look for end of sentence in the last 40% of the chunk
  const sentenceZone = Math.floor(maxLength * 0.6);
  const sentenceMatch = chunk.substring(sentenceZone).match(/.*[.!?]/);
  if (sentenceMatch) {
    const end = sentenceZone + sentenceMatch.index! + sentenceMatch[0].length;
    return plain.substring(0, end) + '...';
  }

  // Look for a clause break (, ; — :) in the last 30% of the chunk
  const clauseZone = Math.floor(maxLength * 0.7);
  const clauseMatch = chunk.substring(clauseZone).match(/.*[,;:\u2014]/);
  if (clauseMatch) {
    const end = clauseZone + clauseMatch.index! + clauseMatch[0].length;
    return plain.substring(0, end) + '...';
  }

  // Fall back to word boundary
  const wordBreak = chunk.replace(/\s+\S*$/, '');
  return wordBreak + '...';
}
