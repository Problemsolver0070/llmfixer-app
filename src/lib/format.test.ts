import { describe, it, expect } from 'vitest';
import { hoursUntil, formatDateTime } from './format';

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
