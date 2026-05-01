import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useWorkspace } from './useWorkspace';

const baseSummary = {
  admin_email: 'a@x',
  plan_id: 'workspace-monthly',
  seat_count: 4,
  renews_at: '2026-05-28T00:00:00Z',
  extra_seat_price_display: '$9.99 / week prorated',
  viewer_role: 'admin' as const,
  members: [],
  pending_invites: [],
};

describe('useWorkspace', () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it('fetches GET /v1/workspace on mount and exposes the summary', async () => {
    apiCall.mockResolvedValueOnce({ workspace: baseSummary });
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.workspace).not.toBeNull());
    expect(apiCall).toHaveBeenCalledWith('/v1/workspace');
    expect(result.current.workspace?.admin_email).toBe('a@x');
    expect(result.current.workspace?.seat_count).toBe(4);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('records an error when GET /v1/workspace fails', async () => {
    apiCall.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.workspace).toBeNull();
    expect(result.current.error).toBe('boom');
  });

  it('refresh re-fetches GET /v1/workspace', async () => {
    apiCall
      .mockResolvedValueOnce({ workspace: { ...baseSummary, seat_count: 4 } })
      .mockResolvedValueOnce({ workspace: { ...baseSummary, seat_count: 5 } });
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.workspace?.seat_count).toBe(4));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.workspace?.seat_count).toBe(5);
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it('invite POSTs /v1/workspace/invite with email and refreshes', async () => {
    apiCall.mockResolvedValueOnce({ workspace: baseSummary });
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.workspace).not.toBeNull());

    apiCall
      .mockResolvedValueOnce({ invite: { token: 'k8R3...x9', email: 'b@x' }, seat_count_after: 5, paypal_charged_cents: 999 })
      .mockResolvedValueOnce({ workspace: { ...baseSummary, seat_count: 5 } });

    await act(async () => { await result.current.invite('b@x'); });

    expect(apiCall).toHaveBeenNthCalledWith(2, '/v1/workspace/invite', {
      method: 'POST',
      body: { email: 'b@x' },
    });
    expect(apiCall).toHaveBeenNthCalledWith(3, '/v1/workspace');
    expect(result.current.workspace?.seat_count).toBe(5);
  });

  it('refundInvite DELETEs /v1/workspace/invites/{token} and refreshes', async () => {
    apiCall.mockResolvedValueOnce({ workspace: baseSummary });
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.workspace).not.toBeNull());

    apiCall
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ workspace: { ...baseSummary, seat_count: 3 } });

    await act(async () => { await result.current.refundInvite('k8R3 x9'); });

    expect(apiCall).toHaveBeenNthCalledWith(2, '/v1/workspace/invites/k8R3%20x9', { method: 'DELETE' });
    expect(apiCall).toHaveBeenNthCalledWith(3, '/v1/workspace');
  });

  it('removeSeat DELETEs /v1/workspace/seats/{user_id} and refreshes', async () => {
    apiCall.mockResolvedValueOnce({ workspace: baseSummary });
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.workspace).not.toBeNull());

    apiCall
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ workspace: { ...baseSummary, seat_count: 3 } });

    await act(async () => { await result.current.removeSeat('user-123'); });

    expect(apiCall).toHaveBeenNthCalledWith(2, '/v1/workspace/seats/user-123', { method: 'DELETE' });
    expect(apiCall).toHaveBeenNthCalledWith(3, '/v1/workspace');
  });

  it('leave POSTs /v1/workspace/leave and refreshes', async () => {
    apiCall.mockResolvedValueOnce({ workspace: baseSummary });
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.workspace).not.toBeNull());

    apiCall
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ workspace: baseSummary });

    await act(async () => { await result.current.leave(); });

    expect(apiCall).toHaveBeenNthCalledWith(2, '/v1/workspace/leave', { method: 'POST' });
    expect(apiCall).toHaveBeenNthCalledWith(3, '/v1/workspace');
  });
});
