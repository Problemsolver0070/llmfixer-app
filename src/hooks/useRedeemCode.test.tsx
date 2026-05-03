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

import { useRedeemCode, parseRedeemError } from './useRedeemCode';
import { ApiError } from '@/lib/api';

const SUCCESS_PAYLOAD = {
  granted_plan_id: 'solo-monthly',
  granted_seat_count: 1,
  granted_seconds: 2_592_000,
  new_comp_until: '2026-06-02T00:00:00Z',
  new_status: 'comped',
};

describe('useRedeemCode', () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it('POSTs to /v1/codes/redeem with the trimmed code and exposes the result', async () => {
    apiCall.mockResolvedValueOnce(SUCCESS_PAYLOAD);
    const { result } = renderHook(() => useRedeemCode());
    await act(async () => {
      await result.current.redeem('PARTY30');
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/codes/redeem', {
      method: 'POST',
      body: { code: 'PARTY30', reason: null },
    });
    expect(result.current.lastResult).toEqual(SUCCESS_PAYLOAD);
    expect(result.current.lastError).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('forwards the optional reason argument', async () => {
    apiCall.mockResolvedValueOnce(SUCCESS_PAYLOAD);
    const { result } = renderHook(() => useRedeemCode());
    await act(async () => {
      await result.current.redeem('GIFT', 'birthday');
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/codes/redeem', {
      method: 'POST',
      body: { code: 'GIFT', reason: 'birthday' },
    });
  });

  it('toggles loading=true while the request is in flight', async () => {
    let resolveFn: (v: unknown) => void = () => {};
    apiCall.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    const { result } = renderHook(() => useRedeemCode());
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.redeem('SLOW').catch(() => undefined);
    });
    await waitFor(() => expect(result.current.loading).toBe(true));
    await act(async () => {
      resolveFn(SUCCESS_PAYLOAD);
      await pending;
    });
    expect(result.current.loading).toBe(false);
  });

  it('captures backend error_code into lastError and rethrows', async () => {
    const err = new ApiError(410, { detail: { error_code: 'code_expired', message: 'gone' } });
    apiCall.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useRedeemCode());
    await act(async () => {
      await expect(result.current.redeem('OLD')).rejects.toBe(err);
    });
    expect(result.current.lastError).toEqual({
      error_code: 'code_expired',
      message: 'This code has expired.',
    });
    expect(result.current.lastResult).toBeNull();
  });

  it('falls back to generic message on unknown error_code', async () => {
    const err = new ApiError(500, { detail: { error_code: 'mystery', message: 'huh' } });
    apiCall.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useRedeemCode());
    await act(async () => {
      await expect(result.current.redeem('X')).rejects.toBe(err);
    });
    expect(result.current.lastError).toEqual({
      error_code: null,
      message: 'Something went wrong. Please try again.',
    });
  });

  it('falls back to generic message on a network error (non-ApiError)', async () => {
    apiCall.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useRedeemCode());
    await act(async () => {
      await expect(result.current.redeem('X')).rejects.toThrow('network down');
    });
    expect(result.current.lastError).toEqual({
      error_code: null,
      message: 'Something went wrong. Please try again.',
    });
  });

  it('reset() clears lastResult and lastError', async () => {
    apiCall.mockResolvedValueOnce(SUCCESS_PAYLOAD);
    const { result } = renderHook(() => useRedeemCode());
    await act(async () => {
      await result.current.redeem('GOOD');
    });
    expect(result.current.lastResult).not.toBeNull();
    act(() => result.current.reset());
    expect(result.current.lastResult).toBeNull();
    expect(result.current.lastError).toBeNull();
  });
});

describe('parseRedeemError', () => {
  it.each([
    ['code_not_found', "We couldn't find that code. Check for typos and try again."],
    ['code_expired', 'This code has expired.'],
    ['code_exhausted', 'This code has reached its usage limit.'],
    ['code_bound_to_other_user', 'This code is reserved for a different account.'],
    ['code_already_redeemed', "You've already redeemed this code."],
    [
      'code_blocked_active_subscription',
      'You have an active subscription. Cancel it first or wait until it ends to redeem a code.',
    ],
    [
      'code_plan_unavailable',
      'This code references a plan that is no longer available. Contact support.',
    ],
  ])('maps %s to the spec message', (code, expected) => {
    const err = new ApiError(409, { detail: { error_code: code, message: 'backend copy' } });
    const parsed = parseRedeemError(err);
    expect(parsed.error_code).toBe(code);
    expect(parsed.message).toBe(expected);
  });

  it('returns generic fallback when body is null', () => {
    expect(parseRedeemError(new ApiError(500, null)).message).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('returns generic fallback when body has no detail', () => {
    expect(parseRedeemError(new ApiError(500, { foo: 'bar' })).message).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('returns generic fallback when caught is not an ApiError', () => {
    expect(parseRedeemError(new TypeError('fetch failed')).message).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
