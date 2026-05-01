import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlans, _resetPlansCache } from './usePlans';

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}));

import { api } from '@/lib/api';

const FAKE_PLANS = {
  plans: [
    { sku: 'solo-weekly', tier: 'solo', cadence: 'weekly', paypal_plan_id: 'P-A',
      base_price_cents: 1999, per_seat_price_cents: null, included_seats: 1,
      display_price: '$19.99 / week', discount_pct: 0, trial_days: 2 },
    { sku: 'workspace-weekly', tier: 'workspace', cadence: 'weekly', paypal_plan_id: 'P-B',
      base_price_cents: 3999, per_seat_price_cents: 999, included_seats: 4,
      display_price: '$39.99 / week + $9.99 / extra seat', discount_pct: 0, trial_days: 2 },
  ],
};

beforeEach(() => {
  _resetPlansCache();
  vi.mocked(api).mockReset();
});

describe('usePlans', () => {
  it('fetches and exposes plans', async () => {
    vi.mocked(api).mockResolvedValueOnce(FAKE_PLANS);
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.plans).toHaveLength(2);
    expect(result.current.plans[0].sku).toBe('solo-weekly');
    expect(api).toHaveBeenCalledWith('/v1/billing/plans', { auth: false });
  });

  it('caches across hook instances', async () => {
    vi.mocked(api).mockResolvedValueOnce(FAKE_PLANS);
    const { result: r1 } = renderHook(() => usePlans());
    await waitFor(() => expect(r1.current.loading).toBe(false));
    const { result: r2 } = renderHook(() => usePlans());
    await waitFor(() => expect(r2.current.loading).toBe(false));
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('exposes error on fetch failure', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.plans).toEqual([]);
  });
});
