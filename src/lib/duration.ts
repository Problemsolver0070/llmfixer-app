/**
 * Duration formatting helpers (Round 5).
 *
 * Used by the trial-status banner and the referral dashboard to render
 * countdowns and accumulated credit in human-friendly form.
 *
 * `formatDuration` is intentionally compact (e.g. "11 hours", "45 minutes",
 * "2 days") rather than verbose (e.g. "11 hours, 23 minutes"). The banner
 * lives next to the page nav so the copy needs to read at a glance.
 */

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Render the time between `from` (default: now) and the given ISO timestamp
 * as a single-unit, plural-aware string. Returns `'0 minutes'` when the
 * target is in the past or invalid.
 */
export function formatDuration(iso: string, from: Date = new Date()): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return '0 minutes';
  const diffMs = target - from.getTime();
  if (diffMs <= 0) return '0 minutes';

  if (diffMs >= MS_PER_DAY) {
    const days = Math.floor(diffMs / MS_PER_DAY);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (diffMs >= MS_PER_HOUR) {
    const hours = Math.floor(diffMs / MS_PER_HOUR);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const minutes = Math.max(1, Math.ceil(diffMs / MS_PER_MINUTE));
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/**
 * Whole minutes remaining until `iso`. Used by the banner to drive the
 * 0-minute refetch behaviour. Returns 0 when the target is in the past.
 */
export function minutesUntil(iso: string, from: Date = new Date()): number {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return 0;
  const diffMs = target - from.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / MS_PER_MINUTE);
}
