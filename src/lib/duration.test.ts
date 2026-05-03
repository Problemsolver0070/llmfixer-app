import { describe, it, expect } from 'vitest';
import { formatDuration, minutesUntil } from './duration';

describe('formatDuration', () => {
  it('renders multi-day windows as days', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    const target = new Date('2026-05-06T12:00:00Z').toISOString();
    expect(formatDuration(target, now)).toBe('3 days');
  });

  it('renders 1 day with the singular noun', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    const target = new Date('2026-05-04T12:00:00Z').toISOString();
    expect(formatDuration(target, now)).toBe('1 day');
  });

  it('renders sub-day windows as hours', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    const target = new Date('2026-05-03T23:00:00Z').toISOString();
    expect(formatDuration(target, now)).toBe('11 hours');
  });

  it('renders 1 hour with the singular noun', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    const target = new Date('2026-05-03T13:30:00Z').toISOString();
    expect(formatDuration(target, now)).toBe('1 hour');
  });

  it('renders sub-hour windows as minutes', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    const target = new Date('2026-05-03T12:45:00Z').toISOString();
    expect(formatDuration(target, now)).toBe('45 minutes');
  });

  it('renders 1 minute with the singular noun', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    const target = new Date('2026-05-03T12:00:30Z').toISOString();
    expect(formatDuration(target, now)).toBe('1 minute');
  });

  it('returns 0 minutes for past timestamps', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    const target = new Date('2026-05-03T11:00:00Z').toISOString();
    expect(formatDuration(target, now)).toBe('0 minutes');
  });

  it('returns 0 minutes for invalid input', () => {
    expect(formatDuration('not-a-date')).toBe('0 minutes');
  });
});

describe('minutesUntil', () => {
  it('rounds up partial minutes', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    const target = new Date('2026-05-03T12:01:30Z').toISOString();
    expect(minutesUntil(target, now)).toBe(2);
  });

  it('returns 0 for past timestamps', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    const target = new Date('2026-05-03T11:59:00Z').toISOString();
    expect(minutesUntil(target, now)).toBe(0);
  });

  it('returns 0 for invalid input', () => {
    expect(minutesUntil('nope')).toBe(0);
  });
});
