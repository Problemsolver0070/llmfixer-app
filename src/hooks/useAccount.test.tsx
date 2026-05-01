import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

let lastAuthCb: ((event: string, session: unknown) => void) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onAuthStateChange = vi.fn((cb: any) => {
  lastAuthCb = cb;
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});
const getSession = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: (cb: unknown) => onAuthStateChange(cb),
    },
  },
}));

import { useAccount } from './useAccount';

describe('useAccount', () => {
  beforeEach(() => {
    apiCall.mockReset();
    getSession.mockResolvedValue({
      data: { session: { access_token: 't', user: { id: 'u' } } },
    });
  });

  it('fetches /v1/account on mount and exposes the result', async () => {
    apiCall.mockResolvedValue({
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'trial' },
      requests_this_week: 12, active_key_count: 1,
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).toHaveBeenCalledWith('/v1/account');
    expect(result.current.data?.user.email).toBe('a@b.c');
    expect(result.current.data?.requests_this_week).toBe(12);
  });

  it('refresh() refetches', async () => {
    apiCall.mockResolvedValueOnce({
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'trial' },
      requests_this_week: 1, active_key_count: 0,
    }).mockResolvedValueOnce({
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'active' },
      requests_this_week: 1, active_key_count: 0,
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.data?.user.status).toBe('trial'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.data?.user.status).toBe('active');
  });

  it('skips fetch when there is no session', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('clears data when auth fires SIGNED_OUT', async () => {
    apiCall.mockResolvedValue({
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'trial' },
      requests_this_week: 1, active_key_count: 0,
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.data?.user.email).toBe('a@b.c'));
    await act(async () => {
      lastAuthCb?.('SIGNED_OUT', null);
    });
    await waitFor(() => expect(result.current.data).toBeNull());
  });

  it('clears then refetches when auth fires SIGNED_OUT then SIGNED_IN', async () => {
    apiCall
      .mockResolvedValueOnce({
        user: { id: 'u', email: 'a@b.c', role: 'user', status: 'trial' },
        requests_this_week: 1, active_key_count: 0,
      })
      .mockResolvedValueOnce({
        user: { id: 'u2', email: 'second@b.c', role: 'user', status: 'active' },
        requests_this_week: 7, active_key_count: 2,
      });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.data?.user.email).toBe('a@b.c'));

    // Sign out: data clears.
    await act(async () => {
      lastAuthCb?.('SIGNED_OUT', null);
    });
    await waitFor(() => expect(result.current.data).toBeNull());

    // Magic-link / password sign-in: SIGNED_IN must trigger a refetch.
    await act(async () => {
      lastAuthCb?.('SIGNED_IN', { access_token: 't2', user: { id: 'u2' } });
    });
    await waitFor(() => expect(result.current.data?.user.email).toBe('second@b.c'));
    expect(result.current.data?.user.status).toBe('active');
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it('refetches on USER_UPDATED', async () => {
    apiCall
      .mockResolvedValueOnce({
        user: { id: 'u', email: 'a@b.c', role: 'user', status: 'trial' },
        requests_this_week: 1, active_key_count: 0,
      })
      .mockResolvedValueOnce({
        user: { id: 'u', email: 'updated@b.c', role: 'user', status: 'active' },
        requests_this_week: 1, active_key_count: 0,
      });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.data?.user.email).toBe('a@b.c'));
    await act(async () => {
      lastAuthCb?.('USER_UPDATED', { access_token: 't', user: { id: 'u' } });
    });
    await waitFor(() => expect(result.current.data?.user.email).toBe('updated@b.c'));
  });

  it('does not refetch on TOKEN_REFRESHED', async () => {
    apiCall.mockResolvedValue({
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'trial' },
      requests_this_week: 1, active_key_count: 0,
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.data?.user.email).toBe('a@b.c'));
    expect(apiCall).toHaveBeenCalledTimes(1);
    await act(async () => {
      lastAuthCb?.('TOKEN_REFRESHED', { access_token: 't', user: { id: 'u' } });
    });
    // Hourly token rotation should not thrash /v1/account.
    expect(apiCall).toHaveBeenCalledTimes(1);
  });
});

function makeUnsignedJwt(claims: Record<string, unknown>): string {
  const enc = (s: string) =>
    btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const header = enc(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = enc(JSON.stringify(claims));
  return `${header}.${payload}.`;
}

describe('useAccount has_active_subscription', () => {
  beforeEach(() => {
    apiCall.mockReset();
    apiCall.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c', role: 'user', status: 'active' },
      requests_this_week: 0,
      active_key_count: 0,
    });
  });

  it('hasActiveSubscription=true when claim is true', async () => {
    const token = makeUnsignedJwt({ sub: 'u1', has_active_subscription: true });
    getSession.mockResolvedValue({
      data: { session: { access_token: token, user: { id: 'u1' } } },
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasActiveSubscription).toBe(true);
  });

  it('hasActiveSubscription=false when claim is false', async () => {
    const token = makeUnsignedJwt({ sub: 'u1', has_active_subscription: false });
    getSession.mockResolvedValue({
      data: { session: { access_token: token, user: { id: 'u1' } } },
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasActiveSubscription).toBe(false);
  });

  it('hasActiveSubscription=false when no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasActiveSubscription).toBe(false);
  });

  it('hasActiveSubscription=false when claim missing from JWT', async () => {
    const token = makeUnsignedJwt({ sub: 'u1' });
    getSession.mockResolvedValue({
      data: { session: { access_token: token, user: { id: 'u1' } } },
    });
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasActiveSubscription).toBe(false);
  });
});
