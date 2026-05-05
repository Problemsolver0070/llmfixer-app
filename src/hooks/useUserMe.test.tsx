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

import { useUserMe } from './useUserMe';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'a@b.c',
    full_name: 'Ada',
    referral_code: null,
    referred_by_user_id: null,
    first_paid_charge_at: null,
    referral_credit_seconds_accumulated: 0,
    is_eligible_to_refer: false,
    has_active_subscription: false,
    ...overrides,
  };
}

describe('useUserMe', () => {
  beforeEach(() => {
    apiCall.mockReset();
    getSession.mockResolvedValue({
      data: { session: { access_token: 't', user: { id: 'u1' } } },
    });
  });

  it('fetches /v1/users/me on mount and exposes the result', async () => {
    apiCall.mockResolvedValue(payload());
    const { result } = renderHook(() => useUserMe());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).toHaveBeenCalledWith('/v1/users/me');
    expect(result.current.data?.email).toBe('a@b.c');
    expect(result.current.hasAccess).toBe(false);
  });

  it('skips fetch when there is no session', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const { result } = renderHook(() => useUserMe());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('hasAccess=true when subscription is active', async () => {
    apiCall.mockResolvedValue(payload({ has_active_subscription: true }));
    const { result } = renderHook(() => useUserMe());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasActiveSubscription).toBe(true);
    expect(result.current.hasAccess).toBe(true);
  });

  it('hasAccess=false when subscription is not active', async () => {
    apiCall.mockResolvedValue(payload({ has_active_subscription: false }));
    const { result } = renderHook(() => useUserMe());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasActiveSubscription).toBe(false);
    expect(result.current.hasAccess).toBe(false);
  });

  it('refresh() refetches', async () => {
    apiCall
      .mockResolvedValueOnce(payload({ has_active_subscription: false }))
      .mockResolvedValueOnce(payload({ has_active_subscription: true }));
    const { result } = renderHook(() => useUserMe());
    await waitFor(() => expect(result.current.hasAccess).toBe(false));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.hasAccess).toBe(true);
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it('clears data when auth fires SIGNED_OUT', async () => {
    apiCall.mockResolvedValue(payload());
    const { result } = renderHook(() => useUserMe());
    await waitFor(() => expect(result.current.data?.email).toBe('a@b.c'));
    await act(async () => {
      lastAuthCb?.('SIGNED_OUT', null);
    });
    await waitFor(() => expect(result.current.data).toBeNull());
  });

  it('refetches on USER_UPDATED', async () => {
    apiCall
      .mockResolvedValueOnce(payload({ full_name: 'Ada' }))
      .mockResolvedValueOnce(payload({ full_name: 'Ada Lovelace' }));
    const { result } = renderHook(() => useUserMe());
    await waitFor(() => expect(result.current.data?.full_name).toBe('Ada'));
    await act(async () => {
      lastAuthCb?.('USER_UPDATED', { access_token: 't', user: { id: 'u1' } });
    });
    await waitFor(() => expect(result.current.data?.full_name).toBe('Ada Lovelace'));
  });

  it('does not refetch on TOKEN_REFRESHED', async () => {
    apiCall.mockResolvedValue(payload());
    const { result } = renderHook(() => useUserMe());
    await waitFor(() => expect(result.current.data?.email).toBe('a@b.c'));
    expect(apiCall).toHaveBeenCalledTimes(1);
    await act(async () => {
      lastAuthCb?.('TOKEN_REFRESHED', { access_token: 't', user: { id: 'u1' } });
    });
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  it('exposes API errors via the error state', async () => {
    apiCall.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useUserMe());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
    expect(result.current.hasAccess).toBe(false);
  });
});
