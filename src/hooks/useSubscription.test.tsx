import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));
const refreshAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({
    data: { user: { paypal_sub_id: 'I-1', status: 'active' } },
    loading: false, error: null, refresh: refreshAccount,
  }),
}));

import { useSubscription } from './useSubscription';

describe('useSubscription', () => {
  beforeEach(() => {
    apiCall.mockReset();
    refreshAccount.mockReset();
  });

  it('activate posts paypal_sub_id and refreshes account', async () => {
    apiCall.mockResolvedValue({ account: {} });
    const { result } = renderHook(() => useSubscription());
    await act(async () => { await result.current.activate('I-99'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/billing/subscriptions/activate', {
      method: 'POST', body: { paypal_sub_id: 'I-99' },
    });
    expect(refreshAccount).toHaveBeenCalled();
  });

  it('cancel posts to cancel and refreshes', async () => {
    apiCall.mockResolvedValue({ account: {} });
    const { result } = renderHook(() => useSubscription());
    await act(async () => { await result.current.cancel(); });
    expect(apiCall).toHaveBeenCalledWith('/v1/billing/subscriptions/cancel', { method: 'POST' });
    expect(refreshAccount).toHaveBeenCalled();
  });

  it('redeem posts code and returns the effect', async () => {
    apiCall.mockResolvedValue({ applied_effect: { type: 'free_time', days_added: 30 } });
    const { result } = renderHook(() => useSubscription());
    let r: unknown;
    await act(async () => { r = await result.current.redeem('CODE1'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/promos/redeem', { method: 'POST', body: { code: 'CODE1' } });
    expect((r as { applied_effect: unknown }).applied_effect).toBeDefined();
  });

  it('getSubscription fetches GET /v1/billing/subscription', async () => {
    apiCall.mockResolvedValue({ paypal_sub_id: 'I-1', status: 'ACTIVE', plan_id: 'P-1', next_billing_time: '2026-05-04T00:00:00Z' });
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.subscription).not.toBeNull());
    expect(result.current.subscription?.plan_id).toBe('P-1');
  });
});
