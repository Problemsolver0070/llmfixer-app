import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { METRICS_POLL_INTERVAL_MS, useAdminMetrics } from './useAdminMetrics';

const samplePayload = {
  revenue: {
    mrr_cents: 599700,
    arr_cents: 7196400,
    active_subs: 30,
    trial_users: 8,
    comped_users: 4,
    churn_30d_pct: 3.2,
  },
  funnel: {
    signups_30d: 200,
    trial_started_30d: 140,
    first_paid_charge_30d: 60,
  },
  engagement: { dau: 22, wau: 80, mau: 180 },
  top_burners: [
    {
      user_id: 'u1',
      email: 'a@example.com',
      output_tokens_this_week: 12345,
      requests_this_week: 67,
    },
  ],
  computed_at: '2026-05-03T12:00:00Z',
};

beforeEach(() => {
  apiCall.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAdminMetrics', () => {
  it('fetches /v1/admin/metrics on mount', async () => {
    apiCall.mockResolvedValue(samplePayload);
    const { result } = renderHook(() => useAdminMetrics());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/metrics');
    expect(result.current.data?.revenue.mrr_cents).toBe(599700);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('surfaces error and stops loading when api call fails', async () => {
    apiCall.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAdminMetrics());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error?.message).toBe('boom');
  });

  it('polls every 60s', async () => {
    apiCall.mockResolvedValue(samplePayload);
    // Only fake setInterval/clearInterval so React Testing Library's waitFor
    // (which uses setTimeout) keeps real timers and can flush microtasks.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    renderHook(() => useAdminMetrics());
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1), {
      // waitFor still runs against real time here.
    });
    await act(async () => {
      vi.advanceTimersByTime(METRICS_POLL_INTERVAL_MS);
    });
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(2));
    await act(async () => {
      vi.advanceTimersByTime(METRICS_POLL_INTERVAL_MS);
    });
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(3));
  });

  it('refresh() triggers an immediate re-fetch', async () => {
    apiCall.mockResolvedValue(samplePayload);
    const { result } = renderHook(() => useAdminMetrics());
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.refresh();
    });
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it('stops polling after unmount', async () => {
    apiCall.mockResolvedValue(samplePayload);
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { unmount } = renderHook(() => useAdminMetrics());
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(METRICS_POLL_INTERVAL_MS * 3);
    });
    expect(apiCall).toHaveBeenCalledTimes(1);
  });
});
