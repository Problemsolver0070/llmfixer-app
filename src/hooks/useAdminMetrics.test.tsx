import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useAdminMetrics } from './useAdminMetrics';

describe('useAdminMetrics', () => {
  beforeEach(() => apiCall.mockReset());

  it('fetches /v1/admin/metrics on mount', async () => {
    apiCall.mockResolvedValue({
      total_users: 100, verified_users: 80, active_subs: 30,
      mrr_cents: 599700, signups_7d: 12, cancellations_7d: 1,
    });
    const { result } = renderHook(() => useAdminMetrics());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.total_users).toBe(100);
  });
});
