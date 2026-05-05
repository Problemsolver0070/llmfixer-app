import { describe, it, expect, vi, afterEach } from 'vitest';

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('throws when a required var is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('VITE_PAYPAL_CLIENT_ID', 'cli');
    await expect(import('./env')).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it('throws in dev when VITE_API_BASE is unset (F43)', async () => {
    // vitest sets DEV=true by default, so an unset VITE_API_BASE must
    // fail loudly per F43 rather than silently falling back.
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('VITE_PAYPAL_CLIENT_ID', 'cli');
    vi.stubEnv('VITE_API_BASE', '');
    vi.stubEnv('DEV', true);
    await expect(import('./env')).rejects.toThrow(/VITE_API_BASE/);
  });

  it('falls back to api.thefixer.in in prod when VITE_API_BASE is unset (F43)', async () => {
    // In production builds the fallback is preserved (CI is expected to
    // inject the var; if it doesn't, fall back instead of breaking the
    // app). A console.warn is emitted; we just spy and confirm.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('VITE_PAYPAL_CLIENT_ID', 'cli');
    vi.stubEnv('VITE_API_BASE', '');
    vi.stubEnv('DEV', false);
    const mod = await import('./env');
    expect(mod.env.apiBase).toBe('https://api.thefixer.in');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns the configured VITE_API_BASE when set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('VITE_PAYPAL_CLIENT_ID', 'cli');
    vi.stubEnv('VITE_API_BASE', 'https://example.com');
    const mod = await import('./env');
    expect(mod.env.apiBase).toBe('https://example.com');
    expect(mod.env.supabaseUrl).toBe('https://x.supabase.co');
  });
});
