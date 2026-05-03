import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useAdminUsers, useAdminUserActions } from './useAdminUsers';

beforeEach(() => {
  apiCall.mockReset();
});

describe('useAdminUsers', () => {
  it('fetches the full list with no q on mount', async () => {
    apiCall.mockResolvedValue({
      rows: [{ id: 'u', email: 'a@b.c', status: 'trial' }],
      total: 1,
      limit: 50,
      offset: 0,
    });

    const { result } = renderHook(() => useAdminUsers());

    await waitFor(() => expect(apiCall).toHaveBeenCalled());
    const url = apiCall.mock.calls[0][0] as string;
    expect(url).toBe('/v1/admin/users?limit=50&offset=0');

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.total).toBe(1);
    expect(result.current.loading).toBe(false);
  });

  it('passes q, limit, offset through to the URL', async () => {
    apiCall.mockResolvedValue({ rows: [], total: 0, limit: 25, offset: 50 });

    renderHook(() =>
      useAdminUsers({ q: 'alice', limit: 25, offset: 50 }),
    );

    await waitFor(() => {
      const url = apiCall.mock.calls[0][0] as string;
      expect(url).toContain('q=alice');
      expect(url).toContain('limit=25');
      expect(url).toContain('offset=50');
    });
  });

  it('refresh re-runs the request', async () => {
    apiCall.mockResolvedValue({ rows: [], total: 0, limit: 50, offset: 0 });
    const { result } = renderHook(() => useAdminUsers());

    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.refresh();
    });
    expect(apiCall.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('captures error state when the api throws', async () => {
    apiCall.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useAdminUsers());

    await waitFor(() => expect(result.current.error?.message).toBe('nope'));
    expect(result.current.rows).toEqual([]);
  });
});

describe('useAdminUserActions', () => {
  it('comp posts the right body', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUserActions());
    await act(async () => {
      await result.current.comp('u1', 14);
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u1/comp', {
      method: 'POST',
      body: { days: 14 },
    });
  });

  it('extendTrial and lock work', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUserActions());
    await act(async () => {
      await result.current.extendTrial('u1', 7);
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u1/extend-trial', {
      method: 'POST',
      body: { days: 7 },
    });
    await act(async () => {
      await result.current.lock('u1');
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u1/lock', {
      method: 'POST',
    });
  });
});
