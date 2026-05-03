import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { apiMock, FakeApiError } = vi.hoisted(() => {
  class FakeApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown) {
      super(`API error ${status}`);
      this.status = status;
      this.body = body;
    }
  }
  return { apiMock: vi.fn(), FakeApiError };
});
vi.mock('@/lib/api', () => ({
  api: (...args: unknown[]) => apiMock(...args),
  ApiError: FakeApiError,
}));

import {
  fetchRecoveryStatus,
  mintRecoveryCodes,
  redeemRecoveryCode,
  useMfaRecoveryStatus,
} from './useMfaRecovery';

beforeEach(() => {
  apiMock.mockReset();
});

describe('useMfaRecovery service helpers', () => {
  it('mintRecoveryCodes POSTs the right path', async () => {
    apiMock.mockResolvedValueOnce({
      codes: ['ABCD-EFGH-JKMN'],
      minted_at: '2026-05-03T00:00:00Z',
      invalidated_count: 0,
    });
    const res = await mintRecoveryCodes();
    expect(apiMock).toHaveBeenCalledWith('/v1/account/mfa/recovery-codes/mint', {
      method: 'POST',
      body: {},
    });
    expect(res.codes).toHaveLength(1);
  });

  it('fetchRecoveryStatus GETs the right path', async () => {
    apiMock.mockResolvedValueOnce({ remaining: 7, last_minted_at: null });
    const res = await fetchRecoveryStatus();
    expect(apiMock).toHaveBeenCalledWith('/v1/account/mfa/recovery-codes/status');
    expect(res.remaining).toBe(7);
  });

  it('redeemRecoveryCode POSTs the right path with the code body', async () => {
    apiMock.mockResolvedValueOnce({ re_enroll_required: true, factors_deleted: 1 });
    await redeemRecoveryCode('ABCD-EFGH-JKMN');
    expect(apiMock).toHaveBeenCalledWith('/v1/auth/mfa/recovery-redeem', {
      method: 'POST',
      body: { code: 'ABCD-EFGH-JKMN' },
    });
  });
});

describe('useMfaRecoveryStatus hook', () => {
  it('loads status on mount', async () => {
    apiMock.mockResolvedValueOnce({ remaining: 8, last_minted_at: '2026-05-01T00:00:00Z' });
    const { result } = renderHook(() => useMfaRecoveryStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toEqual({
      remaining: 8,
      last_minted_at: '2026-05-01T00:00:00Z',
    });
    expect(result.current.error).toBeNull();
  });

  it('flags mfa_required when the API returns 403', async () => {
    apiMock.mockRejectedValueOnce(new FakeApiError(403, { detail: 'mfa_required' }));
    const { result } = renderHook(() => useMfaRecoveryStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBe('mfa_required');
  });

  it('reloads when the caller bumps the key', async () => {
    apiMock
      .mockResolvedValueOnce({ remaining: 10, last_minted_at: null })
      .mockResolvedValueOnce({ remaining: 9, last_minted_at: '2026-05-02T00:00:00Z' });
    const { result, rerender } = renderHook(
      ({ k }: { k: number }) => useMfaRecoveryStatus(k),
      { initialProps: { k: 0 } },
    );
    await waitFor(() => expect(result.current.status?.remaining).toBe(10));
    rerender({ k: 1 });
    await waitFor(() => expect(result.current.status?.remaining).toBe(9));
  });

  it('exposes a reload() callback that triggers a fresh fetch', async () => {
    apiMock
      .mockResolvedValueOnce({ remaining: 10, last_minted_at: null })
      .mockResolvedValueOnce({ remaining: 5, last_minted_at: '2026-05-02T00:00:00Z' });
    const { result } = renderHook(() => useMfaRecoveryStatus());
    await waitFor(() => expect(result.current.status?.remaining).toBe(10));
    act(() => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.status?.remaining).toBe(5));
  });
});
