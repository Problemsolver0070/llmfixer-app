import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useAdminUsers } from './useAdminUsers';

describe('useAdminUsers', () => {
  beforeEach(() => apiCall.mockReset());

  it('search calls /v1/admin/users with q', async () => {
    apiCall.mockResolvedValue({ items: [{ id: 'u', email: 'a@b.c' }], total: 1 });
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => { await result.current.search('a@b'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users?q=a%40b&limit=50&offset=0');
    await waitFor(() => expect(result.current.results).toHaveLength(1));
  });

  it('comp posts the right body', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => { await result.current.comp('u1', 14); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u1/comp', { method: 'POST', body: { days: 14 } });
  });

  it('extendTrial and lock work', async () => {
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => { await result.current.extendTrial('u1', 7); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u1/extend-trial', { method: 'POST', body: { days: 7 } });
    await act(async () => { await result.current.lock('u1'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/users/u1/lock', { method: 'POST' });
  });
});
