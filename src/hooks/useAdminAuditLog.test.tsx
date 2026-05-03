import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiCall(...args) }));

import { useAdminAuditLog } from './useAdminAuditLog';

beforeEach(() => apiCall.mockReset());

describe('useAdminAuditLog', () => {
  it('builds the query string from the filters', async () => {
    apiCall.mockResolvedValue({ rows: [], total: 0 });
    renderHook(() =>
      useAdminAuditLog({
        target_type: 'user',
        target_id: 'u-1',
        limit: 50,
      }),
    );
    await waitFor(() => expect(apiCall).toHaveBeenCalled());
    expect(apiCall).toHaveBeenCalledWith(
      '/v1/admin/audit-log?target_type=user&target_id=u-1&limit=50',
    );
  });

  it('sets rows + total from the response', async () => {
    apiCall.mockResolvedValue({
      rows: [
        {
          id: 'a-1',
          created_at: '2026-05-01T00:00:00Z',
          actor_user_id: 'admin-1',
          actor_email: 'a@b.c',
          action: 'user.comp',
          target_type: 'user',
          target_id: 'u-1',
          reason: 'apology',
          before: null,
          after: { comp_until: '2026-05-08T00:00:00Z' },
        },
      ],
      total: 1,
    });
    const { result } = renderHook(() =>
      useAdminAuditLog({ target_type: 'user', target_id: 'u-1' }),
    );
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.total).toBe(1);
  });

  it('refresh re-fetches', async () => {
    apiCall.mockResolvedValue({ rows: [], total: 0 });
    const { result } = renderHook(() =>
      useAdminAuditLog({ target_type: 'user', target_id: 'u-1' }),
    );
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.refresh(); });
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it('exposes error state', async () => {
    apiCall.mockRejectedValueOnce(new Error('forbidden'));
    const { result } = renderHook(() =>
      useAdminAuditLog({ target_type: 'user', target_id: 'u-1' }),
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('forbidden');
  });
});
