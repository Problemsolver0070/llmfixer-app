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

import { useReferrals, __resetReferralsCacheForTests } from './useReferrals';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    referral_code: '7CAC6F37',
    referral_link: 'https://thefixer.in/?ref=7CAC6F37',
    is_eligible_to_refer: true,
    pending_count: 0,
    pending_slots_remaining: 5,
    accumulated_credit_seconds: 0,
    lifetime_cap_remaining_seconds: 2_592_000,
    referrals: [],
    ...overrides,
  };
}

describe('useReferrals', () => {
  beforeEach(() => {
    apiCall.mockReset();
    __resetReferralsCacheForTests();
    getSession.mockResolvedValue({
      data: { session: { access_token: 't', user: { id: 'u1' } } },
    });
  });

  it('fetches /v1/referrals/me on mount', async () => {
    apiCall.mockResolvedValue(payload());
    const { result } = renderHook(() => useReferrals());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).toHaveBeenCalledWith('/v1/referrals/me');
    expect(result.current.data?.referral_code).toBe('7CAC6F37');
  });

  it('skips fetch when there is no session', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const { result } = renderHook(() => useReferrals());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('caches across re-mounts and only fetches once', async () => {
    apiCall.mockResolvedValue(payload());
    const first = renderHook(() => useReferrals());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(apiCall).toHaveBeenCalledTimes(1);
    first.unmount();
    const second = renderHook(() => useReferrals());
    await waitFor(() => expect(second.result.current.data?.referral_code).toBe('7CAC6F37'));
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  it('refresh() forces a re-fetch and updates state', async () => {
    apiCall
      .mockResolvedValueOnce(payload({ pending_count: 0 }))
      .mockResolvedValueOnce(payload({ pending_count: 3 }));
    const { result } = renderHook(() => useReferrals());
    await waitFor(() => expect(result.current.data?.pending_count).toBe(0));
    await act(async () => {
      await result.current.refresh();
    });
    expect(apiCall).toHaveBeenCalledTimes(2);
    expect(result.current.data?.pending_count).toBe(3);
  });

  it('exposes API errors via the error state', async () => {
    apiCall.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useReferrals());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
  });

  it('clears data when auth fires SIGNED_OUT', async () => {
    apiCall.mockResolvedValue(payload());
    const { result } = renderHook(() => useReferrals());
    await waitFor(() => expect(result.current.data?.referral_code).toBe('7CAC6F37'));
    await act(async () => {
      lastAuthCb?.('SIGNED_OUT', null);
    });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});
