/**
 * Returns a human-readable relative time string (e.g. "3m ago", "2h ago", "5d ago").
 */
export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format a duration in hours to a compact string.
 * < 1h → "45 min", 1–23h → "3 hrs", 1–13d → "2 days", 2+ weeks → "3 wks"
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return mins <= 0 ? '< 1 min' : `${mins} min`;
  }
  if (hours < 24) {
    const rounded = Math.round(hours * 2) / 2;
    if (rounded === 1) return '1 hr';
    if (rounded % 1 === 0.5) return `${rounded} hrs`;
    return `${Math.round(hours)} hr${Math.round(hours) !== 1 ? 's' : ''}`;
  }
  const days = hours / 24;
  if (days < 14) {
    const rounded = Math.round(days * 2) / 2;
    if (rounded === 1) return '1 day';
    if (rounded % 1 === 0.5) return `${rounded} days`;
    return `${Math.round(days)} day${Math.round(days) !== 1 ? 's' : ''}`;
  }
  const weeks = Math.round(days / 7);
  return `${weeks} wk${weeks !== 1 ? 's' : ''}`;
}
