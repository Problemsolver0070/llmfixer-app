import { describe, it, expect } from 'vitest';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  it('returns "0 seconds" for zero', () => {
    expect(formatDuration(0)).toBe('0 seconds');
  });
  it('returns "0 seconds" for negative', () => {
    expect(formatDuration(-100)).toBe('0 seconds');
  });
  it('returns minutes when under an hour', () => {
    expect(formatDuration(60)).toBe('1 minute');
    expect(formatDuration(120)).toBe('2 minutes');
  });
  it('returns hours when under a day', () => {
    expect(formatDuration(3600)).toBe('1 hour');
    expect(formatDuration(7200)).toBe('2 hours');
  });
  it('returns single day for exactly 86400', () => {
    expect(formatDuration(86400)).toBe('1 day');
  });
  it('returns "N days, M hours" for mixed', () => {
    expect(formatDuration(86400 + 3600)).toBe('1 day, 1 hour');
    expect(formatDuration(86400 * 2 + 3600 * 3)).toBe('2 days, 3 hours');
  });
  it('returns plural days', () => {
    expect(formatDuration(86400 * 3)).toBe('3 days');
  });
  it('drops sub-hour remainder when days are present', () => {
    expect(formatDuration(86400 + 30 * 60)).toBe('1 day');
  });
  it('handles non-finite as zero', () => {
    expect(formatDuration(Number.NaN)).toBe('0 seconds');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0 seconds');
  });
});
