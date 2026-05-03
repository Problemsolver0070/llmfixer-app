import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

import { useAdminAuditLog } from './useAdminAuditLog';

beforeEach(() => {
  apiMock.mockReset();
});

describe('useAdminAuditLog', () => {
  it('builds the query string from filters and tracks loading + total', async () => {
    apiMock.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          actor_id: 'admin-1',
          action: 'user.comp',
          target_user_id: 'u-1',
          metadata: { reason: 'goodwill' },
          paypal_event_id: null,
          created_at: '2026-05-03T00:00:00Z',
        },
      ],
      total: 1,
    });
    const { result } = renderHook(() =>
      useAdminAuditLog({
        target_type: 'user',
        target_id: 'u-1',
        action: 'user.',
        admin_user_id: 'admin-1',
        date_from: '2026-05-01T00:00:00Z',
        date_to: '2026-05-03T23:59:59Z',
        search: 'good',
        limit: 25,
        offset: 50,
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(1);
    expect(result.current.rows.length).toBe(1);
    const url = apiMock.mock.calls[0][0] as string;
    expect(url).toContain('/v1/admin/audit-log?');
    expect(url).toContain('target_type=user');
    expect(url).toContain('target_id=u-1');
    expect(url).toContain('action=user.');
    expect(url).toContain('admin_user_id=admin-1');
    expect(url).toContain('date_from=2026-05-01');
    expect(url).toContain('date_to=2026-05-03');
    expect(url).toContain('search=good');
    expect(url).toContain('limit=25');
    expect(url).toContain('offset=50');
  });

  it('omits empty filter params and uses default limit/offset', async () => {
    apiMock.mockResolvedValueOnce({ rows: [], total: 0 });
    const { result } = renderHook(() => useAdminAuditLog({}));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const url = apiMock.mock.calls[0][0] as string;
    expect(url).toContain('limit=50');
    expect(url).toContain('offset=0');
    expect(url).not.toContain('target_type=');
    expect(url).not.toContain('search=');
  });

  it('refresh() re-fetches without changing filters', async () => {
    apiMock.mockResolvedValue({ rows: [], total: 0 });
    const { result } = renderHook(() => useAdminAuditLog({ search: 'x' }));
    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.refresh();
    });
    expect(apiMock).toHaveBeenCalledTimes(2);
  });

  it('captures errors and clears rows', async () => {
    apiMock.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useAdminAuditLog({}));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.rows).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
