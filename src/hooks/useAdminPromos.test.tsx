import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { from: (t: string) => fromMock(t) } }));
const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useAdminPromos } from './useAdminPromos';

describe('useAdminPromos', () => {
  beforeEach(() => {
    fromMock.mockReset();
    apiCall.mockReset();
  });

  it('lists promos via supabase', async () => {
    fromMock.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [{ id: 'p1', code: 'CODE', type: 'free_time', amount_int: 30, max_redemptions: null, expires_at: null, active: true, created_at: '2026-01-01' }], error: null }) }),
    });
    const { result } = renderHook(() => useAdminPromos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.promos[0].code).toBe('CODE');
  });

  it('create posts to /v1/admin/promos', async () => {
    fromMock.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    });
    apiCall.mockResolvedValue({ id: 'p2' });
    const { result } = renderHook(() => useAdminPromos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.create({
        code: 'WEEKEND',
        type: 'free_time',
        amount_int: 7,
        max_redemptions: 100,
        expires_at: null,
        active: true,
      });
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/promos', expect.objectContaining({ method: 'POST' }));
  });

  it('toggleActive PATCHes the promo', async () => {
    fromMock.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    });
    apiCall.mockResolvedValue({});
    const { result } = renderHook(() => useAdminPromos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.toggleActive('p1', false); });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/promos/p1', { method: 'PATCH', body: { active: false } });
  });
});
