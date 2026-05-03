export function hoursUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso).getTime();
  const diff = target - now.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (60 * 60 * 1000));
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/**
 * Format a cents value as a USD currency string with 2 decimal places.
 *
 * Example: `formatCents(123456)` returns `"$1,234.56"`.
 */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) return '$0.00';
  const dollars = cents / 100;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a fractional value (already in percent units, e.g. 12.34 means 12.34%)
 * as a percentage string with the given number of decimal places.
 *
 * Example: `formatPct(12.345)` returns `"12.3%"`.
 */
export function formatPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format an integer with locale-aware thousands separators.
 *
 * Example: `formatNumber(1234567)` returns `"1,234,567"`.
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US');
}
