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
    vi.stubEnv('VITE_PAYPAL_PLAN_ID', 'plan');
    await expect(import('./env')).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it('returns env defaults when all required vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('VITE_PAYPAL_CLIENT_ID', 'cli');
    vi.stubEnv('VITE_PAYPAL_PLAN_ID', 'plan');
    vi.stubEnv('VITE_API_BASE', '');
    const mod = await import('./env');
    expect(mod.env.apiBase).toBe('https://api.thefixer.in');
    expect(mod.env.supabaseUrl).toBe('https://x.supabase.co');
  });
});
