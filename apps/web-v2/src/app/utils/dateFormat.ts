/**
 * Date formatting utilities
 *
 * Use formatDate() for most displays (just date, no time)
 * Use formatDateTime() only in dedicated detail/info cards where time is needed
 *
 * Note: Database stores dates in UTC. These functions display dates in the user's
 * local timezone for better UX while maintaining data consistency.
 */

/**
 * Parse a date string or Date object, handling timezone-naive strings
 */
function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;

  // If the string doesn't have timezone info, treat it as UTC
  // ISO dates from the API typically include 'T' and 'Z' or timezone offset
  if (!date.includes('T') && !date.includes('Z') && !date.match(/[+-]\d{2}:\d{2}$/)) {
    // Date-only string (e.g., "2026-01-15") - parse as UTC midnight
    return new Date(`${date}T00:00:00Z`);
  }

  return new Date(date);
}

/**
 * Format a date string or Date object to a readable date (no time)
 * Example: "Jan 15, 2026"
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '';

  const d = parseDate(date);

  // Check for invalid date
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string or Date object to a short readable date (no year)
 * Example: "Jan 15"
 * Use for cards and compact displays where space is limited
 */
export function formatShortDate(date: string | Date | undefined | null): string {
  if (!date) return '';

  const d = parseDate(date);

  // Check for invalid date
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string or Date object to a readable date with time
 * Use only in dedicated detail/info cards
 * Example: "Jan 15, 2026, 2:30 PM"
 */
export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '';

  const d = parseDate(date);

  // Check for invalid date
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date to ISO date string (YYYY-MM-DD)
 * Useful for form inputs
 */
export function formatISODate(date: string | Date | undefined | null): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(d.getTime())) return '';

  return d.toISOString().split('T')[0];
}

/**
 * Calculate days elapsed for an expedition based on its status and dates
 * - Active: Days from startDate to now
 * - Completed: Days from startDate to endDate
 * - Planned: 0 (hasn't started yet)
 */
export function calculateDaysElapsed(
  startDate: string | Date | undefined | null,
  endDate: string | Date | undefined | null,
  status: string | undefined | null
): number {
  if (!startDate) return 0;

  const start = parseDate(startDate);
  if (isNaN(start.getTime())) return 0;

  const now = new Date();

  // For planned expeditions or if start date is in the future, return 0
  if (status === 'planned' || start > now) {
    return 0;
  }

  // For completed expeditions, calculate days between start and end
  if (status === 'completed' && endDate) {
    const end = parseDate(endDate);
    if (!isNaN(end.getTime())) {
      return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  // For active expeditions (or unknown status), calculate days from start to now
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Format a date, including time only if a specific time was logged (not midnight)
 * Example with time: "Jan 15, 2026, 2:30 PM"
 * Example without time: "Jan 15, 2026"
 * Use for entries where time is optional
 */
export function formatDateWithOptionalTime(date: string | Date | undefined | null): string {
  if (!date) return '';

  const d = parseDate(date);

  // Check for invalid date
  if (isNaN(d.getTime())) return '';

  // Check if time is midnight (00:00:00) - indicates no specific time was logged
  const hasSpecificTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;

  if (hasSpecificTime) {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return formatDate(d);
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else {
    return 'Just now';
  }
}
