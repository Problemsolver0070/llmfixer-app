import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiCall(...args) }));

import { useAdminComms } from './useAdminComms';

beforeEach(() => apiCall.mockReset());

describe('useAdminComms', () => {
  it('preview POSTs to /v1/admin/comms/preview and caches the result', async () => {
    apiCall.mockResolvedValue({
      matched_count: 7,
      first_5_emails: ['a@x.io', 'b@x.io'],
    });
    const { result } = renderHook(() => useAdminComms());
    await act(async () => {
      const res = await result.current.preview({
        segment: 'paid_users',
        subject: 'hi',
        html: '<p>hi</p>',
      });
      expect(res.matched_count).toBe(7);
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/comms/preview', {
      method: 'POST',
      body: { segment: 'paid_users', subject: 'hi', html: '<p>hi</p>' },
    });
    await waitFor(() =>
      expect(result.current.lastPreview?.matched_count).toBe(7),
    );
  });

  it('send POSTs to /v1/admin/comms/send and stores last result', async () => {
    apiCall.mockResolvedValue({
      segment: 'all_users',
      recipient_count: 3,
      dry_run: false,
      sent: 3,
      failed: 0,
      audit_log_id: 99,
    });
    const { result } = renderHook(() => useAdminComms());
    await act(async () => {
      const res = await result.current.send({
        segment: 'all_users',
        subject: 'hi',
        html: '<p>hi</p>',
        reason: 'test',
        dry_run: false,
      });
      expect(res.sent).toBe(3);
      expect(res.audit_log_id).toBe(99);
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/admin/comms/send', {
      method: 'POST',
      body: {
        segment: 'all_users',
        subject: 'hi',
        html: '<p>hi</p>',
        reason: 'test',
        dry_run: false,
      },
    });
    await waitFor(() => expect(result.current.lastSend?.sent).toBe(3));
  });

  it('resetPreview clears the cached preview', async () => {
    apiCall.mockResolvedValue({ matched_count: 1, first_5_emails: ['a@x.io'] });
    const { result } = renderHook(() => useAdminComms());
    await act(async () => {
      await result.current.preview({
        segment: 'all_users',
        subject: 'hi',
        html: '<p>hi</p>',
      });
    });
    expect(result.current.lastPreview).not.toBeNull();
    act(() => result.current.resetPreview());
    expect(result.current.lastPreview).toBeNull();
  });

  it('propagates api errors', async () => {
    apiCall.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useAdminComms());
    await expect(
      result.current.preview({
        segment: 'all_users',
        subject: 'hi',
        html: '<p>hi</p>',
      }),
    ).rejects.toThrow('boom');
  });
});
