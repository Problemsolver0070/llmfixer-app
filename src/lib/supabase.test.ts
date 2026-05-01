import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./env', () => ({
  env: {
    supabaseUrl: 'https://x.supabase.co',
    supabaseAnonKey: 'anon-key',
    apiBase: 'https://api.thefixer.in',
    paypalClientId: 'cli',
  },
}));

describe('supabase client', () => {
  beforeEach(() => vi.resetModules());

  it('creates a single Supabase client with the env values', async () => {
    const { supabase } = await import('./supabase');
    expect(supabase).toBeDefined();
    expect(typeof supabase.auth.getSession).toBe('function');
  });

  it('returns the same instance on repeated imports (module singleton)', async () => {
    const a = (await import('./supabase')).supabase;
    const b = (await import('./supabase')).supabase;
    expect(a).toBe(b);
  });
});
