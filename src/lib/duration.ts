/**
 * Format a duration in seconds as a human-readable string.
 *
 * Used by the referral dashboard to render `accumulated_credit_seconds`
 * and `lifetime_cap_remaining_seconds` from `GET /v1/referrals/me`.
 *
 * Examples:
 *   formatDuration(0)      => "0 seconds"
 *   formatDuration(60)     => "1 minute"
 *   formatDuration(3600)   => "1 hour"
 *   formatDuration(86400)  => "1 day"
 *   formatDuration(90000)  => "1 day, 1 hour"
 *   formatDuration(259200) => "3 days"
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0 seconds';
  }
  const total = Math.floor(seconds);

  const days = Math.floor(total / 86400);
  const hoursRemainder = total - days * 86400;
  const hours = Math.floor(hoursRemainder / 3600);
  const minutesRemainder = hoursRemainder - hours * 3600;
  const minutes = Math.floor(minutesRemainder / 60);
  const secs = total - days * 86400 - hours * 3600 - minutes * 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);

  // If we have days or hours, do not bother with minutes/seconds: the
  // referral surface is week-scale, so finer granularity would be noise.
  if (parts.length > 0) return parts.join(', ');

  if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  return `${secs} ${secs === 1 ? 'second' : 'seconds'}`;
}
