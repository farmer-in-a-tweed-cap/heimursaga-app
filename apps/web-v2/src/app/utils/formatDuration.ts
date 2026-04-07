/**
 * Format a duration in hours to a human-readable string.
 *
 * - < 1h      → "45 min"
 * - 1–23h     → "3 hrs"  /  "1 hr"
 * - 1–13 days → "2 days" /  "1 day"
 * - 2+ weeks  → "3 weeks" / "2 weeks"
 *
 * Half-values are shown when meaningful (e.g. "1.5 hrs", "2.5 days").
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return mins <= 0 ? '< 1 min' : `${mins} min`;
  }

  if (hours < 24) {
    const rounded = Math.round(hours * 2) / 2; // nearest 0.5
    if (rounded === 1) return '1 hr';
    if (rounded % 1 === 0.5) return `${rounded} hrs`;
    return `${Math.round(hours)} hr${Math.round(hours) !== 1 ? 's' : ''}`;
  }

  const days = hours / 24;

  if (days < 14) {
    const rounded = Math.round(days * 2) / 2; // nearest 0.5
    if (rounded === 1) return '1 day';
    if (rounded % 1 === 0.5) return `${rounded} days`;
    return `${Math.round(days)} day${Math.round(days) !== 1 ? 's' : ''}`;
  }

  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks !== 1 ? 's' : ''}`;
}
