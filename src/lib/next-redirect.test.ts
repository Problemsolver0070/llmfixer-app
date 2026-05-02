import { describe, it, expect } from 'vitest';
import { resolveNextDestination } from './next-redirect';

describe('resolveNextDestination', () => {
  it('returns the dashboard fallback when next is null', () => {
    expect(resolveNextDestination(null)).toBe('/app/dashboard');
  });

  it('returns the dashboard fallback when next is undefined', () => {
    expect(resolveNextDestination(undefined)).toBe('/app/dashboard');
  });

  it('returns the dashboard fallback when next is empty', () => {
    expect(resolveNextDestination('')).toBe('/app/dashboard');
  });

  it('accepts a same-origin /app/ path', () => {
    expect(resolveNextDestination('/app/billing')).toBe('/app/billing');
  });

  it('accepts a deeper same-origin /app/ path', () => {
    expect(resolveNextDestination('/app/workspace/accept?token=abc')).toBe(
      '/app/workspace/accept?token=abc',
    );
  });

  it('rejects protocol-relative URLs that the browser would route off-origin', () => {
    expect(resolveNextDestination('//evil.com/app/dashboard')).toBe('/app/dashboard');
  });

  it('rejects /api/, /admin/, or other non-/app/ same-origin paths', () => {
    expect(resolveNextDestination('/admin')).toBe('/app/dashboard');
    expect(resolveNextDestination('/api/v1/foo')).toBe('/app/dashboard');
    expect(resolveNextDestination('/login')).toBe('/app/dashboard');
  });

  it('accepts an absolute https URL on thefixer.in', () => {
    expect(resolveNextDestination('https://thefixer.in/')).toBe('https://thefixer.in/');
  });

  it('accepts an absolute https URL on a subdomain of thefixer.in', () => {
    expect(resolveNextDestination('https://chat.thefixer.in/')).toBe('https://chat.thefixer.in/');
  });

  it('preserves query strings on absolute thefixer.in URLs', () => {
    const target = 'https://chat.thefixer.in/?foo=bar';
    expect(resolveNextDestination(target)).toBe(target);
  });

  it('rejects external hosts even when they end with thefixer.in as a substring', () => {
    expect(resolveNextDestination('https://evilthefixer.in/')).toBe('/app/dashboard');
    expect(resolveNextDestination('https://thefixer.in.evil.com/')).toBe('/app/dashboard');
  });

  it('rejects arbitrary external hosts', () => {
    expect(resolveNextDestination('https://example.com/')).toBe('/app/dashboard');
  });

  it('rejects javascript: URLs', () => {
    expect(resolveNextDestination('javascript:alert(1)')).toBe('/app/dashboard');
  });

  it('rejects data: URLs', () => {
    expect(resolveNextDestination('data:text/html,<script>alert(1)</script>')).toBe(
      '/app/dashboard',
    );
  });

  it('rejects unparseable strings', () => {
    expect(resolveNextDestination('not a url')).toBe('/app/dashboard');
  });
});
