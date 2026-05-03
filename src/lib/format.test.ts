import { describe, it, expect } from 'vitest';
import {
  hoursUntil,
  formatDateTime,
  formatCents,
  formatPct,
  formatNumber,
} from './format';

describe('hoursUntil', () => {
  it('returns whole hours floored', () => {
    const now = new Date('2026-04-27T00:00:00Z');
    const target = new Date('2026-04-27T05:30:00Z');
    expect(hoursUntil(target.toISOString(), now)).toBe(5);
  });
  it('returns 0 for a past time', () => {
    const now = new Date('2026-04-27T00:00:00Z');
    const target = new Date('2026-04-26T00:00:00Z');
    expect(hoursUntil(target.toISOString(), now)).toBe(0);
  });
});

describe('formatDateTime', () => {
  it('renders a human-readable string', () => {
    const out = formatDateTime('2026-04-27T15:30:00Z');
    expect(out).toMatch(/2026/);
  });
});

describe('formatCents', () => {
  it('formats whole-dollar amounts with two decimals', () => {
    expect(formatCents(100000)).toBe('$1,000.00');
  });
  it('formats cents with two decimals', () => {
    expect(formatCents(123456)).toBe('$1,234.56');
  });
  it('handles zero', () => {
    expect(formatCents(0)).toBe('$0.00');
  });
  it('handles negative values', () => {
    expect(formatCents(-500)).toBe('-$5.00');
  });
  it('falls back to $0.00 for non-finite input', () => {
    expect(formatCents(Number.NaN)).toBe('$0.00');
  });
});

describe('formatPct', () => {
  it('formats with one decimal by default', () => {
    expect(formatPct(12.345)).toBe('12.3%');
  });
  it('honors decimals override', () => {
    expect(formatPct(12.345, 2)).toBe('12.35%');
  });
  it('handles zero', () => {
    expect(formatPct(0)).toBe('0.0%');
  });
  it('falls back to 0% for non-finite input', () => {
    expect(formatPct(Number.NaN)).toBe('0%');
  });
});

describe('formatNumber', () => {
  it('inserts thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
  it('handles small numbers without separators', () => {
    expect(formatNumber(42)).toBe('42');
  });
  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
  it('falls back to 0 for non-finite input', () => {
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });
});
