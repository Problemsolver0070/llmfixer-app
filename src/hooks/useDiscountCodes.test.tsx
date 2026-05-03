import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

import {
  useMintDiscountCode,
  useMintDiscountCodeBatch,
  useDiscountCodesList,
} from './useDiscountCodes';

beforeEach(() => {
  apiMock.mockReset();
});

describe('useDiscountCodes hooks', () => {
  it('useMintDiscountCode posts to /v1/admin/codes/discount', async () => {
    apiMock.mockResolvedValueOnce({ id: 'd1', code: 'PROMO10' });
    const { result } = renderHook(() => useMintDiscountCode());
    await act(async () => {
      await result.current.mint({
        discount_pct: 10,
        max_uses: 1,
        applies_to_plan_skus: ['solo-monthly'],
        reason: 'q2 launch',
      });
    });
    expect(apiMock).toHaveBeenCalledWith('/v1/admin/codes/discount', {
      method: 'POST',
      body: expect.objectContaining({
        discount_pct: 10,
        applies_to_plan_skus: ['solo-monthly'],
        reason: 'q2 launch',
      }),
    });
  });

  it('useMintDiscountCodeBatch posts to /v1/admin/codes/discount/batch', async () => {
    apiMock.mockResolvedValueOnce({ codes: [], batch_id: 'b1', count: 0 });
    const { result } = renderHook(() => useMintDiscountCodeBatch());
    await act(async () => {
      await result.current.mintBatch({
        count: 5,
        discount_pct: 25,
        max_uses: 1,
        applies_to_plan_skus: [],
        reason: 'launch promo',
      });
    });
    expect(apiMock).toHaveBeenCalledWith('/v1/admin/codes/discount/batch', {
      method: 'POST',
      body: expect.objectContaining({
        count: 5,
        discount_pct: 25,
        reason: 'launch promo',
      }),
    });
  });

  it('useDiscountCodesList builds query string and tracks loading + total', async () => {
    apiMock.mockResolvedValueOnce({ rows: [{ id: 'd1', code: 'AAA' }], total: 1 });
    const { result } = renderHook(() =>
      useDiscountCodesList({ status: 'active', search: 'AAA', limit: 25, offset: 50 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(1);
    const url = apiMock.mock.calls[0][0] as string;
    expect(url).toContain('status=active');
    expect(url).toContain('search=AAA');
    expect(url).toContain('limit=25');
    expect(url).toContain('offset=50');
  });

  it('useDiscountCodesList includes batch_id when set', async () => {
    apiMock.mockResolvedValueOnce({ rows: [], total: 0 });
    renderHook(() =>
      useDiscountCodesList({ status: 'all', batch_id: 'batch-uuid-123' }),
    );
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    const url = apiMock.mock.calls[0][0] as string;
    expect(url).toContain('batch_id=batch-uuid-123');
    expect(url).toContain('status=all');
  });

  it('useDiscountCodesList captures errors', async () => {
    apiMock.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useDiscountCodesList({}));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.rows).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
