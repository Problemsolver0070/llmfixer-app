import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
const signOut = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      signOut: () => signOut(),
    },
  },
}));
vi.mock('./env', () => ({
  env: { apiBase: 'https://api.test' },
}));

describe('api', () => {
  beforeEach(() => {
    getSession.mockReset();
    signOut.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('attaches the bearer token from the current session', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-1' } } });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const { api } = await import('./api');
    const out = await api<{ ok: boolean }>('/v1/account');
    expect(out).toEqual({ ok: true });
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('https://api.test/v1/account');
    expect((call[1].headers as Record<string, string>).Authorization).toBe('Bearer jwt-1');
  });

  it('throws ApiError with parsed body on non-2xx', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'jwt' } } });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => Promise.resolve(new Response(JSON.stringify({ reason: 'invalid' }), { status: 400 })),
    );
    const { api, ApiError } = await import('./api');
    await expect(api('/v1/promos/redeem', { method: 'POST', body: { code: 'x' } }))
      .rejects.toBeInstanceOf(ApiError);
    try {
      await api('/v1/promos/redeem', { method: 'POST', body: { code: 'x' } });
    } catch (e) {
      const err = e as InstanceType<typeof ApiError>;
      expect(err.status).toBe(400);
      expect(err.body).toEqual({ reason: 'invalid' });
    }
  });

  it('signs out and triggers handler on 401', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'jwt' } } });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('', { status: 401 }),
    );
    const onUnauthorized = vi.fn();
    const { api, setUnauthorizedHandler } = await import('./api');
    setUnauthorizedHandler(onUnauthorized);
    await expect(api('/v1/account')).rejects.toThrow();
    expect(signOut).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });
});
