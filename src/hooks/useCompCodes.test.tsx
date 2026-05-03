import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

import {
  useMintCompCode,
  useMintCompCodeBatch,
  useCompCodesList,
} from './useCompCodes';

beforeEach(() => {
  apiMock.mockReset();
});

describe('useCompCodes hooks', () => {
  it('useMintCompCode posts to /v1/admin/codes/comp', async () => {
    apiMock.mockResolvedValueOnce({ id: 'c1', code: 'XYZ123' });
    const { result } = renderHook(() => useMintCompCode());
    await act(async () => {
      await result.current.mint({
        granted_plan_id: 'solo-weekly',
        granted_seconds: 7 * 86400,
        max_uses: 1,
        reason: 'test',
      });
    });
    expect(apiMock).toHaveBeenCalledWith('/v1/admin/codes/comp', {
      method: 'POST',
      body: expect.objectContaining({ granted_plan_id: 'solo-weekly', reason: 'test' }),
    });
  });

  it('useMintCompCodeBatch posts to /v1/admin/codes/comp/batch', async () => {
    apiMock.mockResolvedValueOnce({ rows: [], batch_id: 'b1', count: 0 });
    const { result } = renderHook(() => useMintCompCodeBatch());
    await act(async () => {
      await result.current.mintBatch({
        count: 3,
        granted_plan_id: 'solo-monthly',
        granted_seconds: 30 * 86400,
        reason: 'q2',
      });
    });
    expect(apiMock).toHaveBeenCalledWith('/v1/admin/codes/comp/batch', {
      method: 'POST',
      body: expect.objectContaining({ count: 3, reason: 'q2' }),
    });
  });

  it('useCompCodesList builds query string and tracks loading + total', async () => {
    apiMock.mockResolvedValueOnce({ rows: [{ id: 'c1', code: 'AAA' }], total: 1 });
    const { result } = renderHook(() =>
      useCompCodesList({ status: 'active', search: 'AAA', limit: 25, offset: 50 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(1);
    const url = apiMock.mock.calls[0][0] as string;
    expect(url).toContain('status=active');
    expect(url).toContain('search=AAA');
    expect(url).toContain('limit=25');
    expect(url).toContain('offset=50');
  });
});
