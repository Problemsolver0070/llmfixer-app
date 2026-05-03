import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiCall(...args) }));

import { useAdminUser, useAdminUserMutations } from './useAdminUser';

const baseUser = {
  id: 'u-1',
  email: 'a@b.c',
  full_name: null,
  role: 'user' as const,
  status: 'active',
  plan_id: 'SOLO_WEEKLY',
  seat_count: 1,
  paypal_sub_id: 'I-XYZ',
  paypal_sub_status: 'ACTIVE',
  comp_until: null,
  trial_ends_at: null,
  cancels_at: null,
  output_tokens_this_week: 1000,
  requests_this_week: 12,
  output_token_override_per_week: null,
  requests_override_per_week: null,
  created_at: '2026-01-01T00:00:00Z',
  last_active_at: null,
};

beforeEach(() => apiCall.mockReset());

describe('useAdminUser', () => {
  it('fetches the detail payload on mount', async () => {
    apiCall.mockResolvedValue(baseUser);
    const { result } = renderHook(() => useAdminUser('u-1'));
    await waitFor(() => expect(result.current.user).toEqual(baseUser));
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u-1');
  });

  it('refresh re-fetches', async () => {
    apiCall.mockResolvedValue(baseUser);
    const { result } = renderHook(() => useAdminUser('u-1'));
    await waitFor(() => expect(result.current.user).not.toBeNull());
    apiCall.mockResolvedValueOnce({ ...baseUser, status: 'locked' });
    await act(async () => { await result.current.refresh(); });
    expect(result.current.user?.status).toBe('locked');
  });

  it('does not call the api when userId is null', async () => {
    const { result } = renderHook(() => useAdminUser(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('exposes errors', async () => {
    apiCall.mockRejectedValueOnce(new Error('forbidden'));
    const { result } = renderHook(() => useAdminUser('u-1'));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('forbidden');
  });
});

describe('useAdminUserMutations', () => {
  it('stateOverride POSTs the right body', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUserMutations('u-1'));
    await act(async () => {
      await result.current.stateOverride({
        comp_until: '2099-01-01T00:00:00.000Z',
        reason: 'comp them',
      });
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u-1/state-override', {
      method: 'POST',
      body: { comp_until: '2099-01-01T00:00:00.000Z', reason: 'comp them' },
    });
  });

  it('capOverride POSTs the right body', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUserMutations('u-1'));
    await act(async () => {
      await result.current.capOverride({
        output_token_override_per_week: 5000,
        reason: 'bump',
      });
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u-1/cap-override', {
      method: 'POST',
      body: { output_token_override_per_week: 5000, reason: 'bump' },
    });
  });

  it('changePlan, clearPlan, cancelSub, refund all POST', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUserMutations('u-1'));

    await act(async () => {
      await result.current.changePlan({
        new_plan_sku: 'SOLO_MONTHLY',
        reason: 'upgrade',
      });
    });
    expect(apiCall).toHaveBeenLastCalledWith('/v1/admin/users/u-1/change-plan', {
      method: 'POST',
      body: { new_plan_sku: 'SOLO_MONTHLY', reason: 'upgrade' },
    });

    await act(async () => {
      await result.current.clearPlan({
        cancel_paypal_sub: true,
        reason: 'fraud',
      });
    });
    expect(apiCall).toHaveBeenLastCalledWith('/v1/admin/users/u-1/clear-plan', {
      method: 'POST',
      body: { cancel_paypal_sub: true, reason: 'fraud' },
    });

    await act(async () => {
      await result.current.cancelSub({ refund: false, reason: 'r' });
    });
    expect(apiCall).toHaveBeenLastCalledWith('/v1/admin/users/u-1/cancel-sub', {
      method: 'POST',
      body: { refund: false, reason: 'r' },
    });

    await act(async () => {
      await result.current.refund({
        capture_id: 'CAP123',
        reason: 'duplicate',
      });
    });
    expect(apiCall).toHaveBeenLastCalledWith('/v1/admin/users/u-1/refund', {
      method: 'POST',
      body: { capture_id: 'CAP123', reason: 'duplicate' },
    });
  });

  it('comp, extendTrial, lock, deleteUser hit their endpoints', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUserMutations('u-1'));

    await act(async () => { await result.current.comp(7, 'x'); });
    expect(apiCall).toHaveBeenLastCalledWith('/v1/admin/users/u-1/comp', {
      method: 'POST',
      body: { days: 7, reason: 'x' },
    });

    await act(async () => { await result.current.extendTrial(3, 'y'); });
    expect(apiCall).toHaveBeenLastCalledWith('/v1/admin/users/u-1/extend-trial', {
      method: 'POST',
      body: { days: 3, reason: 'y' },
    });

    await act(async () => { await result.current.lock('z'); });
    expect(apiCall).toHaveBeenLastCalledWith('/v1/admin/users/u-1/lock', {
      method: 'POST',
      body: { reason: 'z' },
    });

    await act(async () => { await result.current.deleteUser('d'); });
    expect(apiCall).toHaveBeenLastCalledWith('/v1/admin/users/u-1', {
      method: 'DELETE',
      body: { reason: 'd' },
    });
  });
});
