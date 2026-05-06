import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `API error ${status}`);
      this.status = status;
      this.body = body;
    }
  }
  return { api: (...a: unknown[]) => apiCall(...a), ApiError };
});

import {
  useStartRazorpaySubscription,
  mapRazorpayErrorMessage,
} from './useStartRazorpaySubscription';
import { ApiError } from '@/lib/api';

const SUCCESS_PAYLOAD = {
  subscription_id: 'sub_xyz',
  short_url: 'https://rzp.io/s/abc',
};

describe('useStartRazorpaySubscription', () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it('POSTs to /v1/billing/razorpay/subscription with the correct body', async () => {
    apiCall.mockResolvedValueOnce(SUCCESS_PAYLOAD);
    const { result } = renderHook(() => useStartRazorpaySubscription());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutate('solo-weekly', 1);
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/billing/razorpay/subscription', {
      method: 'POST',
      body: { plan_id: 'solo-weekly', seat_count: 1 },
    });
    expect(returned).toEqual(SUCCESS_PAYLOAD);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('defaults seat_count to 1 when not supplied', async () => {
    apiCall.mockResolvedValueOnce(SUCCESS_PAYLOAD);
    const { result } = renderHook(() => useStartRazorpaySubscription());
    await act(async () => {
      await result.current.mutate('solo-monthly');
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/billing/razorpay/subscription', {
      method: 'POST',
      body: { plan_id: 'solo-monthly', seat_count: 1 },
    });
  });

  it('exposes a null short_url when the upstream did not return one', async () => {
    apiCall.mockResolvedValueOnce({ subscription_id: 'sub_no_url', short_url: null });
    const { result } = renderHook(() => useStartRazorpaySubscription());
    let returned: { short_url: string | null } | undefined;
    await act(async () => {
      returned = await result.current.mutate('solo-weekly');
    });
    expect(returned?.short_url).toBeNull();
  });

  it('toggles loading=true while the request is in flight', async () => {
    let resolveFn: (v: unknown) => void = () => {};
    apiCall.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    const { result } = renderHook(() => useStartRazorpaySubscription());
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.mutate('solo-weekly').catch(() => undefined);
    });
    await waitFor(() => expect(result.current.loading).toBe(true));
    await act(async () => {
      resolveFn(SUCCESS_PAYLOAD);
      await pending;
    });
    expect(result.current.loading).toBe(false);
  });

  it('captures a 501 (workspace tier) into the coming-soon copy and rethrows', async () => {
    const err = new ApiError(501, { detail: 'workspace SKU not supported on Razorpay yet' });
    apiCall.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useStartRazorpaySubscription());
    await act(async () => {
      await expect(result.current.mutate('workspace-weekly')).rejects.toBe(err);
    });
    expect(result.current.error).toBe(
      'Razorpay workspace tiers coming soon, please use crypto payment for workspace plans.',
    );
  });

  it('captures a 503 into a sanitized user-facing message and rethrows', async () => {
    const err = new ApiError(503, { detail: 'razorpay credentials not configured' });
    apiCall.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useStartRazorpaySubscription());
    await act(async () => {
      await expect(result.current.mutate('solo-weekly')).rejects.toBe(err);
    });
    expect(result.current.error).toBe(
      'Razorpay unavailable. Try again or pick another method.',
    );
  });

  it('captures a 502 into the upstream-failure message', async () => {
    const err = new ApiError(502, { detail: 'razorpay subscription create failed' });
    apiCall.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useStartRazorpaySubscription());
    await act(async () => {
      await expect(result.current.mutate('solo-weekly')).rejects.toBe(err);
    });
    expect(result.current.error).toBe(
      'Razorpay is having trouble. Try again, or pick another method.',
    );
  });

  it('captures a 400 into the bad-plan message', async () => {
    const err = new ApiError(400, { detail: 'unknown plan_id: ghost' });
    apiCall.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useStartRazorpaySubscription());
    await act(async () => {
      await expect(result.current.mutate('ghost')).rejects.toBe(err);
    });
    expect(result.current.error).toBe(
      'That plan is not available for Razorpay. Pick another plan.',
    );
  });

  it('falls back to a generic message on a network error (non-ApiError)', async () => {
    apiCall.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useStartRazorpaySubscription());
    await act(async () => {
      await expect(result.current.mutate('solo-weekly')).rejects.toThrow('network down');
    });
    expect(result.current.error).toBe('Something went wrong. Please try again.');
  });

  it('reset() clears the error', async () => {
    const err = new ApiError(503, null);
    apiCall.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useStartRazorpaySubscription());
    await act(async () => {
      await expect(result.current.mutate('solo-weekly')).rejects.toBe(err);
    });
    expect(result.current.error).not.toBeNull();
    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });
});

describe('mapRazorpayErrorMessage', () => {
  it.each([
    [400, 'That plan is not available for Razorpay. Pick another plan.'],
    [413, 'Request too large.'],
    [422, 'Invalid plan or seat count.'],
    [429, 'Too many checkout attempts. Wait a minute and try again.'],
    [501, 'Razorpay workspace tiers coming soon, please use crypto payment for workspace plans.'],
    [502, 'Razorpay is having trouble. Try again, or pick another method.'],
    [503, 'Razorpay unavailable. Try again or pick another method.'],
  ])('maps status %s to the documented message', (status, expected) => {
    const err = new ApiError(status, { detail: 'backend copy' });
    expect(mapRazorpayErrorMessage(err)).toBe(expected);
  });

  it('returns the generic fallback for an unmapped status', () => {
    expect(mapRazorpayErrorMessage(new ApiError(418, null))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('returns the generic fallback when caught is not an ApiError', () => {
    expect(mapRazorpayErrorMessage(new TypeError('fetch failed'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
