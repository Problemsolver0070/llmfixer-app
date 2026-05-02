import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setAuthCookie, clearAuthCookie } from './auth-cookie';

describe('auth-cookie', () => {
  let cookieStore: string;
  let cookieSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cookieStore = '';
    // happy-dom strips Secure cookies on insecure origins; spy on the
    // setter so we can inspect the raw string the module writes.
    cookieSpy = vi.spyOn(document, 'cookie', 'set').mockImplementation((value: string) => {
      cookieStore = value;
    });
  });

  afterEach(() => {
    cookieSpy.mockRestore();
  });

  it('sets cookie name and value', () => {
    setAuthCookie('test.jwt.value');
    expect(cookieStore).toContain('sb-access-token=test.jwt.value');
  });

  it('scopes cookie to .thefixer.in for cross-subdomain reach', () => {
    setAuthCookie('abc');
    expect(cookieStore).toContain('Domain=.thefixer.in');
  });

  it('uses Path=/ so every route on every subdomain sees it', () => {
    setAuthCookie('abc');
    expect(cookieStore).toContain('Path=/');
  });

  it('marks the cookie Secure', () => {
    setAuthCookie('abc');
    expect(cookieStore).toContain('Secure');
  });

  it('uses SameSite=Lax to allow top-level cross-subdomain navigation', () => {
    setAuthCookie('abc');
    expect(cookieStore).toContain('SameSite=Lax');
  });

  it('uses a 1 hour Max-Age that matches the Supabase access-token TTL', () => {
    setAuthCookie('abc');
    expect(cookieStore).toContain('Max-Age=3600');
  });

  it('clearAuthCookie sets Max-Age=0 to expire the cookie', () => {
    clearAuthCookie();
    expect(cookieStore).toContain('Max-Age=0');
    expect(cookieStore).toContain('Domain=.thefixer.in');
    expect(cookieStore).toContain('sb-access-token=');
  });

  it('setAuthCookie no-ops when document is undefined (SSR-safe)', () => {
    const original = globalThis.document;
    // @ts-expect-error simulate SSR
    delete globalThis.document;
    expect(() => setAuthCookie('abc')).not.toThrow();
    globalThis.document = original;
  });

  it('clearAuthCookie no-ops when document is undefined (SSR-safe)', () => {
    const original = globalThis.document;
    // @ts-expect-error simulate SSR
    delete globalThis.document;
    expect(() => clearAuthCookie()).not.toThrow();
    globalThis.document = original;
  });
});
