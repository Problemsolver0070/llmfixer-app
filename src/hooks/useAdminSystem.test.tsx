import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import {
  useAdminSystemCrons,
  useAdminSystemEmails,
  useAdminSystemErrorRate,
  useAdminSystemWebhooks,
} from './useAdminSystem';

beforeEach(() => {
  apiCall.mockReset();
});

describe('useAdminSystemCrons', () => {
  it('fetches /v1/admin/system/crons on mount', async () => {
    apiCall.mockResolvedValue({
      items: [
        {
          name: 'expire_trials',
          last_run_at: '2026-05-03T08:00:00Z',
          last_status: 'success',
          success_count_24h: 1,
          failed_count_24h: 0,
          last_log_line: 'success (affected=2)',
        },
      ],
      window_hours: 24,
    });
    const { result } = renderHook(() => useAdminSystemCrons());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/system/crons');
    expect(result.current.data?.items[0].name).toBe('expire_trials');
  });

  it('polls every 60s', async () => {
    vi.useFakeTimers();
    try {
      apiCall.mockResolvedValue({ items: [], window_hours: 24 });
      renderHook(() => useAdminSystemCrons());
      await vi.waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });
      await vi.waitFor(() => expect(apiCall).toHaveBeenCalledTimes(2));
      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });
      await vi.waitFor(() => expect(apiCall).toHaveBeenCalledTimes(3));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useAdminSystemWebhooks', () => {
  it('fetches /v1/admin/system/webhooks on mount', async () => {
    apiCall.mockResolvedValue({ items: [], limit: 50 });
    renderHook(() => useAdminSystemWebhooks());
    await waitFor(() =>
      expect(apiCall).toHaveBeenCalledWith('/v1/admin/system/webhooks'),
    );
  });
});

describe('useAdminSystemEmails', () => {
  it('fetches /v1/admin/system/email-log on mount', async () => {
    apiCall.mockResolvedValue({ items: [], limit: 50 });
    renderHook(() => useAdminSystemEmails());
    await waitFor(() =>
      expect(apiCall).toHaveBeenCalledWith('/v1/admin/system/email-log'),
    );
  });
});

describe('useAdminSystemErrorRate', () => {
  it('fetches /v1/admin/system/error-rate on mount', async () => {
    apiCall.mockResolvedValue({
      error_count_24h: 0,
      total_actions_24h: 0,
      error_rate_pct: 0,
      window_hours: 24,
    });
    const { result } = renderHook(() => useAdminSystemErrorRate());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/system/error-rate');
  });

  it('surfaces error and stops loading on api failure', async () => {
    apiCall.mockImplementation(() => Promise.reject(new Error('boom')));
    const { result } = renderHook(() => useAdminSystemErrorRate());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.loading).toBe(false);
  });
});
